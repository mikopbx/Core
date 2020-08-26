<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 8 2020
 *
 */

namespace MikoPBX\Core\Workers;

use Exception;
use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\Util;

require_once 'Globals.php';

/**
 * Class WorkerCheckFail2BanAlive check fail2ban service is alive
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerCheckFail2BanAlive extends WorkerBase
{
    public function start($params): void
    {
        $managedCache = $this->di->get('managedCache');
        $lastFail2BanCheck = $managedCache->get('lastFail2BanCheck');
        if ($lastFail2BanCheck === null) {
            Fail2BanConf::checkFail2ban();
            $managedCache->set('lastFail2BanCheck', time(), 300); // Check every 5 minute
        }
    }
}

// Start worker process
$workerClassname = WorkerCheckFail2BanAlive::class;
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




