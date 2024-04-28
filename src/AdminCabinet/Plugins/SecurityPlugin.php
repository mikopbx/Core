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
 * Handles access control and authentication for the application.
 * Ensures that users access only the areas they are permitted to.
 */
class SecurityPlugin extends Injectable
{

    /**
     * Executes before every request is dispatched.
     * Verifies user authentication and authorization for the requested resource.
     * Unauthenticated users are redirected to the login page or shown a 403 error for AJAX requests.
     * Unauthorized access attempts lead to a 401 error page.
     *
     * @param Event $event The current event instance.
     * @param Dispatcher $dispatcher The dispatcher instance.
     *
     * @return bool Returns `true` to continue with the dispatch process, `false` to halt.
     */
    public function beforeDispatch(/** @scrutinizer ignore-unused */ Event $event, Dispatcher $dispatcher): bool
    {
        // Determine if the user is authenticated
        $isAuthenticated = $this->checkUserAuth() || $this->isLocalHostRequest();

        // Identify the requested action and controller
        $action = $dispatcher->getActionName();

        /** @scrutinizer ignore-call */
        $controllerClass = $this->dispatcher->getHandlerClass();

        // Define controllers accessible without authentication
        $publicControllers = [
            SessionController::class,
            LanguageController::class,
            ErrorsController::class
        ];

        // Handle unauthenticated access to non-public controllers
        if (!$isAuthenticated && !in_array($controllerClass, $publicControllers)) {
            // AJAX requests receive a 403 response
            if ($this->request->isAjax()) {
                $this->response->setStatusCode(403, 'Forbidden')->setContent('This user is not authorized')->send();
            } else {
                // Standard requests are redirected to the login page
                $this->forwardToLoginPage($dispatcher);
            }

            return false;
        }

        // Authenticated users: validate access to the requested resource
        if ($isAuthenticated) {
            // Redirect to home if the controller is missing or irrelevant
            if (!class_exists($controllerClass)
                || ($controllerClass === SessionController::class && strtoupper($action) !== 'END')) {
                $this->redirectToHome($dispatcher);
                return true;
            }

            // Restrict access to unauthorized resources
            if (!$this->isLocalHostRequest()
                && !$this->isAllowedAction($controllerClass, $action)
                && !in_array($controllerClass, $publicControllers)
            ) {
                $this->forwardTo401Error($dispatcher);
                return true;
            }
        }

        return true;
    }

    /**
     * Redirects to the user's home page or a default page if the home page is not set.
     *
     * This method determines the user's home page based on the session data. If the home page path is not set in the session,
     * it defaults to '/admin-cabinet/extensions/index'. The method then parses the home page path to extract the module,
     * controller, and action, and uses the dispatcher to forward the request to the appropriate route.
     *
     * @param Dispatcher $dispatcher The dispatcher object used to forward the request.
     */
    private function redirectToHome($dispatcher): void{
        // Retrieve the home page path from the session, defaulting to a predefined path if not set
        $homePath = $this->session->get(SessionController::SESSION_ID)[SessionController::HOME_PAGE];
        if (empty($homePath)){
            $homePath='/admin-cabinet/extensions/index';
        }
        // Extract the module, controller, and action from the home page path
        $module = explode('/', $homePath)[1];
        $controller = explode('/', $homePath)[2];
        $action = explode('/', $homePath)[3];

        // Forward the request to the determined route
        $dispatcher->forward([
            'module' => $module,
            'controller' => $controller,
            'action' => $action
        ]);
    }

    /**
     * Redirects the user to a 401 error page.
     * @param $dispatcher Dispatcher instance for handling the redirection.
     */
    private function forwardTo401Error($dispatcher): void{
        $dispatcher->forward([
            'module' => 'admin-cabinet',
            'controller' => 'errors',
            'action' => 'show401',
            'namespace' => 'MikoPBX\AdminCabinet\Controllers'
        ]);
    }

    /**
     * Redirects the user to the login page.
     * @param $dispatcher Dispatcher instance for handling the redirection.
     */
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