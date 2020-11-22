<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Workers;
require_once 'Globals.php';

use MikoPBX\Core\System\Util;
use Throwable;


class WorkerLicenseChecker extends WorkerBase
{

    public function start($argv): void
    {
        $managedCache = $this->di->get('managedCache');
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
$workerClassname = WorkerLicenseChecker::class;
if (isset($argv) && count($argv) > 1) {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (Throwable $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
    }
}




