<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Workers;

use Exception;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Util;

require_once 'globals.php';


class WorkerLicenseChecker extends WorkerBase
{
    public function start($argv): void
    {
        $beansTalkClient = new BeanstalkClient();
        $beansTalkClient->subscribe('ping_' . self::class, [$this, 'pingCallBack']);

        $lic =  $this->di->getShared('license');
        while (true) {
            $beansTalkClient->wait(5);

            $delta = time() - $this->last_check_time;
            if ($delta < 3600) {
                continue;
            }
            $this->last_check_time = time();
            $lic->checkPBX();
        }
    }

}

// Start worker process
$workerClassname = WorkerLicenseChecker::class;
if (isset($argv) && count($argv) > 1) {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (Exception $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
    }
}




