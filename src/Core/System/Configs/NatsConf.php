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


use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Processes;
use Phalcon\Di\Injectable;

/**
 * Class NatsConf
 *
 * Represents the Nats configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class NatsConf extends Injectable
{
    public const PROC_NAME = 'gnatsd';

    private MikoPBXConfig $mikoPBXConfig;

    /**
     * NatsConf constructor.
     */
    public function __construct()
    {
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

    /**
     * Restarts the gnats server.
     *
     * @return void
     */
    public function reStart(): void
    {
        $config = $this->getDI()->get('config')->gnats;

        $confDir = '/etc/nats';
        Util::mwMkdir($confDir);

        $logDir = Directories::getDir(Directories::CORE_LOGS_DIR) . '/nats';
        Util::mwMkdir($logDir);

        $sessionsDir = Directories::getDir(Directories::CORE_TEMP_DIR) . '/nats_cache';
        Util::mwMkdir($sessionsDir);

        $pid_file = '/var/run/gnatsd.pid';
        $settings = [
            'port'             => $config->port,
            'http_port'        => $config->httpPort,
            'debug'            => 'false',
            'trace'            => 'false',
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
        $conf_file = "$confDir/natsd.conf";
        Util::fileWriteContent($conf_file, $config);

        $lic = $this->mikoPBXConfig->getGeneralSettings(PbxSettingsConstants::PBX_LICENSE);
        file_put_contents("$sessionsDir/license.key", $lic);

        if (file_exists($pid_file)) {
            $killAllPath = Util::which('killall');
            $killPath = Util::which('kill');
            $catPath = Util::which('cat');
            Processes::mwExec("$killAllPath safe-".self::PROC_NAME);
            Processes::mwExec("$killPath $($catPath $pid_file)");
        }
        $outFile = "$logDir/gnats_process.log";
        $args = "--config $conf_file";
        $result = Processes::safeStartDaemon(self::PROC_NAME, $args, 20, 1000000, $outFile);
        if(!$result){
            sleep(10);
            Processes::safeStartDaemon(self::PROC_NAME, $args, 20, 1000000, $outFile);
        }
    }
}