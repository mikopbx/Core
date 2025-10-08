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

namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * PatchRecordAction
 * Partially updates an existing AMI user.
 *
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskManagers
 */
class PatchRecordAction
{
    /**
     * Partially update an existing AMI user.
     *
     * @param array $data Partial AMI user data with id
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Validate ID
            if (empty($data['id'])) {
                $res->messages['error'][] = 'ID is required for patch';
                return $res;
            }

            // Find existing model
            $model = AsteriskManagerUsers::findFirstById($data['id']);
            if (!$model) {
                $res->messages['error'][] = "AMI user not found (ID: {$data['id']})";
                return $res;
            }

            // Process only provided fields (partial update)
            $result = SaveRecordAction::processData($model, $data, true);
            
            if ($result['success']) {
                $res->data = ['id' => $result['id']];
                $res->success = true;
            } else {
                $res->messages = $result['messages'];
            }
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}