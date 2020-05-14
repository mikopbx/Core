<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

namespace MikoPBX\Core\Modules;

use MikoPBX\Core\System\System;
use Phalcon\Logger\Adapter\Stream as FileLogger;

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
        $adapter       = new FileLogger($this->logFile);
        $this->logger  = new \Phalcon\Logger(
            'messages',
            [
                'main' => $adapter,
            ]
        );
    }

    public function write($data): void
    {
        $this->logger->info(print_r($data, true));
    }

    public function writeError($data): void
    {
        $this->logger->error(print_r($data, true));
    }

    public function writeInfo($data): void
    {
        $this->logger->info(print_r($data, true));
    }
}