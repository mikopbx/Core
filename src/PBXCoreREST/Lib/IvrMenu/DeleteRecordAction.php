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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDeleteAction;

/**
 * Action for deleting IVR menu record
 * 
 * @api {delete} /pbxcore/api/v2/ivr-menu/deleteRecord/:id Delete IVR menu
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup IvrMenu
 * 
 * @apiParam {String} id Record ID to delete
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Deletion result
 * @apiSuccess {String} data.deleted_id ID of deleted record
 */
class DeleteRecordAction extends AbstractDeleteAction
{
    /**
     * Delete IVR menu record
     * 
     * @param string $id - Record ID to delete
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        return self::executeStandardDelete(
            IvrMenu::class,
            $id,
            'IVR menu',
            'api_IvrMenuNotFound',
            function($ivrMenu) {
                // Manually delete IvrMenuActions since NO_ACTION is set in the relation
                /** @var \Phalcon\Mvc\Model\Resultset\Simple $actions */
                $actions = \MikoPBX\Common\Models\IvrMenuActions::find([
                    'conditions' => 'ivr_menu_id = :uniqid:',
                    'bind' => ['uniqid' => $ivrMenu->uniqid]
                ]);

                $deletedCount = 0;
                /** @var \MikoPBX\Common\Models\IvrMenuActions $action */
                foreach ($actions as $action) {
                    if (!$action->delete()) {
                        throw new \Exception('Failed to delete IVR menu actions: ' . implode(', ', $action->getMessages()));
                    }
                    $deletedCount++;
                }

                // Return cleanup statistics
                return [
                    'deleted_count' => $deletedCount,
                    'deleted_type' => 'IVR menu action'
                ];
            }
        );
    }
}