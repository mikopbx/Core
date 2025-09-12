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

namespace MikoPBX\PBXCoreREST\Lib\ConferenceRooms;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for creating new conference room
 * 
 * @api {post} /pbxcore/api/v3/conference-rooms Create new conference room
 * @apiVersion 3.0.0
 * @apiName CreateConferenceRoom
 * @apiGroup ConferenceRooms
 * 
 * @apiParam {String} extension Extension number
 * @apiParam {String} name Conference name
 * @apiParam {String} [pinCode] PIN code for access
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Created conference room data
 * @apiSuccess {String} data.id Unique identifier
 */
class CreateRecordAction
{
    /**
     * Create new conference room
     * 
     * @param array $data Conference room data
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        // Use SaveRecordAction for actual creation
        // This maintains consistency with existing implementation
        return SaveRecordAction::main($data);
    }
}