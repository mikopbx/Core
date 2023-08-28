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

namespace MikoPBX\AdminCabinet\Config;

use MikoPBX\AdminCabinet\Providers\{AssetProvider,
    CryptProvider,
    DispatcherProvider,
    ElementsProvider,
    FlashProvider,
    SecurityPluginProvider,
    ViewProvider,
    VoltProvider};
use MikoPBX\Common\Providers\{AclProvider,
    BeanstalkConnectionModelsProvider,
    CDRDatabaseProvider,
    LanguageProvider,
    MarketPlaceProvider,
    LoggerAuthProvider,
    LoggerProvider,
    MainDatabaseProvider,
    ManagedCacheProvider,
    MessagesProvider,
    ModelsAnnotationsProvider,
    ModelsCacheProvider,
    ModelsMetadataProvider,
    ModulesDBConnectionsProvider,
    PBXConfModulesProvider,
    PBXCoreRESTClientProvider,
    RegistryProvider,
    RouterProvider,
    SessionProvider,
    TranslationProvider,
    UrlProvider,};
use Phalcon\Di\DiInterface;

class RegisterDIServices
{
    /**
     * Initialize services on dependency injector
     *
     * @param DiInterface $di The DI container.
     */
    public static function init(DiInterface $di): void
    {
        $adminCabinetProviders = [

            // Inject cache providers
            ManagedCacheProvider::class,
            ModelsCacheProvider::class,

            // Inject Database connections
            ModelsAnnotationsProvider::class,
            ModelsMetadataProvider::class,
            MainDatabaseProvider::class,
            ModulesDBConnectionsProvider::class,
            CDRDatabaseProvider::class,

            // Inject web
            DispatcherProvider::class,
            RouterProvider::class,
            UrlProvider::class,
            ViewProvider::class,
            VoltProvider::class,
            FlashProvider::class,
            ElementsProvider::class,
            AssetProvider::class,
            SecurityPluginProvider::class,

            // Inject sessions
            SessionProvider::class,

            // Inject Access Control Lists
            AclProvider::class,

            // Inject Queue connection
            BeanstalkConnectionModelsProvider::class,

            // Inject translation
            MessagesProvider::class,
            TranslationProvider::class,
            LanguageProvider::class,

            // Inject license
            MarketPlaceProvider::class,

            // Inject PBX modules
            PBXConfModulesProvider::class,

            // Inject Registry
            RegistryProvider::class,

             // Inject Logger
            LoggerAuthProvider::class,
            LoggerProvider::class,

            // Inject crypto provider
            CryptProvider::class,

            // Inject Rest API client
            PBXCoreRESTClientProvider::class
        ];

        foreach ($adminCabinetProviders as $provider) {
            // Delete previous provider
            $di->remove($provider::SERVICE_NAME);
            $di->register(new $provider());
        }

        // Set library name
        $di->getShared(RegistryProvider::SERVICE_NAME)->libraryName = 'admin-cabinet';
    }
}