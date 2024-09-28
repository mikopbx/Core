<?php

namespace MikoPBX\Common\Models;

/**
 * Collection of constants representing keys for PBX settings.
 * Organized into sections for easier maintenance and readability.
 */
trait PbxSettingsConstants
{
    // General settings
    public const string PBX_NAME = 'Name';
    public const string PBX_DESCRIPTION = 'Description';
    public const string PBX_VERSION = 'PBXVersion';
    public const string PBX_LICENSE = 'PBXLicense';

    // Language and region settings
    public const string PBX_LANGUAGE = 'PBXLanguage';
    public const string WEB_ADMIN_LANGUAGE = 'WebAdminLanguage';
    public const string SSH_LANGUAGE ='SSHLanguage';
    public const string PBX_TIMEZONE = 'PBXTimezone';

    // Cloud and security settings
    public const string CLOUD_INSTANCE_ID = 'CloudInstanceId';
    public const string CLOUD_PROVISIONING = 'CloudProvisioning';
    public const string VIRTUAL_HARDWARE_TYPE = 'VirtualHardwareType';
    public const string DEFAULT_CLOUD_PASSWORD_DESCRIPTION = 'auth_DefaultCloudPasswordInstructions';

    // Web administration settings
    public const string WEB_PORT = 'WEBPort';
    public const string WEB_HTTPS_PORT = 'WEBHTTPSPort';
    public const string WEB_HTTPS_PUBLIC_KEY = 'WEBHTTPSPublicKey';
    public const string WEB_HTTPS_PRIVATE_KEY = 'WEBHTTPSPrivateKey';
    public const string WEB_ADMIN_LOGIN = 'WebAdminLogin';
    public const string WEB_ADMIN_PASSWORD = 'WebAdminPassword';
    public const string REDIRECT_TO_HTTPS = 'RedirectToHttps';

    // SSH settings
    public const string SSH_PORT = 'SSHPort';
    public const string SSH_LOGIN = 'SSHLogin';
    public const string SSH_PASSWORD = 'SSHPassword';
    public const string SSH_PASSWORD_HASH_FILE = 'SSHPasswordHashFile';
    public const string SSH_PASSWORD_HASH_STRING = 'SSHPasswordHashString';
    public const string SSH_DISABLE_SSH_PASSWORD = 'SSHDisablePasswordLogins';
    public const string SSH_AUTHORIZED_KEYS = 'SSHAuthorizedKeys';
    public const string SSH_RSA_KEY = 'SSHRsaKey';
    public const string SSH_DSS_KEY = 'SSHDssKey';
    public const string SSH_ECDSA_KEY = 'SSHecdsaKey';
    public const string SSH_ED25519_KEY = 'SSHed25519Key';

    // SIP and RTP settings
    public const string SIP_PORT = 'SIPPort';
    public const string TLS_PORT = 'TLS_PORT';
    public const string EXTERNAL_SIP_PORT='externalSIPPort';
    public const string EXTERNAL_TLS_PORT='externalTLSPort';
    public const string SIP_DEFAULT_EXPIRY = 'SIPDefaultExpiry';
    public const string SIP_MIN_EXPIRY = 'SIPMinExpiry';
    public const string SIP_MAX_EXPIRY = 'SIPMaxExpiry';
    public const string RTP_PORT_FROM = 'RTPPortFrom';
    public const string RTP_PORT_TO = 'RTPPortTo';
    public const string RTP_STUN_SERVER = 'RTPStunServer';
    public const string USE_WEB_RTC = 'UseWebRTC';

    // IAX settings
    public const string IAX_PORT = 'IAXPort';

    // AMI and AJAM settings
    public const string AMI_ENABLED = 'AMIEnabled';
    public const string AMI_PORT = 'AMIPort';
    public const string AJAM_ENABLED = 'AJAMEnabled';
    public const string AJAM_PORT = 'AJAMPort';
    public const string AJAM_PORT_TLS = 'AJAMPortTLS';

