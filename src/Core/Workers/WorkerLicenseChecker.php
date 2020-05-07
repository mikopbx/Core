<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */
namespace MikoPBX\Core\Workers;

use Exception;
use MikoPBX\Core\System\Util;
use MikoPBX\Service\License;

require_once 'globals.php';


class WorkerLicenseChecker extends WorkerBase
{
    public function start():void
    {
        $lic = new License();
        $lic->startWorker();
    }

}

// Start worker process
$workerClassname = WorkerLicenseChecker::class;
if (isset($argv) && count($argv) > 1) {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start();
    } catch (Exception $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
    }
}




