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
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

/**
 * Class ACPIDConf
 *
 * Represents the ACPID configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class ACPIDConf extends SystemConfigClass
{
    public const string PROC_NAME = 'acpid';

    /**
     * Priority level used to sort configuration objects when generating configs.
     * Lower values mean higher priority.
     */
    public int $priority = 1;

    /**
     * Restarts Beanstalk server
     */
    public function reStart(): bool
    {
        if(Util::isDocker()){
            return true;
        }
        $this->generateMonitConf();
        return $this->monitRestart();
    }

    public function generateMonitConf(): bool
    {
        if(Util::isDocker()){
            return true;
        }
        $binPath = Util::which(self::PROC_NAME);
        $busyboxPath = Util::which('busybox');
        $confPath = $this->getMainMonitConfFile();

        $this->startCommand = "$binPath -c '/etc/acpi/events' -n --pidfile /var/run/".self::PROC_NAME.'.pid';
        $stopCommand = "/bin/sh -c '$busyboxPath kill -TERM `$busyboxPath cat /var/run/".self::PROC_NAME.".pid`'";
        $conf = 'check process '.self::PROC_NAME.' with pidfile /var/run/'.self::PROC_NAME.'.pid'.PHP_EOL.
                '    start program = "'.$this->startCommand.'"'.PHP_EOL.
                '        as uid root and gid root'.PHP_EOL.
                '    stop program = "'.$stopCommand.'"'.PHP_EOL.
                '        as uid root and gid root';
        $this->saveFileContent($confPath, $conf);
        return true;
    }
}
