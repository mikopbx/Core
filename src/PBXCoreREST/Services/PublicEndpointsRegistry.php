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

use MikoPBX\PBXCoreREST\Attributes\{HttpMapping, ResourceSecurity, SecurityType};

/**
 * Registry for public endpoints discovered from controller attributes
 *
 * This service caches public endpoint information extracted from controller
 * ResourceSecurity attributes during route generation. It provides fast lookup
 * for AuthenticationMiddleware to determine if an endpoint is public without
 * requiring reflection on every request.
 *
 * Supports two levels of public endpoint detection:
 * 1. Resource-level: Entire controller marked as PUBLIC via class attribute
 * 2. Method-level: Individual methods marked as PUBLIC via method attribute
 *
 * @package MikoPBX\PBXCoreREST\Services
 */
class PublicEndpointsRegistry
{
    /**
     * Map of resource path patterns to public status (class-level PUBLIC)
     * Format: ['/pbxcore/api/v3/auth' => true, ...]
     *
     * @var array<string, bool>
     */
    private array $publicResources = [];

    /**
     * Map of full endpoint paths to allowed HTTP methods (method-level PUBLIC)
     * Format: ['/pbxcore/api/v3/wiki-links:getLink' => ['GET'], ...]
     *
     * @var array<string, array<string>>
     */
    private array $publicMethods = [];

    /**
     * Register a public resource (entire controller is public)
     *
     * @param string $resourcePath Full resource path (e.g., '/pbxcore/api/v3/auth')
     */
    public function registerPublicEndpoint(string $resourcePath): void
    {
        $this->publicResources[$resourcePath] = true;
    }

    /**
     * Register a public method endpoint
     *
     * @param string $fullPath Full path including method (e.g., '/pbxcore/api/v3/wiki-links:getLink')
     * @param array<string> $httpMethods Allowed HTTP methods (e.g., ['GET', 'POST'])
     */
    public function registerPublicMethod(string $fullPath, array $httpMethods): void
    {
        $this->publicMethods[$fullPath] = array_map('strtoupper', $httpMethods);
    }

    /**
     * Check if endpoint is public by resource path
     *
     * Checks both resource-level and method-level public endpoints.
     *
     * @param string $uri Request URI
     * @param string|null $httpMethod HTTP method for method-level check (optional)
     * @return bool True if endpoint is public
     */
    public function isPublicEndpoint(string $uri, ?string $httpMethod = null): bool
    {
        // Strategy 1: Check resource-level public endpoints (entire controller is public)
        foreach ($this->publicResources as $path => $isPublic) {
            if ($isPublic && str_starts_with($uri, $path)) {
                return true;
            }
        }

        // Strategy 2: Check method-level public endpoints (specific methods are public)
        foreach ($this->publicMethods as $path => $allowedMethods) {
            if (str_starts_with($uri, $path)) {
                // If no HTTP method specified, just check path match
                if ($httpMethod === null) {
                    return true;
                }
                // Check if HTTP method is allowed
                if (in_array(strtoupper($httpMethod), $allowedMethods, true)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Extract public endpoints from controller class
     *
     * Scans both class-level and method-level ResourceSecurity attributes
     * to detect PUBLIC endpoints.
     *
     * @param string $controllerClass Fully qualified controller class name
     * @param string $resourcePath Resource path for this controller
     */
    public function registerFromController(string $controllerClass, string $resourcePath): void
    {
        if (!class_exists($controllerClass)) {
            return;
        }

        try {
            $reflection = new \ReflectionClass($controllerClass);

            // Check class-level ResourceSecurity for PUBLIC
            $classAttributes = $reflection->getAttributes(ResourceSecurity::class);
            if (!empty($classAttributes)) {
                /** @var ResourceSecurity $resourceSecurity */
                $resourceSecurity = $classAttributes[0]->newInstance();

                if (in_array(SecurityType::PUBLIC, $resourceSecurity->requirements, true)) {
                    $this->registerPublicEndpoint($resourcePath);
                    return; // Entire resource is public, no need to check methods
                }
            }

            // Get HttpMapping to understand custom methods
            $httpMappingAttributes = $reflection->getAttributes(HttpMapping::class);
            $httpMapping = null;
            if (!empty($httpMappingAttributes)) {
                $httpMapping = $httpMappingAttributes[0]->newInstance();
            }

            // Check method-level ResourceSecurity for PUBLIC
            foreach ($reflection->getMethods(\ReflectionMethod::IS_PUBLIC) as $method) {
                $methodAttributes = $method->getAttributes(ResourceSecurity::class);
                if (empty($methodAttributes)) {
                    continue;
                }

                /** @var ResourceSecurity $methodSecurity */
                $methodSecurity = $methodAttributes[0]->newInstance();

                if (!in_array(SecurityType::PUBLIC, $methodSecurity->requirements, true)) {
                    continue;
                }

                // Method is marked as PUBLIC - determine the full path
                $methodName = $method->getName();

                // Determine HTTP methods for this operation
                $httpMethods = $this->getHttpMethodsForOperation($methodName, $httpMapping);

                // Determine if this is a custom method (uses :methodName syntax)
                $isCustomMethod = $httpMapping !== null && $httpMapping->isCustomMethod($methodName);

                if ($isCustomMethod) {
                    // Custom method: /resource:methodName
                    $fullPath = $resourcePath . ':' . $methodName;
                    $this->registerPublicMethod($fullPath, $httpMethods);
                } else {
                    // Standard CRUD method - register the resource path with specific HTTP methods
                    // This is less common but supported
                    $this->registerPublicMethod($resourcePath, $httpMethods);
                }
            }
        } catch (\ReflectionException) {
            // Ignore reflection errors
        }
    }

    /**
     * Get HTTP methods for a specific operation from HttpMapping
     *
     * @param string $operation Operation/method name
     * @param HttpMapping|null $httpMapping HttpMapping attribute instance
     * @return array<string> HTTP methods (defaults to ['GET'] if not found)
     */
    private function getHttpMethodsForOperation(string $operation, ?HttpMapping $httpMapping): array
    {
        if ($httpMapping === null) {
            return ['GET']; // Default to GET
        }

        $method = $httpMapping->getHttpMethodForOperation($operation);
        if ($method !== null) {
            return [$method];
        }

        // If not found in mapping, default to GET
        return ['GET'];
    }

    /**
     * Get all registered public endpoints (both resources and methods)
     *
     * @return array<string>
     */
    public function getAllPublicEndpoints(): array
    {
        $resources = array_keys(array_filter($this->publicResources));
        $methods = array_keys($this->publicMethods);

        return array_merge($resources, $methods);
    }

    /**
     * Get all registered public resources (class-level)
     *
     * @return array<string>
     */
    public function getPublicResources(): array
    {
        return array_keys(array_filter($this->publicResources));
    }

    /**
     * Get all registered public methods (method-level)
     *
     * @return array<string, array<string>> Map of path to HTTP methods
     */
    public function getPublicMethods(): array
    {
        return $this->publicMethods;
    }

    /**
     * Clear all registered endpoints (useful for testing)
     */
    public function clear(): void
    {
        $this->publicResources = [];
        $this->publicMethods = [];
    }
}
