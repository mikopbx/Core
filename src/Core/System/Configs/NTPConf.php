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
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;

/**
 * Class NTPConf
 *
 * Represents the NTP configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class NTPConf extends SystemConfigClass
{
    public const string PROC_NAME = 'ntpd';
    private bool $manualTime = false;

    public function __construct()
    {
        parent::__construct();
        $ntpdPath = Util::which(self::PROC_NAME);
        $options = "-N";
        $this->startCommand = "$ntpdPath $options";

        $this->manualTime = PbxSettings::getValueByKey(PbxSettings::PBX_MANUAL_TIME_SETTINGS) === '1';
    }

    /**
     * Generates the Monit configuration file for monitoring the NTP daemon (ntpd).
     *
     * This method:
     * - Applies necessary service configuration via configure()
     * - Locates required binaries (ntpd and busybox)
     * - Constructs the start command with options (e.g., -N for standalone mode)
     * - Builds a Monit configuration block to monitor, start and stop the service
     * - Saves the configuration to a file based on the service's priority and name
     *
     * @return bool Always returns true after successfully writing the configuration file.
     */
    public function generateMonitConf(): bool{
        $this->configure();
        $busyboxPath = Util::which('busybox');
        $confPath = $this->getMainMonitConfFile();
        $conf = 'check process '.self::PROC_NAME.' matching "'.$this->startCommand.'"'.PHP_EOL.
            '    start program = "'.$this->startCommand.'"'.PHP_EOL.
            '        as uid root and gid root'.PHP_EOL.
            '    stop program = "'.$busyboxPath.' killall '.self::PROC_NAME.'"'.PHP_EOL.
            '        as uid root and gid root';

        $this->saveFileContent($confPath, $conf);
        return true;
    }

    /**
     * Starts the service by reinitializing configurations and restarting the monitoring service.
     *
     * This method is a wrapper around {@see self::reStart()} and is used to start or restart
     * the service with full reinitialization of settings and time synchronization.
     *
     * @return bool Returns true if the start operation was successful, false otherwise.
     */
    public function start(): bool
    {
        if(System::isBooting()){
            $result = true;
            if (!$this->manualTime) {
                $this->configure();
                Processes::mwExecBg($this->startCommand);
                $result = $this->monitWaitStart();
            }
        }else{
            $result = $this->reStart();
        }
        return $result;
    }

    /**
     * Restarts the service with initial configuration and time synchronization.
     *
     * This method first reconfigures the instance and generates the Monit configuration file.
     * If manual time settings are not enabled, it restarts the Monit service and synchronizes the system time
     * using ntpd in the background.
     *
     * @return bool Returns true if the restart was successful, false otherwise.
     */
    public function reStart(): bool
    {
        $this->generateMonitConf();
        $result = true;
        if (!$this->manualTime) {
            $result = $this->monitRestart();
            $ntpdPath = Util::which('ntpd');
            Processes::mwExecBg("$ntpdPath -q");
        }
        return $result;
    }

    /**
     * Configures the NTP daemon conf file.
     *
     * @return void
     */
    public function configure(): void
    {
        $ntp_servers = PbxSettings::getValueByKey(PbxSettings::NTP_SERVER);
        $ntp_servers = preg_split('/\r\n|\r|\n| /', $ntp_servers);
        $ntp_conf = '';
        foreach ($ntp_servers as $ntp_server) {
            if (! empty($ntp_server)) {
                $ntp_conf .= "server $ntp_server" . PHP_EOL;
            }
        }
        if ($ntp_conf === '') {
            $ntp_conf = 'server 0.pool.ntp.org'.PHP_EOL.
                        'server 1.pool.ntp.org'.PHP_EOL.
                        'server 2.pool.ntp.org';
        }
        Util::fileWriteContent('/etc/ntp.conf', $ntp_conf);
        Processes::killByName(self::PROC_NAME);
        usleep(500000);
    }
}
