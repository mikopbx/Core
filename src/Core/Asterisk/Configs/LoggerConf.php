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

namespace MikoPBX\Core\Asterisk\Configs;


use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;

/**
 * Class LoggerConf
 *
 * Represents the configuration for logger.conf.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class LoggerConf extends AsteriskConfigClass
{
    /**
     * The module hook applying priority.
     *
     * @var int
     */
    public int $priority = 1000;

    /**
     * The description of the configuration.
     *
     * @var string
     */
    protected string $description = 'logger.conf';


    /**
     * Generates the configuration for the logger.conf file.
     *
     * @return void
     */
    protected function generateConfigProtected(): void
    {
        $logDir = System::getLogDir() . '/asterisk/';

        // Create the log directory if it doesn't exist
        Util::mwMkdir($logDir);

        // Generate the configuration content
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

        // Write the configuration content to the file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/logger.conf', $conf);
    }
}