<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Modules\Workers;
require_once 'globals.php';
use Exception;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Workers\WorkerBase;


class WorkerModuleLogRotate extends WorkerBase
{
    public function start($argv): void
    {
        $lastStart = $this->di->getRegistry()->lastModulesLogRotateStart;
        if ($lastStart!== null && time() - $lastStart < 3600){
            return;
        }

        $plugins = PbxExtensionModules::find('disabled="0"');
        foreach ($plugins as $plugin) {
            $this->logRotate($plugin->uniqid);
        }
        $this->di->getRegistry()->lastModulesLogRotateStart = time();
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
            Util::mwExec("/usr/sbin/logrotate '{$pathConf}' > /dev/null 2> /dev/null");
            if (file_exists($pathConf)) {
                unlink($pathConf);
            }
        }
    }

}

// Start worker process
$workerClassname = WorkerModuleLogRotate::class;
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




