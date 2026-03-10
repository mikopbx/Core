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

namespace MikoPBX\PBXCoreREST\Lib\Files;

use GuzzleHttp\Psr7\HttpFactory;
use GuzzleHttp\Psr7\UploadedFile;
use MikoPBX\Common\Providers\EventBusProvider;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Workers\WorkerMergeUploadedFile;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 *  Class UploadFile
 *  Process upload files by chunks.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Files
 */
class UploadFileAction extends Injectable
{
    // MIME types allowed for different categories
    private const ALLOWED_MIME_TYPES = [
        'sound' => [
            'audio/mpeg',
            'audio/wav', 
            'audio/ogg',
            'audio/mp4',
            'audio/webm',
            'audio/x-wav',
            'audio/wave'
        ],
        'image' => [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            'image/bmp'
        ],
        'csv' => [
            'text/csv',
            'text/plain',
            'application/csv',
            'application/vnd.ms-excel'
        ],
        'archive' => [
            'application/zip',
            'application/x-zip-compressed',
            'application/gzip',
            'application/x-tar',
            'application/x-gzip'
        ],
        'firmware' => [
            '',  // Empty MIME type when browser can't detect type for .img files
            'application/octet-stream',
            'application/x-disk-image',
            'application/x-raw-disk-image'
        ]
    ];
    
    // Forbidden file extensions (executable files and scripts)
    private const FORBIDDEN_EXTENSIONS = [
        'php', 'php3', 'php4', 'php5', 'phtml', 'jsp', 'asp', 'aspx',
        'js', 'exe', 'bat', 'cmd', 'com', 'scr', 'vbs', 'ps1',
        'sh', 'bash', 'pl', 'py', 'rb', 'jar', 'class', 'war',
        'dll', 'so', 'dylib', 'msi', 'deb', 'rpm'
    ];

    // Expected MIME type prefixes from finfo_file() for each category.
    // Used to validate actual file content (magic bytes) after merge.
    // Categories not listed here skip magic bytes validation (too generic).
    private const MAGIC_BYTES_MIME_PREFIXES = [
        'sound' => ['audio/', 'application/ogg', 'application/octet-stream'],
        'image' => ['image/'],
        'archive' => [
            'application/zip', 'application/x-zip', 'application/gzip',
            'application/x-gzip', 'application/x-tar', 'application/x-bzip2',
        ],
    ];

