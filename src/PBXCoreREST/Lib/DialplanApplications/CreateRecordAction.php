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
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Create new dialplan application
 *
 * @package MikoPBX\PBXCoreREST\Lib\DialplanApplications
 */
class CreateRecordAction
{
    /**
     * Create a new dialplan application
     *
     * @param array $data Request data
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Validate required fields
            $validationResult = self::validateData($data);
            if (!$validationResult['success']) {
                $res->messages['error'] = $validationResult['errors'];
                return $res;
            }
            
            // Create new dialplan application
            $record = new DialplanApplications();
            
            // Generate unique ID using standard method (creates short ID like IVR)
            $record->uniqid = DialplanApplications::generateUniqueID('DIALPLAN-');
            $record->name = $data['name'];
            $record->extension = $data['extension'];
            $record->hint = $data['hint'] ?? '';
            $record->description = $data['description'] ?? '';
            $record->type = $data['type'] ?? 'php';
            
            // Encode application logic if provided
            if (!empty($data['applicationlogic'])) {
                $record->setApplicationlogic($data['applicationlogic']);
            }
            
            // Create extension record
            $extension = new Extensions();
            $extension->uniqid = $record->uniqid;
            $extension->type = Extensions::TYPE_DIALPLAN_APPLICATION;
            $extension->number = $record->extension;
            $extension->callerid = $record->name;
            $extension->userid = null;
            $extension->show_in_phonebook = '1';
            $extension->public_access = '1';
            
            // Start transaction
            $di = \Phalcon\Di\Di::getDefault();
            $db = $di->get('db');
            $db->begin();
            
            // Save extension first
            if (!$extension->save()) {
                $db->rollback();
                $res->messages['error'] = $extension->getMessages();
                return $res;
            }
            
            // Save dialplan application
            if (!$record->save()) {
                $db->rollback();
                $res->messages['error'] = $record->getMessages();
                return $res;
            }
            
            // Commit transaction
            $db->commit();
            
            // Reload model to get all fields
            $record = DialplanApplications::findFirstByUniqid($record->uniqid);
            
            // Return created record data
            $res->data = DataStructure::createFromModel($record);
            $res->success = true;
            // Add reload URL for frontend navigation
            $res->reload = "dialplan-applications/modify/{$record->uniqid}";

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
     * Validate input data
     *
     * @param array $data
     * @return array
     */
    private static function validateData(array $data): array
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
            
            // Check if extension is already in use
            $existingExtension = Extensions::findFirst([
                'conditions' => 'number = :number:',
                'bind' => ['number' => $data['extension']]
            ]);
            
            if ($existingExtension) {
                $errors[] = "Extension {$data['extension']} is already in use";
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