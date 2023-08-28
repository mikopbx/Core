<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Workers;

use MikoPBX\Core\System\BeanstalkClient;

/**
 * WorkerInterface is an interface for worker classes.
 *
 * @package MikoPBX\Core\Workers
 */
interface WorkerInterface
{
    /**
     * WorkerInterface constructor.
     */
    public function __construct();

    /**
     * Ping callback for keep alive check.
     *
     * @param BeanstalkClient $message The message received from the Beanstalk client.
     * @return void
     */
    public function pingCallBack(BeanstalkClient $message): void;

    /**
     * Get the PID file for the worker.
     *
     * @return string The path to the PID file.
     */
    public function getPidFile(): string;

    /**
     * Worker entry point.
     *
     * @param array $argv The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $argv): void;

}