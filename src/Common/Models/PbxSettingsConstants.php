<?php

namespace MikoPBX\Common\Models;

/**
 * Collection of constants representing keys for PBX settings.
 * Organized into sections for easier maintenance and readability.
 * TODO:: May be change it to trait and include to PBXSettingsClass on PHP 8.2
 */
abstract class PbxSettingsConstants
{
    // General settings
    const PBX_NAME = 'Name';
    const PBX_DESCRIPTION = 'Description';
    const PBX_VERSION = 'PBXVersion';
    const PBX_LICENSE = 'PBXLicense';

    // Language and region settings
    const PBX_LANGUAGE = 'PBXLanguage';
    const WEB_ADMIN_LANGUAGE = 'WebAdminLanguage';
    const SSH_LANGUAGE ='SSHLanguage';
    const PBX_TIMEZONE = 'PBXTimezone';

    // Cloud and security settings
    const CLOUD_INSTANCE_ID = 'CloudInstanceId';
    const CLOUD_PROVISIONING = 'CloudProvisioning';
    const VIRTUAL_HARDWARE_TYPE = 'VirtualHardwareType';
    const DEFAULT_CLOUD_PASSWORD_DESCRIPTION = 'auth_DefaultCloudPasswordInstructions';

    // Web administration settings
    const WEB_PORT = 'WEBPort';
    const WEB_HTTPS_PORT = 'WEBHTTPSPort';
    const WEB_HTTPS_PUBLIC_KEY = 'WEBHTTPSPublicKey';
    const WEB_HTTPS_PRIVATE_KEY = 'WEBHTTPSPrivateKey';
    const WEB_ADMIN_LOGIN = 'WebAdminLogin';
    const WEB_ADMIN_PASSWORD = 'WebAdminPassword';
    const REDIRECT_TO_HTTPS = 'RedirectToHttps';

    // SSH settings
    const SSH_PORT = 'SSHPort';
    const SSH_LOGIN = 'SSHLogin';
    const SSH_PASSWORD = 'SSHPassword';
    const SSH_PASSWORD_HASH_FILE = 'SSHPasswordHashFile';
    const SSH_PASSWORD_HASH_STRING = 'SSHPasswordHashString';
    const SSH_DISABLE_SSH_PASSWORD = 'SSHDisablePasswordLogins';
    const SSH_AUTHORIZED_KEYS = 'SSHAuthorizedKeys';
    const SSH_RSA_KEY = 'SSHRsaKey';
    const SSH_DSS_KEY = 'SSHDssKey';
    const SSH_ECDSA_KEY = 'SSHecdsaKey';
    const SSH_ED25519_KEY = 'SSHed25519Key';

    // SIP and RTP settings
    const SIP_PORT = 'SIPPort';
    const TLS_PORT = 'TLS_PORT';
    const EXTERNAL_SIP_PORT='externalSIPPort';
    const EXTERNAL_TLS_PORT='externalTLSPort';
    const SIP_DEFAULT_EXPIRY = 'SIPDefaultExpiry';
    const SIP_MIN_EXPIRY = 'SIPMinExpiry';
    const SIP_MAX_EXPIRY = 'SIPMaxExpiry';
    const RTP_PORT_FROM = 'RTPPortFrom';
    const RTP_PORT_TO = 'RTPPortTo';
    const RTP_STUN_SERVER = 'RTPStunServer';
    const USE_WEB_RTC = 'UseWebRTC';

    // IAX settings
    const IAX_PORT = 'IAXPort';

    // AMI and AJAM settings
    const AMI_ENABLED = 'AMIEnabled';
    const AMI_PORT = 'AMIPort';
    const AJAM_ENABLED = 'AJAMEnabled';
    const AJAM_PORT = 'AJAMPort';
    const AJAM_PORT_TLS = 'AJAMPortTLS';

