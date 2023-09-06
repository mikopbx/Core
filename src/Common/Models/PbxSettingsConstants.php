<?php

namespace MikoPBX\Common\Models;

/**
 * Collection of constants PBXSettings keys
 * TODO:: May be change it to trait and include to PBXSettingsClass on PHP 8.2
 */
abstract class PbxSettingsConstants
{
    const WWW_ENCRYPTION_KEY = 'WWWEncryptionKey';


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
}