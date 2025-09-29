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

namespace MikoPBX\PBXCoreREST\Middleware;

use MikoPBX\Common\Providers\LoggerAuthProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Http\Request;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Services\TokenValidationService;
use MikoPBX\PBXCoreREST\Providers\RequestProvider;
use MikoPBX\PBXCoreREST\Providers\ResponseProvider;
use MikoPBX\PBXCoreREST\Traits\ResponseTrait;
use Phalcon\Mvc\Micro;
use Phalcon\Mvc\Micro\MiddlewareInterface;

/**
 * Class AuthenticationMiddleware
 *
 */
class AuthenticationMiddleware implements MiddlewareInterface
{
    use ResponseTrait;

    /**
     * Call me
     *
     * @param Micro $application
     *
     * @return bool
     */
    public function call(Micro $application): bool
    {
        /** @var Request $request */
        $request = $application->getService(RequestProvider::SERVICE_NAME);
        /** @var Response $response */
        $response = $application->getService(ResponseProvider::SERVICE_NAME);

        // Check Bearer token authentication first
        if ($request->hasBearerToken()) {
            $tokenValidator = new TokenValidationService($application->getDI());
            $validationResult = $tokenValidator->validate($request);
            
            if ($validationResult->isValid()) {
                // Store token info in request for logging and context
                $tokenInfo = $validationResult->getTokenInfo();
                if ($tokenInfo !== null) {
                    $request->setTokenInfo($tokenInfo);
                }
                // Bearer token authenticated successfully, skip other checks
                return true;
            }
            
            // Log failed Bearer token attempt
            $loggerAuth = $application->getService(LoggerAuthProvider::SERVICE_NAME);
            $loggerAuth->warning("Bearer token auth failed - From: {$request->getClientAddress(true)} Token: ***{$validationResult->getTokenSuffix()} Error: {$validationResult->getError()}");
            
            $this->halt(
                $application,
                $response::UNAUTHORIZED,
                'Invalid Bearer token'
            );
            return false;
        }
        
        // Check if this is a public endpoint (no auth required)
        $isPublicEndpoint = $this->isPublicEndpoint($application);

        $isNoAuthApi = $request->thisIsModuleNoAuthRequest($application);
        if (
            true !== $request->isLocalHostRequest()
            && true !== $request->isAuthorizedSessionRequest()
            && true !== $isNoAuthApi
            && true !== $isPublicEndpoint
        ) {
            $loggerAuth = $application->getService(LoggerAuthProvider::SERVICE_NAME);
            $loggerAuth->warning("From: {$request->getClientAddress(true)} UserAgent:{$request->getUserAgent()} Cause: Wrong password");
            $this->halt(
                $application,
                $response::UNAUTHORIZED,
                'The user isn\'t authenticated.'
            );
            return false;
        }

        if (
            true !== $isNoAuthApi
            && true !== $request->isLocalHostRequest()
            && true !== $request->isAllowedAction($application)
        ) {
             $this->halt(
                 $application,
                 $response::FORBIDDEN,
                 'The route is not allowed'
             );
            return false;
        }

        // CSRF protection for state-changing operations
        if ($this->requiresCsrfProtection($request, $application) && !$this->validateCsrfToken($request, $application)) {
            $this->halt(
                $application,
                $response::FORBIDDEN,
                'CSRF token validation failed'
            );
            return false;
        }

        return true;
    }

    /**
     * Check if this is a public endpoint (no authentication required)
     *
     * @param Micro $application
     * @return bool
     */
    private function isPublicEndpoint(Micro $application): bool
    {
        /** @var Request $request */
        $request = $application->getService(RequestProvider::SERVICE_NAME);
        $uri = $request->getURI();

        // List of public endpoints that don't require authentication
        $publicEndpoints = [
            '/pbxcore/api/health' => ['GET'],  // Health check endpoint
            '/pbxcore/api/v3/mail-settings/oauth2-callback' => ['GET'],  // OAuth2 callback
        ];

        foreach ($publicEndpoints as $endpoint => $allowedMethods) {
            if (strpos($uri, $endpoint) === 0) {
                $method = $request->getMethod();
                if (in_array($method, $allowedMethods, true)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if the request requires CSRF protection
     *
     * @param Request $request
     * @param Micro $application
     * @return bool
     */
    private function requiresCsrfProtection(Request $request, Micro $application): bool
    {
        // CSRF protection is required for state-changing HTTP methods
        $method = $request->getMethod();
        $protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
        
        if (!in_array($method, $protectedMethods)) {
            return false;
        }

        // Skip CSRF for localhost and debug mode
        if ($request->isLocalHostRequest() || $request->isDebugModeEnabled()) {
            return false;
        }
        
        // Skip CSRF for Bearer token authenticated requests
        if ($request->hasBearerToken()) {
            return false;
        }

        // Check if the controller opts into CSRF protection
        try {
            $router = $application->getRouter();
            $controllerName = $router->getControllerName();
            
            if (!empty($controllerName)) {
                // Build full controller class name
                $controllerClass = "MikoPBX\\PBXCoreREST\\Controllers\\{$controllerName}";
                
                // Check if controller class exists and has CSRF protection enabled
                if (class_exists($controllerClass)) {
                    $reflection = new \ReflectionClass($controllerClass);
                    
                    // Check if controller has REQUIRES_CSRF_PROTECTION constant set to true
                    if ($reflection->hasConstant('REQUIRES_CSRF_PROTECTION')) {
                        return $reflection->getConstant('REQUIRES_CSRF_PROTECTION') === true;
                    }
                }
            }
        } catch (\Exception $e) {
            // If we can't determine the controller, err on the side of caution
            // and require CSRF protection for state-changing methods
            SystemMessages::sysLogMsg(__CLASS__, "CSRF check error: " . $e->getMessage(), LOG_WARNING);
        }

        // Default: no CSRF protection required (gradual migration)
        return false;
    }

    /**
     * Validate CSRF token from the request
     *
     * @param Request $request
     * @param Micro $application
     * @return bool
     */
    private function validateCsrfToken(Request $request, Micro $application): bool
    {
        try {
            // Get security service
            $security = $application->getDI()->getShared('security');
            
            // Get token key and expected value
            $tokenKey = $security->getTokenKey();
            
            // Get request data based on content type
            $requestData = $request->getData();
            
            // Check if token exists in request
            if (!isset($requestData[$tokenKey])) {
                return false;
            }
            
            // Validate token
            $providedToken = $requestData[$tokenKey];
            return $security->checkToken($tokenKey, $providedToken);
            
        } catch (\Exception $e) {
            // Log error but don't expose details
            SystemMessages::sysLogMsg(__CLASS__, "CSRF validation error: " . $e->getMessage(), LOG_WARNING);
            return false;
        }
    }

}
