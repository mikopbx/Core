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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\GeneralSettings;

use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Core\System\SslCertificateService;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;
use MikoPBX\PBXCoreREST\Lib\Common\FieldTypeResolver;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * GetSettingsAction - retrieves general settings with optional filtering
 * 
 * Can retrieve:
 * - All settings when no key/keys specified
 * - Single setting when 'key' is provided (returns as key-value pair)
 * - Multiple specific settings when 'keys' array is provided
 * 
 * Returns settings with proper type conversion for API consumption:
 * - Boolean fields converted from "1"/"0" strings to true/false
 * - Integer fields converted from strings to integers
 * - Password fields masked for security
 */
class GetSettingsAction extends AbstractGetRecordAction
{
    /**
     * List of settings that should be exposed through the General Settings API
     * Settings not in this list are managed by other controllers or are system-only
     * 
     * @var array<string>
     */
    private const ALLOWED_SETTINGS = [
        // General settings shown in the form
        PbxSettings::PBX_NAME,
        PbxSettings::PBX_DESCRIPTION,
        PbxSettings::PBX_LANGUAGE,
        PbxSettings::PBX_INTERNAL_EXTENSION_LENGTH,
        PbxSettings::PBX_ALLOW_GUEST_CALLS,
        PbxSettings::RESTART_EVERY_NIGHT,
        PbxSettings::SEND_METRICS,
        
        // Web settings
        PbxSettings::WEB_PORT,
        PbxSettings::WEB_HTTPS_PORT,
        PbxSettings::WEB_HTTPS_PUBLIC_KEY,
        PbxSettings::WEB_HTTPS_PRIVATE_KEY,
        PbxSettings::REDIRECT_TO_HTTPS,
        PbxSettings::WEB_ADMIN_LOGIN,
        PbxSettings::WEB_ADMIN_PASSWORD,
        
        // SSH settings
        PbxSettings::SSH_PORT,
        PbxSettings::SSH_LOGIN,
        PbxSettings::SSH_PASSWORD,
        PbxSettings::SSH_DISABLE_SSH_PASSWORD,
        PbxSettings::SSH_AUTHORIZED_KEYS,
        PbxSettings::SSH_ID_RSA_PUB,
        PbxSettings::SSH_RSA_KEY,
        PbxSettings::SSH_DSS_KEY,
        PbxSettings::SSH_ECDSA_KEY,
        
        // SIP settings
        PbxSettings::SIP_PORT,
        PbxSettings::TLS_PORT,
        PbxSettings::RTP_PORT_FROM,
        PbxSettings::RTP_PORT_TO,
        PbxSettings::RTP_STUN_SERVER,
        PbxSettings::SIP_AUTH_PREFIX,
        PbxSettings::USE_WEB_RTC,
        PbxSettings::SIP_DEFAULT_EXPIRY,
        PbxSettings::SIP_MIN_EXPIRY,
        PbxSettings::SIP_MAX_EXPIRY,
        
        // Recording settings
        PbxSettings::PBX_RECORD_CALLS,
        PbxSettings::PBX_RECORD_CALLS_INNER,
        PbxSettings::PBX_SPLIT_AUDIO_THREAD,
        PbxSettings::PBX_RECORD_ANNOUNCEMENT_IN,
        PbxSettings::PBX_RECORD_ANNOUNCEMENT_OUT,
        
        // AMI/AJAM/ARI settings
        PbxSettings::AMI_ENABLED,
        PbxSettings::AMI_PORT,
        PbxSettings::AJAM_ENABLED,
        PbxSettings::AJAM_PORT,
        PbxSettings::AJAM_PORT_TLS,
        PbxSettings::ARI_ENABLED,
        PbxSettings::ARI_ALLOWED_ORIGINS,
        
        // Features settings
        PbxSettings::PBX_CALL_PARKING_EXT,
        PbxSettings::PBX_CALL_PARKING_START_SLOT,
        PbxSettings::PBX_CALL_PARKING_END_SLOT,
        PbxSettings::PBX_FEATURE_ATTENDED_TRANSFER,
        PbxSettings::PBX_FEATURE_BLIND_TRANSFER,
        PbxSettings::PBX_FEATURE_PICKUP_EXTEN,
        PbxSettings::PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT,
        PbxSettings::PBX_FEATURE_DIGIT_TIMEOUT,
        PbxSettings::PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT,
        
        // IAX settings (if shown in form)
        PbxSettings::IAX_PORT,
        
        // Hidden/internal settings that are still needed by the form
        PbxSettings::SSH_PASSWORD_HASH_STRING,
        PbxSettings::CLOUD_PROVISIONING,
    ];
    
