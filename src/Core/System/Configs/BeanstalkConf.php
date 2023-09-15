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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Core\System\Processes;
use Phalcon\Di\Injectable;

/**
 * Class BeanstalkConf
 *
 * Represents the Beanstalk configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class BeanstalkConf extends Injectable
{
    public const PROC_NAME = 'beanstalkd';

    public const JOB_DATA_SIZE_LIMIT = 524280;

    /**
     * Restarts Beanstalk server.
     *
     * This method retrieves the Beanstalk configuration from the dependency injection container,
     * and restarts the Beanstalk server using the retrieved configuration. If the server fails to start,
     * it waits for 10 seconds and retries the startup process.
     */
    public function reStart(): void
    {
        $config = $this->getDI()->get('config')->beanstalk;
        $conf   = "-l {$config->host} -p {$config->port} -z ".self::JOB_DATA_SIZE_LIMIT;
        $result = Processes::safeStartDaemon(self::PROC_NAME, $conf);
        if(!$result){
            sleep(10);
            Processes::safeStartDaemon(self::PROC_NAME, $conf);
        }
    }
}