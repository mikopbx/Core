<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\CallDetailRecords;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\RecordingDeletionLogger;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\Di;
use Throwable;

/**
 * Class DeleteCDR
 *
 * Executes CDR record deletion inside the WorkerCallEvents single-writer context
 * to keep cdr.db writes serialised through one Beanstalk tube. Invoked from
 * WorkerCallEvents::deleteCDRWorker() when the REST API DeleteRecordAction
 * publishes a request to WorkerCdr::DELETE_CDR_TUBE.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerCallEvents
 */
class DeleteCDR
{
    /**
     * Execute CDR record deletion.
     *
     * Request payload:
     *  - id: string              CDR record id or linkedid (mikopbx-*)
     *  - isLinkedId: bool        true if id is a linkedid
     *  - deleteRecording: bool   whether to delete the audio files
     *  - sessionContext: array   {user_name, remote_addr} from the REST caller
     *
     * @param array $request decoded request
     * @return string JSON-encoded reply: {success, data, error?, httpCode}
     */
    public static function execute(array $request): string
    {
        $id = (string)($request['id'] ?? '');
        $isLinkedId = (bool)($request['isLinkedId'] ?? false);
        $deleteRecording = (bool)($request['deleteRecording'] ?? false);
        $sessionContext = $request['sessionContext'] ?? [];

        if ($id === '') {
            return self::reply(false, [], 'Invalid record ID', 400);
        }

        try {
            if ($isLinkedId) {
                $record = CallDetailRecords::findFirst([
                    'conditions' => 'linkedid = :linkedid:',
                    'bind' => ['linkedid' => $id],
                ]);
            } else {
                $record = CallDetailRecords::findFirst([
                    'conditions' => 'id = :id:',
                    'bind' => ['id' => (int)$id],
                ]);
            }

            if (!$record) {
                return self::reply(false, [], 'Record not found', 404);
            }

            $recordingFile = $record->recordingfile ?? '';
            $linkedId = $record->linkedid ?? '';
            $recordingDeleted = false;
            $linkedRecordsDeleted = 0;

            $username = (string)($sessionContext['user_name'] ?? 'api');
            $remoteAddr = (string)($sessionContext['remote_addr'] ?? 'unknown');
            // Encode as JSON to prevent log injection via crafted user names
            // (e.g. "admin, ip=1.2.3.4" forging fields in the audit string).
            $apiContext = json_encode(
                ['user' => $username, 'ip' => $remoteAddr, 'linkedid' => $linkedId],
                JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
            );
            if (!is_string($apiContext)) {
                $apiContext = '{}';
            }

            if ($isLinkedId && $linkedId !== '') {
                $linkedRecordsDeleted = self::deleteLinkedRecords(
                    $linkedId,
                    (int)$record->id,
                    $deleteRecording,
                    $apiContext
                );
            }

            if ($deleteRecording && $recordingFile !== '') {
                $recordingDeleted = self::deleteRecordingFiles($recordingFile, $apiContext);
            }

            if (!$record->delete()) {
                return self::reply(
                    false,
                    [],
                    'Failed to delete record: ' . implode(', ', $record->getMessages()),
                    500
                );
            }

            self::logDeletion($id, $linkedId, $recordingDeleted, $recordingFile, $linkedRecordsDeleted, $username, $remoteAddr);

            return self::reply(
                true,
                [
                    'id' => $id,
                    'linkedid' => $linkedId,
                    'recordingDeleted' => $recordingDeleted,
                    'linkedRecordsDeleted' => $linkedRecordsDeleted,
                ]
            );
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            return self::reply(false, [], 'CDR delete failed: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete all records with the same linkedid except the main one.
     */
    private static function deleteLinkedRecords(
        string $linkedId,
        int $excludeId,
        bool $deleteRecording,
        string $apiContext
    ): int {
        $deleted = 0;

        /** @var \Phalcon\Mvc\Model\ResultsetInterface|CallDetailRecords[] $linkedRecords */
        $linkedRecords = CallDetailRecords::find([
            'conditions' => 'linkedid = :linkedid: AND id != :excludeId:',
            'bind' => [
                'linkedid' => $linkedId,
                'excludeId' => $excludeId,
            ],
        ]);

        /** @var CallDetailRecords $linkedRecord */
        foreach ($linkedRecords as $linkedRecord) {
            if ($deleteRecording && !empty($linkedRecord->recordingfile)) {
                self::deleteRecordingFiles($linkedRecord->recordingfile, $apiContext);
            }
            if ($linkedRecord->delete()) {
                $deleted++;
            }
        }

        return $deleted;
    }

    /**
     * Delete the recording file and all its alternative format siblings.
     *
     * Defense-in-depth: refuses to unlink anything outside the legitimate
     * monitor directory. The path comes from a DB column written by Asterisk
     * under normal operation, but a malicious or buggy module could plant a
     * traversal value (e.g. `../../etc/passwd`).
     */
    private static function deleteRecordingFiles(string $recordingFile, string $apiContext): bool
    {
        $monitorDir = realpath(Directories::getDir(Directories::AST_MONITOR_DIR));
        if ($monitorDir === false) {
            return false;
        }
        $allowedBase = rtrim($monitorDir, '/') . '/';

        $deleted = false;

        $deleted = self::unlinkIfWithinBase($recordingFile, $allowedBase, $apiContext) || $deleted;

        $pathInfo = pathinfo($recordingFile);
        $basePath = ($pathInfo['dirname'] ?? '') . '/' . ($pathInfo['filename'] ?? '');

        foreach (['.wav', '.wav16', '.wav48', '.mp3', '.ogg'] as $ext) {
            $file = $basePath . $ext;
            if ($file === $recordingFile) {
                continue;
            }
            $deleted = self::unlinkIfWithinBase($file, $allowedBase, $apiContext) || $deleted;
        }

        return $deleted;
    }

    /**
     * Unlinks a single file only if its real path resolves under the allowed base.
     * Logs (and refuses) any out-of-base attempt.
     */
    private static function unlinkIfWithinBase(string $file, string $allowedBase, string $apiContext): bool
    {
        if (!file_exists($file)) {
            return false;
        }
        $real = realpath($file);
        if ($real === false || !str_starts_with($real . '/', $allowedBase)) {
            SystemMessages::sysLogMsg(
                self::class,
                'Refused to delete out-of-base recording file: ' . $file,
                LOG_WARNING
            );
            return false;
        }
        RecordingDeletionLogger::log(RecordingDeletionLogger::API_DELETE, $real, $apiContext);
        return @unlink($real);
    }

    /**
     * Security audit trail for CDR deletions.
     */
    private static function logDeletion(
        string $id,
        string $linkedId,
        bool $recordingDeleted,
        ?string $recordingFile,
        int $linkedRecordsDeleted,
        string $username,
        string $remoteAddr
    ): void {
        $di = Di::getDefault();
        if ($di === null || !$di->has('logger')) {
            return;
        }
        $di->get('logger')->info(sprintf(
            'CDR deleted: ID=%s, LinkedID=%s, Recording=%s, File=%s, LinkedRecords=%d, User=%s, IP=%s',
            $id,
            $linkedId,
            $recordingDeleted ? 'deleted' : 'kept',
            $recordingFile !== null && $recordingFile !== '' ? $recordingFile : 'none',
            $linkedRecordsDeleted,
            $username,
            $remoteAddr
        ));
    }

    /**
     * Build the JSON-encoded reply payload returned to the REST caller.
     *
     * Uses JSON_THROW_ON_ERROR + JSON_INVALID_UTF8_SUBSTITUTE to guarantee
     * a valid string even when a CDR row contains non-UTF-8 bytes (e.g. a
     * corrupted recordingfile path). On any encode failure we fall back to
     * a minimal hand-built payload so the caller never receives `false`.
     */
    private static function reply(bool $success, array $data = [], string $error = '', int $httpCode = 200): string
    {
        $payload = ['success' => $success, 'data' => $data, 'httpCode' => $httpCode];
        if ($error !== '') {
            $payload['error'] = $error;
        }
        try {
            return json_encode(
                $payload,
                JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
            );
        } catch (Throwable $e) {
            return '{"success":false,"data":[],"httpCode":500,"error":"reply encode failed"}';
        }
    }
}
