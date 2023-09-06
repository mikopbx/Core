<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
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
            $this->logger->info($this->getDecodedString($data));
        }
    }

    public function writeError($data): void
    {
        if ($this->debug) {
            $this->logger->error($this->getDecodedString($data));
        }
    }

    public function writeInfo($data): void
    {
        if ($this->debug) {
            $this->logger->info($this->getDecodedString($data));
        }
    }

    private function getDecodedString($data):string
    {
        $printedData = print_r($data, true);
        if(is_bool($printedData)){
            $result = '';
        }else{
            $result = urldecode($printedData);
        }
        return $result;
    }


}