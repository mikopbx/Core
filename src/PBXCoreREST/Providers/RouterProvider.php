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


namespace MikoPBX\PBXCoreREST\Providers;

use MikoPBX\PBXCoreREST\Controllers\{Cdr\GetController as CdrGetController,
    Iax\GetController as IaxGetController,
    Modules\ModulesControllerBase,
    Sip\GetController as SipGetController,
    Sip\PostController as SipPostController,
    Storage\GetController as StorageGetController,
    Storage\PostController as StoragePostController,
    Syslog\GetController as SyslogGetController,
    Syslog\PostController as SyslogPostController,
    Sysinfo\GetController as SysinfoGetController,
    Sysinfo\PostController as SysinfoPostController,
    System\GetController as SystemGetController,
    System\PostController as SystemPostController,
    Files\GetController as FilesGetController,
    Files\PostController as FilesPostController,
    Advices\GetController as AdvicesGetController,
    License\GetController as LicenseGetController,
    License\PostController as LicensePostController
};
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\Config\RestAPIConfigInterface;
use MikoPBX\PBXCoreREST\Middleware\AuthenticationMiddleware;
use MikoPBX\PBXCoreREST\Middleware\NotFoundMiddleware;
use MikoPBX\PBXCoreREST\Middleware\ResponseMiddleware;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Events\Manager;
use Phalcon\Mvc\Micro;
use Phalcon\Mvc\Micro\Collection;


/**
 * Register Router service
 */
class RouterProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = '';

    /**
     * Register response service provider
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        /** @var Micro $application */
        $application = $di->getShared('application');
        /** @var Manager $eventsManager */
        $eventsManager = $di->getShared('eventsManager');

        $this->attachRoutes($application);
        $this->attachMiddleware($application, $eventsManager);

        $application->setEventsManager($eventsManager);
    }

    /**
     * Attaches the routes to the application; lazy loaded
     *
     * @param Micro                   $application
     */
    private function attachRoutes(Micro $application): void
    {
        // Add hard coded routes
        $routes = $this->getRoutes();

        // Add additional modules routes
        $additionalRoutes = PBXConfModulesProvider::hookModulesMethod(RestAPIConfigInterface::GET_PBXCORE_REST_ADDITIONAL_ROUTES);
        $additionalRoutes = array_values($additionalRoutes);
        $routes = array_merge($routes, ...$additionalRoutes);

        // Class, Method, Route, Handler, ParamsRegex
        foreach ($routes as $route) {
            $collection = new Collection();
            $collection
                ->setHandler($route[0], true)
                ->setPrefix($route[2])
                ->{$route[3]}(
                    $route[4],
                    $route[1]
                );

            $application->mount($collection);
        }
    }

    /**
     * Returns the array for the routes
     *
     * @return array
     */
    private function getRoutes(): array
    {
        return [
            // Class, Method, Route, Handler, ParamsRegex

            [SipGetController::class, 'callAction', '/pbxcore/api/sip/{actionName}', 'get', '/'],
            [SipPostController::class, 'callAction', '/pbxcore/api/sip/{actionName}', 'post', '/'],

            [IaxGetController::class, 'callAction', '/pbxcore/api/iax/{actionName}', 'get', '/'],

            [CdrGetController::class, 'callAction', '/pbxcore/api/cdr/{actionName}', 'get', '/'],
            [CdrGetController::class, 'playbackAction', '/pbxcore/api/cdr/playback', 'get', '/'],

            [StorageGetController::class, 'callAction', '/pbxcore/api/storage/{actionName}', 'get', '/'],
            [StoragePostController::class, 'callAction', '/pbxcore/api/storage/{actionName}', 'post', '/'],

            [SystemGetController::class, 'callAction', '/pbxcore/api/system/{actionName}', 'get', '/'],
            [SystemPostController::class, 'callAction', '/pbxcore/api/system/{actionName}', 'post', '/'],

            [SyslogGetController::class, 'callAction', '/pbxcore/api/syslog/{actionName}', 'get', '/'],
            [SyslogPostController::class, 'callAction', '/pbxcore/api/syslog/{actionName}', 'post', '/'],

            [SysinfoGetController::class, 'callAction', '/pbxcore/api/sysinfo/{actionName}', 'get', '/'],
            [SysinfoPostController::class, 'callAction', '/pbxcore/api/sysinfo/{actionName}', 'post', '/'],

            [FilesGetController::class, 'callAction', '/pbxcore/api/files/{actionName}', 'get', '/'],
            [FilesPostController::class, 'callAction', '/pbxcore/api/files/{actionName}', 'post', '/'],

            [AdvicesGetController::class, 'callAction', '/pbxcore/api/advices/{actionName}', 'get', '/'],

            [LicenseGetController::class, 'callAction', '/pbxcore/api/license/{actionName}', 'get', '/'],
            [LicensePostController::class, 'callAction', '/pbxcore/api/license/{actionName}', 'post', '/'],

            [
                ModulesControllerBase::class,
                'callActionForModule',
                '/pbxcore/api/modules/{moduleName}/{actionName}',
                'get',
                '/',
            ],
            [
                ModulesControllerBase::class,
                'callActionForModule',
                '/pbxcore/api/modules/{moduleName}/{actionName}',
                'post',
                '/',
            ],
        ];
    }

    /**
     * Attaches the middleware to the application
     *
     * @param Micro   $application
     * @param Manager $eventsManager
     */
    private function attachMiddleware(Micro $application, Manager $eventsManager): void
    {
        $middleware = $this->getMiddleware();

        /**
         * Get the events manager and attach the middleware to it
         */
        foreach ($middleware as $class => $function) {
            $eventsManager->attach('micro', new $class());
            $application->{$function}(new $class());
        }
    }

    /**
     * Returns the array for the middleware with the action to attach
     *
     * @return array
     */
    private function getMiddleware(): array
    {
        return [
            NotFoundMiddleware::class       => 'before',
            AuthenticationMiddleware::class => 'before',
            ResponseMiddleware::class       => 'after',
        ];
    }

}