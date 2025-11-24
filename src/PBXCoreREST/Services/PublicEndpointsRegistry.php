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

use MikoPBX\PBXCoreREST\Attributes\{ResourceSecurity, SecurityType};

/**
 * Registry for public endpoints discovered from controller attributes
 *
 * This service caches public endpoint information extracted from controller
 * ResourceSecurity attributes during route generation. It provides fast lookup
 * for AuthenticationMiddleware to determine if an endpoint is public without
 * requiring reflection on every request.
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
            $attributes = $reflection->getAttributes(ResourceSecurity::class);

            if (empty($attributes)) {
                return;
            }

            /** @var ResourceSecurity $resourceSecurity */
            $resourceSecurity = $attributes[0]->newInstance();

            // Check if this resource has PUBLIC security requirement
            if (in_array(SecurityType::PUBLIC, $resourceSecurity->requirements, true)) {
                $this->registerPublicEndpoint($resourcePath);
            }
        } catch (\ReflectionException) {
            // Ignore reflection errors
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
