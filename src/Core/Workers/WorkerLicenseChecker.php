<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

class WorkerLicenseChecker extends WorkerBase
{

    public function start($argv): void
    {
        $cacheKey =  'Workers:WorkerLicenseChecker:lastLicenseCheck';
        $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);
        $lastLicenseCheck = $managedCache->get($cacheKey);
        if ($lastLicenseCheck===null){
            $lic =  $this->di->getShared(LicenseProvider::SERVICE_NAME);
            $lic->checkPBX();
            $lic->checkModules();
            $managedCache->set($cacheKey, time(), 3600);
        }
    }

}

// Start worker process
WorkerLicenseChecker::startWorker($argv??null);