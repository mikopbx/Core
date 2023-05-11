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

declare(strict_types=1);

namespace MikoPBX\Common\Providers;


use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Session\Adapter\Redis;
use Phalcon\Session\Manager;
use Phalcon\Storage\AdapterFactory;
use Phalcon\Storage\SerializerFactory;

/**
 * Start the session the first time some component request the session service
 */
class SessionProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'session';

    public const CACHE_PREFIX = '_PHCM_SESS:';

    public const VERSION_HASH = 'versionHash';

    /**
     * Register session service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $config = $di->getShared(ConfigProvider::SERVICE_NAME);
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($config) {
                $options = [
                    'defaultSerializer' => 'Php',
                    'lifetime'          => 3600,
                    'host'              => $config->path('redis.host'),
                    'port'              => $config->path('redis.port'),
                    'index'             => 1,
                    'prefix'            => self::CACHE_PREFIX
                ];
                $session           = new Manager();
                $serializerFactory = new SerializerFactory();
                $factory           = new AdapterFactory($serializerFactory);
                $redis             = new Redis($factory, $options);
                $session
                    ->setAdapter($redis)
                    ->start();
                return $session;
            }
        );
    }
}