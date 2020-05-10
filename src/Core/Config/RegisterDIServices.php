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

use Phalcon\Di;
use MikoPBX\Common\Providers\{ManagedCacheProvider,
    ModelsCacheProvider,
    ModelsMetadataProvider,
    MainDatabaseProvider,
    CDRDatabaseProvider,
    TranslationProvider,
    NatsConnectionProvider,
    ModulesDBConnectionsProvider};
use MikoPBX\Core\Providers\{
    PBXConfModulesProvider,
    RegistryProvider,
    CliMessagesProvider,
    EventsLogDatabaseProvider};


class RegisterDIServices
{
    /**
     * Initialize services on dependency injector
     * @param bool $safeMode
     */
    public static function init($safeMode=false): void
    {
        $di = Di::getDefault();
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

            // Inject PBX modules
            PBXConfModulesProvider::class

        ];

        foreach ($adminCabinetProviders as $provider) {
            $di->register(new $provider());
        }

        if (! $safeMode) { //TODO:: Проверить успешно ли грузятся правила Firewall из модулей
            // Inject Modules' Database connections
            $di->register( new ModulesDBConnectionsProvider());
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