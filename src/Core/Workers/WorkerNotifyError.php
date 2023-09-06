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
use MikoPBX\Core\System\Notifications;
use MikoPBX\PBXCoreREST\Lib\AdvicesProcessor;

/**
 * WorkerNotifyError is a worker class responsible for checking the significant advices messages and sent it to system administrator.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerNotifyError extends WorkerBase
{
    /**
     * Starts the errors notifier worker.
     *
     * @param array $argv The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $argv): void
    {
        $cacheKey = 'Workers:WorkerNotifyError:lastErrorsCheck';
        $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);

        // Retrieve the last error check timestamp from the cache
        $lastErrorsCheck = $managedCache->get($cacheKey);
        if ($lastErrorsCheck === null) {
            $restResponse = AdvicesProcessor::callBack(['action' => 'getList']);
            $errorMessages = $restResponse->data['advices']['error']??[];
            if ($restResponse->success and $errorMessages!==[]) {
                Notifications::sendAdminNotification('adv_ThereIsSomeTroublesWithMikoPBX', $errorMessages);
            }

            // Store the current timestamp in the cache to track the last error check
            $managedCache->set($cacheKey, time(), 3600); // Check every hour
        }

    }

}

// Start worker process
WorkerNotifyError::startWorker($argv ?? []);