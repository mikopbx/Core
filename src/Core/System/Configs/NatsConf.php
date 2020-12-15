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

namespace MikoPBX\Core\System\Configs;


use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Processes;
use Phalcon\Di;
use Phalcon\Di\Injectable;

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
     * Rotates gnats logs
     */
    public static function logRotate(): void
    {
        $log_dir = System::getLogDir() . '/nats';
        $gnatsdPath = Util::which('gnatsd');
        $pid     = Processes::getPidOfProcess($gnatsdPath, 'custom_modules');
        $max_size = 1;
        if (empty($pid)) {
            $natsConf = new self();
            $natsConf->reStart();
            sleep(1);
        }
        $text_config = "{$log_dir}/gnatsd.log {
    start 0
    rotate 9
    size {$max_size}M
    maxsize 1M
    daily
    missingok
    notifempty
    sharedscripts
    postrotate
        {$gnatsdPath} -sl reopen=$pid > /dev/null 2> /dev/null
    endscript
}";

        $mb10 = $max_size * 1024 * 1024;

        $options = '';
        if (Util::mFileSize("{$log_dir}/gnatsd.log") > $mb10) {
            $options = '-f';
        }
        $di     = Di::getDefault();
        if ($di !== null){
            $varEtcDir = $di->getShared('config')->path('core.varEtcDir');
        } else {
            $varEtcDir = '/var/etc';
        }
        $path_conf  = $varEtcDir . '/gnatsd_logrotate.conf';
        file_put_contents($path_conf, $text_config);
        if (file_exists("{$log_dir}/gnatsd.log")) {
            $logrotatePath = Util::which('logrotate');
            Processes::mwExecBg("{$logrotatePath} $options '{$path_conf}' > /dev/null 2> /dev/null");
        }
    }

    /**
     * Restarts gnats server
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