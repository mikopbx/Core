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
     * Constructor for the class.
     *
     * Initializes the parent class and sets up the start command for the process.
     * - Determines the binary path of the process using `Util::which(self::PROC_NAME)`.
     * - Constructs the start command with necessary parameters, including the configuration file path and PID file location.
     */
    public function __construct()
    {
        parent::__construct();

        $binPath = Util::which(self::PROC_NAME);
        $this->startCommand = "$binPath -c '/etc/acpi/events' -n --pidfile /var/run/".self::PROC_NAME.'.pid';
    }

    /**
     * Starts the Redis server.
     *
     * @return bool
     */
    public function start(): bool
    {
        if(System::isBooting()){
            $result = true;
            Processes::mwExecBg($this->startCommand);
        }else{
            $result = $this->reStart();
        }
        return $result;
    }

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

    /**
     * Generates the Monit configuration file for monitoring a specific process.
     * @return bool
     */
    public function generateMonitConf(): bool
    {
        if(Util::isDocker()){
            return true;
        }
        $busyboxPath = Util::which('busybox');
        $confPath = $this->getMainMonitConfFile();

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
