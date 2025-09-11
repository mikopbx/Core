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
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDeleteAction;

/**
 * Delete ARI user action.
 *
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskRestUsers
 */
class DeleteRecordAction extends AbstractDeleteAction
{
    /**
     * Delete ARI user by ID.
     *
     * @param string $id Record ID
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Validate ID
            if (empty($id)) {
                $res->messages['error'][] = 'ID is required';
                return $res;
            }
            
            // Find record
            $record = AsteriskRestUsers::findFirstById($id);
            
            if (!$record) {
                $res->messages['error'][] = 'Record not found';
                return $res;
            }
            
            // Check if this is the internal pbxcore user
            if ($record->username === 'pbxcore') {
                $res->messages['error'][] = 'Cannot delete system user';
                return $res;
            }
            
            // Delete record
            if (!$record->delete()) {
                $errors = $record->getMessages();
                foreach ($errors as $error) {
                    $res->messages['error'][] = $error->getMessage();
                }
                return $res;
            }
            
            $res->success = true;
            $res->data = ['id' => $id];
            
        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}