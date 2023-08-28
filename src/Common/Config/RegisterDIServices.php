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

namespace MikoPBX\Common\Config;

use MikoPBX\Common\Providers\{LoggerProvider,
    MainDatabaseProvider,
    ManagedCacheProvider,
    ModelsAnnotationsProvider,
    ModelsCacheProvider,
    ModelsMetadataProvider,
    PBXConfModulesProvider,
    RouterProvider,
    SentryErrorHandlerProvider,
    WhoopsErrorHandlerProvider};
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
        $commonProviders = [

            // Inject errors handlers
            SentryErrorHandlerProvider::class,
            WhoopsErrorHandlerProvider::class,

            // Inject Logger provider
            LoggerProvider::class,

            // Inject Database connections
            ModelsAnnotationsProvider::class,
            ModelsMetadataProvider::class,
            MainDatabaseProvider::class,

            // Inject caches
            ManagedCacheProvider::class,
            ModelsCacheProvider::class,

            // Inject PBX modules
            PBXConfModulesProvider::class,

            // Inject routers
            RouterProvider::class,
        ];

        foreach ($commonProviders as $provider) {
            // Delete previous provider
            $di->remove($provider::SERVICE_NAME);
            $di->register(new $provider());
        }
    }
}