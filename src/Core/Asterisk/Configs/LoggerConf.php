<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2020
 */

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\Modules\Config\ConfigClass;

class LoggerConf extends ConfigClass
{
    protected string $description = 'logger.conf';

    protected function generateConfigProtected(): void
    {
        $logDir = System::getLogDir() . '/asterisk/';
        Util::mwMkdir($logDir);
        $conf = "[general]\n";
        $conf .= "queue_log = no\n";
        $conf .= "dateformat = %F %T\n";
        $conf .= "\n";
        $conf .= "[logfiles]\n";
        $conf .= "console => debug,error,verbose(10)\n\n";
        $conf .= "{$logDir}security_log => security\n";
        $conf .= "{$logDir}messages => notice,warning\n";
        $conf .= "{$logDir}error => error\n";
        $conf .= "{$logDir}verbose => verbose(3),dtmf,fax\n";
        $conf .= "\n";

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/logger.conf', $conf);
    }
}