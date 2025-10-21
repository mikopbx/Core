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

namespace MikoPBX\Tests\PBXCoreREST\Services;

use MikoPBX\PBXCoreREST\Services\ApiKeyPermissionChecker;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for ApiKeyPermissionChecker service
 *
 * Tests all permission checking scenarios according to taskProgress.md requirements
 * Uses standalone tests without full DI container for faster execution
 */
class ApiKeyPermissionCheckerTest extends TestCase
{
    private ApiKeyPermissionChecker $checker;

    protected function setUp(): void
    {
        parent::setUp();
        $this->checker = new ApiKeyPermissionChecker();
    }

    /**
     * Test 1: API Key with full_permissions=true should allow everything
     *
     * When an API Key has full_permissions='1', it should have access to all endpoints
     * regardless of HTTP method or path.
     */
    public function testFullPermissionsAllowsEverything(): void
    {
        $apiKey = $this->createMockApiKey(
            fullPermissions: '1',
            allowedPaths: ''
        );

        // Should allow any path with any method
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'GET'),
            'Full permissions should allow GET /api/v3/extensions'
        );

        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'POST'),
            'Full permissions should allow POST /api/v3/extensions'
        );

        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/cdr', 'GET'),
            'Full permissions should allow GET /api/v3/cdr'
        );

        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/cdr', 'DELETE'),
            'Full permissions should allow DELETE /api/v3/cdr'
        );
    }

    /**
     * Test 2: API Key with write permission should allow both GET and POST
     *
     * Write permission includes read permission due to ActionType hierarchy.
     * API Key with 'write' should be able to perform both read and write operations.
     */
    public function testWritePermissionIncludesRead(): void
    {
        $apiKey = $this->createMockApiKey(
            fullPermissions: '0',
            allowedPaths: json_encode(['/api/v3/extensions' => 'write'])
        );

        // Write includes read - should allow GET
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'GET'),
            'Write permission should allow GET (read)'
        );

        // Should allow POST
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'POST'),
            'Write permission should allow POST'
        );

        // Should allow PUT with ID
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions/123', 'PUT'),
            'Write permission should allow PUT with ID'
        );

        // Should allow DELETE with ID
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions/123', 'DELETE'),
            'Write permission should allow DELETE with ID'
        );

        // Should allow PATCH
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions/123', 'PATCH'),
            'Write permission should allow PATCH'
        );
    }

    /**
     * Test 3: API Key with read permission should only allow GET
     *
     * Read permission does NOT include write permission.
     * Only GET requests should be allowed.
     */
    public function testReadPermissionOnlyAllowsGet(): void
    {
        $apiKey = $this->createMockApiKey(
            fullPermissions: '0',
            allowedPaths: json_encode(['/api/v3/extensions' => 'read'])
        );

        // Should allow GET
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'GET'),
            'Read permission should allow GET'
        );

        // Should NOT allow POST
        $this->assertFalse(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'POST'),
            'Read permission should NOT allow POST'
        );

        // Should NOT allow PUT
        $this->assertFalse(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions/123', 'PUT'),
            'Read permission should NOT allow PUT'
        );

        // Should NOT allow DELETE
        $this->assertFalse(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions/123', 'DELETE'),
            'Read permission should NOT allow DELETE'
        );

        // Should NOT allow PATCH
        $this->assertFalse(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions/123', 'PATCH'),
            'Read permission should NOT allow PATCH'
        );
    }

    /**
     * Test 4: API Key without path permission should be denied
     *
     * If a path is not in the allowed_paths list, access should be denied
     * even if other paths are allowed.
     */
    public function testDeniesAccessToUnauthorizedPaths(): void
    {
        $apiKey = $this->createMockApiKey(
            fullPermissions: '0',
            allowedPaths: json_encode(['/api/v3/extensions' => 'write'])
        );

        // Has permission for extensions
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'GET'),
            'Should allow access to authorized path'
        );

        // Does NOT have permission for cdr
        $this->assertFalse(
            $this->checker->checkPermission($apiKey, '/api/v3/cdr', 'GET'),
            'Should deny access to unauthorized path (cdr)'
        );

        // Does NOT have permission for call-queues
        $this->assertFalse(
            $this->checker->checkPermission($apiKey, '/api/v3/call-queues', 'GET'),
            'Should deny access to unauthorized path (call-queues)'
        );
    }

    /**
     * Test 5: API Key with empty allowed_paths should deny all requests
     *
     * When full_permissions='0' and allowed_paths is empty, no access should be granted.
     */
    public function testEmptyPermissionsDeniesAll(): void
    {
        $apiKey = $this->createMockApiKey(
            fullPermissions: '0',
            allowedPaths: ''
        );

        $this->assertFalse(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'GET'),
            'Empty permissions should deny GET'
        );

        $this->assertFalse(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'POST'),
            'Empty permissions should deny POST'
        );
    }

    /**
     * Test 6: API Key with empty JSON object should deny all requests
     */
    public function testEmptyJsonObjectDeniesAll(): void
    {
        $apiKey = $this->createMockApiKey(
            fullPermissions: '0',
            allowedPaths: '{}'
        );

        $this->assertFalse(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'GET'),
            'Empty JSON object should deny GET'
        );
    }

    /**
     * Test 7: Path normalization should handle query parameters
     *
     * Query parameters should be stripped from the path before checking permissions.
     */
    public function testPathNormalizationHandlesQueryParams(): void
    {
        $apiKey = $this->createMockApiKey(
            fullPermissions: '0',
            allowedPaths: json_encode(['/api/v3/extensions' => 'read'])
        );

        // Path with query parameters should be normalized
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions?page=1&limit=10', 'GET'),
            'Should normalize path with query parameters'
        );
    }

    /**
     * Test 8: Path normalization should handle trailing slashes
     *
     * Trailing slashes should be removed for consistent comparison.
     */
    public function testPathNormalizationHandlesTrailingSlash(): void
    {
        $apiKey = $this->createMockApiKey(
            fullPermissions: '0',
            allowedPaths: json_encode(['/api/v3/extensions' => 'read'])
        );

        // Path with trailing slash should be normalized
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions/', 'GET'),
            'Should normalize path with trailing slash'
        );
    }

    /**
     * Test 9: Resource-level paths should match base path permissions
     *
     * Permissions are granted at resource level, not record level.
     * /api/v3/extensions/123 should use permissions from /api/v3/extensions
     */
    public function testResourceLevelPathMatchesBasePath(): void
    {
        $apiKey = $this->createMockApiKey(
            fullPermissions: '0',
            allowedPaths: json_encode(['/api/v3/extensions' => 'read'])
        );

        // Should match base path permission
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions/123', 'GET'),
            'Resource-level path should match base path permission'
        );

        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions/EXTENSION-456', 'GET'),
            'Resource-level path with ID prefix should match base path'
        );
    }

    /**
     * Test 10: Custom methods should match base path permissions
     *
     * Custom methods like :getDefault should be extracted and checked against base path.
     */
    public function testCustomMethodsMatchBasePath(): void
    {
        $apiKey = $this->createMockApiKey(
            fullPermissions: '0',
            allowedPaths: json_encode(['/api/v3/extensions' => 'read'])
        );

        // Custom method on collection
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions:getDefault', 'GET'),
            'Custom method on collection should match base path'
        );

        // Custom method on resource
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions/123:copy', 'GET'),
            'Custom method on resource should match base path'
        );
    }

    /**
     * Test 11: Multiple paths with different permissions
     *
     * API Key can have different permission levels for different paths.
     */
    public function testMultiplePathsWithDifferentPermissions(): void
    {
        $apiKey = $this->createMockApiKey(
            fullPermissions: '0',
            allowedPaths: json_encode([
                '/api/v3/extensions' => 'write',
                '/api/v3/cdr' => 'read',
                '/api/v3/call-queues' => 'write'
            ])
        );

        // Extensions: write (can GET and POST)
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'GET')
        );
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'POST')
        );

        // CDR: read only (can GET, cannot POST)
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/cdr', 'GET')
        );
        $this->assertFalse(
            $this->checker->checkPermission($apiKey, '/api/v3/cdr', 'POST')
        );

        // Call queues: write (can GET and POST)
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/call-queues', 'GET')
        );
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/call-queues', 'POST')
        );

        // Providers: no permission (cannot access)
        $this->assertFalse(
            $this->checker->checkPermission($apiKey, '/api/v3/providers', 'GET')
        );
    }

    /**
     * Test 12: Malformed JSON in allowed_paths should deny access
     *
     * If allowed_paths contains invalid JSON, access should be denied.
     */
    public function testMalformedJsonDeniesAccess(): void
    {
        $apiKey = $this->createMockApiKey(
            fullPermissions: '0',
            allowedPaths: 'this is not valid json {'
        );

        $this->assertFalse(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'GET'),
            'Malformed JSON should deny access'
        );
    }

    /**
     * Test 13: Invalid action values should deny access
     *
     * If allowed_paths contains invalid action values (not 'read' or 'write'),
     * access should be denied.
     */
    public function testInvalidActionValueDeniesAccess(): void
    {
        $apiKey = $this->createMockApiKey(
            fullPermissions: '0',
            allowedPaths: json_encode(['/api/v3/extensions' => 'invalid_action'])
        );

        $this->assertFalse(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'GET'),
            'Invalid action value should deny access'
        );
    }

    /**
     * Test 14: Case sensitivity of HTTP methods
     *
     * HTTP methods should be case-insensitive (handled by match with strtoupper).
     */
    public function testHttpMethodCaseInsensitivity(): void
    {
        $apiKey = $this->createMockApiKey(
            fullPermissions: '0',
            allowedPaths: json_encode(['/api/v3/extensions' => 'read'])
        );

        // Different case variations should all work
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'get')
        );
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'Get')
        );
        $this->assertTrue(
            $this->checker->checkPermission($apiKey, '/api/v3/extensions', 'GET')
        );
    }

    /**
     * Helper: Create mock ApiKeys object
     *
     * Creates a simple stdClass object that mimics ApiKeys structure
     * to avoid Phalcon DI/database dependencies in unit tests.
     *
     * @param string $fullPermissions '0' or '1'
     * @param string $allowedPaths JSON string or empty
     * @return object Mock API Key
     */
    private function createMockApiKey(string $fullPermissions, string $allowedPaths): object
    {
        // Create anonymous class that mimics ApiKeys structure
        return new class($fullPermissions, $allowedPaths) {
            public ?string $id;
            public ?string $full_permissions;
            public ?string $allowed_paths;
            public ?string $description;

            public function __construct(string $fullPermissions, string $allowedPaths)
            {
                $this->id = '1';
                $this->full_permissions = $fullPermissions;
                $this->allowed_paths = $allowedPaths;
                $this->description = 'Test API Key';
            }
        };
    }
}
