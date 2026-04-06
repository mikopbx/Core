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

namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

use MikoPBX\Common\Models\CallQueues;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * UpdateRecordAction
 * Updates an existing call queue record (full update - PUT).
 *
 * @package MikoPBX\PBXCoreREST\Lib\CallQueues
 */
class UpdateRecordAction extends AbstractSaveRecordAction
{
    /**
     * Update an existing call queue record (full update).
     *
     * @param array<string, mixed> $data Call queue data with all fields to replace existing
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // Validate that ID is provided
            if (empty($data['id'])) {
                $res->messages['error'][] = 'Call queue ID is required for update';
                return $res;
            }
            
            // v3 API: ID is the uniqid value
            $queue = CallQueues::findFirst("uniqid='{$data['id']}'");
            
            if (!$queue) {
                $res->messages['error'][] = "Call queue not found: {$data['id']}";
                return $res;
            }
            
            // Ensure id field with uniqid value is preserved for SaveRecordAction
            $data['id'] = $queue->uniqid;
            
            // Use existing SaveRecordAction logic for actual update
            $res = SaveRecordAction::main($data);
            
        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}