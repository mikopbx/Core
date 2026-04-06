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
use MikoPBX\Core\System\Storage\StorageAdapter;
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
     * 1. Token-based access (recommended): Uses 'token' parameter for secure access
     * 2. Direct path access (legacy): Uses 'view' parameter with file path
     *
     * Both modes support optional format conversion via 'format' parameter.
     *
     * @param array<string, mixed> $data Request data containing:
     *                    - 'token' (string): Temporary access token from Redis (recommended)
     *                    - 'view' (string): Direct file path (legacy, for backward compatibility)
     *                    - 'format' (string): Target audio format (original, mp3, wav, webm, ogg)
     *                    - 'filename' (string): Custom filename for download
     *
     * Examples:
     *   - /cdr:download?token=xxx&format=mp3
     *   - /cdr:download?view=/path/to/file.webm                // Legacy: auto-converts to MP3
     *   - /cdr:download?view=/path/to/file.webm&format=wav     // Legacy: uses specified format
     *   - /cdr:download?view=/path/to/file.mp3&filename=call.mp3  // Custom filename
     *
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
        try {
            $storageAdapter = new StorageAdapter();
            $actualFilePath = $storageAdapter->getFile($filename);

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
        // WHY: Users may need different formats for compatibility:
        // - MP3 for legacy systems (older phones, car systems)
        // - WAV for uncompressed quality (archival, analysis)
        // - WebM for modern web playback (smaller size, better compression)

        // Legacy mode: force MP3 conversion for old integrations
        // WHY: External systems via CDR Events expect MP3 for compatibility
        if (!empty($data['view']) && empty($data['format'])) {
            $requestedFormat = 'mp3';  // Force MP3 for backward compatibility
        } else {
            $requestedFormat = strtolower($data['format'] ?? 'original');
        }

        $currentExtension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $needDelete = false;

        // Skip conversion if 'original' or format matches current file
        if ($requestedFormat !== 'original' && $requestedFormat !== $currentExtension) {
            $convertedFile = self::convertAudioFormat($filename, $currentExtension, $requestedFormat);

            if ($convertedFile !== null) {
                // Use converted file
                $filename = $convertedFile;
                $needDelete = true;  // Delete temporary file after sending
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
                'need_delete' => $needDelete,  // Delete temporary MP3 files
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
            return 0.0;
        }

        $cmd = "{$ffprobe} -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 " . escapeshellarg($filePath) . " 2>/dev/null";
        $output = [];
        $returnCode = 0;

        exec($cmd, $output, $returnCode);

        if ($returnCode === 0 && !empty($output[0])) {
            $duration = (float)trim($output[0]);
            if ($duration > 0) {
                return $duration;
            }
        }

        return 0.0;
    }

    /**
     * Convert audio file between different formats (WebM, MP3, WAV, OGG)
     *
     * WHY: Users need different formats for different use cases:
     * - MP3: Legacy compatibility (phones, car systems)
     * - WAV: Uncompressed quality (archival, analysis)
     * - WebM: Modern web (Opus codec in WebM container)
     * - OGG: Open format (Opus codec in Ogg container, desktop apps, Linux)
     *
     * CONVERSION MATRIX:
     * - WebM/OGG → MP3: libmp3lame encoder
     * - WebM/OGG → WAV: pcm_s16le codec (16-bit PCM)
     * - MP3/WAV → WebM: libopus encoder (Opus in WebM container)
     * - MP3/WAV → OGG: libopus encoder (Opus in Ogg container)
     * - WebM ↔ OGG: Re-encode (both use Opus, but different containers)
     *
     * @param string $sourceFile Path to source audio file
     * @param string $sourceFormat Source format extension (webm, mp3, wav, ogg)
     * @param string $targetFormat Target format extension (webm, mp3, wav, ogg)
     * @return string|null Path to converted file, or null on failure
     */
    private static function convertAudioFormat(string $sourceFile, string $sourceFormat, string $targetFormat): ?string
    {
        // Check if ffmpeg is available
        $ffmpeg = Util::which('ffmpeg');
        if (empty($ffmpeg)) {
            \MikoPBX\Core\System\SystemMessages::sysLogMsg(
                __METHOD__,
                'ffmpeg not found, cannot convert audio',
                LOG_WARNING
            );
            return null;
        }

        // Get cache directory (same as S3 cache)
        // WHY: Reuse existing cache management and cleanup
        $cacheDir = \MikoPBX\Core\System\Directories::getDir(
            \MikoPBX\Core\System\Directories::CORE_RECORDINGS_CACHE_DIR
        );

        // Create unique temporary filename
        $basename = basename($sourceFile, '.' . $sourceFormat);
        $tempFile = $cacheDir . '/' . $basename . '_' . uniqid($targetFormat . '_', true) . '.' . $targetFormat;

        // Build FFmpeg command based on target format
        // OPTIMIZATION: Use lossless remux for WebM ↔ OGG (both use Opus)
        // WHY: Avoids re-encoding, preserves original quality
        $isLosslessRemux = self::canUseLosslessRemux($sourceFormat, $targetFormat);

        if ($isLosslessRemux) {
            // Lossless remux: copy audio stream without re-encoding
            $cmd = sprintf(
                '%s -i %s -codec:a copy %s 2>&1',
                $ffmpeg,
                escapeshellarg($sourceFile),
                escapeshellarg($tempFile)
            );
        } else {
            // Standard conversion with re-encoding
            $codecParams = self::getCodecParameters($targetFormat);

            if ($codecParams === null) {
                \MikoPBX\Core\System\SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Unsupported target format: {$targetFormat}",
                    LOG_WARNING
                );
                return null;
            }

            $cmd = sprintf(
                '%s -i %s -vn %s %s 2>&1',
                $ffmpeg,
                escapeshellarg($sourceFile),
                $codecParams,
                escapeshellarg($tempFile)
            );
        }

        // Execute conversion
        $output = [];
        $returnCode = 0;
        exec($cmd, $output, $returnCode);

        // Check if conversion succeeded
        if ($returnCode !== 0 || !file_exists($tempFile)) {
            \MikoPBX\Core\System\SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf(
                    'FFmpeg conversion from %s to %s failed: %s',
                    strtoupper($sourceFormat),
                    strtoupper($targetFormat),
                    implode("\n", $output)
                ),
                LOG_ERR
            );
            return null;
        }

        // Validate output file
        $ffprobe = Util::which('ffprobe');
        if (!empty($ffprobe)) {
            $validateCmd = sprintf(
                '%s -v error -show_format %s 2>&1',
                $ffprobe,
                escapeshellarg($tempFile)
            );

            $validateOutput = [];
            $validateCode = 0;
            exec($validateCmd, $validateOutput, $validateCode);

            if ($validateCode !== 0) {
                \MikoPBX\Core\System\SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf(
                        '%s validation failed, file may be corrupted',
                        strtoupper($targetFormat)
                    ),
                    LOG_WARNING
                );
                @unlink($tempFile);
                return null;
            }
        }

        // Log successful conversion
        $sourceSize = filesize($sourceFile);
        $targetSize = filesize($tempFile);
        \MikoPBX\Core\System\SystemMessages::sysLogMsg(
            __METHOD__,
            sprintf(
                'Converted %s to %s: %s (%d bytes) -> %s (%d bytes)',
                strtoupper($sourceFormat),
                strtoupper($targetFormat),
                basename($sourceFile),
                $sourceSize,
                basename($tempFile),
                $targetSize
            ),
            LOG_INFO
        );

        return $tempFile;
    }

    /**
     * Check if lossless remux is possible between two formats
     *
     * WHY: Lossless remux (stream copy) preserves quality and is much faster
     * Possible when source and target use the same codec but different containers
     *
     * @param string $sourceFormat Source format extension
     * @param string $targetFormat Target format extension
     * @return bool True if lossless remux is possible
     */
    private static function canUseLosslessRemux(string $sourceFormat, string $targetFormat): bool
    {
        $source = strtolower($sourceFormat);
        $target = strtolower($targetFormat);

        // WebM ↔ OGG: Both use Opus codec, can remux without re-encoding
        // WHY: Only container differs, audio stream is identical
        if (($source === 'webm' && $target === 'ogg') || ($source === 'ogg' && $target === 'webm')) {
            return true;
        }

        // Future optimization: Add more lossless remux pairs here
        // Example: MP3 in different containers, etc.

        return false;
    }

    /**
     * Get FFmpeg codec parameters for target format
     *
     * @param string $format Target format (mp3, wav, webm, ogg)
     * @return string|null FFmpeg codec parameters, or null if format not supported
     */
    private static function getCodecParameters(string $format): ?string
    {
        return match (strtolower($format)) {
            // MP3: VBR quality 2 (~190kbps, good quality)
            'mp3' => '-codec:a libmp3lame -qscale:a 2',

            // WAV: 16-bit PCM, uncompressed
            'wav' => '-codec:a pcm_s16le',

            // WebM: Opus codec, 128kbps (good balance)
            // WHY: Opus is better than Vorbis for speech, modern format
            'webm' => '-codec:a libopus -b:a 128k',

            // OGG: Opus codec, 128kbps (same quality as WebM but in Ogg container)
            // WHY: Opus is superior to Vorbis for speech, better compression
            'ogg' => '-codec:a libopus -b:a 128k',

            default => null
        };
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
