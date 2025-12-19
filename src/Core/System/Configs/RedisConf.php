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
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;

/**
 * Class RedisConf
 *
 * Represents the Redis configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class RedisConf extends SystemConfigClass
{
    public const string PROC_NAME = 'redis-server';
    public const string CONF_FILE = '/etc/redis.conf';

    public string $port = '';

    public function __construct()
    {
        parent::__construct();

        $redisServer = Util::which(self::PROC_NAME);
        $this->startCommand = "$redisServer ". self::CONF_FILE;
    }

    /**
     * Starts the Redis server.
     *
     * @return bool
     */
    public function start(): bool
    {
        if(System::isBooting()){
            $this->configure();
            Processes::mwExecBg($this->startCommand);
            return $this->waitForRedisStart();
        }
        return $this->reStart();
    }

    /**
     * Restarts the Redis server.
     *
     * @return bool
     */
    public function reStart(): bool
    {
        Processes::killByName(self::PROC_NAME);
        
        // Wait for Redis to completely stop
        $maxAttempts = 30;
        for ($i = 0; $i < $maxAttempts; $i++) {
            if (empty(Processes::getPidOfProcess(self::PROC_NAME))) {
                break;
            }
            usleep(500000); // 0.5 second
        }

        $this->configure();
        $this->generateMonitConf();

        $pidMonit = Processes::getPidOfProcess(MonitConf::PROC_NAME);
        if(empty($pidMonit)){
            Processes::mwExecBg($this->startCommand);
        }else{
            $this->monitRestart();
        }

        return $this->waitForRedisStart();
    }

    /**
     * Wait for Redis to start with timeout
     *
     * @param int $timeout Maximum number of seconds to wait
     * @return bool True if Redis started within timeout
     */
    private function waitForRedisStart(int $timeout = 60): bool
    {
        $redisCli = Util::which('redis-cli');
        $maxAttempts = $timeout * 2; // Check every 0.5 seconds

        for ($i = 0; $i < $maxAttempts; $i++) {
            if (Processes::mwExec("$redisCli -p $this->port ping") === 0) {
                return true;
            }
            usleep(500000); // 0.5 second
        }

        return false;
    }

    /**
     * Generates the Monit configuration file for the Redis process.
     *
     * This method creates a Monit configuration entry to monitor the Redis service.
     * It defines how to start and stop the service, sets appropriate user permissions,
     * and saves the configuration file to the designated directory.
     *
     * @return bool Always returns true after successfully generating and saving the configuration file.
     */
    public function generateMonitConf(): bool{

        $busyboxPath = Util::which('busybox');
        $confPath    = $this->getMainMonitConfFile();

        $conf = 'check process '.self::PROC_NAME.' with pidfile /var/run/redis.pid '.PHP_EOL.
            '    start program = "'.$this->startCommand.'"'.PHP_EOL.
            '        as uid root and gid root'.PHP_EOL.
            '    stop program = "'.$busyboxPath.' killall '.self::PROC_NAME.'"'.PHP_EOL.
            '        as uid root and gid root';

        $this->saveFileContent($confPath, $conf);
        return true;
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
        $conf   = "bind $config->host" . PHP_EOL;
        $conf  .= "port $config->port" . PHP_EOL;
        $conf  .= "dir /var/tmp" . PHP_EOL;
        $conf  .= "loglevel warning" . PHP_EOL;
        $conf  .= "syslog-enabled yes" . PHP_EOL;
        $conf  .= "syslog-ident redis" . PHP_EOL;
        $conf  .= "daemonize yes" . PHP_EOL;
        # Connection settings
        $conf  .= "timeout 0" . PHP_EOL;
        $conf  .= "tcp-keepalive 60" . PHP_EOL;
        $conf  .= "client-output-buffer-limit pubsub 32mb 8mb 60" . PHP_EOL;

        # Performance tuning
        $conf  .= "tcp-backlog 511" . PHP_EOL;
        file_put_contents(self::CONF_FILE, $conf);
    }

    /**
     * Generate additional syslog rules.
     * @return void
     */
    public static function generateSyslogConf(): void
    {
        Util::mwMkdir('/etc/rsyslog.d');
        $log_fileRedis       = SyslogConf::getSyslogFile('redis');
        $pathScriptRedis     = SyslogConf::createRotateScript('redis');
        $confSyslogD = '$outchannel log_redis,' . $log_fileRedis . ',10485760,' . $pathScriptRedis . PHP_EOL .
            'if $programname == "redis-server" then :omfile:$log_redis' . PHP_EOL .
            'if $programname == "redis-server" then stop' . PHP_EOL;
        file_put_contents('/etc/rsyslog.d/redis.conf', $confSyslogD);
    }
}
