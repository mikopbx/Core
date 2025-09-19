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

use MikoPBX\AdminCabinet\Forms\GeneralSettingsEditForm;
use MikoPBX\Common\Models\Codecs;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\PasswordService;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\Common\FieldTypeResolver;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * SaveSettingsAction - saves general settings with validation
 * 
 * Accepts key-value pairs for settings to update.
 * Preserves all critical functionality:
 * - Password validation and synchronization logic
 * - Port conflict detection  
 * - Parking extension management
 * - Transaction safety
 * - Dependencies between settings
 */
class SaveSettingsAction extends AbstractSaveRecordAction
{
    /**
     * Counter for actual database updates
     * @var int
     */
    private static int $actualUpdatesCount = 0;
    
    /**
     * List of updated fields for debugging
     * @var array
     */
    private static array $updatedFields = [];
    /**
     * Save general settings
     *
     * @param array $data Request data containing key-value pairs of settings to save
     * @return PBXApiResult Result with success status and messages
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);
        
        try {
            // Use data as is - expecting key-value pairs
            $settingsData = $data;
            // Password validation first - fail fast if passwords are weak
            $passwordCheckFail = self::validatePasswords($settingsData);
            if (!empty($passwordCheckFail)) {
                foreach ($passwordCheckFail as $settingsKey => $validationResult) {
                    // Add detailed error messages
                    foreach ($validationResult['messages'] as $message) {
                        $res->messages['error'][] = "{$settingsKey}: {$message}";
                    }
                    // Add suggestions as warnings
                    if (!empty($validationResult['suggestions'])) {
                        $res->messages['warning'][] = "{$settingsKey} suggestions: " . implode('; ', $validationResult['suggestions']);
                    }
                }
                return $res;
            }
            
            // Execute save operation in transaction
            $result = self::executeInTransaction(function() use ($settingsData) {
                
                // Update PBX settings with special handling for various field types
                $updateResult = self::updatePBXSettings($settingsData);
                if (!$updateResult['success']) {
                    throw new \Exception(implode(', ', $updateResult['messages']['error'] ?? []));
                }
                
                // Update codecs if codec data is present
                if (self::hasCodecData($settingsData)) {
                    $codecResult = self::updateCodecs($settingsData);
                    if (!$codecResult['success']) {
                        throw new \Exception(implode(', ', $codecResult['messages']['error'] ?? []));
                    }
                }
                
                // Update parking extensions if parking settings changed
                if (self::parkingSettingsChanged($settingsData)) {
                    $parkingResult = self::updateParkingExtensions($settingsData);
                    if (!$parkingResult['success']) {
                        throw new \Exception(implode(', ', $parkingResult['messages']['error'] ?? []));
                    }
                }
                
                return true;
            });
            
            $res->success = $result;
            if ($result) {
                // Count only the actual updated settings, not all sent fields
                $updatedCount = self::$actualUpdatesCount ?? 0;
                if ($updatedCount === 0) {
                    $res->messages['info'][] = "No settings were changed";
                } elseif ($updatedCount === 1) {
                    $res->messages['success'][] = "1 setting was updated";
                } else {
                    $res->messages['success'][] = "{$updatedCount} settings were updated";
                }
                // Add debug info about what was actually processed
                $res->data['processed_fields'] = count($settingsData);
                $res->data['updated_fields'] = $updatedCount;
                // Include list of updated fields for debugging
                if (!empty(self::$updatedFields)) {
                    $res->data['updated_field_names'] = self::$updatedFields;
                }
            }
            
        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }
        
        return $res;
    }
    
    /**
     * Process SSH authorized keys data
     * Simply returns the string as-is since JavaScript handles all parsing and validation
     * 
     * @param mixed $keysData SSH keys data (should be a string from the hidden field)
     * @return string SSH keys string
     */
    private static function processAuthorizedKeys($keysData): string
    {
        // JavaScript now handles all parsing, validation, and formatting
        // The hidden field contains the properly formatted newline-separated keys
        if (is_string($keysData)) {
            return $keysData;
        }
        
        // Fallback for unexpected data types
        return '';
    }
    
