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

namespace MikoPBX\Common\Models\PBXSettings;

use MikoPBX\Common\Models\PbxSettings;

trait PbxSettingsDefaultValuesTrait
{
    /**
     * Prepares default values for PbxSettings keys
     *
     * @return array default values
     */
    public static function getDefaultArrayValues(): array
    {
        return [
            PbxSettings::PBX_NAME => 'PBX system',
            PbxSettings::VIRTUAL_HARDWARE_TYPE => 'BARE METAL',
            PbxSettings::PBX_DESCRIPTION => '',
            PbxSettings::RESTART_EVERY_NIGHT => '0',
            PbxSettings::SIP_PORT => '5060',
            PbxSettings::EXTERNAL_SIP_PORT => '5060',
            PbxSettings::TLS_PORT => '5061',
            PbxSettings::EXTERNAL_TLS_PORT => '5061',
            PbxSettings::SIP_DEFAULT_EXPIRY => '120',
            PbxSettings::SIP_MIN_EXPIRY => '60',
            PbxSettings::SIP_AUTH_PREFIX => '',
            PbxSettings::SIP_MAX_EXPIRY => '3600',
            PbxSettings::RTP_PORT_FROM => '10000',
            PbxSettings::RTP_PORT_TO => '10200',
            PbxSettings::RTP_STUN_SERVER => '',
            PbxSettings::USE_WEB_RTC => '0',
            PbxSettings::IAX_PORT => '4569',
            PbxSettings::AMI_ENABLED => '1',
            PbxSettings::AMI_PORT => '5038',
            PbxSettings::AJAM_ENABLED => '1',
            PbxSettings::AJAM_PORT => '8088',
            PbxSettings::AJAM_PORT_TLS => '8089',
            PbxSettings::ARI_ENABLED => '0',
            PbxSettings::ARI_ALLOWED_ORIGINS => '*',
            PbxSettings::SSH_PORT => '22',
            PbxSettings::SSH_LOGIN => 'root',
            PbxSettings::SSH_PASSWORD => 'admin',
            PbxSettings::SSH_RSA_KEY => '',
            PbxSettings::SSH_ID_RSA => '',
            PbxSettings::SSH_ID_RSA_PUB => '',
            PbxSettings::SSH_DSS_KEY => '',
            PbxSettings::SSH_AUTHORIZED_KEYS => '',
            PbxSettings::SSH_ECDSA_KEY => '',
            PbxSettings::SSH_DISABLE_SSH_PASSWORD => '0',
            PbxSettings::SSH_LANGUAGE => 'en',
            PbxSettings::WEB_PORT => '80',
            PbxSettings::WEB_HTTPS_PORT => '443',
            PbxSettings::WEB_HTTPS_PUBLIC_KEY => '',
            PbxSettings::WEB_HTTPS_PRIVATE_KEY => '',
            PbxSettings::REDIRECT_TO_HTTPS => '1',
            PbxSettings::MAIL_SMTP_USE_TLS => 'none',
            PbxSettings::MAIL_SMTP_CERT_CHECK => '0',
            PbxSettings::MAIL_SMTP_HOST => '',
            PbxSettings::MAIL_SMTP_PORT => '25',
            PbxSettings::MAIL_SMTP_USERNAME => '',
            PbxSettings::MAIL_SMTP_PASSWORD => '',
            PbxSettings::MAIL_SMTP_FROM_USERNAME => 'PBX',
            PbxSettings::MAIL_SMTP_SENDER_ADDRESS => '',
            PbxSettings::MAIL_ENABLE_NOTIFICATIONS => '0',
            PbxSettings::MAIL_SMTP_AUTH_TYPE => 'password', // Default to password for existing installations
            PbxSettings::MAIL_OAUTH2_PROVIDER => '',
            PbxSettings::MAIL_OAUTH2_CLIENT_ID => '',
            PbxSettings::MAIL_OAUTH2_CLIENT_SECRET => '',
            PbxSettings::MAIL_OAUTH2_REFRESH_TOKEN => '',
            PbxSettings::MAIL_OAUTH2_ACCESS_TOKEN => '',
            PbxSettings::MAIL_OAUTH2_TOKEN_EXPIRES => '',
            PbxSettings::NTP_SERVER => '0.pool.ntp.org' . PHP_EOL . '1.pool.ntp.org' . PHP_EOL,
            PbxSettings::VOICEMAIL_NOTIFICATIONS_EMAIL => 'admin@mycompany.com',
            PbxSettings::VOICEMAIL_EXTENSION => '*001',
            PbxSettings::PBX_LANGUAGE => 'en-en',
            PbxSettings::PBX_INTERNAL_EXTENSION_LENGTH => '3',
            PbxSettings::PBX_RECORD_CALLS => '1',
            PbxSettings::PBX_RECORD_CALLS_INNER => '1',
            PbxSettings::PBX_SPLIT_AUDIO_THREAD => '0',
            PbxSettings::PBX_RECORD_ANNOUNCEMENT_IN => '',
            PbxSettings::PBX_RECORD_ANNOUNCEMENT_OUT => '',
            PbxSettings::PBX_RECORD_SAVE_PERIOD => '',
            PbxSettings::PBX_CALL_PARKING_EXT => '800',
            PbxSettings::PBX_CALL_PARKING_FEATURE => '*2',
            PbxSettings::PBX_CALL_PARKING_DURATION => '50',
            PbxSettings::PBX_CALL_PARKING_START_SLOT => '801',
            PbxSettings::PBX_CALL_PARKING_END_SLOT => '820',
            PbxSettings::PBX_FEATURE_ATTENDED_TRANSFER => '##',
            PbxSettings::PBX_FEATURE_BLIND_TRANSFER => '**',
            PbxSettings::PBX_FEATURE_PICKUP_EXTEN => '*8',
            PbxSettings::PBX_FEATURE_DIGIT_TIMEOUT => '2500',
            PbxSettings::PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT => '45',
            PbxSettings::PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT => '3',
            PbxSettings::PBX_FEATURE_ATXFER_ABORT => '*0',
            PbxSettings::PBX_FIREWALL_ENABLED => '0',
            PbxSettings::PBX_FAIL2BAN_ENABLED => '0',
            PbxSettings::PBX_FIREWALL_MAX_REQ => '0',
            PbxSettings::PBX_TIMEZONE => 'Europe/Moscow',
            PbxSettings::PBX_MANUAL_TIME_SETTINGS => '0',
            PbxSettings::PBX_VERSION => '2020.1.1',
            PbxSettings::PBX_ALLOW_GUEST_CALLS => '0',
            PbxSettings::WEB_ADMIN_LOGIN => 'admin',
            PbxSettings::WEB_ADMIN_PASSWORD => 'admin',
            PbxSettings::WEB_ADMIN_LANGUAGE => 'en',
            PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL => '',
            PbxSettings::SYSTEM_EMAIL_FOR_MISSED => '',
            PbxSettings::SEND_METRICS => '1',
            // Email notification toggles (all enabled by default)
            PbxSettings::SEND_LOGIN_NOTIFICATIONS => '0', // Disabled by default for privacy
            PbxSettings::SEND_MISSED_CALL_NOTIFICATIONS => '1',
            PbxSettings::SEND_VOICEMAIL_NOTIFICATIONS => '1',
            PbxSettings::SEND_SYSTEM_NOTIFICATIONS => '1',
            PbxSettings::CLOUD_INSTANCE_ID => '',
            PbxSettings::DISABLE_ALL_MODULES => '0',
            PbxSettings::PBX_LICENSE => '',
            PbxSettings::ENABLE_USE_NAT => '0',
            PbxSettings::AUTO_UPDATE_EXTERNAL_IP => '0',
            PbxSettings::EXTERNAL_SIP_HOST_NAME => '',
            PbxSettings::EXTERNAL_SIP_IP_ADDR => '',
            PbxSettings::PBX_SETTINGS_WAS_RESET => '0',
        ];
    }
}