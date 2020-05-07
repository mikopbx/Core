<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\Common\Providers;


use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Cache;
use Phalcon\Storage\SerializerFactory;
use Phalcon\Cache\Adapter\Memory;

/**
 * Main database connection is created based in the parameters defined in the configuration file
 */
class ModelsCacheProvider implements ServiceProviderInterface
{
    /**
     * Register Models metadata service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            'modelsCache',
            function () {
                $serializerFactory = new SerializerFactory();

                $options = [
                    'defaultSerializer' => 'Json',
                    'lifetime'          => 3600,
                ];

                $adapter = new Memory($serializerFactory, $options);
                return new Cache($adapter);
            }
        );
    }
}