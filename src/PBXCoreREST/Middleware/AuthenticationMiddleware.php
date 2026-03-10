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

use MikoPBX\Common\Providers\AclProvider;
use MikoPBX\Common\Providers\LoggerAuthProvider;
use MikoPBX\PBXCoreREST\Http\Request;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Lib\Auth\JWTHelper;
use MikoPBX\PBXCoreREST\Services\TokenValidationService;
use MikoPBX\PBXCoreREST\Providers\RequestProvider;
use MikoPBX\PBXCoreREST\Providers\ResponseProvider;
use MikoPBX\PBXCoreREST\Traits\ResponseTrait;
use Phalcon\Acl\Enum as AclEnum;
use Phalcon\Mvc\Micro;
use Phalcon\Mvc\Micro\MiddlewareInterface;

/**
 * Authentication and Authorization Middleware for MikoPBX REST API
 *
 * Handles three access channels:
 * 1. PUBLIC endpoints - no authentication required (via ResourceSecurity attributes)
 * 2. LOCALHOST - direct access from 127.0.0.1 or ::1 (bypasses all security)
 * 3. BEARER TOKEN - JWT or API Key authentication
 *
 * After successful authentication, ACL authorization is performed:
 * - Role is extracted from JWT payload
 * - ACL checks if role has access to controller/action
 * - Controller = full resource path (e.g., /pbxcore/api/v3/extensions)
 * - Action = operation name (getList, getRecord, create, update, delete, or custom method)
 *
 * ACL resource format (universal for any API version):
 * - Supports /pbxcore/api/v1/, /pbxcore/api/v2/, /pbxcore/api/v3/, etc.
 * - ACL rules are stored with full paths in EndpointConstants (ModuleUsersUI)
 * - Example: E::API_V3_EXTENSIONS = '/pbxcore/api/v3/extensions'
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
     * After successful authentication, performs ACL authorization check
     * unless request is from localhost (which bypasses ACL).
     *
     * @param Request $request
     * @param Micro $application
     * @return bool True if authenticated and authorized, false otherwise
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

            // ACL Authorization check (skip for localhost)
            // WHY: Localhost requests are trusted internal calls from workers/scripts
            if (!$request->isLocalHostRequest()) {
                if (!$this->checkAclPermission($request, $application)) {
                    return $this->denyAccessForbidden($application, $request, 'Access denied by ACL');
                }
            }

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
            // Note: API Key permissions are checked separately via ApiKeyPermissionChecker
            // ACL check is only for JWT-authenticated users with roles
            return true;
        }

        // Both JWT and API Key validation failed
        $this->logAuthFailure(
            $application,
            "From: {$request->getClientAddress()} Error: {$validationResult->getError()}"
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
            "From: {$request->getClientAddress()} UserAgent: {$request->getUserAgent()} Cause: {$reason}"
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

    /**
     * Check ACL permission for the current request
     *
     * Extracts role from JWT payload and checks if the role has access
     * to the requested controller/action via Phalcon ACL.
     *
     * @param Request $request The current request (must have jwtPayload set)
     * @param Micro $application The application instance
     * @return bool True if access is allowed, false otherwise
     */
    private function checkAclPermission(Request $request, Micro $application): bool
    {
        // Extract role from JWT payload
        $jwtPayload = $request->getJwtPayload();
        $role = $jwtPayload['role'] ?? AclProvider::ROLE_GUESTS;

        // Built-in admins role has super privileges - bypass ACL entirely
        // WHY: admins should have unrestricted access to all REST API endpoints
        if ($role === AclProvider::ROLE_ADMINS) {
            return true;
        }

        // Get ACL service for non-admin roles
        try {
            $acl = $application->getDI()->getShared(AclProvider::SERVICE_NAME);
        } catch (\Exception $e) {
            // ACL service not available - deny request (fail-closed)
            // WHY: Security first - if ACL is unavailable, deny access rather than allow
            $this->logAuthFailure(
                $application,
                "ACL service unavailable: {$e->getMessage()}, role={$role}, uri={$request->getURI()}"
            );
            return false;
        }

        // Check if role has full access (wildcard permission '*', '*')
        // WHY: This handles ModuleUsersUI groups with fullAccess=1
        // Note: isAllowed() returns boolean in Phalcon 5.x
        if ($acl->isAllowed($role, '*', '*') === true) {
            return true;
        }

        // Parse request URI into controller and action
        [$controller, $action] = $this->parseRequestToAcl($request);

        // If we couldn't parse the request, allow by default (let controller handle it)
        // WHY: Some routes may not follow standard REST patterns
        if ($controller === null || $action === null) {
            return true;
        }

        // Check if role is allowed to access controller/action
        // Note: isAllowed() returns boolean in Phalcon 5.x
        if ($acl->isAllowed($role, $controller, $action) !== true) {
            $this->logAuthFailure(
                $application,
                "ACL denied: role={$role}, controller={$controller}, action={$action}, uri={$request->getURI()}"
            );
            return false;
        }

        return true;
    }

    /**
     * Parse request URI and HTTP method into ACL controller and action
     *
     * Universal REST API routes parsing (works with any API version):
     * - GET  /pbxcore/api/{version}/extensions              → controller=/pbxcore/api/{version}/extensions, action=getList
     * - GET  /pbxcore/api/{version}/extensions/{id}         → controller=/pbxcore/api/{version}/extensions, action=getRecord
     * - POST /pbxcore/api/{version}/extensions              → controller=/pbxcore/api/{version}/extensions, action=create
     * - PUT  /pbxcore/api/{version}/extensions/{id}         → controller=/pbxcore/api/{version}/extensions, action=update
     * - PATCH /pbxcore/api/{version}/extensions/{id}        → controller=/pbxcore/api/{version}/extensions, action=patch
     * - DELETE /pbxcore/api/{version}/extensions/{id}       → controller=/pbxcore/api/{version}/extensions, action=delete
     * - GET  /pbxcore/api/{version}/extensions:getDefault   → controller=/pbxcore/api/{version}/extensions, action=getDefault
     * - POST /pbxcore/api/{version}/extensions/{id}:copy    → controller=/pbxcore/api/{version}/extensions, action=copy
     *
     * Also supports module endpoints:
     * - /pbxcore/api/{version}/modules/{module}/{resource}
     *
     * @param Request $request The current request
     * @return array{0: string|null, 1: string|null} [controller, action] or [null, null] if cannot parse
     */
    private function parseRequestToAcl(Request $request): array
    {
        $uri = $request->getURI();
        $httpMethod = $request->getMethod();

        // Remove query string if present
        $uri = strtok($uri, '?');

        // Match REST API pattern: /pbxcore/api/{version}/{resource}...
        // Supports any version (v1, v2, v3, v4, v5, etc.)
        if (!preg_match('#^(/pbxcore/api/v\d+/)(.+)$#', $uri, $matches)) {
            // Not a REST API request - return null to skip ACL
            return [null, null];
        }

        $apiPrefix = $matches[1]; // e.g., /pbxcore/api/v3/
        $path = $matches[2];      // e.g., extensions or extensions/SIP-101:copy

        // Check for custom method syntax (contains colon)
        // Example: extensions:getDefault or extensions/SIP-101:copy
        if (str_contains($path, ':')) {
            // Split by colon to get resource path and method name
            $colonPos = strrpos($path, ':');
            $resourcePath = substr($path, 0, $colonPos);
            $customMethod = substr($path, $colonPos + 1);

            // Remove trailing ID from resource path if present
            // Example: extensions/SIP-101 → extensions
            $resourcePath = $this->extractResourcePath($resourcePath);

            return [rtrim($apiPrefix, '/') . '/' . $resourcePath, $customMethod];
        }

        // Standard CRUD operation - determine action by HTTP method and path structure
        $hasResourceId = $this->pathHasResourceId($path);
        $resourcePath = $this->extractResourcePath($path);
        $controller = rtrim($apiPrefix, '/') . '/' . $resourcePath;

        // Map HTTP method + resource/collection level to action
        $action = match ($httpMethod) {
            'GET' => $hasResourceId ? 'getRecord' : 'getList',
            'HEAD' => $hasResourceId ? 'getRecord' : 'getList',
            'POST' => 'create',
            'PUT' => 'update',
            'PATCH' => 'patch',
            'DELETE' => 'delete',
            default => null
        };

        return [$controller, $action];
    }

    /**
     * Extract base resource path from a path that may contain resource ID
     *
     * Examples:
     * - extensions → extensions
     * - extensions/SIP-101 → extensions
     * - call-queues/QUEUE-1 → call-queues
     * - modules/my-module/tasks/TASK-1 → modules/my-module/tasks
     *
     * @param string $path Path without /pbxcore/api/v3/ prefix
     * @return string Resource path without ID
     */
    private function extractResourcePath(string $path): string
    {
        // Remove trailing slash
        $path = rtrim($path, '/');

        // Split by /
        $parts = explode('/', $path);

        // If last part looks like an ID (contains uppercase, numbers, or prefixed pattern),
        // remove it to get the base resource path
        if (count($parts) > 1) {
            $lastPart = end($parts);

            // Check if last part looks like a resource ID
            // Patterns: SIP-101, QUEUE-1, 12345, UUID, etc.
            // Resource names are typically lowercase with hyphens
            if ($this->looksLikeResourceId($lastPart)) {
                array_pop($parts);
            }
        }

        return implode('/', $parts);
    }

    /**
     * Check if a path segment looks like a resource ID
     *
     * Resource IDs typically:
     * - Contain uppercase letters (SIP-101, QUEUE-1)
     * - Are purely numeric (12345)
     * - Match UUID pattern
     * - Are prefixed with uppercase pattern (CONFERENCE-ROOM-1)
     *
     * Resource names (not IDs) are typically lowercase with hyphens:
     * - extensions, call-queues, ivr-menu, etc.
     *
     * @param string $segment Path segment to check
     * @return bool True if looks like an ID
     */
    private function looksLikeResourceId(string $segment): bool
    {
        // Empty or very short segments are not IDs
        if (strlen($segment) < 1) {
            return false;
        }

        // Purely numeric - definitely an ID
        if (ctype_digit($segment)) {
            return true;
        }

        // Contains uppercase letter - likely an ID (SIP-101, QUEUE-1)
        // Resource names in MikoPBX are lowercase with hyphens
        if (preg_match('/[A-Z]/', $segment)) {
            return true;
        }

        // UUID pattern
        if (preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i', $segment)) {
            return true;
        }

        return false;
    }

    /**
     * Check if path contains a resource ID (vs just collection path)
     *
     * @param string $path Path without /pbxcore/api/v3/ prefix
     * @return bool True if path contains resource ID
     */
    private function pathHasResourceId(string $path): bool
    {
        // Remove trailing slash
        $path = rtrim($path, '/');

        // Split by /
        $parts = explode('/', $path);

        // If we have more than one part, check if last part is an ID
        if (count($parts) > 1) {
            $lastPart = end($parts);
            return $this->looksLikeResourceId($lastPart);
        }

        return false;
    }

    /**
     * Deny access with 403 Forbidden (for ACL failures)
     *
     * Different from denyAccess() which returns 401 Unauthorized.
     * 403 means "authenticated but not authorized" - user is known but lacks permission.
     *
     * @param Micro $application
     * @param Request $request
     * @param string $reason
     * @return bool Always returns false
     */
    private function denyAccessForbidden(Micro $application, Request $request, string $reason): bool
    {
        /** @var Response $response */
        $response = $application->getService(ResponseProvider::SERVICE_NAME);

        $this->logAuthFailure(
            $application,
            "FORBIDDEN From: {$request->getClientAddress()} UserAgent: {$request->getUserAgent()} Cause: {$reason}"
        );

        $this->halt($application, $response::FORBIDDEN, 'Access denied. You do not have permission to access this resource.');
        return false;
    }
}
