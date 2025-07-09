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

        file_put_contents($log_fileMessages, '', FILE_APPEND);
        $conf = PHP_EOL .
                '$ModLoad imuxsock' . PHP_EOL .
                'template(name="mikopbx" type="string"' . PHP_EOL .
                '  string="%TIMESTAMP:::date-rfc3164% %syslogfacility-text%.%syslogseverity-text% %syslogtag% %msg%\n"' . "\n" .
                ')' . PHP_EOL .
                '$ActionFileDefaultTemplate mikopbx' . PHP_EOL .
                '$IncludeConfig /etc/rsyslog.d/*.conf' . PHP_EOL .

                PHP_EOL .
                '$outchannel log_rotation,' . $log_fileMessages . ',10485760,' . $pathScriptMessages . PHP_EOL
                . '*.* :omfile:$log_rotation' . PHP_EOL;
        Util::fileWriteContent(self::CONF_FILE, $conf);
        Util::createUpdateSymlink($log_fileMessages, self::SYS_LOG_LINK);
        Util::mwMkdir('/etc/rsyslog.d');
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
     * Creates the log rotation script.
     * @param string $serviceName
     * @return string
     */
    public static function createRotateScript(string $serviceName): string
    {
        $mvPath     = Util::which('mv');
        $chmodPath   = Util::which('chmod');
        $gzipPath    = Util::which('gzip');
        $di          = Di::getDefault();
        $logFile     = self::getSyslogFile($serviceName);
        $textScript  =  '#!/bin/sh' . PHP_EOL .
                        "logName='$logFile';" . PHP_EOL .
                        'if [ ! -f "$logName" ]; then exit; fi' . PHP_EOL .
                        'for srcId in 5 4 3 2 1 ""; do' . PHP_EOL .
                        '  dstId=$((srcId + 1));' . PHP_EOL .
                        '  if [ "x" != "${srcId}x" ]; then' . PHP_EOL .
                        '    srcId=".${srcId}"' . PHP_EOL .
                        '  fi' . PHP_EOL .
                        '  srcFilename="${logName}${srcId}"' . PHP_EOL .
                        '  if [ -f "$srcFilename" ];then' . PHP_EOL .
                        '    dstFilename="${logName}.${dstId}"' . PHP_EOL .
                        '    ' . $mvPath . ' -f "$srcFilename" "$dstFilename"' . PHP_EOL .
                        '    # Compress all rotated logs except the most recent one' . PHP_EOL .
                        '    if [ "$dstId" -gt 1 ]; then' . PHP_EOL .
                        '      ' . $gzipPath . ' -f "$dstFilename"' . PHP_EOL .
                        '    fi' . PHP_EOL .
                        '  fi' . PHP_EOL .
                        'done' . PHP_EOL .
                        PHP_EOL;
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
