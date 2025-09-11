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

namespace MikoPBX\PBXCoreREST\Lib\ApiKeys;

use MikoPBX\Common\Models\ApiKeys;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;

/**
 * Action for getting single API key record
 * 
 * @api {get} /pbxcore/api/v2/api-keys/getRecord Get single API key record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup ApiKeys
 * 
 * @apiParam {String} id API key ID
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data API key record
 */
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Get single API key record by ID or create new structure
     * 
     * @param string|null $id API key ID
     * @return PBXApiResult
     */
    public static function main(?string $id): PBXApiResult
    {
        // Use simplified get record from parent class
        // API keys don't need extension numbers, so needsExtension is false
        return self::executeStandardGetRecord(
            $id,
            ApiKeys::class,
            DataStructure::class,
            'APIKEY-',                          // Unique ID prefix
            [                                   // Default values for new records
                'description' => '',
                'full_permissions' => '1',
                'allowed_paths' => '[]',
                'networkfilterid' => 'none',
            ],
            'API key not found',                // Not found message
            false,                              // Doesn't need extension
            null,                               // No additional new record setup
            null                                // No additional data loading
        );
    }
}