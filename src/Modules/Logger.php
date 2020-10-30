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
use MikoPBX\Core\System\Util;
use Phalcon\Logger\Adapter\Stream as FileLogger;

class Logger
{
    public bool $debug;
    private \Phalcon\Logger $logger;
    private string $module_name;

    /**
     * Logger constructor.
     *
     * @param string $class
     * @param string $module_name
     */
    public function __construct(string $class, string $module_name)
    {
        $this->module_name = $module_name;
        $this->debug    = true;
        $logPath        = System::getLogDir() . '/' . $this->module_name . '/';
        if (!is_dir($logPath)){
            Util::mwMkdir($logPath);
            Util::addRegularWWWRights($logPath);
        }
        $logFile  = $logPath . $class . '.log';
        $adapter       = new FileLogger($logFile);
        $this->logger  = new \Phalcon\Logger(
            'messages',
            [
                'main' => $adapter,
            ]
        );
    }

    public function write($data): void
    {
        if ($this->debug) {
            $this->logger->info(urldecode(print_r($data, true)));
        }
    }

    public function writeError($data): void
    {
        if ($this->debug) {
            $this->logger->error(urldecode(print_r($data, true)));
        }
    }

    public function writeInfo($data): void
    {
        if ($this->debug) {
            $this->logger->info(urldecode(print_r($data, true)));
        }
    }


}