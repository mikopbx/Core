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

/**
 * Collection of constants representing keys for PBX settings.
 * Organized into sections for easier maintenance and readability.
 */
trait PbxSettingsConstantsTrait
{
    // General settings
    /** @FieldType('string') */
    public const string PBX_NAME = 'Name';
    /** @FieldType('string') */
    public const string PBX_DESCRIPTION = 'Description';
    /** @FieldType('string') */
    public const string PBX_VERSION = 'PBXVersion';
    /** @FieldType('string') */
    public const string PBX_LICENSE = 'PBXLicense';

    // Language and region settings
    /** @FieldType('string') */
    public const string PBX_LANGUAGE = 'PBXLanguage';
    /** @FieldType('string') */
    public const string WEB_ADMIN_LANGUAGE = 'WebAdminLanguage';
    /** @FieldType('string') */
    public const string SSH_LANGUAGE = 'SSHLanguage';
    /** @FieldType('string') */
    public const string PBX_TIMEZONE = 'PBXTimezone';

    // Cloud and security settings
    /** @FieldType('string') */
    public const string CLOUD_INSTANCE_ID = 'CloudInstanceId';
    /** @FieldType('string') */
    public const string CLOUD_PROVISIONING = 'CloudProvisioning';
    /** @FieldType('string') */
    public const string VIRTUAL_HARDWARE_TYPE = 'VirtualHardwareType';
    /** @FieldType('string') */
    public const string DEFAULT_CLOUD_PASSWORD_DESCRIPTION = 'auth_DefaultCloudPasswordInstructions';

    // Web administration settings
    /** @FieldType('integer') */
    public const string WEB_PORT = 'WEBPort';
    /** @FieldType('integer') */
    public const string WEB_HTTPS_PORT = 'WEBHTTPSPort';
    /** @FieldType('string') */
    public const string WEB_HTTPS_PUBLIC_KEY = 'WEBHTTPSPublicKey';
    /** @FieldType('string') */
    public const string WEB_HTTPS_PRIVATE_KEY = 'WEBHTTPSPrivateKey';
    /** @FieldType('string') */
    public const string WEB_ADMIN_LOGIN = 'WebAdminLogin';
    /** @FieldType('password') */
    public const string WEB_ADMIN_PASSWORD = 'WebAdminPassword';
    /** @FieldType('boolean') */
    public const string REDIRECT_TO_HTTPS = 'RedirectToHttps';

    // SSH settings
    /** @FieldType('integer') */
    public const string SSH_PORT = 'SSHPort';
    /** @FieldType('string') */
    public const string SSH_LOGIN = 'SSHLogin';
    /** @FieldType('password') */
    public const string SSH_PASSWORD = 'SSHPassword';
    /** @FieldType('string') */
    public const string SSH_PASSWORD_HASH_FILE = 'SSHPasswordHashFile';
    /** @FieldType('string') */
    public const string SSH_PASSWORD_HASH_STRING = 'SSHPasswordHashString';
    /** @FieldType('boolean') */
    public const string SSH_DISABLE_SSH_PASSWORD = 'SSHDisablePasswordLogins';
    /** @FieldType('string') */
    public const string SSH_AUTHORIZED_KEYS = 'SSHAuthorizedKeys';
    /** @FieldType('string') */
    public const string SSH_RSA_KEY = 'SSHRsaKey';
    /** @FieldType('string') */
    public const string SSH_DSS_KEY = 'SSHDssKey';
    /** @FieldType('string') */
    public const string SSH_ID_RSA = 'SSH_ID_RSA';
    /** @FieldType('string') */
    public const string SSH_ID_RSA_PUB = 'SSH_ID_RSA_PUB';
    /** @FieldType('string') */
    public const string SSH_ECDSA_KEY = 'SSHecdsaKey';
    /** @FieldType('string') */
    public const string SSH_ED25519_KEY = 'SSHed25519Key';

