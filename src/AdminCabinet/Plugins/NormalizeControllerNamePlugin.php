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

namespace MikoPBX\AdminCabinet\Plugins;

use Phalcon\Di\Injectable;
use Phalcon\Events\Event;
use Phalcon\Mvc\Dispatcher;
use Phalcon\Text;

/**
 * NormalizeControllerNamePlugin
 *
 * Нормализует название класса контроллера и модуля controller/actions
 */
class NormalizeControllerNamePlugin extends Injectable
{

    /**
     * This action is executed before execute any action in the application
     *
     * @param Event      $event
     * @param Dispatcher $dispatcher
     */
    public function beforeDispatch(/** @scrutinizer ignore-unused */ Event $event, Dispatcher $dispatcher): void
    {
        $controller = $dispatcher->getControllerName();
        if (strpos($controller, '-') > 0) {
            $controller = str_replace('-', '_', $controller);
        }
        $dispatcher->setControllerName(ucfirst($controller));


        // Check if it is an old style module link without namespace in URL
        //
        // @examples
        // /admin-cabinet/module-users-groups/index
        // /admin-cabinet/module-users-groups/modify/1
        if(str_starts_with($dispatcher->getNamespaceName(), 'Modules')){
            $controllerClass =  $dispatcher->getHandlerClass();
            $actionMethod = $dispatcher->getActiveMethod();
            if (!method_exists($controllerClass, $actionMethod)){
                $actionSuffix = $dispatcher->getActionSuffix();
                $controllerSuffix = $dispatcher->getHandlerSuffix();
                $checkNamespace = $dispatcher->getNamespaceName();
                // Url is broken, try to add namespace into it
                // @examples
                // /admin-cabinet/module-users-groups/module-users-groups/index
                // /admin-cabinet/module-users-groups/module-users-groups/modify/1
                $checkController = ucfirst(Text::camelize($dispatcher->getParam('moduleUniqueId'),'-'));
                $checkAction = $dispatcher->getControllerName();
                $controllerClass = "{$checkNamespace}\\{$checkController}{$controllerSuffix}";
                $actionMethod = "{$checkAction}{$actionSuffix}";
                if (method_exists($controllerClass, $actionMethod)){
                    $params = $dispatcher->getActionName();

                    $checkController = Text::uncamelize($checkController,'_');
                    $dispatcher->forward([
                        'controller' => $checkController,
                        'action' => $checkAction,
                        'namespace'=> $checkNamespace,
                        'params'=> [$params]
                    ]);
                }
            } else {
                $moduleParams = $dispatcher->getParams();
                unset($moduleParams['moduleUniqueId']);
                $dispatcher->setParams($moduleParams);
            }
        }

    }

    /**
     * This action is executed after execute any action in the application
     *
     * @param Event      $event
     * @param Dispatcher $dispatcher
     */
    public function afterDispatchLoop(/** @scrutinizer ignore-unused */ Event $event, Dispatcher $dispatcher): void
    {
        $controller = $dispatcher->getControllerName();

        if (strpos($controller, '_') > 0) {
            $dispatcher->setControllerName(Text::camelize($controller));
        } else {
            $dispatcher->setControllerName(ucfirst($controller));
        }
    }
}
