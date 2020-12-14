<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Core\Workers;
require_once 'Globals.php';

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Configs\NatsConf;
use MikoPBX\Core\System\Configs\PHPConf;
use MikoPBX\Core\System\Configs\SyslogConf;
use MikoPBX\Core\System\PBX;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use Throwable;

class WorkerLogRotate extends WorkerBase
{

    /**
     * @inheritDoc
     */
    public function start($params): void
    {
        $managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);
        $lastLogRotate = $managedCache->get('lastCoreWorkerLogRotateProcessing');
        if ($lastLogRotate===null){
            //System Logs
            NatsConf::logRotate();
            PHPConf::rotateLog();
            PBX::logRotate();
            SyslogConf::rotatePbxLog();

            //Modules Logs
            $plugins = PbxExtensionModules::getEnabledModulesArray();
            foreach ($plugins as $plugin) {
                $this->logRotate($plugin['uniqid']);
            }
            $managedCache->set('lastCoreWorkerLogRotateProcessing', time(), 3600);
        }
    }

    /**
     * Makes log rotate on every log file in folder with module name
     *
     * @param string $moduleUniqid
     */
    public function logRotate(string $moduleUniqid): void
    {
        $logPath        = System::getLogDir() . '/' . $moduleUniqid . '/';
        if ( ! file_exists($logPath)) {
            return;
        }

        $results         = glob($logPath . '*.log', GLOB_NOSORT);
        $textConfig = '';
        foreach ($results as $file) {
            $textConfig .= $file . ' {
    start 0
    rotate 9
    size 10M
    maxsize 10M
    daily
    missingok
    notifempty
}'.PHP_EOL;
            $pathConf = '/tmp/'.pathinfo($file)['filename'].'.conf';
            file_put_contents($pathConf, $textConfig);
            $logrotatePath = Util::which('logrotate');
            Processes::mwExec("{$logrotatePath} '{$pathConf}' > /dev/null 2> /dev/null");
            if (file_exists($pathConf)) {
                unlink($pathConf);
            }
        }
    }
}

// Start worker process
$workerClassname = WorkerLogRotate::class;
if (isset($argv) && count($argv) > 1) {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (\Throwable $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage(), LOG_ERR);
    }
}