    /**
     * Process upload files by chunks.
     *
     * @param array $parameters The upload parameters.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(array $parameters): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $di = Di::getDefault();
        if ($di === null) {
            $res->success = false;
            $res->messages[] = 'Dependency injector does not initialized';

            return $res;
        }

        // Validate file type and security
        $category = $parameters['category'] ?? 'unknown';
        $mimeType = $parameters['file_mime_type'] ?? '';
        
        $validationResult = self::validateFileType(
            $parameters['resumableFilename'], 
            $mimeType,
            $category
        );
        
        if (!$validationResult['valid']) {
            $res->success = false;
            $res->messages['error'] = $validationResult['error'];
            return $res;
        }
        $parameters['uploadDir'] = $di->getShared('config')->path('www.uploadDir');
        $parameters['tempDir'] = "{$parameters['uploadDir']}/{$parameters['resumableIdentifier']}";
        if (!Util::mwMkdir($parameters['tempDir'])) {
            $res->messages[] = 'Temp dir does not exist ' . $parameters['tempDir'];

            return $res;
        }

        $fileName = (string)pathinfo($parameters['resumableFilename'], PATHINFO_FILENAME);
        // Remove unsafe characters but keep hyphens and underscores
        $fileName = preg_replace('/[^\w\-]/', '', $fileName);
        // Add unique prefix only for very short filenames to avoid collisions
        if (strlen($fileName) < 5) {
            $fileName = '' . md5(microtime()) . '-' . $fileName;
        }
        $extension = (string)pathinfo($parameters['resumableFilename'], PATHINFO_EXTENSION);
        $fileName .= '.' . $extension;
        $parameters['resumableFilename'] = $fileName;
        $parameters['fullUploadedFileName'] = "{$parameters['tempDir']}/$fileName";

        // Delete old progress and result file
        $oldMergeProgressFile = "{$parameters['tempDir']}/merging_progress";
        if (file_exists($oldMergeProgressFile)) {
            unlink($oldMergeProgressFile);
        }
        if (file_exists($parameters['fullUploadedFileName'])) {
            unlink($parameters['fullUploadedFileName']);
        }

        // Get EventBus service
        $eventBus = $di->getShared(EventBusProvider::SERVICE_NAME);
        $uploadId = $parameters['resumableIdentifier'];

        // Publish upload started event (only on first chunk)
        if ($parameters['resumableChunkNumber'] == 1) {
            $eventBus->publish('file-upload', [
                'event' => 'upload-started',
                'data' => [
                    'uploadId' => $uploadId,
                    'category' => $category,
                    'fileName' => $parameters['resumableFilename'],
                    'fileSize' => $parameters['resumableTotalSize'],
                    'chunksTotal' => $parameters['resumableTotalChunks'],
                    'timestamp' => time()
                ]
            ]);
        }

        foreach ($parameters['files'] as $file_data) {
            if (!self::moveUploadedPartToSeparateDir($parameters, $file_data)) {
                $res->messages[] = 'Does not found any uploaded chunks on with path ' . $file_data['file_path'];
                break;
            }
            $res->success = true;
            $res->data['upload_id'] = $parameters['resumableIdentifier'];
            $res->data['filename'] = $parameters['fullUploadedFileName'];

            // Publish chunk uploaded event
            $eventBus->publish('file-upload', [
                'event' => 'chunk-uploaded',
                'data' => [
                    'uploadId' => $uploadId,
                    'chunkNumber' => $parameters['resumableChunkNumber'],
                    'chunksTotal' => $parameters['resumableTotalChunks'],
                    'progress' => round($parameters['resumableChunkNumber'] / $parameters['resumableTotalChunks'] * 100),
                    'timestamp' => time()
                ]
            ]);

            if (self::tryToMergeChunksIfAllPartsUploaded($parameters)) {
                $res->data[FilesConstants::D_STATUS] = FilesConstants::UPLOAD_MERGING;

                // Publish chunks complete event
                $eventBus->publish('file-upload', [
                    'event' => 'chunks-complete',
                    'data' => [
                        'uploadId' => $uploadId,
                        'timestamp' => time()
                    ]
                ]);
            } else {
                $res->data[FilesConstants::D_STATUS] = FilesConstants::UPLOAD_WAITING_FOR_NEXT_PART;
            }
        }

        return $res;
    }

    /**
     * Moves uploaded file part to separate directory with "upload_id" name on the system uploadDir folder.
     *
     * @param array $parameters data from of resumable request
     * @param array $file_data  data from uploaded file part
     *
     * @return bool
     */
    private static function moveUploadedPartToSeparateDir(array $parameters, array $file_data): bool
    {
        if (! file_exists($file_data['file_path'])) {
            return false;
        }
        $factory          = new HttpFactory();
        $stream           = $factory->createStreamFromFile($file_data['file_path'], 'r');
        $file             = new UploadedFile(
            $stream,
            $file_data['file_size'],
            $file_data['file_error'],
            $file_data['file_name'],
            $file_data['file_type']
        );
        $chunks_dest_file = "{$parameters['tempDir']}/{$parameters['resumableFilename']}.part{$parameters['resumableChunkNumber']}";
        if (file_exists($chunks_dest_file)) {
            $rm = Util::which('rm');
            Processes::mwExec("$rm -f $chunks_dest_file");
        }
        $file->moveTo($chunks_dest_file);

        return true;
    }

