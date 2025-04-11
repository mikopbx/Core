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
        $data = $this->request->getRawBody();
        $data = json_decode($data, true)??[];
        $data = self::sanitizeData($data, $this->filter);
        if (empty($data)) {
            $this->response->setStatusCode(400, 'Bad Request');
            $this->response->setJsonContent(['error' => 'Invalid request data']);
            $this->response->send();
            return;
        }

        $userId = session_id();  
        $pageName = $data['pageName'];
        $expire = $data['expire']??300;

        $keyUser = "pageTracker:user:{$userId}:viewing:{$pageName}";
        $keyPage = "pageTracker:page:{$pageName}:viewers";
        if ($actionName === 'pageView') {
            $this->redis->set($keyUser, time(), ['EX' => $expire]);
            $this->redis->sAdd($keyPage, $userId);
            $this->redis->expire($keyPage, $expire);
        } elseif ($actionName === 'pageLeave') {
            $this->redis->del($keyUser);
            $this->redis->sRem($keyPage, $userId);
        }
    }
}
