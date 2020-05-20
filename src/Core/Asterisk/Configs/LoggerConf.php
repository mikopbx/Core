<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;

class LoggerConf extends \MikoPBX\Modules\Config\ConfigClass
{
    protected $description = 'logger.conf';

    protected function generateConfigProtected(): void
    {
        $logDir = System::getLogDir() . '/asterisk/';
        if ( ! file_exists($logDir) && ! mkdir($logDir, 0777, true) && ! is_dir($logDir)) {
            $logDir = '';
        }
        $conf = "[general]\n";
        $conf .= "queue_log = no\n";
        $conf .= "event_log = no\n";
        $conf .= "dateformat = %F %T\n";
        $conf .= "\n";
        $conf .= "[logfiles]\n";
        // $conf .= "syslog.local0 => notice,warning,error\n";
        $conf .= "console => debug,error,verbose(10)\n\n";
        $conf .= "{$logDir}security_log => security\n";
        $conf .= "{$logDir}messages => notice,warning\n";
        $conf .= "{$logDir}error => error\n";
        $conf .= "\n";

        Util::fileWriteContent($this->astConfDir . '/logger.conf', $conf);
    }
}