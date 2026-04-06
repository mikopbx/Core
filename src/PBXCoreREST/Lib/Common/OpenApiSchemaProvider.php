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

namespace MikoPBX\PBXCoreREST\Lib\Common;

/**
 * Interface for DataStructure classes that provide OpenAPI schema definitions
 *
 * This interface allows DataStructure classes to define their own OpenAPI schemas
 * for automatic inclusion in the OpenAPI specification. This ensures that the
 * schema definitions are always in sync with the actual data structures returned
 * by the API.
 *
 * Benefits:
 * - Single source of truth: Schema is defined where the data structure is created
 * - Type safety: Clients can generate typed SDKs from the schema
 * - Documentation: Schema provides detailed documentation for API consumers
 * - Validation: OpenAPI tools can validate API responses against the schema
 *
 * @package MikoPBX\PBXCoreREST\Lib\Common
 */
interface OpenApiSchemaProvider
{
    /**
     * Get OpenAPI schema for list item representation
     *
     * Returns the schema for a single item in a list response.
     * This is typically a simplified version with fewer fields than the detail schema.
     *
     * Example usage: GET /api/v3/call-queues (returns array of items)
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array;

    /**
     * Get OpenAPI schema for detailed record representation
     *
     * Returns the schema for a complete record with all fields.
     * This is typically used for single record endpoints.
     *
     * Example usage: GET /api/v3/call-queues/{id} (returns single detailed item)
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array;

    /**
     * Get related schemas that should be registered in OpenAPI components
     *
     * Returns an associative array of additional schemas that are referenced
     * by the main schemas (e.g., nested objects, reusable components).
     *
     * Example:
     * [
     *   'CallQueueMember' => [...schema...],
     *   'CallQueueStrategy' => [...schema...]
     * ]
     *
     * @return array<string, array<string, mixed>> Map of schema name to schema definition
     */
    public static function getRelatedSchemas(): array;
}