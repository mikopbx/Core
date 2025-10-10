<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\PBXCoreREST\Lib\WikiLinks\GetWikiLinkAction;
use Phalcon\Di\Injectable;

/**
 * Enum for Wiki Links actions
 */
enum WikiLinksAction: string
{
    case GET_LINK = 'getLink';
}

/**
 * Processor for Wiki Links management
 */
class WikiLinksManagementProcessor extends Injectable
{
    /**
     * Main callback for processing wiki links requests
     *
     * @param array $request Request data with action and parameters
     * @return PBXApiResult Result of the operation
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action = WikiLinksAction::tryFrom($request['action']);

        return match ($action) {
            WikiLinksAction::GET_LINK => GetWikiLinkAction::main($request['data']),
            default => self::createErrorResult('Unknown action: ' . $request['action'])
        };
    }

    /**
     * Create error result
     *
     * @param string $message Error message
     * @return PBXApiResult
     */
    private static function createErrorResult(string $message): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->success = false;
        $res->messages['error'][] = $message;
        $res->httpCode = 400;
        return $res;
    }
}
