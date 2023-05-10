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

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;

class LoggerConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

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
        $conf .= "{$logDir}verbose => verbose(3),dtmf,fax,warning\n";
        $conf .= "\n";

        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/logger.conf', $conf);
    }
}