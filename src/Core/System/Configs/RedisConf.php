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

use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Processes;
use Phalcon\Di\Injectable;

class RedisConf extends Injectable
{
    public const PROC_NAME = 'redis-server';
    public const CONF_FILE = '/etc/redis.conf';

    /**
     * Restarts Beanstalk server
     */
    public function reStart(): void
    {
        $this->configure();
        $safeLink = "/sbin/safe-" . $this::PROC_NAME;
        Util::createUpdateSymlink('/etc/rc/worker_reload', $safeLink);
        Processes::killByName("safe-" . $this::PROC_NAME);
        Processes::killByName($this::PROC_NAME);
        Processes::mwExecBg("{$safeLink} ".$this::CONF_FILE);
        while (true) {
            $pid = Processes::getPidOfProcess($this::PROC_NAME);
            if (empty($pid)) {
                Util::echoWithSyslog(' - Wait for start ' . $this::PROC_NAME . ' deamon ...' . PHP_EOL);
                sleep(2);
            } else {
                break;
            }
        }
    }

    /**
     * Setup ntp daemon conf file
     */
    private function configure(): void
    {
        $config = $this->getDI()->get('config')->redis;
        $conf = "bind {$config->host}".PHP_EOL;
        $conf.= "port {$config->port}".PHP_EOL;
        Util::fileWriteContent($this::CONF_FILE, $conf);
    }
}