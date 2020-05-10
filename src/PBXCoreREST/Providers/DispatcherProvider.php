<?php

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\PBXCoreREST\Providers;


use MikoPBX\PBXCoreREST\Plugins\SecurityPlugin;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Events\Event;
use Phalcon\Events\Manager as EventsManager;
use Phalcon\Mvc\Dispatcher;
use Phalcon\Mvc\Micro;

/**
 *  We register the events manager
 */
class DispatcherProvider implements ServiceProviderInterface
{
    /**
     * Register dispatcher service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            'dispatcher',
            function () {
                // Create a events manager
                $eventsManager = new EventsManager();
                $eventsManager->attach(
                    'micro:beforeExecuteRoute',
                    function (Event $event, Micro $app) {
                        SecurityPlugin::beforeExecuteRoute($event, $app);
                    }
                );
                $dispatcher = new Dispatcher();
                $dispatcher->setEventsManager($eventsManager);

                return $dispatcher;
            }
        );
    }
}
