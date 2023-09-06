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

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\MarketPlaceProvider;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use SimpleXMLElement;

/**
 * WorkerMarketplaceChecker is a worker class responsible for checking the registration status of the PBX and its modules.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerMarketplaceChecker extends WorkerBase
{
    public const CACHE_KEY = 'Workers:WorkerMarketplaceChecker:lastCheck';
    public const CACHE_KEY_LICENSE_INFO = 'Workers:WorkerMarketplaceChecker:lastGetLicenseCheck';


    /**
     * Starts the checker worker.
     *
     * @param array $argv The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $argv): void
    {
        $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);
        $lic = $this->di->getShared(MarketPlaceProvider::SERVICE_NAME);

        // Retrieve the last license check timestamp from the cache
        $lastCheck = $managedCache->get(self::CACHE_KEY);
        if ($lastCheck === null) {

            // Perform PBX registration check
            $lic->checkPBX();

            // Perform module registration check
            $lic->checkModules();

            // Store the current timestamp in the cache to track the last repository check
            $managedCache->set(self::CACHE_KEY, time(), 3600); // Check every hour
        }

        // Retrieve the last get license request from the cache
        $lastGetLicenseInfo = $managedCache->get(self::CACHE_KEY_LICENSE_INFO);
        if ($lastGetLicenseInfo === null) {
            $licKey = PbxSettings::getValueByKey('PBXLicense');
            if (!empty($licKey)) {
                $regInfo = $lic->getLicenseInfo($licKey);
                if ($regInfo instanceof SimpleXMLElement) {
                    file_put_contents(MarketPlaceProvider::LIC_FILE_PATH, json_encode($regInfo->attributes()));
                }
            }
            $managedCache->set(self::CACHE_KEY_LICENSE_INFO, time(), 86400); // Check every day
        }
    }
}

// Start worker process
WorkerMarketplaceChecker::startWorker($argv ?? []);