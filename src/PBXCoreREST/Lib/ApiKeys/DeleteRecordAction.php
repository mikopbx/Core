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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDeleteAction;
use MikoPBX\PBXCoreREST\Services\ApiKeyValidationService;

/**
 * Action for deleting API key record
 * 
 * @api {post} /pbxcore/api/v2/api-keys/deleteRecord Delete API key record
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup ApiKeys
 * 
 * @apiParam {String} id API key ID to delete
 * 
 * @apiSuccess {Boolean} result Operation result
 */
class DeleteRecordAction extends AbstractDeleteAction
{
    /**
     * Delete API key record
     * 
     * @param string $id API key ID to delete
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        // Use standard delete execution from parent class
        return self::executeStandardDelete(
            ApiKeys::class,
            $id,
            'API key',                          // Entity type for logging
            'API key not found',                // Not found message
            function($apiKey) {                 // Additional cleanup callback
                // Clear validation cache for this key before deletion
                ApiKeyValidationService::clearCache((int)$apiKey->id);
            }
        );
    }
}