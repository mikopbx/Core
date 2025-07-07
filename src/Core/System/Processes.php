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
     * Graceful shutdown timeout in seconds
     */
    private const GRACEFUL_SHUTDOWN_TIMEOUT = 180; // 3 minutes

    /**
     * Cleans up stale PID files in the workers directory
     * 
     * @return void
     */
    private static function cleanupStalePidFiles(): void
    {
        if (!is_dir(self::LOCK_FILE_DIR)) {
            return;
        }

        $files = glob(self::LOCK_FILE_DIR . '/*' . self::PID_FILE_SUFFIX . '*');
        foreach ($files as $file) {
            // Read PID from file
            $pid = @file_get_contents($file);
            if ($pid === false) {
                self::removePidFile($file);
                continue;
            }

            // Check if process is still running
            if (!self::isProcessRunning($pid)) {
                self::removePidFile($file);
            }
        }
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
     * Saves a PID to a file with proper locking
     *
     * @param string $pidFile Path to the PID file
     * @param int $pid Process ID to save
     * @throws RuntimeException If unable to write PID file
     */
    public static function savePidFile(string $pidFile, int $pid): void
    {
        try {
            $pidDir = dirname($pidFile);

            // Ensure PID directory exists
            if (!is_dir($pidDir) && !mkdir($pidDir, 0755, true)) {
                throw new RuntimeException("Could not create PID directory: $pidDir");
            }

            // Use atomic write: write to temp file then rename
            $tempFile = $pidFile . '.tmp.' . uniqid('', true);
            
            if (file_put_contents($tempFile, (string)$pid, LOCK_EX) === false) {
                throw new RuntimeException("Could not write to temp PID file: $tempFile");
            }

            // Atomic rename - this will overwrite existing file if present
            if (!rename($tempFile, $pidFile)) {
                @unlink($tempFile);
                throw new RuntimeException("Could not atomically create PID file: $pidFile");
            }

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
        $timeout = Util::which('timeout');
        exec("$nohup $timeout $timeout $command > $logName 2>&1 &");
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
            
            // For regular restart, wait and then follow up with SIGTERM if needed
            if (!$softRestart) {
                // Wait for graceful shutdown, with increased timeout
                $gracefulShutdownStart = time();
                $allShutdown = false;
                
                while (time() - $gracefulShutdownStart < self::GRACEFUL_SHUTDOWN_TIMEOUT) {
                    // Check if processes are still running
                    $stillRunning = false;
                    foreach (explode(' ', $activeProcesses) as $pid) {
                        if (!empty($pid) && posix_kill((int)$pid, 0)) {
                            $stillRunning = true;
                            break;
                        }
                    }
                    
                    if (!$stillRunning) {
                        $allShutdown = true;
                        break;
                    }
                    
                    // Sleep briefly before checking again
                    sleep(2);
                }
                
                // If processes are still running after timeout, send SIGTERM
                if (!$allShutdown) {
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        sprintf("SEND signal: %s", "SIGTERM $activeProcesses"),
                        LOG_WARNING
                    );
                    
                    self::mwExecBg("$kill -SIGTERM $activeProcesses");
                }
            }
        }

        // Start workers with pool support
        if ($neededProcCount > 1) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf("Starting worker pool with %d instances for %s", $neededProcCount, $workerClass),
                LOG_NOTICE
            );
            
            // Start the required number of instances
            for ($i = 1; $i <= $neededProcCount; $i++) {
                $instanceParam = " --instance-id={$i}";
                
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf("Starting worker instance %d/%d: %s", $i, $neededProcCount, $command . " " . $paramForPHPWorker . $instanceParam),
                    LOG_DEBUG
                );
                
                self::mwExecBg("{$command} {$paramForPHPWorker}{$instanceParam}");
                
                // Small delay between instance launches to prevent conflicts
                usleep(250000); // 250ms
            }
        } else {
            // Start new instance (for non-pool workers)
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
            // Start new instances with instance ID
            for ($i = 0; $i < $neededProcCount; $i++) {
                $instanceParam = '';
                // If we're starting more than one instance, add instanceId parameter
                if ($neededProcCount > 1) {
                    $instanceId = $i + 1; // Number starting from 1
                    $instanceParam = " --instance-id={$instanceId}";
                }
                
                // Debug logging
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf(
                        "Launching instance #%d with command: %s %s%s",
                        ($i+1),
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
