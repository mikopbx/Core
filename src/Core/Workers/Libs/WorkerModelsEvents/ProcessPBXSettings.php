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

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use Phalcon\Di\Injectable;

class ProcessPBXSettings extends Injectable
{
    /**
     * Initializes the PBX settings dependency table.
     */
    public static function getDependencyTable(): array
    {
        $tables = [];
        // FeaturesSettings
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::PBX_LANGUAGE,
                PbxSettingsConstants::PBX_INTERNAL_EXTENSION_LENGTH,
                PbxSettingsConstants::PBX_FEATURE_ATTENDED_TRANSFER,
                PbxSettingsConstants::PBX_FEATURE_BLIND_TRANSFER,
                PbxSettingsConstants::PBX_FEATURE_DIGIT_TIMEOUT,
                PbxSettingsConstants::PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT,
                PbxSettingsConstants::PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT,
                PbxSettingsConstants::PBX_FEATURE_PICKUP_EXTEN,
            ],
            'functions' => [
                WorkerModelsEvents::R_FEATURES,
                WorkerModelsEvents::R_DIALPLAN,
            ],
        ];

        // Parking settings
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::PBX_CALL_PARKING_EXT,
                PbxSettingsConstants::PBX_CALL_PARKING_START_SLOT,
                PbxSettingsConstants::PBX_CALL_PARKING_END_SLOT,
            ],
            'functions' => [
                WorkerModelsEvents::R_FEATURES, // ??? parkcall in features.conf ???
                WorkerModelsEvents::R_DIALPLAN,
                WorkerModelsEvents::R_PARKING,
            ],
        ];

        // CallRecordSettings
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::PBX_RECORD_CALLS,
                PbxSettingsConstants::PBX_RECORD_CALLS_INNER,
                PbxSettingsConstants::PBX_SPLIT_AUDIO_THREAD,
            ],
            'functions' => [
                WorkerModelsEvents::R_DIALPLAN,
            ],
        ];

        // CallRecordSettings / The period of storing conversation records
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::PBX_RECORD_SAVE_PERIOD,
            ],
            'functions' => [
                WorkerModelsEvents::R_UPDATE_REC_SAVE_PERIOD,
            ],
        ];

        // AMIParameters
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::AMI_PORT,
                PbxSettingsConstants::AJAM_PORT,
                PbxSettingsConstants::AJAM_PORT_TLS,
            ],
            'functions' => [
                WorkerModelsEvents::R_MANAGERS,
            ],
        ];

        // IaxParameters
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::IAX_PORT,
            ],
            'functions' => [
                WorkerModelsEvents::R_IAX,
            ],
        ];

        // Guest calls without authorization
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::PBX_ALLOW_GUEST_CALLS,
                PbxSettingsConstants::USE_WEB_RTC,
            ],
            'functions' => [
                WorkerModelsEvents::R_SIP,
                WorkerModelsEvents::R_DIALPLAN,
            ],
        ];

        // SipParameters
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::SIP_PORT,
                PbxSettingsConstants::TLS_PORT,
                PbxSettingsConstants::SIP_DEFAULT_EXPIRY,
                PbxSettingsConstants::SIP_MIN_EXPIRY,
                PbxSettingsConstants::SIP_MAX_EXPIRY,
                PbxSettingsConstants::PBX_LANGUAGE,
            ],
            'functions' => [
                WorkerModelsEvents::R_SIP,
            ],
        ];

        // RTPParameters
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::RTP_PORT_FROM,
                PbxSettingsConstants::RTP_PORT_TO,
                PbxSettingsConstants::RTP_STUN_SERVER,
            ],
            'functions' => [
                WorkerModelsEvents::R_RTP,
            ],
        ];

        // SSHParameters
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::SSH_PORT,
                PbxSettingsConstants::SSH_RSA_KEY,
                PbxSettingsConstants::SSH_DSS_KEY,
                PbxSettingsConstants::SSH_PASSWORD,
                PbxSettingsConstants::SSH_ECDSA_KEY,
                PbxSettingsConstants::SSH_AUTHORIZED_KEYS,
                PbxSettingsConstants::SSH_DISABLE_SSH_PASSWORD,
            ],
            'functions' => [
                WorkerModelsEvents::R_SSH,
            ],
        ];

        // FirewallParameters
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::SIP_PORT,
                PbxSettingsConstants::TLS_PORT,
                PbxSettingsConstants::RTP_PORT_FROM,
                PbxSettingsConstants::RTP_PORT_TO,
                PbxSettingsConstants::IAX_PORT,
                PbxSettingsConstants::AMI_PORT,
                PbxSettingsConstants::AJAM_PORT,
                PbxSettingsConstants::AJAM_PORT_TLS,
                PbxSettingsConstants::WEB_PORT,
                PbxSettingsConstants::WEB_HTTPS_PORT,
                PbxSettingsConstants::SSH_PORT,
                PbxSettingsConstants::PBX_FIREWALL_ENABLED,
                PbxSettingsConstants::PBX_FAIL2BAN_ENABLED,
            ],
            'functions' => [
                WorkerModelsEvents::R_FIREWALL,
            ],
            'strPosKey' => 'FirewallSettings',
        ];

        // FirewallParameters
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::WEB_PORT,
                PbxSettingsConstants::WEB_HTTPS_PORT,
                PbxSettingsConstants::WEB_HTTPS_PUBLIC_KEY,
                PbxSettingsConstants::WEB_HTTPS_PRIVATE_KEY,
                PbxSettingsConstants::REDIRECT_TO_HTTPS,
            ],
            'functions' => [
                WorkerModelsEvents::R_NGINX,
            ],
        ];

        // CronParameters
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::RESTART_EVERY_NIGHT,
            ],
            'functions' => [
                WorkerModelsEvents::R_CRON,
            ],
        ];

        // DialplanParameters
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::PBX_LANGUAGE,
                PbxSettingsConstants::PBX_RECORD_ANNOUNCEMENT_IN,
                PbxSettingsConstants::PBX_RECORD_ANNOUNCEMENT_OUT,
            ],
            'functions' => [
                WorkerModelsEvents::R_DIALPLAN,
            ],
        ];
        // DialplanParameters
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::PBX_LANGUAGE,
            ],
            'functions' => [
                WorkerModelsEvents::R_PBX_CORE,
            ],
        ];

        // VoiceMailParameters
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::MAIL_TPL_VOICEMAIL_SUBJECT,
                PbxSettingsConstants::MAIL_TPL_VOICEMAIL_BODY,
                PbxSettingsConstants::MAIL_TPL_VOICEMAIL_FOOTER,
                PbxSettingsConstants::MAIL_SMTP_SENDER_ADDRESS,
                PbxSettingsConstants::MAIL_SMTP_USERNAME,
                PbxSettingsConstants::PBX_TIMEZONE,
                PbxSettingsConstants::VOICEMAIL_NOTIFICATIONS_EMAIL,
                PbxSettingsConstants::SYSTEM_NOTIFICATIONS_EMAIL,
                PbxSettingsConstants::SYSTEM_EMAIL_FOR_MISSED,
            ],
            'functions' => [
                WorkerModelsEvents::R_VOICEMAIL,
            ],
        ];

        // VisualLanguageSettings
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::SSH_LANGUAGE,
                PbxSettingsConstants::WEB_ADMIN_LANGUAGE,
            ],
            'functions' => [
                WorkerModelsEvents::R_REST_API_WORKER,
            ],
        ];

        // LicenseSettings
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::PBX_LICENSE,
            ],
            'functions' => [
                WorkerModelsEvents::R_LICENSE,
                WorkerModelsEvents::R_NATS,
            ],
        ];

        // TimeZoneSettings
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::PBX_TIMEZONE,
            ],
            'functions' => [
                WorkerModelsEvents::R_TIMEZONE,
                WorkerModelsEvents::R_NGINX,
                WorkerModelsEvents::R_PHP_FPM,
                WorkerModelsEvents::R_REST_API_WORKER,
                WorkerModelsEvents::R_CALL_EVENTS_WORKER,
                WorkerModelsEvents::R_SYSLOG,
            ],
        ];

        // NTPSettings
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::PBX_MANUAL_TIME_SETTINGS,
                PbxSettingsConstants::NTP_SERVER,
                PbxSettingsConstants::PBX_TIMEZONE,
            ],
            'functions' => [
                WorkerModelsEvents::R_NTP,
            ],
        ];

        // Advices
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::WEB_ADMIN_PASSWORD,
                PbxSettingsConstants::SSH_PASSWORD,
                PbxSettingsConstants::PBX_FIREWALL_ENABLED,
            ],
            'functions' => [
                WorkerModelsEvents::R_ADVICES,
            ],
        ];

        // Sentry
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::SEND_METRICS,
            ],
            'functions' => [
                WorkerModelsEvents::R_SENTRY,
            ],
        ];

        // Default description texts
        $tables[] = [
            'settingName' => [
                PbxSettingsConstants::WEB_ADMIN_PASSWORD,
            ],
            'functions' => [
                WorkerModelsEvents::R_RESET_DESCRIPTION,
            ],
        ];

        return $tables;
    }
}