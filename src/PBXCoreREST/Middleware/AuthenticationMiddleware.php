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
use MikoPBX\PBXCoreREST\Http\Request;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Lib\Auth\JWTHelper;
use MikoPBX\PBXCoreREST\Services\TokenValidationService;
use MikoPBX\PBXCoreREST\Services\SecurityResolver;
use MikoPBX\PBXCoreREST\Providers\RequestProvider;
use MikoPBX\PBXCoreREST\Providers\ResponseProvider;
use MikoPBX\PBXCoreREST\Traits\ResponseTrait;
use Phalcon\Mvc\Micro;
use Phalcon\Mvc\Micro\MiddlewareInterface;
use ReflectionClass;
use ReflectionMethod;

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

        // Check if this is a public endpoint or no-auth API FIRST (before Bearer token validation)
        // This allows public endpoints to work even with invalid/expired tokens
        $isPublicEndpoint = $this->isPublicEndpoint($application);
        $isNoAuthApi = $request->thisIsModuleNoAuthRequest($application);

        // Public endpoints and no-auth APIs can be accessed without any authentication
        if ($isPublicEndpoint || $isNoAuthApi) {
            // Still validate Bearer token if present (for optional authentication)
            if ($request->hasBearerToken()) {
                $token = $request->getBearerToken();
                if ($token !== null) {
                    // Try JWT authentication
                    $jwtPayload = JWTHelper::validate($token);
                    if ($jwtPayload !== null) {
                        $request->setJwtPayload($jwtPayload);
                    } else {
                        // Try API Key authentication
                        $tokenValidator = new TokenValidationService($application->getDI());
                        $validationResult = $tokenValidator->validate($request);
                        if ($validationResult->isValid()) {
                            $tokenInfo = $validationResult->getTokenInfo();
                            if ($tokenInfo !== null) {
                                $request->setTokenInfo($tokenInfo);
                            }
                        }
                        // Note: We don't fail here - public endpoints work without valid token
                    }
                }
            }
            return true; // Allow access to public endpoints regardless of token validity
        }

        // Check Bearer token authentication for non-public endpoints
        if ($request->hasBearerToken()) {
            $token = $request->getBearerToken();

            // Validate token is not null
            if ($token === null) {
                $loggerAuth = $application->getService(LoggerAuthProvider::SERVICE_NAME);
                $loggerAuth->warning("Bearer token is null");
                $this->halt($application, $response::UNAUTHORIZED, 'Invalid Bearer token');
                return false;
            }

            // Try JWT authentication first (short-lived access tokens from /auth:login)
            $jwtPayload = JWTHelper::validate($token);
            if ($jwtPayload !== null) {
                // JWT is valid - store payload in request for access in controllers
                $request->setJwtPayload($jwtPayload);
                return true;
            }

            // JWT invalid/expired, try API Key authentication (long-lived Bearer tokens)
            $tokenValidator = new TokenValidationService($application->getDI());
            $validationResult = $tokenValidator->validate($request);

            if ($validationResult->isValid()) {
                // Store token info in request for logging and context
                $tokenInfo = $validationResult->getTokenInfo();
                if ($tokenInfo !== null) {
                    $request->setTokenInfo($tokenInfo);
                }
                // API Key authenticated successfully
                return true;
            }

            // Both JWT and API Key validation failed
            $loggerAuth = $application->getService(LoggerAuthProvider::SERVICE_NAME);
            $loggerAuth->warning("Bearer token auth failed - From: {$request->getClientAddress(true)} Token: ***{$validationResult->getTokenSuffix()} Error: {$validationResult->getError()}");

            $this->halt(
                $application,
                $response::UNAUTHORIZED,
                'Invalid or expired Bearer token'
            );
            return false;
        }

        // No Bearer token provided - check if localhost
        if ($request->isLocalHostRequest()) {
            // Localhost has full access without any authentication
            return true;
        }

        // Not localhost and no valid authentication
        $loggerAuth = $application->getService(LoggerAuthProvider::SERVICE_NAME);
        $loggerAuth->warning("From: {$request->getClientAddress(true)} UserAgent:{$request->getUserAgent()} Cause: No valid authentication");
        $this->halt(
            $application,
            $response::UNAUTHORIZED,
            'The user isn\'t authenticated.'
        );
        return false;
    }

    /**
     * Check if this is a public endpoint (no authentication required)
     * Uses hardcoded list since getActiveHandler() is not available during middleware
     *
     * @param Micro $application
     * @return bool
     */
    private function isPublicEndpoint(Micro $application): bool
    {
        /** @var Request $request */
        $request = $application->getService(RequestProvider::SERVICE_NAME);
        $uri = $request->getURI();
        $method = $request->getMethod();

        // List of public endpoints that don't require authentication
        $publicEndpoints = [
            '/pbxcore/api/v3/mail-settings/oauth2-callback' => ['GET'],  // OAuth2 callback
            '/pbxcore/api/v3/passkeys:checkAvailability' => ['GET'],  // Passkey availability check
            '/pbxcore/api/v3/passkeys:authenticationStart' => ['GET'],  // WebAuthn login start
            '/pbxcore/api/v3/passkeys:authenticationFinish' => ['POST'],  // WebAuthn login finish
            '/pbxcore/api/v3/auth:login' => ['POST'],  // JWT authentication login
            '/pbxcore/api/v3/auth:refresh' => ['POST'],  // JWT token refresh
            '/pbxcore/api/v3/user-page-tracker:pageView' => ['POST'],  // Page analytics (optional session tracking)
            '/pbxcore/api/v3/user-page-tracker:pageLeave' => ['POST'],  // Page analytics (optional session tracking)
            '/pbxcore/api/v3/system:changeLanguage' => ['POST', 'PATCH'],  // Language change on login page
            '/pbxcore/api/v3/system:getAvailableLanguages' => ['GET'],  // Get available languages on login page
            '/pbxcore/api/v3/system:ping' => ['GET'],  // Health check endpoint
        ];

        foreach ($publicEndpoints as $endpoint => $allowedMethods) {
            if (strpos($uri, $endpoint) === 0) {
                if (in_array($method, $allowedMethods, true)) {
                    return true;
                }
            }
        }

        return false;
    }

}
