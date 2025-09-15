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
use MikoPBX\Core\System\SystemMessages;

/**
 * Action for copying an IVR menu with automatic extension assignment
 *
 * This action creates a copy of an existing IVR menu with:
 * - New unique ID generated automatically
 * - Next available extension number assigned
 * - Name prefixed with "copy of"
 * - All settings and actions copied
 *
 * @api {get} /pbxcore/api/v3/ivr-menu/{id}:copy Copy IVR menu
 * @apiVersion 3.0.0
 * @apiName CopyRecord
 * @apiGroup IvrMenu
 *
 * @apiParam {String} id Source IVR menu ID to copy
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Copied IVR menu data ready for creation
 * @apiSuccess {String} data.id New unique identifier
 * @apiSuccess {String} data.extension New extension number (automatically assigned)
 * @apiSuccess {String} data.name Name prefixed with "copy of"
 * @apiSuccess {Array} data.actions Copied IVR menu actions
 */
class CopyRecordAction
{
    /**
     * Copy IVR menu record with new extension and ID
     *
     * @param string $sourceId Source IVR menu ID to copy
     * @return PBXApiResult
     */
    public static function main(string $sourceId): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Find source IVR menu
            $sourceMenu = IvrMenu::findFirst("uniqid='{$sourceId}'");

            if (!$sourceMenu) {
                $res->messages['error'][] = "Source IVR menu not found: {$sourceId}";
                SystemMessages::sysLogMsg(__METHOD__,
                    "Source IVR menu not found for copy: {$sourceId}",
                    LOG_WARNING
                );
                return $res;
            }

            // Create new IVR menu model with copied values
            $newMenu = self::createCopyFromSource($sourceMenu);

            // Get source IVR menu actions
            $sourceActions = IvrMenuActions::find([
                'conditions' => 'ivr_menu_id = :ivrMenuId:',
                'bind' => ['ivrMenuId' => $sourceMenu->uniqid],
                'order' => 'digits ASC'
            ]);

            // Prepare actions array for the copy
            $actionsArray = [];
            foreach ($sourceActions as $action) {
                $actionsArray[] = [
                    'id' => '', // Clear ID for new record
                    'digits' => $action->digits,
                    'extension' => $action->extension
                ];
            }

            // Create data structure for the copied IVR menu
            $res->data = DataStructure::createFromModel($newMenu, $actionsArray);
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(__METHOD__,
                "Error copying IVR menu: " . $e->getMessage(),
                LOG_ERR
            );
        }

        return $res;
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

        // Generate new identifiers
        $newMenu->id = '';
        $newMenu->uniqid = IvrMenu::generateUniqueID('IVR-');

        // Get new extension number automatically
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