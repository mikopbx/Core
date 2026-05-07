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

namespace MikoPBX\Core\System;

use InvalidArgumentException;
use MikoPBX\Core\System\Exceptions\OutOfDiskSpaceException;
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use Phalcon\Di\Di;
use RuntimeException;
use Throwable;

/**
 * Class Processes
 *
 * Manages system and PHP processes with enhanced safety and reliability.
 *
 * @package MikoPBX\Core\System
 */
class Processes
{
    /**
     * Default timeout for background process execution in seconds
    */
    private const DEFAULT_BG_TIMEOUT = 4;

    /**
     * Default number of attempts for safe daemon start
     */
    private const DEFAULT_START_ATTEMPTS = 20;

    /**
     * Default timeout between attempts in microseconds
     */
    private const DEFAULT_ATTEMPT_TIMEOUT = 1000000;

    /**
     * Default output file for process logs
     */
    private const DEFAULT_OUTPUT_FILE = '/dev/null';

    /**
     * Directory for temporary shell scripts
     */
    private const TEMP_SCRIPTS_DIR = '/tmp';

    /**
     * Valid process actions
     */
    private const VALID_ACTIONS = ['start', 'stop', 'restart', 'status', 'soft-restart'];


    /**
     * Directory for process lock files
     */
    private const LOCK_FILE_DIR = '/var/run/php-workers';
    private const PID_FILE_SUFFIX = '.pid';

    /**
     * Suffix marker for atomic-rename temp PID files (`.pid.tmp.<pid>`).
     * Kept as a constant so {@see cleanupStalePidFiles()} can sweep
     * orphans left behind by an ENOSPC-triggered crash without
     * duplicating the literal. Issue #1051.
     */
    private const PID_TMP_MARKER = '.pid.tmp.';

    /**
     * Maximum age (seconds) of an orphan `.pid.tmp.<pid>` file before
     * {@see cleanupStalePidFiles()} unlinks it. A live worker should
     * complete its `file_put_contents → rename` cycle in microseconds,
     * so anything older than this is by definition a leak from a
     * crashed atomic write (typically ENOSPC). Issue #1051.
     */
    private const PID_TMP_ORPHAN_AGE_SEC = 60;

    /**
     * Graceful shutdown timeout in seconds
     */
    private const GRACEFUL_SHUTDOWN_TIMEOUT = 30; // Must be well under watchdog (120s)

    /**
     * Returns the directory where worker PID and temp PID files live.
     * Single source of truth for callers outside this class
     * ({@see WorkerSafeScriptsCore::getDiskState()},
     * {@see WorkerBase::refuseStartIfPidDirFull()}) so they cannot
     * drift from this class's internal `LOCK_FILE_DIR` literal.
     * Issue #1051.
     */
    public static function getLockFileDir(): string
    {
        return self::LOCK_FILE_DIR;
    }

    /**
     * Cleans up stale PID files in the workers directory. Thin
     * wrapper around {@see cleanupStalePidFilesIn()} that pins the
     * production location; the helper takes a `$dir` argument so unit
     * tests can exercise the same logic against a sandbox.
     *
     * @return void
     */
    private static function cleanupStalePidFiles(): void
    {
        self::cleanupStalePidFilesIn(self::LOCK_FILE_DIR);
    }

    /**
     * Per-directory cleanup of stale PID files. Two passes:
     *
     *   1. Real PID files (`*.pid`) — unlinked when the recorded PID is
     *      no longer running. Same behaviour as before.
     *   2. Orphan `.tmp.<pid>` files left behind by a crashed atomic
     *      write (typically ENOSPC during {@see savePidFile()}). The
     *      embedded PID lets a live worker recognise its own in-flight
     *      tmp file and skip it; older files are unconditionally
     *      unlinked to free tmpfs space and keep the directory listing
     *      from growing unbounded. Issue #1051.
     *
     * Visibility is `public` so two callers can target it:
     *   - production: {@see WorkerSafeScriptsCore::maybeCleanupOnDiskWarning()}
     *     forces a sweep during disk pressure when the normal
     *     `processPHPWorker()` path is gated off by the disk-watchdog;
     *   - unit tests: exercise the algorithm against a sandbox dir.
     *
     * Production callers MUST pass {@see getLockFileDir()} — passing
     * any other path bypasses the single source of truth that
     * {@see cleanupStalePidFiles()} pins. Issue #1051.
     *
     * @param string $dir Absolute directory path to clean
     * @return void
     */
    public static function cleanupStalePidFilesIn(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        // Pass 1: real PID files only. The previous glob `*.pid*` also
        // matched `.pid.tmp.*` files, which produced spurious "PID is not
        // running" cleanups for in-flight atomic writes. Limit the glob
        // to suffix-terminated names to keep that branch focused.
        $pidFiles = glob($dir . '/*' . self::PID_FILE_SUFFIX);
        if ($pidFiles !== false) {
            foreach ($pidFiles as $file) {
                $pid = @file_get_contents($file);
                if ($pid === false) {
                    self::removePidFile($file);
                    continue;
                }
                if (!self::isProcessRunning($pid)) {
                    self::removePidFile($file);
                }
            }
        }

        // Pass 2: orphan atomic-write temp files. Each tmp name embeds
        // the writer's PID (see savePidFile()), so we can drop the
        // owner check and rely on age + PID liveness alone.
        $tmpFiles = glob($dir . '/*' . self::PID_TMP_MARKER . '*');
        if ($tmpFiles === false) {
            return;
        }
        $now = time();
        foreach ($tmpFiles as $file) {
            $mtime = @filemtime($file);
            if ($mtime !== false && ($now - $mtime) < self::PID_TMP_ORPHAN_AGE_SEC) {
                // Recent file — could belong to a worker mid-write. Skip.
                continue;
            }
            // Best-effort: also skip if the embedded PID is alive and
            // the file is on the borderline; otherwise unlink. This
            // protects a worker that legitimately stalled between
            // file_put_contents and rename (rare, but possible under
            // heavy I/O pressure).
            $writerPid = self::extractPidFromTmpName($file);
            if ($writerPid > 0 && self::isProcessRunning((string)$writerPid)) {
                continue;
            }
            @unlink($file);
        }
    }

