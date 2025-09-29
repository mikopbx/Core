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

namespace MikoPBX\PBXCoreREST\Attributes;

use Attribute;

/**
 * HTTP method mapping attribute for REST API operations
 *
 * Maps HTTP methods to specific API operations and defines which methods
 * require resource IDs for proper REST architecture compliance.
 * Supports automatic route generation with configurable ID patterns.
 *
 * @package MikoPBX\PBXCoreREST\Attributes
 */
#[Attribute(Attribute::TARGET_CLASS | Attribute::TARGET_METHOD)]
class HttpMapping
{
    /**
     * @param array<string, array<string>|string> $mapping HTTP method to operations mapping
     * @param array<string> $resourceLevelMethods Methods that require resource ID
     * @param array<string> $collectionLevelMethods Methods that work on collection
     * @param array<string> $customMethods Custom methods that don't follow standard CRUD
     * @param string|null $idPattern Custom regex pattern for resource IDs (overrides default [^/]+)
     */
    public function __construct(
        public readonly array $mapping = [],
        public readonly array $resourceLevelMethods = [],
        public readonly array $collectionLevelMethods = [],
        public readonly array $customMethods = [],
        public readonly ?string $idPattern = null
    ) {
    }

    /**
     * Get operations for a specific HTTP method
     *
     * @param string $httpMethod HTTP method (GET, POST, PUT, PATCH, DELETE)
     * @return array<string> List of operations for this method
     */
    public function getOperationsForMethod(string $httpMethod): array
    {
        $operations = $this->mapping[strtoupper($httpMethod)] ?? [];

        if (is_string($operations)) {
            return [$operations];
        }

        return $operations;
    }

    /**
     * Check if an operation requires a resource ID
     *
     * @param string $operation Operation name
     * @return bool True if operation requires resource ID
     */
    public function requiresResourceId(string $operation): bool
    {
        return in_array($operation, $this->resourceLevelMethods, true);
    }

    /**
     * Check if an operation works on collection level
     *
     * @param string $operation Operation name
     * @return bool True if operation works on collection
     */
    public function isCollectionLevel(string $operation): bool
    {
        return in_array($operation, $this->collectionLevelMethods, true);
    }

    /**
     * Check if an operation is a custom method
     *
     * @param string $operation Operation name
     * @return bool True if operation is custom
     */
    public function isCustomMethod(string $operation): bool
    {
        return in_array($operation, $this->customMethods, true);
    }

    /**
     * Get all available operations
     *
     * @return array<string> All operations across all HTTP methods
     */
    public function getAllOperations(): array
    {
        $operations = [];

        foreach ($this->mapping as $method => $ops) {
            if (is_string($ops)) {
                $operations[] = $ops;
            } else {
                $operations = array_merge($operations, $ops);
            }
        }

        return array_unique($operations);
    }

    /**
     * Get HTTP method for a specific operation
     *
     * @param string $operation Operation name
     * @return string|null HTTP method or null if not found
     */
    public function getHttpMethodForOperation(string $operation): ?string
    {
        foreach ($this->mapping as $method => $operations) {
            $ops = is_string($operations) ? [$operations] : $operations;

            if (in_array($operation, $ops, true)) {
                return strtoupper($method);
            }
        }

        return null;
    }

    /**
     * Get the custom ID pattern or default
     */
    public function getIdPattern(): string
    {
        return $this->idPattern ?? '[^/]+';
    }

    /**
     * Get mapping configuration for OpenAPI generation
     *
     * @return array<string, mixed> Mapping configuration
     */
    public function getOpenApiMapping(): array
    {
        return [
            'mapping' => $this->mapping,
            'resourceLevel' => $this->resourceLevelMethods,
            'collectionLevel' => $this->collectionLevelMethods,
            'custom' => $this->customMethods,
            'idPattern' => $this->getIdPattern()
        ];
    }
}