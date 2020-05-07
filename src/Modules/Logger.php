<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

namespace MikoPBX\Modules;

use MikoPBX\Core\System\System;
use Phalcon\Logger\Adapter\Stream as FileAdapter;

class Logger
{
    private $logFile;
    private $logger;

    /**
     * Logger constructor.
     *
     * @param $class
     * @param $moduleId
     */
    public function __construct($class, $moduleId)
    {
        $logPath        = System::getLogDir() . '/' . $moduleId . '/';
        $this->logFile  = $logPath . $class . 'log';
        $logfilestokeep = 30;

        if (file_exists($this->logFile)) {
            if (date('Y-m-d', filemtime($this->logFile)) !== date('Y-m-d')) {
                if (file_exists($this->logFile . '.' . $logfilestokeep)) {
                    unlink($this->logFile . '.' . $logfilestokeep);
                }
                for ($i = $logfilestokeep; $i > 0; $i--) {
                    if (file_exists($this->logFile . '.' . $i)) {
                        $next = $i + 1;
                        rename($this->logFile . '.' . $i, $this->logFile . '.' . $next);
                    }
                }
                rename($this->logFile, $this->logFile . '.1');
            }
        } elseif ( ! file_exists($logPath) && ! mkdir($logPath, 0777, true) && ! is_dir($logPath)) {
            $this->logFile = "/var/log/$moduleId.log";
        }
        $this->logger = new FileAdapter($this->logFile);
    }

    public function write($data, $level = \Phalcon\Logger::ERROR): void
    {
        $this->logger->log(print_r($data, true));
    }

    public function writeError($data, $level = \Phalcon\Logger::ERROR): void
    {
        $this->logger->log(print_r($data, true));
    }

    public function writeInfo($data, $level = \Phalcon\Logger::INFO): void
    {
        $this->logger->log(print_r($data, true));
    }
}