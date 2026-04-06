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
 * Supports both class-level and method-level PUBLIC attributes:
 * - Class-level: Registers entire resource path as public
 * - Method-level: Registers specific custom method routes (e.g., /path:methodName)
 *
 * @package MikoPBX\PBXCoreREST\Services
 */
class PublicEndpointsRegistry
{
    /**
     * Map of resource path patterns to public status
     * Format: ['/pbxcore/api/v3/auth' => true, ...]
     *
     * @var array<string, bool>
     */
    private array $publicEndpoints = [];

    /**
     * Register a public endpoint
     *
     * @param string $resourcePath Full resource path (e.g., '/pbxcore/api/v3/auth')
     */
    public function registerPublicEndpoint(string $resourcePath): void
    {
        $this->publicEndpoints[$resourcePath] = true;
    }

    /**
     * Check if endpoint is public by resource path
     *
     * @param string $uri Request URI
     * @return bool True if endpoint is public
     */
    public function isPublicEndpoint(string $uri): bool
    {
        // Direct match
        foreach ($this->publicEndpoints as $path => $isPublic) {
            if ($isPublic && str_starts_with($uri, $path)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Extract public endpoints from controller class
     *
     * Scans both class-level and method-level ResourceSecurity attributes:
     * - Class-level PUBLIC: Registers entire resource path
     * - Method-level PUBLIC: Registers specific custom method routes
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

            // Check class-level security first
            $classAttributes = $reflection->getAttributes(ResourceSecurity::class);
            if (!empty($classAttributes)) {
                /** @var ResourceSecurity $resourceSecurity */
                $resourceSecurity = $classAttributes[0]->newInstance();

                // If entire resource is PUBLIC, register base path and return
                if (in_array(SecurityType::PUBLIC, $resourceSecurity->requirements, true)) {
                    $this->registerPublicEndpoint($resourcePath);
                    return;
                }
            }

            // Class-level is not PUBLIC, check method-level attributes
            $this->registerMethodLevelPublicEndpoints($reflection, $resourcePath);
        } catch (\ReflectionException) {
            // Ignore reflection errors
        }
    }

    /**
     * Scan methods for PUBLIC security attributes and register them
     *
     * @param \ReflectionClass $reflection Controller reflection
     * @param string $resourcePath Base resource path
     */
    private function registerMethodLevelPublicEndpoints(\ReflectionClass $reflection, string $resourcePath): void
    {
        // Get HttpMapping to determine which methods are custom methods
        $httpMappingAttrs = $reflection->getAttributes(HttpMapping::class);
        $customMethods = [];
        if (!empty($httpMappingAttrs)) {
            /** @var HttpMapping $httpMapping */
            $httpMapping = $httpMappingAttrs[0]->newInstance();
            $customMethods = $httpMapping->customMethods;
        }

        // Scan all public methods
        $methods = $reflection->getMethods(\ReflectionMethod::IS_PUBLIC);
        foreach ($methods as $method) {
            // Skip inherited methods and constructor
            if ($method->getDeclaringClass()->getName() !== $reflection->getName()) {
                continue;
            }
            if ($method->isConstructor()) {
                continue;
            }

            $methodAttributes = $method->getAttributes(ResourceSecurity::class);
            if (empty($methodAttributes)) {
                continue;
            }

            /** @var ResourceSecurity $methodSecurity */
            $methodSecurity = $methodAttributes[0]->newInstance();

            if (!in_array(SecurityType::PUBLIC, $methodSecurity->requirements, true)) {
                continue;
            }

            // Method has PUBLIC security - construct and register the route
            $methodName = $method->getName();

            // Custom methods use :methodName suffix
            if (in_array($methodName, $customMethods, true)) {
                $methodRoute = $resourcePath . ':' . $methodName;
                $this->registerPublicEndpoint($methodRoute);
            }
            // Standard CRUD methods (getList, getRecord, create, update, patch, delete)
            // These use the base resource path which is already checked at class level
            // If class is not PUBLIC, individual CRUD methods can't be PUBLIC
            // (this is by design - use a separate controller for public CRUD)
        }
    }

    /**
     * Get all registered public endpoints
     *
     * @return array<string>
     */
    public function getAllPublicEndpoints(): array
    {
        return array_keys(array_filter($this->publicEndpoints));
    }

    /**
     * Clear all registered endpoints (useful for testing)
     */
    public function clear(): void
    {
        $this->publicEndpoints = [];
    }
}
