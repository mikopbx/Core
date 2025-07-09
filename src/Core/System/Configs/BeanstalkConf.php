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
 * Class BeanstalkConf
 *
 * Represents the Beanstalk configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class BeanstalkConf extends SystemConfigClass
{
    public const string PROC_NAME = 'beanstalkd';

    public const int JOB_DATA_SIZE_LIMIT = 524280;

    /**
     * Priority level used to sort configuration objects when generating configs.
     * Lower values mean higher priority.
     */
    public int $priority = 2;

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
        $config  = $this->getDI()->get('config')->beanstalk;
        $options = "-l $config->host -p $config->port -z " . self::JOB_DATA_SIZE_LIMIT;
        $binPath = Util::which(self::PROC_NAME);
        $busyboxPath = Util::which('busybox');
        $this->startCommand = "/bin/sh -c '$busyboxPath nohup $binPath $options > /dev/null 2>&1 & $busyboxPath echo $! > /var/run/".self::PROC_NAME.".pid'";
    }

    /**
     * Starts the server.
     *
     * @return bool
     */
    public function start(): bool
    {
        if(System::isBooting()){
            $result = true;
            Processes::mwExec($this->startCommand);
        }else{
            $result = $this->reStart();
        }
        return $result;
    }
    /**
     * Restarts Beanstalk server.
     *
     * This method retrieves the Beanstalk configuration from the dependency injection container,
     * and restarts the Beanstalk server using the retrieved configuration. If the server fails to start,
     * it waits for 10 seconds and retries the startup process.
     */
    public function reStart(): bool
    {
        $this->generateMonitConf();
        return $this->monitRestart();
    }

    /**
     * Attempts to start the service via Monit when a failure is detected.
     *
     * This method is typically used as a fallback action to manually restart
     * the service using Monit if it fails unexpectedly. The current implementation
     * does not wait for the service to fully start, but the timeout parameter
     * may be used in extended implementations.
     *
     * @return void
     */
    public function monitFailStartAction(): void
    {
        Processes::mwExecBg($this->startCommand);
    }

    /**
     * Generates a Monit configuration file for managing the beanstalkd process.
     *
     * This method:
     * - Retrieves beanstalkd configuration (host, port) and job data size limit
     * - Locates the binary paths for `beanstalkd` and `busybox` using Util::which()
     * - Constructs the start command using `nohup` to run beanstalkd in the background
     * - Saves the process PID to `/var/run/beanstalkd.pid`
     * - Defines the stop command using `busybox killall`
     * - Writes the resulting configuration to the appropriate file
     *
     * The generated config ensures that Monit can control the beanstalkd process,
     * including restarting it if necessary.
     *
     * @return bool Returns true on successful configuration file creation
     */
    public function generateMonitConf(): bool{

        $busyboxPath = Util::which('busybox');
        $confPath = $this->getMainMonitConfFile();
        $conf = 'check process '.self::PROC_NAME.' with pidfile /var/run/'.self::PROC_NAME.'.pid '.PHP_EOL.
            '    start program = "'.$this->startCommand.'"'.PHP_EOL.
            '        as uid root and gid root'.PHP_EOL.
            '    stop program = "'.$busyboxPath.' killall '.self::PROC_NAME.'"'.PHP_EOL.
            '        as uid root and gid root';

        $this->saveFileContent($confPath, $conf);
        return true;
    }

}
