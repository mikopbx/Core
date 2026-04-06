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

use MikoPBX\PBXCoreREST\Lib\UserPageTracker\PageViewAction;
use MikoPBX\PBXCoreREST\Lib\UserPageTracker\PageLeaveAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for user page tracker
 */
enum UserPageTrackerAction: string
{
    case PAGE_VIEW = 'pageView';
    case PAGE_LEAVE = 'pageLeave';
}

/**
 * Class UserPageTrackerProcessor
 *
 * Processes user page tracking requests
 *
 * RESTful API mapping:
 * - POST /user-page-tracker:pageView -> pageView
 * - POST /user-page-tracker:pageLeave -> pageLeave
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class UserPageTrackerProcessor extends Injectable
{
    /**
     * Processes user page tracking requests with type-safe enum matching
     *
     * @param array<string, mixed> $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = $request['action'];
        $data = $request['data'];
        $sessionContext = $request['sessionContext'] ?? [];

        // Type-safe action matching with enum
        $action = UserPageTrackerAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // Get session_id from session context (used for page tracking)
        // Session ID is optional - if not available, we still track the page view
        // but without user association (anonymous tracking)
        $sessionId = $sessionContext['session_id'] ?? '';

        // Add session_id to data for actions (this is the browser session ID)
        // Empty sessionId means anonymous tracking
        $data['sessionId'] = $sessionId;

        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            UserPageTrackerAction::PAGE_VIEW => PageViewAction::main($data),
            UserPageTrackerAction::PAGE_LEAVE => PageLeaveAction::main($data),
        };

        $res->function = $actionString;
        return $res;
    }
}