    /**
     * Validate passwords using unified PasswordService
     * 
     * @param array $data Settings data containing passwords
     * @return array Array of password keys that failed validation with details
     */
    private static function validatePasswords(array $data): array
    {
        $passwordCheckFail = [];
        
        $checkPasswordFields = [
            PbxSettings::SSH_PASSWORD => PasswordService::CONTEXT_SSH,
            PbxSettings::WEB_ADMIN_PASSWORD => PasswordService::CONTEXT_WEB_ADMIN
        ];
        
        // If SSH is disabled, skip SSH password validation
        if (($data[PbxSettings::SSH_DISABLE_SSH_PASSWORD] ?? false) === true) {
            unset($checkPasswordFields[PbxSettings::SSH_PASSWORD]);
        }
        
        foreach ($checkPasswordFields as $field => $context) {
            if (!isset($data[$field]) || $data[$field] === GeneralSettingsEditForm::HIDDEN_PASSWORD) {
                continue;
            }
            
            $password = $data[$field];
            
            // Use unified password validator
            $validationResult = PasswordService::validate($password, $context);
            
            if (!$validationResult['isValid']) {
                $passwordCheckFail[$field] = $validationResult;
            }
        }
        
        return $passwordCheckFail;
    }
    
    /**
     * Update PBX settings with special handling for different field types
     * Migrated from GeneralSettingsController::updatePBXSettings()
     *
     * @param array $data Settings data
     * @return array Result with success status and messages
     */
    private static function updatePBXSettings(array $data): array
    {
        $messages = ['error' => []];
        $defaultPbxSettings = PbxSettings::getDefaultArrayValues();
        $di = Di::getDefault();
        
        // Reset update counter and field list
        self::$actualUpdatesCount = 0;
        self::$updatedFields = [];
        
        // Get security service for password hashing
        $security = $di->getShared('security');
        
        foreach ($defaultPbxSettings as $key => $defaultValue) {
            // Skip if this key is not in the request data
            if (!array_key_exists($key, $data)) {
                continue;
            }
            
            $newValue = null;
            
            switch ($key) {
                case PbxSettings::SSH_ID_RSA_PUB:
                    // Skip SSH public key, it's read-only
                    continue 2;
                    
                case PbxSettings::SSH_AUTHORIZED_KEYS:
                    // Process SSH authorized keys from array format if needed
                    $newValue = self::processAuthorizedKeys($data[$key]);
                    break;
                    
                case PbxSettings::SSH_PASSWORD:
                    if ($data[$key] !== GeneralSettingsEditForm::HIDDEN_PASSWORD) {
                        // User changed SSH password
                        $newValue = $data[$key];
                        PbxSettings::setValueByKey(PbxSettings::SSH_PASSWORD_HASH_STRING, md5($newValue), $messages['error']);
                    } elseif (
                        ($data[PbxSettings::WEB_ADMIN_PASSWORD] ?? GeneralSettingsEditForm::HIDDEN_PASSWORD) !== GeneralSettingsEditForm::HIDDEN_PASSWORD
                        && PbxSettings::getValueByKey(PbxSettings::SSH_PASSWORD) === $defaultPbxSettings[PbxSettings::SSH_PASSWORD]
                    ) {
                        // User changed Web password AND current SSH password equals default - sync them
                        $newValue = $data[PbxSettings::WEB_ADMIN_PASSWORD];
                        PbxSettings::setValueByKey(PbxSettings::SSH_PASSWORD_HASH_STRING, md5($newValue), $messages['error']);
                    } else {
                        // User did not change SSH password
                        continue 2;
                    }
                    break;
                    
                case PbxSettings::SEND_METRICS:
                    $newValue = FieldTypeResolver::convertForStorage($data[$key], PbxSettings::class, $key);
                    // Store in session as well
                    if ($di->has('session')) {
                        $session = $di->getShared('session');
                        $session->set(PbxSettings::SEND_METRICS, $newValue);
                    }
                    break;
                    
                case PbxSettings::PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT:
                    // Calculate transfer digit timeout from feature digit timeout
                    $featureTimeout = (int)($data[PbxSettings::PBX_FEATURE_DIGIT_TIMEOUT] ?? 1000);
                    $newValue = (string)ceil($featureTimeout / 1000);
                    break;
                    
                case PbxSettings::SIP_AUTH_PREFIX:
                    $newValue = trim($data[$key]);
                    break;
                    
                case PbxSettings::SSH_ID_RSA_PUB:
                    // This field is readonly in the form, skip it
                    continue 2;
                    
                case PbxSettings::WEB_ADMIN_PASSWORD:
                    if ($data[$key] !== GeneralSettingsEditForm::HIDDEN_PASSWORD) {
                        // User changed Web password
                        $newValue = $security->hash($data[$key]);
                    } elseif (
                        ($data[PbxSettings::SSH_PASSWORD] ?? GeneralSettingsEditForm::HIDDEN_PASSWORD) !== GeneralSettingsEditForm::HIDDEN_PASSWORD
                        && PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_PASSWORD) === $defaultPbxSettings[PbxSettings::WEB_ADMIN_PASSWORD]
                    ) {
                        // User changed SSH password AND current Web password equals default - sync them
                        $newValue = $security->hash($data[PbxSettings::SSH_PASSWORD]);
                    } else {
                        // User did not change Web password
                        continue 2;
                    }
                    break;
                    
                case PbxSettings::WEB_HTTPS_PRIVATE_KEY:
                    // Handle private key with password masking
                    if ($data[$key] === GeneralSettingsEditForm::HIDDEN_PASSWORD) {
                        // Private key wasn't changed, skip update
                        continue 2;
                    }
                    // User provided new private key or cleared it
                    $newValue = $data[$key];
                    break;

                case PbxSettings::PBX_RECORD_ANNOUNCEMENT_IN:
                case PbxSettings::PBX_RECORD_ANNOUNCEMENT_OUT:
                    // Handle sound file selection - convert -1 to empty string
                    $newValue = ($data[$key] === '-1' || $data[$key] === -1) ? '' : $data[$key];
                    break;

                default:
                    // Check if this is a boolean field and convert accordingly
                    if (FieldTypeResolver::isFieldType(PbxSettings::class, $key, 'boolean')) {
                        $newValue = FieldTypeResolver::convertForStorage($data[$key], PbxSettings::class, $key);
                    } else {
                        // For all other settings, use value as-is
                        $newValue = $data[$key];
                    }
            }
            
            // Save the setting only if it changed
            if ($newValue !== null) {
                $currentValue = PbxSettings::getValueByKey($key);
                // Only update if the value actually changed
                if ($currentValue !== (string)$newValue) {
                    PbxSettings::setValueByKey($key, (string)$newValue, $messages['error']);
                    self::$actualUpdatesCount++;
                    self::$updatedFields[] = $key;
                }
            }
        }
        
