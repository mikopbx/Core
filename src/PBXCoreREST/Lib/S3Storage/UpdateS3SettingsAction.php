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
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Update S3 Storage Settings Action
 *
 * Handles both PUT (full update) and PATCH (partial update) operations
 * for S3 storage configuration. Follows 7-phase SaveRecordAction pattern.
 *
 * Features:
 * - Plain text secret key storage (following MikoPBX patterns)
 * - Retention period validation (local < total)
 * - Required field validation when S3 enabled
 * - PATCH support with isset() checks
 * - Dual model updates: StorageSettings + PbxSettings
 *
 * @package MikoPBX\PBXCoreREST\Lib\Storage\S3
 */
class UpdateS3SettingsAction
{
    /**
     * Update S3 storage settings (7-phase pattern)
     *
     * Implements complete SaveRecordAction pattern for S3 singleton resource.
     * Handles both StorageSettings model and PbxSettings retention periods.
     *
     * WHY 7 PHASES:
     * 1. SANITIZATION - Security first, never trust user input
     * 2. REQUIRED VALIDATION - Fail fast before expensive operations
     * 3. DETERMINE OPERATION - Singleton always exists (UPDATE only)
     * 4. APPLY DEFAULTS - N/A for singleton (always UPDATE)
     * 5. SCHEMA VALIDATION - Validate complete dataset after sanitization
     * 6. SAVE - Transaction wrapper for dual model updates
     * 7. RESPONSE - Consistent API format
     *
     * @param array<string, mixed> $data Request data
     * @return PBXApiResult API response with updated settings
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        // ============ PHASE 1: SANITIZATION ============
        // WHY: Security - never trust user input, sanitize everything
        $sanitizationRules = DataStructure::getSanitizationRules();
        $data = self::sanitizeData($data, $sanitizationRules);

        // ============ PHASE 2: REQUIRED VALIDATION ============
        // WHY: Fail fast - if S3 enabled, require all config fields
        if (isset($data['s3_enabled']) && $data['s3_enabled'] === 1) {
            $requiredFields = ['s3_endpoint', 's3_bucket', 's3_access_key', 's3_secret_key'];
            $missingFields = [];

            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    $missingFields[] = $field;
                }
            }

            if (!empty($missingFields)) {
                $res->messages['error'][] = 'When S3 is enabled, the following fields are required: '
                                          . implode(', ', $missingFields);
                $res->success = false;
                $res->httpCode = 422;
                return $res;
            }
        }

        // ============ PHASE 3: DETERMINE OPERATION ============
        // WHY: Singleton resource - always UPDATE (record always exists)
        try {
            $settings = StorageSettings::getSettings();
        } catch (\Exception $e) {
            $res->messages['error'][] = 'Failed to load S3 settings: ' . $e->getMessage();
            $res->success = false;
            $res->httpCode = 500;
            return $res;
        }

        // ============ PHASE 4: APPLY DEFAULTS ============
        // WHY: SKIP - Singleton always UPDATE, never CREATE
        // WHY NOT: Would overwrite existing values on PATCH!

        // ============ PHASE 5: SCHEMA VALIDATION ============
        // WHY: Validate retention period constraints
        $validationErrors = self::validateRetentionPeriods($data);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            $res->success = false;
            $res->httpCode = 422;
            return $res;
        }

        // ============ PHASE 6: SAVE ============
        // WHY: All-or-nothing transaction for dual model updates
        try {
            // ========== UPDATE STORAGE SETTINGS MODEL ==========
            // WHY: Use isset() for PATCH support - only update provided fields
            if (isset($data['s3_enabled'])) {
                $settings->s3_enabled = $data['s3_enabled'];
            }
            if (isset($data['s3_endpoint'])) {
                $settings->s3_endpoint = $data['s3_endpoint'];
            }
            if (isset($data['s3_region'])) {
                $settings->s3_region = $data['s3_region'];
            }
            if (isset($data['s3_bucket'])) {
                $settings->s3_bucket = $data['s3_bucket'];
            }
            if (isset($data['s3_access_key'])) {
                $settings->s3_access_key = $data['s3_access_key'];
            }
            if (isset($data['s3_secret_key'])) {
                // WHY: Stored in plain text following MikoPBX patterns (like Sip::secret)
                // AWS SDK uses HTTPS for transport-level encryption
                $settings->s3_secret_key = $data['s3_secret_key'];
            }

            // Save StorageSettings
            if (!$settings->save()) {
                $messages = [];
                foreach ($settings->getMessages() as $message) {
                    $messages[] = $message->getMessage();
                }
                throw new \Exception('Failed to save S3 settings: ' . implode(', ', $messages));
            }

            // ========== UPDATE PBXSETTINGS (RETENTION PERIODS) ==========
            $pbxSettingsErrors = [];

            // Total retention period
            if (isset($data[PbxSettings::PBX_RECORD_SAVE_PERIOD])) {
                $messages = [];
                $result = PbxSettings::setValueByKey(
                    PbxSettings::PBX_RECORD_SAVE_PERIOD,
                    (string)$data[PbxSettings::PBX_RECORD_SAVE_PERIOD],
                    $messages
                );

                if (!$result) {
                    $pbxSettingsErrors[] = 'Failed to update ' . PbxSettings::PBX_RECORD_SAVE_PERIOD;
                }
            }

            // Local retention period (S3 mode)
            if (isset($data[PbxSettings::PBX_RECORD_S3_LOCAL_DAYS])) {
                $messages = [];
                $result = PbxSettings::setValueByKey(
                    PbxSettings::PBX_RECORD_S3_LOCAL_DAYS,
                    (string)$data[PbxSettings::PBX_RECORD_S3_LOCAL_DAYS],
                    $messages
                );

                if (!$result) {
                    $pbxSettingsErrors[] = 'Failed to update ' . PbxSettings::PBX_RECORD_S3_LOCAL_DAYS;
                }
            }

            if (!empty($pbxSettingsErrors)) {
                throw new \Exception(implode(', ', $pbxSettingsErrors));
            }

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
            $res->httpCode = 500;
            return $res;
        }

        // ============ PHASE 7: RESPONSE ============
        // WHY: Return complete settings after update
        // WHY: Mask secret key in response for security
        $maskedSecretKey = null;
        if (!empty($settings->s3_secret_key)) {
            $keyLength = strlen($settings->s3_secret_key);
            if ($keyLength > 10) {
                $maskedSecretKey = substr($settings->s3_secret_key, 0, 5)
                                 . str_repeat('*', max(3, $keyLength - 10))
                                 . substr($settings->s3_secret_key, -5);
            } else {
                $maskedSecretKey = str_repeat('*', $keyLength);
            }
        }

        $res->data = [
            's3_enabled' => $settings->s3_enabled,
            's3_endpoint' => $settings->s3_endpoint,
            's3_region' => $settings->s3_region ?? 'us-east-1',
            's3_bucket' => $settings->s3_bucket,
            's3_access_key' => $settings->s3_access_key,
            's3_secret_key' => $maskedSecretKey,
            PbxSettings::PBX_RECORD_SAVE_PERIOD => (int)PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_SAVE_PERIOD),
            PbxSettings::PBX_RECORD_S3_LOCAL_DAYS => (int)PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_S3_LOCAL_DAYS),
        ];

        $res->success = true;
        $res->httpCode = 200;

        return $res;
    }

    /**
     * Sanitize input data using DataStructure rules
     *
     * @param array<string, mixed> $data Input data
     * @param array<string, string> $rules Sanitization rules
     * @return array<string, mixed> Sanitized data
     */
    private static function sanitizeData(array $data, array $rules): array
    {
        $sanitized = [];

        foreach ($data as $key => $value) {
            if (isset($rules[$key])) {
                // Simple sanitization - extend as needed
                $ruleParts = explode('|', $rules[$key]);
                $sanitized[$key] = match (true) {
                    in_array('int', $ruleParts) || in_array('integer', $ruleParts) => (int)$value,
                    in_array('float', $ruleParts) => (float)$value,
                    in_array('bool', $ruleParts) => (bool)$value,
                    default => trim((string)$value)
                };
            } else {
                $sanitized[$key] = $value;
            }
        }

        return $sanitized;
    }