    // SIP and RTP settings
    /** @FieldType('integer') */
    public const string SIP_PORT = 'SIPPort';
    /** @FieldType('integer') */
    public const string TLS_PORT = 'TLS_PORT';
    /** @FieldType('integer') */
    public const string EXTERNAL_SIP_PORT = 'externalSIPPort';
    /** @FieldType('integer') */
    public const string EXTERNAL_TLS_PORT = 'externalTLSPort';
    /** @FieldType('integer') */
    public const string SIP_DEFAULT_EXPIRY = 'SIPDefaultExpiry';
    /** @FieldType('integer') */
    public const string SIP_MIN_EXPIRY = 'SIPMinExpiry';
    /** @FieldType('integer') */
    public const string SIP_MAX_EXPIRY = 'SIPMaxExpiry';
    /** @FieldType('string') */
    public const string SIP_AUTH_PREFIX = 'SIPAuthPrefix';
    /** @FieldType('string') */
    public const string SIP_REALM = 'SIPRealm';
    /** @FieldType('integer') */
    public const string RTP_PORT_FROM = 'RTPPortFrom';
    /** @FieldType('integer') */
    public const string RTP_PORT_TO = 'RTPPortTo';
    /** @FieldType('string') */
    public const string RTP_STUN_SERVER = 'RTPStunServer';
    /** @FieldType('boolean') */
    public const string USE_WEB_RTC = 'UseWebRTC';

    // IAX settings
    /** @FieldType('integer') */
    public const string IAX_PORT = 'IAXPort';

    // AMI and AJAM settings
    /** @FieldType('boolean') */
    public const string AMI_ENABLED = 'AMIEnabled';
    /** @FieldType('integer') */
    public const string AMI_PORT = 'AMIPort';
    /** @FieldType('boolean') */
    public const string AJAM_ENABLED = 'AJAMEnabled';
    /** @FieldType('integer') */
    public const string AJAM_PORT = 'AJAMPort';
    /** @FieldType('integer') */
    public const string AJAM_PORT_TLS = 'AJAMPortTLS';
    
    // ARI (Asterisk REST Interface) settings
    /** @FieldType('boolean') */
    public const string ARI_ENABLED = 'ARIEnabled';
    /** @FieldType('string') */
    public const string ARI_ALLOWED_ORIGINS = 'ARIAllowedOrigins';

    // Email and notifications settings
    /** @FieldType('string') Encryption type: 'none', 'tls', 'ssl' (backward compatible with '0'/'1' boolean values) */
    public const string MAIL_SMTP_USE_TLS = 'MailSMTPUseTLS';
    /** @FieldType('boolean') */
    public const string MAIL_SMTP_CERT_CHECK = 'MailSMTPCertCheck';
    /** @FieldType('string') */
    public const string MAIL_SMTP_HOST = 'MailSMTPHost';
    /** @FieldType('integer') */
    public const string MAIL_SMTP_PORT = 'MailSMTPPort';
    /** @FieldType('string') */
    public const string MAIL_SMTP_USERNAME = 'MailSMTPUsername';
    /** @FieldType('string') */
    public const string MAIL_SMTP_PASSWORD = 'MailSMTPPassword';
    /** @FieldType('string') */
    public const string MAIL_SMTP_FROM_USERNAME = 'MailSMTPFromUsername';
    /** @FieldType('string') */
    public const string MAIL_SMTP_SENDER_ADDRESS = 'MailSMTPSenderAddress';
    /** @FieldType('boolean') */
    public const string MAIL_ENABLE_NOTIFICATIONS = 'MailEnableNotifications';

