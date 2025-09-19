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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for full update (replacement) of a custom file
 *
 * @api {put} /pbxcore/api/v3/custom-files/:id Update custom file
 * @apiVersion 3.0.0
 * @apiName UpdateRecord
 * @apiGroup CustomFiles
 *
 * @apiParam {String} id Custom file ID
 * @apiParam {String} filepath File path (required, must be unique)
 * @apiParam {String} content File content (base64 encoded)
 * @apiParam {String} mode File mode (none, append, override, script)
 * @apiParam {String} description File description
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Updated custom file data
 */
class UpdateRecordAction
{
    /**
     * Full update of custom file (replaces all fields)
     *
     * @param array $data Custom file data including ID
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Validate ID
            if (empty($data['id'])) {
                $res->messages['error'][] = 'ID is required';
                return $res;
            }

            // Find existing file
            $file = CustomFiles::findFirstById($data['id']);
            if (!$file) {
                $res->messages['error'][] = "Custom file with ID '{$data['id']}' not found";
                return $res;
            }

            // Validate required fields for update
            if (empty($data['filepath'])) {
                $res->messages['error'][] = 'File path is required';
                return $res;
            }

            // Security check: ensure file is in allowed directory
            if (!CustomFiles::isPathAllowed($data['filepath'])) {
                $res->messages['error'][] = CustomFiles::getSecurityErrorMessage($data['filepath']);
                return $res;
            }

            // Check if filepath is unique (if changed)
            if ($file->filepath !== $data['filepath']) {
                $existing = CustomFiles::findFirst([
                    'conditions' => 'filepath = :filepath: AND id != :id:',
                    'bind' => [
                        'filepath' => $data['filepath'],
                        'id' => $data['id']
                    ]
                ]);
                if ($existing) {
                    $res->messages['error'][] = "File with path '{$data['filepath']}' already exists";
                    return $res;
                }
            }

            // Update all fields (full replacement)
            $file->filepath = $data['filepath'];

            // Handle content
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

            // Set mode (protect MODE_CUSTOM from changes)
            $originalMode = $file->mode;
            if ($originalMode === CustomFiles::MODE_CUSTOM) {
                // MODE_CUSTOM files cannot have their mode changed
                $file->mode = CustomFiles::MODE_CUSTOM;
            } else {
                // For non-custom files, allow mode changes
                $file->mode = $data['mode'] ?? CustomFiles::MODE_NONE;
                if (!in_array($file->mode, [
                    CustomFiles::MODE_NONE,
                    CustomFiles::MODE_APPEND,
                    CustomFiles::MODE_OVERRIDE,
                    CustomFiles::MODE_SCRIPT,
                    CustomFiles::MODE_CUSTOM  // Allow setting MODE_CUSTOM for new records through PUT
                ])) {
                    $file->mode = CustomFiles::MODE_NONE;
                }
            }

            // Set other fields
            $file->description = $data['description'] ?? '';
            $file->changed = '1'; // Mark as changed

            // If content is empty, force mode to none (except for MODE_CUSTOM files)
            if (empty($file->getContent()) && $file->mode !== CustomFiles::MODE_CUSTOM) {
                $file->mode = CustomFiles::MODE_NONE;
            }

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

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}