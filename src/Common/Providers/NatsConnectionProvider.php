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

use Nats\Connection as NatsConnection;
use Nats\ConnectionOptions as NatsConnectionOptions;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

/**
 * Registers natsConnection service provider.
 *
 * @package MikoPBX\Common\Providers
 */
class NatsConnectionProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'natsConnection';

    /**
     * Registers natsConnection service provider
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $gnatsConfig = $di->getShared(ConfigProvider::SERVICE_NAME)->get('gnats');
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($gnatsConfig) {
                $connectionOptions = new NatsConnectionOptions();
                $connectionOptions
                    ->setHost($gnatsConfig->host)
                    ->setPort($gnatsConfig->port);

                return new NatsConnection($connectionOptions);
            }
        );
    }
}
