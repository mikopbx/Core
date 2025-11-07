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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\CustomFiles;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Check if custom file exists on filesystem
 *
 * This endpoint is used for testing and verification that custom files
 * are properly applied to the filesystem.
 *
 * @api {get} /pbxcore/api/v3/custom-files/{id}:checkFile Check file on disk
 * @apiVersion 3.0.0
 * @apiName CheckFile
 * @apiGroup CustomFiles
 *
 * @apiParam {Number} id Custom file ID
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data File check data
 * @apiSuccess {Boolean} data.exists True if file exists on disk
 * @apiSuccess {String} data.filepath Full file path
 * @apiSuccess {String} data.mode File mode from database
 * @apiSuccess {String} data.content File content from disk (if exists)
 * @apiSuccess {Number} data.size File size in bytes (if exists)
 * @apiSuccess {String} data.permissions File permissions (if exists)
 * @apiSuccess {Number} data.mtime File modification time (if exists)
 */
class CheckFileAction
{
    /**
     * Check if custom file exists on filesystem
     *
     * @param string $id Custom file ID
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Find custom file record
            $file = CustomFiles::findFirstById($id);

            if (!$file) {
                $res->messages['error'][] = "Custom file with ID {$id} not found";
                $res->httpCode = 404;
                return $res;
            }

            $filepath = $file->filepath;
            $exists = file_exists($filepath);

            $data = [
                'id' => $file->id,
                'filepath' => $filepath,
                'mode' => $file->mode,
                'exists' => $exists
            ];

            if ($exists) {
                // File exists - get additional info
                $data['content'] = file_get_contents($filepath);
                $data['size'] = filesize($filepath);
                $data['permissions'] = substr(sprintf('%o', fileperms($filepath)), -4);
                $data['mtime'] = filemtime($filepath);
            } else {
                // File doesn't exist yet
                $data['content'] = null;
                $data['size'] = null;
                $data['permissions'] = null;
                $data['mtime'] = null;
            }

            $res->data = $data;
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}
