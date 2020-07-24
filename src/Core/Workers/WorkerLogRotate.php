<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2020
 *
 */

namespace MikoPBX\Core\Workers;


use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Core\System\Configs\NatsConf;
use MikoPBX\Core\System\PBX;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;

class WorkerLogRotate extends WorkerBase
{

    /**
     * @inheritDoc
     */
    public function start($params): void
    {
        $lastLogRotateTime = $this->di->getRegistry()->lastLogRotateTime;
        if ($lastLogRotateTime === null || time() - $lastLogRotateTime > 3600){
            //System Logs
            NatsConf::logRotate();
            System::rotatePhpLog();
            PBX::logRotate();

            //Modules Logs
            $plugins = PbxExtensionModules::find('disabled="0"')->toArray();
            foreach ($plugins as $plugin) {
                $this->logRotate($plugin['uniqid']);
            }

            $this->di->getRegistry()->lastLogRotateTime = time();
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
            Util::mwExec("{$logrotatePath} '{$pathConf}' > /dev/null 2> /dev/null");
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
    } catch (\Exception $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
    }
}
