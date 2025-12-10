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
 * Class VMWareToolsConf
 *
 * Represents the VMWareTools configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class VMWareToolsConf
{
    public const string PROC_NAME = 'vmtoolsd';
    public string $startCommand = '';

    public function __construct()
    {
        parent::__construct();
        $binPath = Util::which(self::PROC_NAME);
        $this->startCommand = "$binPath --background=/var/run/".self::PROC_NAME.".pid";
    }

    /**
     * Start the service.
     *
     * @return bool True if successful, false otherwise.
     */
    public function start(): bool
    {
        if(System::isBooting()){
            Processes::mwExecBg($this->startCommand);
        }
        return true;
    }

    /**
     * Configure and start VMWareTools.
     *
     * @return bool
     */
    public function configure(): bool
    {
        $conf = "[logging]\n"
            . "log = false\n"
            . "vmtoolsd.level = none\n"
            . ";vmsvc.data = /dev/null\n"
            . "vmsvc.level = none\n";

        $dirVM = '/etc/vmware-tools';
        if (!file_exists($dirVM)) {
            Util::mwMkdir($dirVM);
        }
        file_put_contents("$dirVM/tools.conf", $conf);
        return true;
    }

    /**
     * Generates a Monit configuration block for the specified process.
     *
     * This method returns a string containing the full Monit configuration
     * for monitoring a process, including:
     * - PID file path
     * - Command to start the process in the background
     * - Command to stop the process using BusyBox
     * - Execution permissions (as root user/group)
     *
     * @param string $procName The name of the process to use in the Monit configuration.
     *
     * @return string The generated Monit configuration block as a string.
     */
    public function getMonitConf(string $procName): string
    {
        $this->configure();
        $busyboxPath = Util::which('busybox');
        return 'check process '.$procName.' with pidfile "/var/run/'.self::PROC_NAME.'.pid"'.PHP_EOL.
            '    start program = "'.$this->startCommand.'"'.PHP_EOL.
            '        as uid root and gid root'.PHP_EOL.
            '    stop program = "'.$busyboxPath.' killall '.self::PROC_NAME.'"'.PHP_EOL.
            '        as uid root and gid root';
    }
}