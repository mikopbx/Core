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

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use Phalcon\Di;
use Phalcon\Di\Injectable;

/**
 * Class SyslogConf
 *
 * Represents the Syslog configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class SyslogConf extends Injectable
{
    public const CONF_FILE   ='/etc/rsyslog.conf';
    public const PROC_NAME   ='rsyslogd';
    public const SYS_LOG_LINK='/var/log/messages';

    /**
     * Restarts syslog daemon.
     */
    public function reStart(): void
    {
        $this->generateConfigFile();
        $pidSyslogD = Processes::getPidOfProcess('syslogd', self::PROC_NAME);
        if(!empty($pidSyslogD)){
            $logreadPath = Util::which('logread');
            Processes::mwExec("$logreadPath  2>/dev/null >> " . self::SYS_LOG_LINK);
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

        Processes::safeStartDaemon(self::PROC_NAME, '-n');
    }

    /**
     * Generates the configuration file.
     */
    private function generateConfigFile():void{
        $pathScriptMessages = self::createRotateScript(basename(self::SYS_LOG_LINK));
        $log_fileMessages   = self::getSyslogFile();

        file_put_contents($log_fileMessages, '', FILE_APPEND);
        $conf = PHP_EOL.
                '$ModLoad imuxsock'.PHP_EOL.
                'template(name="mikopbx" type="string"'.PHP_EOL.
                '  string="%TIMESTAMP:::date-rfc3164% %syslogfacility-text%.%syslogseverity-text% %syslogtag% %msg%\n"'."\n".
                ')'.PHP_EOL.
                '$ActionFileDefaultTemplate mikopbx'.PHP_EOL.
                '$IncludeConfig /etc/rsyslog.d/*.conf'.PHP_EOL.

                PHP_EOL.
                '$outchannel log_rotation,'.$log_fileMessages.',10485760,'.$pathScriptMessages.PHP_EOL
                .'*.* :omfile:$log_rotation'.PHP_EOL;
        Util::fileWriteContent(self::CONF_FILE, $conf);
        Util::createUpdateSymlink($log_fileMessages, self::SYS_LOG_LINK);
        Util::mwMkdir('/etc/rsyslog.d');
    }

    /**
     * Returns the path to the syslog file.
     * @param string $name
     * @return string
     */
    public static function getSyslogFile(string $name = 'messages'): string
    {
        $logDir = System::getLogDir() . '/system';
        Util::mwMkdir($logDir);
        $logFileName = $logDir . '/' . $name;
        if (!file_exists($logFileName)){
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
        $di          = Di::getDefault();
        $logFile     = self::getSyslogFile($serviceName);
        $textScript  =  '#!/bin/sh'.PHP_EOL.
                        "logName='{$logFile}';".PHP_EOL.
                        'if [ ! -f "$logName" ]; then exit; fi'.PHP_EOL.
                        'for srcId in 5 4 3 2 1 ""; do'.PHP_EOL.
                        '  dstId=$((srcId + 1));'.PHP_EOL.
                        '  if [ "x" != "${srcId}x" ]; then'.PHP_EOL.
                        '    srcId=".${srcId}"'.PHP_EOL.
                        '  fi'.PHP_EOL.
                        '  srcFilename="${logName}${srcId}"'.PHP_EOL.
                        '  if [ -f "$srcFilename" ];then'.PHP_EOL.
                        '    dstFilename="${logName}.${dstId}"'.PHP_EOL.
                        '    '.$mvPath.' -f "$srcFilename" "$dstFilename"'.PHP_EOL.
                        '  fi'.PHP_EOL.
                        'done'.PHP_EOL.
                        PHP_EOL;
        if($di){
            $varEtcDir  = $di->getShared('config')->path('core.varEtcDir');
        }else{
            $varEtcDir = '/etc';
        }
        $pathScript   = $varEtcDir . '/'.$serviceName.'_logrotate.sh';
        file_put_contents($pathScript, $textScript);
        Processes::mwExec("$chmodPath +x $pathScript");

        return $pathScript;
    }
}