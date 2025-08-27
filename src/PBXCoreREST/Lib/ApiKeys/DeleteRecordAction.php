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
use MikoPBX\PBXCoreREST\Services\ApiKeyValidationService;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

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
class DeleteRecordAction
{
    /**
     * Delete API key record
     * 
     * @param string $id API key ID to delete
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            if (empty($id)) {
                $res->messages['error'][] = 'API key ID is required';
                return $res;
            }
            
            $apiKey = ApiKeys::findFirst($id);
            
            if (!$apiKey) {
                $res->messages['error'][] = 'API key not found';
                return $res;
            }
            
            if ($apiKey->delete()) {
                // Clear cache for this key
                ApiKeyValidationService::clearCache((int)$id);
                
                $res->success = true;
            } else {
                $res->messages['error'] = [];
                foreach ($apiKey->getMessages() as $message) {
                    $res->messages['error'][] = $message->getMessage();
                }
            }
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}