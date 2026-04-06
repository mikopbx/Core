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

namespace MikoPBX\PBXCoreREST\Lib\Sysinfo;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;

/**
 * Data structure for System Information
 *
 * Singleton resource providing read-only system information and diagnostics.
 * No database model - all data is dynamically generated from system state.
 *
 * Implements OpenApiSchemaProvider for documentation purposes, although
 * Sysinfo has custom methods with their own response structures.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Sysinfo
 */
class DataStructure extends AbstractDataStructure implements \MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider
{
    /**
     * Get OpenAPI schema for list (not used for singleton resource)
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => []
        ];
    }

    /**
     * Get OpenAPI schema for detail (not used for singleton resource)
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => []
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * Sysinfo does not have nested objects in its base structure.
     * Each custom method (getInfo, getExternalIpInfo, etc.) has its own response structure.
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        return [];
    }

    /**
     * Get all field definitions with complete metadata
     *
     * Single Source of Truth for ALL field definitions.
     * Each field includes type, validation, sanitization, and examples.
     *
     * Sysinfo is a singleton resource with no request parameters and no persistent model.
     * All data is dynamically generated from system state.
     * Each custom method has its own response structure.
     *
     * @return array<string, array<string, mixed>> Complete field definitions
     */
    private static function getAllFieldDefinitions(): array
    {
        return [
            // No persistent fields - singleton resource with dynamic responses
            // Each custom method (getInfo, getExternalIpInfo, getHypervisorInfo, getDMIInfo)
            // has its own unique response structure defined in the Action class
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes system information definitions.
     * Sysinfo is a singleton resource with no request parameters (read-only).
     * No persistent data model - all responses are dynamically generated.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        return [
            // ========== REQUEST PARAMETERS ==========
            // Singleton resource with no request parameters
            // All methods are read-only GET requests with custom logic
            'request' => [],

            // ========== RESPONSE-ONLY FIELDS ==========
            // Singleton resource has no persistent data model
            // Responses are generated dynamically from system state
            // Each custom method has its own response structure:
            // - getInfo: Complete system information
            // - getExternalIpInfo: External IP address details
            // - getHypervisorInfo: Virtualization platform info
            // - getDMIInfo: DMI/SMBIOS hardware information
            'response' => []
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}
