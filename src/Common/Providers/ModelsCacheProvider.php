<?php

///*
// * MikoPBX - free phone system for small business
// * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
// *
// * This program is free software: you can redistribute it and/or modify
// * it under the terms of the GNU General Public License as published by
// * the Free Software Foundation; either version 3 of the License, or
// * (at your option) any later version.
// *
// * This program is distributed in the hope that it will be useful,
// * but WITHOUT ANY WARRANTY; without even the implied warranty of
// * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// * GNU General Public License for more details.
// *
// * You should have received a copy of the GNU General Public License along with this program.
// * If not, see <https://www.gnu.org/licenses/>.
// */
//
//declare(strict_types=1);
//
//namespace MikoPBX\Common\Providers;
//
//
//use Phalcon\Storage\Adapter\Redis;
//use Phalcon\Cache\AdapterFactory;
//use Phalcon\Cache\Cache;
//use Phalcon\Di\DiInterface;
//use Phalcon\Di\ServiceProviderInterface;
//use Phalcon\Storage\SerializerFactory;
//
///**
// * Registers the Models cache in REDIS service provider.
// *
// * @package MikoPBX\Common\Providers
// */
//class ModelsCacheProvider implements ServiceProviderInterface
//{
//    public const string SERVICE_NAME = 'modelsCache';
//
//    public const string CACHE_PREFIX = 'models-cache:';
//
//    /**
//     * Register Models cache service provider.
//     *
//     * @param DiInterface $di The DI container.
//     */
//    public function register(DiInterface $di): void
//    {
//        $config = $di->getShared(ConfigProvider::SERVICE_NAME);
//        $di->setShared(
//            self::SERVICE_NAME,
//            function () use ($config) {
//                $serializerFactory = new SerializerFactory();
//                $adapterFactory    = new AdapterFactory($serializerFactory);
//
//                $options = [
//                    'defaultSerializer' => 'redis_php',
//                    'lifetime'          => 3600,
//                    'host'              => $config->path('redis.host'),
//                    'port'              => $config->path('redis.port'),
//                    'index'             => 3,
//                    'prefix'            => self::CACHE_PREFIX
//                ];
//
//                $adapter = $adapterFactory->newInstance('redis', $options);
//
//                return new Cache($adapter);
//
//            }
//        );
//    }
//}
