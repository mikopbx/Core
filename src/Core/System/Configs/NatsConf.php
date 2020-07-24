<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
 */

namespace MikoPBX\Core\System\Configs;


use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
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
        $pid     = Util::getPidOfProcess($gnatsdPath, 'custom_modules');
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
            $varEtcPath = $di->getConfig()->path('core.varEtcPath');
        } else {
            $varEtcPath = '/var/etc';
        }
        $path_conf  = $varEtcPath . '/gnatsd_logrotate.conf';
        file_put_contents($path_conf, $text_config);
        if (file_exists("{$log_dir}/gnatsd.log")) {
            $logrotatePath = Util::which('logrotate');
            Util::mwExecBg("{$logrotatePath} $options '{$path_conf}' > /dev/null 2> /dev/null");
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
            'sessions_path'    => $logdir,
            'log_file'         => "{$logdir}/gnatsd.log",
        ];
        $config   = '';
        foreach ($settings as $key => $val) {
            $config .= "{$key}: {$val} \n";
        }
        $conf_file = "{$confdir}/natsd.conf";
        Util::fileWriteContent($conf_file, $config);

        $lic = $this->mikoPBXConfig->getGeneralSettings('PBXLicense');
        file_put_contents($logdir . '/license.key', $lic);

        if (file_exists($pid_file)) {
            $killPath = Util::which('kill');
            $catPath = Util::which('kill');
            Util::mwExec("{$killPath} $({$catPath} {$pid_file})");
        }
        $gnatsdPath = Util::which('gnatsd');
        Util::mwExecBg("{$gnatsdPath} --config {$conf_file}", "{$logdir}/gnats_process.log");
    }
}