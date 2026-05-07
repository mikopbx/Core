<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

namespace MikoPBX\Common\Providers;


use MikoPBX\Common\Models\CallDetailRecords;
use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Upgrade\UpdateDatabase;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Events\Manager as EventsManager;
use Phalcon\Logger\Adapter\Stream as FileLogger;
use Phalcon\Logger\Logger;
use Throwable;

/**
 * Main database connection is created based in the parameters defined in the configuration file
 *
 *  @package MikoPBX\Common\Providers
 */
abstract class DatabaseProviderBase
{
    /**
     * Register the database service provider.
     *
     * @param string                  $serviceName Injection service name
     * @param \Phalcon\Di\DiInterface $di The DI container.
     * @param array                   $dbConfig The database configuration.
     */
    public function registerDBService(string $serviceName, DiInterface $di, array $dbConfig): void
    {
        $di->setShared(
            $serviceName,
            function () use ($dbConfig, $serviceName) {
                $dbclass = 'Phalcon\Db\Adapter\Pdo\\' . $dbConfig['adapter'];

                $folderWithDB = dirname($dbConfig['dbfile']);
                if (!is_dir($folderWithDB)){
                    Util::mwMkdir($folderWithDB, true);
                }

                // Create Phalcon adapter with SQLite configuration
                $connection = new $dbclass([
                    'dbname' => $dbConfig['dbfile'],
                    'options' => [
                        \PDO::ATTR_TIMEOUT => 30,
                        \PDO::ATTR_PERSISTENT => false,
                        \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION
                    ]
                ]);

                /**
                 * IMPORTANT: Nested transactions with savepoints are DISABLED for SQLite.
                 *
                 * SQLite has a limitation where savepoints cannot be created while other SQL statements
                 * are in progress. When this setting is enabled, Phalcon attempts to create savepoints
                 * for nested begin() calls, which leads to errors:
                 * "SQLSTATE[HY000]: General error: 5 cannot open savepoint - SQL statements in progress"
                 *
                 * This occurs frequently in our codebase when:
                 * 1. executeInTransaction() calls $db->begin() (starts transaction)
                 * 2. Model->save() triggers beforeSave/afterSave hooks that execute SELECT queries
                 * 3. Foreign key constraints trigger additional SELECT queries
                 * 4. Nested operations try to begin() again (would create savepoint)
                 * 5. SQLite rejects savepoint creation because statements from step 2-3 are still active
                 *
                 * By disabling savepoints:
                 * - Nested begin() calls are silently ignored (safe, as we're already in transaction)
                 * - Only the outermost transaction's commit/rollback takes effect
                 * - All operations still protected by the outer transaction
                 * - No impact on Phalcon's ORM snapshot mechanism (different feature, stored in PHP memory)
                 *
                 * Note: This does NOT affect:
                 * - Model snapshots (keepSnapshots) - works independently in PHP memory
                 * - Change tracking (getUpdatedFields, getSnapshotData) - continues to function normally
                 * - Transaction safety - outer transaction still protects all operations
                 *
                 * References:
                 * - Issue: Database locking affecting ~20% of write operations in REST API v3
                 * @see https://www.sqlite.org/lang_savepoint.html - SQLite savepoint documentation
                 * @see BaseActionHelper::executeInTransaction() - Smart transaction handling
                 */
                $connection->setNestedTransactionsWithSavepoints(false);

                $optimizedServices = [
                    MainDatabaseProvider::SERVICE_NAME,
                    CDRDatabaseProvider::SERVICE_NAME,
                    RecordingStorageDatabaseProvider::SERVICE_NAME,
                ];
                if (!System::isBooting() && in_array($serviceName, $optimizedServices, true)) {
                    // Optimize SQLite for better concurrency
                    // Set busy timeout to 5 seconds - wait for lock instead of immediate failure
                    $connection->execute("PRAGMA busy_timeout = 5000");

                    // WAL: readers don't block writers and vice versa, only one writer at a time.
                    // Required for CDR database where WorkerCallEvents (writer) runs in parallel
                    // with WorkerApiCommands (REST API readers) and Asterisk AGI CdrDb.php.
                    // Skip on network filesystems (NFS/SMB/SSHFS) where WAL shared-memory is
                    // unsafe and can corrupt the database — fall back to rollback journal.
                    if (self::isWalSafeFilesystem($dbConfig['dbfile'])) {
                        $connection->execute("PRAGMA journal_mode = WAL");
                    } else {
                        SystemMessages::sysLogMsg(
                            self::class,
                            "WAL disabled for {$serviceName}: filesystem under {$dbConfig['dbfile']} is not WAL-safe",
                            LOG_NOTICE
                        );
                    }

                    // Use NORMAL synchronous mode for better performance while maintaining durability
                    // FULL is very safe but slower, NORMAL is good balance
                    $connection->execute("PRAGMA synchronous = NORMAL");

                    // // Increase cache size to 10MB for better performance
                    $connection->execute("PRAGMA cache_size = -10000");

                    // Use memory for temp tables
                    $connection->execute("PRAGMA temp_store = MEMORY");
                }

                if ($dbConfig['debugMode']) {
                    $this->setupDebugMode($connection, $dbConfig);
                }
                $this->setupTransactionEventHandlers($connection, $serviceName);
                return $connection;
            }
        );
    }

