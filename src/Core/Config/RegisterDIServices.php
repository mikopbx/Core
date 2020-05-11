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

use MikoPBX\Common\Providers\{
    CDRDatabaseProvider,
    LicenseWorkerProvider,
    MainDatabaseProvider,
    ManagedCacheProvider,
    ModelsCacheProvider,
    ModelsMetadataProvider,
    ModulesDBConnectionsProvider,
    NatsConnectionProvider,
    PBXConfModulesProvider,
    RegistryProvider,
    TranslationProvider};
use MikoPBX\Core\Providers\{CliMessagesProvider, EventsLogDatabaseProvider};
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
            CliMessagesProvider::class,
            TranslationProvider::class,

            // Inject Queue connection
            NatsConnectionProvider::class,

            // Inject License Worker
            LicenseWorkerProvider::class,

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
}