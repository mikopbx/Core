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
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadCloudDescriptionAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadCrondAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadDialplanAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadFeaturesAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadIAXAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadLicenseAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadManagerAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadNatsAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadNginxAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadNTPAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadParkingAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadPHPFPMAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadPJSIPAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadRecordingSettingsAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadRecordSavePeriodAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadRestAPIWorkerAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadRTPAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadSentryAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadSSHAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadSyslogDAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadTimezoneAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadVoicemailAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadWorkerCallEventsAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\RestartPBXCoreAction;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadFirewallAction;
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
            'keys' => [
                PbxSettings::PBX_LANGUAGE,
                PbxSettings::PBX_INTERNAL_EXTENSION_LENGTH,
                PbxSettings::PBX_FEATURE_ATTENDED_TRANSFER,
                PbxSettings::PBX_FEATURE_BLIND_TRANSFER,
                PbxSettings::PBX_FEATURE_DIGIT_TIMEOUT,
                PbxSettings::PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT,
                PbxSettings::PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT,
                PbxSettings::PBX_FEATURE_PICKUP_EXTEN,
            ],
            'actions' => [
                ReloadFeaturesAction::class,
                ReloadDialplanAction::class,
            ],
        ];

        // Parking settings
        $tables[] = [
            'keys' => [
                PbxSettings::PBX_CALL_PARKING_EXT,
                PbxSettings::PBX_CALL_PARKING_START_SLOT,
                PbxSettings::PBX_CALL_PARKING_END_SLOT,
            ],
            'actions' => [
                ReloadFeaturesAction::class, // ??? parkcall in features.conf ???
                ReloadDialplanAction::class,
                ReloadParkingAction::class,
            ],
        ];

        // CallRecordSettings
        $tables[] = [
            'keys' => [
                PbxSettings::PBX_RECORD_CALLS,
                PbxSettings::PBX_RECORD_CALLS_INNER,
                PbxSettings::PBX_SPLIT_AUDIO_THREAD,
            ],
            'actions' => [
                ReloadDialplanAction::class,
            ],
        ];

        // CallRecordSettings / The period of storing conversation records
        $tables[] = [
            'keys' => [
                PbxSettings::PBX_RECORD_SAVE_PERIOD,
            ],
            'actions' => [
                ReloadRecordSavePeriodAction::class,
            ],
        ];

        // AMIParameters
        $tables[] = [
            'keys' => [
                PbxSettings::AMI_PORT,
                PbxSettings::AJAM_PORT,
                PbxSettings::AJAM_PORT_TLS,
            ],
            'actions' => [
                ReloadManagerAction::class,
            ],
        ];

        // IaxParameters
        $tables[] = [
            'keys' => [
                PbxSettings::IAX_PORT,
            ],
            'actions' => [
                ReloadIAXAction::class,
            ],
        ];

        // Guest calls without authorization
        $tables[] = [
            'keys' => [
                PbxSettings::PBX_ALLOW_GUEST_CALLS,
                PbxSettings::USE_WEB_RTC,
            ],
            'actions' => [
                ReloadPJSIPAction::class,
                ReloadDialplanAction::class,
            ],
        ];

        // SipParameters
        $tables[] = [
            'keys' => [
                PbxSettings::SIP_PORT,
                PbxSettings::TLS_PORT,
                PbxSettings::SIP_DEFAULT_EXPIRY,
                PbxSettings::SIP_MIN_EXPIRY,
                PbxSettings::SIP_MAX_EXPIRY,
                PbxSettings::PBX_LANGUAGE,
                PbxSettings::PBX_TIMEZONE,
            ],
            'actions' => [
                ReloadPJSIPAction::class,
            ],
        ];

        // RTPParameters
        $tables[] = [
            'keys' => [
                PbxSettings::RTP_PORT_FROM,
                PbxSettings::RTP_PORT_TO,
                PbxSettings::RTP_STUN_SERVER,
            ],
            'actions' => [
                ReloadRTPAction::class,
            ],
        ];

        // SSHParameters
        $tables[] = [
            'keys' => [
                PbxSettings::SSH_LOGIN,
                PbxSettings::SSH_PORT,
                PbxSettings::SSH_RSA_KEY,
                PbxSettings::SSH_DSS_KEY,
                PbxSettings::SSH_PASSWORD,
                PbxSettings::SSH_ECDSA_KEY,
                PbxSettings::SSH_AUTHORIZED_KEYS,
                PbxSettings::SSH_DISABLE_SSH_PASSWORD,
            ],
            'actions' => [
                ReloadSSHAction::class,
            ],
        ];

        // FirewallParameters
        $tables[] = [
            'keys' => [
                PbxSettings::SIP_PORT,
                PbxSettings::TLS_PORT,
                PbxSettings::RTP_PORT_FROM,
                PbxSettings::RTP_PORT_TO,
                PbxSettings::IAX_PORT,
                PbxSettings::AMI_PORT,
                PbxSettings::AJAM_PORT,
                PbxSettings::AJAM_PORT_TLS,
                PbxSettings::WEB_PORT,
                PbxSettings::WEB_HTTPS_PORT,
                PbxSettings::SSH_PORT,
                PbxSettings::PBX_FIREWALL_ENABLED,
                PbxSettings::PBX_FAIL2BAN_ENABLED,
            ],
            'actions' => [
                ReloadFirewallAction::class,
            ],
            'strPosKey' => 'FirewallSettings',
        ];

        // FirewallParameters
        $tables[] = [
            'keys' => [
                PbxSettings::WEB_PORT,
                PbxSettings::WEB_HTTPS_PORT,
                PbxSettings::WEB_HTTPS_PUBLIC_KEY,
                PbxSettings::WEB_HTTPS_PRIVATE_KEY,
                PbxSettings::REDIRECT_TO_HTTPS,
            ],
            'actions' => [
                ReloadNginxAction::class,
            ],
        ];

        // CronParameters
        $tables[] = [
            'keys' => [
                PbxSettings::RESTART_EVERY_NIGHT,
            ],
            'actions' => [
                ReloadCrondAction::class,
            ],
        ];

        // DialplanParameters
        $tables[] = [
            'keys' => [
                PbxSettings::PBX_LANGUAGE,
                PbxSettings::PBX_RECORD_ANNOUNCEMENT_IN,
                PbxSettings::PBX_RECORD_ANNOUNCEMENT_OUT,
            ],
            'actions' => [
                ReloadDialplanAction::class,
            ],
        ];
        // DialplanParameters
        $tables[] = [
            'keys' => [
                PbxSettings::PBX_LANGUAGE,
            ],
            'actions' => [
                RestartPBXCoreAction::class,
            ],
        ];

        // VoiceMailParameters
        $tables[] = [
            'keys' => [
                PbxSettings::MAIL_TPL_VOICEMAIL_SUBJECT,
                PbxSettings::MAIL_TPL_VOICEMAIL_BODY,
                PbxSettings::MAIL_TPL_VOICEMAIL_FOOTER,
                PbxSettings::MAIL_SMTP_SENDER_ADDRESS,
                PbxSettings::MAIL_SMTP_USERNAME,
                PbxSettings::PBX_TIMEZONE,
                PbxSettings::VOICEMAIL_NOTIFICATIONS_EMAIL,
                PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL,
                PbxSettings::SYSTEM_EMAIL_FOR_MISSED,
            ],
            'actions' => [
                ReloadVoicemailAction::class,
            ],
        ];

        // VisualLanguageSettings
        $tables[] = [
            'keys' => [
                PbxSettings::SSH_LANGUAGE,
                PbxSettings::WEB_ADMIN_LANGUAGE,
            ],
            'actions' => [
                ReloadRestAPIWorkerAction::class,
            ],
        ];

        // LicenseSettings
        $tables[] = [
            'keys' => [
                PbxSettings::PBX_LICENSE,
            ],
            'actions' => [
                ReloadLicenseAction::class,
                ReloadNatsAction::class,
            ],
        ];

        // TimeZoneSettings
        $tables[] = [
            'keys' => [
                PbxSettings::PBX_TIMEZONE,
            ],
            'actions' => [
                ReloadTimezoneAction::class,
                ReloadNginxAction::class,
                ReloadPHPFPMAction::class,
                ReloadRestAPIWorkerAction::class,
                ReloadWorkerCallEventsAction::class,
                ReloadSyslogDAction::class,
            ],
        ];

        // NTPSettings
        $tables[] = [
            'keys' => [
                PbxSettings::PBX_MANUAL_TIME_SETTINGS,
                PbxSettings::NTP_SERVER,
                PbxSettings::PBX_TIMEZONE,
            ],
            'actions' => [
                ReloadNTPAction::class,
            ],
        ];

        // Sentry
        $tables[] = [
            'keys' => [
                PbxSettings::SEND_METRICS,
            ],
            'actions' => [
                ReloadSentryAction::class,
            ],
        ];

        // Default description texts
        $tables[] = [
            'keys' => [
                PbxSettings::WEB_ADMIN_PASSWORD,
            ],
            'actions' => [
                ReloadCloudDescriptionAction::class,
            ],
        ];

        // Recording settings for WorkerCallEvents
        $tables[] = [
            'keys' => [
                PbxSettings::PBX_RECORD_CALLS_INNER,
                PbxSettings::PBX_RECORD_CALLS,
                PbxSettings::PBX_SPLIT_AUDIO_THREAD,
            ],
            'actions' => [
                ReloadRecordingSettingsAction::class,
            ],
        ];

        return $tables;
    }
}