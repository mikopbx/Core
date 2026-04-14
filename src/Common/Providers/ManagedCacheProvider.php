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

use Phalcon\Cache\Adapter\Redis as CacheAdapterRedis;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Storage\SerializerFactory;

/**
 * The ManagedCacheProvider class is responsible for registering the managedCache service.
 *
 * @package MikoPBX\Common\Providers
 */
class ManagedCacheProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'managedCache';
    public const string CACHE_PREFIX = '_PH_MANAGED_CACHE:';
    public const int DATABASE_INDEX = 4;
    /**
     * Register the managedCache service provider.
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $config = $di->getShared(ConfigProvider::SERVICE_NAME);
        // Shared (singleton) per process — see issue #1022. Before this change
        // the provider was registered with $di->set(), so every di->get() (and
        // some workers call it every 5s inside BLPOP loops) created a fresh
        // TCP socket. Those sockets accumulated until phpredis/kernel ran out
        // of descriptors and the whole worker pool lost Redis simultaneously.
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($config) {
                $serializerFactory = new SerializerFactory();
                $options = [
                    'lifetime'          => 3600,
                    'host'              => $config->path('redis.host'),
                    'port'              => $config->path('redis.port'),
                    'index'             => self::DATABASE_INDEX,
                    'prefix'            => self::CACHE_PREFIX,
                    'persistent'        => false,
                ];
                $cacheAdapter = new CacheAdapterRedis($serializerFactory, $options);
                // Prime the underlying phpredis socket so OPT_TCP_KEEPALIVE /
                // OPT_READ_TIMEOUT apply on a live connection. The wrapper
                // keeps its reference to the same \Redis, so later cache
                // operations benefit from these options transparently.
                RedisClientProvider::primeRedisAdapter($cacheAdapter->getAdapter());
                return $cacheAdapter;
            }
        );
    }
}
