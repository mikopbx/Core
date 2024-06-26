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

use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

/**
 * Class RedisConf
 *
 * Represents the Redis configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class RedisConf extends Injectable
{
    public const PROC_NAME = 'redis-server';

    public const CONF_FILE = '/etc/redis.conf';

    public string $port = '';

    /**
     * Restarts the Redis server.
     *
     * @return void
     */
    public function reStart(): void
    {
        $mainRunner = 'safe-'.self::PROC_NAME;
        Processes::killByName($mainRunner);
        Processes::killByName(self::PROC_NAME);

        $ch = 0;
        do{
            $ch++;
            // Wait for Redis to finish its work
            sleep(1);
            $pid1 = Processes::getPidOfProcess($mainRunner);
            $pid2 = Processes::getPidOfProcess(self::PROC_NAME);
        }while(!empty($pid1.$pid2) && $ch < 30);

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
     * Sets up the Redis daemon conf file.
     *
     * @return void
     */
    private function configure(): void
    {
        $config = $this->getDI()->get(ConfigProvider::SERVICE_NAME)->redis;
        $this->port = $config->port;
        $conf   = "bind {$config->host}" . PHP_EOL;
        $conf  .= "port {$config->port}" . PHP_EOL;
        $conf  .= "dir /var/tmp" . PHP_EOL;
        $conf  .= "loglevel warning" . PHP_EOL;
        $conf  .= "syslog-enabled yes" . PHP_EOL;
        $conf  .= "syslog-ident redis" . PHP_EOL;
        file_put_contents(self::CONF_FILE, $conf);
    }

    /**
     * Generate additional syslog rules.
     * @return void
     */
    public static function generateSyslogConf():void
    {
        Util::mwMkdir('/etc/rsyslog.d');
        $log_fileRedis       = SyslogConf::getSyslogFile('redis');
        $pathScriptRedis     = SyslogConf::createRotateScript('redis');
        $confSyslogD = '$outchannel log_redis,'.$log_fileRedis.',10485760,'.$pathScriptRedis.PHP_EOL.
            'if $programname == "redis-server" then :omfile:$log_redis'.PHP_EOL.
            'if $programname == "redis-server" then stop'.PHP_EOL;
        file_put_contents('/etc/rsyslog.d/redis.conf', $confSyslogD);
    }
}