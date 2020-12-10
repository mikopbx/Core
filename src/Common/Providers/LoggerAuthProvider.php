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
 * LoggerAuth provider writes messages to main log file
 */
class LoggerAuthProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'loggerAuth';

    /**
     * Register syslog auth service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () {
                $adapter = new Syslog(
                    'web_auth',
                    [
                        'option'   => LOG_PID | LOG_PERROR,
                        'facility' => LOG_AUTH,
                    ]
                );
                $formatter = new Line('%message%');
                $adapter->setFormatter($formatter);
                $logger =  new Logger('messages');
                $logger->addAdapter('main', $adapter);
                return $logger;
            }
        );
    }
}