    /**
     * If the size of all the chunks on the server is equal to the size of the file uploaded starts a merge process.
     *
     * @param array $parameters
     *
     * @return bool
     */
    private static function tryToMergeChunksIfAllPartsUploaded(array $parameters): bool
    {
        $totalFilesOnServerSize = 0;
        foreach (scandir($parameters['tempDir']) as $file) {
            $totalFilesOnServerSize += filesize($parameters['tempDir'] . '/' . $file);
        }

        if ($totalFilesOnServerSize >= $parameters['resumableTotalSize']) {
            // Parts upload complete
            $merge_settings = [
                'fullUploadedFileName' => $parameters['fullUploadedFileName'],
                'tempDir'              => $parameters['tempDir'],
                'resumableFilename'    => $parameters['resumableFilename'],
                'resumableTotalSize'   => $parameters['resumableTotalSize'],
                'resumableTotalChunks' => $parameters['resumableTotalChunks'],
                'category'             => $parameters['category'] ?? 'unknown',
            ];
            $settings_file  = "{$parameters['tempDir']}/merge_settings";
            file_put_contents(
                $settings_file,
                json_encode($merge_settings, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
            );

            // We will start the background process to merge parts into one file
            $php               = Util::which('php');
            $workerFilesMergerPath = Util::getFilePathByClassName(WorkerMergeUploadedFile::class);
            Processes::mwExecBg("$php -f $workerFilesMergerPath start '$settings_file'");

            return true;
        }

        return false;
    }

    /**
     * Validate file type, extension and security
     * 
     * @param string $filename Original filename
     * @param string $mimeType MIME type from browser
     * @param string $category File category (sound, image, csv, archive, firmware)
     * 
     * @return array Validation result with 'valid' boolean and 'error' message
     */
    private static function validateFileType(string $filename, string $mimeType, string $category): array
    {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        
        // 1. Check forbidden extensions (security)
        if (in_array($extension, self::FORBIDDEN_EXTENSIONS, true)) {
            return [
                'valid' => false,
                'error' => Util::translate(
                    'sf_UploadForbiddenExtension',false,
                    ['extension' => $extension]
                )
            ];
        }
        
        // 2. Check MIME type for category
        if (isset(self::ALLOWED_MIME_TYPES[$category])) {
            if (!in_array($mimeType, self::ALLOWED_MIME_TYPES[$category], true)) {
                return [
                    'valid' => false,
                    'error' => Util::translate(
                        'sf_UploadInvalidMimeType', false,
                        [
                            'mimetype' => $mimeType, 
                            'category' => $category
                        ]
                    )
                ];
            }
        }
        
        // 3. Special check for .img files (only for firmware)
        if ($extension === 'img' && $category !== 'firmware') {
            return [
                'valid' => false,
                'error' => Util::translate('sf_UploadImgOnlyForFirmware', false)
            ];
        }
        
        // 4. Additional security check for CSV files
        if ($category === 'csv' && !in_array($extension, ['csv', 'txt'], true)) {
            return [
                'valid' => false,
                'error' => Util::translate(
                    'sf_UploadInvalidExtensionForCategory', false,
                    ['extension' => $extension, 'category' => $category]
                )
            ];
        }
        
        return ['valid' => true];
    }

    /**
     * Validate file content using magic bytes (finfo).
     *
     * Called after merge to verify that file content matches the declared category.
     * This prevents type spoofing where a malicious file is uploaded with a fake MIME header.
     *
     * @param string $filePath Absolute path to merged file
     * @param string $category File category (sound, image, csv, archive, firmware)
     *
     * @return array{valid: bool, error?: string} Validation result
     */
    public static function validateMagicBytes(string $filePath, string $category): array
    {
        // Skip validation for categories where finfo is unreliable
        if (!isset(self::MAGIC_BYTES_MIME_PREFIXES[$category])) {
            return ['valid' => true];
        }

        if (!file_exists($filePath) || filesize($filePath) === 0) {
            return ['valid' => false, 'error' => 'File not found or empty'];
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $detectedMime = $finfo->file($filePath);

        if ($detectedMime === false) {
            return ['valid' => false, 'error' => 'Unable to detect file type'];
        }

        // Check if detected MIME matches any allowed prefix for this category
        $allowedPrefixes = self::MAGIC_BYTES_MIME_PREFIXES[$category];
        $matched = false;
        foreach ($allowedPrefixes as $prefix) {
            if (str_starts_with($detectedMime, $prefix)) {
                $matched = true;
                break;
            }
        }

        if (!$matched) {
            return [
                'valid' => false,
                'error' => "File content does not match category '$category': detected '$detectedMime'",
            ];
        }

        // SVG-specific check: reject files containing script tags (XSS vector)
        if ($detectedMime === 'image/svg+xml') {
            $svgResult = self::validateSvgContent($filePath);
            if (!$svgResult['valid']) {
                return $svgResult;
            }
        }

        return ['valid' => true];
    }

    /**
     * Check SVG file for dangerous content (embedded scripts, event handlers).
     *
     * @param string $filePath Path to SVG file
     *
     * @return array{valid: bool, error?: string}
     */
    private static function validateSvgContent(string $filePath): array
    {
        $content = file_get_contents($filePath, false, null, 0, 1024 * 100); // Read first 100KB
        if ($content === false) {
            return ['valid' => false, 'error' => 'Unable to read SVG file'];
        }

        $contentLower = strtolower($content);

        // Check for script tags and event handlers
        $dangerousPatterns = [
            '<script',
            'javascript:',
            'onload=',
            'onerror=',
            'onclick=',
            'onmouseover=',
            'onfocus=',
            'onanimationend=',
        ];

        foreach ($dangerousPatterns as $pattern) {
            if (str_contains($contentLower, $pattern)) {
                return [
                    'valid' => false,
                    'error' => 'SVG contains potentially dangerous content',
                ];
            }
        }

        return ['valid' => true];
    }
}
