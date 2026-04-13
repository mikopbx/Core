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

use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\Workers\WorkerCdr;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Throwable;

/**
 * Class DeleteRecordAction
 *
 * Supports two deletion modes based on ID format:
 * - linkedid (mikopbx-*): Deletes ALL records with this linkedid (entire conversation)
 * - numeric ID: Deletes single record only
 *
 * The actual database write is performed inside WorkerCallEvents via the
 * DELETE_CDR_TUBE Beanstalk queue to keep cdr.db writes serialised through a
 * single process (issue #1000 / #1019). This REST action only validates input
 * and forwards the request.
 *
 * Examples:
 * - DELETE /cdr/mikopbx-1760784793.4627 → deletes entire conversation (all linked records)
 * - DELETE /cdr/718517 → deletes single record with ID 718517
 * - DELETE /cdr/mikopbx-1760784793.4627?deleteRecording=true → deletes conversation + all recording files
 *
 * @package MikoPBX\PBXCoreREST\Lib\Cdr
 */
class DeleteRecordAction
{
    /**
     * Maximum time the REST caller will wait for the single-writer worker.
     *
     * A linkedid cascade with hundreds of related records and recording-file
     * unlinks on slow USB storage can take tens of seconds. The timeout is a
     * cap, not a target — typical single-id deletes complete in a few ms.
     *
     * Note: if this timeout fires, the worker is unaware and will keep
     * processing the request. The DB ends up consistent (the worker
     * eventually finishes) but the caller sees a 503. Clients should retry
     * GET to confirm final state rather than assume failure.
     */
    private const int WORKER_TIMEOUT_SECONDS = 60;

    /**
     * Delete CDR record(s) by numeric ID or linkedid.
     *
     * @param string|null          $id             CDR record ID or linkedid (mikopbx-*)
     * @param array<string, mixed> $data           Optional parameters (deleteRecording: bool)
     * @param array<string, mixed> $sessionContext {user_name, remote_addr} from BaseController
     *
     * @return PBXApiResult
     */
    public static function main(?string $id, array $data = [], array $sessionContext = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // ============ PHASE 1: VALIDATION ============
        if (empty($id)) {
            $res->messages['error'][] = 'Invalid record ID';
            $res->httpCode = 400;
            return $res;
        }

        // ============ PHASE 2: DETERMINE ID TYPE ============
        // - linkedid (mikopbx-*): delete ALL records with this linkedid
        // - numeric ID: delete single record only
        $isLinkedId = str_starts_with($id, 'mikopbx-');

        // Reject decimal numbers (12.34) — only accept integers.
        $isNumericId = is_numeric($id) && (string)(int)$id === $id;

        if (!$isLinkedId && !$isNumericId) {
            $res->messages['error'][] = 'Invalid ID format. Expected: integer ID or linkedid (mikopbx-*)';
            $res->httpCode = 400;
            return $res;
        }

        // ============ PHASE 3: EXTRACT PARAMETERS ============
        $deleteRecording = filter_var($data['deleteRecording'] ?? false, FILTER_VALIDATE_BOOLEAN);

        // ============ PHASE 4: DISPATCH TO SINGLE-WRITER WORKER ============
        try {
            $client = new BeanstalkClient(WorkerCdr::DELETE_CDR_TUBE);
            // BeanstalkClient::__construct catches its own connect errors and
            // sets isConnected = false instead of throwing, so we have to ask.
            if (!$client->isConnected()) {
                $res->messages['error'][] = 'CDR delete queue unavailable';
                $res->httpCode = 503;
                return $res;
            }
            [$ok, $message] = $client->sendRequest(
                json_encode([
                    'id' => $id,
                    'isLinkedId' => $isLinkedId,
                    'deleteRecording' => $deleteRecording,
                    'sessionContext' => $sessionContext,
                ]),
                self::WORKER_TIMEOUT_SECONDS
            );
        } catch (Throwable $e) {
            $res->messages['error'][] = 'CDR delete dispatch failed: ' . $e->getMessage();
            $res->httpCode = 500;
            return $res;
        }

        if ($ok === false) {
            $res->messages['error'][] = 'CDR delete worker did not respond within timeout';
            $res->httpCode = 503;
            return $res;
        }

        $reply = json_decode($message, true);
        if (!is_array($reply)) {
            $res->messages['error'][] = 'Invalid worker response';
            $res->httpCode = 500;
            return $res;
        }

        if (empty($reply['success'])) {
            $res->messages['error'][] = $reply['error'] ?? 'Unknown error';
            $res->httpCode = (int)($reply['httpCode'] ?? 500);
            return $res;
        }

        $res->data = $reply['data'] ?? [];
        $res->success = true;
        $res->httpCode = 200;

        return $res;
    }
}
