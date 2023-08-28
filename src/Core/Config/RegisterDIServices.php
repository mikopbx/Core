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

namespace MikoPBX\Core\Config;

use MikoPBX\Common\Providers\{AmiConnectionCommand,
    AmiConnectionListener,
    BeanstalkConnectionModelsProvider,
    BeanstalkConnectionWorkerApiProvider,
    CDRDatabaseProvider,
    MarketPlaceProvider,
    LoggerProvider,
    MainDatabaseProvider,
    ModelsCacheProvider,
    ManagedCacheProvider,
    ModelsMetadataProvider,
    ModelsAnnotationsProvider,
    ModulesDBConnectionsProvider,
    NatsConnectionProvider,
    PBXConfModulesProvider,
    PBXCoreRESTClientProvider,
    RegistryProvider,
    SentryErrorHandlerProvider,
    TranslationProvider,
    MessagesProvider,
    UrlProvider,
    LanguageProvider,
    WhoopsErrorHandlerProvider};
use MikoPBX\Core\Providers\AsteriskConfModulesProvider;
use Phalcon\Di;

/**
 * Initialize services on dependency injector
 */
class RegisterDIServices
{
    /**
     * Initialize services on dependency injector
     */
    public static function init(): void
    {
        $di            = Di::getDefault();
        $providersList = [

            // Inject errors handlers
            SentryErrorHandlerProvider::class,
            WhoopsErrorHandlerProvider::class,

            // Inject Logger provider
            LoggerProvider::class,

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

            // Inject Translations
            MessagesProvider::class,
            TranslationProvider::class,
            LanguageProvider::class,

            // Inject Queue connection
            NatsConnectionProvider::class,
            BeanstalkConnectionModelsProvider::class,
            BeanstalkConnectionWorkerApiProvider::class,

            // AMI Connectors
            AmiConnectionCommand::class,
            AmiConnectionListener::class,

            // Inject License Worker
            MarketPlaceProvider::class,

            // Url link builder
            UrlProvider::class,

            // Asterisk conf modules
            AsteriskConfModulesProvider::class,

            // Inject PBX modules
            PBXConfModulesProvider::class,
            ModulesDBConnectionsProvider::class,

            // Inject Rest API client
            PBXCoreRESTClientProvider::class

        ];

        foreach ($providersList as $provider) {
            // Delete previous provider
            $di->remove($provider::SERVICE_NAME);
            $di->register(new $provider());
        }

        $di->getShared(RegistryProvider::SERVICE_NAME)->libraryName = 'core-workers';
        // Enable Whoops error handler and pretty print
        $di->get(SentryErrorHandlerProvider::SERVICE_NAME);
        $di->get(WhoopsErrorHandlerProvider::SERVICE_NAME);
    }

}