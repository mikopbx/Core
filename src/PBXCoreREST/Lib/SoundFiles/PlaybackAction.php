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

namespace MikoPBX\PBXCoreREST\Lib\SoundFiles;

use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for streaming sound file playback
 *
 * Handles direct file streaming for sound files (MOH, IVR, custom sounds)
 * Supports both playback and download modes
 *
 * Security: Only allows access to configured sound directories
 * using paths from Directories class configuration
 *
 * @package MikoPBX\PBXCoreREST\Lib\SoundFiles
 */
class PlaybackAction
{
    /**
     * Supported audio formats and their MIME types
     */
    private const MIME_TYPES = [
        'mp3' => 'audio/mpeg',
        'wav' => 'audio/x-wav',
        'ogg' => 'audio/ogg',
        'm4a' => 'audio/mp4',
        'aac' => 'audio/aac'
    ];
    /**
     * Stream or download sound file
     *
     * @param array $data Request parameters (view, download, filename)
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // Get file path from request
        $filePath = $data['view'] ?? '';

        if (empty($filePath)) {
            $res->messages['error'][] = 'File path is required';
            return $res;
        }

        // Validate file path - must be in allowed directories
        $allowedDirs = [
            Directories::getDir(Directories::AST_CUSTOM_SOUND_DIR) . '/',
            Directories::getDir(Directories::AST_MOH_DIR) . '/',
            Directories::getDir(Directories::AST_VAR_LIB_DIR) . '/sounds/',
            Directories::getDir(Directories::CORE_TEMP_DIR) . '/',
            '/tmp/' // Keep /tmp as fallback for temporary files
        ];

        // Normalize path to handle different mount points
        $normalizedPath = realpath($filePath);
        if ($normalizedPath === false) {
            // If realpath fails, use original path
            $normalizedPath = $filePath;
        }

        $isAllowed = false;
        foreach ($allowedDirs as $dir) {
            // Check both original and normalized paths
            if (strpos($filePath, $dir) === 0 || strpos($normalizedPath, $dir) === 0) {
                $isAllowed = true;
                break;
            }
        }

        if (!$isAllowed) {
            $res->messages['error'][] = 'Access to this file location is not allowed';
            return $res;
        }

        // Check if file exists
        if (!file_exists($filePath)) {
            $res->messages['error'][] = 'File not found';
            return $res;
        }

        // Determine content type based on file extension
        $extension = Util::getExtensionOfFile($filePath);
        $contentType = self::MIME_TYPES[$extension] ?? 'application/octet-stream';

        // Prepare response data for file streaming
        $res->success = true;
        $res->data = [
            'fpassthru' => [
                'filename' => $filePath,
                'need_delete' => false,
                'content_type' => $contentType
            ]
        ];

        // Handle download mode
        if (!empty($data['download'])) {
            $downloadName = $data['filename'] ?? basename($filePath);
            $res->data['fpassthru']['download_name'] = $downloadName;
        }

        return $res;
    }
}