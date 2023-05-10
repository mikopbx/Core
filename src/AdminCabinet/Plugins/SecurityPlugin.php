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

use MikoPBX\AdminCabinet\Controllers\SessionController;
use MikoPBX\Common\Models\AuthTokens;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\Config\WebUIConfigInterface;
use Phalcon\Acl\Adapter\Memory as AclList;
use Phalcon\Acl\Component;
use Phalcon\Acl\Enum as AclEnum;
use Phalcon\Acl\Role as AclRole;
use Phalcon\Di\Injectable;
use Phalcon\Events\Event;
use Phalcon\Mvc\Dispatcher;
use Phalcon\Text;

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
        $isLoggedIn = $this->checkUserAuth();

        // Get the controller and action names
        $controller = $dispatcher->getControllerName();
        $action = $dispatcher->getActionName();

        // Redirect to login page if user is not authenticated and the controller is not "session"
        if (!$isLoggedIn && strtoupper($controller) !== 'SESSION') {
            // Return a 403 response for AJAX requests
            if ($this->request->isAjax()) {
                $this->response->setStatusCode(403, 'Forbidden')->setContent('This user is not authorized')->send();
            } else {
                // Redirect to login page for normal requests
                $dispatcher->forward([
                    'controller' => 'session',
                    'action' => 'index',
                    'module' => 'admin-cabinet',
                    'namespace'=> 'MikoPBX\AdminCabinet\Controllers'
                ]);
            }

            return false;
        }


        // Check if the authenticated user is allowed to access the requested controller and action
        if ($isLoggedIn) {
            // Check if the desired controller exists or show the extensions page
            if (!$this->controllerExists($dispatcher)) {
                // Redirect to home page if controller does not set
                $homePath = $this->session->get(SessionController::SESSION_ID)['homePage'] ?? 'extensions/index';
                $controller = explode('/', $homePath)[0];
                $action = explode('/', $homePath)[1];
                $dispatcher->forward([
                        'controller' => $controller,
                        'action' => $action
                ]);
                return true;
            }

            if (!$this->isAllowedAction($controller, $action)) {
                // Show a 401 error if not allowed
                $dispatcher->forward([
                    'controller' => 'errors',
                    'action' => 'show401'
                ]);
                return true;
            }
        }

        return true;
    }

    /**
     *
     * Checks if the controller class exists.
     *
     * This method checks if the controller class exists by concatenating the controller name, namespace name, and handler
     * suffix obtained from the $dispatcher object. The method returns true if the class exists, false otherwise.
     *
     * @param Dispatcher $dispatcher The dispatcher object.
     * @return bool true if the controller class exists, false otherwise.
     */
    private
    function controllerExists(Dispatcher $dispatcher): bool
    {
        $controllerName = $dispatcher->getControllerName();
        $namespaceName = $dispatcher->getNamespaceName();
        $handlerSuffix = $dispatcher->getHandlerSuffix();

        return class_exists($namespaceName . '\\' . Text::camelize($controllerName) . $handlerSuffix);
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
        if ($_SERVER['REMOTE_ADDR'] === '127.0.0.1' || $this->session->has(SessionController::SESSION_ID)) {
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
     * Gets the Access Control List (ACL).
     *
     * This method creates a new AclList object and sets the default action to AclEnum::DENY. It then adds two roles,
     * admins and guest, to the ACL, and sets the default permissions such that admins are allowed to perform any
     * action and guest is denied access to any action.
     *
     * Finally, it uses the PBXConfModulesProvider class to allow modules to modify the ACL, and returns the modified ACL.
     *
     * @return AclList The Access Control List.
     */
    public
    function getAcl(): AclList
    {
        $acl = new AclList();
        $acl->setDefaultAction(AclEnum::DENY);

        // Register roles
        $acl->addRole(new AclRole('admins', 'Admins'));
        $acl->addRole(new AclRole('guest', 'Guests'));

        // Default permissions
        $acl->allow('admins', '*', '*');
        $acl->deny('guest', '*', '*');

        // Modules HOOK
        PBXConfModulesProvider::hookModulesProcedure(WebUIConfigInterface::ON_AFTER_ACL_LIST_PREPARED, [&$acl]);

        // Allow to show ERROR controllers to everybody
        $acl->addComponent(new Component('Errors'), ['show401', 'show404', 'show500']);
        $acl->allow('*', 'Errors', ['show401', 'show404', 'show500']);

        // Allow to show session controllers actions to everybody
        $acl->addComponent(new Component('Session'), ['index', 'start', 'changeLanguage', 'end']);
        $acl->allow('*', 'Session', ['index', 'start', 'changeLanguage', 'end']);

        return $acl;
    }

    /**
     * Checks if an action is allowed for the current user.
     *
     * This method checks if the specified $action is allowed for the current user based on their role. It gets the user's
     * role from the session or sets it to 'guest' if no role is set. It then gets the Access Control List (ACL) and checks
     * if the $action is allowed for the current user's role. If the user is a guest or if the $action is not allowed,
     * the method returns false. Otherwise, it returns true.
     *
     * @param string $controller The name of the controller.
     * @param string $action The name of the action to check.
     * @return bool true if the action is allowed for the current user, false otherwise.
     */
    public
    function isAllowedAction(string $controller, string $action): bool
    {
        $role = $this->session->get(SessionController::SESSION_ID)['role'] ?? 'guest';

        if (strpos($controller, '_') > 0) {
            $controller = str_replace('_', '-', $controller);
        }
        $controller = Text::camelize($controller);

        $acl = $this->getAcl();

        $allowed = $acl->isAllowed($role, $controller, $action);

        if ($allowed != AclEnum::ALLOW) {
            return false;
        } else {
            return true;
        }
    }

}