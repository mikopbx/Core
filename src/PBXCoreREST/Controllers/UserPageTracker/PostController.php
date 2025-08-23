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

namespace MikoPBX\PBXCoreREST\Controllers\UserPageTracker;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\UserPageTrackerLib;

/**
 * Handles the POST requests for user page tracker data.
 *
 * @RoutePrefix("/pbxcore/api/user-page-tracker")
 *
 * @examples
 *
 */
class PostController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $actionName The name of the action
     *
     * Deletes the ivr menu record with its dependent tables.
     * @Post("/pageView")
     * @Post("/pageLeave")
     *
     * @return void
     */
    public function callAction(string $actionName): void
    {
        $requestData = self::sanitizeData($this->request->getData(), $this->filter);
        if (empty( $requestData)) {
            $this->response->setStatusCode(400, 'Bad Request');
            $this->response->setJsonContent(['error' => 'Invalid request data']);
            $this->response->send();
            return;
        }

        $userId = session_id();  
        $pageName =  $requestData['pageName'];
        $expire =  $requestData['expire']??300;

        // Use unified page tracker mechanism
        $pageTracker = new UserPageTrackerLib();
        
        $success = false;
        if ($actionName === 'pageView') {
            $success = $pageTracker->recordPageView($userId, $pageName, $expire);
        } elseif ($actionName === 'pageLeave') {
            $success = $pageTracker->recordPageLeave($userId, $pageName);
        }
        
        if (!$success) {
            $this->response->setStatusCode(500, 'Internal Server Error');
            $this->response->setJsonContent(['error' => 'Failed to update page tracking']);
            $this->response->send();
        }
    }
}
