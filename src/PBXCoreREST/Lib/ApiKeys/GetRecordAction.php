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
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

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
class GetRecordAction
{
    /**
     * Get single API key record by ID or create new structure
     * 
     * @param string|null $id API key ID
     * @return PBXApiResult
     */
    public static function main(?string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            if (empty($id) || $id === 'new') {
                // Return empty structure for new record
                $dataStructure = new DataStructure([]);
            } else {
                $apiKey = ApiKeys::findFirst($id);
                
                if (!$apiKey) {
                    $res->messages['error'][] = 'API key not found';
                    return $res;
                }
                
                $dataStructure = DataStructure::createFromModel($apiKey);
            }
            
            $res->data = $dataStructure->toArray();
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}