        // Reset cloud provision flag only if something was actually updated
        if (self::$actualUpdatesCount > 0) {
            PbxSettings::setValueByKey(PbxSettings::CLOUD_PROVISIONING, '1', $messages['error']);
        }
        
        $success = count($messages['error']) === 0;
        return ['success' => $success, 'messages' => $messages];
    }
    
    /**
     * Check if codec data is present in the request
     *
     * @param array $data Settings data
     * @return bool True if codec data is present
     */
    private static function hasCodecData(array $data): bool
    {
        // Check for codec data in either format:
        // 1. Nested array format: ["codecs" => [...]]
        // 2. Flat array format: ["codecs[0][name]" => "value"]
        
        if (isset($data['codecs']) && is_array($data['codecs'])) {
            return true;
        }
        
        foreach ($data as $key => $value) {
            if (strpos($key, 'codecs[') === 0) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Update codec priorities and enabled/disabled status
     *
     * @param array $data Settings data containing codec configurations
     * @return array Result with success status and messages
     */
    private static function updateCodecs(array $data): array
    {
        $messages = ['error' => []];
        
        // Parse codec data from flat array format
        $codecs = self::parseCodecData($data);
        
        if (empty($codecs)) {
            // No codec data to process
            return ['success' => true, 'messages' => []];
        }
        
        foreach ($codecs as $codecData) {
            $codecName = $codecData['name'] ?? '';
            
            if (empty($codecName)) {
                continue;
            }
            
            // Find codec by name
            $codecRecord = Codecs::findFirst([
                'conditions' => 'name = :name:',
                'bind' => ['name' => $codecName]
            ]);
            
            if (!$codecRecord) {
                $messages['error'][] = "Codec not found: {$codecName}";
                continue;
            }
            
            // Update priority and disabled status
            $newPriority = isset($codecData['priority']) ? (string)$codecData['priority'] : $codecRecord->priority;
            $newDisabled = isset($codecData['disabled']) ? ($codecData['disabled'] === 'true' || $codecData['disabled'] === true ? '1' : '0') : $codecRecord->disabled;
            
            // Only update if values changed
            if ($codecRecord->priority !== $newPriority || $codecRecord->disabled !== $newDisabled) {
                $codecRecord->priority = $newPriority;
                $codecRecord->disabled = $newDisabled;
                
                if (!$codecRecord->update()) {
                    $errors = [];
                    foreach ($codecRecord->getMessages() as $message) {
                        $errors[] = $message->getMessage();
                    }
                    $messages['error'][] = "Failed to update codec {$codecName}: " . implode(', ', $errors);
                } else {
                    self::$actualUpdatesCount++;
                    self::$updatedFields[] = "codec_{$codecName}";
                }
            }
        }
        
        $success = count($messages['error']) === 0;
        return ['success' => $success, 'messages' => $messages];
    }
    
    /**
     * Parse codec data from either nested or flat array format
     * Handles both:
     * 1. Nested: ["codecs" => [["name" => "alaw", ...], ...]]
     * 2. Flat: ["codecs[0][name]" => "alaw", ...]
     *
     * @param array $data Request data
     * @return array Structured codec data
     */
    private static function parseCodecData(array $data): array
    {
        // First check if we have nested array format
        if (isset($data['codecs']) && is_array($data['codecs'])) {
            return $data['codecs'];
        }
        
        // Otherwise, parse flat array format
        $codecs = [];
        
        foreach ($data as $key => $value) {
            // Match patterns like: codecs[0][name], codecs[0][priority], etc.
            if (preg_match('/^codecs\[(\d+)\]\[(\w+)\]$/', $key, $matches)) {
                $index = (int)$matches[1];
                $field = $matches[2];
                
                if (!isset($codecs[$index])) {
                    $codecs[$index] = [];
                }
                
                $codecs[$index][$field] = $value;
            }
        }
        
        // Re-index array to ensure sequential keys
        return array_values($codecs);
    }
    
    /**
     * Check if parking-related settings changed
     *
     * @param array $data Settings data
     * @return bool True if parking settings are present in the data
     */
    private static function parkingSettingsChanged(array $data): bool
    {
        $parkingKeys = [
            PbxSettings::PBX_CALL_PARKING_START_SLOT,
            PbxSettings::PBX_CALL_PARKING_END_SLOT,
            PbxSettings::PBX_CALL_PARKING_EXT,
        ];
        
        foreach ($parkingKeys as $key) {
            if (array_key_exists($key, $data)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Update parking extensions based on settings
     * Migrated from GeneralSettingsController::createParkingExtensions()
     *
     * @param array $data Settings data containing parking configuration
     * @return array Result with success status and messages
     */
    private static function updateParkingExtensions(array $data): array
    {
        $messages = ['error' => []];
        
        $startSlot = (int)($data[PbxSettings::PBX_CALL_PARKING_START_SLOT] ?? 0);
        $endSlot = (int)($data[PbxSettings::PBX_CALL_PARKING_END_SLOT] ?? 0);
        $reservedSlot = (int)($data[PbxSettings::PBX_CALL_PARKING_EXT] ?? 0);
        
        // Retrieve all current parking slots
        $currentSlots = Extensions::findByType(Extensions::TYPE_PARKING);
        
        // Create array of desired numbers
        $desiredNumbers = range($startSlot, $endSlot);
        $desiredNumbers[] = $reservedSlot;
        
        // Determine slots to delete
        $currentNumbers = [];
        foreach ($currentSlots as $slot) {
            if (!in_array($slot->number, $desiredNumbers)) {
                if (!$slot->delete()) {
                    // Just pass the model's validation messages directly
                    foreach ($slot->getMessages() as $message) {
                        $messages['error'][] = $message->getMessage();
                    }
                }
            } else {
                $currentNumbers[] = $slot->number;
            }
        }

        // Determine slots to create
        $numbersToCreate = array_diff($desiredNumbers, $currentNumbers);
        foreach ($numbersToCreate as $number) {
            $record = new Extensions();
            $record->type = Extensions::TYPE_PARKING;
            $record->number = (string)$number;
            $record->show_in_phonebook = '0';
            if (!$record->create()) {
                // Just pass the model's validation messages directly
                foreach ($record->getMessages() as $message) {
                    $messages['error'][] = $message->getMessage();
                }
            }
        }
        
        $success = count($messages['error']) === 0;
        return ['success' => $success, 'messages' => $messages];
    }
}