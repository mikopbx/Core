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

namespace MikoPBX\AdminCabinet\Providers;


use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Mvc\Router;

/**
 * Register Router service
 */
class RouterProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'router';

    /**
     * Register router service provider
     *
     * @param \Phalcon\Di\DiInterface $di
     */
    public function register(DiInterface $di): void
    {
        $di->set(
            self::SERVICE_NAME,
            function () {
                $router = new Router();

                $router->addGet(
                    '/assets/(css|js)/([\w.-]+)\.(css|js)',
                    [
                        'controller' => 'assets',
                        'action'     => 'serve',
                        'type'       => 1, //(css|js)
                        'collection' => 2, //(controller)
                        'extension'  => 3, //(css|js)
                    ]
                );

                $router->add(
                    '/admin-cabinet/:controller/:action/:params',
                    [
                        'controller' => 1,
                        'action'     => 2,
                        'params'     => 3,
                    ]
                );

                $router->add(
                    '/admin-cabinet/:controller',
                    [
                        'controller' => 1,
                        'action'     => 'index',
                        'params'     => '',
                    ]
                );


                return $router;
            }
        );
    }
}