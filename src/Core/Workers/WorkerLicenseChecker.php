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

namespace MikoPBX\Core\Workers;
require_once 'Globals.php';

use MikoPBX\Common\Providers\LicenseProvider;
use MikoPBX\Common\Providers\ManagedCacheProvider;

/**
 * WorkerLicenseChecker is a worker class responsible for checking the license status of the PBX and its modules.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerLicenseChecker extends WorkerBase
{

    /**
     * Starts the license checker worker.
     *
     * @param array $params The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $params): void
    {
        $cacheKey = 'Workers:WorkerLicenseChecker:lastLicenseCheck';
        $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);

        // Retrieve the last license check timestamp from the cache
        $lastLicenseCheck = $managedCache->get($cacheKey);
        if ($lastLicenseCheck === null) {
            $lic = $this->di->getShared(LicenseProvider::SERVICE_NAME);

            // Perform PBX license check
            $lic->checkPBX();

            // Perform module license check
            $lic->checkModules();

            // Store the current timestamp in the cache to track the last license check
            $managedCache->set($cacheKey, time(), 3600); // Check every hour
        }
    }

}

// Start worker process
WorkerLicenseChecker::startWorker($argv ?? []);