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

namespace MikoPBX\PBXCoreREST\Lib\NetworkFilters;

use MikoPBX\PBXCoreREST\Lib\Firewall\DataStructure as FirewallDataStructure;

/**
 * Data structure for Network Filters with OpenAPI schema support
 *
 * NetworkFilters uses the same data model as Firewall (NetworkFilters model),
 * so we extend Firewall DataStructure for consistency.
 *
 * This provides read-only access to network filters for dropdown lists.
 * For create/update/delete operations, use the Firewall API.
 *
 * @package MikoPBX\PBXCoreREST\Lib\NetworkFilters
 */
class DataStructure extends FirewallDataStructure
{
    // ========== INHERITED METHODS FROM FIREWALL ==========
    // This class inherits ALL methods from Firewall\DataStructure, including:
    //
    // Data Creation:
    // - createFromModel()         - Create full data structure from model
    // - createForList()           - Create simplified list view structure
    // - createDefault()           - Create default structure for new records
    //
    // OpenAPI Schema (Single Source of Truth):
    // - getAllFieldDefinitions()   - PRIVATE: Complete field definitions
    // - getParameterDefinitions()  - PUBLIC: Request/response parameters
    // - getListItemSchema()        - Schema for list items
    // - getDetailSchema()          - Schema for detail records
    //
    // Validation & Sanitization:
    // - getSanitizationRules()     - Auto-generated from definitions
    // - formatBySchema()           - Apply type conversions
    //
    // Search:
    // - generateAutoSearchIndex()  - Generate search index
    //
    // WHY NO OVERRIDE:
    // NetworkFilters and Firewall share the same database model (NetworkFilters)
    // and the same field structure. The only difference is the API endpoint name.
    // All field definitions from getAllFieldDefinitions() are inherited correctly.

    /**
     * Get parameter definitions (extends parent with NetworkFilters-specific parameters)
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        $definitions = parent::getParameterDefinitions();

        // Add NetworkFilters-specific parameters for getForSelect custom method
        $definitions['related']['category'] = [
            'type' => 'string',
            'description' => 'rest_param_nf_category',
            'enum' => ['SIP', 'IAX', 'AMI', 'API'],
            'sanitize' => 'string',
            'example' => 'SIP'
        ];

        $definitions['related']['includeLocalhost'] = [
            'type' => 'boolean',
            'description' => 'rest_param_nf_includeLocalhost',
            'default' => false,
            'sanitize' => 'bool',
            'example' => true
        ];

        return $definitions;
    }
}
