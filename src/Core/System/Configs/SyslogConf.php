<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\Core\System\Configs;


use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

class SyslogConf extends Injectable
{
    /**
     * Restarts syslog daemon
     */
    public function reStart(): void
    {
        $syslog_file = '/var/log/messages';
        $log_file    = self::getSyslogFile();
        if ( ! file_exists($syslog_file)) {
            file_put_contents($syslog_file, '');
        }
        $syslogdPath = Util::which('syslogd');
        $busyboxPath = Util::which('busybox');
        $logreadPath = Util::which('logread');
        $killPath = Util::which('kill');
        $pid = Util::getPidOfProcess($syslogdPath);
        if ( ! empty($pid)) {
            $options = file_exists($log_file) ? '>' : '';
            Util::mwExec("{$busyboxPath} {$logreadPath} 2> /dev/null >" . $options . $log_file);
            // Завершаем процесс.
            Util::mwExec("{$busyboxPath} {$killPath} '$pid'");
        }

        Util::createUpdateSymlink($log_file, $syslog_file);
        Util::mwExec("{$syslogdPath} -O {$log_file} -b 10 -s 10240");
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