    // Email and notifications settings
    const MAIL_SMTP_USE_TLS = 'MailSMTPUseTLS';
    const MAIL_SMTP_CERT_CHECK = 'MailSMTPCertCheck';
    const MAIL_SMTP_HOST = 'MailSMTPHost';
    const MAIL_SMTP_PORT = 'MailSMTPPort';
    const MAIL_SMTP_USERNAME = 'MailSMTPUsername';
    const MAIL_SMTP_PASSWORD = 'MailSMTPPassword';
    const MAIL_SMTP_FROM_USERNAME = 'MailSMTPFromUsername';
    const MAIL_SMTP_SENDER_ADDRESS = 'MailSMTPSenderAddress';
    const MAIL_ENABLE_NOTIFICATIONS = 'MailEnableNotifications';
    const MAIL_TPL_MISSED_CALL_SUBJECT = 'MailTplMissedCallSubject';
    const MAIL_TPL_MISSED_CALL_BODY = 'MailTplMissedCallBody';
    const MAIL_TPL_MISSED_CALL_FOOTER = 'MailTplMissedCallFooter';
    const MAIL_TPL_VOICEMAIL_SUBJECT = 'MailTplVoicemailSubject';
    const MAIL_TPL_VOICEMAIL_BODY = 'MailTplVoicemailBody';
    const MAIL_TPL_VOICEMAIL_FOOTER = 'MailTplVoicemailFooter';
    const SYSTEM_NOTIFICATIONS_EMAIL = 'SystemNotificationsEmail';
    const SYSTEM_EMAIL_FOR_MISSED = 'SystemEmailForMissed';

    // Voicemail settings
    const VOICEMAIL_NOTIFICATIONS_EMAIL = 'VoicemailNotificationsEmail';
    const VOICEMAIL_EXTENSION = 'VoicemailExten';

    // PBX feature settings
    const PBX_FEATURE_ATTENDED_TRANSFER = 'PBXFeatureAttendedTransfer';
    const PBX_FEATURE_BLIND_TRANSFER = 'PBXFeatureBlindTransfer';
    const PBX_FEATURE_PICKUP_EXTEN = 'PBXFeaturePickupExten';
    const PBX_FEATURE_DIGIT_TIMEOUT = 'PBXFeatureDigitTimeout';
    const PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT = 'PBXFeatureAtxferNoAnswerTimeout';
    const PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT = 'PBXFeatureTransferDigitTimeout';
    const PBX_INTERNAL_EXTENSION_LENGTH = 'PBXInternalExtensionLength';

    // PARKING constants
    const PBX_CALL_PARKING_EXT = 'PBXCallParkingExt';
    const PBX_CALL_PARKING_FEATURE = 'PBXCallParkingFeature';
    const PBX_CALL_PARKING_DURATION = 'PBXCallParkingDuration';
    const PBX_CALL_PARKING_START_SLOT = 'PBXCallParkingStartSlot';
    const PBX_CALL_PARKING_END_SLOT = 'PBXCallParkingEndSlot';

    // PBX call recording settings
    const PBX_RECORD_CALLS = 'PBXRecordCalls';
    const PBX_RECORD_CALLS_INNER = 'PBXRecordCallsInner';
    const PBX_RECORD_SAVE_PERIOD = 'PBXRecordSavePeriod';
    const PBX_SPLIT_AUDIO_THREAD = 'PBXSplitAudioThread';
    const PBX_RECORD_ANNOUNCEMENT_IN = 'PBXRecordAnnouncementIn';
    const PBX_RECORD_ANNOUNCEMENT_OUT = 'PBXRecordAnnouncementOut';

    // Firewall settings
    const PBX_FIREWALL_ENABLED = 'PBXFirewallEnabled';
    const PBX_FAIL2BAN_ENABLED = 'PBXFail2BanEnabled';
    const PBX_ALLOW_GUEST_CALLS = 'PBXAllowGuestCalls';

    // Miscellaneous settings
    const RESTART_EVERY_NIGHT = 'RestartEveryNight';
    const PBX_MANUAL_TIME_SETTINGS='PBXManualTimeSettings';
    const SEND_METRICS = 'SendMetrics';
    const DISABLE_ALL_MODULES = 'DisableAllModules'; // Disable all modules if it set to '1'
    const NTP_SERVER = 'NTPServer';
    const WWW_ENCRYPTION_KEY = 'WWWEncryptionKey';

    // Service PORTS settings from /etc/inc/mikopbx-settings.json (For Docker containers)
    const BEANSTALK_PORT = 'beanstalk';
    const REDIS_PORT = 'redis';
    const GNATS_PORT = 'gnats';
    const GNATS_HTTP_PORT = 'gnats-http';

    // Service constants for Docker containers
    const ENABLE_USE_NAT='enableUseNat';
    const EXTERNAL_SIP_HOST_NAME='ExternalSipHostName';
    const EXTERNAL_SIP_IP_ADDR='ExternalSipIpAddr';
    const AUTO_UPDATE_EXTERNAL_IP = 'autoUpdateExternalIp';

}