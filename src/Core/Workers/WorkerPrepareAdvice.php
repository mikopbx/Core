<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Workers;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\MutexProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\AdviceTaskBatchProcessor;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckAmiPasswords;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckAriPasswords;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckConnection;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckCorruptedFiles;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckDockerPermissions;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckFirewalls;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckModulesUpdates;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckSecurityLog;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckSIPPasswords;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckS3Connection;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckSSHConfig;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckSSHPasswords;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckStorage;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckStorageUsage;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckUpdates;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckWebPasswords;
use MikoPBX\PBXCoreREST\Lib\Advice\GetAdviceListAction;
use Throwable;
require_once 'Globals.php';

/**
 * WorkerPrepareAdvice is a worker class responsible for preparing system advice.
 */
class WorkerPrepareAdvice extends WorkerRedisBase
{
    private const int PROCESS_CHECK_INTERVAL = 100000; // 100ms

    /**
     * Number of worker processes that должен запустить WorkerSafeScriptsCore
     */
    public int $maxProc = 1;

    /**
     * Array of advice types with their cache times.
     *
     * @var array
     */
    public const array ARR_ADVICE_TYPES = [
        ['type' => CheckConnection::class, 'cacheTime' => 120, 'priority' => 5],
        ['type' => CheckCorruptedFiles::class, 'cacheTime' => 3600, 'priority' => 5],
        ['type' => CheckDockerPermissions::class, 'cacheTime' => 3600, 'priority' => 1],
        ['type' => CheckWebPasswords::class, 'cacheTime' => 864000, 'priority' => 1],
        ['type' => CheckSSHPasswords::class, 'cacheTime' => 864000, 'priority' => 1],
        ['type' => CheckFirewalls::class, 'cacheTime' => 864000, 'priority' => 1],
        ['type' => CheckSIPPasswords::class, 'cacheTime' => 864000, 'priority' => 9],
        ['type' => CheckAmiPasswords::class, 'cacheTime' => 864000, 'priority' => 9],
        ['type' => CheckAriPasswords::class, 'cacheTime' => 864000, 'priority' => 9],
        ['type' => CheckStorage::class, 'cacheTime' => 300, 'priority' => 2],
        ['type' => CheckStorageUsage::class, 'cacheTime' => 1800, 'priority' => 3],
        ['type' => CheckS3Connection::class, 'cacheTime' => 300, 'priority' => 4],
        ['type' => CheckSecurityLog::class, 'cacheTime' => 600, 'priority' => 1],
        ['type' => CheckUpdates::class, 'cacheTime' => 86400, 'priority' => 5],
        ['type' => CheckSSHConfig::class, 'cacheTime' => 3600, 'priority' => 1],
        ['type' => CheckModulesUpdates::class, 'cacheTime' => 86400, 'priority' => 5],
    ];

    // Array of generated advice
    public array $messages;

    /**
     * Get check interval for worker monitoring
     */
    public static function getCheckInterval(): int
    {
        return 15; // Check every 15 seconds
    }

    /**
     * Starts processing advice types
     *
     * @param array $argv The command-line arguments passed to the worker.
     *
     * @throws Throwable
     */
    public function start(array $argv): void
    {
        // Process advice types until shutdown
        while ($this->needRestart === false && !$this->isShuttingDown) {
            try {
                // Process signals
                pcntl_signal_dispatch();
                
                // Process any pending advice types
                $processedCount = $this->processAdviceTypes();
                
                // Send heartbeat
                $this->checkHeartbeat();
                
                // Sleep only when there was no work. Productive passes drain
                // the queue and immediately check for newly expired advice.
                if ($processedCount === 0) {
                    sleep(5);
                }
                
            } catch (Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
                sleep(1);
            }
        }
        
        SystemMessages::sysLogMsg(
            static::class,
            "Worker exiting gracefully",
            LOG_NOTICE
        );
    }

    /**
     * Processes advice types.
     *
     * @return int Number of advice checks completed in this batch.
     */
    private function processAdviceTypes(): int
    {
        $managedCache = $this->getDI()->get(ManagedCacheProvider::SERVICE_NAME);
        $mutex = $this->getDI()->get(MutexProvider::SERVICE_NAME);
        $batchProcessor = new AdviceTaskBatchProcessor();

        return $batchProcessor->drain(
            self::ARR_ADVICE_TYPES,
            static fn(string $adviceClass): bool => $managedCache->has(self::getCacheKey($adviceClass)),
            static fn(string $lockKey, callable $callback, int $timeout, int $ttl): mixed =>
                $mutex->synchronized($lockKey, $callback, $timeout, $ttl),
            fn(array $adviceType): bool => $this->processAdvice($adviceType, $managedCache),
            fn(): bool => $this->isShuttingDown,
            static function (): void {
                GetAdviceListAction::main();
            }
        );
    }

    /**
     * Processes advice of a specific type and caches the result.
     *
     * @param array $adviceType An array containing advice type and cache time.
     */
    private function processAdvice(array $adviceType, mixed $managedCache): bool
    {
        $start = microtime(true);
        $processed = false;

        try {
            if ($this->isShuttingDown) {
                return false;
            }

            $currentAdviceClass = $adviceType['type'];
            $cacheKey = self::getCacheKey($currentAdviceClass);
            SystemMessages::sysLogMsg(__METHOD__, "Start advice processing: $cacheKey", LOG_DEBUG);
            $checkObj = new $currentAdviceClass();
            if ($checkObj instanceof CheckStorageUsage) {
                $checkObj->setHeartbeatCallback(function (): void {
                    $this->checkHeartbeat();
                });
            }
            $newAdvice = $checkObj->process();
            $managedCache->set($cacheKey, $newAdvice, $adviceType['cacheTime']);
            $processed = true;
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        $timeElapsedSecs = round(microtime(true) - $start, 2);
        if ($timeElapsedSecs > 5) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "WARNING: Service WorkerPrepareAdvice:{$adviceType['type']} processed more than $timeElapsedSecs seconds",
                LOG_WARNING
            );
        }

        return $processed;
    }

    /**
     * Prepares a cache key for an advice type.
     *
     * @param string $currentAdviceType Current advice type.
     * @return string Cache key.
     */
    public static function getCacheKey(string $currentAdviceType): string
    {
        return 'WorkerPrepareAdvice:' . $currentAdviceType;
    }
}

// Start a worker process
WorkerPrepareAdvice::startWorker($argv ?? []);
