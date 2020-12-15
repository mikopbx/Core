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