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

namespace MikoPBX\PBXCoreREST\Lib\IvrMenu;

use MikoPBX\Common\Models\IvrMenu;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;

/**
 * Action for getting IVR menu record
 * 
 * @api {get} /pbxcore/api/v2/ivr-menu/getRecord/:id Get IVR menu record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup IvrMenu
 * 
 * @apiParam {String} [id] Record ID or "new" for new record structure
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data IVR menu data
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.uniqid Unique identifier
 * @apiSuccess {String} data.extension Extension number
 * @apiSuccess {String} data.name IVR menu name
 * @apiSuccess {String} data.audio_message_id Audio message ID
 * @apiSuccess {String} data.timeout Timeout in seconds
 * @apiSuccess {String} data.timeout_extension Extension for timeout
 * @apiSuccess {Boolean} data.allow_enter_any_internal_extension Allow dialing any extension
 * @apiSuccess {String} data.number_of_repeat Number of menu repeats
 * @apiSuccess {String} data.description IVR menu description
 * @apiSuccess {Array} data.actions Array of IVR menu actions
 */
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Get IVR menu record
     * @param string|null $id - Record ID or null for new record
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $isNew = empty($id) || $id === 'new';
        
        $result = self::executeStandardGetRecord(
            $id,
            IvrMenu::class,
            DataStructure::class,
            'IVR-',
            [
                'audio_message_id' => '',
                'timeout' => '7',
                'timeout_extension' => '',
                'allow_enter_any_internal_extension' => '0',
                'number_of_repeat' => '3'
            ],
            'IVR menu not found'
        );
        
        // Always add isNew field for form population
        if ($result->success) {
            $result->data['isNew'] = $isNew ? '1' : '0';
        }
        
        return $result;
    }
}