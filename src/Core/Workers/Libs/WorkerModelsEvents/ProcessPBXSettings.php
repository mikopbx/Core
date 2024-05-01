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
                PbxSettingsConstants::PBX_LANGUAGE,
                PbxSettingsConstants::PBX_INTERNAL_EXTENSION_LENGTH,
                PbxSettingsConstants::PBX_FEATURE_ATTENDED_TRANSFER,
                PbxSettingsConstants::PBX_FEATURE_BLIND_TRANSFER,
                PbxSettingsConstants::PBX_FEATURE_DIGIT_TIMEOUT,
                PbxSettingsConstants::PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT,
                PbxSettingsConstants::PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT,
                PbxSettingsConstants::PBX_FEATURE_PICKUP_EXTEN,
            ],
            'actions' => [
                ReloadFeaturesAction::class,
                ReloadDialplanAction::class,
            ],
        ];

        // Parking settings
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::PBX_CALL_PARKING_EXT,
                PbxSettingsConstants::PBX_CALL_PARKING_START_SLOT,
                PbxSettingsConstants::PBX_CALL_PARKING_END_SLOT,
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
                PbxSettingsConstants::PBX_RECORD_CALLS,
                PbxSettingsConstants::PBX_RECORD_CALLS_INNER,
                PbxSettingsConstants::PBX_SPLIT_AUDIO_THREAD,
            ],
            'actions' => [
                ReloadDialplanAction::class,
            ],
        ];

        // CallRecordSettings / The period of storing conversation records
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::PBX_RECORD_SAVE_PERIOD,
            ],
            'actions' => [
                ReloadRecordSavePeriodAction::class,
            ],
        ];

        // AMIParameters
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::AMI_PORT,
                PbxSettingsConstants::AJAM_PORT,
                PbxSettingsConstants::AJAM_PORT_TLS,
            ],
            'actions' => [
                ReloadManagerAction::class,
            ],
        ];

        // IaxParameters
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::IAX_PORT,
            ],
            'actions' => [
                ReloadIAXAction::class,
            ],
        ];

        // Guest calls without authorization
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::PBX_ALLOW_GUEST_CALLS,
                PbxSettingsConstants::USE_WEB_RTC,
            ],
            'actions' => [
                ReloadPJSIPAction::class,
                ReloadDialplanAction::class,
            ],
        ];

        // SipParameters
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::SIP_PORT,
                PbxSettingsConstants::TLS_PORT,
                PbxSettingsConstants::SIP_DEFAULT_EXPIRY,
                PbxSettingsConstants::SIP_MIN_EXPIRY,
                PbxSettingsConstants::SIP_MAX_EXPIRY,
                PbxSettingsConstants::PBX_LANGUAGE,
            ],
            'actions' => [
                ReloadPJSIPAction::class,
            ],
        ];

        // RTPParameters
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::RTP_PORT_FROM,
                PbxSettingsConstants::RTP_PORT_TO,
                PbxSettingsConstants::RTP_STUN_SERVER,
            ],
            'actions' => [
                ReloadRTPAction::class,
            ],
        ];

        // SSHParameters
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::SSH_LOGIN,
                PbxSettingsConstants::SSH_PORT,
                PbxSettingsConstants::SSH_RSA_KEY,
                PbxSettingsConstants::SSH_DSS_KEY,
                PbxSettingsConstants::SSH_PASSWORD,
                PbxSettingsConstants::SSH_ECDSA_KEY,
                PbxSettingsConstants::SSH_AUTHORIZED_KEYS,
                PbxSettingsConstants::SSH_DISABLE_SSH_PASSWORD,
            ],
            'actions' => [
                ReloadSSHAction::class,
            ],
        ];

        // FirewallParameters
        $tables[] = [
            'keys' => [
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
            'actions' => [
                ReloadFirewallAction::class,
            ],
            'strPosKey' => 'FirewallSettings',
        ];

        // FirewallParameters
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::WEB_PORT,
                PbxSettingsConstants::WEB_HTTPS_PORT,
                PbxSettingsConstants::WEB_HTTPS_PUBLIC_KEY,
                PbxSettingsConstants::WEB_HTTPS_PRIVATE_KEY,
                PbxSettingsConstants::REDIRECT_TO_HTTPS,
            ],
            'actions' => [
                ReloadNginxAction::class,
            ],
        ];

        // CronParameters
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::RESTART_EVERY_NIGHT,
            ],
            'actions' => [
                ReloadCrondAction::class,
            ],
        ];

        // DialplanParameters
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::PBX_LANGUAGE,
                PbxSettingsConstants::PBX_RECORD_ANNOUNCEMENT_IN,
                PbxSettingsConstants::PBX_RECORD_ANNOUNCEMENT_OUT,
            ],
            'actions' => [
                ReloadDialplanAction::class,
            ],
        ];
        // DialplanParameters
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::PBX_LANGUAGE,
            ],
            'actions' => [
                RestartPBXCoreAction::class,
            ],
        ];

        // VoiceMailParameters
        $tables[] = [
            'keys' => [
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
            'actions' => [
                ReloadVoicemailAction::class,
            ],
        ];

        // VisualLanguageSettings
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::SSH_LANGUAGE,
                PbxSettingsConstants::WEB_ADMIN_LANGUAGE,
            ],
            'actions' => [
                ReloadRestAPIWorkerAction::class,
            ],
        ];

        // LicenseSettings
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::PBX_LICENSE,
            ],
            'actions' => [
                ReloadLicenseAction::class,
                ReloadNatsAction::class,
            ],
        ];

        // TimeZoneSettings
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::PBX_TIMEZONE,
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
                PbxSettingsConstants::PBX_MANUAL_TIME_SETTINGS,
                PbxSettingsConstants::NTP_SERVER,
                PbxSettingsConstants::PBX_TIMEZONE,
            ],
            'actions' => [
                ReloadNTPAction::class,
            ],
        ];

        // Sentry
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::SEND_METRICS,
            ],
            'actions' => [
                ReloadSentryAction::class,
            ],
        ];

        // Default description texts
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::WEB_ADMIN_PASSWORD,
            ],
            'actions' => [
                ReloadCloudDescriptionAction::class,
            ],
        ];

        // Recording settings for WorkerCallEvents
        $tables[] = [
            'keys' => [
                PbxSettingsConstants::PBX_RECORD_CALLS_INNER,
                PbxSettingsConstants::PBX_RECORD_CALLS,
                PbxSettingsConstants::PBX_SPLIT_AUDIO_THREAD,
            ],
            'actions' => [
                ReloadRecordingSettingsAction::class,
            ],
        ];

        return $tables;
    }
}