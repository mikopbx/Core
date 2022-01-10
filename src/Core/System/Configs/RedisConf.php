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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

class RedisConf extends Injectable
{
    public const PROC_NAME = 'redis-server';

    public const CONF_FILE = '/etc/redis.conf';

    public string $port = '';
    /**
     * Restarts Redis server
     */
    public function reStart(): void
    {
        $this->configure();
        Processes::safeStartDaemon(self::PROC_NAME, self::CONF_FILE);

        $redisCli = Util::which('redis-cli');
        for ($i=1; $i <= 60; $i++){
            if(Processes::mwExec("$redisCli -p $this->port info") === 0){
                break;
            }
            sleep(1);
        }
    }

    /**
     * Setup redis daemon conf file
     */
    private function configure(): void
    {
        $config = $this->getDI()->get('config')->redis;
        $this->port = $config->port;
        $conf   = "bind {$config->host}" . PHP_EOL;
        $conf   .= "port {$config->port}" . PHP_EOL;
        file_put_contents(self::CONF_FILE, $conf);
    }
}