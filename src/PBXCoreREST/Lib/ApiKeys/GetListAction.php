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
 * Action for getting list of all API key records
 * 
 * @api {get} /pbxcore/api/v2/api-keys/getList Get all API key records
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup ApiKeys
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of API key records
 */
class GetListAction
{
    /**
     * Get list of all API keys with formatted data
     * 
     * @param array $data Filter parameters (not used yet)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $keys = ApiKeys::find(['order' => 'description ASC, id DESC']);
            
            $keysList = [];
            if ($keys !== false) {
                // Convert to array to satisfy phpstan
                $keysArray = $keys->toArray();
                foreach ($keysArray as $keyData) {
                    // Re-hydrate the model from array data
                    $key = new ApiKeys();
                    $key->assign($keyData);
                    $keysList[] = DataStructure::createForList($key);
                }
            }
            
            $res->data = $keysList;
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}