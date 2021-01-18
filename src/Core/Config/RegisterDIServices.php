<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Config;

use MikoPBX\Common\Providers\{AmiConnectionCommand,
    AmiConnectionListener,
    BeanstalkConnectionCacheProvider,
    BeanstalkConnectionModelsProvider,
    BeanstalkConnectionWorkerApiProvider,
    CDRDatabaseProvider,
    LicenseProvider,
    LoggerProvider,
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
    UrlProvider,
    LanguageProvider};
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

            // Inject Logger provider
            LoggerProvider::class,

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
            LanguageProvider::class,

            // Inject Queue connection
            NatsConnectionProvider::class,
            BeanstalkConnectionCacheProvider::class,
            BeanstalkConnectionModelsProvider::class,
            BeanstalkConnectionWorkerApiProvider::class,


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