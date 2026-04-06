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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\MailSettings;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\PasswordService;
use MikoPBX\PBXCoreREST\Lib\Common\BaseActionHelper;
use MikoPBX\PBXCoreREST\Lib\MailSettings\DataStructure;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * UpdateRecordAction - performs full update of mail settings (PUT)
 *
 * This action represents a complete replacement of mail settings data.
 *
 * @package MikoPBX\PBXCoreREST\Lib\MailSettings
 */
class UpdateRecordAction
{
    /**
     * Perform full update of mail settings
     *
     * @param array<string, mixed> $data Complete settings data to save
     * @return PBXApiResult Result with success status and messages
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $db = Di::getDefault()->get('db');

        try {
            $db->begin();

            // ============ PHASE 1: SANITIZATION ============
            // WHY: Security - never trust user input
            // Email fields with 'sanitize' => 'email' will have placeholders replaced
            $sanitizationRules = DataStructure::getSanitizationRules();
            $data = BaseActionHelper::sanitizeData($data, $sanitizationRules);

            // ============ PHASE 2: FIELD VALIDATION ============
            // WHY: Validate email format after sanitization
            // Ensures only valid emails are saved (no placeholders or invalid formats)
            $emailValidation = DataStructure::validateEmailFields($data);
            if (!$emailValidation['valid']) {
                foreach ($emailValidation['messages'] as $message) {
                    $res->messages['error'][] = $message;
                }
                return $res;
            }

            // ============ PHASE 3: AUTH-SPECIFIC VALIDATION ============
            // WHY: Password validation only applies to password auth type
            // OAuth2 uses tokens instead of passwords
            if (($data[PbxSettings::MAIL_SMTP_AUTH_TYPE] ?? 'password') === 'password') {
                $passwordValidation = self::validatePassword($data);
                if (!$passwordValidation['valid']) {
                    foreach ($passwordValidation['messages'] as $message) {
                        $res->messages['error'][] = $message;
                    }
                    return $res;
                }
            }

            // ============ PHASE 4: UPDATE SETTINGS ============
            // WHY: Process each mail setting from the Single Source of Truth
            // Get mail setting keys from DataStructure (Single Source of Truth)
            $mailSettingKeys = DataStructure::getAllMailSettingKeys();

            // Update all mail settings
            $updatedCount = 0;
            foreach ($mailSettingKeys as $key) {
                if (!array_key_exists($key, $data)) {
                    continue;
                }

                $value = $data[$key];

                // Skip masked password/secret fields - they should not be updated with masked values
                $maskedFields = [
                    PbxSettings::MAIL_SMTP_PASSWORD,
                    PbxSettings::MAIL_OAUTH2_CLIENT_SECRET
                ];

                if (in_array($key, $maskedFields, true)) {
                    // Check if value is masked (contains only asterisks or is exactly 8 asterisks)
                    if (preg_match('/^\*+$/', $value) || $value === '********') {
                        // Skip updating this field - keep existing value
                        continue;
                    }
                }

                // Convert value to storage format based on field type
                // For boolean fields: true/false -> "1"/"0"
                $value = DataStructure::convertValueForStorage($key, $value);

                // Save setting
                $record = PbxSettings::findFirstByKey($key);
                if ($record === null) {
                    $record = new PbxSettings();
                    $record->key = $key;
                }

                // Check if value actually changed
                if ($record->value !== $value) {
                    $record->value = $value;

                    if (!$record->save()) {
                        $errors = $record->getMessages();
                        foreach ($errors as $error) {
                            $res->messages['error'][] = $error->getMessage();
                        }
                        $db->rollback();
                        return $res;
                    }
                    $updatedCount++;
                }
            }

            $db->commit();

            $res->success = true;
            if ($updatedCount === 0) {
                $res->messages['info'][] = 'No settings were changed';
            } else {
                $res->messages['success'][] = "$updatedCount mail settings were updated";
            }
            $res->data = ['updated_count' => $updatedCount];

        } catch (\Exception $e) {
            $db->rollback();
            $res->messages['error'][] = $e->getMessage();
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }

        return $res;
    }

    /**
     * Validate SMTP password
     *
     * @param array $data Settings data
     * @return array Validation result
     */
    private static function validatePassword(array $data): array
    {
        if (empty($data[PbxSettings::MAIL_SMTP_PASSWORD])) {
            // Password can be empty if no authentication is needed
            return ['valid' => true, 'messages' => []];
        }

        $validationResult = PasswordService::validate(
            $data[PbxSettings::MAIL_SMTP_PASSWORD],
            'smtp'
        );

        if (!empty($validationResult['errors'])) {
            return [
                'valid' => false,
                'messages' => $validationResult['errors']
            ];
        }

        return ['valid' => true, 'messages' => []];
    }
}