<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Core\Asterisk\Configs\AsteriskConf;
use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\Configs\NginxConf;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\LogRotate;
use MikoPBX\Core\System\PBX;
use MikoPBX\Core\System\SystemMessages;

/**
 * WorkerLogRotate is a worker class responsible for log rotation.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerLogRotate extends WorkerBase
{
    /**
     * Starts the log rotate worker.
     *
     * @param array $argv The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $argv): void
    {
        $cacheKey = 'Workers:WorkerLogRotate:lastProcessing';
        $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);

        // Retrieve the last log rotate timestamp from the cache
        $lastLogRotate = $managedCache->get($cacheKey);
        if ($lastLogRotate === null) {
            // Perform log rotation for system logs
            PBX::logRotate();
            Fail2BanConf::logRotate();
            AsteriskConf::logRotate();
            NginxConf::logRotate();

            // Perform log rotation for module logs
            $plugins = PbxExtensionModules::getEnabledModulesArray();
            foreach ($plugins as $plugin) {
                $this->logRotate($plugin['uniqid']);
            }

            // Store the current timestamp in the cache to track the last log rotation
            $managedCache->set($cacheKey, time(), 3600); // Rotate logs every hour
        }
    }

    /**
     * Performs log rotation on log files in the module's log folder recursively.
     * Compresses all versions except current and first rotated version.
     *
     * @param string $moduleUniqid The unique ID of the module.
     * @return void
     */
    public function logRotate(string $moduleUniqid): void
    {
        $logPath = Directories::getDir(Directories::CORE_LOGS_DIR) . '/' . $moduleUniqid . '/';
        $textConfig = LogRotate::buildModuleConfig(LogRotate::findModuleLogFiles($logPath));
        if ($textConfig === '') {
            return;
        }

        // A state file of its own, so module rotation does not wait for the lock of the Core ones
        $varEtcDir = Directories::getDir(Directories::CORE_VAR_ETC_DIR);
        $pathConf = $varEtcDir . '/logrotate_module_' . $moduleUniqid . '.conf';
        if (file_put_contents($pathConf, $textConfig) === false) {
            SystemMessages::sysLogMsg(LogRotate::SYSLOG_TAG, "Failed to write $pathConf", LOG_WARNING);
            return;
        }
        LogRotate::run($pathConf);
        // The config is rebuilt every run; the state file next to it stays for the next one
        unlink($pathConf);
    }
}

// Start a worker process
WorkerLogRotate::startWorker($argv ?? []);
