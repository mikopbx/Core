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
            Processes::mwExec("$logreadPath >> " . self::SYS_LOG_LINK);
            Processes::killByName('syslogd');
        }
        Processes::safeStartDaemon(self::PROC_NAME, '-n');
    }

    /**
     * Генерация конфигурационного файла.
     */
    private function generateConfigFile():void{
        $log_file    = self::getSyslogFile();
        file_put_contents($log_file, '', FILE_APPEND);
        $conf = ''."\n".
                '$ModLoad imuxsock'."\n".
                // '$ModLoad imklog'."\n".
                'template(name="mikopbx" type="string"'."\n".
                '  string="%TIMESTAMP:::date-rfc3164% %syslogfacility-text%.%syslogseverity-text% %syslogtag% %msg%\n"'."\n".
                ')'."\n".
                '$ActionFileDefaultTemplate mikopbx'."\n".
                '$IncludeConfig /etc/rsyslog.d/*.conf'."\n".
                '*.* '."$log_file\n";
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


    public static function rotatePbxLog(): void
    {
        $syslogPath  = Util::which(self::PROC_NAME);
        $killAllPath = Util::which('killall');
        $chownPath   = Util::which('chown');
        $touchPath   = Util::which('touch');

        $di          = Di::getDefault();
        $max_size    = 3;
        $logFile     = self::getSyslogFile();
        $text_config = "$logFile {
    nocreate
    nocopytruncate
    delaycompress
    nomissingok
    start 0
    rotate 9
    size {$max_size}M
    missingok
    noolddir
    postrotate
        {$killAllPath} ".self::PROC_NAME." > /dev/null 2> /dev/null
        {$touchPath} {$logFile}
        {$chownPath} www:www {$logFile}> /dev/null 2> /dev/null
        {$syslogPath} > /dev/null 2> /dev/null
    endscript
}";
        if($di){
            $varEtcDir  = $di->getShared('config')->path('core.varEtcDir');
        }else{
            $varEtcDir = '/etc';
        }
        $path_conf   = $varEtcDir . '/'.self::PROC_NAME.'_logrotate.conf';
        file_put_contents($path_conf, $text_config);
        $mb10 = $max_size * 1024 * 1024;
        $options = '';
        if (Util::mFileSize($logFile) > $mb10) {
            $options = '-f';
        }
        $logrotatePath = Util::which('logrotate');
        Processes::mwExecBg("$logrotatePath $options '$path_conf' > /dev/null 2> /dev/null");
    }
}