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

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\BeanstalkClient;


/**
 * Class WorkerBeanstalkdTidyUp
 *
 * This worker is responsible for keeping the beanstalk tubes clean.
 * It checks whether the tubes need cleaning and if they do, it cleans them up.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerBeanstalkdTidyUp extends WorkerBase
{
    /**
     * Starts the worker. It checks the time of the last tubes check.
     * If there wasn't a check or if it happened more than 5 minutes ago, it initiates a new check and cleans the tubes.
     *
     * @param array $argv The command-line arguments passed to the worker.
     *
     * @return void
     */
    public function start(array $argv): void
    {
        // Define the cache key
        $cacheKey = 'Workers:WorkerBeanstalkdTidyUp:lastTubesCheck';

        // Get an instance of the ManagedCacheProvider
        $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);

        // Retrieve the time of the last tubes check from the cache
        $lastTubesCheck = $managedCache->get($cacheKey);

        // If the last check was not performed or it was performed more than 5 minutes ago,
        // clean the tubes and update the last check time in the cache
        if ($lastTubesCheck === null) {

            // Clean the tubes
            $client = new BeanstalkClient();
            $client->cleanTubes();

            // Update the last tubes check time in the cache, set it to expire after 300 seconds (5 minutes)
            $managedCache->set($cacheKey, time(), 300);
        }
    }

}

// Start worker process
WorkerBeanstalkdTidyUp::startWorker($argv ?? []);
