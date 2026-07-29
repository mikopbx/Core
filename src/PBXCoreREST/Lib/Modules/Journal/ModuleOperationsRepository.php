<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Modules\Journal;

use MikoPBX\Common\Models\ModuleOperations;
use MikoPBX\Common\Providers\MainDatabaseProvider;
use PDO;
use PDOException;
use Phalcon\Di\Di;
use RuntimeException;

/**
 * Class ModuleOperationsRepository
 *
 * Persistence layer for the module operations journal (m_ModuleOperations).
 *
 * All writes go through raw SQL on the shared PDO handle:
 *  - the orchestrator heartbeats every second, and ORM writes would flood the
 *    Beanstalk models-events queue and the frontend event bus;
 *  - state transitions are compare-and-set on the fencing token, which the ORM
 *    cannot express atomically;
 *  - the claim uses BEGIN IMMEDIATE to serialize "one active operation".
 *
 * Methods throw PDOException/RuntimeException on infrastructure failures.
 * Callers that must never break the main flow (legacy dual-write) go through
 * the OperationJournal facade instead.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Modules\Journal
 */
class ModuleOperationsRepository
{
    public const string TABLE = 'm_ModuleOperations';

    // Heartbeat older than this means the operation process is presumed dead
    public const int HEARTBEAT_STALE_AFTER = 60;

    // Terminal rows kept in the journal for history/diagnostics
    public const int RECENT_KEEP = 100;

    // Retry policy for SQLite "database is locked" (same as WorkerApiCommands)
    private const int DB_LOCKED_MAX_RETRIES = 3;
    private const int DB_LOCKED_BASE_DELAY_US = 100000;

    // Columns allowed in setFields()/insert extra fields
    private const array WRITABLE_FIELDS = [
        'moduleUniqueId',
        'stage',
        'progress',
        'params',
        'errorData',
        'wasEnabled',
        'prevVersion',
        'newVersion',
        'rowSnapshot',
        'stagingPath',
        'backupPath',
        'swapDone',
        'pid',
        'pgid',
        'childPgid',
    ];

    private PDO $db;

