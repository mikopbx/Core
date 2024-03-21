<?php

namespace MikoPBX\Common\Models;

/**
 * Collection of constants PBXSettings keys
 * TODO:: May be change it to trait and include to PBXSettingsClass on PHP 8.2
 */
abstract class PbxSettingsConstants
{
    // Common
    const WWW_ENCRYPTION_KEY = 'WWWEncryptionKey';
    const CLOUD_INSTANCE_ID = 'CloudInstanceId';
    const WEB_ADMIN_LANGUAGE = 'WebAdminLanguage';
    const SSH_LANGUAGE ='SSHLanguage';


    // WWW constants
    const WEB_PORT = 'WEBPort';
    const WEB_ADMIN_LOGIN = 'WebAdminLogin';
    const WEB_ADMIN_PASSWORD = 'WebAdminPassword';

    // SSH constants
    const SSH_PASSWORD = 'SSHPassword';
    const SSH_PASSWORD_HASH_FILE = 'SSHPasswordHashFile';
    const SSH_PASSWORD_HASH_STRING = 'SSHPasswordHashString';
    const SSH_DISABLE_SSH_PASSWORD = 'SSHDisablePasswordLogins';
    const SSH_AUTHORIZED_KEYS = 'SSHAuthorizedKeys';
    const SSH_PORT = 'SSHPort';

    // PARKING constants
    const PBX_CALL_PARKING_EXT = 'PBXCallParkingExt';
    const PBX_CALL_PARKING_FEATURE = 'PBXCallParkingFeature';
    const PBX_CALL_PARKING_DURATION = 'PBXCallParkingDuration';
    const PBX_CALL_PARKING_START_SLOT = 'PBXCallParkingStartSlot';
    const PBX_CALL_PARKING_END_SLOT = 'PBXCallParkingEndSlot';

    // Records settings
    const PBX_RECORD_SAVE_PERIOD = 'PBXRecordSavePeriod';

    // External modules
    const DISABLE_ALL_MODULES = 'DisableAllModules'; // Disable all modules if it set to '1'



    // General PBX settings
    const PBX_NAME = 'Name';
    const VIRTUAL_HARDWARE_TYPE = 'VirtualHardwareType';
    const PBX_DESCRIPTION = 'Description';
    const RESTART_EVERY_NIGHT = 'RestartEveryNight';
    const PBX_MANUAL_TIME_SETTINGS='PBXManualTimeSettings';

    // SIP settings
    const SIP_PORT = 'SIPPort';
    const TLS_PORT = 'TLS_PORT';
    const SIP_DEFAULT_EXPIRY = 'SIPDefaultExpiry';
    const SIP_MIN_EXPIRY = 'SIPMinExpiry';
    const SIP_MAX_EXPIRY = 'SIPMaxExpiry';

    // RTP settings
    const RTP_PORT_FROM = 'RTPPortFrom';
    const RTP_PORT_TO = 'RTPPortTo';
    const RTP_STUN_SERVER = 'RTPStunServer';

    // WebRTC
    const USE_WEB_RTC = 'UseWebRTC';

    // IAX settings
    const IAX_PORT = 'IAXPort';

    // AMI and AJAM settings
    const AMI_ENABLED = 'AMIEnabled';
    const AMI_PORT = 'AMIPort';
    const AJAM_ENABLED = 'AJAMEnabled';
    const AJAM_PORT = 'AJAMPort';
    const AJAM_PORT_TLS = 'AJAMPortTLS';

    // SSH keys
    const SSH_RSA_KEY = 'SSHRsaKey';
    const SSH_DSS_KEY = 'SSHDssKey';
    const SSH_ECDSA_KEY = 'SSHecdsaKey';

    // Web server settings
    const WEB_HTTPS_PORT = 'WEBHTTPSPort';
    const WEB_HTTPS_PUBLIC_KEY = 'WEBHTTPSPublicKey';
    const WEB_HTTPS_PRIVATE_KEY = 'WEBHTTPSPrivateKey';
    const REDIRECT_TO_HTTPS = 'RedirectToHttps';

    // Email settings
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

    // NTP settings
    const NTP_SERVER = 'NTPServer';

    // Voicemail settings
    const VOICEMAIL_NOTIFICATIONS_EMAIL = 'VoicemailNotificationsEmail';
    const VOICEMAIL_EXTENSION = 'VoicemailExten';

    // PBX system settings
    const PBX_LANGUAGE = 'PBXLanguage';
    const PBX_INTERNAL_EXTENSION_LENGTH = 'PBXInternalExtensionLength';
    const PBX_RECORD_CALLS = 'PBXRecordCalls';
    const PBX_RECORD_CALLS_INNER = 'PBXRecordCallsInner';
    const PBX_SPLIT_AUDIO_THREAD = 'PBXSplitAudioThread';
    const PBX_RECORD_ANNOUNCEMENT_IN = 'PBXRecordAnnouncementIn';
    const PBX_RECORD_ANNOUNCEMENT_OUT = 'PBXRecordAnnouncementOut';
    const PBX_FEATURE_ATTENDED_TRANSFER = 'PBXFeatureAttendedTransfer';
    const PBX_FEATURE_BLIND_TRANSFER = 'PBXFeatureBlindTransfer';
    const PBX_FEATURE_PICKUP_EXTEN = 'PBXFeaturePickupExten';
    const PBX_FEATURE_DIGIT_TIMEOUT = 'PBXFeatureDigitTimeout';
    const PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT = 'PBXFeatureAtxferNoAnswerTimeout';
    const PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT = 'PBXFeatureTransferDigitTimeout';

    // Firewall settings
    const PBX_FIREWALL_ENABLED = 'PBXFirewallEnabled';
    const PBX_FAIL2BAN_ENABLED = 'PBXFail2BanEnabled';

    // Timezone
    const PBX_TIMEZONE = 'PBXTimezone';


    // Version and misc settings
    const PBX_VERSION = 'PBXVersion';
    const PBX_ALLOW_GUEST_CALLS = 'PBXAllowGuestCalls';


    // Email notification settings
    const SYSTEM_NOTIFICATIONS_EMAIL = 'SystemNotificationsEmail';
    const SYSTEM_EMAIL_FOR_MISSED = 'SystemEmailForMissed';

    // Metrics and analytics
    const SEND_METRICS = 'SendMetrics';


}