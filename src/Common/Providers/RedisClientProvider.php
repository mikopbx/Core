<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

use Malkusch\Lock\Mutex\RedisMutex;
use Phalcon\Di\Di;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Storage\Adapter\Redis as AdapterRedis;
use Phalcon\Storage\SerializerFactory;

/**
 * The RedisClientProvider class is responsible for registering the Redis client service.
 * This provider is specifically designed for worker management and inter-process communication.
 *
 * @package MikoPBX\Common\Providers
 */
class RedisClientProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'redis';
    public const string CACHE_PREFIX = '_PH_REDIS_CLIENT:';
    public const int DATABASE_INDEX = 1;


    /**
     * Register the Redis client service provider.
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {  
        $config = $di->getShared(ConfigProvider::SERVICE_NAME);
        $di->set(
            self::SERVICE_NAME,
            function () use ($di, $config       ) {
                $serializerFactory = new SerializerFactory();

                $options = [
                    'defaultSerializer' => 'Php',
                    'lifetime'          => 3600,
                    'host'              => $config->path('redis.host'),
                    'port'              => $config->path('redis.port'),
                    'index'             => self::DATABASE_INDEX,
                    'prefix'            => self::CACHE_PREFIX
                ];

                return (new AdapterRedis($serializerFactory, $options))->getAdapter();
            }
        );
    }
} 