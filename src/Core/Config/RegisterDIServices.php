<?php

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\Core\Config;

use MikoPBX\Common\Providers\{CDRDatabaseProvider,
    LicenseProvider,
    MainDatabaseProvider,
    ModelsCacheProvider,
    ModelsMetadataProvider,
    ModulesDBConnectionsProvider,
    NatsConnectionProvider,
    PBXConfModulesProvider,
    RegistryProvider,
    TranslationProvider,
    MessagesProvider,
    UrlProvider};
use MikoPBX\Core\Providers\{EventsLogDatabaseProvider,ManagedCacheProvider};
use Phalcon\Di;


class RegisterDIServices
{
    /**
     * Initialize services on dependency injector
     */
    public static function init(): void
    {
        $di                    = Di::getDefault();
        $adminCabinetProviders = [
            // Inject Registry provider
            RegistryProvider::class,

            // Inject Database connections
            ModelsMetadataProvider::class,
            MainDatabaseProvider::class,
            CDRDatabaseProvider::class,
            EventsLogDatabaseProvider::class,

            // Inject caches
            ManagedCacheProvider::class,
            ModelsCacheProvider::class,

            // Inject Translations
            MessagesProvider::class,
            TranslationProvider::class,

            // Inject Queue connection
            NatsConnectionProvider::class,

            // Inject License Worker
            LicenseProvider::class,

            // Url link builder
            UrlProvider::class,

            // Inject PBX modules
            PBXConfModulesProvider::class,
            ModulesDBConnectionsProvider::class,

        ];

        foreach ($adminCabinetProviders as $provider) {
            $di->register(new $provider());
        }
    }

    /**
     * Recreate DB connections after table structure changes
     */
    public static function recreateDBConnections(): void
    {
        $di = Di::getDefault();
        $di->remove('db');
        $di->remove('dbCDR');
        $di->remove('dbEventsLog');
        $di->register(new MainDatabaseProvider());
        $di->register(new CDRDatabaseProvider());
        $di->register(new EventsLogDatabaseProvider());
    }

    /**
     * Recreate DB connections after table structure changes for additional modules
     */
    public static function recreateModulesDBConnections(): void
    {
        $di = Di::getDefault();
        $di->register(new ModulesDBConnectionsProvider());
    }
}