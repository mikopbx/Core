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

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Logger;
use Phalcon\Logger\Adapter\Syslog;
use Phalcon\Logger\Formatter\Line;

/**
 * Logger provider writes messages to main log file
 *
 *  @package MikoPBX\Common\Providers
 */
class LoggerProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'logger';

    /**
     * Register syslog service provider
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        if (posix_getuid() === 0) {
            $ident = 'php.backend';
        } else {
            $ident = 'php.frontend';
        }
        $logLevel = $di->getShared(ConfigProvider::SERVICE_NAME)->path('core.logsLevel');
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($logLevel, $ident){
                $adapter = new Syslog(
                    $ident,
                    [
                        'option'   => LOG_PID | LOG_PERROR,
                        'facility' => LOG_DAEMON,
                    ]
                );
                $formatter = new Line('%message%');
                $adapter->setFormatter($formatter);
                $logger =  new Logger('messages');
                $logger->addAdapter('main', $adapter);
                $logger->setLogLevel($logLevel);
                return $logger;
            }
        );
    }
}