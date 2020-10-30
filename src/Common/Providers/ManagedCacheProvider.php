<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 8 2020
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
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Storage\SerializerFactory;


/**
 * Main database connection is created based in the parameters defined in the configuration file
 */
class ManagedCacheProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'managedCache';

    /**
     * Register managedCache service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        if (posix_getuid() === 0) {
            $tempDir = $di->getShared('config')->path('core.managedCacheDir');
        } else {
            $tempDir = $di->getShared('config')->path('www.managedCacheDir');
        }
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($tempDir){
                $serializerFactory = new SerializerFactory();

                $options = [
                    'defaultSerializer' => 'Php',
                    'lifetime'          => 7200,
                    'storageDir'        => $tempDir,
                ];

                $adapter = new Stream ($serializerFactory, $options);

                return new Cache($adapter);
            }
        );
    }
}