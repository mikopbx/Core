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

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Processes;

/**
 * Class NatsConf
 *
 * Represents the Nats configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class NatsConf extends SystemConfigClass
{
    public const string PROC_NAME = 'gnatsd';
    private string $conf_file = '';

    /**
     * Start the service.
     *
     * @return bool True if successful, false otherwise.
     */
    public function start(): bool
    {
        if(System::isBooting()){
            $this->configure();
            Processes::mwExec($this->startCommand);
            $result = $this->monitWaitStart();
        }else{
            $result = $this->reStart();
        }
        return $result;
    }

    /**
     * Restarts the gnats server.
     *
     * @return bool
     */
    public function reStart(): bool
    {
        $this->configure();
        $this->generateMonitConf();
        return $this->monitRestart();
    }

    /**
     * Generates the Monit configuration for the NATS service.
     *
     * This method creates a Monit configuration file for the NATS service,
     * which is used to monitor and manage the service's state.
     *
     * @return bool True if the configuration was generated successfully, false otherwise.  
     *
     */
    public function generateMonitConf(): bool
    {
        if(empty($this->conf_file)){
            $this->configure();
        }
        $busyboxPath = Util::which('busybox');
        $confPath = $this->getMainMonitConfFile();

        $stopCommand = "/bin/sh -c '$busyboxPath kill -TERM `$busyboxPath cat /var/run/".self::PROC_NAME.".pid`'";
        $conf = 'check process '.self::PROC_NAME.' with pidfile /var/run/'.self::PROC_NAME.'.pid '.PHP_EOL.
            '    depends on loopback'.PHP_EOL.
            '    start program = "'.$this->startCommand.'"'.PHP_EOL.
            '        as uid root and gid root'.PHP_EOL.
            '    stop program = "'.$stopCommand.'"'.PHP_EOL.
            '        as uid root and gid root';

        $this->saveFileContent($confPath, $conf);
        return true;
    }

    /**
     * Configures the NATS service.
     *
     * This method sets up the configuration for the NATS service,
     * including the configuration file, log directory, and session directory.
     *
     * @return void
     */
    private function configure():void
    {
        $config = $this->getDI()->get('config')->gnats;
        $confDir = '/etc/nats';
        $this->conf_file = "$confDir/natsd.conf";

        $busyboxPath = Util::which('busybox');
        $binPath = Util::which(self::PROC_NAME);
        $this->startCommand = "/bin/sh -c '$busyboxPath nohup $binPath --config $this->conf_file > /dev/null 2>&1 & $busyboxPath echo $! > /var/run/".self::PROC_NAME.".pid && sleep 1'";

        Util::mwMkdir($confDir);

        $logDir = Directories::getDir(Directories::CORE_LOGS_DIR) . '/nats';
        Util::mwMkdir($logDir);

        $sessionsDir = Directories::getDir(Directories::CORE_TEMP_DIR) . '/nats_cache';
        Util::mwMkdir($sessionsDir);

        $pid_file = '/var/run/'.self::PROC_NAME.'.pid';
        $settings = [
            'port'             => $config->port,
            'http_port'        => $config->httpPort,
            'debug'            => $config->debug?'true':'false',
            'trace'            => $config->debug?'true':'false',
            'logtime'          => 'true',
            'pid_file'         => $pid_file,
            'max_connections'  => '1000',
            'max_payload'      => '1000000',
            'max_control_line' => '512',
            'sessions_path'    => $sessionsDir,
            'log_size_limit'   => 10485760, //10Mb
            'log_file'         => "$logDir/gnatsd.log",
        ];
        $config   = '';
        foreach ($settings as $key => $val) {
            $config .= "$key: $val\n";
        }
        Util::fileWriteContent($this->conf_file, $config);

        $lic = PbxSettings::getValueByKey(PbxSettings::PBX_LICENSE);
        file_put_contents("$sessionsDir/license.key", $lic);
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
        sleep(2);
    }
}
