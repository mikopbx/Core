<?php

declare(strict_types=1);
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 4 2020
 *
 */

namespace MikoPBX\AdminCabinet\Providers;


use MikoPBX\AdminCabinet\{Plugins\NormalizeControllerNamePlugin, Plugins\NotFoundPlugin, Plugins\SecurityPlugin};
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Events\Manager as EventsManager;
use Phalcon\Mvc\Dispatcher;
use Whoops\Handler\PrettyPageHandler;

/**
 *  We register the events manager
 */
class DispatcherProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'dispatcher';

    /**
     * Register dispatcher service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () {
                $eventsManager = new EventsManager();

                /**
                 * Camelize Controller name
                 */
                $eventsManager->attach('dispatch:beforeDispatch', new NormalizeControllerNamePlugin());
                $eventsManager->attach('dispatch:afterDispatchLoop', new NormalizeControllerNamePlugin());

                /**
                 * Check if the user is allowed to access certain action using the SecurityPlugin
                 */
                $eventsManager->attach('dispatch:beforeDispatch', new SecurityPlugin());

                /**
                 * Handle exceptions and not-found exceptions using NotFoundPlugin
                 */
                if (! class_exists(PrettyPageHandler::class)) {
                    $eventsManager->attach(
                        'dispatch:beforeException',
                        new NotFoundPlugin()
                    );
                }
                $dispatcher = new Dispatcher();
                $dispatcher->setEventsManager($eventsManager);

                return $dispatcher;
            }
        );
    }
}
