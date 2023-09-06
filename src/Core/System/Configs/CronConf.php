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

use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Common\Providers\RegistryProvider;
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use MikoPBX\Modules\Config\SystemConfigInterface;
use Phalcon\Di\Injectable;

use function MikoPBX\Common\Config\appPath;

/**
 * Class CronConf
 *
 * Represents the Cron configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class CronConf extends Injectable
{
    public const PROC_NAME = 'crond';

    private MikoPBXConfig $mikoPBXConfig;

    /**
     * CronConf constructor.
     */
    public function __construct()
    {
        $this->mikoPBXConfig = new MikoPBXConfig();
    }

    /**
     * Setups crond and restarts it.
     *
     * @return int Returns 0 on success.
     */
    public function reStart(): int
    {
        $booting = $this->di->getShared(RegistryProvider::SERVICE_NAME)->booting??false;
        $this->generateConfig($booting);
        if (Util::isSystemctl()) {
            $systemctlPath = Util::which('systemctl');
            Processes::mwExec("{$systemctlPath} restart ".self::PROC_NAME);
        } else {
            // T2SDE or Docker
            $crondPath = Util::which(self::PROC_NAME);
            Processes::killByName(self::PROC_NAME);
            Processes::mwExec("{$crondPath} -L /dev/null -l 8");
        }

        return 0;
    }

    /**
     * Generates crontab config.
     *
     * @param bool $boot Indicates whether the config is generated during boot.
     */
    private function generateConfig(bool $boot = true): void
    {
        $mast_have     = [];
        $cron_filename = '/var/spool/cron/crontabs/root';

        $workerSafeScriptsPath = Util::getFilePathByClassName(WorkerSafeScriptsCore::class);
        $phpPath               = Util::which('php');
        $WorkerSafeScripts     = "$phpPath -f {$workerSafeScriptsPath} start > /dev/null 2> /dev/null";

        $restart_night = $this->mikoPBXConfig->getGeneralSettings('RestartEveryNight');
        $asteriskPath  = Util::which('asterisk');
        $ntpdPath      = Util::which('ntpd');
        $dumpPath      = Util::which('dump-conf-db');
        $checkIpPath   = Util::which('check-out-ip');
        $recordsCleaner= Util::which('records-cleaner');
        $cleanerLinks  = Util::which('cleaner-download-links');

        // Restart every night if enabled
        if ($restart_night === '1') {
            $mast_have[] = '0 1 * * * ' . $asteriskPath . ' -rx"core restart now" > /dev/null 2> /dev/null'.PHP_EOL;
        }
        // Update NTP time every 5 minutes
        $mast_have[] = '*/5 * * * * ' . $ntpdPath . ' -q > /dev/null 2> /dev/null'.PHP_EOL;

        // Perform database dump every 5 minutes
        $mast_have[] = '*/5 * * * * ' . "$dumpPath > /dev/null 2> /dev/null".PHP_EOL;
        // Clearing outdated conversation records
        $mast_have[] = '*/30 * * * * ' . "$recordsCleaner > /dev/null 2> /dev/null".PHP_EOL;

        // Check IP address every minute
        $mast_have[] = '*/1 * * * * ' . "$checkIpPath > /dev/null 2> /dev/null".PHP_EOL;

        // Clean download links every 6 minutes
        $mast_have[] = '*/6 * * * * ' . "$cleanerLinks > /dev/null 2> /dev/null".PHP_EOL;

        // Run WorkerSafeScripts every minute
        $mast_have[] = '*/1 * * * * ' . $WorkerSafeScripts.PHP_EOL;

        // Add additional modules includes
        $tasks = [];
        PBXConfModulesProvider::hookModulesMethod(SystemConfigInterface::CREATE_CRON_TASKS, [&$tasks]);
        $conf = implode('', array_merge($mast_have, $tasks));

        // Execute WorkerSafeScripts during boot if enabled
        if ($boot === true) {
            Processes::mwExecBg($WorkerSafeScripts);
        }

        // Write the generated config to the cron file
        Util::fileWriteContent($cron_filename, $conf);
    }
}