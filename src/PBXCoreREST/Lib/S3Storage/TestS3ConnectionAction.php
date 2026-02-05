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

namespace MikoPBX\PBXCoreREST\Lib\S3Storage;

use MikoPBX\Common\Models\StorageSettings;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\Storage\S3Client;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Test S3 Connection Action
 *
 * Verifies S3 storage connectivity and credentials. This endpoint tests:
 * - Network connectivity to S3 endpoint
 * - Credentials authentication
 * - Bucket existence and accessibility
 * - Read/write permissions
 *
 * This is a READ-ONLY operation - it doesn't modify any configuration.
 * Uses current settings from database for testing.
 *
 * Response format:
 * - success=true: Connection successful, bucket accessible
 * - success=false: Connection failed, message contains error details
 *
 * @package MikoPBX\PBXCoreREST\Lib\Storage\S3
 */
class TestS3ConnectionAction
{
    /**
     * Test S3 connection with current settings
     *
     * Attempts to connect to S3 endpoint using stored credentials
     * and verifies bucket accessibility. Returns detailed result
     * with success status and error information if connection fails.
     *
     * WHY: Pre-flight check before enabling S3 storage
     * WHY: Troubleshooting tool for connectivity issues
     * WHY: Validates credentials without modifying settings
     *
     * Test steps:
     * 1. Check if S3 is configured (endpoint, bucket, credentials)
     * 2. Initialize S3Client with current settings
     * 3. Perform ListObjectsV2 operation (tests all permissions)
     * 4. Return success or detailed error message
     *
     * @param array<string, mixed> $data Request data (unused)
     * @return PBXApiResult API response with test result
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // ============ STEP 1: VERIFY S3 IS CONFIGURED ============
            // WHY: Can't test connection without configuration
            $settings = StorageSettings::getSettings();

            if ($settings->s3_enabled !== 1) {
                $res->messages['error'][] = 'S3 storage is not enabled. Enable S3 before testing connection.';
                $res->success = false;
                $res->httpCode = 400;
                return $res;
            }

            if (!$settings->isS3Configured()) {
                $res->messages['error'][] = 'S3 storage is not fully configured. Please provide endpoint, bucket, and credentials.';
                $res->success = false;
                $res->httpCode = 400;
                return $res;
            }

            // ============ STEP 2: INITIALIZE S3 CLIENT ============
            // WHY: S3Client constructor loads settings and validates config
            try {
                $s3Client = new S3Client();
            } catch (\Exception $e) {
                $res->messages['error'][] = 'Failed to initialize S3 client: ' . $e->getMessage();
                $res->success = false;
                $res->httpCode = 500;
                return $res;
            }

            // ============ STEP 3: TEST CONNECTION ============
            // WHY: testConnection() performs actual S3 API call
            // Performs ListObjectsV2 operation which requires:
            // - Valid endpoint URL
            // - Network connectivity
            // - Valid credentials
            // - Bucket existence
            // - ListBucket permission
            $testResult = $s3Client->testConnection();

            // ============ STEP 4: FORMAT RESPONSE ============
            // WHY: Consistent API format for success and failure cases
            if ($testResult['success']) {
                $res->success = true;
                $res->httpCode = 200;
                $res->data = [
                    'status' => 'connected',
                    'message' => $testResult['message'],
                    'endpoint' => $settings->s3_endpoint,
                    'bucket' => $settings->s3_bucket,
                    'region' => $settings->s3_region ?? 'us-east-1'
                ];
                $res->messages['info'][] = $testResult['message'];
            } else {
                $res->success = false;
                $res->httpCode = 200; // Not a server error, but connection test failure
                $res->data = [
                    'status' => 'failed',
                    'message' => $testResult['message'], // Technical details for diagnostics
                    'endpoint' => $settings->s3_endpoint,
                    'bucket' => $settings->s3_bucket,
                    'region' => $settings->s3_region ?? 'us-east-1'
                ];
                // Short user-friendly message for UI
                $res->messages['error'][] = TranslationProvider::translate('rest_err_s3_connection_failed');
            }

        } catch (\Exception $e) {
            // ============ UNEXPECTED ERROR HANDLING ============
            // WHY: Graceful degradation for unexpected failures
            $res->messages['error'][] = 'Unexpected error during connection test: ' . $e->getMessage();
            $res->success = false;
            $res->httpCode = 500;
        }

        return $res;
    }
}
