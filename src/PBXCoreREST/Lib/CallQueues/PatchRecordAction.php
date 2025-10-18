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
use MikoPBX\Common\Models\CallQueueMembers;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * PatchRecordAction
 * Partially updates a call queue record (PATCH).
 *
 * @package MikoPBX\PBXCoreREST\Lib\CallQueues
 */
class PatchRecordAction extends AbstractSaveRecordAction
{
    /**
     * Partially update a call queue record.
     *
     * Uses schema-based approach to merge existing data with patch updates,
     * eliminating manual field mapping and ensuring consistency.
     *
     * @param array<string, mixed> $data Partial call queue data to update
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // Validate that ID is provided
            if (empty($data['id'])) {
                $res->messages['error'][] = 'Call queue ID is required for patch';
                return $res;
            }

            // v3 API: ID is the uniqid value
            $queue = CallQueues::findFirst("uniqid='{$data['id']}'");

            if (!$queue) {
                $res->messages['error'][] = "Call queue not found: {$data['id']}";
                $res->httpCode = 404;
                return $res;
            }

            // Get existing members if not provided in patch data
            $existingMembers = [];
            if (!isset($data['members'])) {
                /** @var \Phalcon\Mvc\Model\Resultset\Simple $members */
                $members = CallQueueMembers::find("queue='{$queue->uniqid}'");
                /** @var CallQueueMembers $member */
                foreach ($members as $member) {
                    $existingMembers[] = [
                        'extension' => $member->extension,
                        'priority' => $member->priority
                    ];
                }
            }

            // Build full data by creating structure from model
            // This uses DataStructure to get complete current state
            $currentData = DataStructure::createFromModel($queue, $existingMembers);

            // Merge patch data on top of current data
            // This ensures only provided fields are updated
            $fullData = array_merge($currentData, $data);

            // Ensure ID is preserved (v3 API uses uniqid)
            $fullData['id'] = $queue->uniqid;

            // Use existing SaveRecordAction logic for actual update
            $res = SaveRecordAction::main($fullData);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}