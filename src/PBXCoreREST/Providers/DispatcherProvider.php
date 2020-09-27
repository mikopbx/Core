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
                // Create a events manager
                $eventsManager = new EventsManager();
                $dispatcher = new Dispatcher();
                $dispatcher->setEventsManager($eventsManager);
                return $dispatcher;
            }
        );
    }
}
