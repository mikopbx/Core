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
 * @apiParam {String} [id] Record ID, "new" for new record structure, or "copy-{id}" for copy mode
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
     * Get IVR menu record with copy support
     * @param string|null $id - Record ID, "new", or "copy-{sourceId}"
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Check for copy mode
        $copyMode = false;
        $sourceId = '';
        if (!empty($id) && strpos($id, 'copy-') === 0) {
            $copyMode = true;
            $sourceId = substr($id, 5); // Remove 'copy-' prefix
        }

        $isNew = empty($id) || $id === 'new' || $copyMode;

        if ($isNew) {
            if ($copyMode && !empty($sourceId)) {
                // Copy mode - load source record and modify it
                $sourceMenu = self::findRecordById(IvrMenu::class, $sourceId);
                
                if ($sourceMenu) {
                    // Create copy of the source IVR menu
                    $newMenu = self::createCopyFromSource($sourceMenu);
                    
                    // Get source IVR menu actions for copying
                    $sourceActions = IvrMenuActions::find([
                        'conditions' => 'ivr_menu_id = :ivrMenuId:',
                        'bind' => ['ivrMenuId' => $sourceMenu->uniqid],
                        'order' => 'digits ASC'
                    ]);

                    $actionsArray = [];
                    foreach ($sourceActions as $action) {
                        $actionsArray[] = [
                            'id' => '', // Clear ID for new record
                            'digits' => $action->digits,
                            'extension' => $action->extension
                        ];
                    }

                    $res->data = DataStructure::createFromModel($newMenu, $actionsArray);
                    $res->success = true;

                    SystemMessages::sysLogMsg(__METHOD__,
                        "IVR menu copied from '{$sourceMenu->name}' to '{$newMenu->name}'",
                        LOG_DEBUG
                    );
                } else {
                    // Fallback to new record if source not found
                    $newMenu = self::createNewRecord();
                    $res->data = DataStructure::createFromModel($newMenu, []);
                    $res->success = true;
                    
                    SystemMessages::sysLogMsg(__METHOD__,
                        "Source IVR menu not found for copy, created new record instead",
                        LOG_WARNING
                    );
                }
            } else {
                // Create structure for new record with default values
                $newMenu = self::createNewRecord();
                $res->data = DataStructure::createFromModel($newMenu, []);
                $res->success = true;

                SystemMessages::sysLogMsg(__METHOD__,
                    "New IVR menu structure generated",
                    LOG_DEBUG
                );
            }
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

                SystemMessages::sysLogMsg(__METHOD__,
                    "IVR menu '{$menu->name}' ({$menu->extension}) loaded successfully",
                    LOG_DEBUG
                );
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
        $newMenu->uniqid = IvrMenu::generateUniqueID('IVR-');
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

    /**
     * Create copy of IVR menu from source record
     * 
     * @param IvrMenu $sourceMenu
     * @return IvrMenu
     */
    private static function createCopyFromSource(IvrMenu $sourceMenu): IvrMenu
    {
        $newMenu = new IvrMenu();
        
        // Clear identifiers
        $newMenu->id = '';
        $newMenu->uniqid = IvrMenu::generateUniqueID('IVR-');
        
        // Get new extension number
        $newMenu->extension = Extensions::getNextFreeApplicationNumber();
        
        // Copy all other fields
        $newMenu->name = 'copy of ' . $sourceMenu->name;
        $newMenu->audio_message_id = $sourceMenu->audio_message_id;
        $newMenu->timeout = $sourceMenu->timeout;
        $newMenu->timeout_extension = $sourceMenu->timeout_extension;
        $newMenu->allow_enter_any_internal_extension = $sourceMenu->allow_enter_any_internal_extension;
        $newMenu->number_of_repeat = $sourceMenu->number_of_repeat;
        $newMenu->description = $sourceMenu->description;
        
        return $newMenu;
    }
}