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


use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use Phalcon\Di;

/**
 * Class Processes
 *
 * Manage system and PHP processes
 *
 * @package MikoPBX\Core\System
 */
class Processes
{
    /**
     * Kills a process/daemon by name.
     *
     * @param string $procName The name of the process/daemon to kill.
     * @return int|null The return code of the execution.
     */
    public static function killByName(string $procName): ?int
    {
        $killallPath = Util::which('killall');

        return self::mwExec($killallPath . ' ' . escapeshellarg($procName));
    }

    /**
     * Executes a command using exec().
     *
     * @param string $command The command to execute.
     * @param array|null $outArr Reference to an array to store the command output.
     * @param int|null $retVal Reference to a variable to store the return value of the execution.
     * @return int The return value of the execution.
     */
    public static function mwExec(string $command, &$outArr = null, &$retVal = null): int
    {
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
     * Executes a command as a background process with an execution timeout.
     *
     * @param string $command The command to execute.
     * @param int $timeout The timeout value in seconds.
     * @param string $logname The name of the log file to redirect the output.
     */
    public static function mwExecBgWithTimeout($command, $timeout = 4, $logname = '/dev/null'): void
    {
        $di = Di::getDefault();

        if ($di !== null && $di->getShared('config')->path('core.debugMode')) {
            echo "mwExecBg(): $command\n";

            return;
        }
        $nohupPath = Util::which('nohup');
        $timeoutPath = Util::which('timeout');
        exec("{$nohupPath} {$timeoutPath} {$timeout} {$command} > {$logname} 2>&1 &");
    }

    /**
     * Executes multiple commands.
     *
     * @param array $arr_cmds The array of commands to execute.
     * @param array|null $out Reference to an array to store the output.
     * @param string $logname The name of the log file to save the output.
     */
    public static function mwExecCommands(array $arr_cmds, &$out = [], string $logname = ''): void
    {
        $out = [];
        foreach ($arr_cmds as $cmd) {
            $out[] = "$cmd;";
            $out_cmd = [];
            self::mwExec($cmd, $out_cmd);
            $out = array_merge($out, $out_cmd);
        }

        if ($logname !== '') {
            $result = implode("\n", $out);
            file_put_contents("/tmp/{$logname}_commands.log", $result);
        }
    }

    /**
     * Restarts all workers in a separate process.
     * This method is used after module installation or deletion.
     */
    public static function restartAllWorkers(): void
    {
        $workerSafeScriptsPath = Util::getFilePathByClassName(WorkerSafeScriptsCore::class);
        $phpPath = Util::which('php');
        $WorkerSafeScripts = "{$phpPath} -f {$workerSafeScriptsPath} restart > /dev/null 2> /dev/null";
        self::mwExec($WorkerSafeScripts);
        SystemMessages::sysLogMsg(static::class, "Service asked for WorkerSafeScriptsCore restart", LOG_DEBUG);
    }

    /**
     * Manages a PHP worker process.
     *
     * @param string $className The class name of the PHP worker.
     * @param string $paramForPHPWorker The parameter for the PHP worker.
     * @param string $action The action to perform (start, stop, restart).
     */
    public static function processPHPWorker(
        string $className,
        string $paramForPHPWorker = 'start',
        string $action = 'restart'
    ): void
    {
        SystemMessages::sysLogMsg(__METHOD__, "processPHPWorker " . $className . " action-" . $action, LOG_DEBUG);
        $workerPath = Util::getFilePathByClassName($className);
        if (empty($workerPath)) {
            return;
        }
        $command = "php -f {$workerPath}";
        $path_kill = Util::which('kill');
        $activeProcesses = self::getPidOfProcess($className);
        $processes = explode(' ', $activeProcesses);
        if (empty($processes[0])) {
            array_shift($processes);
        }
        $currentProcCount = count($processes);

        if (!class_exists($className)) {
            return;
        }
        $workerObject = new $className();
        $neededProcCount = $workerObject->maxProc;

        switch ($action) {
            case 'restart':
                // Stop all old workers
                if ($activeProcesses !== '') {
                    self::mwExec("{$path_kill} -SIGUSR1 {$activeProcesses}  > /dev/null 2>&1 &");
                    self::mwExecBg("{$path_kill} -SIGTERM {$activeProcesses}", '/dev/null', 10);
                    $currentProcCount = 0;
                }

                // Start new processes
                while ($currentProcCount < $neededProcCount) {
                    self::mwExecBg("{$command} {$paramForPHPWorker}");
                    $currentProcCount++;
                }

                break;
            case 'stop':
                if ($activeProcesses !== '') {
                    self::mwExec("{$path_kill} -SIGUSR2 {$activeProcesses}  > /dev/null 2>&1 &");
                    self::mwExecBg("{$path_kill} -SIGTERM {$activeProcesses}", '/dev/null', 10);
                }
                break;
            case 'start':
                if ($currentProcCount === $neededProcCount) {
                    return;
                }

                if ($neededProcCount > $currentProcCount) {
                    // Start additional processes
                    while ($currentProcCount < $neededProcCount) {
                        self::mwExecBg("{$command} {$paramForPHPWorker}");
                        $currentProcCount++;
                    }
                } elseif ($currentProcCount > $neededProcCount) {
                    // Find redundant processes
                    $countProc4Kill = $neededProcCount - $currentProcCount;
                    // Send SIGUSR1 command to them
                    while ($countProc4Kill >= 0) {
                        if (!isset($processes[$countProc4Kill])) {
                            break;
                        }
                        // Kill old processes with timeout, maybe it is a soft restart and the worker dies without any help
                        self::mwExec("{$path_kill} -SIGUSR1 {$processes[$countProc4Kill]}  > /dev/null 2>&1 &");
                        self::mwExecBg("{$path_kill} -SIGTERM {$activeProcesses}", '/dev/null', 10);
                        $countProc4Kill--;
                    }
                }
                break;
            default:
        }
    }

    /**
     * Retrieves the PID of a process by its name.
     *
     * @param string $name The name of the process.
     * @param string $exclude The name of the process to exclude.
     * @return string The PID of the process.
     */
    public static function getPidOfProcess(string $name, string $exclude = ''): string
    {
        $path_ps = Util::which('ps');
        $path_grep = Util::which('grep');
        $path_awk = Util::which('awk');

        $name = addslashes($name);
        $filter_cmd = '';
        if (!empty($exclude)) {
            $filter_cmd = "| $path_grep -v " . escapeshellarg($exclude);
        }
        $out = [];
        self::mwExec(
            "{$path_ps} -A -o 'pid,args' {$filter_cmd} | {$path_grep} '{$name}' | {$path_grep} -v grep | {$path_awk} ' {print $1} '",
            $out
        );

        return trim(implode(' ', $out));
    }

    /**
     * Executes a command as a background process.
     *
     * @param string $command The command to execute.
     * @param string $out_file The path to the output file.
     * @param int $sleep_time The sleep time in seconds.
     */
    public static function mwExecBg($command, $out_file = '/dev/null', $sleep_time = 0): void
    {
        $nohupPath = Util::which('nohup');
        $shPath = Util::which('sh');
        $rmPath = Util::which('rm');
        $sleepPath = Util::which('sleep');
        if ($sleep_time > 0) {
            $filename = '/tmp/' . time() . '_noop.sh';
            file_put_contents($filename, "{$sleepPath} {$sleep_time}; {$command}; {$rmPath} -rf {$filename}");
            $noop_command = "{$nohupPath} {$shPath} {$filename} > {$out_file} 2>&1 &";
        } else {
            $noop_command = "{$nohupPath} {$command} > {$out_file} 2>&1 &";
        }
        exec($noop_command);
    }

    /**
     * Manages a daemon/worker process.
     * Returns process statuses by name.
     *
     * @param string $cmd The command to execute.
     * @param string $param The parameter to pass to the command.
     * @param string $proc_name The name of the process.
     * @param string $action The action to perform (status, restart, stop, start).
     * @param string $out_file The path to the output file.
     * @return array|bool The status of the process.
     */
    public static function processWorker($cmd, $param, $proc_name, $action, $out_file = '/dev/null')
    {
        $path_kill = Util::which('kill');
        $path_nohup = Util::which('nohup');

        $WorkerPID = self::getPidOfProcess($proc_name);

        switch ($action) {
            case 'status':
                $status = ($WorkerPID !== '') ? 'Started' : 'Stoped';

                return ['status' => $status, 'app' => $proc_name, 'PID' => $WorkerPID];
            case 'restart':
                if ($WorkerPID !== '') {
                    self::mwExec("{$path_kill} -9 {$WorkerPID}  > /dev/null 2>&1 &");
                }
                self::mwExec("{$path_nohup} {$cmd} {$param}  > {$out_file} 2>&1 &");
                break;
            case 'stop':
                if ($WorkerPID !== '') {
                    self::mwExec("{$path_kill} -9 {$WorkerPID}  > /dev/null 2>&1 &");
                }
                break;
            case 'start':
                if ($WorkerPID === '') {
                    self::mwExec("{$path_nohup} {$cmd} {$param}  > {$out_file} 2>&1 &");
                }
                break;
            default:
        }

        return true;
    }

    /**
     * Starts a daemon process with failure control.
     * The method waits for the process to start and logs an error if it fails.
     *
     * @param string $procName The name of the process.
     * @param string $args The arguments for the process.
     * @param int $attemptsCount The number of attempts to start the process.
     * @param int $timout The timeout between attempts in microseconds.
     * @param string $outFile The path to the output file.
     * @return bool True if the process starts successfully, false otherwise.
     */
    public static function safeStartDaemon(string $procName, string $args, int $attemptsCount = 20, int $timout = 1000000, string $outFile='/dev/null'): bool
    {
        $result = true;
        $baseName = "safe-{$procName}";
        $safeLink = "/sbin/{$baseName}";
        Util::createUpdateSymlink('/etc/rc/worker_reload', $safeLink);
        self::killByName($baseName);
        self::killByName($procName);
        // Start the process in the background.
        self::mwExecBg("{$safeLink} {$args}", $outFile);

        // Wait for the process to start.
        $ch = 1;
        while ($ch < $attemptsCount) {
            $pid = self::getPidOfProcess($procName, $baseName);
            if (!empty($pid)) {
                break;
            }
            usleep($timout);
            $ch++;
        }
        if (empty($pid)) {
            SystemMessages::echoWithSyslog(" - Wait for start '{$procName}' fail" . PHP_EOL);
            $result = false;
        }

        return $result;
    }

}