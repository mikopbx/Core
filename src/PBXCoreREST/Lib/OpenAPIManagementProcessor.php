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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\OpenAPI\GetSpecificationAction;
use MikoPBX\PBXCoreREST\Lib\OpenAPI\GetAclRulesAction;
use MikoPBX\PBXCoreREST\Lib\OpenAPI\GetValidationSchemasAction;
use MikoPBX\PBXCoreREST\Lib\OpenAPI\GetSimplifiedPermissionsAction;
use MikoPBX\PBXCoreREST\Lib\OpenAPI\GetDetailedPermissionsAction;
use MikoPBX\PBXCoreREST\Lib\OpenAPI\ClearCacheAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for OpenAPI management
 */
enum OpenAPIAction: string
{
    // Custom methods - main functionality
    case GET_SPECIFICATION = 'getSpecification';
    case GET_ACL_RULES = 'getAclRules';
    case GET_VALIDATION_SCHEMAS = 'getValidationSchemas';
    case GET_SIMPLIFIED_PERMISSIONS = 'getSimplifiedPermissions';
    case GET_DETAILED_PERMISSIONS = 'getDetailedPermissions';
    case CLEAR_CACHE = 'clearCache';
}

/**
 * OpenAPI management processor (Singleton resource)
 *
 * Handles all OpenAPI specification and metadata operations as a singleton resource
 * There's only one OpenAPI configuration in the system
 *
 * RESTful API mapping:
 * - GET /openapi:getSpecification           -> getSpecification (retrieve OpenAPI specification)
 * - GET /openapi:getAclRules                -> getAclRules (get ACL rules)
 * - GET /openapi:getValidationSchemas       -> getValidationSchemas (get validation schemas)
 * - GET /openapi:getSimplifiedPermissions   -> getSimplifiedPermissions (get simplified permissions for API Keys)
 * - GET /openapi:getDetailedPermissions     -> getDetailedPermissions (get detailed permissions for ACL tree)
 * - POST /openapi:clearCache                -> clearCache (clear metadata cache)
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class OpenAPIManagementProcessor extends Injectable
{
    /**
     * Processes OpenAPI management requests with type-safe enum matching
     *
     * @param array<string, mixed> $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = $request['action'];
        $data = $request['data'];

        // Type-safe action matching with enum
        $action = OpenAPIAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            OpenAPIAction::GET_SPECIFICATION => GetSpecificationAction::main($data),
            OpenAPIAction::GET_ACL_RULES => GetAclRulesAction::main(),
            OpenAPIAction::GET_VALIDATION_SCHEMAS => GetValidationSchemasAction::main(),
            OpenAPIAction::GET_SIMPLIFIED_PERMISSIONS => GetSimplifiedPermissionsAction::main(),
            OpenAPIAction::GET_DETAILED_PERMISSIONS => GetDetailedPermissionsAction::main(),
            OpenAPIAction::CLEAR_CACHE => ClearCacheAction::main(),
        };

        $res->function = $actionString;
        return $res;
    }
}