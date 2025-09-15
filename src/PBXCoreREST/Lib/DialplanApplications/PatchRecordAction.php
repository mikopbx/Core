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

namespace MikoPBX\PBXCoreREST\Lib\DialplanApplications;

use MikoPBX\Common\Models\DialplanApplications;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Partial update of dialplan application (modify specific fields)
 *
 * @package MikoPBX\PBXCoreREST\Lib\DialplanApplications
 */
class PatchRecordAction
{
    /**
     * Perform partial update of dialplan application
     *
     * @param array $data Request data
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Find existing record by uniqid (passed as id in REST API v3)
            $uniqid = $data['id'] ?? '';
            if (empty($uniqid)) {
                $res->messages['error'][] = 'ID is required for patch';
                return $res;
            }
            
            $record = DialplanApplications::findFirstByUniqid($uniqid);
            if (!$record) {
                $res->messages['error'][] = "Dialplan application with ID {$uniqid} not found";
                return $res;
            }
            
            // Start transaction
            $di = \Phalcon\Di\Di::getDefault();
            $db = $di->get('db');
            $db->begin();
            
            $hasChanges = false;
            
            // Update only provided fields
            if (isset($data['name'])) {
                if (empty($data['name'])) {
                    $db->rollback();
                    $res->messages['error'][] = 'Name cannot be empty';
                    return $res;
                }
                $record->name = $data['name'];
                $hasChanges = true;
                
                // Update extension callerid
                $extension = Extensions::findFirst([
                    'conditions' => 'uniqid = :uniqid: AND type = :type:',
                    'bind' => [
                        'uniqid' => $record->uniqid,
                        'type' => Extensions::TYPE_DIALPLAN_APPLICATION
                    ]
                ]);
                
                if ($extension) {
                    $extension->callerid = $data['name'];
                    if (!$extension->save()) {
                        $db->rollback();
                        $res->messages['error'] = $extension->getMessages();
                        return $res;
                    }
                }
            }
            
            if (isset($data['extension'])) {
                if (empty($data['extension'])) {
                    $db->rollback();
                    $res->messages['error'][] = 'Extension cannot be empty';
                    return $res;
                }
                
                if (!is_numeric($data['extension'])) {
                    $db->rollback();
                    $res->messages['error'][] = 'Extension must be numeric';
                    return $res;
                }
                
                // Check if extension is already in use by another record
                if ($data['extension'] !== $record->extension) {
                    $existingExtension = Extensions::findFirst([
                        'conditions' => 'number = :number:',
                        'bind' => ['number' => $data['extension']]
                    ]);
                    
                    if ($existingExtension) {
                        $db->rollback();
                        $res->messages['error'][] = "Extension {$data['extension']} is already in use";
                        return $res;
                    }
                    
                    // Update extension number
                    $extension = Extensions::findFirst([
                        'conditions' => 'uniqid = :uniqid: AND type = :type:',
                        'bind' => [
                            'uniqid' => $record->uniqid,
                            'type' => Extensions::TYPE_DIALPLAN_APPLICATION
                        ]
                    ]);
                    
                    if ($extension) {
                        $extension->number = $data['extension'];
                        if (!$extension->save()) {
                            $db->rollback();
                            $res->messages['error'] = $extension->getMessages();
                            return $res;
                        }
                    }
                    
                    $record->extension = $data['extension'];
                    $hasChanges = true;
                }
            }
            
            if (isset($data['hint'])) {
                $record->hint = $data['hint'];
                $hasChanges = true;
            }
            
            if (isset($data['description'])) {
                $record->description = $data['description'];
                $hasChanges = true;
            }
            
            if (isset($data['type'])) {
                if (!in_array($data['type'], ['php', 'plaintext', 'lua', 'agi'])) {
                    $db->rollback();
                    $res->messages['error'][] = 'Invalid application type';
                    return $res;
                }
                $record->type = $data['type'];
                $hasChanges = true;
            }
            
            if (isset($data['applicationlogic'])) {
                $record->setApplicationlogic($data['applicationlogic']);
                $hasChanges = true;
            }
            
            // Save changes if any
            if ($hasChanges) {
                if (!$record->save()) {
                    $db->rollback();
                    $res->messages['error'] = $record->getMessages();
                    return $res;
                }
            }
            
            // Commit transaction
            $db->commit();
            
            // Return updated record data
            $res->data = DataStructure::createFromModel($record);
            $res->success = true;
            
            // Reload dialplan if there were changes
            if ($hasChanges) {
                $di->get('pbxConfigurator')->reloadDialplan();
            }
            
        } catch (\Exception $e) {
            if (isset($db) && $db->isUnderTransaction()) {
                $db->rollback();
            }
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}