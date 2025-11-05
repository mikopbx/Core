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

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\StorageSettings;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Get S3 Storage Settings Action
 *
 * Retrieves current S3 storage configuration including credentials,
 * endpoint settings, and retention periods. Secret keys are masked
 * in responses for security.
 *
 * Response includes:
 * - S3 configuration (endpoint, bucket, region, credentials)
 * - Recording retention settings (total and local periods)
 * - Secret keys are masked with asterisks (security)
 *
 * @package MikoPBX\PBXCoreREST\Lib\Storage\S3
 */
class GetS3SettingsAction
{
    /**
     * Get S3 storage settings (singleton resource)
     *
     * Retrieves the single S3 configuration instance from database.
     * Secret key is masked in response for security.
     *
     * WHY: Singleton resource - only one S3 configuration exists.
     * WHY: Mask secret key - prevent credential leakage in logs/responses.
     * WHY: Include retention settings - complete storage configuration.
     *
     * @param array<string, mixed> $data Request data (unused for GET)
     * @return PBXApiResult API response with S3 settings
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // ============ STEP 1: RETRIEVE S3 SETTINGS ============
            // WHY: Singleton pattern - getSettings() creates record if missing
            $settings = StorageSettings::getSettings();

            // ============ STEP 2: GET RETENTION SETTINGS ============
            // WHY: Retention periods control when recordings move to S3
            $totalRetentionDays = PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_SAVE_PERIOD);
            $localRetentionDays = PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_S3_LOCAL_DAYS);

            // ============ STEP 3: MASK SECRET KEY ============
            // WHY: Security - never expose secret keys in API responses
            // Format: 'wJalr...LEKEY' (show first 5 and last 5 chars)
            $maskedSecretKey = null;
            if (!empty($settings->s3_secret_key)) {
                $keyLength = strlen($settings->s3_secret_key);
                if ($keyLength > 10) {
                    $maskedSecretKey = substr($settings->s3_secret_key, 0, 5)
                                     . str_repeat('*', max(3, $keyLength - 10))
                                     . substr($settings->s3_secret_key, -5);
                } else {
                    // Short keys: mask completely
                    $maskedSecretKey = str_repeat('*', $keyLength);
                }
            }

            // ============ STEP 4: PREPARE RESPONSE ============
            // WHY: Consistent format matches DataStructure schema
            $res->data = [
                // S3 Configuration
                's3_enabled' => $settings->s3_enabled,
                's3_endpoint' => $settings->s3_endpoint,
                's3_region' => $settings->s3_region ?? 'us-east-1',
                's3_bucket' => $settings->s3_bucket,
                's3_access_key' => $settings->s3_access_key,
                's3_secret_key' => $maskedSecretKey,

                // Retention Settings
                PbxSettings::PBX_RECORD_SAVE_PERIOD => (int)$totalRetentionDays,
                PbxSettings::PBX_RECORD_S3_LOCAL_DAYS => (int)$localRetentionDays,
            ];

            $res->success = true;
            $res->httpCode = 200;

        } catch (\Exception $e) {
            // ============ ERROR HANDLING ============
            // WHY: Graceful degradation - return error without exposing internals
            $res->messages['error'][] = 'Failed to retrieve S3 settings: ' . $e->getMessage();
            $res->success = false;
            $res->httpCode = 500;
        }

        return $res;
    }
}