    // OAuth2 authentication settings
    /** @FieldType('string') */
    public const string MAIL_SMTP_AUTH_TYPE = 'MailSMTPAuthType'; // password|oauth2
    /** @FieldType('string') */
    public const string MAIL_OAUTH2_PROVIDER = 'MailOAuth2Provider'; // google|microsoft|yandex
    /** @FieldType('string') */
    public const string MAIL_OAUTH2_CLIENT_ID = 'MailOAuth2ClientId';
    /** @FieldType('string') */
    public const string MAIL_OAUTH2_CLIENT_SECRET = 'MailOAuth2ClientSecret';
    /** @FieldType('string') */
    public const string MAIL_OAUTH2_REFRESH_TOKEN = 'MailOAuth2RefreshToken';
    /** @FieldType('string') */
    public const string MAIL_OAUTH2_ACCESS_TOKEN = 'MailOAuth2AccessToken';
    /** @FieldType('string') */
    public const string MAIL_OAUTH2_TOKEN_EXPIRES = 'MailOAuth2TokenExpires';

    /** @FieldType('string') */
    public const string SYSTEM_NOTIFICATIONS_EMAIL = 'SystemNotificationsEmail';
    /** @FieldType('string') */
    public const string SYSTEM_EMAIL_FOR_MISSED = 'SystemEmailForMissed';

    // Voicemail settings
    /** @FieldType('string') */
    public const string VOICEMAIL_NOTIFICATIONS_EMAIL = 'VoicemailNotificationsEmail';
    /** @FieldType('string') */
    public const string VOICEMAIL_EXTENSION = 'VoicemailExten';

    // PBX feature settings
    /** @FieldType('string') */
    public const string PBX_FEATURE_ATTENDED_TRANSFER = 'PBXFeatureAttendedTransfer';
    /** @FieldType('string') */
    public const string PBX_FEATURE_BLIND_TRANSFER = 'PBXFeatureBlindTransfer';
    /** @FieldType('string') */
    public const string PBX_FEATURE_PICKUP_EXTEN = 'PBXFeaturePickupExten';
    /** @FieldType('integer') */
    public const string PBX_FEATURE_DIGIT_TIMEOUT = 'PBXFeatureDigitTimeout';
    /** @FieldType('string') */
    public const string PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT = 'PBXFeatureAtxferNoAnswerTimeout';
    /** @FieldType('integer') */
    public const string PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT = 'PBXFeatureTransferDigitTimeout';
    /** @FieldType('integer') */
    public const string PBX_INTERNAL_EXTENSION_LENGTH = 'PBXInternalExtensionLength';
    /** @FieldType('string') */
    public const string PBX_FEATURE_ATXFER_ABORT = 'PBXFeatureAtxferAbort';

    // PARKING constants
    /** @FieldType('integer') */
    public const string PBX_CALL_PARKING_EXT = 'PBXCallParkingExt';
    /** @FieldType('string') */
    public const string PBX_CALL_PARKING_FEATURE = 'PBXCallParkingFeature';
    /** @FieldType('string') */
    public const string PBX_CALL_PARKING_DURATION = 'PBXCallParkingDuration';
    /** @FieldType('integer') */
    public const string PBX_CALL_PARKING_START_SLOT = 'PBXCallParkingStartSlot';
    /** @FieldType('integer') */
    public const string PBX_CALL_PARKING_END_SLOT = 'PBXCallParkingEndSlot';

    // PBX call recording settings
    /** @FieldType('boolean') */
    public const string PBX_RECORD_CALLS = 'PBXRecordCalls';
    /** @FieldType('boolean') */
    public const string PBX_RECORD_CALLS_INNER = 'PBXRecordCallsInner';
    /** @FieldType('integer') */
    public const string PBX_RECORD_SAVE_PERIOD = 'PBXRecordSavePeriod';
    /**
     * Local retention period when S3 storage enabled (in days)
     * After this period, recordings are uploaded to S3 and deleted locally
     * Must be less than PBX_RECORD_SAVE_PERIOD
     *
     * @FieldType('integer')
     */
    public const string PBX_RECORD_S3_LOCAL_DAYS = 'PBXRecordS3LocalDays';
    /** @FieldType('boolean') */
    public const string PBX_SPLIT_AUDIO_THREAD = 'PBXSplitAudioThread';
    /**
     * Delete source WAV files after conversion to WebM/Opus format
     * Default: true (delete to save disk space)
     * Set to false to keep original WAV files for archival purposes
     *
     * @FieldType('boolean')
     */
    public const string PBX_RECORD_DELETE_SOURCE_AFTER_CONVERT = 'PBXRecordDeleteSourceAfterConvert';
    /** @FieldType('string') */
    public const string PBX_RECORD_ANNOUNCEMENT_IN = 'PBXRecordAnnouncementIn';
    /** @FieldType('string') */
    public const string PBX_RECORD_ANNOUNCEMENT_OUT = 'PBXRecordAnnouncementOut';

