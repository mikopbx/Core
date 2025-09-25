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

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\MailSettingsEditForm;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\MailOAuth2Service;
use MikoPBX\Core\System\SystemMessages;

/**
 * MailSettingsController
 *
 * Minimal controller to render the mail settings view.
 * All data operations are handled through REST API.
 */
class MailSettingsController extends BaseController
{
    /**
     * Mail settings modify page
     */
    public function modifyAction(): void
    {
        // Get mail-related settings keys
        $mailSettingKeys = [
            PbxSettings::MAIL_SMTP_HOST,
            PbxSettings::MAIL_SMTP_PORT,
            PbxSettings::MAIL_SMTP_USERNAME,
            PbxSettings::MAIL_SMTP_PASSWORD,
            PbxSettings::MAIL_SMTP_USE_TLS,
            PbxSettings::MAIL_SMTP_CERT_CHECK,
            PbxSettings::MAIL_SMTP_FROM_USERNAME,
            PbxSettings::MAIL_SMTP_SENDER_ADDRESS,
            PbxSettings::MAIL_ENABLE_NOTIFICATIONS,
            PbxSettings::MAIL_SMTP_AUTH_TYPE,
            PbxSettings::MAIL_OAUTH2_PROVIDER,
            PbxSettings::MAIL_OAUTH2_CLIENT_ID,
            PbxSettings::MAIL_OAUTH2_CLIENT_SECRET,
            PbxSettings::MAIL_TPL_MISSED_CALL_SUBJECT,
            PbxSettings::MAIL_TPL_MISSED_CALL_BODY,
            PbxSettings::MAIL_TPL_MISSED_CALL_FOOTER,
            PbxSettings::MAIL_TPL_VOICEMAIL_SUBJECT,
            PbxSettings::MAIL_TPL_VOICEMAIL_BODY,
            PbxSettings::MAIL_TPL_VOICEMAIL_FOOTER,
            PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL,
            PbxSettings::SYSTEM_EMAIL_FOR_MISSED,
            PbxSettings::VOICEMAIL_NOTIFICATIONS_EMAIL,
        ];

        // Initialize settings with empty values for REST API loading
        $mailSettings = [];
        foreach ($mailSettingKeys as $key) {
            $mailSettings[$key] = '';
        }

        // Create form with initialized structure
        $this->view->form = new MailSettingsEditForm(null, $mailSettings);

        // Pass submit mode for API-based form submission
        $this->view->submitMode = null;
    }

}