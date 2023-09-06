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

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Configs\Fail2BanConf;

require_once 'Globals.php';

/**
 * WorkerCheckFail2BanAlive is a worker class responsible for checking the status of Fail2Ban.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerCheckFail2BanAlive extends WorkerBase
{

    /**
     * Starts the Fail2Ban alive check worker.
     *
     * @param array $argv The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $argv): void
    {
        $cacheKey = 'Workers:WorkerCheckFail2BanAlive:lastFail2BanCheck';
        $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);

        // Retrieve the last Fail2Ban check timestamp from the cache
        $lastFail2BanCheck = $managedCache->get($cacheKey);
        if ($lastFail2BanCheck === null) {

            // Perform Fail2Ban check
            Fail2BanConf::checkFail2ban();

            // Store the current timestamp in the cache to track the last check
            $managedCache->set($cacheKey, time(), 300); // Check every 5 minute
        }
    }
}

// Start worker process
WorkerCheckFail2BanAlive::startWorker($argv ?? []);




