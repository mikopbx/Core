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

namespace MikoPBX\PBXCoreREST\Lib\AsteriskRestUsers;

use MikoPBX\Common\Models\AsteriskRestUsers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;

/**
 * Full update (replace) ARI user action.
 *
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskRestUsers
 */
class UpdateRecordAction extends AbstractSaveRecordAction
{
    /**
     * Full update of ARI user.
     * This is a PUT operation that replaces all fields.
     *
     * @param array $data User data with ID
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // Validate ID
            if (empty($data['id'])) {
                $res->messages['error'][] = 'ID is required';
                return $res;
            }
            
            // Find existing record
            $record = AsteriskRestUsers::findFirstById($data['id']);
            
            if (!$record) {
                $res->messages['error'][] = 'Record not found';
                return $res;
            }
            
            // Update all fields (PUT replaces everything)
            $record->username = $data['username'] ?? '';
            
            // Only update password if provided
            if (!empty($data['password'])) {
                $record->password = $data['password'];
            }
            
            $record->description = $data['description'] ?? '';
            
            // Handle applications
            if (isset($data['applications'])) {
                if (is_array($data['applications']) && !empty($data['applications'])) {
                    $record->setApplicationsArray($data['applications']);
                } else {
                    $record->applications = '';
                }
            } else {
                // PUT should replace all fields, so clear if not provided
                $record->applications = '';
            }
            
            // Validate required fields
            if (empty($record->username)) {
                $res->messages['error'][] = 'Username is required';
                return $res;
            }
            
            // Check for duplicate username (excluding current record)
            $existing = AsteriskRestUsers::findFirst([
                'conditions' => 'username = :username: AND id != :id:',
                'bind' => [
                    'username' => $record->username,
                    'id' => $record->id
                ]
            ]);
            
            if ($existing) {
                $res->messages['error'][] = 'Username already exists';
                return $res;
            }
            
            // Save record
            if (!$record->save()) {
                $errors = $record->getMessages();
                foreach ($errors as $error) {
                    $res->messages['error'][] = $error->getMessage();
                }
                return $res;
            }
            
            // Build response data
            $res->data = DataStructure::createFromModel($record);
            $res->success = true;
            
        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}