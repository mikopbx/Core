<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

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
    System\GetController as SystemGetController,
    System\PostController as SystemPostController,
    Upload\PostController as UploadPostController};
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
    /**
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        /** @var Micro $application */
        $application = $di->getShared('application');
        /** @var Manager $eventsManager */
        $eventsManager = $di->getShared('eventsManager');

        $this->attachRoutes($application, $di);
        $this->attachMiddleware($application, $eventsManager);

        $application->setEventsManager($eventsManager);
    }

    /**
     * Attaches the routes to the application; lazy loaded
     *
     * @param Micro                   $application
     * @param \Phalcon\Di\DiInterface $di
     */
    private function attachRoutes(Micro $application, DiInterface $di): void
    {
        // Add hard coded routes
        $routes = $this->getRoutes();

        // Add additional modules routes
        $additionalRoutes  = [];
        $additionalModules = $di->getShared('pbxConfModules');
        foreach ($additionalModules as $appClass) {
            /** @var \MikoPBX\Modules\Config\ConfigClass; $appClass */
            $additionalRoutes[] = $appClass->getPBXCoreRESTAdditionalRoutes();
        }

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

            [UploadPostController::class, 'callAction', '/pbxcore/api/upload/{actionName}', 'post', '/'],

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