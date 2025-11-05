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

namespace MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice;

use MikoPBX\Common\Models\StorageSettings;
use MikoPBX\Core\System\Storage\S3Client;
use Phalcon\Di\Injectable;

/**
 * CheckS3Connection - Verify S3 storage connectivity
 *
 * This class checks if S3 storage is enabled and verifies connection health.
 * Critical for ensuring recording uploads and downloads work properly.
 *
 * WHY: S3 connectivity failures can cause:
 * - Recording upload failures (disk fills up)
 * - Playback failures (can't retrieve from S3)
 * - Data loss if not detected early
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckS3Connection extends Injectable
{
    /**
     * Check S3 storage connection status
     *
     * Tests:
     * 1. If S3 is enabled in settings
     * 2. If S3 credentials are configured
     * 3. If S3 endpoint is accessible
     * 4. If bucket permissions are correct
     *
     * WHY: Fail early, fail loud - detect S3 issues before they cause problems
     *
     * @return array<string, array<int, array<string, mixed>>> Warning or error messages
     */
    public function process(): array
    {
        $messages = [];

        try {
            // ========== STEP 1: CHECK IF S3 IS ENABLED ==========
            $settings = StorageSettings::getSettings();

            if ($settings->s3_enabled !== 1) {
                // S3 disabled - no checks needed
                return $messages;
            }

            // ========== STEP 2: VERIFY S3 CONFIGURATION ==========
            if (!$settings->isS3Configured()) {
                $messages['warning'][] = [
                    'messageTpl' => 'adv_S3EnabledButNotConfigured',
                    'messageParams' => []
                ];
                return $messages;
            }

            // ========== STEP 3: TEST S3 CONNECTION ==========
            // WHY: Try to initialize S3 client and test connection
            // WHY: If this fails, uploads/downloads will fail

            try {
                $s3Client = new S3Client();
                $testResult = $s3Client->testConnection();

                if (!$testResult['success']) {
                    // S3 connection failed - critical issue
                    $messages['error'][] = [
                        'messageTpl' => 'adv_S3ConnectionFailed',
                        'messageParams' => [
                            'error' => $testResult['message'],
                            'endpoint' => $settings->s3_endpoint ?? 'N/A',
                            'bucket' => $settings->s3_bucket ?? 'N/A'
                        ]
                    ];
                }

            } catch (\Exception $e) {
                // S3 client initialization failed
                $messages['error'][] = [
                    'messageTpl' => 'adv_S3ClientInitializationFailed',
                    'messageParams' => [
                        'error' => $e->getMessage(),
                        'endpoint' => $settings->s3_endpoint ?? 'N/A'
                    ]
                ];
            }

        } catch (\Exception $e) {
            // Unexpected error during S3 check
            $messages['error'][] = [
                'messageTpl' => 'adv_S3CheckUnexpectedError',
                'messageParams' => [
                    'error' => $e->getMessage()
                ]
            ];
        }

        return $messages;
    }
}
