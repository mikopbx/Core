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
 * Attribute to specify the data schema for API response
 *
 * This attribute links an API response to a specific DataStructure class
 * that provides OpenAPI schema definitions. This allows automatic generation
 * of typed schemas in the OpenAPI specification.
 *
 * Schema naming convention:
 * - Automatically derives name from namespace (CallQueues → CallQueue)
 * - detail type: Main resource name (e.g., "CallQueue")
 * - list type: Resource name + "ListItem" suffix (e.g., "CallQueueListItem")
 * - custom schemaName: Use explicit name if provided
 *
 * How naming works:
 * - Takes parent namespace from DataStructure class
 * - Converts plural to singular (CallQueues → CallQueue, ApiKeys → ApiKey)
 * - Adds suffix based on type (list adds "ListItem", detail has no suffix)
 *
 * Usage:
 * ```php
 * // List endpoint - generates "CallQueueListItem" schema
 * #[ApiDataSchema(
 *     schemaClass: DataStructure::class,
 *     type: 'list',
 *     isArray: true
 * )]
 *
 * // Detail endpoint - generates "CallQueue" schema
 * #[ApiDataSchema(
 *     schemaClass: DataStructure::class,
 *     type: 'detail'
 * )]
 *
 * // Custom schema name
 * #[ApiDataSchema(
 *     schemaClass: DataStructure::class,
 *     type: 'detail',
 *     schemaName: 'CallQueueSummary'
 * )]
 * ```
 *
 * @package MikoPBX\PBXCoreREST\Attributes
 */
#[Attribute(Attribute::TARGET_METHOD)]
class ApiDataSchema
{
    /**
     * @param class-string $schemaClass DataStructure class that implements OpenApiSchemaProvider
     * @param string $type Schema type: 'list', 'detail', or 'custom'
     * @param string|null $schemaName Optional custom schema name for OpenAPI components
     * @param bool $isArray Whether the data is an array of items (true for list endpoints)
     */
    public function __construct(
        public readonly string $schemaClass,
        public readonly string $type = 'detail',
        public readonly ?string $schemaName = null,
        public readonly bool $isArray = false
    ) {
    }

    /**
     * Get the schema name for OpenAPI components
     *
     * If custom schemaName is provided, uses it. Otherwise, generates
     * a name from the namespace and type.
     *
     * For classes like `MikoPBX\PBXCoreREST\Lib\CallQueues\DataStructure`,
     * uses the parent namespace (CallQueues) as the base name and converts
     * to singular form for the schema name.
     *
     * @return string Schema name
     */
    public function getSchemaName(): string
    {
        if ($this->schemaName !== null) {
            return $this->schemaName;
        }

        // Extract namespace parts from fully qualified class name
        // Example: MikoPBX\PBXCoreREST\Lib\CallQueues\DataStructure
        $parts = explode('\\', $this->schemaClass);

        // Get the parent namespace name (second to last part)
        // For CallQueues\DataStructure, this will be "CallQueues"
        $namespaceName = count($parts) >= 2 ? $parts[count($parts) - 2] : end($parts);

        // Convert plural namespace to singular for schema name
        // CallQueues -> CallQueue, ApiKeys -> ApiKey, etc.
        $baseName = $this->convertToSingular($namespaceName);

        // Build schema name based on type following OpenAPI naming conventions:
        // - detail: Main schema without suffix (e.g., "CallQueue")
        // - list: List item schema with "ListItem" suffix (e.g., "CallQueueListItem")
        // - custom: Base name without suffix
        return match ($this->type) {
            'list' => "{$baseName}ListItem",
            'detail' => $baseName,  // No suffix for main schema
            default => $baseName
        };
    }

    /**
     * Convert plural resource name to singular for schema naming
     *
     * Handles common English pluralization patterns used in MikoPBX namespaces.
     *
     * @param string $plural Plural name (e.g., "CallQueues", "ApiKeys")
     * @return string Singular name (e.g., "CallQueue", "ApiKey")
     */
    private function convertToSingular(string $plural): string
    {
        // Handle special cases first
        $specialCases = [
            'ApiKeys' => 'ApiKey',
            'CallQueues' => 'CallQueue',
            'IncomingRoutes' => 'IncomingRoute',
            'OutboundRoutes' => 'OutboundRoute',
            'ConferenceRooms' => 'ConferenceRoom',
            'SoundFiles' => 'SoundFile',
            'CustomFiles' => 'CustomFile',
            'DialplanApplications' => 'DialplanApplication',
            'AsteriskManagers' => 'AsteriskManager',
            'Employees' => 'Employee',
        ];

        if (isset($specialCases[$plural])) {
            return $specialCases[$plural];
        }

        // General rule: remove trailing 's'
        if (str_ends_with($plural, 's')) {
            return substr($plural, 0, -1);
        }

        return $plural;
    }

    /**
     * Check if the schema class implements OpenApiSchemaProvider
     *
     * @return bool True if the class implements the interface
     */
    public function isValidSchemaClass(): bool
    {
        if (!class_exists($this->schemaClass)) {
            return false;
        }

        $interfaces = class_implements($this->schemaClass);
        return isset($interfaces['MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider']);
    }
}