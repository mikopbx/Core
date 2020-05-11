<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2019
 *
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
    public function beforeDispatch(Event $event, Dispatcher $dispatcher): void
    {
        $controller = $dispatcher->getControllerName();
        if (strpos($controller, '-') > 0) {
            $controller = str_replace('-', '_', $controller);
        }
        $dispatcher->setControllerName(ucfirst($controller));

        if (stripos($controller, 'module') === 0) {
            $dispatcher->setModuleName('PBXExtension');
            $camelizeControllerName = Text::camelize($controller);
            $dispatcher->setNamespaceName("\\Modules\\{$camelizeControllerName}\\App\\Controllers");

        } else {
            $dispatcher->setModuleName('PBXCore');
            $dispatcher->setNamespaceName('MikoPBX\AdminCabinet\Controllers');
        }
    }

    /**
     * This action is executed after execute any action in the application
     *
     * @param Event      $event
     * @param Dispatcher $dispatcher
     */
    public function afterDispatchLoop(Event $event, Dispatcher $dispatcher): void
    {
        $controller = $dispatcher->getControllerName();

        if (strpos($controller, '_') > 0) {
            $dispatcher->setControllerName(Text::camelize($controller));
        } else {
            $dispatcher->setControllerName(ucfirst($controller));
        }
    }
}
