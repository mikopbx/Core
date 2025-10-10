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

namespace MikoPBX\PBXCoreREST\Lib\CustomFiles;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * CreateRecordAction
 * Creates a new custom file record.
 *
 * Note: This class has custom implementation due to specific requirements:
 * - Security-critical path validation
 * - Base64 content encoding/decoding
 * - Immediate file application to filesystem
 *
 * @package MikoPBX\PBXCoreREST\Lib\CustomFiles
 */
class CreateRecordAction extends AbstractSaveRecordAction
{
    /**
     * Create a new custom file.
     *
     * @param array<string, mixed> $data Custom file data
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // Validate required fields
            if (empty($data['filepath'])) {
                $res->messages['error'][] = 'File path is required';
                return $res;
            }

            // Security check: ensure file is in allowed directory
            if (!CustomFiles::isPathAllowed($data['filepath'])) {
                $res->messages['error'][] = CustomFiles::getSecurityErrorMessage($data['filepath']);
                return $res;
            }

            // Check if filepath already exists
            $existing = CustomFiles::findFirst([
                'conditions' => 'filepath = :filepath:',
                'bind' => ['filepath' => $data['filepath']]
            ]);
            if ($existing) {
                $res->messages['error'][] = "File with path '{$data['filepath']}' already exists";
                return $res;
            }

            // Create new custom file
            $file = new CustomFiles();
            $file->filepath = $data['filepath'];

            // Set content if provided (handle base64)
            if (isset($data['content'])) {
                // If content is not base64 encoded, encode it
                if (base64_decode($data['content'], true) === false) {
                    $file->setContent($data['content']);
                } else {
                    $file->content = $data['content'];
                }
            } else {
                $file->setContent('');
            }

            // Set mode - always CUSTOM for new user-created files
            $file->mode = CustomFiles::MODE_CUSTOM;

            // Set other fields
            $file->description = $data['description'] ?? '';
            $file->changed = '1'; // Mark as changed for new files

            // Content handling for CUSTOM mode is the same as OVERRIDE

            // Save the file
            if (!$file->save()) {
                $res->messages['error'] = $file->getMessages();
                return $res;
            }

            // Force immediate application of custom file to filesystem
            if ($file->mode === CustomFiles::MODE_CUSTOM) {
                // Directly apply the file using the action class
                $applyAction = new \MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ApplyCustomFilesAction();
                $applyAction->execute(['fileId' => $file->id]);
            }

            $res->data = DataStructure::createFromModel($file);
            $res->success = true;
            // Add reload URL for frontend navigation
            $res->reload = "custom-files/modify/{$file->id}";

            // Log successful creation
            SystemMessages::sysLogMsg(__CLASS__, 'New custom file created: ' . $file->id . ' (' . $file->filepath . ')', LOG_INFO);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}