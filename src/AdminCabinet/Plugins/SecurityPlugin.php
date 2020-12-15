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
