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
}