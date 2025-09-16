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

use MikoPBX\PBXCoreREST\Lib\NetworkFilters\GetForSelectAction;
use MikoPBX\PBXCoreREST\Lib\NetworkFilters\GetListAction;
use MikoPBX\PBXCoreREST\Lib\NetworkFilters\GetRecordAction;
use Phalcon\Di\Injectable;

/**
 * NetworkFiltersManagementProcessor
 * 
 * Processes REST API v3 requests for network filters management
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class NetworkFiltersManagementProcessor extends Injectable
{
    /**
     * Process REST API request
     * 
     * @param array $request Request data with action and parameters
     * @return PBXApiResult
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action = $request['action'];
        $data = $request['data'];
        
        // NetworkFilters is read-only - only supports listing for dropdowns
        // Actual filter management is done through Firewall API
        $res = match ($action) {
            'getList' => GetListAction::main($data),
            'getRecord' => GetRecordAction::main($data),
            'getForSelect' => GetForSelectAction::main($data),
            default => self::getErrorResult($action)
        };
        
        $res->function = $action;
        return $res;
    }
    
    /**
     * Get error result for unknown action
     * 
     * @param string $action The unknown action
     * @return PBXApiResult
     */
    private static function getErrorResult(string $action): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->messages['error'][] = "Unknown action - $action";
        $res->success = false;
        return $res;
    }
}