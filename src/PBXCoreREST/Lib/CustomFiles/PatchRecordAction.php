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
 * Action for partial update of a custom file
 *
 * @api {patch} /pbxcore/api/v3/custom-files/:id Partially update custom file
 * @apiVersion 3.0.0
 * @apiName PatchRecord
 * @apiGroup CustomFiles
 *
 * @apiParam {String} id Custom file ID
 * @apiParam {String} [filepath] File path (must be unique if provided)
 * @apiParam {String} [content] File content (base64 encoded)
 * @apiParam {String} [mode] File mode (none, append, override, script)
 * @apiParam {String} [description] File description
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Updated custom file data
 */
class PatchRecordAction
{
    /**
     * Partial update of custom file (updates only provided fields)
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

            // Track if any changes were made
            $hasChanges = false;

            // Update filepath if provided
            if (isset($data['filepath']) && $data['filepath'] !== $file->filepath) {
                // Check if new filepath is unique
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
                $file->filepath = $data['filepath'];
                $hasChanges = true;
            }

            // Update content if provided
            if (isset($data['content'])) {
                $oldContent = $file->getContent();
                // If content is not base64 encoded, encode it
                if (base64_decode($data['content'], true) === false) {
                    $file->setContent($data['content']);
                } else {
                    $file->content = $data['content'];
                }
                if ($oldContent !== $file->getContent()) {
                    $hasChanges = true;
                }
            }

            // Update mode if provided (but not for MODE_CUSTOM files)
            if (isset($data['mode']) && $file->mode !== CustomFiles::MODE_CUSTOM) {
                // Only allow mode changes for non-custom files
                if (in_array($data['mode'], [
                    CustomFiles::MODE_NONE,
                    CustomFiles::MODE_APPEND,
                    CustomFiles::MODE_OVERRIDE,
                    CustomFiles::MODE_SCRIPT
                ])) {
                    if ($file->mode !== $data['mode']) {
                        $file->mode = $data['mode'];
                        $hasChanges = true;
                    }
                }
            }
            // IMPORTANT: Never change mode for custom files
            // Custom files must always remain MODE_CUSTOM

            // Update description if provided
            if (isset($data['description']) && $file->description !== $data['description']) {
                $file->description = $data['description'];
                $hasChanges = true;
            }

            // If content is empty, force mode to none (except for MODE_CUSTOM files)
            if (empty($file->getContent()) &&
                $file->mode !== CustomFiles::MODE_NONE &&
                $file->mode !== CustomFiles::MODE_CUSTOM) {
                $file->mode = CustomFiles::MODE_NONE;
                $hasChanges = true;
            }

            // Mark as changed if there were updates
            if ($hasChanges) {
                $file->changed = '1';
            }

            // Save the file if there were changes
            if ($hasChanges) {
                if (!$file->save()) {
                    $res->messages['error'] = $file->getMessages();
                    return $res;
                }
            }

            $res->data = DataStructure::createFromModel($file);
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}