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

namespace MikoPBX\Core\Workers;
require_once 'Globals.php';

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Configs\NatsConf;
use MikoPBX\Core\System\Configs\PHPConf;
use MikoPBX\Core\System\Configs\SyslogConf;
use MikoPBX\Core\System\PBX;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use Throwable;

class WorkerLogRotate extends WorkerBase
{

    /**
     * @inheritDoc
     */
    public function start($params): void
    {
        $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);
        $lastLogRotate = $managedCache->get('lastCoreWorkerLogRotateProcessing');
        if ($lastLogRotate===null){
            //System Logs
            NatsConf::logRotate();
            PHPConf::rotateLog();
            PBX::logRotate();
            SyslogConf::rotatePbxLog();

            //Modules Logs
            $plugins = PbxExtensionModules::getEnabledModulesArray();
            foreach ($plugins as $plugin) {
                $this->logRotate($plugin['uniqid']);
            }
            $managedCache->set('lastCoreWorkerLogRotateProcessing', time(), 3600);
        }
    }

    /**
     * Makes log rotate on every log file in folder with module name
     *
     * @param string $moduleUniqid
     */
    public function logRotate(string $moduleUniqid): void
    {
        $logPath        = System::getLogDir() . '/' . $moduleUniqid . '/';
        if ( ! file_exists($logPath)) {
            return;
        }

        $results         = glob($logPath . '*.log', GLOB_NOSORT);
        $textConfig = '';
        foreach ($results as $file) {
            $textConfig .= $file . ' {
    start 0
    rotate 9
    size 10M
    maxsize 10M
    daily
    missingok
    notifempty
}'.PHP_EOL;
            $pathConf = '/tmp/'.pathinfo($file)['filename'].'.conf';
            file_put_contents($pathConf, $textConfig);
            $logrotatePath = Util::which('logrotate');
            Processes::mwExec("{$logrotatePath} '{$pathConf}' > /dev/null 2> /dev/null");
            if (file_exists($pathConf)) {
                unlink($pathConf);
            }
        }
    }
}

// Start worker process
WorkerLogRotate::startWorker($argv??null);
