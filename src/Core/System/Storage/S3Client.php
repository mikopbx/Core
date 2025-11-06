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

namespace MikoPBX\Core\System\Storage;

use Aws\S3\S3Client as AwsS3Client;
use Aws\Exception\AwsException;
use MikoPBX\Common\Models\StorageSettings;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\SystemMessages;

/**
 * S3Client - Wrapper for AWS S3 SDK
 *
 * Provides simplified interface for S3 operations with automatic
 * configuration loading from StorageSettings and comprehensive
 * error handling.
 *
 * Supports:
 * - AWS S3
 * - MinIO
 * - Wasabi
 * - Any S3-compatible storage
 *
 * Usage:
 * ```php
 * $client = new S3Client();
 * $client->upload('/path/to/file.wav', 'recordings/2024/11/01/file.wav');
 * $client->download('recordings/2024/11/01/file.wav', '/path/to/destination.wav');
 * ```
 */
class S3Client
{
    private ?AwsS3Client $client = null;
    private ?string $bucket = null;

    /**
     * Initialize S3 client from StorageSettings
     *
     * @throws \Exception When S3 not enabled or configuration invalid
     */
    public function __construct()
    {
        $settings = StorageSettings::getSettings();

        if ($settings->s3_enabled !== 1) {
            throw new \Exception('S3 storage is not enabled in settings');
        }

        if (!$settings->isS3Configured()) {
            throw new \Exception('S3 configuration incomplete - check endpoint, bucket, and credentials');
        }

        $this->bucket = $settings->s3_bucket;

        // Build AWS SDK config
        $config = [
            'version' => 'latest',
            'region' => $settings->s3_region ?? 'us-east-1',
            'endpoint' => $settings->s3_endpoint,
            'credentials' => [
                'key' => $settings->s3_access_key,
                'secret' => $settings->getSecretKey(),
            ],
        ];

        // Enable path-style endpoints for MinIO and similar services
        if (str_contains($settings->s3_endpoint, 'minio') || str_contains($settings->s3_endpoint, ':9000')) {
            $config['use_path_style_endpoint'] = true;
        }

        $this->client = new AwsS3Client($config);
    }

    /**
     * Upload file to S3 bucket
     *
     * @param string $localPath Local file path to upload
     * @param string $s3Key S3 object key (path in bucket)
     * @return bool True on success, false on failure
     */
    public function upload(string $localPath, string $s3Key): bool
    {
        if (!file_exists($localPath)) {
            SystemMessages::sysLogMsg(__CLASS__, "Upload failed: File not found: $localPath", LOG_ERR);
            return false;
        }

        try {
            $this->client->putObject([
                'Bucket' => $this->bucket,
                'Key' => $s3Key,
                'SourceFile' => $localPath,
                'StorageClass' => 'STANDARD', // STANDARD for MinIO compatibility (STANDARD_IA not supported)
            ]);

            SystemMessages::sysLogMsg(__CLASS__, "Uploaded to S3: $s3Key", LOG_INFO);
            return true;

        } catch (AwsException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "S3 upload failed for $s3Key: " . $e->getMessage(), LOG_ERR);
            return false;
        }
    }

    /**
     * Download file from S3 bucket
     *
     * @param string $s3Key S3 object key (path in bucket)
     * @param string $localPath Destination local path
     * @return bool True on success, false on failure
     */
    public function download(string $s3Key, string $localPath): bool
    {
        // Create directory if not exists
        $dir = dirname($localPath);
        if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
            SystemMessages::sysLogMsg(__CLASS__, "Download failed: Cannot create directory: $dir", LOG_ERR);
            return false;
        }

        try {
            $this->client->getObject([
                'Bucket' => $this->bucket,
                'Key' => $s3Key,
                'SaveAs' => $localPath,
            ]);

            SystemMessages::sysLogMsg(__CLASS__, "Downloaded from S3: $s3Key", LOG_INFO);
            return true;

        } catch (AwsException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "S3 download failed for $s3Key: " . $e->getMessage(), LOG_ERR);
            return false;
        }
    }

    /**
     * Delete file from S3 bucket
     *
     * @param string $s3Key S3 object key (path in bucket)
     * @return bool True on success, false on failure
     */
    public function delete(string $s3Key): bool
    {
        try {
            $this->client->deleteObject([
                'Bucket' => $this->bucket,
                'Key' => $s3Key,
            ]);

            SystemMessages::sysLogMsg(__CLASS__, "Deleted from S3: $s3Key", LOG_INFO);
            return true;

        } catch (AwsException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "S3 delete failed for $s3Key: " . $e->getMessage(), LOG_ERR);
            return false;
        }
    }

    /**
     * Check if object exists in S3 bucket
     *
     * @param string $s3Key S3 object key (path in bucket)
     * @return bool True if exists, false otherwise
     */
    public function exists(string $s3Key): bool
    {
        try {
            $this->client->headObject([
                'Bucket' => $this->bucket,
                'Key' => $s3Key,
            ]);
            return true;

        } catch (AwsException $e) {
            return false;
        }
    }

    /**
     * Test S3 connection and permissions
     *
     * Attempts to list bucket contents to verify:
     * - Endpoint is accessible
     * - Credentials are valid
     * - Bucket exists
     * - Permissions are sufficient
     *
     * @return array{success: bool, message: string} Test result
     */
    public function testConnection(): array
    {
        try {
            $this->client->listObjectsV2([
                'Bucket' => $this->bucket,
                'MaxKeys' => 1,
            ]);

            return [
                'success' => true,
                'message' => TranslationProvider::translate('st_S3TestSuccess'),
            ];

        } catch (AwsException $e) {
            return [
                'success' => false,
                'message' => TranslationProvider::translate('st_S3TestFailed') . ': ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get S3 object metadata
     *
     * @param string $s3Key S3 object key
     * @return array|null Object metadata or null if not found
     */
    public function getMetadata(string $s3Key): ?array
    {
        try {
            $result = $this->client->headObject([
                'Bucket' => $this->bucket,
                'Key' => $s3Key,
            ]);

            return [
                'size' => $result['ContentLength'] ?? 0,
                'last_modified' => $result['LastModified'] ?? null,
                'content_type' => $result['ContentType'] ?? null,
            ];

        } catch (AwsException $e) {
            return null;
        }
    }
}
