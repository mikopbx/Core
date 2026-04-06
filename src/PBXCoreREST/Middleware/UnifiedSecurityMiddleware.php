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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Middleware;

use MikoPBX\PBXCoreREST\Attributes\{ResourceSecurity, ActionType};
use MikoPBX\PBXCoreREST\Attributes\SecurityType;
use MikoPBX\PBXCoreREST\Http\Request;
use Phalcon\Http\Response;

/**
 * Unified security middleware for MikoPBX REST API (Future Implementation)
 *
 * ⚠️ STATUS: NOT INTEGRATED - This is a prepared implementation for future use
 *
 * CURRENT STATE (as of 2025):
 * - Class is fully implemented but NOT registered in RouterProvider middleware chain
 * - Does NOT implement MiddlewareInterface (intentional - not a middleware yet)
 * - Authentication is handled by AuthenticationMiddleware with hardcoded PUBLIC_ENDPOINTS
 * - Permission checking is handled by ApiKeyPermissionChecker service
 *
 * INTENDED FUTURE USE:
 * When fine-grained authorization based on scopes and ResourceSecurity attributes is needed:
 * 1. Replace hardcoded AuthenticationMiddleware::PUBLIC_ENDPOINTS with SecurityType::PUBLIC attributes
 * 2. Implement MiddlewareInterface and register in RouterProvider
 * 3. Add scope-based permission checking per-endpoint
 * 4. Generate detailed access logs for security auditing
 *
 * CAPABILITIES:
 * - Handles three access channels: PUBLIC, LOCALHOST, BEARER_TOKEN
 * - Scope-based permission validation (resource:action format)
 * - Wildcard pattern matching (*:*, resource:*, *:action)
 * - Detailed security check results with access logs
 *
 * @package MikoPBX\PBXCoreREST\Middleware
 * @see AuthenticationMiddleware Current authentication implementation
 * @see ApiKeyPermissionChecker Current permission checking implementation
 */
class UnifiedSecurityMiddleware
{
    public function __construct()
    {
    }

    /**
     * Check access for a given resource security configuration
     */
    public function checkAccess(
        ResourceSecurity $security,
        Request $request,
        ?object $user = null,
        ?ActionType $resolvedAction = null
    ): SecurityCheckResult {
        // Sort requirements by priority (highest first)
        $requirements = $security->requirements;
        usort($requirements, fn($a, $b) => $b->getPriority() <=> $a->getPriority());

        $permission = $security->getPermission($resolvedAction);
        /** @var array<int, array<string, mixed>> $accessLog */
        $accessLog = [];

        foreach ($requirements as $securityType) {
            $result = $this->checkSecurityType($securityType, $request, $user, $permission);
            $accessLog[] = [
                'type' => $securityType->value,
                'allowed' => $result->allowed,
                'reason' => $result->reason
            ];

            if ($result->allowed) {
                return new SecurityCheckResult(
                    allowed: true,
                    securityType: $securityType,
                    permission: $permission,
                    reason: "Access granted via {$securityType->value}",
                    accessLog: $accessLog
                );
            }
        }

        return new SecurityCheckResult(
            allowed: false,
            securityType: null,
            permission: $permission,
            reason: 'Access denied - no valid security type found',
            accessLog: $accessLog
        );
    }

    /**
     * Check specific security type
     */
    private function checkSecurityType(
        SecurityType $securityType,
        Request $request,
        ?object $user,
        ?string $permission
    ): SecurityTypeResult {
        return match ($securityType) {
            SecurityType::PUBLIC => $this->checkPublicAccess(),
            SecurityType::LOCALHOST => $this->checkLocalhostAccess($request),
            SecurityType::BEARER_TOKEN => $this->checkApiKeyAccess($request, $permission)
        };
    }

    /**
     * Check public access (always allowed)
     */
    private function checkPublicAccess(): SecurityTypeResult
    {
        return new SecurityTypeResult(true, 'Public access allowed');
    }

    /**
     * Check localhost access (internal authorization, not exposed in OpenAPI)
     */
    private function checkLocalhostAccess(Request $request): SecurityTypeResult
    {
        $clientIp = $request->getClientAddress();
        $isLocalhost = in_array($clientIp, ['127.0.0.1', '::1', 'localhost'], true);

        return new SecurityTypeResult(
            $isLocalhost,
            $isLocalhost ? 'Localhost access granted' : "Access denied - not localhost (IP: $clientIp)"
        );
    }




    /**
     * Check API key access using existing authentication context
     */
    private function checkApiKeyAccess(Request $request, ?string $permission): SecurityTypeResult
    {
        // Check if AuthenticationMiddleware already validated Bearer token
        $tokenInfo = $request->getTokenInfo();
        if (!$tokenInfo) {
            return new SecurityTypeResult(false, 'No valid Bearer token in request context');
        }

        // Check permission scope if required
        if ($permission && !$this->tokenHasScope($tokenInfo, $permission)) {
            return new SecurityTypeResult(false, "API key lacks required scope: $permission");
        }

        $description = $tokenInfo['description'] ?? 'API Key';
        return new SecurityTypeResult(true, "API key access granted (key: $description)");
    }

    /**
     * Check if token has required scope
     *
     * @param array<string, mixed> $tokenInfo
     */
    private function tokenHasScope(array $tokenInfo, string $permission): bool
    {
        $scopes = $tokenInfo['scopes'] ?? [];

        // Check exact match
        if (in_array($permission, $scopes, true)) {
            return true;
        }

        // Check wildcard patterns
        [$resource, $action] = explode(':', $permission, 2);

        foreach ($scopes as $scope) {
            if ($scope === '*:*' || $scope === '*:admin') {
                return true;
            }

            if ($scope === "*:$action" || $scope === "$resource:*") {
                return true;
            }
        }

        return false;
    }

    /**
     * Create HTTP response for security check failure
     */
    public function createSecurityFailureResponse(SecurityCheckResult $result): Response
    {
        $response = new Response();

        $responseData = [
            'result' => false,
            'messages' => [
                'error' => [$result->reason]
            ],
            'security' => [
                'required_permission' => $result->permission,
                'access_log' => $result->accessLog
            ]
        ];

        $response->setJsonContent($responseData);
        $response->setStatusCode(401, 'Unauthorized');
        $response->setContentType('application/json');

        return $response;
    }
}

/**
 * Result of security check
 */
class SecurityCheckResult
{
    /**
     * @param array<int, array<string, mixed>> $accessLog
     */
    public function __construct(
        public readonly bool $allowed,
        public readonly ?SecurityType $securityType,
        public readonly ?string $permission,
        public readonly string $reason,
        public readonly array $accessLog = []
    ) {
    }
}

/**
 * Result of individual security type check
 */
class SecurityTypeResult
{
    public function __construct(
        public readonly bool $allowed,
        public readonly string $reason
    ) {
    }
}