    /**
     * Get general settings with optional filtering
     *
     * @param array<string, mixed> $data Request data with optional:
     *                                   - 'key' for single setting (returns {key: value})
     *                                   - 'keys' array for multiple specific settings
     *                                   - empty for all settings
     * @return PBXApiResult Result with settings data as key-value pairs
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);
        
        try {
            // Check if requesting single setting
            if (!empty($data['key'])) {
                return self::getSingleSetting($data['key']);
            }
            
            // Check if requesting multiple specific settings
            if (!empty($data['keys']) && is_array($data['keys'])) {
                return self::getMultipleSettings($data['keys']);
            }
            
            // Get all settings without cache to ensure fresh data
            // Cache has issues with data structure consistency
            $allSettings = PbxSettings::getAllPbxSettings(false);
            
            // Filter to only include allowed settings
            $settings = self::filterAllowedSettings($allSettings);
            
            // Convert database format to API format and mask passwords
            $formattedSettings = self::convertToApiFormat($settings);
            
            // Add sound file representations
            $formattedSettings = self::addSoundFileRepresentations($formattedSettings);
            
            // Get codecs information
            $codecs = self::getCodecs();
            
            // Check if passwords are default (for warning display)
            $passwordValidation = self::checkDefaultPasswords();
            
            // Return both settings and codecs
            $res->data = [
                'settings' => $formattedSettings,
                'codecs' => $codecs,
                'passwordValidation' => $passwordValidation
            ];
            $res->success = true;
            
        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }
        
        return $res;
    }
    
    /**
     * Get single setting value by key
     *
     * @param string $key Setting key
     * @return PBXApiResult Result with single key-value pair
     */
    private static function getSingleSetting(string $key): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);
        
        // Check if this setting is allowed to be exposed
        if (!in_array($key, self::ALLOWED_SETTINGS, true)) {
            $res->messages['error'][] = "Setting '{$key}' is not accessible through this API";
            return $res;
        }
        
        // Get setting value from database/cache
        $value = PbxSettings::getValueByKey($key);
        
        // Check if this is an unknown key
        if ($value === 'UNKNOWN KEY ADD IT TO DEFAULT VALUES') {
            $res->messages['error'][] = "Unknown setting key: {$key}";
            return $res;
        }
        
        // Special handling for SSH_ID_RSA_PUB - decode for display
        if ($key === PbxSettings::SSH_ID_RSA_PUB && !empty($value)) {
            $decoded = base64_decode($value, true);
            $convertedValue = $decoded !== false ? $decoded : $value;
        } else {
            // Convert to proper type
            $convertedValue = FieldTypeResolver::convertToApiFormat($value, PbxSettings::class, $key);
        }
        
        // Return as key-value pair (consistent with multiple settings format)
        $res->data = [$key => $convertedValue];
        $res->success = true;
        
        return $res;
    }
    
    /**
     * Get multiple specific settings by keys
     *
     * @param array<string> $keys Array of setting keys to retrieve
     * @return PBXApiResult Result with requested settings as key-value pairs
     */
    private static function getMultipleSettings(array $keys): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);
        
        $result = [];
        $unknownKeys = [];
        $deniedKeys = [];
        
        foreach ($keys as $key) {
            if (!is_string($key)) {
                continue;
            }
            
            // Check if this setting is allowed to be exposed
            if (!in_array($key, self::ALLOWED_SETTINGS, true)) {
                $deniedKeys[] = $key;
                continue;
            }
            
            $value = PbxSettings::getValueByKey($key);
            
            // Track unknown keys but don't fail the entire request
            if ($value === 'UNKNOWN KEY ADD IT TO DEFAULT VALUES') {
                $unknownKeys[] = $key;
                continue;
            }
            
            $result[$key] = FieldTypeResolver::convertToApiFormat($value, PbxSettings::class, $key);
        }
        
        // Add warning about denied keys if any
        if (!empty($deniedKeys)) {
            $res->messages['warning'][] = 'Settings not accessible through this API: ' . implode(', ', $deniedKeys);
        }
        
        // Add warning about unknown keys if any
        if (!empty($unknownKeys)) {
            $res->messages['warning'][] = 'Unknown setting keys: ' . implode(', ', $unknownKeys);
        }
        
        $res->data = $result;
        $res->success = true;
        
        return $res;
    }
    
    /**
     * Filter settings to only include allowed ones
     * 
     * @param array<string, string> $settings All settings from database
     * @return array<string, string> Filtered settings
     */
    private static function filterAllowedSettings(array $settings): array
    {
        $filtered = [];
        
        foreach (self::ALLOWED_SETTINGS as $key) {
            if (array_key_exists($key, $settings)) {
                $filtered[$key] = $settings[$key];
            }
        }
        
        return $filtered;
    }
    
    /**
     * Convert database format to API format
     * 
     * @param array<string, string> $settings Raw settings from database
     * @return array<string, mixed> Settings formatted for API response
     */
    private static function convertToApiFormat(array $settings): array
    {
        $result = [];
        
        foreach ($settings as $key => $value) {
            // Special handling for SSH_ID_RSA_PUB - decode for display like in the form
            // This field is readonly and needs to be displayed as plain text
            if ($key === PbxSettings::SSH_ID_RSA_PUB && !empty($value)) {
                $decoded = base64_decode($value, true);
                $result[$key] = $decoded !== false ? $decoded : $value;
                // JavaScript will handle truncation for display
            } elseif ($key === PbxSettings::SSH_AUTHORIZED_KEYS) {
                // Return SSH authorized keys as-is, JavaScript will handle parsing
                $result[$key] = $value;
            } elseif ($key === PbxSettings::WEB_HTTPS_PUBLIC_KEY) {
                // Return certificate with parsed info
                $result[$key] = $value;
                if (!empty($value)) {
                    $result[$key . '_info'] = SslCertificateService::parseCertificateInfo($value);
                }
            } elseif ($key === PbxSettings::WEB_HTTPS_PRIVATE_KEY) {
                // Use password masking for private key
                if (!empty($value)) {
                    $result[$key] = \MikoPBX\AdminCabinet\Forms\GeneralSettingsEditForm::HIDDEN_PASSWORD;
                } else {
                    $result[$key] = '';
                }
            } else {
                // Use FieldTypeResolver for all other conversions
                $result[$key] = FieldTypeResolver::convertToApiFormat($value, PbxSettings::class, $key);
            }
        }
        
        return $result;
    }
    
    /**
     * Add HTML representations for sound file fields
     * 
     * @param array<string, mixed> $settings Settings array
     * @return array<string, mixed> Settings with added sound file representations
     */
    private static function addSoundFileRepresentations(array $settings): array
    {
        // List of settings that reference sound files
        $soundFileFields = [
            PbxSettings::PBX_RECORD_ANNOUNCEMENT_IN,
            PbxSettings::PBX_RECORD_ANNOUNCEMENT_OUT,
        ];
        
        foreach ($soundFileFields as $field) {
            if (!empty($settings[$field])) {
                $soundFile = SoundFiles::findFirstById($settings[$field]);
                if ($soundFile !== null) {
                    // Add representation with _represent suffix (lowercase following standard naming convention)
                    $settings[$field . '_represent'] = $soundFile->getRepresent();
                }
            }
        }
        
        return $settings;
    }
    
    
    /**
     * Check if current passwords are default values
     * 
     * @return array<string, bool> Password validation flags
     */
    private static function checkDefaultPasswords(): array
    {
        $result = [
            'isDefaultWebPassword' => false,
            'isDefaultSSHPassword' => false
        ];
        
        try {
            // Get default values
            $defaults = PbxSettings::getDefaultArrayValues();
            
            // Get current password hashes from database
            $currentWebPasswordHash = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_PASSWORD);
            $currentSSHPasswordHash = PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD);
            
            // Check Web Admin password against default
            if (isset($defaults[PbxSettings::WEB_ADMIN_PASSWORD])) {
                $result['isDefaultWebPassword'] = ($currentWebPasswordHash === $defaults[PbxSettings::WEB_ADMIN_PASSWORD]);
            }
            
            // Check SSH password against default
            if (isset($defaults[PbxSettings::SSH_PASSWORD])) {
                $result['isDefaultSSHPassword'] = ($currentSSHPasswordHash === $defaults[PbxSettings::SSH_PASSWORD]);
            }
            
        } catch (\Exception $e) {
            // Log error but don't fail the whole request
            \MikoPBX\Core\System\Util::sysLogMsg(__METHOD__, "Failed to check default passwords: " . $e->getMessage());
        }
        
        return $result;
    }
    
    /**
     * Get codecs information for the settings
     * 
     * @return array<int, array<string, mixed>> Array of codec configurations
     */
    private static function getCodecs(): array
    {
        $result = [];
        
        // Get all codecs ordered by type and priority
        $codecs = Codecs::find([
            'order' => 'type, priority'
        ]);
        
        // Track sequential priority per codec type
        $audioPriority = 0;
        $videoPriority = 0;
        
        /** @var Codecs[] $codecs */
        foreach ($codecs as $codec) {
            // Assign sequential priority based on order in result set
            if ($codec->type === 'audio') {
                $priority = $audioPriority++;
            } else {
                $priority = $videoPriority++;
            }
            
            $result[] = [
                'name' => $codec->name,
                'type' => $codec->type,
                'priority' => $priority,
                'disabled' => $codec->disabled === '1',
                'description' => $codec->description
            ];
        }
        
        return $result;
    }
}