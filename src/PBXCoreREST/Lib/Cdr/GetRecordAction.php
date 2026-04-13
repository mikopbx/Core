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

namespace MikoPBX\PBXCoreREST\Lib\Cdr;

use MikoPBX\Common\Models\CallDetailRecords;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Throwable;

/**
 * Get single CDR record action
 *
 * Supports two lookup modes based on ID format (mirrors DeleteRecordAction):
 * - numeric ID: lookup by primary key
 * - linkedid (mikopbx-*): returns the originating record of the conversation
 *   (earliest by start time). Use GET /cdr?linkedid=... to fetch every segment
 *   of a transferred call.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Cdr
 */
class GetRecordAction
{
    /**
     * Get single CDR record by numeric ID or linkedid.
     *
     * @param string|null $id Record ID (numeric) or linkedid (mikopbx-*)
     * @return PBXApiResult
     */
    public static function main(?string $id = null): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // ============ PHASE 1: VALIDATION ============
        if (empty($id)) {
            $res->messages['error'][] = 'Record ID is required';
            $res->httpCode = 400;
            return $res;
        }

        // ============ PHASE 2: DETERMINE ID TYPE ============
        $isLinkedId = str_starts_with($id, 'mikopbx-');
        // Reject decimal numbers (12.34) — only accept integers.
        $isNumericId = is_numeric($id) && (string)(int)$id === $id;

        if (!$isLinkedId && !$isNumericId) {
            $res->messages['error'][] = 'Invalid ID format. Expected: integer ID or linkedid (mikopbx-*)';
            $res->httpCode = 400;
            return $res;
        }

        // ============ PHASE 3: FETCH RECORD ============
        try {
            if ($isLinkedId) {
                // Originating record of the conversation — earliest segment.
                // Full conversation is available via GET /cdr?linkedid=...
                $record = CallDetailRecords::findFirst([
                    'conditions' => 'linkedid = :linkedid:',
                    'bind' => ['linkedid' => $id],
                    'order' => 'start ASC',
                ]);
            } else {
                $record = CallDetailRecords::findFirst([
                    'conditions' => 'id = :id:',
                    'bind' => ['id' => (int)$id],
                ]);
            }
        } catch (Throwable $e) {
            $res->messages['error'][] = 'Failed to query CDR record: ' . $e->getMessage();
            $res->httpCode = 500;
            return $res;
        }

        if ($record === null) {
            $res->messages['error'][] = 'CDR record not found';
            $res->httpCode = 404;
            return $res;
        }

        // ============ PHASE 4: FORMAT RESPONSE ============
        // createFromModel() adds playback_url/download_url and applies schema typing.
        $res->data = DataStructure::createFromModel($record);
        $res->success = true;
        $res->httpCode = 200;

        return $res;
    }
}
