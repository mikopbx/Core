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
use MikoPBX\Common\Models\IvrMenuActions;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;
use MikoPBX\Core\System\SystemMessages;

/**
 * Action for getting IVR menu record with copy support
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
     * @param string|null $id - Record ID or "new"
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $isNew = empty($id) || $id === 'new';

        if ($isNew) {
            // Create structure for new record with default values
            $newMenu = self::createNewRecord();
            $res->data = DataStructure::createFromModel($newMenu, []);
            $res->success = true;
        } else {
            // Find existing record
            $menu = self::findRecordById(IvrMenu::class, $id);

            if ($menu) {
                // Get IVR menu actions
                $actions = IvrMenuActions::find([
                    'conditions' => 'ivr_menu_id = :ivrMenuId:',
                    'bind' => ['ivrMenuId' => $menu->uniqid],
                    'order' => 'digits ASC'
                ]);

                $actionsArray = [];
                foreach ($actions as $action) {
                    $actionsArray[] = [
                        'id' => (string)$action->id,
                        'digits' => $action->digits,
                        'extension' => $action->extension
                    ];
                }

                $res->data = DataStructure::createFromModel($menu, $actionsArray);
                $res->success = true;
            } else {
                $res->messages['error'][] = 'IVR menu not found';
                SystemMessages::sysLogMsg(__METHOD__,
                    "IVR menu not found: {$id}",
                    LOG_WARNING
                );
            }
        }

        // Always add isNew field for form population
        if ($res->success) {
            $res->data['isNew'] = $isNew ? '1' : '0';
        }
        
        return $res;
    }

    /**
     * Create new IVR menu record with default values
     * 
     * @return IvrMenu
     */
    private static function createNewRecord(): IvrMenu
    {
        $newMenu = new IvrMenu();
        $newMenu->id = '';
        $newMenu->uniqid = IvrMenu::generateUniqueID(Extensions::PREFIX_IVR);
        $newMenu->extension = Extensions::getNextFreeApplicationNumber();
        $newMenu->name = '';
        $newMenu->audio_message_id = '';
        $newMenu->timeout = '7';
        $newMenu->timeout_extension = '';
        $newMenu->allow_enter_any_internal_extension = '0';
        $newMenu->number_of_repeat = '3';
        $newMenu->description = '';
        
        return $newMenu;
    }

}