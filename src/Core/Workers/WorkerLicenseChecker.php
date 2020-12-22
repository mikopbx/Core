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

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Util;
use Throwable;


class WorkerLicenseChecker extends WorkerBase
{

    public function start($argv): void
    {
        $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);
        $lastLicenseCheck = $managedCache->get('lastLicenseCheck');
        if ($lastLicenseCheck===null){
            $lic =  $this->di->getShared('license');
            $lic->checkPBX();
            $lic->checkModules();
            $managedCache->set('lastLicenseCheck', time(), 3600);
        }
    }

}

// Start worker process
WorkerLicenseChecker::startWorker($argv??null);