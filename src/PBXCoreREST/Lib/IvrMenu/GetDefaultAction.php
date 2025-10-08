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

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\IvrMenu;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting default values for a new IVR menu
 * 
 * This action is used when creating a new IVR menu to provide
 * default values for form initialization
 * 
 * @api {get} /pbxcore/api/v3/ivr-menu:getDefault Get default values for new IVR menu
 * @apiVersion 3.0.0
 * @apiName GetDefault
 * @apiGroup IvrMenu
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Default IVR menu data
 * @apiSuccess {String} data.id Unique identifier (generated)
 * @apiSuccess {String} data.uniqid Same as id
 * @apiSuccess {String} data.extension Next available extension number
 * @apiSuccess {String} data.name Empty name for user input
 * @apiSuccess {String} data.timeout Default timeout "7"
 * @apiSuccess {String} data.number_of_repeat Default repeat count "3"
 * @apiSuccess {String} data.isNew Always "1" for new records
 */
class GetDefaultAction
{
    /**
     * Get default values for a new IVR menu
     * 
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Generate unique ID for the new IVR menu (use 'IVR' prefix without spaces)
            $uniqid = IvrMenu::generateUniqueID(Extensions::PREFIX_IVR);
            
            // Get next available extension number using centralized method
            $extensionNumber = Extensions::getNextFreeApplicationNumber();
            
            // Prepare default data structure with only 'id' field (no duplicate uniqid)
            $data = [
                'id' => $uniqid,
                'extension' => $extensionNumber,
                'name' => '',
                'audio_message_id' => '',
                'timeout' => '7',
                'timeout_extension' => '',
                'allow_enter_any_internal_extension' => '0',
                'number_of_repeat' => '3',
                'description' => '',
                'actions' => [],
                'isNew' => '1',
                'represent' => 'New IVR Menu'
            ];
            
            $res->data = $data;
            $res->success = true;
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}