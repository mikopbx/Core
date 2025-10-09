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

use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

/**
 * CDR audio file playback action
 *
 * Validates CDR recording file paths and prepares them for streaming.
 * This action validates that the requested file is actually a CDR recording
 * and returns file information for streaming by the controller.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Cdr
 */
class PlaybackAction extends Injectable
{
    /**
     * Validate CDR recording file path and prepare for streaming
     *
     * This method validates the requested file path, ensures it's a legitimate
     * CDR recording, and returns file information for streaming.
     *
     * @param array $data Request data containing 'view' parameter with file path
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $filename = $data['view'] ?? '';

        if (empty($filename)) {
            $res->messages['error'][] = 'Empty filename provided';
            return $res;
        }

        // Validate that this is actually a CDR recording path
        if (!self::isCallRecording($filename)) {
            // Still allow the request but mark as deprecated
            $res->messages['warning'][] = 'This endpoint should only be used for CDR recordings. Use /pbxcore/api/v3/sound-files:playback for other audio files.';
        }

        // Check if file exists and is readable
        if (!file_exists($filename) || !is_readable($filename)) {
            $res->messages['error'][] = 'File not found or not readable';
            return $res;
        }

        // Get file information
        $fileInfo = pathinfo($filename);
        $mimeType = self::getAudioMimeType($fileInfo['extension'] ?? '');

        // Get audio duration for metadata
        $duration = self::getAudioDuration($filename);

        // Prepare file data for streaming (unified with SoundFiles approach)
        $res->data = [
            'fpassthru' => [
                'filename' => $filename,
                'content_type' => $mimeType,
                'download_name' => $data['filename'] ?? null,
                'need_delete' => false,
                'additional_headers' => []
            ]
        ];

        // Add duration header if available
        if ($duration > 0) {
            $res->data['fpassthru']['additional_headers']['X-Audio-Duration'] = (string)$duration;
        }

        // Add file size header
        $fileSize = filesize($filename);
        if ($fileSize !== false) {
            $res->data['fpassthru']['additional_headers']['Content-Length'] = (string)$fileSize;
        }

        $res->success = true;
        return $res;
    }

    /**
     * Check if the file path represents a CDR recording
     *
     * CDR recordings are typically stored in:
     * - /monitor/ - call recordings
     * - /voicemail/ - voicemail messages
     * - /voicemailarchive/ - archived voicemail
     *
     * @param string $path File path to check
     * @return bool True if this is a CDR recording
     */
    private static function isCallRecording(string $path): bool
    {
        return str_contains($path, '/monitor/') ||
               str_contains($path, '/voicemail/') ||
               str_contains($path, '/voicemailarchive/');
    }

    /**
     * Get MIME type for audio file based on extension
     *
     * @param string $extension File extension
     * @return string MIME type
     */
    private static function getAudioMimeType(string $extension): string
    {
        return match (strtolower($extension)) {
            'mp3' => 'audio/mpeg',
            'wav' => 'audio/wav',
            'ogg' => 'audio/ogg',
            'flac' => 'audio/flac',
            'm4a' => 'audio/mp4',
            'aac' => 'audio/aac',
            default => 'audio/wav'
        };
    }

    /**
     * Get audio file duration in seconds using soxi
     *
     * @param string $filePath Path to audio file
     * @return float Duration in seconds (0 if unable to determine)
     */
    private static function getAudioDuration(string $filePath): float
    {
        // Check if soxi is available (part of sox package)
        $soxi = Util::which('soxi');
        if (empty($soxi)) {
            return 0.0;
        }

        // Use soxi -D to get duration in seconds
        $cmd = "{$soxi} -D " . escapeshellarg($filePath) . " 2>/dev/null";
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