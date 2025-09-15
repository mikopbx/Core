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
 * Full update of dialplan application (replace all fields)
 *
 * @package MikoPBX\PBXCoreREST\Lib\DialplanApplications
 */
class UpdateRecordAction
{
    /**
     * Perform full update of dialplan application
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
                $res->messages['error'][] = 'ID is required for update';
                return $res;
            }
            
            $record = DialplanApplications::findFirstByUniqid($uniqid);
            if (!$record) {
                $res->messages['error'][] = "Dialplan application with ID {$uniqid} not found";
                return $res;
            }
            
            // Validate required fields
            $validationResult = self::validateData($data, $record);
            if (!$validationResult['success']) {
                $res->messages['error'] = $validationResult['errors'];
                return $res;
            }
            
            // Start transaction
            $di = \Phalcon\Di\Di::getDefault();
            $db = $di->get('db');
            $db->begin();
            
            // Update extension if changed
            if ($record->extension !== $data['extension']) {
                $extension = Extensions::findFirst([
                    'conditions' => 'uniqid = :uniqid: AND type = :type:',
                    'bind' => [
                        'uniqid' => $record->uniqid,
                        'type' => Extensions::TYPE_DIALPLAN_APPLICATION
                    ]
                ]);
                
                if ($extension) {
                    $extension->number = $data['extension'];
                    $extension->callerid = $data['name'];
                    
                    if (!$extension->save()) {
                        $db->rollback();
                        $res->messages['error'] = $extension->getMessages();
                        return $res;
                    }
                }
            }
            
            // Update all fields (full replacement)
            $record->name = $data['name'];
            $record->extension = $data['extension'];
            $record->hint = $data['hint'] ?? '';
            $record->description = $data['description'] ?? '';
            $record->type = $data['type'] ?? 'php';
            
            // Update application logic
            if (isset($data['applicationlogic'])) {
                $record->setApplicationlogic($data['applicationlogic']);
            }
            
            // Save changes
            if (!$record->save()) {
                $db->rollback();
                $res->messages['error'] = $record->getMessages();
                return $res;
            }
            
            // Commit transaction
            $db->commit();
            
            // Return updated record data
            $res->data = DataStructure::createFromModel($record);
            $res->success = true;
            
            // Reload dialplan
            $di->get('pbxConfigurator')->reloadDialplan();
            
        } catch (\Exception $e) {
            if (isset($db) && $db->isUnderTransaction()) {
                $db->rollback();
            }
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
    /**
     * Validate input data for update
     *
     * @param array $data
     * @param DialplanApplications $existingRecord
     * @return array
     */
    private static function validateData(array $data, DialplanApplications $existingRecord): array
    {
        $errors = [];
        
        // Check required fields
        if (empty($data['name'])) {
            $errors[] = 'Name is required';
        }
        
        if (empty($data['extension'])) {
            $errors[] = 'Extension is required';
        } else {
            // Check if extension is numeric
            if (!is_numeric($data['extension'])) {
                $errors[] = 'Extension must be numeric';
            }
            
            // Check if extension is already in use by another record
            if ($data['extension'] !== $existingRecord->extension) {
                $existingExtension = Extensions::findFirst([
                    'conditions' => 'number = :number:',
                    'bind' => ['number' => $data['extension']]
                ]);
                
                if ($existingExtension) {
                    $errors[] = "Extension {$data['extension']} is already in use";
                }
            }
        }
        
        // Validate type
        if (!empty($data['type']) && !in_array($data['type'], ['php', 'plaintext', 'lua', 'agi'])) {
            $errors[] = 'Invalid application type';
        }
        
        return [
            'success' => empty($errors),
            'errors' => $errors
        ];
    }
}