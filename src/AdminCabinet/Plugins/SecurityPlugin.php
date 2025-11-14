<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\AdminCabinet\Controllers\SessionController;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Library\Text;
use MikoPBX\Common\Providers\AclProvider;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use Phalcon\Acl\Enum as AclEnum;
use Phalcon\Di\Injectable;
use Phalcon\Events\Event;
use Phalcon\Mvc\Dispatcher;

/**
 * Handles access control and authentication for the application.
 * Ensures that users access only the areas they are permitted to.
 *
 * JWT-based authentication:
 * - AJAX requests: require Bearer token in Authorization header
 * - Browser page requests: can use refreshToken cookie (TokenManager will get access token)
 * - ACL checks: use role from JWT claims (decoded from Bearer token if present)
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
        // Determine if the user is authenticated (Bearer token OR refreshToken cookie)
        $isAuthenticated = $this->checkUserAuth() || $this->isLocalHostRequest();

        // Identify the requested action and controller
        $action = $dispatcher->getActionName();

        /** @scrutinizer ignore-call */
        $controllerClass = $this->dispatcher->getHandlerClass();

        // Define controllers accessible without authentication
        $publicControllers = [
            SessionController::class,
            ErrorsController::class
        ];

        // Handle unauthenticated access to non-public controllers
        if (!$isAuthenticated && !in_array($controllerClass, $publicControllers)) {
            // Clear any stale cookies before redirect to prevent loops
            $this->clearAuthCookies();

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
            // Handle authenticated users on login page (except END action)
            // This can happen when refreshToken cookie exists but is expired in Redis
            if ($controllerClass === SessionController::class && strtoupper($action) !== 'END') {
                // Clear stale cookies to prevent redirect loop
                $this->clearAuthCookies();

                // Allow access to login page (don't redirect to home)
                return true;
            }

            // Redirect to home if the controller is missing
            if (!class_exists($controllerClass)) {
                $this->redirectToHome($dispatcher);
                return true;
            }

            // Restrict access to unauthorized resources
            if (
                !$this->isLocalHostRequest()
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
     * Checks if the current user is authenticated.
     *
     * JWT authentication flow:
     * 1. AJAX requests: check for Bearer token in Authorization header
     * 2. Browser page requests: check for refreshToken cookie
     *    - If cookie exists, user is considered authenticated
     *    - TokenManager JS will call /auth:refresh to get access token
     *
     * @return bool true if the user is authenticated, false otherwise.
     */
    private function checkUserAuth(): bool
    {
        $isAuth = self::isAuthenticated($this->request, $this->cookies);

        // Debug logging
        if (class_exists(\MikoPBX\Core\System\SystemMessages::class)) {
            $hasBearer = $this->request->getHeader('Authorization') ? 'yes' : 'no';
            $hasCookie = $this->cookies->has('refreshToken') ? 'yes' : 'no';
            \MikoPBX\Core\System\SystemMessages::sysLogMsg(
                __METHOD__,
                "Auth check: result={$isAuth}, Bearer={$hasBearer}, Cookie={$hasCookie}, URI={$this->request->getURI()}",
                LOG_DEBUG
            );
        }

        return $isAuth;
    }

    /**
     * Static method to check if user is authenticated.
     * Can be reused across different parts of the application.
     *
     * JWT authentication flow:
     * 1. AJAX requests: check for Bearer token in Authorization header
     * 2. Browser page requests: check for refreshToken cookie
     *    - If cookie exists, user is considered authenticated
     *    - TokenManager JS will call /auth:refresh to get access token
     *
     * @param \Phalcon\Http\RequestInterface $request Request object
     * @param \Phalcon\Http\Response\CookiesInterface $cookies Cookies object
     * @return bool true if the user is authenticated, false otherwise.
     */
    public static function isAuthenticated(
        \Phalcon\Http\RequestInterface $request,
        \Phalcon\Http\Response\CookiesInterface $cookies
    ): bool {
        // Check for JWT Bearer token in Authorization header (AJAX requests)
        $authHeader = $request->getHeader('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            // TODO: можно добавить валидацию JWT токена здесь
            // Но AuthenticationMiddleware уже проверяет его для API запросов
            return true;
        }

        // For browser page requests: check for refreshToken cookie
        // If cookie exists, consider user authenticated - TokenManager will handle token refresh
        if ($cookies->has('refreshToken')) {
            try {
                // Try to read cookie (it's encrypted by CryptProvider)
                $token = $cookies->get('refreshToken')->getValue();

                // Basic validation: token should not be empty
                if (!empty($token)) {
                    // Token exists - user is authenticated
                    // TokenManager JS will call /auth:refresh to get new access token
                    return true;
                }
            } catch (\Throwable $e) {
                // Cookie decryption failed or other error
                // Log but don't block - let user re-login
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
            }
        }

        return false;
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

    /**
     * Clear authentication cookies to prevent login loops.
     * Called when user is not authenticated but has stale cookies.
     */
    private function clearAuthCookies(): void
    {
        // Determine if connection is secure (HTTPS)
        $isSecure = $this->request->isSecure();

        // Clear refresh token cookie
        if ($this->cookies->has('refreshToken')) {
            $this->cookies->set(
                'refreshToken',
                '',
                time() - 3600,  // Expire in the past
                '/',
                $isSecure,      // secure (match protocol)
                '',             // domain (current domain, empty string for PHP 8.4 compatibility)
                true,           // httpOnly
                ['samesite' => 'Strict']
            );

            // Send cookies to browser
            $this->cookies->send();

            if (class_exists(\MikoPBX\Core\System\SystemMessages::class)) {
                \MikoPBX\Core\System\SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Cleared stale refreshToken cookie for unauthenticated user",
                    LOG_DEBUG
                );
            }
        }
    }

    /**
     * Redirects the user to the login page.
     * @param $dispatcher Dispatcher instance for handling the redirection.
     */
    private function forwardToLoginPage(Dispatcher $dispatcher): void
    {
        $dispatcher->forward([
            'controller' => 'session',
            'action' => 'index',
            'module' => 'admin-cabinet',
            'namespace' => 'MikoPBX\AdminCabinet\Controllers'
        ]);
    }

    /**
     * Redirects to the user's home page or a default page if the home page is not set.
     *
     * For JWT authentication: home page path should be stored in JWT claims or module config.
     * For now, defaults to '/admin-cabinet/extensions/index'.
     *
     * @param Dispatcher $dispatcher The dispatcher object used to forward the request.
     */
    private function redirectToHome(Dispatcher $dispatcher): void
    {
        // TODO: get home page from JWT claims when token validation is implemented
        // For now, use default home page
        $homePath = '/admin-cabinet/extensions/index';

        $redis = $this->di->getShared(ManagedCacheProvider::SERVICE_NAME);

        // Prevent redirect loops
        $currentPageCacheKey = 'RedirectCount:' . session_id() . ':' . md5($homePath);

        $redirectCount = $redis->get($currentPageCacheKey) ?? 0;
        $redirectCount++;
        $redis->set($currentPageCacheKey, $redirectCount, 5);
        if ($redirectCount > 25) {
            $redis->delete($currentPageCacheKey);
            $this->forwardTo401Error($dispatcher);
            return;
        }

        // Extract the module, controller, and action from the home page path
        $module = explode('/', $homePath)[1];
        $controller = explode('/', $homePath)[2];
        $action = explode('/', $homePath)[3];

        if (str_starts_with($module, 'module-')) {
            $camelizedNameSpace = Text::camelize($module);
            $namespace = "Modules\\$camelizedNameSpace\\App\\Controllers";

            // Forward the request to the determined route with namespace
            $dispatcher->forward([
                'module' => $module,
                'controller' => $controller,
                'action' => $action,
                'namespace' => $namespace
            ]);
        } else {
            // Forward the request to the determined route
            $dispatcher->forward([
                'module' => $module,
                'controller' => $controller,
                'action' => $action
            ]);
        }
    }

    /**
     * Redirects the user to a 401 error page.
     * @param $dispatcher Dispatcher instance for handling the redirection.
     */
    private function forwardTo401Error(Dispatcher $dispatcher): void
    {
        $dispatcher->forward([
            'module' => 'admin-cabinet',
            'controller' => 'errors',
            'action' => 'show401',
            'namespace' => 'MikoPBX\AdminCabinet\Controllers'
        ]);
    }

    /**
     * Checks if an action is allowed for the current user.
     *
     * JWT authentication: role should be extracted from JWT claims.
     * For now, uses default 'admins' role for authenticated users.
     *
     * @param string $controller The full name of the controller class.
     * @param string $action The name of the action to check.
     * @return bool true if the action is allowed for the current user, false otherwise.
     */
    public function isAllowedAction(string $controller, string $action): bool
    {
        // TODO: extract role from JWT token claims
        // For now, assume all authenticated users have 'admins' role
        $role = AclProvider::ROLE_ADMINS;

        $acl = $this->di->get(AclProvider::SERVICE_NAME);
        $allowed = $acl->isAllowed($role, $controller, $action);

        if ($allowed != AclEnum::ALLOW) {
            return false;
        }

        return true;
    }
}
