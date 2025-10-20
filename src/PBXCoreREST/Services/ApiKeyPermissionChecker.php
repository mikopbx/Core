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

namespace MikoPBX\PBXCoreREST\Services;

use MikoPBX\Common\Models\ApiKeys;
use MikoPBX\PBXCoreREST\Attributes\ActionType;

/**
 * Service for checking API Key permissions against request paths
 *
 * This service implements the permission checking logic for API Keys,
 * validating whether an API Key has the required permissions to access
 * a specific REST API endpoint.
 *
 * @package MikoPBX\PBXCoreREST\Services
 */
class ApiKeyPermissionChecker
{
    /**
     * Check if API Key has permission to access the requested resource
     *
     * Permission checking logic:
     * 1. If full_permissions === '1' → allow everything
     * 2. Parse allowed_paths JSON to get path → action mapping
     * 3. Normalize request path (remove query params, trailing slash)
     * 4. Convert request path to base resource path (remove ID if present)
     * 5. Map HTTP method to ActionType (GET → READ, POST/PUT/DELETE/PATCH → WRITE)
     * 6. Check if path exists in permissions
     * 7. Validate action hierarchy (write includes read)
     *
     * Examples:
     * - API Key with {"/api/v3/extensions": "write"} can:
     *   ✅ GET /api/v3/extensions (write includes read)
     *   ✅ POST /api/v3/extensions
     *   ✅ PUT /api/v3/extensions/123
     *   ✅ DELETE /api/v3/extensions/123
     *   ❌ GET /api/v3/cdr (no permissions for cdr)
     *
     * - API Key with {"/api/v3/cdr": "read"} can:
     *   ✅ GET /api/v3/cdr
     *   ❌ POST /api/v3/cdr (only read)
     *
     * @param object $apiKey API Key model or object with permissions
     *                       Must have properties: id, full_permissions, allowed_paths
     *                       Accepts ApiKeys model or stdClass for flexibility
     * @param string $requestPath Request path (e.g., "/api/v3/extensions")
     * @param string $httpMethod HTTP method (GET, POST, PUT, DELETE, PATCH)
     * @return bool True if access allowed, false otherwise
     */
    public function checkPermission(
        object $apiKey,
        string $requestPath,
        string $httpMethod
    ): bool {
        // STEP 1: Check full permissions flag
        // WHY: If API Key has full permissions, no need to check details
        // @phpstan-ignore-next-line - Allow accessing properties from ApiKeys or test mock objects
        if ($apiKey->full_permissions === '1') {
            $this->logDebug($apiKey, $requestPath, $httpMethod, true, 'full_permissions=1');
            return true;
        }

        // STEP 2: Parse allowed_paths JSON
        // WHY: Extract path → action mapping from JSON field
        // @phpstan-ignore-next-line - Allow accessing properties from ApiKeys or test mock objects
        $permissions = $this->parseAllowedPaths($apiKey->allowed_paths);
        if (empty($permissions)) {
            $this->logDebug($apiKey, $requestPath, $httpMethod, false, 'empty permissions');
            return false;
        }

        // STEP 3: Normalize request path
        // WHY: Ensure consistent path format for comparison
        // Remove /pbxcore prefix if present (full path vs API path)
        $normalizedPath = $this->normalizePath($requestPath);
        $normalizedPath = preg_replace('#^/pbxcore#', '', $normalizedPath);

        // STEP 4: Convert to base resource path
        // WHY: Permissions are checked at resource level, not individual records
        // Example: /api/v3/extensions/123 → /api/v3/extensions
        $basePath = $this->extractBasePath($normalizedPath);

        // STEP 5: Check if path exists in permissions
        // WHY: No point checking action if path is not allowed at all
        if (!isset($permissions[$basePath])) {
            $this->logDebug($apiKey, $requestPath, $httpMethod, false, "path not in permissions: {$basePath}");
            return false;
        }

        // STEP 6: Get granted action type from permissions
        // WHY: Convert string 'read'/'write' to ActionType enum
        $grantedActionString = $permissions[$basePath];
        $grantedAction = ActionType::tryFrom($grantedActionString);

        if ($grantedAction === null) {
            $this->logDebug($apiKey, $requestPath, $httpMethod, false, "invalid action: {$grantedActionString}");
            return false;
        }

        // STEP 7: Map HTTP method to required action type
        // WHY: Different HTTP methods require different permission levels
        $requestedAction = $this->methodToAction($httpMethod);

        // STEP 8: Check action hierarchy
        // WHY: write includes read, admin includes everything
        // Example: API Key with 'write' can do 'read' operations
        $allowed = $grantedAction->includes($requestedAction);

        $this->logDebug(
            $apiKey,
            $requestPath,
            $httpMethod,
            $allowed,
            "granted={$grantedAction->value}, requested={$requestedAction->value}"
        );

        return $allowed;
    }

    /**
     * Parse allowed_paths JSON field to array
     *
     * @param string|null $allowedPaths JSON string like {"\/api\/v3\/ext": "write"}
     * @return array<string, string> Parsed permissions map (path => action)
     */
    private function parseAllowedPaths(?string $allowedPaths): array
    {
        if (empty($allowedPaths)) {
            return [];
        }

        $decoded = json_decode($allowedPaths, true);

        // Ensure it's an array and not malformed JSON
        if (!is_array($decoded)) {
            return [];
        }

        return $decoded;
    }