    // Email and notifications settings
    public const string MAIL_SMTP_USE_TLS = 'MailSMTPUseTLS';
    public const string MAIL_SMTP_CERT_CHECK = 'MailSMTPCertCheck';
    public const string MAIL_SMTP_HOST = 'MailSMTPHost';
    public const string MAIL_SMTP_PORT = 'MailSMTPPort';
    public const string MAIL_SMTP_USERNAME = 'MailSMTPUsername';
    public const string MAIL_SMTP_PASSWORD = 'MailSMTPPassword';
    public const string MAIL_SMTP_FROM_USERNAME = 'MailSMTPFromUsername';
    public const string MAIL_SMTP_SENDER_ADDRESS = 'MailSMTPSenderAddress';
    public const string MAIL_ENABLE_NOTIFICATIONS = 'MailEnableNotifications';
    public const string MAIL_TPL_MISSED_CALL_SUBJECT = 'MailTplMissedCallSubject';
    public const string MAIL_TPL_MISSED_CALL_BODY = 'MailTplMissedCallBody';
    public const string MAIL_TPL_MISSED_CALL_FOOTER = 'MailTplMissedCallFooter';
    public const string MAIL_TPL_VOICEMAIL_SUBJECT = 'MailTplVoicemailSubject';
    public const string MAIL_TPL_VOICEMAIL_BODY = 'MailTplVoicemailBody';
    public const string MAIL_TPL_VOICEMAIL_FOOTER = 'MailTplVoicemailFooter';
    public const string SYSTEM_NOTIFICATIONS_EMAIL = 'SystemNotificationsEmail';
    public const string SYSTEM_EMAIL_FOR_MISSED = 'SystemEmailForMissed';

    // Voicemail settings
    public const string VOICEMAIL_NOTIFICATIONS_EMAIL = 'VoicemailNotificationsEmail';
    public const string VOICEMAIL_EXTENSION = 'VoicemailExten';

    // PBX feature settings
    public const string PBX_FEATURE_ATTENDED_TRANSFER = 'PBXFeatureAttendedTransfer';
    public const string PBX_FEATURE_BLIND_TRANSFER = 'PBXFeatureBlindTransfer';
    public const string PBX_FEATURE_PICKUP_EXTEN = 'PBXFeaturePickupExten';
    public const string PBX_FEATURE_DIGIT_TIMEOUT = 'PBXFeatureDigitTimeout';
    public const string PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT = 'PBXFeatureAtxferNoAnswerTimeout';
    public const string PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT = 'PBXFeatureTransferDigitTimeout';
    public const string PBX_INTERNAL_EXTENSION_LENGTH = 'PBXInternalExtensionLength';

    // PARKING constants
    public const string PBX_CALL_PARKING_EXT = 'PBXCallParkingExt';
    public const string PBX_CALL_PARKING_FEATURE = 'PBXCallParkingFeature';
    public const string PBX_CALL_PARKING_DURATION = 'PBXCallParkingDuration';
    public const string PBX_CALL_PARKING_START_SLOT = 'PBXCallParkingStartSlot';
    public const string PBX_CALL_PARKING_END_SLOT = 'PBXCallParkingEndSlot';

    // PBX call recording settings
    public const string PBX_RECORD_CALLS = 'PBXRecordCalls';
    public const string PBX_RECORD_CALLS_INNER = 'PBXRecordCallsInner';
    public const string PBX_RECORD_SAVE_PERIOD = 'PBXRecordSavePeriod';
    public const string PBX_SPLIT_AUDIO_THREAD = 'PBXSplitAudioThread';
    public const string PBX_RECORD_ANNOUNCEMENT_IN = 'PBXRecordAnnouncementIn';
    public const string PBX_RECORD_ANNOUNCEMENT_OUT = 'PBXRecordAnnouncementOut';

    // Firewall settings
    public const string PBX_FIREWALL_ENABLED = 'PBXFirewallEnabled';
    public const string PBX_FAIL2BAN_ENABLED = 'PBXFail2BanEnabled';
    public const string PBX_ALLOW_GUEST_CALLS = 'PBXAllowGuestCalls';

    // Miscellaneous settings
    public const string RESTART_EVERY_NIGHT = 'RestartEveryNight';
    public const string PBX_MANUAL_TIME_SETTINGS='PBXManualTimeSettings';
    public const string SEND_METRICS = 'SendMetrics';
    public const string DISABLE_ALL_MODULES = 'DisableAllModules'; // Disable all modules if it set to '1'
    public const string NTP_SERVER = 'NTPServer';
    public const string WWW_ENCRYPTION_KEY = 'WWWEncryptionKey';

    // Service PORTS settings from /etc/inc/mikopbx-settings.json (For Docker containers)
    public const string BEANSTALK_PORT = 'beanstalk';
    public const string REDIS_PORT = 'redis';
    public const string GNATS_PORT = 'gnats';
    public const string GNATS_HTTP_PORT = 'gnats-http';

    // Service constants for Docker containers
    public const string ENABLE_USE_NAT='enableUseNat';
    public const string EXTERNAL_SIP_HOST_NAME='ExternalSipHostName';
    public const string EXTERNAL_SIP_IP_ADDR='ExternalSipIpAddr';
    public const string AUTO_UPDATE_EXTERNAL_IP = 'autoUpdateExternalIp';

}