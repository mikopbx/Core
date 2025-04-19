<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Config;

use MikoPBX\Common\Providers\{AclProvider,
    BeanstalkConnectionModelsProvider,
    CDRDatabaseProvider,
    LoggerAuthProvider,
    LoggerProvider,
    MainDatabaseProvider,
    MessagesProvider,
    ModelsAnnotationsProvider,
    ModelsMetadataProvider,
    ModulesDBConnectionsProvider,
    PBXConfModulesProvider,
    PBXCoreRESTClientProvider,
    EventBusProvider,
    RedisClientProvider,
    RegistryProvider,
    ManagedCacheProvider,
    SentryErrorHandlerProvider,
    SessionProvider,
    LanguageProvider,
    TranslationProvider,
    WhoopsErrorHandlerProvider,
    MutexProvider
};
use MikoPBX\PBXCoreREST\Providers\{
    DispatcherProvider,
    RequestProvider,
    ResponseProvider,
    RouterProvider
};
use Phalcon\Di\DiInterface;

/**
 * Initialize services on dependency injector
 */
class RegisterDIServices
{
    /**
     * Initialize services on dependency injector
     *
     * @param DiInterface $di The DI container.
     */
    public static function init(DiInterface $di): void
    {
        $pbxRestAPIProviders = [

            // Inject errors handlers
            SentryErrorHandlerProvider::class,
            WhoopsErrorHandlerProvider::class,

            // Inject Logger
            LoggerAuthProvider::class,
            LoggerProvider::class,

            // Inject Registry provider
            RegistryProvider::class,

            // Inject Database connections
            ModelsAnnotationsProvider::class,
            ModelsMetadataProvider::class,
            MainDatabaseProvider::class,
            CDRDatabaseProvider::class,
            ModulesDBConnectionsProvider::class,

            // Inject caches and message queues
            RedisClientProvider::class,
            ManagedCacheProvider::class,
            MutexProvider::class,

            // Inject Queue connection
            BeanstalkConnectionModelsProvider::class,

            // Inject PBX modules
            PBXConfModulesProvider::class,

            // Inject REST API providers
            DispatcherProvider::class,
            ResponseProvider::class,
            RequestProvider::class,
            RouterProvider::class,

            // Inject sessions
            SessionProvider::class,

            // Inject Access control lists provider
            AclProvider::class,

            // Translates
            MessagesProvider::class,
            LanguageProvider::class,
            TranslationProvider::class,

            // Inject Rest API client
            PBXCoreRESTClientProvider::class,

            // Inject EventBus provider
            EventBusProvider::class
        ];

        foreach ($pbxRestAPIProviders as $provider) {
            // Delete previous provider
            $di->remove($provider::SERVICE_NAME);
            (new $provider())->register($di);
        }

        $di->getShared(RegistryProvider::SERVICE_NAME)->libraryName = 'pbx-core-rest';
    }
}