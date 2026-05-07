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
        'mp3'   => 'audio/mpeg',
        'wav'   => 'audio/x-wav',
        'wav16' => 'audio/x-wav', // MikoPBX format_wav extension (16 kHz mono PCM, slin16)
        'wav48' => 'audio/x-wav', // MikoPBX format_wav extension (48 kHz mono PCM, slin48)
        'ogg'   => 'audio/ogg',
        'opus'  => 'audio/ogg',   // SoundFilesConf 'opus' formatSpec wraps in ogg container
        'webm'  => 'audio/webm',  // primary preview format (libopus in WebM)
        'm4a'   => 'audio/mp4',
        'aac'   => 'audio/aac'
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

        // Refuse non-audio extensions outright. AST_MEDIA_DIR (added below) is the
        // parent of customSoundDir/mohdir/astsoundsdir but also of avatars/, the
        // text2speech cache, voicemail recordings and any future subdirectory the
        // platform decides to drop under /media/. Without this gate, anyone with
        // the sound_files Bearer permission could pull /media/avatars/user_*.jpg
        // or arbitrary non-audio content via this endpoint — a privilege confusion
        // bug that pre-existed for customSoundDir/mohdir as well (e.g. .conf or
        // .db files dropped there manually). Filter by the same extensions the
        // MIME table understands.
        $extension = strtolower(Util::getExtensionOfFile($filePath));
        if ($extension === '' || !isset(self::MIME_TYPES[$extension])) {
            $res->messages['error'][] = 'Unsupported file type for playback';
            return $res;
        }

        // Validate file path - must be in allowed directories.
        //
        // AST_MEDIA_DIR is included to keep playback working for SoundFiles rows
        // migrated from MikoPBX ≤ 2022.x. Back then convertAudioFile saved user
        // uploads directly under /storage/.../media/<file>.{mp3,wav}, not under
        // /media/custom/. After upgrading, the row's path field still points at
        // the legacy flat layout — without this entry the UI returns 403 even
        // though the file is physically present and the IVR plays it fine. The
        // entry only widens reach within /media/<audio-extension> files because
        // of the MIME_TYPES allowlist gate above.
        $allowedDirs = [
            Directories::getDir(Directories::AST_CUSTOM_SOUND_DIR) . '/',
            Directories::getDir(Directories::AST_MOH_DIR) . '/',
            Directories::getDir(Directories::AST_MEDIA_DIR) . '/',
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

        // File missing on disk: return 410 Gone (not the default 422 "validation failed").
        // The DB record still exists, the file does not — usually the result of a previous
        // botched conversion or manual deletion. The UI uses 410 to render a "missing file"
        // badge and prompt the user to re-upload, instead of showing an opaque 422.
        if (!file_exists($filePath) || filesize($filePath) === 0) {
            $res->messages['error'][] = 'File not found or empty on disk';
            $res->httpCode = 410;
            return $res;
        }

        // Determine content type based on file extension. $extension was already
        // validated against MIME_TYPES above, so the lookup never falls back here.
        $contentType = self::MIME_TYPES[$extension];

        // Get audio duration for metadata
        $duration = self::getAudioDuration($filePath);

        // Prepare response data for file streaming
        $res->success = true;
        $res->data = [
            'fpassthru' => [
                'filename' => $filePath,
                'need_delete' => false,
                'content_type' => $contentType,
                'additional_headers' => []
            ]
        ];

        // Add duration header if available
        if ($duration > 0) {
            $res->data['fpassthru']['additional_headers']['X-Audio-Duration'] = (string)$duration;
        }

        // Add file size header
        $fileSize = filesize($filePath);
        if ($fileSize !== false) {
            $res->data['fpassthru']['additional_headers']['Content-Length'] = (string)$fileSize;
        }

        // Handle download mode
        if (!empty($data['download'])) {
            $downloadName = $data['filename'] ?? basename($filePath);
            $res->data['fpassthru']['download_name'] = $downloadName;
        }

        return $res;
    }

    /**
     * Get audio file duration in seconds using ffprobe
     *
     * @param string $filePath Path to audio file
     * @return float Duration in seconds (0 if unable to determine)
     */
    private static function getAudioDuration(string $filePath): float
    {
        $ffprobe = Util::which('ffprobe');
        if (empty($ffprobe)) {
            return 0.0;
        }

        $cmd = "{$ffprobe} -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 " . escapeshellarg($filePath) . " 2>/dev/null";
        $output = [];
        $returnCode = 0;

        exec($cmd, $output, $returnCode);

        if ($returnCode === 0 && !empty($output[0])) {
            $duration = (float)trim($output[0]);
            return $duration > 0 ? $duration : 0.0;
        }

        return 0.0;
    }
}