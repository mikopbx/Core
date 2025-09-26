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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\UserPageTracker;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Page view tracking action.
 *
 * Records that a user is currently viewing a specific page.
 *
 * @package MikoPBX\PBXCoreREST\Lib\UserPageTracker
 */
class PageViewAction
{
    /**
     * Record a page view event.
     *
     * @param array $data Request data containing userId, pageName, and optionally expire
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Extract parameters
        $sessionId = $data['sessionId'] ?? '';
        $pageName = $data['pageName'] ?? '';
        $expire = (int)($data['expire'] ?? 300);


        if (empty($pageName)) {
            $res->messages['error'][] = 'Page name is required';
            return $res;
        }

        // Validate expire value (between 1 second and 1 hour)
        if ($expire <= 0 || $expire > 3600) {
            $expire = 300; // Default to 5 minutes
        }

        try {
            // Use the unified page tracker library
            $pageTracker = new UserPageTrackerLib();
            $success = $pageTracker->recordPageView($sessionId, $pageName, $expire);

            if ($success) {
                $res->success = true;
                $res->data = [
                    'sessionId' => $sessionId,
                    'pageName' => $pageName,
                    'expire' => $expire,
                    'timestamp' => time()
                ];
            } else {
                $res->messages['error'][] = 'Failed to record page view';
            }
        } catch (\Throwable $e) {
            $res->messages['error'][] = 'Internal error while recording page view';
        }

        return $res;
    }
}