    /**
     * Normalize request path for consistent comparison
     *
     * Normalization rules:
     * - Remove query parameters: /api/v3/ext?page=1 → /api/v3/ext
     * - Remove trailing slash: /api/v3/ext/ → /api/v3/ext
     * - Keep leading slash
     *
     * @param string $path Raw request path
     * @return string Normalized path
     */
    private function normalizePath(string $path): string
    {
        // Remove query parameters
        $path = explode('?', $path)[0];

        // Remove trailing slash
        $path = rtrim($path, '/');

        return $path;
    }

    /**
     * Extract base resource path from request path
     *
     * Converts resource-level paths to collection-level paths:
     * - /api/v3/extensions/123 → /api/v3/extensions
     * - /api/v3/extensions → /api/v3/extensions
     * - /api/v3/extensions:method → /api/v3/extensions
     * - /api/v3/extensions/123:method → /api/v3/extensions
     *
     * Logic:
     * 1. Split by '/' to get path segments
     * 2. If last segment contains ':' (custom method), remove it
     * 3. If last segment looks like ID (not a word), remove it
     * 4. Join segments back
     *
     * @param string $path Normalized path
     * @return string Base resource path
     */
    private function extractBasePath(string $path): string
    {
        // Remove custom method suffix if present (:method)
        // Example: /api/v3/extensions:getDefault → /api/v3/extensions
        $pathWithoutMethod = preg_replace('/:[^\/]+$/', '', $path);

        // Ensure we have a string (preg_replace can return null on error)
        if ($pathWithoutMethod === null) {
            $pathWithoutMethod = $path;
        }

        // Split path into segments
        $segments = explode('/', $pathWithoutMethod);

        // Remove empty segments
        $segments = array_filter($segments, fn($s) => $s !== '');

        // Check if last segment looks like a resource ID
        // Resource IDs typically contain numbers, hyphens, or special prefixes
        // Resource names are typically kebab-case words (extensions, call-queues, etc)
        $lastSegment = end($segments);

        // Ensure we have a valid segment (end() returns false on empty array)
        if ($lastSegment === false) {
            return '/';
        }

        // If last segment contains numbers or is all digits, it's likely an ID
        // Examples of IDs: 123, EXTENSION-123, SIP-201, abc-123-def
        // Examples of resources: extensions, call-queues, incoming-routes
        if ($this->looksLikeId($lastSegment)) {
            // Remove the ID segment
            array_pop($segments);
        }

        // Reconstruct path with leading slash
        return '/' . implode('/', $segments);
    }

    /**
     * Check if a path segment looks like a resource ID rather than a resource name
     *
     * Resource IDs typically:
     * - Contain digits
     * - Have uppercase prefixes (SIP-, IAX-, CONFERENCE-)
     * - Are UUIDs or similar
     *
     * Resource names are:
     * - Lowercase kebab-case (extensions, call-queues)
     * - No digits
     *
     * @param string $segment Path segment to check
     * @return bool True if looks like ID
     */
    private function looksLikeId(string $segment): bool
    {
        // If segment is all digits, it's definitely an ID
        if (ctype_digit($segment)) {
            return true;
        }

        // If segment contains uppercase letters (like SIP-201), likely an ID
        if (preg_match('/[A-Z]/', $segment)) {
            return true;
        }

        // If segment contains digits mixed with other chars (like extension-123), likely an ID
        if (preg_match('/\d/', $segment)) {
            return true;
        }

        // Otherwise it's probably a resource name
        return false;
    }

    /**
     * Map HTTP method to ActionType
     *
     * Mapping rules:
     * - GET → READ (viewing data)
     * - POST, PUT, PATCH, DELETE → WRITE (modifying data)
     * - Default → READ (safe fallback)
     *
     * @param string $method HTTP method
     * @return ActionType Required action type
     */
    private function methodToAction(string $method): ActionType
    {
        return match(strtoupper($method)) {
            'GET' => ActionType::READ,
            'POST', 'PUT', 'PATCH', 'DELETE' => ActionType::WRITE,
            default => ActionType::READ
        };
    }

    /**
     * Log permission check for debugging
     *
     * Logs to system log if SystemMessages class is available
     *
     * @param object $apiKey API Key being checked (must have id property)
     * @param string $requestPath Request path
     * @param string $httpMethod HTTP method
     * @param bool $allowed Check result
     * @param string $reason Reason for decision
     * @return void
     */
    private function logDebug(
        object $apiKey,
        string $requestPath,
        string $httpMethod,
        bool $allowed,
        string $reason
    ): void {
        // Only log if SystemMessages is available and DI is initialized
        // In unit tests, DI may not be initialized
        if (!class_exists(\MikoPBX\Core\System\SystemMessages::class)) {
            return;
        }

        // Check if DI container is available
        try {
            $di = \Phalcon\Di\Di::getDefault();
            if ($di === null) {
                return;
            }
        } catch (\Throwable $e) {
            // DI not available in test environment
            return;
        }

        $result = $allowed ? 'ALLOWED' : 'DENIED';
        $message = sprintf(
            'API Key permission check: %s | apiKey=%s | path=%s | method=%s | reason=%s',
            $result,
            $apiKey->id ?? 'unknown',
            $requestPath,
            $httpMethod,
            $reason
        );

        \MikoPBX\Core\System\SystemMessages::sysLogMsg(
            __CLASS__,
            $message,
            LOG_DEBUG
        );
    }
}
