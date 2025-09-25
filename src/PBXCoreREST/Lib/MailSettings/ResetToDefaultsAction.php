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

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * ResetToDefaultsAction - resets mail settings to defaults (DELETE)
 *
 * Removes all mail settings from database to use default values
 *
 * @package MikoPBX\PBXCoreREST\Lib\MailSettings
 */
class ResetToDefaultsAction
{
    /**
     * Reset mail settings to defaults
     *
     * @param array<string, mixed> $data Request parameters (unused)
     * @return PBXApiResult Result with reset status
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $db = Di::getDefault()->get('db');

        try {
            $db->begin();

            // Define mail setting keys to reset
            $mailSettingKeys = [
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

            // Delete all mail settings
            $deletedCount = 0;
            foreach ($mailSettingKeys as $key) {
                $record = PbxSettings::findFirstByKey($key);
                if ($record !== null) {
                    if ($record->delete()) {
                        $deletedCount++;
                    } else {
                        $errors = $record->getMessages();
                        foreach ($errors as $error) {
                            $res->messages['error'][] = $error->getMessage();
                        }
                        $db->rollback();
                        return $res;
                    }
                }
            }

            $db->commit();

            $res->success = true;
            if ($deletedCount === 0) {
                $res->messages['info'][] = 'Mail settings were already at defaults';
            } else {
                $res->messages['success'][] = "Reset $deletedCount mail settings to defaults";
            }
            $res->data = ['reset_count' => $deletedCount];

        } catch (\Exception $e) {
            $db->rollback();
            $res->messages['error'][] = 'Failed to reset settings: ' . $e->getMessage();
        }

        return $res;
    }
}