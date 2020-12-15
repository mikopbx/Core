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
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Util;
use Throwable;


/**
 * Class WorkerBeanstalkdTidyUp
 *
 * Keeps beanstalk tubes clean
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerBeanstalkdTidyUp extends WorkerBase
{
    public function start($argv): void
    {
        $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);
        $lastTubesCheck = $managedCache->get('lastTubesCheck');
        if ($lastTubesCheck === null){
            $client = new BeanstalkClient();
            $client->cleanTubes();
            $managedCache->set('lastTubesCheck', time(), 300);
        }
    }

}

// Start worker process
$workerClassname = WorkerBeanstalkdTidyUp::class;
if (isset($argv) && count($argv) > 1) {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (Throwable $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage(), LOG_ERR);
    }
}