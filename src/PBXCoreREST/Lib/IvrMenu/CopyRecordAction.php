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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractCopyRecordAction;

/**
 * Action for copying an IVR menu with automatic extension assignment
 *
 * Extends AbstractCopyRecordAction to leverage:
 * - Automatic unique ID generation
 * - Next available extension number assignment
 * - Name prefixed with "copy of"
 * - Related records copying (IVR menu actions)
 * - Consistent error handling and logging
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
class CopyRecordAction extends AbstractCopyRecordAction
{
    /**
     * Copy IVR menu record with new extension and ID
     *
     * @param string $sourceId Source IVR menu ID to copy
     * @return PBXApiResult
     */
    public static function main(string $sourceId): PBXApiResult
    {
        return self::executeStandardCopy(
            $sourceId,
            IvrMenu::class,
            DataStructure::class,
            Extensions::PREFIX_IVR,    // Unique ID prefix (tilde will be added by generateUniqueID)
            [                          // Fields to copy
                'name',
                'audio_message_id',
                'timeout',
                'timeout_extension',
                'allow_enter_any_internal_extension',
                'number_of_repeat',
                'description'
            ],
            true,                      // Needs extension
            self::createRelatedRecordsCallback(),  // Copy IVR menu actions
            'IVR menu'                 // Entity type for messages
        );
    }

    /**
     * Create callback for copying related IVR menu actions
     *
     * @return callable
     */
    private static function createRelatedRecordsCallback(): callable
    {
        return function ($sourceMenu, $newMenu) {
            // Find source actions
            $sourceActions = IvrMenuActions::find([
                'conditions' => 'ivr_menu_id = :ivrMenuId:',
                'bind' => ['ivrMenuId' => $sourceMenu->uniqid],
                'order' => 'digits ASC'
            ]);

            // Convert to array format for DataStructure
            $actionsArray = [];
            foreach ($sourceActions as $action) {
                $actionsArray[] = [
                    'id' => '', // Clear ID for new record
                    'digits' => $action->digits,
                    'extension' => $action->extension
                ];
            }

            // Return actions array to be passed to DataStructure::createFromModel
            return $actionsArray;
        };
    }
}