    // Firewall settings
    /** @FieldType('boolean') */
    public const string PBX_FIREWALL_ENABLED = 'PBXFirewallEnabled';
    /** @FieldType('boolean') */
    public const string PBX_FAIL2BAN_ENABLED = 'PBXFail2BanEnabled';
    /** @FieldType('string') */
    public const string PBX_FIREWALL_MAX_REQ = 'PBXFirewallMaxReqSec';
    /** @FieldType('boolean') */
    public const string PBX_RATE_LIMIT_ENABLED = 'PBXRateLimitEnabled';
    /** @FieldType('boolean') */
    public const string PBX_ALLOW_GUEST_CALLS = 'PBXAllowGuestCalls';

    // Miscellaneous settings
    /** @FieldType('boolean') */
    public const string RESTART_EVERY_NIGHT = 'RestartEveryNight';
    /** @FieldType('boolean') */
    public const string PBX_MANUAL_TIME_SETTINGS = 'PBXManualTimeSettings';
    /** @FieldType('boolean') */
    public const string SEND_METRICS = 'SendMetrics';
    /** @FieldType('boolean') */
    public const string DISABLE_ALL_MODULES = 'DisableAllModules'; // Disable all modules if it set to '1'

    // Email notification toggles
    /** @FieldType('boolean') */
    public const string SEND_LOGIN_NOTIFICATIONS = 'SendLoginNotifications'; // Send email notification on admin panel login
    /** @FieldType('boolean') */
    public const string SEND_MISSED_CALL_NOTIFICATIONS = 'SendMissedCallNotifications'; // Send email notification for missed calls
    /** @FieldType('boolean') */
    public const string SEND_VOICEMAIL_NOTIFICATIONS = 'SendVoicemailNotifications'; // Send email notification for new voicemail messages
    /** @FieldType('boolean') */
    public const string SEND_SYSTEM_NOTIFICATIONS = 'SendSystemNotifications'; // Send system email notifications (errors, warnings, etc.)

    /** @FieldType('string') */
    public const string NTP_SERVER = 'NTPServer';
    /** @FieldType('string') */
    public const string JWT_SECRET = 'JWTSecret';
    /** @FieldType('string') */
    public const string WWW_ENCRYPTION_KEY = 'WWWEncryptionKey';

    // Service PORTS settings from /etc/inc/mikopbx-settings.json (For Docker containers)
    /** @FieldType('integer') */
    public const string BEANSTALK_PORT = 'beanstalk';
    /** @FieldType('integer') */
    public const string REDIS_PORT = 'redis';
    /** @FieldType('integer') */
    public const string GNATS_PORT = 'gnats';
    /** @FieldType('integer') */
    public const string GNATS_HTTP_PORT = 'gnats-http';

    // Service constants for Docker containers
    /** @FieldType('boolean') */
    public const string ENABLE_USE_NAT = 'enableUseNat';
    /** @FieldType('string') */
    public const string EXTERNAL_SIP_HOST_NAME = 'ExternalSipHostName';
    /** @FieldType('string') */
    public const string EXTERNAL_SIP_IP_ADDR = 'ExternalSipIpAddr';
    /** @FieldType('boolean') */
    public const string AUTO_UPDATE_EXTERNAL_IP = 'autoUpdateExternalIp';


    // Constants for worker actions
    /** @FieldType('boolean') */
    public const string PBX_SETTINGS_WAS_RESET = 'PBXSettingsWasReset';
}
