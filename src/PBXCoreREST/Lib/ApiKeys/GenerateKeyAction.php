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

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\ApiKeys;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for generating a new API key
 * 
 * @api {post} /pbxcore/api/v2/api-keys/generateKey Generate new API key
 * @apiVersion 2.0.0
 * @apiName GenerateKey
 * @apiGroup ApiKeys
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Generated key data
 * @apiSuccess {String} data.key Generated API key
 */
class GenerateKeyAction
{
    /**
     * Generate a new API key
     * 
     * @param array $data Request data (not used)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Generate secure random API key
            $apiKey = ApiKeys::generateApiKey();
            
            $res->data = ['key' => $apiKey];
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = 'Failed to generate API key: ' . $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}