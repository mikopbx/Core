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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Mvc\Model\Transaction\Manager;

/**
 * Patch (partial update) IVR menu
 * 
 * Updates only specified fields of an existing IVR menu record.
 * Unspecified fields remain unchanged.
 * 
 * @package MikoPBX\PBXCoreREST\Lib\IvrMenu
 */
class PatchAction
{
    /**
     * Partially update IVR menu
     *
     * @param array $data Update data with 'id' field required
     * @return PBXApiResult Result of the patch operation
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Validate required ID
            if (empty($data['id'])) {
                $res->messages['error'][] = 'IVR menu ID is required for patch operation';
                return $res;
            }
            
            // Find existing IVR menu
            $ivrMenu = IvrMenu::findFirstByUniqid($data['id']);
            if (!$ivrMenu) {
                $res->messages['error'][] = 'IVR menu not found: ' . $data['id'];
                $res->httpCode = 404;
                return $res;
            }
            
            // Start transaction
            $transactionManager = new Manager();
            $transaction = $transactionManager->get();
            
            $ivrMenu->setTransaction($transaction);
            
            // Update only provided fields
            $fieldsToUpdate = [
                'name',
                'extension',
                'audio_message_id',
                'timeout',
                'timeout_extension',
                'allow_enter_any_internal_extension',
                'number_of_repeat',
                'description'
            ];
            
            foreach ($fieldsToUpdate as $field) {
                if (array_key_exists($field, $data)) {
                    $ivrMenu->$field = $data[$field];
                }
            }
            
            // Save IVR menu
            if (!$ivrMenu->save()) {
                $transaction->rollback();
                $res->messages['error'] = $ivrMenu->getMessages();
                return $res;
            }
            
            // Update actions if provided
            if (isset($data['actions']) && is_array($data['actions'])) {
                // Delete existing actions only if new ones are provided
                IvrMenuActions::find([
                    'conditions' => 'ivr_menu_id = :id:',
                    'bind' => ['id' => $ivrMenu->uniqid]
                ])->delete();
                
                // Add new actions
                foreach ($data['actions'] as $index => $actionData) {
                    $action = new IvrMenuActions();
                    $action->setTransaction($transaction);
                    $action->ivr_menu_id = $ivrMenu->uniqid;
                    $action->digits = $actionData['digits'] ?? '';
                    $action->extension = $actionData['extension'] ?? '';
                    $action->priority = $index;
                    
                    if (!$action->save()) {
                        $transaction->rollback();
                        $res->messages['error'] = $action->getMessages();
                        return $res;
                    }
                }
            }
            
            // Commit transaction
            $transaction->commit();
            
            $res->success = true;
            $res->data = ['id' => $ivrMenu->uniqid];
            
        } catch (\Exception $e) {
            if (isset($transaction)) {
                $transaction->rollback();
            }
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}