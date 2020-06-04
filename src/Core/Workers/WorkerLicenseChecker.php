<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Workers;
require_once 'globals.php';
use Exception;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Util;


class WorkerLicenseChecker extends WorkerBase
{

    public function start($argv): void
    {
        $lastLicenseCheck = $this->di->getRegistry()->lastLicenseCheck;
        if ($lastLicenseCheck===null || time() - $lastLicenseCheck > 3600){
            $lic =  $this->di->getShared('license');
            $lic->checkPBX();
            $lic->checkModules();
            $this->di->getRegistry()->lastLicenseCheck = time();
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