    /**
     * @param PDO|null $db Optional PDO handle (unit tests); defaults to the
     *                     shared main database connection from DI.
     */
    public function __construct(?PDO $db = null)
    {
        if ($db === null) {
            $connection = Di::getDefault()->getShared(MainDatabaseProvider::SERVICE_NAME);
            $db = $connection->getInternalHandler();
        }
        $this->db = $db;
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    /**
     * Atomically claims the right to run a module operation.
     *
     * Enforces the "one active operation at a time" invariant on the journal
     * itself: the insert happens in a BEGIN IMMEDIATE transaction only when no
     * active row exists. A stale active row (dead heartbeat) is NOT taken over
     * here — reaping with rollback is the supervisor's job.
     *
     * @param string $moduleUniqueId Module the operation works on
     * @param string $operation One of ModuleOperations::OPERATION_*
     * @param array $params Operation parameters (JSON encoded into the row)
     * @param string $channelId nchan channel id for browser notifications
     * @param string $batchId Update All batch id or ''
     * @param bool $wasEnabled Whether the module was enabled before the operation
     *
     * @return array{claimed: bool, operationUid?: string, fencingToken?: string,
     *               activeOperation?: array, stale?: bool}
     */
    public function claim(
        string $moduleUniqueId,
        string $operation,
        array $params = [],
        string $channelId = '',
        string $batchId = '',
        bool $wasEnabled = false
    ): array {
        $this->pruneTerminal();

        return $this->withRetry(function () use ($moduleUniqueId, $operation, $params, $channelId, $batchId, $wasEnabled): array {
            // NOTE: the inTransaction() guard below relies on pdo_sqlite
            // reporting real autocommit state for exec('BEGIN ...') — true
            // since PHP 8.2 (the platform ships 8.3+).
            $this->db->exec('BEGIN IMMEDIATE');
            try {
                $active = $this->fetchActiveRowLocked();
                if ($active !== null) {
                    $this->db->exec('ROLLBACK');
                    $heartbeat = (int)($active['heartbeatAt'] ?? 0);
                    return [
                        'claimed' => false,
                        'activeOperation' => self::toApiArray($active),
                        'stale' => $heartbeat < (time() - self::HEARTBEAT_STALE_AFTER),
                    ];
                }
                [$uid, $token] = $this->insertRow(
                    $moduleUniqueId,
                    $operation,
                    ModuleOperations::STATE_PENDING,
                    $params,
                    $channelId,
                    $batchId,
                    $wasEnabled
                );
                $this->db->exec('COMMIT');
                return ['claimed' => true, 'operationUid' => $uid, 'fencingToken' => $token];
            } catch (PDOException $e) {
                if ($this->db->inTransaction()) {
                    $this->db->exec('ROLLBACK');
                }
                throw $e;
            }
        });
    }

    /**
     * Opens a journal row unconditionally in running state.
     *
     * Used by the legacy pipeline dual-write (PR1 observability): the legacy
     * mutex still guards concurrency, the journal only records what happens.
     *
     * @return array{0: string, 1: string} [operationUid, fencingToken]
     */
    public function open(
        string $moduleUniqueId,
        string $operation,
        array $params = [],
        string $channelId = '',
        string $batchId = '',
        bool $wasEnabled = false
    ): array {
        $this->pruneTerminal();

        return $this->withRetry(function () use ($moduleUniqueId, $operation, $params, $channelId, $batchId, $wasEnabled): array {
            [$uid, $token] = $this->insertRow(
                $moduleUniqueId,
                $operation,
                ModuleOperations::STATE_RUNNING,
                $params,
                $channelId,
                $batchId,
                $wasEnabled
            );
            return [$uid, $token];
        });
    }

    /**
     * CAS transition pending -> running, records pid/pgid and start time.
     */
    public function startRunning(string $operationUid, string $fencingToken, int $pid, int $pgid): bool
    {
        $now = time();
        return $this->casUpdate(
            $operationUid,
            $fencingToken,
            [ModuleOperations::STATE_PENDING],
            [
                'state' => ModuleOperations::STATE_RUNNING,
                'pid' => $pid,
                'pgid' => $pgid,
                'startedAt' => $now,
                'heartbeatAt' => $now,
            ]
        );
    }

    /**
     * Refreshes the heartbeat of an active operation (CAS by token).
     */
    public function heartbeat(string $operationUid, string $fencingToken): bool
    {
        return $this->casUpdate(
            $operationUid,
            $fencingToken,
            ModuleOperations::ACTIVE_STATES,
            ['heartbeatAt' => time()]
        );
    }

    /**
     * Records the current stage and optional progress (CAS by token).
     */
    public function updateStage(string $operationUid, string $fencingToken, string $stage, ?int $progress = null): bool
    {
        $fields = ['stage' => $stage, 'heartbeatAt' => time()];
        if ($progress !== null) {
            $fields['progress'] = max(0, min(100, $progress));
        }
        return $this->casUpdate($operationUid, $fencingToken, ModuleOperations::ACTIVE_STATES, $fields);
    }

    /**
     * Updates whitelisted checkpoint fields of an active operation (CAS by token).
     *
     * @param array<string, string|int|null> $fields
     */
    public function setFields(string $operationUid, string $fencingToken, array $fields): bool
    {
        $unknown = array_diff(array_keys($fields), self::WRITABLE_FIELDS);
        if ($unknown !== []) {
            throw new RuntimeException('Not writable journal fields: ' . implode(', ', $unknown));
        }
        if ($fields === []) {
            return true;
        }
        return $this->casUpdate($operationUid, $fencingToken, ModuleOperations::ACTIVE_STATES, $fields);
    }

    /**
     * Generic CAS state transition.
     *
     * @param string[] $fromStates Allowed source states
     * @param array<string, string|int|null> $extraFields Extra columns to set
     */
    public function transition(
        string $operationUid,
        string $fencingToken,
        array $fromStates,
        string $toState,
        array $extraFields = []
    ): bool {
        $fields = array_merge($extraFields, ['state' => $toState]);
        if (ModuleOperations::isTerminalState($toState)) {
            $fields['finishedAt'] = time();
        }
        return $this->casUpdate($operationUid, $fencingToken, $fromStates, $fields);
    }

    /**
     * Finalizes an operation: completed on success, failed otherwise.
     * A single CAS UPDATE — stage and progress land atomically with the state.
     *
     * @param array $messages PBXApiResult::messages formatted errors
     * @param string|null $stage Optional final stage name to record
     */
    public function finish(
        string $operationUid,
        string $fencingToken,
        bool $success,
        array $messages = [],
        ?string $stage = null
    ): bool {
        $fields = [
            'errorData' => json_encode($messages, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'heartbeatAt' => time(),
        ];
        if ($success) {
            $fields['progress'] = 100;
        }
        if ($stage !== null) {
            $fields['stage'] = $stage;
        }
        return $this->transition(
            $operationUid,
            $fencingToken,
            ModuleOperations::ACTIVE_STATES,
            $success ? ModuleOperations::STATE_COMPLETED : ModuleOperations::STATE_FAILED,
            $fields
        );
    }

    /**
     * Invalidates the fencing token of an active operation before reaping it.
     * After this call the original process can no longer finalize the row.
     *
     * @return string|null The new token, or null when no active row matched
     */
    public function invalidateToken(string $operationUid): ?string
    {
        $newToken = self::generateToken();
        $placeholders = self::statePlaceholders(ModuleOperations::ACTIVE_STATES);
        $affected = $this->withRetry(function () use ($operationUid, $newToken, $placeholders): int {
            $sql = 'UPDATE ' . self::TABLE
                . ' SET fencingToken = :token WHERE operationUid = :uid AND state IN (' . $placeholders . ')';
            $stmt = $this->db->prepare($sql);
            $stmt->execute(array_merge(
                ['token' => $newToken, 'uid' => $operationUid],
                self::stateBindings(ModuleOperations::ACTIVE_STATES)
            ));
            return $stmt->rowCount();
        });
        return $affected === 1 ? $newToken : null;
    }

    /**
     * Returns the raw journal row by operation uid (internal fields included).
     */
    public function getByUid(string $operationUid): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM ' . self::TABLE . ' WHERE operationUid = :uid LIMIT 1');
        $stmt->execute(['uid' => $operationUid]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    /**
     * Returns the active operation row for a module, when one exists.
     */
    public function getActiveForModule(string $moduleUniqueId): ?array
    {
        $placeholders = self::statePlaceholders(ModuleOperations::ACTIVE_STATES);
        $stmt = $this->db->prepare(
            'SELECT * FROM ' . self::TABLE
            . ' WHERE moduleUniqueId = :module AND state IN (' . $placeholders . ') ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute(array_merge(
            ['module' => $moduleUniqueId],
            self::stateBindings(ModuleOperations::ACTIVE_STATES)
        ));
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    /**
     * Returns all active operation rows (supervisor input).
     *
     * @return array[] Raw rows
     */
    public function getAllActive(): array
    {
        $placeholders = self::statePlaceholders(ModuleOperations::ACTIVE_STATES);
        $stmt = $this->db->prepare(
            'SELECT * FROM ' . self::TABLE . ' WHERE state IN (' . $placeholders . ') ORDER BY id'
        );
        $stmt->execute(self::stateBindings(ModuleOperations::ACTIVE_STATES));
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * Returns recent operations, newest first, optionally per module.
     *
     * @return array[] Raw rows
     */
    public function getRecent(string $moduleUniqueId = '', int $limit = 20): array
    {
        $limit = max(1, min(100, $limit));
        if ($moduleUniqueId !== '') {
            $stmt = $this->db->prepare(
                'SELECT * FROM ' . self::TABLE . ' WHERE moduleUniqueId = :module ORDER BY id DESC LIMIT ' . $limit
            );
            $stmt->execute(['module' => $moduleUniqueId]);
        } else {
            $stmt = $this->db->prepare('SELECT * FROM ' . self::TABLE . ' ORDER BY id DESC LIMIT ' . $limit);
            $stmt->execute();
        }
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * Formats a raw journal row for API/UI consumption.
     * Never exposes the fencing token or internal snapshots.
     */
    public static function toApiArray(array $row): array
    {
        $state = (string)($row['state'] ?? '');
        $heartbeat = (int)($row['heartbeatAt'] ?? 0);
        return [
            'operationId' => (string)($row['operationUid'] ?? ''),
            'moduleUniqueId' => (string)($row['moduleUniqueId'] ?? ''),
            'operation' => (string)($row['operation'] ?? ''),
            'state' => $state,
            'stage' => (string)($row['stage'] ?? ''),
            'progress' => (int)($row['progress'] ?? 0),
            'terminal' => ModuleOperations::isTerminalState($state),
            'stale' => !ModuleOperations::isTerminalState($state)
                && $heartbeat < (time() - self::HEARTBEAT_STALE_AFTER),
            'errorMessages' => json_decode((string)($row['errorData'] ?? ''), true) ?: [],
            'batchId' => (string)($row['batchId'] ?? ''),
            'channelId' => (string)($row['channelId'] ?? ''),
            'wasEnabled' => ($row['wasEnabled'] ?? '0') === '1',
            'createdAt' => (int)($row['createdAt'] ?? 0),
            'startedAt' => (int)($row['startedAt'] ?? 0),
            'finishedAt' => (int)($row['finishedAt'] ?? 0),
            'heartbeatAt' => $heartbeat,
        ];
    }

    /**
     * Deletes old terminal rows, keeping the RECENT_KEEP newest ones.
     * Failures are swallowed: pruning must never break an operation.
     */
    public function pruneTerminal(): void
    {
        try {
            $placeholders = self::statePlaceholders(ModuleOperations::TERMINAL_STATES);
            $sql = 'DELETE FROM ' . self::TABLE
                . ' WHERE state IN (' . $placeholders . ')'
                . ' AND id NOT IN (SELECT id FROM ' . self::TABLE
                . ' WHERE state IN (' . self::statePlaceholders(ModuleOperations::TERMINAL_STATES, 'k') . ')'
                . ' ORDER BY id DESC LIMIT ' . self::RECENT_KEEP . ')';
            $stmt = $this->db->prepare($sql);
            $stmt->execute(array_merge(
                self::stateBindings(ModuleOperations::TERMINAL_STATES),
                self::stateBindings(ModuleOperations::TERMINAL_STATES, 'k')
            ));
        } catch (PDOException) {
            // Housekeeping only
        }
    }

    /**
     * Inserts a new journal row. Caller controls transactional context.
     *
     * @return array{0: string, 1: string} [operationUid, fencingToken]
     */
    private function insertRow(
        string $moduleUniqueId,
        string $operation,
        string $state,
        array $params,
        string $channelId,
        string $batchId,
        bool $wasEnabled
    ): array {
        $uid = self::generateUid();
        $token = self::generateToken();
        $now = time();
        $running = $state === ModuleOperations::STATE_RUNNING;
        $stmt = $this->db->prepare(
            'INSERT INTO ' . self::TABLE
            . ' (operationUid, moduleUniqueId, operation, state, stage, progress, params, errorData,'
            . ' wasEnabled, swapDone, batchId, channelId, fencingToken, pid, heartbeatAt, startedAt, createdAt)'
            . ' VALUES (:uid, :module, :operation, :state, :stage, 0, :params, :errors,'
            . ' :wasEnabled, :swapDone, :batchId, :channelId, :token, :pid, :heartbeatAt, :startedAt, :createdAt)'
        );
        $stmt->execute([
            'uid' => $uid,
            'module' => $moduleUniqueId,
            'operation' => $operation,
            'state' => $state,
            'stage' => '',
            'params' => json_encode($params, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            'errors' => '',
            'wasEnabled' => $wasEnabled ? '1' : '0',
            'swapDone' => '0',
            'batchId' => $batchId,
            'channelId' => $channelId,
            'token' => $token,
            'pid' => $running ? getmypid() : null,
            'heartbeatAt' => $now,
            'startedAt' => $running ? $now : null,
            'createdAt' => $now,
        ]);
        return [$uid, $token];
    }

    /**
     * Compare-and-set UPDATE by operationUid + fencingToken + allowed states.
     *
     * @param string[] $fromStates
     * @param array<string, string|int|null> $fields
     */
    private function casUpdate(string $operationUid, string $fencingToken, array $fromStates, array $fields): bool
    {
        $assignments = [];
        $bindings = [];
        $i = 0;
        foreach ($fields as $column => $value) {
            if (!preg_match('/^[A-Za-z][A-Za-z0-9]*$/', $column)) {
                throw new RuntimeException("Invalid journal column name: $column");
            }
            $ph = 'f' . $i++;
            $assignments[] = "$column = :$ph";
            $bindings[$ph] = $value;
        }
        $placeholders = self::statePlaceholders($fromStates);
        $sql = 'UPDATE ' . self::TABLE . ' SET ' . implode(', ', $assignments)
            . ' WHERE operationUid = :uid AND fencingToken = :token AND state IN (' . $placeholders . ')';
        return $this->withRetry(function () use ($sql, $bindings, $operationUid, $fencingToken, $fromStates): bool {
            $stmt = $this->db->prepare($sql);
            $stmt->execute(array_merge(
                $bindings,
                ['uid' => $operationUid, 'token' => $fencingToken],
                self::stateBindings($fromStates)
            ));
            return $stmt->rowCount() === 1;
        });
    }

    /**
     * Fetches one active row inside an open transaction.
     */
    private function fetchActiveRowLocked(): ?array
    {
        $placeholders = self::statePlaceholders(ModuleOperations::ACTIVE_STATES);
        $stmt = $this->db->prepare(
            'SELECT * FROM ' . self::TABLE . ' WHERE state IN (' . $placeholders . ') ORDER BY id LIMIT 1'
        );
        $stmt->execute(self::stateBindings(ModuleOperations::ACTIVE_STATES));
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row === false ? null : $row;
    }

    /**
     * Retries the callback on SQLite "database is locked" with linear backoff.
     *
     * @template T
     * @param callable(): T $callback
     * @return T
     */
    private function withRetry(callable $callback): mixed
    {
        $lastException = null;
        for ($attempt = 1; $attempt <= self::DB_LOCKED_MAX_RETRIES; $attempt++) {
            try {
                return $callback();
            } catch (PDOException $e) {
                if (!str_contains($e->getMessage(), 'database is locked')) {
                    throw $e;
                }
                $lastException = $e;
                if ($attempt < self::DB_LOCKED_MAX_RETRIES) {
                    usleep(self::DB_LOCKED_BASE_DELAY_US * $attempt);
                }
            }
        }
        throw $lastException;
    }

    /**
     * @param string[] $states
     */
    private static function statePlaceholders(array $states, string $prefix = 's'): string
    {
        return implode(', ', array_map(
            static fn(int $i): string => ':' . $prefix . $i,
            array_keys($states)
        ));
    }

    /**
     * @param string[] $states
     * @return array<string, string>
     */
    private static function stateBindings(array $states, string $prefix = 's'): array
    {
        $bindings = [];
        foreach (array_values($states) as $i => $state) {
            $bindings[$prefix . $i] = $state;
        }
        return $bindings;
    }

    private static function generateUid(): string
    {
        return bin2hex(random_bytes(12));
    }

    private static function generateToken(): string
    {
        return bin2hex(random_bytes(16));
    }
}
