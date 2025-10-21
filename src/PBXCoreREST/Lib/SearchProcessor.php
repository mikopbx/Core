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

use MikoPBX\PBXCoreREST\Lib\Search\GetSearchItemsAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

/**
 * Processor for global search API endpoint.
 *
 * Handles global search requests for finding system entities and menu items.
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class SearchProcessor extends Injectable
{
    /**
     * Processes the Search request.
     *
     * @param array $request The request data with optional 'query' parameter
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $action = $request['action'];

        switch ($action) {
            case 'getSearchItems':
                $data = $request['data'] ?? [];
                $res = GetSearchItemsAction::main($data);
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in ".__CLASS__;
                break;
        }

        $res->function = $action;
        return $res;
    }
}
