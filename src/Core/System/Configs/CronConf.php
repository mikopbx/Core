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
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use MikoPBX\Modules\Config\ConfigClass;
use Phalcon\Di\Injectable;

use function MikoPBX\Common\Config\appPath;

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
     * Setups crond and restart it
     *
     * @return int
     */
    public function reStart(): int
    {
        $this->generateConfig($this->di->getShared('registry')->booting);
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
     * Generates crontab config
     *
     * @param bool $boot
     */
    private function generateConfig($boot = true): void
    {
        $mast_have     = [];
        $cron_filename = '/var/spool/cron/crontabs/root';

        $workerSafeScriptsPath = Util::getFilePathByClassName(WorkerSafeScriptsCore::class);
        $phpPath               = Util::which('php');
        $WorkerSafeScripts     = "$phpPath -f {$workerSafeScriptsPath} start > /dev/null 2> /dev/null";

        $workersPath = appPath('src/Core/Workers');
        $restart_night = $this->mikoPBXConfig->getGeneralSettings('RestartEveryNight');
        $asteriskPath  = Util::which('asterisk');
        $ntpdPath      = Util::which('ntpd');
        $shPath        = Util::which('sh');
        $dumpPath      = Util::which('dump-conf-db');
        $checkIpPath   = Util::which('check-out-ip');

        if ($restart_night === '1') {
            $mast_have[] = '0 1 * * * ' . $asteriskPath . ' -rx"core restart now" > /dev/null 2> /dev/null'.PHP_EOL;
        }
        $mast_have[] = '*/5 * * * * ' . $ntpdPath . ' -q > /dev/null 2> /dev/null'.PHP_EOL;
        $mast_have[] = '*/5 * * * * ' . "$dumpPath > /dev/null 2> /dev/null".PHP_EOL;
        $mast_have[] = '*/1 * * * * ' . "$checkIpPath > /dev/null 2> /dev/null".PHP_EOL;
        $mast_have[] = '*/6 * * * * ' . "{$shPath} {$workersPath}/Cron/cleaner_download_links.sh > /dev/null 2> /dev/null".PHP_EOL;
        $mast_have[] = '*/1 * * * * ' . $WorkerSafeScripts.PHP_EOL;

        $tasks = [];
        // Add additional modules includes
        $configClassObj = new ConfigClass();
        $configClassObj->hookModulesMethod(ConfigClass::CREATE_CRON_TASKS, [&$tasks]);
        $conf = implode('', array_merge($mast_have, $tasks));

        if ($boot === true) {
            Processes::mwExecBg($WorkerSafeScripts);
        }
        Util::fileWriteContent($cron_filename, $conf);
    }
}