    /**
     * Register central transaction lifecycle handlers.
     *
     * PbxSettings maintains a Redis hash cache outside the Phalcon managed
     * cache. Model afterSave events can run before the outer SQLite commit, so
     * PbxSettings defers cache updates while a transaction is active and these
     * DB events flush or discard the deferred values centrally.
     *
     * @param mixed $connection Database connection
     * @param string $serviceName DI database service name
     */
    private function setupTransactionEventHandlers($connection, string $serviceName): void
    {
        if ($serviceName !== MainDatabaseProvider::SERVICE_NAME) {
            return;
        }

        $eventsManager = $connection->getEventsManager();
        if ($eventsManager === null) {
            $eventsManager = new EventsManager();
        }

        $eventsManager->attach(
            'db',
            function ($event): void {
                switch ($event->getType()) {
                    case 'commitTransaction':
                        \MikoPBX\Common\Models\PbxSettings::flushPendingCacheUpdates();
                        break;
                    case 'rollbackTransaction':
                        \MikoPBX\Common\Models\PbxSettings::discardPendingCacheUpdates();
                        break;
                    default:
                }
            }
        );

        $connection->setEventsManager($eventsManager);
    }

    /**
     * Setup debug mode for database connection
     *
     * @param mixed $connection Database connection
     * @param array $dbConfig Database configuration
     */
    private function setupDebugMode($connection, array $dbConfig): void
    {
        $adapter = new FileLogger($dbConfig['debugLogFile']);
        $logger = new Logger(
            'messages',
            [
                'main' => $adapter,
            ]
        );

        $eventsManager = new EventsManager();
        $eventsManager->attach(
            'db',
            function ($event, $connection) use ($logger) {
                if ($event->getType() === 'beforeQuery') {
                    $statement = $connection->getSQLStatement();
                    $variables = $connection->getSqlVariables();
                    if (is_array($variables)) {
                        foreach ($variables as $variable => $value) {
                            if (is_array($value)) {
                                $value = '(' . implode(', ', $value) . ')';
                            }
                            $variable = str_replace(':', '', $variable);
                            $statement = str_replace(":$variable", "'$value'", $statement);
                            $statement = preg_replace('/= \?/', " = '$value'", $statement, 1);
                        }
                    }
                    $callStack = json_encode(debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 50), JSON_PRETTY_PRINT);
                    $logger->debug("Request: \n $statement\nCall stack:\n$callStack \n\n\n\n");
                }
            }
        );

