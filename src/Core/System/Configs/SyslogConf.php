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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Di;

/**
 * Class SyslogConf
 *
 * Represents the Syslog configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class SyslogConf extends SystemConfigClass
{
    public const string CONF_FILE   = '/etc/rsyslog.conf';
    public const string PROC_NAME   = 'rsyslogd';
    public const string SYS_LOG_LINK = '/var/log/messages';
    private const string DROPBEAR_MONIT_FILTER_PATH = '/etc/rsyslog.d/dropbear-monit-noise.conf';

    /**
     * Priority level used to sort configuration objects when generating configs.
     * Lower values mean higher priority.
     */
    public int $priority = 3;

    public function __construct()
    {
        parent::__construct();
        $this->startCommand = Util::which(self::PROC_NAME);
    }

    /**
     * Start the service.
     *
     * @return bool True if successful, false otherwise.
     */
    public function start(): bool
    {
        return $this->reStart();
    }

    /**
     * Restarts syslog daemon.
     */
    public function reStart(): bool
    {
        $this->generateConfigFile();
        $pidSyslogD = Processes::getPidOfProcess('syslogd', self::PROC_NAME);
        if (!empty($pidSyslogD)) {
            $logReadPath = Util::which('logread');
            Processes::mwExec("$logReadPath  2>/dev/null >> " . self::SYS_LOG_LINK);
            $oldLogPath = self::SYS_LOG_LINK;
            if (!is_link($oldLogPath)) {
                $newLogPath = self::getSyslogFile();
                $catPath = Util::which('cat');
                Processes::mwExec("$catPath $oldLogPath >> $newLogPath");
            }
            Processes::killByName('syslogd');
        }
        RedisConf::generateSyslogConf();
        CronConf::generateSyslogConf();
        MonitConf::generateSyslogConf();
        PHPConf::generateSyslogConf();
        PHPConf::removeLegacyLogSymlink();

        $this->generateMonitConf();
        $pidSyslogD = Processes::getPidOfProcess(self::PROC_NAME);
        if(System::isBooting() && empty($pidSyslogD)){
            Processes::mwExec($this->startCommand);
            $result = $this->monitWaitStart();
        }else{
            $result = $this->monitRestart();
        }
        return $result;
    }

    /**
     * Attempts to start the service via Monit when a failure is detected.
     *
     * This method is typically used as a fallback action to manually restart
     * the service using Monit if it fails unexpectedly. The current implementation
     * does not wait for the service to fully start, but the timeout parameter
     * may be used in extended implementations.
     *
     * @return void
     */
    public function monitFailStartAction(): void
    {
        $binPath = Util::which(self::PROC_NAME);
        Processes::mwExecBg($binPath);
    }

    /**
     * Generates the configuration file.
     */
    private function generateConfigFile(): void
    {
        $pathScriptMessages = self::createRotateScript(basename(self::SYS_LOG_LINK));
        $log_fileMessages   = self::getSyslogFile();

        Util::mwMkdir('/etc/rsyslog.d');
        file_put_contents(self::DROPBEAR_MONIT_FILTER_PATH, self::buildDropbearMonitNoiseFilter());
        file_put_contents($log_fileMessages, '', FILE_APPEND);
        $conf = PHP_EOL .
                '$ModLoad imuxsock' . PHP_EOL .
                'template(name="mikopbx" type="string"' . PHP_EOL .
                '  string="%TIMESTAMP:::date-year%-%TIMESTAMP:::date-month%-%TIMESTAMP:::date-day% %TIMESTAMP:::date-hour%:%TIMESTAMP:::date-minute%:%TIMESTAMP:::date-second% %syslogfacility-text%.%syslogseverity-text% %syslogtag% %msg%\n"' . "\n" .
                ')' . PHP_EOL .
                '$ActionFileDefaultTemplate mikopbx' . PHP_EOL .
                '$IncludeConfig /etc/rsyslog.d/*.conf' . PHP_EOL .

                PHP_EOL .
                '$outchannel log_rotation,' . $log_fileMessages . ',10485760,' . $pathScriptMessages . PHP_EOL
                . '*.* :omfile:$log_rotation' . PHP_EOL;
        Util::fileWriteContent(self::CONF_FILE, $conf);
        Util::createUpdateSymlink($log_fileMessages, self::SYS_LOG_LINK);
    }

    /**
     * Discards messages produced by Monit's SSH health check.
     *
     * Monit connects from loopback every five seconds and completes enough of
     * the SSH handshake for Dropbear to log a normal pre-authentication exit.
     * Keep the protocol-level health check while preventing these known-safe
     * messages from reaching the general system log and Fail2Ban.
     */
    private static function buildDropbearMonitNoiseFilter(): string
    {
        return <<<'RSYSLOG'
if $programname == "dropbear" and (
    $msg contains "Child connection from 127.0.0.1:" or
    $msg contains "Exit before auth from <127.0.0.1:" or
    $msg contains "Forced command set to '/etc/rc/hello'"
) then stop

RSYSLOG;
    }

    /**
     * Generates a Monit configuration file for the current system service.
     *
     * This method creates a basic Monit configuration to monitor the process lifecycle:
     * - Defines the PID file location
     * - Specifies commands to start and stop the service
     * - Sets execution permissions (as root user/group)
     * - Adds 'noalert' and 'unmonitor' directives to disable alerts and active monitoring
     *
     * The configuration is saved to the default Monit configuration directory.
     *
     * @return bool Always returns true after writing the configuration file.
     */
    public function generateMonitConf(): bool
    {
        if(!file_exists(self::CONF_FILE)){
            return true;
        }
        $busyboxPath = Util::which('busybox');
        $binPath     = Util::which(self::PROC_NAME);
        $confPath    = $this->getMainMonitConfFile();

        $conf = 'check process '.self::PROC_NAME.' with pidfile /var/run/'.self::PROC_NAME.'.pid '.PHP_EOL.
            '    start program = "'.$binPath.'"'.PHP_EOL.
            '        as uid root and gid root'.PHP_EOL.
            '    stop program = "'.$busyboxPath.' killall '.self::PROC_NAME.'"'.PHP_EOL.
            '        as uid root and gid root';
        $this->saveFileContent($confPath, $conf);
        return true;
    }

    /**
     * Returns the path to the syslog file.
     * @param string $name
     * @return string
     */
    public static function getSyslogFile(string $name = 'messages'): string
    {
        $logDir = Directories::getDir(Directories::CORE_LOGS_DIR) . '/system';
        Util::mwMkdir($logDir);
        $logFileName = $logDir . '/' . $name;
        if (!file_exists($logFileName)) {
            file_put_contents($logFileName, '');
        }
        return "$logFileName";
    }

    /**
     * The script rsyslog runs when the log reaches its size limit: the current file becomes .1 (kept plain for
     * reading), older generations shift up to .9 gzipped, the tenth is dropped. #1209: the shift looks for the .gz
     * names it produces itself (before, the chain broke after .2), and names left by earlier versions of the
     * script (messages.gz, messages.N.gz.gz…) are removed; other files sharing the prefix are not touched.
     */
    private static function buildRotateScript(string $logFile, string $mvPath, string $gzipPath): string
    {
        return '#!/bin/sh' . PHP_EOL .
            "logName='$logFile';" . PHP_EOL .
            'if [ ! -f "$logName" ]; then exit; fi' . PHP_EOL .
            'for f in "$logName".*; do' . PHP_EOL .
            '  case "${f#"$logName"}" in' . PHP_EOL .
            '    .[1-9]|.[1-9].gz) ;;' . PHP_EOL .
            '    *.gz) rm -f "$f" ;;' . PHP_EOL .
            '  esac' . PHP_EOL .
            'done' . PHP_EOL .
            'id=8' . PHP_EOL .
            'while [ "$id" -ge 1 ]; do' . PHP_EOL .
            '  next=$((id + 1))' . PHP_EOL .
            '  if [ -f "$logName.$id.gz" ]; then' . PHP_EOL .
            '    ' . $mvPath . ' -f "$logName.$id.gz" "$logName.$next.gz"' . PHP_EOL .
            '  elif [ -f "$logName.$id" ]; then' . PHP_EOL .
            '    ' . $mvPath . ' -f "$logName.$id" "$logName.$next"' . PHP_EOL .
            '    ' . $gzipPath . ' -f "$logName.$next"' . PHP_EOL .
            '  fi' . PHP_EOL .
            '  id=$((id - 1))' . PHP_EOL .
            'done' . PHP_EOL .
            $mvPath . ' -f "$logName" "$logName.1"' . PHP_EOL;
    }

    /**
     * Creates the log rotation script.
     * @param string $serviceName
     * @param string|null $logFilePath Optional custom log file path. If not provided, uses getSyslogFile().
     * @return string
     */
    public static function createRotateScript(string $serviceName, ?string $logFilePath = null): string
    {
        $chmodPath   = Util::which('chmod');
        $di          = Di::getDefault();
        $logFile     = $logFilePath ?? self::getSyslogFile($serviceName);
        $textScript  = self::buildRotateScript($logFile, Util::which('mv'), Util::which('gzip'));
        if ($di) {
            $varEtcDir  = $di->getShared('config')->path('core.varEtcDir');
        } else {
            $varEtcDir = '/etc';
        }
        $pathScript   = $varEtcDir . '/' . $serviceName . '_logrotate.sh';
        file_put_contents($pathScript, $textScript);
        Processes::mwExec("$chmodPath +x $pathScript");

        return $pathScript;
    }
}
