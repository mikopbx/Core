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
use Phalcon\Di\Di;

/**
 * Class DeleteRecordAction
 *
 * Supports two deletion modes based on ID format:
 * - linkedid (mikopbx-*): Deletes ALL records with this linkedid (entire conversation)
 * - numeric ID: Deletes single record only
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
     * Delete CDR record(s) by numeric ID or linkedid
     *
     * ID Format:
     * - "mikopbx-*" (linkedid): Deletes ALL records with this linkedid (entire conversation)
     * - Numeric (e.g., "718517"): Deletes single record by ID only
     *
     * @param string|null $id CDR record ID (numeric like "718517") or linkedid (like "mikopbx-1760784793.4627")
     * @param array<string, mixed> $data Request data with optional parameters:
     *                                    - deleteRecording: boolean (default: false) - Delete recording files
     *
     * @return PBXApiResult Result object containing deletion information
     */
    public static function main(?string $id, array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // ============ PHASE 1: VALIDATION ============
        // WHY: Validate ID before any processing
        if (empty($id)) {
            $res->messages['error'][] = 'Invalid record ID';
            $res->httpCode = 400;
            return $res;
        }

        // ============ PHASE 2: DETERMINE ID TYPE ============
        // WHY: Support two deletion modes:
        // - linkedid (mikopbx-*): Delete ALL records with this linkedid (entire conversation)
        // - numeric ID: Delete single record only
        $isLinkedId = str_starts_with($id, 'mikopbx-');

        // WHY: Reject decimal numbers (12.34) - only accept integers
        // Security: is_numeric() accepts floats, but CDR IDs must be integers
        $isNumericId = is_numeric($id) && (string)(int)$id === $id;

        if (!$isLinkedId && !$isNumericId) {
            $res->messages['error'][] = 'Invalid ID format. Expected: integer ID or linkedid (mikopbx-*)';
            $res->httpCode = 400;
            return $res;
        }

        if ($isLinkedId) {
            // linkedid string: find first record with this linkedid
            $record = CallDetailRecords::findFirst([
                'conditions' => 'linkedid = :linkedid:',
                'bind' => ['linkedid' => $id]
            ]);
        } else {
            // Numeric ID: find single record by ID
            $record = CallDetailRecords::findFirst([
                'conditions' => 'id = :id:',
                'bind' => ['id' => (int)$id]
            ]);
        }

        if (!$record) {
            $res->messages['error'][] = 'Record not found';
            $res->httpCode = 404;
            return $res;
        }

        // ============ PHASE 3: EXTRACT PARAMETERS ============
        // WHY: Prepare deletion options
        $deleteRecording = filter_var($data['deleteRecording'] ?? false, FILTER_VALIDATE_BOOLEAN);

        // Preserve info for logging and response
        $recordingFile = $record->recordingfile ?? '';
        $linkedId = $record->linkedid ?? '';
        $recordingDeleted = false;
        $linkedRecordsDeleted = 0;

        // ============ PHASE 4: DELETE LINKED RECORDS ============
        // WHY: Two deletion scenarios:
        // 1. Delete by linkedid (mikopbx-*) → delete ALL records with this linkedid
        // 2. Delete by numeric ID → delete only this single record
        if ($isLinkedId && !empty($linkedId)) {
            $linkedRecordsDeleted = self::deleteLinkedRecords(
                $linkedId,
                (int)$record->id,
                $deleteRecording
            );
        }

        // ============ PHASE 5: DELETE RECORDING FILES ============
        // WHY: Delete files before DB record (cleanup even if DB delete fails)
        if ($deleteRecording && !empty($recordingFile)) {
            $recordingDeleted = self::deleteRecordingFiles($recordingFile);
        }

        // ============ PHASE 6: DELETE DATABASE RECORD ============
        // WHY: Remove record from database
        if (!$record->delete()) {
            $res->messages['error'][] = 'Failed to delete record: ' .
                implode(', ', $record->getMessages());
            $res->httpCode = 500;
            return $res;
        }

        // ============ PHASE 7: LOGGING ============
        // WHY: Security audit trail for deletions
        self::logDeletion($id, $linkedId, $recordingDeleted, $recordingFile, $linkedRecordsDeleted);

        // ============ PHASE 8: RESPONSE ============
        // WHY: Provide detailed feedback about deletion
        $res->data = [
            'id' => $id,
            'linkedid' => $linkedId,
            'recordingDeleted' => $recordingDeleted,
            'linkedRecordsDeleted' => $linkedRecordsDeleted,
        ];
        $res->success = true;
        $res->httpCode = 200;

        return $res;
    }

    /**
     * Delete all records with the same linkedid (except the main record)
     *
     * @param string $linkedId LinkedID to match
     * @param int $excludeId Main record ID to exclude from deletion
     * @param bool $deleteRecording Whether to delete recording files
     *
     * @return int Number of linked records deleted
     */
    private static function deleteLinkedRecords(string $linkedId, int $excludeId, bool $deleteRecording): int
    {
        $deleted = 0;

        // Find all linked records except the main one
        /** @var \Phalcon\Mvc\Model\ResultsetInterface|CallDetailRecords[] $linkedRecords */
        $linkedRecords = CallDetailRecords::find([
            'conditions' => 'linkedid = :linkedid: AND id != :excludeId:',
            'bind' => [
                'linkedid' => $linkedId,
                'excludeId' => $excludeId
            ]
        ]);

        /** @var CallDetailRecords $linkedRecord */
        foreach ($linkedRecords as $linkedRecord) {
            // Delete recording files if requested
            if ($deleteRecording && !empty($linkedRecord->recordingfile)) {
                self::deleteRecordingFiles($linkedRecord->recordingfile);
            }

            // Delete the record
            if ($linkedRecord->delete()) {
                $deleted++;
            }
        }

        return $deleted;
    }

    /**
     * Delete recording files (all formats: .mp3, .wav, .ogg)
     *
     * @param string $recordingFile Path to the main recording file
     *
     * @return bool True if at least one file was deleted
     */
    private static function deleteRecordingFiles(string $recordingFile): bool
    {
        $deleted = false;

        // Delete the main file if exists
        if (file_exists($recordingFile)) {
            if (@unlink($recordingFile)) {
                $deleted = true;
            }
        }

        // Delete alternative format files
        $pathInfo = pathinfo($recordingFile);
        $basePath = $pathInfo['dirname'] . '/' . $pathInfo['filename'];

        foreach (['.wav', '.mp3', '.ogg'] as $ext) {
            $file = $basePath . $ext;

            // Skip if it's the same as main file
            if ($file === $recordingFile) {
                continue;
            }

            // Delete if exists
            if (file_exists($file)) {
                if (@unlink($file)) {
                    $deleted = true;
                }
            }
        }

        return $deleted;
    }

    /**
     * Log CDR deletion for security audit
     *
     * @param string $id Record ID
     * @param string $linkedId LinkedID
     * @param bool $recordingDeleted Whether recording was deleted
     * @param string|null $recordingFile Recording file path
     * @param int $linkedRecordsDeleted Number of linked records deleted
     *
     * @return void
     */
    private static function logDeletion(
        string $id,
        string $linkedId,
        bool $recordingDeleted,
        ?string $recordingFile,
        int $linkedRecordsDeleted
    ): void {
        $di = Di::getDefault();

        // Get logger if available
        if (!$di->has('logger')) {
            return;
        }

        $logger = $di->get('logger');

        // Get user context from session or request
        $username = $_SESSION['auth']['username'] ?? 'api';
        $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

        // Build log message
        $message = sprintf(
            'CDR deleted: ID=%s, LinkedID=%s, Recording=%s, File=%s, LinkedRecords=%d, User=%s, IP=%s',
            $id,
            $linkedId,
            $recordingDeleted ? 'deleted' : 'kept',
            $recordingFile ?: 'none',
            $linkedRecordsDeleted,
            $username,
            $remoteAddr
        );

        $logger->info($message);
    }
}
