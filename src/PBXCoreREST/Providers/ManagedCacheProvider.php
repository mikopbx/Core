<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
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

namespace MikoPBX\PBXCoreREST\Providers;


use MikoPBX\Core\System\Util;
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
    /**
     * Register Models metadata service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $tempPath = $di->getShared('config')->path('adminApplication.cacheDir');
        $di->setShared(
            'managedCache',
            function () use ($tempPath){
                $serializerFactory = new SerializerFactory();

                $options = [
                    'defaultSerializer' => 'Php',
                    'lifetime'          => 7200,
                    'storageDir'        => $tempPath,
                ];

                $adapter = new Stream ($serializerFactory, $options);

                return new Cache($adapter);
            }
        );
    }
}