    /**
     * Extracts the writer PID from an atomic-write temp filename.
     * Filenames have the shape `<class>.pid.tmp.<pid>` — see
     * {@see savePidFile()} for the producer side. Issue #1051.
     *
     * @param string $tmpFile Absolute path of the temp file
     * @return int Writer PID, or 0 if the suffix is unrecognised
     */
    private static function extractPidFromTmpName(string $tmpFile): int
    {
        $pos = strrpos($tmpFile, self::PID_TMP_MARKER);
        if ($pos === false) {
            return 0;
        }
        $tail = substr($tmpFile, $pos + strlen(self::PID_TMP_MARKER));
        return ctype_digit($tail) ? (int)$tail : 0;
    }

    /**
     * Gets the path to the PID file for a given class name
     *
     * @param string $className The class name
     * @param int $instanceNum The instance number (for workers with multiple instances)
     * @return string Path to the PID file
     */
    public static function getPidFilePath(string $className, int $instanceNum = 1): string
    {
        // Ensure PID directory exists
        Util::mwMkdir(self::LOCK_FILE_DIR, true);
        $name = str_replace('\\', '-', $className);
        if ($instanceNum > 1) {
            return self::LOCK_FILE_DIR . "/$name-$instanceNum" . self::PID_FILE_SUFFIX;
        }
        return self::LOCK_FILE_DIR . "/$name" . self::PID_FILE_SUFFIX;
    }