        $connection->setEventsManager($eventsManager);
    }

    /**
     * Ensures CDR tables (`cdr` and `cdr_general`) exist in the CDR database.
     *
     * Called at worker startup to recover from corruption or storage remount
     * scenarios that cause the CDR database file to be recreated empty.
     * Without this, WorkerCallEvents and WorkerCdr crash-loop with
     * "no such table: cdr" (Sentry #27651, GitHub issue #1000).
     *
     * IMPORTANT: this method MUST only be called from a worker startup path,
     * before any Phalcon model instance has been created in the current process.
     * `recreateDBConnections()` re-registers DI services and invalidates any
     * model instances that already cached a connection. Calling this from a
     * mid-request context will silently break previously-loaded models.
     *
     * The static guard prevents accidental re-entry in the same process.
     * The mutex serialises parallel `WorkerCallEvents`/`WorkerCdr` startup
     * across processes (`WorkerSafeScriptsCore` restarts both via Fibers).
     *
     * All errors are caught and logged — recovery failures must not prevent
     * the worker from starting, otherwise we trade a crash loop for a silent
     * refusal to start.
     */
    public static function ensureCdrTables(): void
    {
        static $alreadyRun = false;
        if ($alreadyRun) {
            return;
        }
        $alreadyRun = true;

        try {
            $di = Di::getDefault();
            if ($di === null) {
                return;
            }

            $recovery = static function () use ($di): void {
                /** @var \Phalcon\Db\Adapter\Pdo\Sqlite $connection */
                $connection = $di->get(CDRDatabaseProvider::SERVICE_NAME);
                if ($connection->tableExists('cdr') && $connection->tableExists('cdr_general')) {
                    return;
                }

                SystemMessages::sysLogMsg(
                    self::class,
                    'CDR tables missing, recreating from model annotations',
                    LOG_WARNING
                );

                $dbUpdater = new UpdateDatabase();
                $dbUpdater->createUpdateDbTableByAnnotations(CallDetailRecordsTmp::class);
                $dbUpdater->createUpdateDbTableByAnnotations(CallDetailRecords::class);

                self::recreateDBConnections();
            };

            try {
                /** @var \MikoPBX\Common\Providers\MutexProvider|object $mutex */
                $mutex = $di->get(MutexProvider::SERVICE_NAME);
                $mutex->synchronized('cdr-tables-recovery', $recovery, 30, 60);
            } catch (Throwable $mutexError) {
                // Mutex provider unavailable (e.g. Redis down at boot) — fall
                // back to direct execution. SQLite's busy_timeout still
                // serialises parallel CREATE TABLE attempts.
                SystemMessages::sysLogMsg(
                    self::class,
                    'CDR recovery mutex unavailable, falling back: ' . $mutexError->getMessage(),
                    LOG_NOTICE
                );
                $recovery();
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                self::class,
                'CDR tables recovery failed: ' . $e->getMessage(),
                LOG_ERR
            );
        }
    }

    /**
     * Determines whether the filesystem hosting the given DB file supports
     * SQLite WAL safely. WAL relies on shared-memory mmap and atomic fsync
     * which break on network filesystems (NFS/SMB/SSHFS) and may silently
     * corrupt the database.
     *
     * Detection is best-effort: we read `/proc/mounts`, find the longest
     * matching mount point for the given path, and reject known-unsafe
     * filesystem types. On any error or unknown FS we default to ALLOWING
     * WAL — that matches the previous behavior for MainDatabaseProvider
     * and avoids surprising regressions on exotic local filesystems.
     */
    private static function isWalSafeFilesystem(string $dbFile): bool
    {
        $unsafeFsTypes = [
            'nfs', 'nfs4', 'cifs', 'smb', 'smbfs', 'smb2', 'smb3',
            'sshfs', 'davfs', 'glusterfs', 'ceph', 'lustre', 'gpfs',
        ];

        try {
            $mountsContent = @file_get_contents('/proc/mounts');
            if ($mountsContent === false || $mountsContent === '') {
                return true;
            }

            $bestMatch = '';
            $bestType = '';
            foreach (explode("\n", $mountsContent) as $line) {
                $parts = preg_split('/\s+/', trim($line));
                if (!is_array($parts) || count($parts) < 3) {
                    continue;
                }
                $mountPoint = $parts[1];
                $fsType = $parts[2];
                if ($mountPoint === '') {
                    continue;
                }
                $needle = ($mountPoint === '/') ? '/' : $mountPoint . '/';
                if (str_starts_with($dbFile . '/', $needle)
                    && strlen($mountPoint) > strlen($bestMatch)
                ) {
                    $bestMatch = $mountPoint;
                    $bestType = $fsType;
                }
            }

            if ($bestType === '') {
                return true;
            }

            return !in_array(strtolower($bestType), $unsafeFsTypes, true);
        } catch (Throwable) {
            return true;
        }
    }

    /**
     * Recreate DB connections after table structure changes
     */
    public static function recreateDBConnections(): void
    {
        $dbProvidersList = [
            // Always recreate it before change DB providers
            MainDatabaseProvider::class,
            CDRDatabaseProvider::class,
            RecordingStorageDatabaseProvider::class,

            ModelsMetadataProvider::class,
            ModelsAnnotationsProvider::class,
        ];

        $di = Di::getDefault();

        foreach ($dbProvidersList as $provider) {
            // Delete previous provider
            $di->remove($provider::SERVICE_NAME);
            (new $provider())->register($di);
        }
    }
}
