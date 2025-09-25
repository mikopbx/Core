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

namespace MikoPBX\PBXCoreREST\Lib;

/**
 * Helper class for building RESTful API routes following Google API Design Guide
 * 
 * This class simplifies the creation of standard CRUD and custom method routes
 * for v3 REST API endpoints, reducing repetition and ensuring consistency.
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class RestfulRouteBuilder
{
    /**
     * Default ID patterns for different resource types
     */
    private const ID_PATTERNS = [
        'numeric' => '[0-9]+',
        'alphanumeric' => '[a-zA-Z0-9\-]+',
        'uuid' => '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'
    ];

    /**
     * Build complete RESTful routes for a resource
     * 
     * @param string $controllerClass Fully qualified controller class name
     * @param string $resourcePath API resource path (e.g., '/pbxcore/api/v3/employees')
     * @param array $options Configuration options:
     *                       - idPattern: 'numeric', 'alphanumeric', 'uuid', or custom regex (default: 'numeric')
     *                       - includeCustomMethods: bool - whether to include custom method routes (default: true)
     *                       - customMethodsGET: array - list of GET custom methods (default: standard set)
     *                       - customMethodsPOST: array - list of POST custom methods (default: standard set)
     *                       - resourceLevelCustomMethods: bool - whether to include resource-level custom methods (default: true)
     * @return array Array of route definitions
     */
    public static function buildRoutes(string $controllerClass, string $resourcePath, array $options = []): array
    {
        $routes = [];
        
        // Determine ID pattern
        $idPattern = self::getIdPattern($options['idPattern'] ?? 'numeric');
        
        // Include custom methods by default
        $includeCustomMethods = $options['includeCustomMethods'] ?? true;
        $resourceLevelCustomMethods = $options['resourceLevelCustomMethods'] ?? true;
        
        if ($includeCustomMethods) {
            // Add custom method routes (must be before standard CRUD routes)
            $routes = array_merge(
                $routes, 
                self::buildCustomMethodRoutes($controllerClass, $resourcePath, $idPattern, $resourceLevelCustomMethods)
            );
        }
        
        // Add standard CRUD routes
        $routes = array_merge(
            $routes,
            self::buildCRUDRoutes($controllerClass, $resourcePath, $idPattern)
        );
        
        return $routes;
    }
    
    /**
     * Build only CRUD routes for a resource
     * 
     * @param string $controllerClass Controller class name
     * @param string $resourcePath Resource path
     * @param string $idPattern ID pattern regex
     * @return array Array of CRUD route definitions
     */
    public static function buildCRUDRoutes(string $controllerClass, string $resourcePath, string $idPattern = '[0-9]+'): array
    {
        return [
            // GET /resource - List all resources
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'get', '/'],
            // GET /resource/{id} - Get specific resource
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'get', "/{id:$idPattern}"],
            // POST /resource - Create new resource
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'post', '/'],
            // PUT /resource/{id} - Full update (replace)
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'put', "/{id:$idPattern}"],
            // PATCH /resource/{id} - Partial update
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'patch', "/{id:$idPattern}"],
            // DELETE /resource/{id} - Delete resource
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'delete', "/{id:$idPattern}"],
        ];
    }
    
    /**
     * Build custom method routes following Google API Design Guide
     * 
     * @param string $controllerClass Controller class name
     * @param string $resourcePath Resource path
     * @param string $idPattern ID pattern regex
     * @param bool $includeResourceLevel Whether to include resource-level custom methods
     * @return array Array of custom method route definitions
     */
    public static function buildCustomMethodRoutes(
        string $controllerClass, 
        string $resourcePath, 
        string $idPattern = '[0-9]+',
        bool $includeResourceLevel = true
    ): array {
        $routes = [
            // Collection-level custom methods
            // GET /resource:customMethod
            [$controllerClass, 'handleCustomRequest', $resourcePath, 'get', ':{customMethod:[a-zA-Z0-9]+}'],
            // POST /resource:customMethod
            [$controllerClass, 'handleCustomRequest', $resourcePath, 'post', ':{customMethod:[a-zA-Z0-9]+}'],
        ];
        
        if ($includeResourceLevel) {
            // Resource-level custom methods
            // GET /resource/{id}:customMethod
            $routes[] = [$controllerClass, 'handleResourceCustomRequest', $resourcePath, 'get', "/{id:$idPattern}:{customMethod:[a-zA-Z0-9]+}"];
            // POST /resource/{id}:customMethod
            $routes[] = [$controllerClass, 'handleResourceCustomRequest', $resourcePath, 'post', "/{id:$idPattern}:{customMethod:[a-zA-Z0-9]+}"];
        }
        
        return $routes;
    }
    
    /**
     * Build routes for a resource with only custom methods (no CRUD)
     *
     * @param string $controllerClass Controller class name
     * @param string $resourcePath Resource path
     * @param array $options Configuration options:
     *                       - includeResourceLevel: bool - whether to include resource-level custom methods (default: false)
     *                       - idPattern: string - ID pattern type ('numeric', 'alphanumeric') or custom regex (default: 'alphanumeric')
     *                       - httpMethods: array - HTTP methods to support for custom routes (default: ['GET', 'POST'])
     * @return array Array of custom-only route definitions
     */
    public static function buildCustomOnlyRoutes(string $controllerClass, string $resourcePath, array $options = []): array
    {
        $includeResourceLevel = $options['includeResourceLevel'] ?? false;
        $idPattern = self::getIdPattern($options['idPattern'] ?? 'alphanumeric');

        return self::buildCustomMethodRoutes($controllerClass, $resourcePath, $idPattern, $includeResourceLevel);
    }

    /**
     * Build routes for a singleton resource (no ID in path)
     *
     * Singleton resources represent single instances that don't need IDs.
     * Examples: general-settings, system-status, current-user
     *
     * @param string $controllerClass Controller class name
     * @param string $resourcePath Resource path
     * @param array $options Configuration options:
     *                       - includeCustomMethods: bool - whether to include custom method routes (default: true)
     * @return array Array of singleton route definitions
     */
    public static function buildSingletonRoutes(string $controllerClass, string $resourcePath, array $options = []): array
    {
        $routes = [];

        // Include custom methods by default
        $includeCustomMethods = $options['includeCustomMethods'] ?? true;

        if ($includeCustomMethods) {
            // Add custom method routes for singleton (no resource-level methods)
            $routes = array_merge($routes, [
                // GET /resource:customMethod
                [$controllerClass, 'handleCustomRequest', $resourcePath, 'get', ':{customMethod:[a-zA-Z0-9]+}'],
                // POST /resource:customMethod
                [$controllerClass, 'handleCustomRequest', $resourcePath, 'post', ':{customMethod:[a-zA-Z0-9]+}'],
            ]);
        }

        // Add singleton CRUD routes (without ID)
        $routes = array_merge($routes, [
            // GET /resource - Get the singleton resource
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'get', '/'],
            // PUT /resource - Full update (replace entire resource)
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'put', '/'],
            // PATCH /resource - Partial update
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'patch', '/'],
            // POST /resource - For singleton resources, POST can be used for reset or special actions
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'post', '/'],
            // DELETE /resource - Reset to defaults or clear
            [$controllerClass, 'handleCRUDRequest', $resourcePath, 'delete', '/'],
        ]);

        return $routes;
    }
    
    /**
     * Get ID pattern based on type or custom pattern
     * 
     * @param string $pattern Pattern type or custom regex
     * @return string Regex pattern for ID matching
     */
    private static function getIdPattern(string $pattern): string
    {
        return self::ID_PATTERNS[$pattern] ?? $pattern;
    }
    
    /**
     * Build a batch of RESTful routes for multiple resources with same configuration
     * 
     * @param array $resources Array of [controllerClass => resourcePath] pairs
     * @param array $options Common options for all resources
     * @return array Combined array of all route definitions
     */
    public static function buildBatchRoutes(array $resources, array $options = []): array
    {
        $routes = [];
        
        foreach ($resources as $controllerClass => $resourcePath) {
            $routes = array_merge(
                $routes,
                self::buildRoutes($controllerClass, $resourcePath, $options)
            );
        }
        
        return $routes;
    }
}