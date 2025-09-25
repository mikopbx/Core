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
use MikoPBX\PBXCoreREST\Lib\Common\FieldTypeResolver;
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

            // Clean and validate email fields
            $data = self::cleanEmailFields($data);
            $emailValidation = self::validateEmailFields($data);
            if (!$emailValidation['valid']) {
                foreach ($emailValidation['messages'] as $message) {
                    $res->messages['error'][] = $message;
                }
                return $res;
            }

            // Validate password if password auth is used
            if (($data[PbxSettings::MAIL_SMTP_AUTH_TYPE] ?? 'password') === 'password') {
                $passwordValidation = self::validatePassword($data);
                if (!$passwordValidation['valid']) {
                    foreach ($passwordValidation['messages'] as $message) {
                        $res->messages['error'][] = $message;
                    }
                    return $res;
                }
            }

            // Define mail setting keys
            $mailSettingKeys = self::getMailSettingKeys();

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
                $value = FieldTypeResolver::convertForStorage($value, PbxSettings::class, $key);

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
     * Get all mail setting keys
     *
     * @return array List of mail setting keys
     */
    private static function getMailSettingKeys(): array
    {
        return [
            // Basic SMTP settings
            PbxSettings::MAIL_SMTP_HOST,
            PbxSettings::MAIL_SMTP_PORT,
            PbxSettings::MAIL_SMTP_USERNAME,
            PbxSettings::MAIL_SMTP_PASSWORD,
            PbxSettings::MAIL_SMTP_USE_TLS,
            PbxSettings::MAIL_SMTP_CERT_CHECK,
            PbxSettings::MAIL_SMTP_FROM_USERNAME,
            PbxSettings::MAIL_SMTP_SENDER_ADDRESS,
            PbxSettings::MAIL_ENABLE_NOTIFICATIONS,

            // OAuth2 settings
            PbxSettings::MAIL_SMTP_AUTH_TYPE,
            PbxSettings::MAIL_OAUTH2_PROVIDER,
            PbxSettings::MAIL_OAUTH2_CLIENT_ID,
            PbxSettings::MAIL_OAUTH2_CLIENT_SECRET,
            PbxSettings::MAIL_OAUTH2_REFRESH_TOKEN,
            PbxSettings::MAIL_OAUTH2_ACCESS_TOKEN,
            PbxSettings::MAIL_OAUTH2_TOKEN_EXPIRES,

            // Email templates
            PbxSettings::MAIL_TPL_MISSED_CALL_SUBJECT,
            PbxSettings::MAIL_TPL_MISSED_CALL_BODY,
            PbxSettings::MAIL_TPL_MISSED_CALL_FOOTER,
            PbxSettings::MAIL_TPL_VOICEMAIL_SUBJECT,
            PbxSettings::MAIL_TPL_VOICEMAIL_BODY,
            PbxSettings::MAIL_TPL_VOICEMAIL_FOOTER,

            // Notification emails
            PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL,
            PbxSettings::SYSTEM_EMAIL_FOR_MISSED,
            PbxSettings::VOICEMAIL_NOTIFICATIONS_EMAIL
        ];
    }


    /**
     * Clean email fields by removing placeholder values
     *
     * @param array $data Settings data
     * @return array Cleaned data
     */
    private static function cleanEmailFields(array $data): array
    {
        $emailFields = [
            PbxSettings::MAIL_SMTP_SENDER_ADDRESS,
            PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL,
            PbxSettings::SYSTEM_EMAIL_FOR_MISSED,
            PbxSettings::VOICEMAIL_NOTIFICATIONS_EMAIL
        ];

        $placeholders = ['_@_._', '@', '_@_', '___@___.___'];

        foreach ($emailFields as $field) {
            if (isset($data[$field]) && in_array($data[$field], $placeholders, true)) {
                // Replace placeholder with empty string
                $data[$field] = '';
            }
        }

        return $data;
    }

    /**
     * Validate email fields
     *
     * @param array $data Settings data
     * @return array Validation result
     */
    private static function validateEmailFields(array $data): array
    {
        $emailFields = [
            PbxSettings::MAIL_SMTP_SENDER_ADDRESS => 'Sender address',
            PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL => 'System notifications email',
            PbxSettings::SYSTEM_EMAIL_FOR_MISSED => 'Missed calls email',
            PbxSettings::VOICEMAIL_NOTIFICATIONS_EMAIL => 'Voicemail notifications email'
        ];

        $errors = [];

        foreach ($emailFields as $field => $fieldName) {
            if (!isset($data[$field]) || empty($data[$field])) {
                // Email fields can be empty - they are optional
                continue;
            }

            $value = $data[$field];

            // Check for placeholder values that should not be saved
            if (in_array($value, ['_@_._', '@', '_@_', '___@___.___'], true)) {
                $errors[] = "$fieldName contains invalid placeholder value. Please enter a valid email or leave empty.";
                continue;
            }

            // Validate email format
            if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                $errors[] = "$fieldName is not a valid email address: $value";
            }
        }

        return [
            'valid' => empty($errors),
            'messages' => $errors
        ];
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