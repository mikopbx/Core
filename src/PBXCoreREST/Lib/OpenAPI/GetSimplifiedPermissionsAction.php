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

namespace MikoPBX\PBXCoreREST\Lib\OpenAPI;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Services\ApiMetadataRegistry;

/**
 * Get simplified permissions structure for API Keys management UI
 *
 * Returns a simplified, grouped view of REST API endpoints suitable for
 * UI permission selector. Groups endpoints by resource path and action type (read/write).
 *
 * @package MikoPBX\PBXCoreREST\Lib\OpenAPI
 */
class GetSimplifiedPermissionsAction
{
    /**
     * Get simplified permissions structure
     *
     * Automatically discovers all REST API controllers and generates
     * a simplified permission structure grouped by resource path and action type.
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();

        try {
            // Automatically discover all controllers
            $controllers = ControllerDiscovery::discoverAll();

            // Create metadata registry instance
            $registry = new ApiMetadataRegistry();

            // Scan controllers for metadata
            $metadata = $registry->scanControllers($controllers);

            // Generate simplified permissions structure
            $simplifiedPermissions = self::generateSimplifiedStructure($metadata);

            $res->data = $simplifiedPermissions;
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = 'Failed to generate simplified permissions: ' . $e->getMessage();
        }

        return $res;
    }

    /**
     * Generate simplified permissions structure from metadata
     *
     * Groups endpoints by resource path and action type (read/write).
     * Maps HTTP methods to action types:
     * - GET → read
     * - POST, PUT, PATCH, DELETE → write
     *
     * @param array<string, mixed> $metadata Scanned metadata from ApiMetadataRegistry
     * @return array<string, mixed> Simplified permissions structure
     */
    private static function generateSimplifiedStructure(array $metadata): array
    {
        $resources = [];

        foreach ($metadata['resources'] ?? [] as $resource) {
            $resourceData = $resource['resource'] ?? [];
            $httpMapping = $resource['httpMapping'] ?? [];

            // Extract resource path and remove /pbxcore prefix for permissions
            $path = $resourceData['path'] ?? '';
            if (empty($path)) {
                continue;
            }

            // Remove /pbxcore prefix for permission validation
            // Path in metadata: /pbxcore/api/v3/extensions
            // Path for permissions: /api/v3/extensions
            $path = preg_replace('#^/pbxcore#', '', $path);

            // Extract label from first tag (e.g., "Extensions", "Call Queues")
            $tags = $resourceData['tags'] ?? [];
            $label = !empty($tags) ? $tags[0] : '';

            // Extract description
            $description = $resourceData['description'] ?? '';

            // Initialize resource entry
            $resourceEntry = [
                'path' => $path,
                'label' => $label,
                'description' => $description,
                'available_actions' => [],
                'endpoints' => [
                    'read' => [],
                    'write' => []
                ]
            ];

            // Group operations by HTTP method → action type
            $mapping = $httpMapping['mapping'] ?? [];

            foreach ($mapping as $httpMethod => $operations) {
                $ops = is_string($operations) ? [$operations] : $operations;

                // Determine action type from HTTP method
                $actionType = self::mapHttpMethodToAction($httpMethod);

                // Collect endpoints for this action type
                foreach ($ops as $operationName) {
                    // Determine if operation is resource-level (requires {id})
                    $isResourceLevel = in_array(
                        $operationName,
                        $httpMapping['resourceLevel'] ?? []
                    );

                    // Build endpoint string
                    $endpoint = self::buildEndpointString(
                        $httpMethod,
                        $path,
                        $isResourceLevel
                    );

                    // Add to appropriate action type array
                    if (!in_array($endpoint, $resourceEntry['endpoints'][$actionType])) {
                        $resourceEntry['endpoints'][$actionType][] = $endpoint;
                    }
                }
            }

            // Handle custom methods
            foreach ($httpMapping['custom'] ?? [] as $customMethod) {
                // Determine HTTP method for custom operation
                $httpMethod = 'GET'; // default
                foreach ($mapping as $method => $operations) {
                    $ops = is_string($operations) ? [$operations] : $operations;
                    if (in_array($customMethod, $ops)) {
                        $httpMethod = $method;
                        break;
                    }
                }

                $actionType = self::mapHttpMethodToAction($httpMethod);

                // Check if custom method is resource-level
                $isResourceLevel = in_array(
                    $customMethod,
                    $httpMapping['resourceLevel'] ?? []
                );

                // Custom methods use :method syntax
                $customPath = $isResourceLevel ?
                    $path . '/{id}:' . $customMethod :
                    $path . ':' . $customMethod;

                $endpoint = $httpMethod . ' ' . $customPath;

                if (!in_array($endpoint, $resourceEntry['endpoints'][$actionType])) {
                    $resourceEntry['endpoints'][$actionType][] = $endpoint;
                }
            }

            // Determine available actions based on endpoints
            if (!empty($resourceEntry['endpoints']['read'])) {
                $resourceEntry['available_actions'][] = 'read';
            }
            if (!empty($resourceEntry['endpoints']['write'])) {
                $resourceEntry['available_actions'][] = 'write';
            }

            // Remove empty endpoint arrays
            if (empty($resourceEntry['endpoints']['read'])) {
                unset($resourceEntry['endpoints']['read']);
            }
            if (empty($resourceEntry['endpoints']['write'])) {
                unset($resourceEntry['endpoints']['write']);
            }

            // Only add resource if it has operations
            if (!empty($resourceEntry['available_actions'])) {
                $resources[$path] = $resourceEntry;
            }
        }

        return [
            'resources' => $resources,
            'action_descriptions' => [
                'read' => 'View and list resources (GET requests)',
                'write' => 'Create, update, and delete resources (POST, PUT, DELETE, PATCH)'
            ]
        ];
    }

    /**
     * Map HTTP method to action type
     *
     * @param string $httpMethod HTTP method (GET, POST, PUT, PATCH, DELETE)
     * @return string Action type ('read' or 'write')
     */
    private static function mapHttpMethodToAction(string $httpMethod): string
    {
        $method = strtoupper($httpMethod);

        return match($method) {
            'GET' => 'read',
            'POST', 'PUT', 'PATCH', 'DELETE' => 'write',
            default => 'read'
        };
    }

    /**
     * Build endpoint string for display
     *
     * @param string $httpMethod HTTP method
     * @param string $path Resource path
     * @param bool $isResourceLevel Whether endpoint requires {id}
     * @return string Endpoint string (e.g., "GET /api/v3/extensions/{id}")
     */
    private static function buildEndpointString(
        string $httpMethod,
        string $path,
        bool $isResourceLevel
    ): string {
        $displayPath = $isResourceLevel ? $path . '/{id}' : $path;
        return strtoupper($httpMethod) . ' ' . $displayPath;
    }
}
