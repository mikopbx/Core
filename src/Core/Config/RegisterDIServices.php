<?php
/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 9 2020
 */

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\Core\Config;

use MikoPBX\Common\Providers\{AmiConnectionCommand,
    AmiConnectionListener,
    BeanstalkConnectionCacheProvider,
    CDRDatabaseProvider,
    LicenseProvider,
    MainDatabaseProvider,
    ModelsCacheProvider,
    ManagedCacheProvider,
    ModelsMetadataProvider,
    ModulesDBConnectionsProvider,
    NatsConnectionProvider,
    PBXConfModulesProvider,
    RegistryProvider,
    TranslationProvider,
    MessagesProvider,
    UrlProvider};
use MikoPBX\Core\Providers\EventsLogDatabaseProvider;
use Phalcon\Di;


class RegisterDIServices
{
    /**
     * Initialize services on dependency injector
     */
    public static function init(): void
    {
        $di            = Di::getDefault();
        $providersList = [

            // Inject Config provider
            // ConfigProvider::class,

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
            BeanstalkConnectionCacheProvider::class,

            // AMI Connectors
            AmiConnectionCommand::class,
            AmiConnectionListener::class,

            // Inject License Worker
            LicenseProvider::class,

            // Url link builder
            UrlProvider::class,

            // Inject PBX modules
            PBXConfModulesProvider::class,
            ModulesDBConnectionsProvider::class,

        ];

        foreach ($providersList as $provider) {
            // Delete previous provider
            $di->remove($provider::SERVICE_NAME);
            $di->register(new $provider());
        }
    }

    /**
     * Recreate DB connections after table structure changes
     */
    public static function recreateDBConnections(): void
    {
        $dbProvidersList = [
            ModelsCacheProvider::class, // Always recreate it before change DB providers

            MainDatabaseProvider::class,
            CDRDatabaseProvider::class,
            EventsLogDatabaseProvider::class
        ];

        $di = Di::getDefault();

        foreach ($dbProvidersList as $provider) {
            // Delete previous provider
            $di->remove($provider::SERVICE_NAME);
            $di->register(new $provider());
        }
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