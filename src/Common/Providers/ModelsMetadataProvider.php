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


use Phalcon\Cache\AdapterFactory;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Mvc\Model\MetaData\Redis;
use Phalcon\Mvc\Model\MetaData\Strategy\Annotations as StrategyAnnotations;
use Phalcon\Storage\SerializerFactory;

/**
 * Registers the Models metadata service provider.
 *
 * @package MikoPBX\Common\Providers
 */
class ModelsMetadataProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'modelsMetadata';

    /**
     * Register Models metadata service provider.
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $config = $di->getShared(ConfigProvider::SERVICE_NAME);
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($config){
                $serializerFactory = new SerializerFactory();
                $adapterFactory    = new AdapterFactory($serializerFactory);
                $options = [
                    'host'       => $config->path('redis.host'),
                    'port'       => $config->path('redis.port'),
                    'statsKey'   => '_PHCR',
                    'lifetime'   => 600,
                    'index'      => 2,
                ];
                $metaData = new Redis($adapterFactory, $options);

                $metaData->setStrategy(
                    new StrategyAnnotations()
                );

                return $metaData;
            }
        );
    }
}