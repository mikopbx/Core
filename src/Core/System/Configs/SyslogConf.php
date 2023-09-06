<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

class SyslogConf extends Injectable
{
    public const CONF_FILE   ='/etc/rsyslog.conf';
    public const PROC_NAME   ='rsyslogd';
    public const SYS_LOG_LINK='/var/log/messages';

    /**
     * Restarts syslog daemon
     */
    public function reStart(): void
    {
        $this->generateConfigFile();
        $pidSyslogD = Processes::getPidOfProcess('syslogd', self::PROC_NAME);
        if(!empty($pidSyslogD)){
            $logreadPath = Util::which('logread');
            Processes::mwExec("$logreadPath  2>/dev/null >> " . self::SYS_LOG_LINK);
            Processes::killByName('syslogd');
        }
        Processes::safeStartDaemon(self::PROC_NAME, '-n');
    }

    /**
     * Генерация конфигурационного файла.
     */
    private function generateConfigFile():void{
        $pathScript = $this->createRotateScript();
        $log_file    = self::getSyslogFile();
        file_put_contents($log_file, '', FILE_APPEND);
        $conf = ''.PHP_EOL.
                '$ModLoad imuxsock'.PHP_EOL.
                'template(name="mikopbx" type="string"'.PHP_EOL.
                '  string="%TIMESTAMP:::date-rfc3164% %syslogfacility-text%.%syslogseverity-text% %syslogtag% %msg%\n"'."\n".
                ')'.PHP_EOL.
                '$ActionFileDefaultTemplate mikopbx'.PHP_EOL.
                '$IncludeConfig /etc/rsyslog.d/*.conf'.PHP_EOL.
                // '*.* '.$log_file.PHP_EOL.
                PHP_EOL.
                '$outchannel log_rotation,'.$log_file.',2621440,'.$pathScript.PHP_EOL
                .'*.* :omfile:$log_rotation'.PHP_EOL;
        Util::fileWriteContent(self::CONF_FILE, $conf);
        Util::createUpdateSymlink($log_file, self::SYS_LOG_LINK);
        Util::mwMkdir('/etc/rsyslog.d');
    }

    /**
     * Returns Syslog file path
     * @return string
     */
    public static function getSyslogFile(): string
    {
        $logDir = System::getLogDir() . '/system';
        Util::mwMkdir($logDir);
        return "$logDir/messages";
    }

    /**
     * Скрипт ротации логов.
     * @return string
     */
    public function createRotateScript(): string
    {
        $mvPath   = Util::which('mv');
        $chmodPath   = Util::which('chmod');
        $di          = Di::getDefault();
        $logFile     = self::getSyslogFile();
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
        $pathScript   = $varEtcDir . '/'.self::PROC_NAME.'_logrotate.sh';
        file_put_contents($pathScript, $textScript);
        Processes::mwExec("$chmodPath +x $pathScript");

        return $pathScript;
    }
}