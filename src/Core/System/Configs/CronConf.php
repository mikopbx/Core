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
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use Phalcon\Di\Injectable;

use function MikoPBX\Common\Config\appPath;

class CronConf extends Injectable
{
    private MikoPBXConfig $mikoPBXConfig;

    /**
     * CronConf constructor.
     */
    public function __construct()
    {
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

    /**
     * Generates crontab config
     *
     * @param bool $boot
     */
    private function generateConfig($boot = true): void
    {
        $additionalModules = $this->di->getShared('pbxConfModules');
        $mast_have         = [];

        if (Util::isSystemctl()) {
            $mast_have[]   = "SHELL=/bin/sh\n";
            $mast_have[]   = "PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin\n\n";
            $cron_filename = '/etc/cron.d/mikopbx';
            $cron_user     = 'root ';
        } else {
            $cron_filename = '/var/spool/cron/crontabs/root';
            $cron_user     = '';
        }

        $workerSafeScriptsPath = Util::getFilePathByClassName(WorkerSafeScriptsCore::class);
        $phpPath               = Util::which('php');
        $WorkerSafeScripts     = "{$phpPath} -f {$workerSafeScriptsPath} start > /dev/null 2> /dev/null";

        $workersPath = appPath('src/Core/Workers');

        $restart_night = $this->mikoPBXConfig->getGeneralSettings('RestartEveryNight');
        $asteriskPath  = Util::which('asterisk');
        $ntpdPath      = Util::which('ntpd');
        $shPath        = Util::which('sh');
        if ($restart_night === '1') {
            $mast_have[] = '0 1 * * * ' . $cron_user . $asteriskPath . ' -rx"core restart now" > /dev/null 2> /dev/null' . "\n";
        }
        $mast_have[] = '*/5 * * * * ' . $cron_user . $ntpdPath . ' -q > /dev/null 2> /dev/null' . "\n";
        $mast_have[] = '*/6 * * * * ' . $cron_user . "{$shPath} {$workersPath}/Cron/cleaner_download_links.sh > /dev/null 2> /dev/null\n";
        $mast_have[] = '*/1 * * * * ' . $cron_user . "{$WorkerSafeScripts}\n";

        $tasks = [];

        // Add additional modules includes
        foreach ($additionalModules as $appClass) {
            /** @var \MikoPBX\Modules\Config\ConfigClass $appClass */
            $appClass->createCronTasks($tasks);
        }
        $conf = implode('', array_merge($mast_have, $tasks));

        if (Util::isSystemctl()) {
            // Convert rules to debian style
            $conf = str_replace(' * * * * /', ' * * * * root /', $conf);
        }

        if ($boot === true) {
            Util::mwExecBg($WorkerSafeScripts);
        }

        Util::fileWriteContent($cron_filename, $conf);
    }

    /**
     * Setups crond and restart it
     *
     * @return int
     */
    public function reStart(): int
    {
        $this->generateConfig($this->di->registry->booting);
        if (Util::isSystemctl()) {
            $systemctlPath = Util::which('systemctl');
            Util::mwExec("{$systemctlPath} restart cron");
        } else {
            $crondPath = Util::which('crond');
            Util::killByName($crondPath);
            Util::mwExec("{$crondPath} -L /dev/null -l 8");
        }

        return 0;
    }


}