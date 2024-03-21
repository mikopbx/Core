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

use MikoPBX\AdminCabinet\Controllers\ErrorsController;
use MikoPBX\AdminCabinet\Controllers\LanguageController;
use MikoPBX\AdminCabinet\Controllers\SessionController;
use MikoPBX\Common\Models\AuthTokens;
use MikoPBX\Common\Providers\AclProvider;
use Phalcon\Acl\Enum as AclEnum;
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
     * Runs before dispatching a request.
     *
     * This method checks if the user is authenticated and authorized to access the requested controller and action. If the
     * user is not authenticated, the method redirects to the login page or returns a 403 response for AJAX requests. If the
     * requested controller does not exist, the method redirects to the extensions page. If the user is not authorized, the
     * method shows a 401 error page.
     *
     * @param Event $event The event object.
     * @param Dispatcher $dispatcher The dispatcher object.
     *
     * @return bool `true` if the request should continue, `false` otherwise.
     */
    public function beforeDispatch(/** @scrutinizer ignore-unused */ Event $event, Dispatcher $dispatcher): bool
    {
        // Check if user is authenticated
        $isAuthenticated = $this->checkUserAuth() || $this->isLocalHostRequest();

        // Get the controller and action names
        $action = $dispatcher->getActionName();

        /** @scrutinizer ignore-call */
        $controllerClass = $this->dispatcher->getHandlerClass();

        // Controllers allowed without authentication
        $publicControllers = [
            SessionController::class,
            LanguageController::class,
            ErrorsController::class
        ];

        // Redirect to login page if user is not authenticated and the controller is not "session"
        if (!$isAuthenticated && !in_array($controllerClass, $publicControllers)) {
            // Return a 403 response for AJAX requests
            if ($this->request->isAjax()) {
                $this->response->setStatusCode(403, 'Forbidden')->setContent('This user is not authorized')->send();
            } else {
                // Redirect to login page for normal requests
                $this->forwardToLoginPage($dispatcher);
            }

            return false;
        }

        // Check if the authenticated user is allowed to access the requested controller and action
        if ($isAuthenticated) {
            // Check if the desired controller exists or show the extensions page
            if (!class_exists($controllerClass)
                || ($controllerClass === SessionController::class && strtoupper($action) !== 'END')) {
                // Redirect to home page if controller does not set or user logged in but still on session page

                $homePath = $this->session->get(SessionController::SESSION_ID)[SessionController::HOME_PAGE];
                if (empty($homePath)){
                    $homePath='/admin-cabinet/extensions/index';
                }
                $module = explode('/', $homePath)[1];
                $controller = explode('/', $homePath)[2];
                $action = explode('/', $homePath)[3];
                $dispatcher->forward([
                    'module' => $module,
                    'controller' => $controller,
                    'action' => $action
                ]);
                return true;
            }

            if (!$this->isLocalHostRequest()
                && !$this->isAllowedAction($controllerClass, $action)
                && !in_array($controllerClass, $publicControllers)
            ) {
                // Show a 401 error if not allowed
                $this->forwardTo401Error($dispatcher);
                return true;
            }
        }

        return true;
    }

    private function forwardTo401Error($dispatcher): void{
        $dispatcher->forward([
            'module' => 'admin-cabinet',
            'controller' => 'errors',
            'action' => 'show401',
            'namespace' => 'MikoPBX\AdminCabinet\Controllers'
        ]);
    }

    private function forwardTo404Error($dispatcher): void{
        $dispatcher->forward([
            'module' => 'admin-cabinet',
            'controller' => 'errors',
            'action' => 'show404',
            'namespace' => 'MikoPBX\AdminCabinet\Controllers'
        ]);
    }

    private function forwardToLoginPage($dispatcher): void{
        $dispatcher->forward([
            'controller' => 'session',
            'action' => 'index',
            'module' => 'admin-cabinet',
            'namespace' => 'MikoPBX\AdminCabinet\Controllers'
        ]);
    }
    /**
     * Checks if the current user is authenticated.
     *
     * This method checks if the current user is authenticated based on whether they have an existing session or a valid
     * "remember me" cookie.
     * If the request is from localhost or the user already has an active session, the method returns
     * true.
     * If a "remember me" cookie exists, the method checks if it matches any active tokens in the AuthTokens table.
     * If a match is found, the user's session is set, and the method returns true. If none of these conditions are met,
     * the method returns false.
     *
     * @return bool true if the user is authenticated, false otherwise.
     */
    private
    function checkUserAuth(): bool
    {
        // Check if it is a localhost request or if the user is already authenticated.
        if ($this->session->has(SessionController::SESSION_ID)) {
            return true;
        }

        // Check if remember me cookie exists.
        if (!$this->cookies->has('random_token')) {
            return false;
        }

        $token = $this->cookies->get('random_token')->getValue();
        $currentDate = date("Y-m-d H:i:s", time());

        // Delete expired tokens and check if the token matches any active tokens.
        $userTokens = AuthTokens::find();
        foreach ($userTokens as $userToken) {
            if ($userToken->expiryDate < $currentDate) {
                $userToken->delete();
            } elseif ($this->security->checkHash($token, $userToken->tokenHash)) {
                $sessionParams = json_decode($userToken->sessionParams, true);
                $this->session->set(SessionController::SESSION_ID, $sessionParams);
                return true;
            }
        }

        return false;
    }

    /**
     * Checks if an action is allowed for the current user.
     *
     * This method checks if the specified $action is allowed for the current user based on their role. It gets the user's
     * role from the session or sets it to 'guests' if no role is set. It then gets the Access Control List (ACL) and checks
     * if the $action is allowed for the current user's role. If the user is a guest or if the $action is not allowed,
     * the method returns false. Otherwise, it returns true.
     *
     * @param string $controller The full name of the controller class.
     * @param string $action The name of the action to check.
     * @return bool true if the action is allowed for the current user, false otherwise.
     */
    public function isAllowedAction(string $controller, string $action): bool
    {
        $role = $this->session->get(SessionController::SESSION_ID)[SessionController::ROLE] ?? AclProvider::ROLE_GUESTS;
        $acl = $this->di->get(AclProvider::SERVICE_NAME);
        $allowed = $acl->isAllowed($role, $controller, $action);
        if ($allowed != AclEnum::ALLOW) {
            return false;
        } else {
            return true;
        }
    }

    /**
     * Check if the request is coming from localhost.
     *
     * @return bool
     */
    public function isLocalHostRequest(): bool
    {
        return ($_SERVER['REMOTE_ADDR'] === '127.0.0.1');
    }

}