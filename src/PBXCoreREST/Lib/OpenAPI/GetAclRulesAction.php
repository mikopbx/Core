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

namespace MikoPBX\PBXCoreREST\Lib\OpenAPI;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Services\ApiMetadataRegistry;
use MikoPBX\PBXCoreREST\Lib\OpenAPI\ControllerDiscovery;

/**
 * Get ACL rules extracted from API metadata
 *
 * Returns ACL rules extracted from API attributes for integration with MikoPBX ACL system
 *
 * @package MikoPBX\PBXCoreREST\Lib\OpenAPI
 */
class GetAclRulesAction
{
    /**
     * Get ACL rules extracted from API metadata
     *
     * Automatically discovers all REST API controllers and extracts their ACL rules
     * from API attributes for integration with MikoPBX ACL system.
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();

        try {
            // Automatically discover all controllers
            $controllers = ControllerDiscovery::discoverAll();

            // Create metadata registry instance directly
            $registry = new ApiMetadataRegistry();

            // Scan controllers and extract ACL rules
            $metadata = $registry->scanControllers($controllers);
            $aclRules = $registry->extractACLRules($metadata);

            $res->data = $aclRules;
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = 'Failed to extract ACL rules: ' . $e->getMessage();
        }

        return $res;
    }
}