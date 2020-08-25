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


use Phalcon\Cache;
use Phalcon\Cache\Adapter\Stream;
use Phalcon\Cache\Adapter\Memory;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Storage\SerializerFactory;

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
        if (posix_getuid() === 0) {
            $tempDir = $di->getShared('config')->path('core.modelsCacheDir');
        } else {
            $tempDir = $di->getShared('config')->path('www.modelsCacheDir');
        }

        $di->setShared(
            'modelsCache',
            function () use ($tempDir){
                $serializerFactory = new SerializerFactory();
                $options = [
                    'defaultSerializer' => 'php',
                    'lifetime'          => 7200,
                    'storageDir' => $tempDir
                ];

                $adapter = new Stream ($serializerFactory, $options);
                return new Cache($adapter);
            }
        );
    }
}