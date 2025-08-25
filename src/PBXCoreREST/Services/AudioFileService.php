<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Services;

use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Http\Response;

/**
 * Service for handling audio file streaming operations
 * 
 * Provides functionality for streaming audio files with support for:
 * - HTTP Range requests (partial content)
 * - File validation and security checks
 * - Download headers configuration
 * - Efficient buffered reading
 * 
 * @package MikoPBX\PBXCoreREST\Services
 */
class AudioFileService
{
    /**
     * Buffer size for reading file chunks (8KB)
     */
    private const BUFFER_SIZE = 8192;
    
    /**
     * Supported audio formats and their MIME types
     */
    private const MIME_TYPES = [
        'mp3' => 'audio/mpeg',
        'wav' => 'audio/x-wav',
    ];

    /**
     * Streams an audio file with optional range support
     * 
     * Handles both full file downloads and partial content requests,
     * commonly used by audio players for seeking within files.
     * 
     * @param string $filename Path to the audio file to stream
     * @param string|null $rangeHeader HTTP Range header value (e.g., "bytes=0-1024")
     * @param bool $download Force download with Content-Disposition header
     * @param string|null $customName Custom filename for download
     * 
     * @return array Response configuration with status, headers, and content/file
     */
    public function streamFile(string $filename, ?string $rangeHeader = null, bool $download = false, ?string $customName = null): array
    {
        if (!$this->validateFile($filename)) {
            return ['error' => Response::NOT_FOUND, 'message' => 'File not found or invalid format'];
        }

        $filesize = filesize($filename);
        $contentType = $this->getContentType($filename);
        
        if ($rangeHeader !== null) {
            return $this->handleRangeRequest($filename, $rangeHeader, $filesize, $contentType);
        }
        
        return $this->handleFullRequest($filename, $filesize, $contentType, $download, $customName);
    }

    /**
     * Validates if file exists and has supported format
     * 
     * @param string $filename Path to the file to validate
     * 
     * @return bool True if file is valid and accessible
     */
    private function validateFile(string $filename): bool
    {
        if (empty($filename)) {
            return false;
        }
        
        $extension = Util::getExtensionOfFile($filename);
        return isset(self::MIME_TYPES[$extension]) && Util::recFileExists($filename);
    }

    /**
     * Determines MIME type based on file extension
     * 
     * @param string $filename Path to the file
     * 
     * @return string MIME type for the file
     */
    private function getContentType(string $filename): string
    {
        $extension = Util::getExtensionOfFile($filename);
        return self::MIME_TYPES[$extension] ?? 'application/octet-stream';
    }

    /**
     * Handles HTTP Range requests for partial content delivery
     * 
     * @param string $filename Path to the file
     * @param string $rangeHeader Range header value
     * @param int $filesize Total file size in bytes
     * @param string $contentType MIME type of the file
     * 
     * @return array Response configuration for partial content
     */
    private function handleRangeRequest(string $filename, string $rangeHeader, int $filesize, string $contentType): array
    {
        $range = $this->parseRangeHeader($rangeHeader, $filesize);
        
        if ($range === null) {
            return ['error' => 400, 'message' => 'Invalid range header'];
        }

        ['start' => $start, 'end' => $end] = $range;
        $length = $end - $start + 1;

        $content = $this->readFileRange($filename, $start, $length);
        
        if ($content === null) {
            return ['error' => Response::INTERNAL_SERVER_ERROR, 'message' => 'Failed to read file'];
        }

        return [
            'status' => 206,
            'headers' => [
                'Content-Type' => $contentType,
                'Content-Range' => "bytes $start-$end/$filesize",
                'Content-Length' => $length,
                'Server' => 'nginx',
            ],
            'content' => $content,
        ];
    }

    /**
     * Parses HTTP Range header into start and end positions
     * 
     * Supports formats:
     * - bytes=0-1024 (specific range)
     * - bytes=1024- (from position to end)
     * - bytes=-1024 (last N bytes)
     * 
     * @param string $rangeHeader Range header value
     * @param int $filesize Total file size for validation
     * 
     * @return array|null Array with 'start' and 'end' keys, or null if invalid
     */
    private function parseRangeHeader(string $rangeHeader, int $filesize): ?array
    {
        if (!preg_match('/bytes=(\d*)-(\d*)/', $rangeHeader, $matches)) {
            return null;
        }

        $rangeStart = $matches[1];
        $rangeEnd = $matches[2];

        if ($rangeStart === '' && $rangeEnd === '') {
            return null;
        }

        if ($rangeStart === '') {
            $end = $filesize - 1;
            $start = max(0, $end - (int)$rangeEnd);
        } elseif ($rangeEnd === '') {
            $start = (int)$rangeStart;
            $end = $filesize - 1;
        } else {
            $start = (int)$rangeStart;
            $end = min((int)$rangeEnd, $filesize - 1);
        }

        if ($start > $end || $start < 0 || $end >= $filesize) {
            return null;
        }

        return ['start' => $start, 'end' => $end];
    }

    /**
     * Reads a specific range of bytes from a file
     * 
     * Uses buffered reading for efficient memory usage with large files.
     * 
     * @param string $filename Path to the file
     * @param int $start Starting byte position
     * @param int $length Number of bytes to read
     * 
     * @return string|null File content or null on error
     */
    private function readFileRange(string $filename, int $start, int $length): ?string
    {
        $fp = fopen($filename, 'rb');
        if (!$fp) {
            return null;
        }

        if ($start > 0) {
            fseek($fp, $start);
        }

        $content = '';
        while ($length > 0) {
            $readSize = min(self::BUFFER_SIZE, $length);
            $chunk = fread($fp, $readSize);
            
            if ($chunk === false) {
                fclose($fp);
                return null;
            }
            
            $content .= $chunk;
            $length -= strlen($chunk);
        }

        fclose($fp);
        return $content;
    }

    /**
     * Handles full file requests (non-range)
     * 
     * @param string $filename Path to the file
     * @param int $filesize File size in bytes
     * @param string $contentType MIME type
     * @param bool $download Whether to force download
     * @param string|null $customName Custom download filename
     * 
     * @return array Response configuration for full file delivery
     */
    private function handleFullRequest(string $filename, int $filesize, string $contentType, bool $download, ?string $customName): array
    {
        $headers = [
            'Content-Type' => $contentType,
            'Content-Length' => $filesize,
            'Accept-Ranges' => 'bytes',  // Indicate that we support range requests
            'Server' => 'nginx',
        ];

        if ($download) {
            $downloadName = $customName ?: basename($filename);
            $headers['Content-Disposition'] = "attachment; filename*=UTF-8''" . basename($downloadName);
        }

        return [
            'status' => Response::OK,
            'headers' => $headers,
            'file' => $filename,
        ];
    }
}