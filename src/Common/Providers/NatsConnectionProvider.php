<?php

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\Common\Providers;


use Nats\Connection as NatsConnection;
use Nats\ConnectionOptions as NatsConnectionOptions;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Main database connection is created based in the parameters defined in the configuration file
 */
class NatsConnectionProvider implements ServiceProviderInterface
{
    /**
     * Register db service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $gnatsConfig = $di->getShared('config')->get('gnats');
        $di->setShared(
            'natsConnection',
            function () use ($gnatsConfig) {
                $connectionOptions = new NatsConnectionOptions();
                $host              = $gnatsConfig->host;
                $port              = $gnatsConfig->port;
                $connectionOptions->setHost($host)->setPort($port);

                return new NatsConnection($connectionOptions);
            }
        );
    }
}