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
 * CDR audio file download action
 *
 * Forces download of CDR recording files with proper Content-Disposition header.
 * This action validates that the requested file is actually a CDR recording
 * and returns file information for download by the controller.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Cdr
 */
class DownloadRecordAction extends Injectable
{
    /**
     * Validate CDR recording file path and prepare for download
     *
     * This method supports two access modes:
     * 1. Token-based access (recommended): Uses 'id' and 'token' parameters for secure access
     * 2. Direct path access (legacy): Uses 'view' parameter with file path
     *
     * @param array<string, mixed> $data Request data containing:
     *                    - 'id' (int): CDR record ID (used with token)
     *                    - 'token' (string): Temporary access token from Redis
     *                    - 'view' (string): Direct file path (legacy, for backward compatibility)
     *                    - 'filename' (string): Custom filename for download
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $filename = '';
        $cdrId = null;
        $record = null;

        // ============ MODE 1: Token-based access (RECOMMENDED) ============
        // WHY: Secure access without exposing file paths
        if (!empty($data['token'])) {
            $cdrId = self::validatePlaybackToken($data['token']);

            if ($cdrId === null) {
                $res->messages['error'][] = 'Invalid or expired playback token';
                $res->httpCode = 403;
                return $res;
            }

            // Get CDR record by ID
            $record = \MikoPBX\Common\Models\CallDetailRecords::findFirst($cdrId);

            if (!$record) {
                $res->messages['error'][] = 'CDR record not found';
                $res->httpCode = 404;
                return $res;
            }

            $filename = $record->recordingfile;

            // Check if recording file exists for this CDR
            if (empty($filename)) {
                $res->messages['error'][] = 'No recording file associated with this CDR';
                $res->httpCode = 404;
                return $res;
            }
        }
        // ============ MODE 2: Direct path access (LEGACY) ============
        // WHY: Backward compatibility with existing code
        elseif (!empty($data['view'])) {
            $filename = $data['view'];

            // Validate that this is actually a CDR recording path
            if (!self::isCallRecording($filename)) {
                // Still allow the request but mark as deprecated
                $res->messages['warning'][] = 'Direct file path access is deprecated. Use token-based access via /pbxcore/api/v3/cdr/{id}:download?token=xxx';
            }
        } else {
            $res->messages['error'][] = 'Either token or view parameter must be provided';
            $res->httpCode = 400;
            return $res;
        }

        // Check if file exists and is readable
        if (!file_exists($filename) || !is_readable($filename)) {
            $res->messages['error'][] = 'Recording file not found or not readable';
            $res->httpCode = 404;
            return $res;
        }

        // Get file information
        $fileInfo = pathinfo($filename);
        $mimeType = self::getAudioMimeType($fileInfo['extension'] ?? '');

        // Generate download filename if not provided
        $downloadName = $data['filename'] ?? null;
        if (empty($downloadName)) {
            // Generate meaningful filename from CDR record data
            if ($record !== null) {
                // Use CDR data to create a descriptive filename
                $src = preg_replace('/[^\w\-]/', '', $record->src_num ?? 'unknown');
                $dst = preg_replace('/[^\w\-]/', '', $record->dst_num ?? 'unknown');
                $date = date('Y-m-d_H-i-s', strtotime($record->start ?? 'now'));
                $downloadName = "call_{$src}_to_{$dst}_{$date}.{$fileInfo['extension']}";
            } elseif ($cdrId !== null) {
                // Use CDR ID if available
                $downloadName = "recording_{$cdrId}.{$fileInfo['extension']}";
            } else {
                // Fallback to original filename
                $downloadName = $fileInfo['basename'];
            }
        }

        // Get audio duration for metadata
        $duration = self::getAudioDuration($filename);

        // Prepare file data for download (unified with SoundFiles approach)
        $res->data = [
            'fpassthru' => [
                'filename' => $filename,
                'content_type' => $mimeType,
                'download_name' => $downloadName,
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

    /**
     * Validate temporary playback token from Redis
     *
     * WHY: Security - prevents unauthorized access to recordings
     * Tokens are stored in Redis with 1-hour TTL by DataStructure::generatePlaybackToken()
     *
     * @param string $token Temporary access token
     * @return int|null CDR record ID if token is valid, null otherwise
     */
    private static function validatePlaybackToken(string $token): ?int
    {
        $di = \Phalcon\Di\Di::getDefault();
        if ($di === null) {
            return null;
        }

        $redis = $di->get('redis');

        // Get CDR ID from Redis
        $key = "cdr_playback_token:{$token}";
        $cdrId = $redis->get($key);

        if ($cdrId === false || $cdrId === null) {
            return null;
        }

        // Extend token TTL on each access (allow multiple plays within 1 hour)
        // WHY: User might want to download recording multiple times
        $redis->expire($key, 3600);

        return (int)$cdrId;
    }
}
