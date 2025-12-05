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
use MikoPBX\PBXCoreREST\Providers\RequestProvider;
use MikoPBX\PBXCoreREST\Providers\ResponseProvider;
use MikoPBX\PBXCoreREST\Traits\ResponseTrait;
use Phalcon\Mvc\Micro;
use Phalcon\Mvc\Micro\MiddlewareInterface;

/**
 * Authentication Middleware for MikoPBX REST API
 *
 * Handles three access channels:
 * 1. PUBLIC endpoints - no authentication required (via ResourceSecurity attributes)
 * 2. LOCALHOST - direct access from 127.0.0.1
 * 3. BEARER TOKEN - JWT or API Key authentication
 *
 * Public endpoints are detected via 2-priority system:
 * - Priority 1: Attribute-based via PublicEndpointsRegistry (class and method level)
 * - Priority 2: Module Pattern 2 with noAuth: true flag (legacy modules)
 *
 * @package MikoPBX\PBXCoreREST\Middleware
 */
class AuthenticationMiddleware implements MiddlewareInterface
{
    use ResponseTrait;

    /**
     * Main middleware entry point
     *
     * @param Micro $application
     * @return bool True to continue, false to halt
     */
    public function call(Micro $application): bool
    {
        /** @var Request $request */
        $request = $application->getService(RequestProvider::SERVICE_NAME);
        /** @var Response $response */
        $response = $application->getService(ResponseProvider::SERVICE_NAME);

        // Check if this is a public endpoint or no-auth API FIRST
        if ($this->isPublicEndpoint($application) || $request->thisIsModuleNoAuthRequest($application)) {
            $this->tryOptionalAuthentication($request);
            return true;
        }

        // Check Bearer token authentication
        if ($request->hasBearerToken()) {
            return $this->authenticateWithBearerToken($request, $application);
        }

        // Check localhost access
        if ($request->isLocalHostRequest()) {
            return true;
        }

        // No valid authentication found
        return $this->denyAccess($application, $request, 'No valid authentication');
    }

    /**
     * Try to authenticate with optional Bearer token on public endpoints
     * Allows public access even if token is invalid
     *
     * @param Request $request
     */
    private function tryOptionalAuthentication(Request $request): void
    {
        if (!$request->hasBearerToken()) {
            return;
        }

        $token = $request->getBearerToken();
        if ($token === null) {
            return;
        }

        // Try JWT first
        $jwtPayload = JWTHelper::validate($token);
        if ($jwtPayload !== null) {
            $request->setJwtPayload($jwtPayload);
            return;
        }

        // Try API Key
        $tokenValidator = new TokenValidationService($this->getDI());
        $validationResult = $tokenValidator->validate($request);
        if ($validationResult->isValid()) {
            $tokenInfo = $validationResult->getTokenInfo();
            if ($tokenInfo !== null) {
                $request->setTokenInfo($tokenInfo);
            }
        }
        // Note: We don't fail here - public endpoints work without valid token
    }

    /**
     * Authenticate request using Bearer token (JWT or API Key)
     *
     * @param Request $request
     * @param Micro $application
     * @return bool True if authenticated, false otherwise
     */
    private function authenticateWithBearerToken(Request $request, Micro $application): bool
    {
        $token = $request->getBearerToken();

        // Validate token is not null
        if ($token === null) {
            $this->logAuthFailure($application, 'Bearer token is null');
            return $this->denyAccess($application, $request, 'Invalid Bearer token');
        }

        // Try JWT authentication first (short-lived access tokens)
        $jwtPayload = JWTHelper::validate($token);
        if ($jwtPayload !== null) {
            $request->setJwtPayload($jwtPayload);
            return true;
        }

        // JWT invalid/expired, try API Key authentication (long-lived tokens)
        $tokenValidator = new TokenValidationService($application->getDI());
        $validationResult = $tokenValidator->validate($request);

        if ($validationResult->isValid()) {
            $tokenInfo = $validationResult->getTokenInfo();
            if ($tokenInfo !== null) {
                $request->setTokenInfo($tokenInfo);
            }
            return true;
        }

        // Both JWT and API Key validation failed
        $this->logAuthFailure(
            $application,
            "From: {$request->getClientAddress(true)} Token: ***{$validationResult->getTokenSuffix()} Error: {$validationResult->getError()}"
        );

        return $this->denyAccess($application, $request, 'Invalid or expired Bearer token');
    }

    /**
     * Check if current request is to a public endpoint
     *
     * Uses attribute-based detection via PublicEndpointsRegistry which scans:
     * - Class-level ResourceSecurity with SecurityType::PUBLIC
     * - Method-level ResourceSecurity with SecurityType::PUBLIC
     *
     * @param Micro $application
     * @return bool True if public endpoint
     */
    private function isPublicEndpoint(Micro $application): bool
    {
        /** @var Request $request */
        $request = $application->getService(RequestProvider::SERVICE_NAME);
        $uri = $request->getURI();

        return $this->isPublicEndpointByAttributes($application, $uri);
    }

    /**
     * Check if endpoint is public via ResourceSecurity attributes
     *
     * @param Micro $application
     * @param string $uri Request URI
     * @return bool True if endpoint is public
     */
    private function isPublicEndpointByAttributes(Micro $application, string $uri): bool
    {
        try {
            $di = $application->getDI();
            if (!$di->has(\MikoPBX\PBXCoreREST\Providers\PublicEndpointsRegistryProvider::SERVICE_NAME)) {
                return false;
            }

            $registry = $di->getShared(\MikoPBX\PBXCoreREST\Providers\PublicEndpointsRegistryProvider::SERVICE_NAME);
            return $registry->isPublicEndpoint($uri);
        } catch (\Exception) {
            // If registry is unavailable, return false (fail closed for security)
            return false;
        }
    }

    /**
     * Deny access with appropriate error message
     *
     * @param Micro $application
     * @param Request $request
     * @param string $reason
     * @return bool Always returns false
     */
    private function denyAccess(Micro $application, Request $request, string $reason): bool
    {
        /** @var Response $response */
        $response = $application->getService(ResponseProvider::SERVICE_NAME);

        $this->logAuthFailure(
            $application,
            "From: {$request->getClientAddress(true)} UserAgent: {$request->getUserAgent()} Cause: {$reason}"
        );

        $this->halt($application, $response::UNAUTHORIZED, 'The user isn\'t authenticated.');
        return false;
    }

    /**
     * Log authentication failure
     *
     * @param Micro $application
     * @param string $message
     */
    private function logAuthFailure(Micro $application, string $message): void
    {
        $loggerAuth = $application->getService(LoggerAuthProvider::SERVICE_NAME);
        $loggerAuth->warning($message);
    }

    /**
     * Get DI container (compatibility method)
     *
     * @return \Phalcon\Di\DiInterface
     * @throws \RuntimeException if DI container is not initialized
     */
    private function getDI(): \Phalcon\Di\DiInterface
    {
        $di = \Phalcon\Di\Di::getDefault();
        if ($di === null) {
            throw new \RuntimeException('DI container is not initialized');
        }
        return $di;
    }
}
