<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\AdminCabinet\Utilities\Debug\PhpError;
use MikoPBX\Common\Providers\MainDatabaseProvider;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\ModelsAnnotationsProvider;
use MikoPBX\Common\Providers\ModelsCacheProvider;
use MikoPBX\Common\Providers\ModelsMetadataProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Common\Providers\RouterProvider;
use MikoPBX\Core\System\SentryErrorLogger;
use MikoPBX\Modules\PbxExtensionUtils;
use Phalcon\Mvc\Application as BaseApplication;
use Whoops\Handler\JsonResponseHandler;
use Whoops\Handler\PrettyPageHandler;
use Whoops\Run;

class Application extends BaseApplication
{
    /**
     * Register the services here to make them general or register in the ModuleDefinition to make them module-specific
     */
    protected function registerServices()
    {

        $di = new Phalcon\Di\FactoryDefault();

        /**
         * Auto-loader configuration
         */
        require_once __DIR__ . '/../../src/Common/Config/ClassLoader.php';

        // Register default services
        $providersList = [
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
        foreach ($providersList as $provider) {
            $di->register(new $provider());
        }

        $this->setDI($di);
    }

    public function main()
    {
        $this->registerServices();

        // Attach Sentry error logger
        $errorLogger = new SentryErrorLogger('admin-cabinet');
        $errorLogger->init();

        // Enable Whoops error pretty print
        $is_ajax = 'xmlhttprequest' === strtolower($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '');
        if ($is_ajax) {
            $whoopsClass = JsonResponseHandler::class;
        } else {
            $whoopsClass = PrettyPageHandler::class;
        }

        if (class_exists($whoopsClass)) {
            $whoops = new Run();
            $whoops->pushHandler(new $whoopsClass());
            $whoops->register();
        }

        // Register the default modules
        $this->registerModules([
            'admin-cabinet' => [
                "className" => "MikoPBX\AdminCabinet\Module",
                "path"      => __DIR__ . '/../../src/AdminCabinet/Module.php',
            ],
        ]);
        $this->setDefaultModule('admin-cabinet');

        // Register additional app modules from external enabled modules
        PbxExtensionUtils::registerEnabledModulesInApp($this);

        try {
            echo $this->handle($_SERVER['REQUEST_URI'])->getContent();
        } catch (Throwable $e) {
            $errorLogger->captureException($e);
            PhpError::exceptionHandler($e);

            if (isset($whoops)) {
                $whoops->handleException($e);
            } else {
                echo $e->getMessage();
            }
        }
    }
}

$application = new Application();
$application->main();