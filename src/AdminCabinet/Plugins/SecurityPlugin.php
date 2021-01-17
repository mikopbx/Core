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

use MikoPBX\Common\Models\AuthTokens;
use Phalcon\Di\Injectable;
use Phalcon\Events\Event;
use Phalcon\Mvc\Dispatcher;
use phpDocumentor\Reflection\Element;

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
    public function beforeDispatch(/** @scrutinizer ignore-unused */ Event $event, Dispatcher $dispatcher): bool
    {
        $isLoggedIn = $this->checkUserAuth();
        // AJAX REQUESTS
        if ($this->request->isAjax()) {
            if ( ! $isLoggedIn) {
                $this->response->setStatusCode(403, 'Forbidden')->sendHeaders();
                $this->response->setContent('This user not authorised');
                $this->response->send();

                return false;
            }

            return true;
        }

        // Usual requests
        $controller = strtoupper($dispatcher->getControllerName());
        if ( ! $isLoggedIn && $controller !== 'SESSION') {
            $dispatcher->forward(
                [
                    'controller' => 'session',
                    'action'     => 'index',
                ]
            );
        } elseif (($isLoggedIn
            && ($controller === 'INDEX' || $controller === 'SESSION'))) {
            $dispatcher->forward(
                [
                    'controller' => 'extensions',
                    'action'     => 'index',
                ]
            );
        }

        return true;
    }

    /**
     * Checks if user already logged in or not
     *
     * @return bool
     */
    private function checkUserAuth(): bool
    {
        // Check if it localhost request
        if ($_SERVER['REMOTE_ADDR'] === '127.0.0.1') {
            return true;
        } // Check if user already registered
        elseif ($this->session->has('auth')) {
            return true;
        } // Check if remember me cookie exists
        elseif ($this->cookies->has('random_token')) {
            $token       = $this->cookies->get('random_token')->getValue();
            $currentDate = date("Y-m-d H:i:s", time());
            $userTokens  = AuthTokens::find();
            foreach ($userTokens as $userToken) {
                if ($userToken->expiryDate < $currentDate) {
                    $userToken->delete();
                } elseif ($this->security->checkHash($token, $userToken->tokenHash)) {
                    $sessionParams = json_decode($userToken->sessionParams);
                    $this->session->set('auth', $sessionParams);

                    return true;
                }
            }
        }

        return false;
    }

}
