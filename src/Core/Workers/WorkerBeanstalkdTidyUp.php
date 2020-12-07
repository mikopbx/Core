<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Workers;
require_once 'Globals.php';

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
        $managedCache = $this->di->get('managedCache');
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