<?php
declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\PBXCoreREST\Config;

use MikoPBX\PBXCoreREST\Providers\{DispatcherProvider, RequestProvider, ResponseProvider, RouterProvider, BeanstalkConnectionProvider};
use MikoPBX\Common\Providers\{CDRDatabaseProvider,
    MainDatabaseProvider,
    ManagedCacheProvider,
    ModelsCacheProvider,
    ModelsMetadataProvider,
    NatsConnectionProvider,
    RegistryProvider,
    PBXConfModulesProvider,
    SessionReadOnlyProvider,
    TranslationProvider};
use MikoPBX\Core\Providers\CliMessagesProvider;
use MikoPBX\Core\Providers\EventsLogDatabaseProvider;
use Phalcon\Di\DiInterface;

class RegisterDIServices
{
    /**
     * Register dispatcher service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public static function init(DiInterface $di):void
    {
        $pbxRestAPIProviders = [
            // Inject Registry provider
            RegistryProvider::class,

            // Inject Database connections
            ModelsMetadataProvider::class,
            MainDatabaseProvider::class,
            CDRDatabaseProvider::class,

            // Inject caches
            ManagedCacheProvider::class,
            ModelsCacheProvider::class,


            // Inject Queue connection
            BeanstalkConnectionProvider::class,

            // Inject PBX modules
            PBXConfModulesProvider::class,

            // Inject REST API providers
            DispatcherProvider::class,
            ResponseProvider::class,
            RequestProvider::class,
            RouterProvider::class,
            SessionReadOnlyProvider::class

        ];

        foreach ($pbxRestAPIProviders as $provider) {
            $di->register(new $provider());
        }

    }
}