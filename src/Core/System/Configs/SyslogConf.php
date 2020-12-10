<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
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
            Processes::mwExec("{$logreadPath} >> " . self::SYS_LOG_LINK);
            Processes::killByName('syslogd');
        }
        $syslogPath = Util::which(self::PROC_NAME);
        $pid = Processes::getPidOfProcess(self::PROC_NAME);
        if ( ! empty($pid)) {
            $busyboxPath = Util::which('busybox');
            // Завершаем процесс.
            Processes::mwExec("{$busyboxPath} kill '$pid'");
        }
        Processes::mwExec($syslogPath);
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
                '*.* '."{$log_file}\n";
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
        $logdir = System::getLogDir() . '/system';
        Util::mwMkdir($logdir);
        return "$logdir/messages";
    }
}