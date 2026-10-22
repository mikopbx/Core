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

use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Storage\ConvertedRecordingCache;
use MikoPBX\Core\System\Storage\StorageAdapter;
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
     * This method supports two access modes:
     * 1. Token-based access (recommended): Uses 'token' parameter for secure access
     * 2. Direct path access (legacy): Uses 'view' parameter with file path
     *
     * Both modes support optional format conversion via 'format' parameter.
     *
     * @param array<string, mixed> $data Request data containing:
     *                    - 'token' (string): Temporary access token from Redis (recommended)
     *                    - 'view' (string): Direct file path (legacy, for backward compatibility)
     *                    - 'format' (string): Target audio format (original, mp3, wav, webm, ogg)
     *
     * Examples:
     *   - /cdr:playback?token=xxx&format=mp3
     *   - /cdr:playback?view=/path/to/file.webm               // Legacy: auto-converts to MP3
     *   - /cdr:playback?view=/path/to/file.webm&format=ogg    // Legacy: uses specified format
     *
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $filename = '';

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
        // WHY: Backward compatibility with external systems via CDR Events
        // SECURITY: Only allow paths within AST_MONITOR_DIR (call recordings)
        elseif (!empty($data['view'])) {
            // Validate path is within monitor directory
            // WHY: Prevent Path Traversal attacks (../, symlinks, /etc/passwd)
            $validation = self::validateMonitorPath($data['view']);

            if (!$validation['valid']) {
                $res->messages['error'][] = $validation['error'];
                $res->httpCode = 403;
                return $res;
            }

            $filename = $validation['realPath'];
        } else {
            $res->messages['error'][] = 'Either token or view parameter must be provided';
            $res->httpCode = 400;
            return $res;
        }

        // ============ FILE LOCATION RESOLUTION ============
        // WHY: StorageAdapter provides transparent access to recordings
        // whether they are stored locally or in S3 cloud storage.
        // It automatically downloads from S3 to cache if needed.
        // WHY FALLBACK: During migration period, files may exist in different
        // formats (webm/mp3/wav). Fallback tries all formats automatically.
        try {
            $storageAdapter = new StorageAdapter();

            // Try with format fallback (webm → mp3 → wav)
            // This ensures backward compatibility during migration
            $actualFilePath = $storageAdapter->getFileWithFallback($filename);

            if ($actualFilePath === null) {
                $res->messages['error'][] = 'Recording file not found';
                $res->httpCode = 404;
                return $res;
            }

            // Update filename to actual location (may be cache path if file in S3)
            $filename = $actualFilePath;

        } catch (\Exception $e) {
            $res->messages['error'][] = 'Error accessing recording file: ' . $e->getMessage();
            $res->httpCode = 500;
            return $res;
        }

        // Check if file is readable (file exists check already done by StorageAdapter)
        if (!is_readable($filename)) {
            $res->messages['error'][] = 'Recording file not readable';
            $res->httpCode = 403;
            return $res;
        }

        // ============ FORMAT CONVERSION (OPTIONAL) ============
        // WHY: Allow playback in different formats for browser compatibility
        // Some browsers may not support WebM playback natively

        // Legacy mode: force MP3 conversion for old integrations
        // WHY: External systems via CDR Events expect MP3 for compatibility
        if (!empty($data['view']) && empty($data['format'])) {
            $requestedFormat = 'mp3';  // Force MP3 for backward compatibility
        } else {
            $requestedFormat = strtolower($data['format'] ?? 'original');
        }

        $currentExtension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        // Skip conversion if 'original' or format matches current file
        if ($requestedFormat !== 'original' && $requestedFormat !== $currentExtension) {
            // WHY cache: the player issues several Range requests per recording
            $convertedFile = (new ConvertedRecordingCache())->get($filename, $requestedFormat);

            if ($convertedFile !== null) {
                // Use converted file
                $filename = $convertedFile;
            } else {
                // Fallback to original format if conversion fails
                $res->messages['warning'][] = sprintf(
                    'Audio conversion from %s to %s failed, returning original format',
                    strtoupper($currentExtension),
                    strtoupper($requestedFormat)
                );
            }
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
                'download_name' => null,  // null = inline playback
                // Converted files are shared cache entries removed by ConvertedRecordingCache::cleanup()
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
     * Validate that file path is within AST_MONITOR_DIR (call recordings directory)
     *
     * WHY SECURITY:
     * - Prevents Path Traversal attacks (../, symlinks)
     * - External systems via CDR Events receive file paths from this directory
     * - All call recordings are stored in AST_MONITOR_DIR only
     * - Rejects any path outside this directory
     *
     * @param string $filePath File path from 'view' parameter
     * @return array{valid: bool, error: string|null, realPath: string|null}
     */
    private static function validateMonitorPath(string $filePath): array
    {
        // Get canonical monitor directory path
        $monitorDir = Directories::getDir(Directories::AST_MONITOR_DIR);
        $realMonitorDir = realpath($monitorDir);

        if ($realMonitorDir === false) {
            return [
                'valid' => false,
                'error' => 'Monitor directory not found',
                'realPath' => null
            ];
        }

        // Resolve file path to canonical form (eliminates ../, symlinks)
        // WHY: realpath() follows symlinks and resolves all path components
        // This prevents Path Traversal attacks like:
        //   /monitor/../../../etc/passwd
        //   /monitor/link-to-etc/passwd
        $realFilePath = realpath($filePath);

        if ($realFilePath === false) {
            // File doesn't exist yet or path is invalid
            // Try to resolve parent directory
            $parentDir = dirname($filePath);
            $realParentDir = realpath($parentDir);

            if ($realParentDir === false) {
                return [
                    'valid' => false,
                    'error' => 'Invalid file path or parent directory does not exist',
                    'realPath' => null
                ];
            }

            // Check if parent is within monitor directory
            if (!str_starts_with($realParentDir . '/', $realMonitorDir . '/') &&
                $realParentDir !== $realMonitorDir) {
                return [
                    'valid' => false,
                    'error' => 'File path is outside call recordings directory',
                    'realPath' => null
                ];
            }

            // Construct real path from validated parent
            $realFilePath = $realParentDir . '/' . basename($filePath);
        }

        // Check if resolved path is within monitor directory
        // WHY: str_starts_with ensures path is subdirectory, not just prefix match
        // Example: /monitor123 would NOT match /monitor/
        if (!str_starts_with($realFilePath . '/', $realMonitorDir . '/') &&
            $realFilePath !== $realMonitorDir) {
            return [
                'valid' => false,
                'error' => 'Access denied: file path is outside call recordings directory',
                'realPath' => null
            ];
        }

        return [
            'valid' => true,
            'error' => null,
            'realPath' => $realFilePath
        ];
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
            'webm' => 'audio/webm',
            'ogg' => 'audio/ogg',
            'flac' => 'audio/flac',
            'm4a' => 'audio/mp4',
            'aac' => 'audio/aac',
            default => 'audio/wav'
        };
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
            \MikoPBX\Core\System\SystemMessages::sysLogMsg(
                'PlaybackAction',
                'ffprobe not found. Unable to determine audio duration for: ' . $filePath,
                LOG_WARNING
            );
            return 0.0;
        }

        $cmd = "{$ffprobe} -v quiet -show_entries format=duration " .
               "-of default=noprint_wrappers=1:nokey=1 " .
               escapeshellarg($filePath) . " 2>/dev/null";
        $output = [];
        $returnCode = 0;

        exec($cmd, $output, $returnCode);

        if ($returnCode === 0 && !empty($output[0])) {
            $duration = (float)trim($output[0]);
            if ($duration > 0) {
                return $duration;
            }
        }

        \MikoPBX\Core\System\SystemMessages::sysLogMsg(
            'PlaybackAction',
            'Unable to determine audio duration for: ' . $filePath,
            LOG_NOTICE
        );

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
        // WHY: User might want to replay recording multiple times
        $redis->expire($key, 3600);

        return (int)$cdrId;
    }
}