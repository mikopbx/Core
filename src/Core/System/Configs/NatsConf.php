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


use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\System;
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
        $confdir = '/etc/nats';
        Util::mwMkdir($confdir);

        $logdir = System::getLogDir() . '/nats';
        Util::mwMkdir($logdir);

        $tempDir = $this->di->getShared('config')->path('core.tempDir');
        $sessionsDir = "{$tempDir}/nats_cache";
        Util::mwMkdir($sessionsDir);

        $pid_file = '/var/run/gnatsd.pid';
        $settings = [
            'port'             => '4223',
            'http_port'        => '8223',
            'debug'            => 'false',
            'trace'            => 'false',
            'logtime'          => 'true',
            'pid_file'         => $pid_file,
            'max_connections'  => '1000',
            'max_payload'      => '1000000',
            'max_control_line' => '512',
            'sessions_path'    => $sessionsDir,
            'log_size_limit'   => 10485760, //10Mb
            'log_file'         => "{$logdir}/gnatsd.log",
        ];
        $config   = '';
        foreach ($settings as $key => $val) {
            $config .= "{$key}: {$val} \n";
        }
        $conf_file = "{$confdir}/natsd.conf";
        Util::fileWriteContent($conf_file, $config);

        $lic = $this->mikoPBXConfig->getGeneralSettings('PBXLicense');
        file_put_contents("{$sessionsDir}/license.key", $lic);

        if (file_exists($pid_file)) {
            $killPath = Util::which('kill');
            $catPath = Util::which('kill');
            Processes::mwExec("{$killPath} $({$catPath} {$pid_file})");
        }

        $gnatsdPath = Util::which('gnatsd');
        Processes::mwExecBg("{$gnatsdPath} --config {$conf_file}", "{$logdir}/gnats_process.log");
    }
}