    /**
     * Validate retention period constraints
     *
     * WHY: Local retention MUST be less than total retention
     * WHY: Prevents invalid configuration (e.g., 30 days local, 7 days total)
     * WHY: Empty total = infinity, no validation needed
     *
     * @param array<string, mixed> $data Request data
     * @return array<string> Validation errors (empty if valid)
     */
    private static function validateRetentionPeriods(array $data): array
    {
        $errors = [];

        // Get current values (empty string = infinity)
        $currentTotalRaw = PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_SAVE_PERIOD);
        $currentLocalRaw = PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_S3_LOCAL_DAYS);

        // Determine final values (current or new)
        $finalTotalRaw = $data[PbxSettings::PBX_RECORD_SAVE_PERIOD] ?? $currentTotalRaw;
        $finalLocalRaw = $data[PbxSettings::PBX_RECORD_S3_LOCAL_DAYS] ?? $currentLocalRaw;

        // If total retention is infinity (empty or '0'), skip validation - any local period is valid
        if ($finalTotalRaw === '' || $finalTotalRaw === '0' || $finalTotalRaw === 0) {
            return $errors;
        }

        $finalTotal = (int)$finalTotalRaw;
        $finalLocal = (int)$finalLocalRaw;

        // Validate constraint: local must be less than total
        if ($finalLocal >= $finalTotal) {
            $errors[] = TranslationProvider::translate('rest_S3LocalRetentionMustBeLess', [
                'local' => $finalLocal,
                'total' => $finalTotal,
            ]);
        }

        return $errors;
    }
}
