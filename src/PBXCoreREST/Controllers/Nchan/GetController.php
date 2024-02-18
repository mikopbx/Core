<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Controllers\Nchan;

use MikoPBX\PBXCoreREST\Controllers\BaseController;

/**
 * Nchan pub/sub channels authenticator (GET)
 *
 * @RoutePrefix("/pbxcore/api/nchan")
 *
 * @examples
 * Check if it is allowed to use the channel.
 *   curl http://127.0.0.1/pbxcore/api/nchan/install-module;
 *
 */
class GetController extends BaseController
{
    /**
     * Handles the call to different actions based on the action name
     *
     * @param string $queueName The name of the nchan pub/sub channel
     *
     * Check user authentication for nchan pub/sub.
     * @Get("/install-module")
     *
     *
     * @return void
     */
    public function callAction(string $queueName): void
    {
        $this->response->setPayloadSuccess('Authenticated for '.$queueName);
    }
}