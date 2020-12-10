<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
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
 */
class LoggerProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'logger';

    /**
     * Register syslog service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        if (posix_getuid() === 0) {
            $ident = 'php.backend';
        } else {
            $ident = 'php.frontend';
        }
        $logLevel = $di->getShared('config')->path('core.logsLevel');
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