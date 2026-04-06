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

/**
 * Clear metadata cache action
 *
 * Clears the cached API metadata to force re-scanning of controllers
 *
 * @package MikoPBX\PBXCoreREST\Lib\OpenAPI
 */
class ClearCacheAction
{
    /**
     * Clear API metadata cache
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();

        try {
            // Create metadata registry instance directly
            $registry = new ApiMetadataRegistry();

            // Clear the cache
            $registry->clearCache();

            $res->data = ['message' => 'API metadata cache cleared successfully'];
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = 'Failed to clear cache: ' . $e->getMessage();
        }

        return $res;
    }
}