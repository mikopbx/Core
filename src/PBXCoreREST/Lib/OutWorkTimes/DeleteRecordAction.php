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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\OutWorkTimes;

use MikoPBX\Common\Models\OutWorkTimes;
use MikoPBX\Common\Models\OutWorkTimesRouts;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDeleteAction;

/**
 * Action for deleting out-of-work-time condition record
 * 
 * Handles cascade deletion of related records and proper cleanup.
 * 
 * @api {delete} /pbxcore/api/v2/out-work-times/deleteRecord/:id Delete time condition
 * @apiVersion 2.0.0
 * @apiName DeleteRecord
 * @apiGroup OutWorkTimes
 * 
 * @apiParam {String} id Record ID to delete
 * 
 * @apiSuccess {Boolean} success Operation result
 * @apiSuccess {String} reload URL for page reload
 */
class DeleteRecordAction extends AbstractDeleteAction
{
    /**
     * Delete out-of-work-time condition record
     * 
     * @param string $id Record ID to delete
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        // Since OutWorkTimes uses 'description' instead of 'name', we need to handle this differently
        // The abstract class looks for 'name' but OutWorkTimes has 'description'
        // We'll need to manually handle the deletion to use the correct field
        
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        // Find the record first
        $condition = OutWorkTimes::findFirstById($id);
        if (!$condition) {
            $res->messages['error'][] = 'api_OutWorkTimeNotFound';
            return $res;
        }
        
        // Get the description for logging
        $conditionDescription = $condition->description ?? "ID: {$condition->id}";
        
        try {
            // Use Phalcon transaction manager directly
            $di = \Phalcon\Di\Di::getDefault();
            $db = $di->getShared('db');
            $db->begin();
            
            $transactionResult = false;
            try {
                // Delete related incoming route associations
                $associations = OutWorkTimesRouts::find([
                    'conditions' => 'timeConditionId = :conditionId:',
                    'bind' => ['conditionId' => $condition->id]
                ]);
                
                foreach ($associations as $association) {
                    if (!$association->delete()) {
                        throw new \Exception('Failed to delete route association: ' . implode(', ', $association->getMessages()));
                    }
                }
                
                // Delete the main record
                if (!$condition->delete()) {
                    throw new \Exception('Failed to delete time condition: ' . implode(', ', $condition->getMessages()));
                }
                
                $db->commit();
                $transactionResult = true;
            } catch (\Exception $e) {
                $db->rollback();
                throw $e;
            }
            
            if ($transactionResult) {
                $res->success = true;
                $res->data = ['deleted_id' => $id];
                $res->reload = 'out-off-work-time/index';
                
                // Log successful deletion with description
                \MikoPBX\Core\System\SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Time condition '{$conditionDescription}' (ID: {$id}) deleted successfully",
                    LOG_INFO
                );
            }
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            \MikoPBX\Common\Handlers\CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
        
        return $res;
    }
}