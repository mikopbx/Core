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

use Phalcon\Di\Injectable;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Encryption\Security\Random;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Password generation processor using Phalcon Random
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class PasswordsManagementProcessor extends Injectable
{
    // Default length for base64Safe
    private const DEFAULT_LENGTH = 16;
    
    // Constraints
    private const MIN_LENGTH = 8;
    private const MAX_LENGTH = 64;

    /**
     * Generate password using Phalcon Random
     * 
     * @param array $request Request data
     * @return PBXApiResult
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->function = $request['action'];
        
        if ($request['action'] !== 'generate') {
            $res->messages['error'][] = "Unknown action - {$request['action']}";
            return $res;
        }
        
        // Get and validate length
        $length = self::DEFAULT_LENGTH;
        if (isset($request['data']['length'])) {
            $requestedLength = filter_var($request['data']['length'], FILTER_VALIDATE_INT);
            if ($requestedLength !== false) {
                $length = max(self::MIN_LENGTH, min(self::MAX_LENGTH, $requestedLength));
            }
        }
        
        // Generate password using Phalcon Random
        try {
            $random = new Random();
            $password = $random->base64Safe($length);
            
            $res->data = [
                'password' => $password,
                'length' => strlen($password) // Actual length will be ~1.37x requested
            ];
            $res->success = true;
        } catch (\Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $res->messages['error'][] = "Password generation failed";
        }
        
        return $res;
    }
}