    /**
     * Saves a PID to a file with proper locking.
     *
     * On ENOSPC (errno=28, "No space left on device" — also reported by
     * some filesystems for inode exhaustion) throws an
     * {@see OutOfDiskSpaceException} instead of a generic RuntimeException
     * so callers can distinguish operational failure from a code defect
     * and skip Sentry capture / restart-loop. Issue #1051.
     *
     * The temp filename embeds the writer PID (`.pid.tmp.<pid>`) instead
     * of `uniqid()` so:
     *   - Sentry deduplicates correctly (the temp path appears in the
     *     exception text); previously every event had a unique
     *     fingerprint, producing 14 sibling issue groups for one root
     *     cause.
     *   - {@see cleanupStalePidFiles()} can verify whether the writer
     *     is still alive before unlinking an orphan tmp file.
     *
     * @param string $pidFile Path to the PID file
     * @param int $pid Process ID to save
     * @throws OutOfDiskSpaceException When the filesystem is out of space/inodes
     * @throws RuntimeException For other I/O failures (permissions, races, etc.)
     */
    public static function savePidFile(string $pidFile, int $pid): void
    {
        try {
            $pidDir = dirname($pidFile);

            // Ensure PID directory exists. mkdir() failure on a full
            // filesystem also surfaces ENOSPC; classify it here so the
            // caller does not paper over it with a generic Runtime error.
            if (!is_dir($pidDir) && !mkdir($pidDir, 0755, true)) {
                self::throwIfOutOfSpace("Could not create PID directory: $pidDir");
                throw new RuntimeException("Could not create PID directory: $pidDir");
            }

            // Atomic write: temp file → rename. The PID-suffix keeps
            // each writer's tmp name stable so concurrent restarts do
            // not pile up `*.pid.tmp.<rand>` orphans on tmpfs.
            $tempFile = $pidFile . self::PID_TMP_MARKER . $pid;

            if (file_put_contents($tempFile, (string)$pid, LOCK_EX) === false) {
                self::throwIfOutOfSpace("Could not write to temp PID file: $tempFile");
                throw new RuntimeException("Could not write to temp PID file: $tempFile");
            }

            // Atomic rename. Overwrites an existing PID file if present
            // (e.g. a previous crashed run left one behind).
            if (!rename($tempFile, $pidFile)) {
                @unlink($tempFile);
                self::throwIfOutOfSpace("Could not atomically create PID file: $pidFile");
                throw new RuntimeException("Could not atomically create PID file: $pidFile");
            }
        } catch (OutOfDiskSpaceException $e) {
            // Already-typed disk-full failure. Log at NOTICE rather than
            // WARNING — operational, not exceptional — and rethrow as-is
            // so {@see WorkerBase::__construct()} can route around the
            // Sentry capture path.
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Disk full while saving PID file ($pidFile): " . $e->getMessage(),
                LOG_NOTICE
            );
            throw $e;
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Failed to save PID file: " . $e->getMessage(),
                LOG_WARNING
            );
            throw new RuntimeException('PID file operation failed', 0, $e);
        }
    }

    /**
     * Inspects {@see error_get_last()} for an ENOSPC signal and, when
     * present, throws an {@see OutOfDiskSpaceException} carrying both
     * the caller-supplied context and the libc error message.
     *
     * Centralises the detection so the three failure branches in
     * {@see savePidFile()} stay symmetric. Issue #1051.
     *
     * Detection strategy is belt-and-braces:
     *
     *   1. Match the English libc strerror "No space left on device"
     *      (canonical across glibc/musl/uclibc under LANG=C/POSIX).
     *   2. Match the locale-translated strerror via {@see posix_strerror()}
     *      — covers a worker accidentally inheriting LANG=ru_RU.UTF-8
     *      etc., where glibc returns "На устройстве не осталось…".
     *   3. As a last resort, probe {@see disk_free_space()} on the
     *      writable directory inferred from $context. If the fs is
     *      effectively empty (< 4 KiB), classify as ENOSPC regardless
     *      of message text. This catches a localised system whose
     *      strerror text we have not anticipated, and the brief
     *      between-syscalls race where the message disappeared from
     *      `error_get_last()` because of an intervening @-suppressed
     *      operation.
     *
     * We deliberately avoid relying on `errno` ints — PHP does not
     * expose them on `file_put_contents`/`mkdir`/`rename` failures.
     *
     * @param string $context Caller-supplied description (must include
     *                        a path so the disk_free_space probe can
     *                        derive the target filesystem)
     * @throws OutOfDiskSpaceException When the last error matches ENOSPC
     */
    private static function throwIfOutOfSpace(string $context): void
    {
        $err = error_get_last();
        $msg = $err === null ? '' : (string)($err['message'] ?? '');

        // (1) English strerror — fast path, covers C/POSIX locale.
        $isEnospc = ($msg !== '' && stripos($msg, 'No space left on device') !== false);

        // (2) Locale-translated strerror — only built once, cached on
        // a static for cheap repeated lookups in restart loops.
        if (!$isEnospc && $msg !== '' && function_exists('posix_strerror')) {
            static $localisedEnospc = null;
            if ($localisedEnospc === null) {
                // 28 == ENOSPC. posix_strerror() respects LC_MESSAGES.
                $localisedEnospc = (string)posix_strerror(28);
            }
            if ($localisedEnospc !== '' && stripos($msg, $localisedEnospc) !== false) {
                $isEnospc = true;
            }
        }

        // (3) Belt-and-braces: probe the filesystem directly. If the
        // hosting fs is effectively empty, classify as ENOSPC even
        // when the message text was lost or untranslated.
        if (!$isEnospc) {
            $probeDir = self::extractProbeDir($context);
            if ($probeDir !== '' && is_dir($probeDir)) {
                $free = @disk_free_space($probeDir);
                if ($free !== false && $free < 4096) {
                    $isEnospc = true;
                }
            }
        }

        if (!$isEnospc) {
            return;
        }
        throw new OutOfDiskSpaceException("$context: " . ($msg !== '' ? $msg : 'disk full (probe)'));
    }

    /**
     * Extracts a directory path from the {@see throwIfOutOfSpace()}
     * context string for a `disk_free_space()` probe. The context is
     * caller-formatted (`"Could not write to temp PID file: $tempFile"`,
     * etc.); we look for the absolute-path tail and normalise it to
     * the parent directory. Returns an empty string if no plausible
     * path is found. Issue #1051.
     */
    private static function extractProbeDir(string $context): string
    {
        $pos = strpos($context, '/');
        if ($pos === false) {
            return '';
        }
        $path = substr($context, $pos);
        // Strip a trailing colon-and-text combinator if the caller
        // appended a libc message after the path (defensive — the
        // current call sites do not, but future ones may).
        $colon = strpos($path, ':');
        if ($colon !== false) {
            $path = substr($path, 0, $colon);
        }
        return is_dir($path) ? $path : dirname($path);
    }

    /**
     * Removes a PID file if it exists and belongs to the specified process
     *
     * @param string $pidFile Path to the PID file
     * @param int|null $expectedPid Expected PID (if null, removes without checking)
     * @return bool True if file was removed, false otherwise
     */
    public static function removePidFile(string $pidFile, ?int $expectedPid = null): bool
    {
        if (!file_exists($pidFile)) {
            return false;
        }

        try {
            // If expectedPid is provided, verify it matches
            if ($expectedPid !== null) {
                $storedPid = @file_get_contents($pidFile);
                if ($storedPid === false || (int)$storedPid !== $expectedPid) {
                    return false;
                }
            }

            return @unlink($pidFile);
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Failed to remove PID file {$pidFile}: " . $e->getMessage(),
                LOG_WARNING
            );
            return false;
        }
    }

    /**
     * Validates process action.
     *
     * @param string $action Action to validate
     * @return bool
     */
    private static function isValidAction(string $action): bool
    {
        return in_array($action, self::VALID_ACTIONS, true);
    }

    /**
     * Checks if a process is running.
     *
     * @param string $processIdOrName Process ID or name
     * @return bool
     */
    public static function isProcessRunning(string $processIdOrName): bool
    {
        if (is_numeric($processIdOrName)) {
            // Check by PID
            return file_exists("/proc/$processIdOrName");
        }
        // Check by process name
        return self::getPidOfProcess($processIdOrName) !== '';
    }

    /**
     * Waits for a set of processes to exit.
     *
     * @param array $pids Process IDs to wait for
     * @param int $timeout Maximum seconds to wait
     * @return bool True if all exited, false on timeout
     */
    private static function waitForProcessesExit(array $pids, int $timeout): bool
    {
        $start = time();
        while (time() - $start < $timeout) {
            $stillRunning = false;
            foreach ($pids as $pid) {
                if (!empty($pid) && posix_kill((int)$pid, 0)) {
                    $stillRunning = true;
                    break;
                }
            }
            if (!$stillRunning) {
                return true;
            }
            sleep(1);
        }
        return false;
    }

    /**
     * Safely terminates a process with timeout.
     *
     * @param string $pid Process ID to terminate
     * @param int $timeout Timeout in seconds
     * @return bool Success status
     */
    private static function safeTerminateProcess(string $pid, int $timeout = 10): bool
    {
        if (empty($pid)) {
            return false;
        }

        $kill = Util::which('kill');

        // First try SIGTERM
        self::mwExec("$kill -SIGTERM $pid");

        // Wait for process to terminate
        $startTime = time();
        while (time() - $startTime < $timeout) {
            if (!self::isProcessRunning($pid)) {
                return true;
            }
            usleep(100000); // 100ms
        }

        // Force kill if still running
        self::mwExec("$kill -9 $pid");
        return !self::isProcessRunning($pid);
    }


    /**
     * Waits for a process to start.
     *
     * @param string $procName Process name
     * @param string $excludeName Process name to exclude
     * @param int $attempts Maximum number of attempts
     * @param int $timeout Timeout between attempts
     * @return string Process ID or empty string
     */
    private static function waitForProcessStart(
        string $procName,
        string $excludeName,
        int $attempts,
        int $timeout
    ): string {
        $attempt = 1;
        while ($attempt < $attempts) {
            $pid = self::getPidOfProcess($procName, $excludeName);
            if (!empty($pid)) {
                return $pid;
            }
            usleep($timeout);
            $attempt++;
        }
        return '';
    }

    /**
     * Kills a process/daemon by name.
     *
     * @param string $procName The name of the process/daemon to kill.
     * @return int|null The return code of the execution.
     */
    public static function killByName(string $procName): ?int
    {
        if (empty(trim($procName))) {
            throw new InvalidArgumentException('Process name cannot be empty');
        }

        $killallPath = Util::which('killall');
        return self::mwExec($killallPath . ' ' . escapeshellarg($procName));
    }

    /**
     * Executes a command using exec().
     *
     * @param string $command The command to execute.
     * @param array|null $outArr Reference to array for command output.
     * @param int|null $retVal Reference for return value.
     * @return int The return value of the execution.
     * @throws RuntimeException If command is empty.
     */
    public static function mwExec(string $command, ?array &$outArr = null, ?int &$retVal = null): int
    {
        if (empty(trim($command))) {
            throw new RuntimeException('Empty command provided to mwExec');
        }

        $retVal = 0;
        $outArr = [];
        $di = Di::getDefault();

        if ($di !== null && $di->getShared('config')->path('core.debugMode')) {
            echo "mwExec(): $command\n";
        } else {
            exec("$command 2>&1", $outArr, $retVal);
        }
        return $retVal;
    }

    /**
     * Executes a command as a background process with timeout.
     *
     * @param string $command The command to execute.
     * @param int $timeout The timeout value in seconds.
     * @param string $logName The name of the log file.
     */
    public static function mwExecBgWithTimeout(
        string $command,
        int $timeout = self::DEFAULT_BG_TIMEOUT,
        string $logName = self::DEFAULT_OUTPUT_FILE
    ): void {
        $di = Di::getDefault();

        if ($di !== null && $di->getShared('config')->path('core.debugMode')) {
            echo "mwExecBg(): $command\n";
            return;
        }

        $nohup = Util::which('nohup');
        $timeoutBin = Util::which('timeout');
        exec("$nohup $timeoutBin $timeout $command > $logName 2>&1 &");
    }

    /**
     * Executes multiple commands sequentially.
     *
     * @param array $arrCmds The array of commands to execute.
     * @param array|null $out Reference to array for output.
     * @param string $logname The log file name.
     */
    public static function mwExecCommands(array $arrCmds, ?array &$out = [], string $logname = ''): void
    {
        $out = [];
        foreach ($arrCmds as $cmd) {
            $out[] = "$cmd;";
            $outCmd = [];
            self::mwExec($cmd, $outCmd);
            $out = array_merge($out, $outCmd);
        }

        if ($logname !== '') {
            $result = implode("\n", $out);
            file_put_contents(
                self::TEMP_SCRIPTS_DIR . "/{$logname}_commands.log",
                $result
            );
        }
    }

    /**
     * Restarts all workers in a separate process with improved pipeline.
     * 
     * The restart process:
     * 1. Starts WorkerSafeScriptsCore with restart parameter
     * 2. WorkerSafeScriptsCore collects all workers and their forks
     * 3. Starts new instances of each worker
     * 4. Gracefully shuts down old workers
     * 
     * @param bool $softRestart If true, performs a soft restart (SIGUSR1 only)
     */
    public static function restartAllWorkers(bool $softRestart = false): void
    {
        $workerSafeScriptsPath = Util::getFilePathByClassName(WorkerSafeScriptsCore::class);
        $php = Util::which('php');
                
        // Set the restart mode
        $restartMode = $softRestart ? 'soft-restart' : 'restart';
        
        // Log the restart mode
        SystemMessages::sysLogMsg(
            __CLASS__,
            "Initiating " . ($softRestart ? "soft" : "full") . " restart of all workers",
            LOG_NOTICE
        );
        
        // Execute the restart command
        $workerSafeScripts = "$php -f $workerSafeScriptsPath $restartMode > /dev/null 2> /dev/null";
        self::mwExec($workerSafeScripts);
    }

    /**
     * Manages a PHP worker process.
     *
     * @param string $className The class name of the PHP worker.
     * @param string $paramForPHPWorker The parameter for the PHP worker.
     * @param string $action The action to perform.
     */
    public static function processPHPWorker(
        string $className,
        string $paramForPHPWorker = 'start',
        string $action = 'restart'
    ): void {
        // Clean up stale PID files before managing workers
        self::cleanupStalePidFiles();

        if (!self::isValidAction($action)) {
            throw new InvalidArgumentException("Invalid action: $action");
        }

        SystemMessages::sysLogMsg(
            __METHOD__,
            "processPHPWorker $className action-$action",
            LOG_DEBUG
        );

        $workerPath = Util::getFilePathByClassName($className);
        if (empty($workerPath) || !class_exists($className)) {
            return;
        }

        $php = Util::which('php');
        $command = "$php -f $workerPath";
        $kill = Util::which('kill');

        $activeProcesses = self::getPidOfProcess($className);
        $processes = array_filter(explode(' ', $activeProcesses));
        $currentProcCount = count($processes);
        
        // Determine the needed instance count from class maxProc property
        $neededProcCount = 1; // Default to 1 process
        
        if (class_exists($className)) {
            // Get maxProc value from class
            $reflectionClass = new \ReflectionClass($className);
            if ($reflectionClass->hasProperty('maxProc')) {
                $defaultProperties = $reflectionClass->getDefaultProperties();
                if (isset($defaultProperties['maxProc'])) {
                    $neededProcCount = (int)$defaultProperties['maxProc'];
                }
            }
        }

        // Check if it's a soft restart
        $softRestart = ($action === 'soft-restart');
        $actualAction = $softRestart ? 'restart' : $action;

        self::handleWorkerAction(
            $actualAction,
            $activeProcesses,
            $command,
            $paramForPHPWorker,
            $kill,
            $currentProcCount,
            $neededProcCount,
            $processes,
            $className,
            $softRestart
        );
    }

    /**
     * Handles worker process actions.
     *
     * @param string $action Action to perform
     * @param string $activeProcesses Active process IDs
     * @param string $command Command to execute
     * @param string $paramForPHPWorker Worker parameters
     * @param string $kill Kill command path
     * @param int $currentProcCount Current process count
     * @param int $neededProcCount Needed process count
     * @param array $processes Process IDs array
     * @param string $className Worker class name
     * @param bool $softRestart Whether to perform a soft restart
     */
    private static function handleWorkerAction(
        string $action,
        string $activeProcesses,
        string $command,
        string $paramForPHPWorker,
        string $kill,
        int $currentProcCount,
        int $neededProcCount,
        array $processes,
        string $className = '',
        bool $softRestart = false
    ): void {
        switch ($action) {
            case 'restart':
                self::handleRestartAction(
                    $activeProcesses,
                    $kill,
                    $command,
                    $paramForPHPWorker,
                    $className,
                    $neededProcCount,
                    $softRestart
                );
                break;
            case 'stop':
                self::handleStopAction($activeProcesses, $kill);
                break;
            case 'start':
                self::handleStartAction(
                    $currentProcCount,
                    $neededProcCount,
                    $command,
                    $paramForPHPWorker,
                    $processes,
                    $kill
                );
                break;
        }
    }

    /**
     * Handles the restart action for a worker.
     *
     * @param string $activeProcesses Active process IDs
     * @param string $kill Kill command path
     * @param string $command Command to execute
     * @param string $paramForPHPWorker Worker parameters
     * @param string $workerClass Worker class name
     * @param int $neededProcCount Number of instances needed
     * @param bool $softRestart Whether to perform a soft restart (SIGUSR1 only)
     */
    private static function handleRestartAction(
        string $activeProcesses,
        string $kill,
        string $command,
        string $paramForPHPWorker,
        string $workerClass = '',
        int $neededProcCount = 1,
        bool $softRestart = false
    ): void {
        // Debug logging
        SystemMessages::sysLogMsg(
            __METHOD__,
            sprintf(
                "%s worker: %s, neededProcCount=%d, activeProcesses=%s",
                $softRestart ? "Soft restarting" : "Restarting",
                $workerClass,
                $neededProcCount,
                $activeProcesses
            ),
            LOG_NOTICE
        );

        if ($activeProcesses !== '') {
            // Always send SIGUSR1 for graceful shutdown
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf("SEND signal: %s", "SIGUSR1 $activeProcesses"),
                LOG_NOTICE
            );

            self::mwExec("$kill -SIGUSR1 $activeProcesses > /dev/null 2>&1");
            $pids = array_filter(explode(' ', $activeProcesses));

            if (!$softRestart) {
                // Full restart: escalate SIGUSR1 → SIGTERM → SIGKILL
                if (!self::waitForProcessesExit($pids, self::GRACEFUL_SHUTDOWN_TIMEOUT)) {
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "SIGUSR1 timeout ({$activeProcesses}), escalating to SIGTERM",
                        LOG_WARNING
                    );
                    self::mwExec("$kill -SIGTERM $activeProcesses > /dev/null 2>&1");

                    if (!self::waitForProcessesExit($pids, 10)) {
                        SystemMessages::sysLogMsg(
                            __METHOD__,
                            "SIGTERM timeout ({$activeProcesses}), sending SIGKILL",
                            LOG_ERR
                        );
                        self::mwExec("$kill -9 $activeProcesses > /dev/null 2>&1");
                        sleep(2); // Kernel needs time to reap killed processes

                        // If processes survived SIGKILL (D-state), don't spawn duplicates
                        $surviving = array_filter($pids, fn($pid) => !empty($pid) && posix_kill((int)$pid, 0));
                        if (!empty($surviving)) {
                            SystemMessages::sysLogMsg(
                                __METHOD__,
                                "CRITICAL: PIDs " . implode(',', $surviving) . " survived SIGKILL, skipping restart",
                                LOG_CRIT
                            );
                            return;
                        }
                    }
                }
            } else {
                // Soft restart: short wait for graceful shutdown (hot swap for API workers)
                self::waitForProcessesExit($pids, 5);
            }
        }

        // Re-check how many processes are actually running before starting new ones
        // Prevents duplicates when old processes haven't fully exited yet
        $remainingPids = self::getPidOfProcess($workerClass);
        $remainingCount = empty($remainingPids) ? 0 : count(array_filter(explode(' ', $remainingPids)));
        $toStart = max(0, $neededProcCount - $remainingCount);

        if ($toStart === 0) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "All {$neededProcCount} instances of {$workerClass} already running, skipping start",
                LOG_DEBUG
            );
            return;
        }

        // Start only the deficit number of workers
        if ($neededProcCount > 1) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf("Starting %d/%d worker instances for %s (%d already running)",
                    $toStart, $neededProcCount, $workerClass, $remainingCount),
                LOG_NOTICE
            );

            // Start from remainingCount+1 to avoid duplicate instance-IDs
            for ($i = $remainingCount + 1; $i <= $neededProcCount; $i++) {
                if ($toStart <= 0) {
                    break;
                }
                $instanceParam = " --instance-id={$i}";
                self::mwExecBg("{$command} {$paramForPHPWorker}{$instanceParam}");
                $toStart--;
                usleep(250000); // 250ms between launches
            }
        } else {
            self::mwExecBg("$command $paramForPHPWorker");
        }
    }

    /**
     * Handles the stop action for a worker.
     *
     * @param string $activeProcesses Active process IDs
     * @param string $kill Kill command path
     */
    private static function handleStopAction(string $activeProcesses, string $kill): void
    {
        if ($activeProcesses !== '') {
            self::mwExec("$kill -SIGUSR2 $activeProcesses > /dev/null 2>&1 &");
            self::mwExecBg("$kill -SIGTERM $activeProcesses");
        }
    }

    /**
     * Handles the start action for a worker.
     *
     * @param int $currentProcCount Current process count
     * @param int $neededProcCount Needed process count
     * @param string $command Command to execute
     * @param string $paramForPHPWorker Worker parameters
     * @param array $processes Process IDs array
     * @param string $kill Kill command path
     */
    private static function handleStartAction(
        int $currentProcCount,
        int $neededProcCount,
        string $command,
        string $paramForPHPWorker,
        array $processes,
        string $kill
    ): void {
        if ($currentProcCount === $neededProcCount) {
            return;
        }

        // Add debug logging
        SystemMessages::sysLogMsg(
            __METHOD__,
            sprintf(
                "Starting worker pool: currentCount=%d, neededCount=%d, command=%s",
                $currentProcCount,
                $neededProcCount,
                $command
            ),
            LOG_DEBUG
        );

        if ($neededProcCount > $currentProcCount) {
            // Start only the deficit number of instances
            $deficit = $neededProcCount - $currentProcCount;
            for ($i = 0; $i < $deficit; $i++) {
                $instanceParam = '';
                if ($neededProcCount > 1) {
                    $instanceId = $currentProcCount + $i + 1;
                    $instanceParam = " --instance-id={$instanceId}";
                }

                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf(
                        "Launching instance #%d (deficit %d/%d) with command: %s %s%s",
                        $currentProcCount + $i + 1,
                        $i + 1,
                        $deficit,
                        $command,
                        $paramForPHPWorker,
                        $instanceParam
                    ),
                    LOG_DEBUG
                );

                self::mwExecBg("{$command} {$paramForPHPWorker}{$instanceParam}");
            }
        } elseif ($currentProcCount > $neededProcCount) {
            $countProc4Kill = $currentProcCount - $neededProcCount;
            for ($i = 0; $i < $countProc4Kill; $i++) {
                if (!isset($processes[$i])) {
                    break;
                }
                self::mwExec("$kill -SIGUSR1 {$processes[$i]} > /dev/null 2>&1 &");
                self::mwExecBg("$kill -SIGTERM {$processes[$i]}");
            }
        }
    }

    /**
     * Retrieves the PID of a process by its name.
     *
     * @param string $name Process name
     * @param string $exclude Process name to exclude
     * @return string Process IDs
     */
    public static function getPidOfProcess(string $name, string $exclude = ''): string
    {
        $ps = Util::which('ps');
        $grep = Util::which('grep');
        $awk = Util::which('awk');

        $name = addslashes($name);
        $filterCmd = '';
        if (!empty($exclude)) {
            $filterCmd = "| $grep -v " . escapeshellarg($exclude);
        }

        $out = [];
        self::mwExec(
            "$ps -A -o 'pid,args' $filterCmd | $grep '$name' | $grep -v grep | $awk '{print $1}'",
            $out
        );

        return trim(implode(' ', $out));
    }

    /**
     * Returns the RSS (Resident Set Size) of a process in bytes.
     * Reads from /proc/{pid}/status to avoid forking a new process.
     *
     * @param int $pid Process ID
     * @return int RSS in bytes, or 0 if process not found or unreadable
     */
    public static function getProcessRss(int $pid): int
    {
        $statusFile = "/proc/{$pid}/status";
        if (!file_exists($statusFile)) {
            return 0;
        }
        $content = @file_get_contents($statusFile);
        if ($content === false) {
            return 0;
        }
        // VmRSS line format: "VmRSS:    12345 kB"
        if (preg_match('/^VmRSS:\s+(\d+)\s+kB$/m', $content, $matches)) {
            return (int)$matches[1] * 1024;
        }
        return 0;
    }

    /**
     * Returns an array of all PHP worker processes with their PID, RSS and command name.
     * Reads /proc directly to avoid expensive fork+exec.
     *
     * @return array<int, array{pid: int, rss: int, name: string}> Sorted by RSS descending
     */
    public static function getPhpProcessesWithRss(): array
    {
        $processes = [];
        $procDirs = @scandir('/proc');
        if ($procDirs === false) {
            return [];
        }

        foreach ($procDirs as $entry) {
            if (!ctype_digit($entry)) {
                continue;
            }
            $pid = (int)$entry;
            $cmdlineFile = "/proc/{$pid}/cmdline";
            $cmdline = @file_get_contents($cmdlineFile);
            if ($cmdline === false || stripos($cmdline, 'php') === false) {
                continue;
            }

            // Extract readable process name from cmdline (null-separated args)
            $args = explode("\0", trim($cmdline, "\0"));
            $name = '';
            foreach ($args as $arg) {
                // Look for class name or script path
                if (str_contains($arg, '\\') || str_ends_with($arg, '.php')) {
                    $name = basename($arg, '.php');
                    // For namespaced class names, take last part
                    $parts = explode('\\', $name);
                    $name = end($parts);
                    break;
                }
            }
            if ($name === '') {
                $name = basename($args[0] ?? 'php');
            }

            $rss = self::getProcessRss($pid);
            if ($rss > 0) {
                $processes[] = [
                    'pid' => $pid,
                    'rss' => $rss,
                    'name' => $name,
                ];
            }
        }

        // Sort by RSS descending
        usort($processes, static fn($a, $b) => $b['rss'] <=> $a['rss']);

        return $processes;
    }

    /**
     * Executes a command as a background process.
     *
     * @param string $command Command to execute
     * @param string $outFile Output file path
     * @param int $sleepTime Sleep time in seconds
     */
    public static function mwExecBg(
        string $command,
        string $outFile = self::DEFAULT_OUTPUT_FILE,
        int $sleepTime = 0
    ): void {
        $nohup = Util::which('nohup');
        $sh = Util::which('sh');
        $rm = Util::which('rm');
        $sleep = Util::which('sleep');

        if ($sleepTime > 0) {
            $filename = self::TEMP_SCRIPTS_DIR . '/' . time() . '_noop.sh';
            file_put_contents(
                $filename,
                "$sleep $sleepTime; $command; $rm -rf $filename"
            );
            $noopCommand = "$nohup $sh $filename > $outFile 2>&1 &";
        } else {
            $noopCommand = "$nohup $command > $outFile 2>&1 &";
        }
        exec($noopCommand);
    }

    /**
     * Manages a daemon/worker process.
     *
     * @param string $cmd Command to execute
     * @param string $param Command parameters
     * @param string $procName Process name
     * @param string $action Action to perform
     * @param string $outFile Output file path
     *
     * @return array|bool Process status or operation result
     * @throws InvalidArgumentException If action is invalid
     */
    public static function processWorker(
        string $cmd,
        string $param,
        string $procName,
        string $action,
        string $outFile = self::DEFAULT_OUTPUT_FILE
    ): bool|array {
        if (!self::isValidAction($action)) {
            throw new InvalidArgumentException("Invalid action: $action");
        }

        $kill = Util::which('kill');
        $nohup = Util::which('nohup');
        $workerPID = self::getPidOfProcess($procName);

        return match ($action) {
            'status' => [
                'status' => ($workerPID !== '') ? 'Started' : 'Stopped',
                'app' => $procName,
                'PID' => $workerPID
            ],
            'restart' => self::handleWorkerRestart($kill, $workerPID, $nohup, $cmd, $param, $outFile),
            'stop' => self::handleWorkerStop($kill, $workerPID),
            'start' => self::handleWorkerStart($workerPID, $nohup, $cmd, $param, $outFile),
            default => throw new InvalidArgumentException("Unsupported action: $action"),
        };
    }

    /**
     * Handles worker restart operation.
     *
     * @param string $kill Kill command path
     * @param string $workerPID Worker process ID
     * @param string $nohup Nohup command path
     * @param string $cmd Command to execute
     * @param string $param Command parameters
     * @param string $outFile Output file path
     * @return bool
     */
    private static function handleWorkerRestart(
        string $kill,
        string $workerPID,
        string $nohup,
        string $cmd,
        string $param,
        string $outFile
    ): bool {
        if ($workerPID !== '') {
            self::safeTerminateProcess($workerPID);
        }
        self::mwExec("$nohup $cmd $param > $outFile 2>&1 &");
        return true;
    }

    /**
     * Handles worker stop operation.
     *
     * @param string $kill Kill command path
     * @param string $workerPID Worker process ID
     * @return bool
     */
    private static function handleWorkerStop(string $kill, string $workerPID): bool
    {
        if ($workerPID !== '') {
            self::safeTerminateProcess($workerPID);
        }
        return true;
    }

    /**
     * Handles worker start operation.
     *
     * @param string $workerPID Worker process ID
     * @param string $nohup Nohup command path
     * @param string $cmd Command to execute
     * @param string $param Command parameters
     * @param string $outFile Output file path
     * @return bool
     */
    private static function handleWorkerStart(
        string $workerPID,
        string $nohup,
        string $cmd,
        string $param,
        string $outFile
    ): bool {
        if ($workerPID === '') {
            self::mwExec("$nohup $cmd $param > $outFile 2>&1 &");
        }
        return true;
    }

    /**
     * Starts a daemon process with failure control.
     *
     * @param string $procName Process name
     * @param string $args Process arguments
     * @param int $attemptsCount Number of attempts to start
     * @param int $timeout Timeout between attempts in microseconds
     * @param string $outFile Output file path
     * @return bool Success status
     */
    public static function safeStartDaemon(
        string $procName,
        string $args,
        int $attemptsCount = self::DEFAULT_START_ATTEMPTS,
        int $timeout = self::DEFAULT_ATTEMPT_TIMEOUT,
        string $outFile = self::DEFAULT_OUTPUT_FILE
    ): bool {
        $result = true;
        $baseName = "safe-$procName";
        $safeLink = "/sbin/$baseName";

        try {
            Util::createUpdateSymlink('/etc/rc/worker_reload', $safeLink);
            self::killByName($baseName);
            self::killByName($procName);

            // Start the process in the background
            self::mwExecBg("$safeLink $args", $outFile);

            // Wait for the process to start with timeout
            $pid = self::waitForProcessStart($procName, $baseName, $attemptsCount, $timeout);

            if (empty($pid)) {
                SystemMessages::echoWithSyslog(" - Wait for start '$procName' fail" . PHP_EOL);
                $result = false;
            }
        } catch (Throwable $e) {
            SystemMessages::echoWithSyslog("Error starting daemon '$procName': " . $e->getMessage());
            $result = false;
        }

        return $result;
    }

}
