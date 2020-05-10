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

use MikoPBX\PBXCoreREST\Controllers\{
    Pbx\GetController as PbxGetController,
    Iax\GetController as IaxGetController,
    Sip\GetController as SipGetController,
    Sip\PostController as SipPostController,
    Cdr\GetController as CdrGetController,
    Storage\GetController as StorageGetController,
    Storage\PostController as StoragePostController,
    System\GetController as SystemGetController,
    System\PostController as SystemPostController,
    Upload\GetController as UploadGetController,
    Modules\PostController as ModulesPostController,
    Modules\GetController as ModulesGetController,
};




use MikoPBX\PBXCoreREST\Middleware\AuthenticationMiddleware;
use MikoPBX\PBXCoreREST\Middleware\NotFoundMiddleware;
use MikoPBX\PBXCoreREST\Middleware\ResponseMiddleware;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Mvc\Micro;
use Phalcon\Events\Manager;
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
        $application   = $di->getShared('application');
        /** @var Manager $eventsManager */
        $eventsManager = $di->getShared('eventsManager');

        $this->attachRoutes($application);
        $this->attachMiddleware($application, $eventsManager);

        $application->setEventsManager($eventsManager);
    }

    /**
     * Attaches the middleware to the application
     *
     * @param Micro   $application
     * @param Manager $eventsManager
     */
    private function attachMiddleware(Micro $application, Manager $eventsManager)
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
     * Attaches the routes to the application; lazy loaded
     *
     * @param Micro $application
     */
    private function attachRoutes(Micro $application)
    {
        $routes = $this->getRoutes();
        // Class, Method, Route, Handler, ParamsRegex
        foreach ($routes as $route) {
            $collection = new Collection();
            $collection
                ->setHandler($route[0], true)
                ->setPrefix($route[2])
                ->{$route[3]}($route[4], $route[1]);

            $application->mount($collection);
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
            NotFoundMiddleware::class          => 'before',
            AuthenticationMiddleware::class    => 'before',
            ResponseMiddleware::class          => 'after',
        ];
    }

    /**
     * Returns the array for the routes
     *
     * @return array
     */
    private function getRoutes(): array
    {
        $routes =  [
            // Class, Method, Route, Handler, ParamsRegex
            [PbxGetController::class, 'callAction', '/pbxcore/api/pbx/{actionName}', 'get', '/'],

            [SipGetController::class, 'callAction', '/pbxcore/api/sip/{actionName}', 'get', '/'],
            [SipPostController::class, 'callAction', '/pbxcore/api/sip/{actionName}', 'post', '/'],

            [IaxGetController::class, 'callAction', '/pbxcore/api/iax/{actionName}', 'get', '/'],

            [CdrGetController::class, 'callAction', '/pbxcore/api/cdr/{actionName}', 'get', '/'],
            [CdrGetController::class, 'recordsAction', '/pbxcore/api/cdr/records', 'get', '/'],
            [CdrGetController::class, 'playbackAction', '/pbxcore/api/cdr/playback', 'get', '/'],
            [CdrGetController::class, 'getDataAction', '/pbxcore/api/cdr/getData', 'get', '/'],



            [StorageGetController::class, 'callAction', '/pbxcore/api/storage/{actionName}', 'get', '/'],
            [StoragePostController::class, 'callAction', '/pbxcore/api/storage/{actionName}', 'post', '/'],

            [SystemGetController::class, 'callAction', '/pbxcore/api/system/{actionName}', 'get', '/'],
            [SystemPostController::class, 'callAction', '/pbxcore/api/system/{actionName}', 'post', '/'],

            [UploadGetController::class, 'callAction', '/pbxcore/api/upload/{actionName}', 'get', '/'],

            [ModulesGetController::class, 'callAction', '/pbxcore/api/modules/{actionName}/', 'get', '/'],
            [ModulesPostController::class,'callAction',  '/pbxcore/api/modules/{actionName}/', 'post', '/'],

            [ModulesGetController::class, 'callActionForModule', '/pbxcore/api/modules/{moduleName}/{actionName}/', 'get', '/'],
            [ModulesPostController::class,'callActionForModule',  '/pbxcore/api/modules/{moduleName}/{actionName}/', 'post', '/'],
        ];

        $additionalRoutes = [];
        $additionalModules = $this->getShared('pbxConfModules');
        foreach ($additionalModules as $appClass) {
            /** @var \MikoPBX\Core\Modules\Config\ConfigClass; $appClass */
            $additionalRoutes[] = $appClass->getPBXCoreRESTAdditionalRoutes();
        }

        $routes = array_merge($routes,...$additionalRoutes);
        return $routes;
    }

}