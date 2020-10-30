<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

namespace MikoPBX\AdminCabinet\Plugins;

use Phalcon\Di\Injectable;
use Phalcon\Events\Event;
use Phalcon\Mvc\Dispatcher;

/**
 * SecurityPlugin
 *
 * This is the security plugin which controls that users only have access to the modules they're assigned to
 */
class SecurityPlugin extends Injectable
{

    /**
     * This action is executed before execute any action in the application
     *
     * @param Event      $event
     * @param Dispatcher $dispatcher
     *
     * @return bool
     */
    public function beforeDispatch(/** @scrutinizer ignore-unused */ Event $event, Dispatcher $dispatcher):bool
    {
        if ($_SERVER['REMOTE_ADDR'] === '127.0.0.1') {
            return true;
        }
        $controller = strtoupper($dispatcher->getControllerName());
        if ($this->request->isAjax()) {
            if ($controller !== 'SESSION') {
                $sessionRo = $this->di->getShared('sessionRO');
                if ( ! is_array($sessionRo)
                    || ! array_key_exists('auth', $sessionRo)
                ) {
                    $this->response->setStatusCode(403, 'Forbidden')
                        ->sendHeaders();
                    $this->response->setContent('The user isn\'t authenticated');
                    $this->response->send();

                    return false;
                }
            }
        } else { // не AJAX запрос
            $auth = $this->session->get('auth');
            if ( ! $auth && $controller !== 'SESSION') {
                $dispatcher->forward(
                    [
                        'controller' => 'session',
                        'action'     => 'index',
                    ]
                );
            } elseif ($controller == 'INDEX') {
                // TODO: когда будет главная страница сделаем переадресацию на нее
                $dispatcher->forward(
                    [
                        'controller' => 'extensions',
                        'action'     => 'index',
                    ]
                );
            }
        }
        return true;
    }

}
