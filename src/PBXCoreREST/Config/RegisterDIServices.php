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

namespace MikoPBX\PBXCoreREST\Config;

use MikoPBX\Common\Providers\{BeanstalkConnectionWorkerApiProvider,
    CDRDatabaseProvider,
    LoggerAuthProvider,
    LoggerProvider,
    MainDatabaseProvider,
    MessagesProvider,
    ModelsCacheProvider,
    ModelsAnnotationsProvider,
    ModelsMetadataProvider,
    ModulesDBConnectionsProvider,
    PBXConfModulesProvider,
    RegistryProvider,
    ManagedCacheProvider,
    SessionReadOnlyProvider,
    LanguageProvider};
use MikoPBX\PBXCoreREST\Providers\{
    DispatcherProvider,
    RequestProvider,
    ResponseProvider,
    RouterProvider};
use Phalcon\Di\DiInterface;

class RegisterDIServices
{
    /**
     * Initialize services on dependency injector
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public static function init(DiInterface $di): void
    {
        $pbxRestAPIProviders = [
            // Inject Registry provider
            RegistryProvider::class,

            // Inject Database connections
            ModelsAnnotationsProvider::class,
            ModelsMetadataProvider::class,
            MainDatabaseProvider::class,
            CDRDatabaseProvider::class,

            // Inject caches
            ManagedCacheProvider::class,
            ModelsCacheProvider::class,

            // Inject Queue connection
            BeanstalkConnectionWorkerApiProvider::class,

            // Inject PBX modules
            PBXConfModulesProvider::class,

            // Inject REST API providers
            DispatcherProvider::class,
            ResponseProvider::class,
            RequestProvider::class,
            RouterProvider::class,
            SessionReadOnlyProvider::class,

            // Inject Logger
            LoggerAuthProvider::class,
            LoggerProvider::class,

            // Translates
            MessagesProvider::class,
            LanguageProvider::class,

            ModulesDBConnectionsProvider::class,
        ];

        foreach ($pbxRestAPIProviders as $provider) {
            // Delete previous provider
            $di->remove($provider::SERVICE_NAME);
            $di->register(new $provider());
        }
    }
}