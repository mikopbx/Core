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

namespace MikoPBX\Common\Providers;


use MikoPBX\Modules\Config\WebUIConfigInterface;
use MikoPBX\Modules\PbxExtensionUtils;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Mvc\Router;

/**
 * Registers the Router service.
 *
 * @package MikoPBX\Common\Providers
 */
class RouterProvider implements ServiceProviderInterface
{
    public const SERVICE_NAME = 'router';

    /**
     * Register the router service provider.
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $di->set(
            self::SERVICE_NAME,
            function () {
                $router = new Router();

                $router->setDefaultModule("admin-cabinet");
                $router->setDefaultNamespace('MikoPBX\AdminCabinet\Controllers');
                $router->setDefaultController('session');
                $router->setDefaultAction('index');

                $router->add('/admin-cabinet/((?!module)[a-zA-Z0-9_-]+)/:action/:params', [
                        'module'     => 'admin-cabinet',
                        'controller' => 1,
                        'action'     => 2,
                        'params'     => 3
                ]);

                /** Add route for external modules which integrate their views into admin web UI
                 * Old style, without namespace
                 *
                 * @examples
                 * /admin-cabinet/module-users-groups/index
                 * /admin-cabinet/module-users-groups/modify/1
                 *
                 */
                $router->add('/admin-cabinet/{moduleUniqueId:module-[\w-]+}/:action/:params', [
                    'module'     => 'admin-cabinet',
                    'namespace'  => 1,
                    'controller' => 1,
                    'action'     => 2,
                    'params'     => 3,
                ])->convert(
                    'namespace',
                    function ($namespace) {
                        $camelizedNameSpace = \Phalcon\Text::Camelize($namespace);
                        return "Modules\\{$camelizedNameSpace}\\App\\Controllers";
                    }
                );

                /** Add route for external modules which integrate their views into admin web UI
                * New style, with namespace
                 *
                * @examples
                * /admin-cabinet/module-users-groups/module-users-groups/modify/1
                * /admin-cabinet/module-users-groups/access-groups/modify/1
                * /admin-cabinet/module-users-groups/access-groups/index
                *
                */
                $router->add('/admin-cabinet/{moduleUniqueId:module-[\w-]+}/:controller/:action/:params', [
                    'module'     => 'admin-cabinet',
                    'namespace'  => 1,
                    'controller' => 2,
                    'action'     => 3,
                    'params'     => 4,
                ])->convert(
                    'namespace',
                    function ($namespace) {
                        $camelizedNameSpace = \Phalcon\Text::Camelize($namespace);
                        return "Modules\\{$camelizedNameSpace}\\App\\Controllers";
                    }
                );

                // Register additional app modules from external enabled modules
                PbxExtensionUtils::registerEnabledModulesInRouter($router);

                // Register additional routes from external enabled modules
                PBXConfModulesProvider::hookModulesMethod(WebUIConfigInterface::ON_AFTER_ROUTES_PREPARED,[&$router]);

                return $router;
            }
        );
    }
}