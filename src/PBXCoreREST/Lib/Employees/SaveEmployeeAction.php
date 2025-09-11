<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\Employees;

use MikoPBX\Common\Models\ExtensionForwardingRights;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\ExternalPhones;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;
use MikoPBX\Common\Providers\MainDatabaseProvider;
use MikoPBX\Common\Providers\ModelsMetadataProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Services\PasswordService;
use Phalcon\Di\Di;

/**
 * Class SaveEmployeeAction
 * Provides methods to save employee records with associated entities.
 * This is the main service for persisting employee data including Users, Extensions, SIP, and related entities.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Employees
 */
class SaveEmployeeAction extends AbstractSaveRecordAction
{
    /**
     * Saves a record with associated entities.
     *
     * @param array $data Data to be saved.
     * @return PBXApiResult Result of the save operation.
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // Prepare and sanitize data
            $sanitizedData = self::prepareData($data);
            
            // Validate data
            $isCreateOperation = empty($sanitizedData['id']);
            $validationErrors = self::validateEmployeeData($sanitizedData, $isCreateOperation);
            
            if (!empty($validationErrors)) {
                $res->messages['error'] = $validationErrors;
                return $res;
            }
            
            // Save all entities
            $userEntity = self::saveEntities($sanitizedData, $res);
            
            if ($res->success && $userEntity !== null) {
                $res = GetRecordAction::main($userEntity->id);
                $res->processor = __METHOD__;
            }
            
        } catch (\Exception $e) {
            // Handle save error using unified approach
            return self::handleError($e, $res);
        }
         
        return $res;
    }
    
    /**
     * Prepare and sanitize data for saving
     * 
     * @param array $data Raw input data
     * @return array Sanitized data
     * @throws \Exception If data validation fails
     */
    public static function prepareData(array $data): array
    {
        // Define sanitization rules
        $sanitizationRules = [
            'id' => 'int',
            'user_username' => 'string|sanitize|max:32',
            'user_email' => 'string|sanitize|max:32',
            'user_avatar' => 'string|sanitize',
            'number' => 'string|max:64',
            'sip_secret' => 'string|max:64',
            'sip_networkfilterid' => 'string|max:64|empty_to_null',
            'sip_enableRecording' => 'bool',
            'sip_dtmfmode' => 'string|max:20',
            'sip_transport' => 'string|max:20',
            'sip_manualattributes' => 'string|max:1024|empty_to_null',
            'mobile_number' => 'string|max:64',
            'mobile_dialstring' => 'string|max:64',
            'fwd_ringlength' => 'int',
            'fwd_forwarding' => 'string|max:64',
            'fwd_forwardingonbusy' => 'string|max:64',
            'fwd_forwardingonunavailable' => 'string|max:64',
            'enableRecording' => 'bool',
        ];
        
        // Text fields for unified processing
        $textFields = ['user_username'];
        
        // Sanitize only allowed fields
        $allowedData = array_intersect_key($data, $sanitizationRules);
        
        // Unified data sanitization using new approach - no HTML entity decoding
        $sanitizedData = self::sanitizeInputData($allowedData, $sanitizationRules, $textFields);

        // Sanitize routing destination fields
        $routingFields = [
            'fwd_forwarding',
            'fwd_forwardingonbusy',
            'fwd_forwardingonunavailable',
        ];
        $sanitizedData = self::sanitizeRoutingDestinations($sanitizedData, $routingFields, 20);
        
        return $sanitizedData;
    }
    
    /**
     * Save all related entities
     * 
     * @param array $sanitizedData Sanitized data to save
     * @param PBXApiResult $res Result object to update
     * @return \MikoPBX\Common\Models\Users|null Saved user entity or null on failure
     */
    private static function saveEntities(array $sanitizedData, PBXApiResult &$res): ?Users
    {
        $di = Di::getDefault();
        $db = $di->get(MainDatabaseProvider::SERVICE_NAME);
        $db->begin();
        
        try {
            // Save user entity
            list($userEntity, $res->success) = self::saveUser($sanitizedData);
            if (!$res->success) {
                // Handle errors and rollback
                $res->messages['error'][] = $userEntity->getMessages();
                $db->rollback();
                return null;
            } else {
                $sanitizedData['id'] = $userEntity->id;
            }

            // Save extension entity
            list($extension, $res->success) = self::saveExtension($sanitizedData, false);
            if (!$res->success) {
                // Handle errors and rollback
                $res->messages['error'] = array_merge($res->messages['error'] ?? [], $extension->getMessages());
                $db->rollback();
                return null;
            }

            // Save SIP entity
            list($sipEntity, $res->success) = self::saveSip($sanitizedData);
            if (!$res->success) {
                // Handle errors and rollback
                $res->messages['error'] = array_merge($res->messages['error'] ?? [], $sipEntity->getMessages());
                $db->rollback();
                return null;
            }

            // Save forwarding rights entity
            list($fwdEntity, $res->success) = self::saveForwardingRights($sanitizedData);
            if (!$res->success) {
                // Handle errors and rollback
                $res->messages['error'] = array_merge($res->messages['error'] ?? [], $fwdEntity->getMessages());
                $db->rollback();
                return null;
            }

            // Check mobile number presence and save related entities
            if (!empty($sanitizedData['mobile_number'])) {
                // Save mobile extension
                list($mobileExtension, $res->success) = self::saveExtension($sanitizedData, true);
                if (!$res->success) {
                    // Handle errors and rollback
                    $res->messages['error'] = array_merge($res->messages['error'] ?? [], $mobileExtension->getMessages());
                    $db->rollback();
                    return null;
                }

                // Save ExternalPhones for mobile number
                list($externalPhone, $res->success) = self::saveExternalPhones($sanitizedData);
                if (!$res->success) {
                    // Handle errors and rollback
                    $res->messages['error'] = array_merge($res->messages['error'] ?? [], $externalPhone->getMessages());
                    $db->rollback();
                    return null;
                }
            } else {
                // Delete mobile number if it was associated with the user
                list($deletedMobileNumber, $res->success) = self::deleteMobileNumber($sanitizedData);
                if (!$res->success) {
                    $res->messages['error'] = array_merge($res->messages['error'] ?? [], $deletedMobileNumber->getMessages());
                    $db->rollback();
                    return null;
                }
            }
            
            $db->commit();
            return $userEntity;
            
        } catch (\Exception $e) {
            $db->rollback();
            throw $e;
        }
    }

    /**
     * Save parameters to the Users table
     *
     * @param array $sanitizedData The data array containing the input data.
     * @return array An array containing the saved Users entity and the save result.
     */
    private static function saveUser(array $sanitizedData): array
    {
        $userEntity = Users::findFirstById($sanitizedData['id']??'');
        if ($userEntity === null) {
            $userEntity = new Users();
        }

        // Fill in user parameters
        $metaData = Di::getDefault()->get(ModelsMetadataProvider::SERVICE_NAME);
        foreach ($metaData->getAttributes($userEntity) as $name) {
            switch ($name) {
                case 'id':
                    // Skip saving the 'id' field
                    break;
                case 'language':
                    $userEntity->$name = PbxSettings::getValueByKey(PbxSettings::PBX_LANGUAGE);
                    break;
                case 'avatar':
                    // Special handling for avatar field:
                    // - If empty string: clear avatar (user clicked clear button)
                    // - If starts with 'data:image': new base64 image to save
                    // - If starts with '/' (URL path): unchanged, skip update
                    $propertyKey = 'user_avatar';
                    if (array_key_exists($propertyKey, $sanitizedData)) {
                        $avatarValue = $sanitizedData[$propertyKey];
                        
                        if ($avatarValue === '' || $avatarValue === null) {
                            // Empty value means clear the avatar
                            $userEntity->avatar = '';
                        } elseif (str_starts_with($avatarValue, 'data:image')) {
                            // New base64 image - save it
                            $userEntity->avatar = $avatarValue;
                        }
                        // If it's a URL (starts with '/'), don't update - keep existing avatar
                    }
                    break;
                default:
                    $propertyKey = 'user_' . $name;
                    if (array_key_exists($propertyKey, $sanitizedData)) {
                        $userEntity->$name = $sanitizedData[$propertyKey];
                    }
            }
        }

        $result = $userEntity->save();
        return [$userEntity, $result];
    }

    /**
     * Save the extension for a user.
     * @param array $sanitizedData The data array containing the input data.
     * @param bool $isMobile Flag indicating if it's a mobile extension.
     *
     * @return array An array containing the saved Extensions entity and the save result.
     */
    private static function saveExtension(array $sanitizedData, bool $isMobile = false): array
    {
        $parameters = [];
        $parameters['conditions'] = 'type=:type: AND is_general_user_number = "1" AND userid=:userid:';
        $parameters['bind']['type'] = $isMobile ? Extensions::TYPE_EXTERNAL : Extensions::TYPE_SIP;
        $parameters['bind']['userid'] = $sanitizedData['id'] ;

        $extension = Extensions::findFirst($parameters);
        if ($extension === null) {
            $extension = new Extensions();
            $extension->uniqid = Extensions::generateUniqueID();
            $extension->show_in_phonebook = '1';
            $extension->public_access = '1';
            $extension->is_general_user_number = '1';
        }
        $metaData = Di::getDefault()->get(ModelsMetadataProvider::SERVICE_NAME);
        foreach ($metaData->getAttributes($extension) as $name) {
            switch ($name) {
                case 'id':
                    // Skip saving the 'id' field
                    break;
                case 'type':
                    // Set the 'type' based on the value of $isMobile
                    $extension->$name = $isMobile ? Extensions::TYPE_EXTERNAL : Extensions::TYPE_SIP;
                    break;
                case 'callerid':
                    // Sanitize the caller ID based on 'user_username' on model before save function
                    $extension->$name = self::sanitizeCallerId($sanitizedData['user_username']);
                    break;
                case 'userid':
                    // Set 'userid' to the ID of the user entity
                    $extension->$name = $sanitizedData['id'];
                    break;
                case 'number':
                    // Set 'number' based on the value of mobile_number or number
                    $extension->$name = $isMobile ? $sanitizedData['mobile_number'] : $sanitizedData['number'];
                    break;
                case 'search_index':
                    // Generate search index for the extension
                    $extension->$name = self::generateSearchIndex($sanitizedData, $isMobile);
                    break;    
                default:
                    if (array_key_exists($name, $sanitizedData)) {
                        // Set other fields based on the values in $data
                        $extension->$name = $sanitizedData[$name];
                    }
            }
        }
        $result = $extension->save();
        return [$extension, $result];
    }

    /**
     * Save the SIP entity with the provided data.
     *
     * @param array $sanitizedData The data array containing the input data.
     * @return array An array containing the saved SIP entity and the save result.
     */
    private static function saveSip(array $sanitizedData): array
    {

        $sipExtension = Extensions::findFirst([
            'conditions' => 'type = :type: AND is_general_user_number = "1" AND userid = :userid:',
            'bind' => 
            [
                'type' => Extensions::TYPE_SIP,
                'userid' => $sanitizedData['id']
            ]
        ]);
        
        $sipEntity = $sipExtension?->Sip??null;

        if ($sipEntity === null) {
            $sipEntity = new Sip();
            $sipEntity->uniqid = Sip::generateUniqueID();
            $sipEntity->type = 'peer';
            $sipEntity->weakSecret = '0';
        }

        $metaData = Di::getDefault()->get(ModelsMetadataProvider::SERVICE_NAME);
        foreach ($metaData->getAttributes($sipEntity) as $name) {
            switch ($name) {
                case 'id':
                    // Skip saving the 'id' field
                    break;
                case 'uniqid':
                     // Skip saving the 'uniqid' field
                    break;
                case 'weakSecret':
                      // Skip saving the 'weakSecret' field
                    break;
                case 'networkfilterid':
                    if (array_key_exists('sip_networkfilterid', $sanitizedData) && $sanitizedData['sip_networkfilterid']=== 'none') {
                        $sipEntity->$name = null;
                    } else {
                        $sipEntity->$name = $sanitizedData['sip_networkfilterid']??'none';
                    }
                    break;
                case 'extension':
                    // Set 'extension' based on the value of number
                    $sipEntity->$name = $sanitizedData['number'];
                    break;
                case 'description':
                    // Set 'description' based on the value of user_username
                    $sipEntity->$name = $sanitizedData['user_username'];
                    break;
                case 'enableRecording':
                    // Convert boolean values to '1' or '0' for database fields that expect string
                    if (isset($sanitizedData['sip_enableRecording'])) {
                        $sipEntity->$name = $sanitizedData['sip_enableRecording'] ? '1' : '0';
                    }
                    break;    
                case 'manualattributes':
                    // Set 'manualattributes' using the value of sip_manualattributes
                    $sipEntity->setManualAttributes($sanitizedData['sip_manualattributes']??'');
                    break;
                default:
                    $propertyKey = 'sip_' . $name;
                    if (array_key_exists($propertyKey, $sanitizedData)) {
                        // Set other fields based on the other fields in $dataStructure
                        $sipEntity->$name = $sanitizedData[$propertyKey];
                    }
            }
        }

        $result = $sipEntity->save();
        return [$sipEntity, $result];
    }

    /**
     * Save the ExtensionForwardingRights entity with the provided data.
     *
     * @param array $sanitizedData The data array containing the input data.
     * @return array An array containing the saved ExtensionForwardingRights entity and the save result.
     */
    private static function saveForwardingRights(array $sanitizedData): array
    {

        $sipExtension = Extensions::findFirst([
            'conditions' => 'type = :type: AND is_general_user_number = "1" AND userid = :userid:',
            'bind' => 
            [
                'type' => Extensions::TYPE_SIP,
                'userid' => $sanitizedData['id']
            ]
        ]);
        $forwardingRight = $sipExtension?->ExtensionForwardingRights??null;

        if ($forwardingRight === null) {
            $forwardingRight = new ExtensionForwardingRights();
        }
        $metaData = Di::getDefault()->get(ModelsMetadataProvider::SERVICE_NAME);
        foreach ($metaData->getAttributes($forwardingRight) as $name) {
            switch ($name) {
                case 'id':
                    // Skip saving the 'id' field
                    break;
                case 'uniqid':
                     // Skip saving the 'uniqid' field
                    break;
                case 'extension':
                    // Set 'extension' based on the value of number
                    $forwardingRight->$name = $sanitizedData['number'];
                    break;
                case 'ringlength':
                    $forwardingRight->ringlength = 0;
                    if (!empty($sanitizedData['fwd_ringlength'])) {
                        $forwardingRight->ringlength = $sanitizedData['fwd_ringlength'];
                    } elseif (!empty($sanitizedData['fwd_forwarding'])) {
                        $forwardingRight->ringlength = 45;
                    }
                    break;
                default:
                    $propertyKey = 'fwd_' . $name;
                    if (array_key_exists($propertyKey, $sanitizedData)) {
                        // Set other fields based on the other fields in $dataStructure
                        $forwardingRight->$name = $sanitizedData[$propertyKey] === -1 ? '' : $sanitizedData[$propertyKey];
                    }
            }
        }
        $result = $forwardingRight->save();
        return [$forwardingRight, $result];
    }

    /**
     * Save parameters to the ExternalPhones table for a mobile number.
     *
     * @param array $sanitizedData The data array containing the input data.
     * @return array An array containing the saved ExternalPhones entity and the save result.
     */
    private static function saveExternalPhones(array $sanitizedData): array
    {
        $mobileExtension =  Extensions::findFirst([
            'conditions' => 'type = :type: AND is_general_user_number = "1" AND userid = :userid:',
            'bind' => 
            [
                'type' => Extensions::TYPE_EXTERNAL,
                'userid' => $sanitizedData['id']
            ]
        ]);

        $externalPhone = $mobileExtension?->ExternalPhones??null;
        if ($externalPhone === null) {
            $externalPhone = new ExternalPhones();
            $externalPhone->uniqid = ExternalPhones::generateUniqueID();
        }
        $metaData = Di::getDefault()->get(ModelsMetadataProvider::SERVICE_NAME);
        foreach ($metaData->getAttributes($externalPhone) as $name) {
            switch ($name) {
                case 'id':
                    // Skip saving the 'id' field
                    break;
                case 'uniqid':
                     // Skip saving the 'uniqid' field
                    break;
                case 'extension':
                    $externalPhone->$name = $sanitizedData['mobile_number']??'';
                    break;
                case 'description':
                    $externalPhone->$name = $sanitizedData['user_username']??'';
                    break;
                default:
                    $propertyKey = 'mobile_' . $name;
                    if (array_key_exists($propertyKey, $sanitizedData)) {
                        // Set other fields based on the other fields in $dataStructure
                        $externalPhone->$name = $sanitizedData[$propertyKey];
                    }
            }
        }

        $result = $externalPhone->save();
        return [$externalPhone, $result];
    }

    /**
     * Delete a mobile number associated with a user.
     *
     * @param array $sanitizedData The data array containing the input data.
     * @return array An array containing the deleted mobile number entity and the deletion result.
     */
    private static function deleteMobileNumber(array $sanitizedData): array
    {
        $mobileExtension = Extensions::findFirst([
            'conditions' => 'type = :type: AND is_general_user_number = "1" AND userid = :userid:',
            'bind' => 
            [
                'type' => Extensions::TYPE_EXTERNAL,
                'userid' => $sanitizedData['id']
            ]
        ]);

        $result = true;
        if ($mobileExtension !== null) {
            // Delete the mobile extension (will cascade delete ExternalPhones automatically)
            $result = $mobileExtension->delete();
        }

        return [$mobileExtension, $result];
    }

    /**
     * Sanitize the caller ID by removing invalid characters.
     * Allows letters (from all languages), numbers, spaces, and common phone symbols.
     *
     * @param string $callerId
     * @return string
     */
    private static function sanitizeCallerId(string $callerId): string
    {
        // The letter Ё is not displayed correctly on some devices
        $callerId = str_replace(['Ё','ё'], ['E', 'e'], $callerId);
        // Allow letters from any language, numbers, spaces, and common phone symbols.
        return preg_replace('/[^\p{L}\p{N}\s\+\-\.\@]/u', '', $callerId);
    }

    /**
     * Generate a search index for the extension.
     *
     * @param array $sanitizedData The data array containing the input data.
     * @param bool $isMobile Flag indicating if it's a mobile extension.
     * @return string The generated search index.
     */
    private static function generateSearchIndex(array $sanitizedData, bool $isMobile = false): string
    {
        // Collect data for the search index
        $username = mb_strtolower($sanitizedData['user_username']??'');
        $callerId = mb_strtolower(self::sanitizeCallerId($sanitizedData['user_username']??''));
        $email = mb_strtolower($sanitizedData['user_email']??'');
        $internalNumber = mb_strtolower($sanitizedData['number']??'');
        $mobileNumber = $isMobile ? mb_strtolower($sanitizedData['mobile_number']??'') : '';

        // Combine all fields into a single string
        return $username . ' ' . $callerId . ' ' . $email . ' ' . $internalNumber . ' ' . $mobileNumber;
    }

    /**
     * Validate employee data according to web interface rules.
     *
     * @param array $sanitizedData The sanitized input data
     * @param bool $isCreateOperation Whether this is a create (true) or update (false) operation
     * @return array Array of validation error messages
     */
    public static function validateEmployeeData(array $sanitizedData, bool $isCreateOperation): array
    {
        $validationErrors = [];

        // Validate user_username (required, non-empty)
        if (empty($sanitizedData['user_username'])) {
            $validationErrors[] = TranslationProvider::translate('ex_ValidateUsernameEmpty');
        }

        // Validate number (required, numeric, unique)
        if (empty($sanitizedData['number'])) {
            $validationErrors[] = TranslationProvider::translate('ex_ValidateNumberIsEmpty');
        } elseif (!preg_match('/^[0-9]+$/', $sanitizedData['number'])) {
            $validationErrors[] = TranslationProvider::translate('ex_ValidateExtensionNumber');
        } else {
            // Check uniqueness - skip for updates of the same record
            $existingExtension = Extensions::findFirst([
                'conditions' => 'number = :number: AND userid != :userid:',
                'bind' => [
                    'number' => $sanitizedData['number'],
                    'userid' => $sanitizedData['id'] ?? ''
                ]
            ]);
            if ($existingExtension) {
                $validationErrors[] = TranslationProvider::translate('ex_ValidateNumberIsDouble');
            }
        }

        // Validate sip_secret (required, min 5 chars, strength check) - only for create or when password is provided
        if ($isCreateOperation || !empty($sanitizedData['sip_secret'])) {
            if (empty($sanitizedData['sip_secret'])) {
                $validationErrors[] = TranslationProvider::translate('ex_ValidateSecretEmpty');
            } else {
                // Use PasswordService for comprehensive validation
                $passwordValidation = PasswordService::validate(
                    $sanitizedData['sip_secret'], 
                    PasswordService::CONTEXT_SIP,
                    ['minLength' => 5] // Use minimum 5 chars for SIP (lower than default 8)
                );
                
                if (!$passwordValidation['isValid']) {
                    // Map PasswordService messages to Extension-specific ones where possible
                    foreach ($passwordValidation['messages'] as $message) {
                        if (str_contains($message, 'too short')) {
                            $validationErrors[] = TranslationProvider::translate('ex_ValidateSecretWeak');
                        } elseif (str_contains($message, 'security requirements')) {
                            $validationErrors[] = TranslationProvider::translate('ex_ValidatePasswordTooWeak');
                        } else {
                            // Use original message from PasswordService
                            $validationErrors[] = $message;
                        }
                    }
                }
            }
        }

        // Validate user_email (optional, email format)
        if (!empty($sanitizedData['user_email']) && !filter_var($sanitizedData['user_email'], FILTER_VALIDATE_EMAIL)) {
            $validationErrors[] = TranslationProvider::translate('ex_ValidateEmailEmpty');
        }

        // Validate mobile_number (optional, unique, format)
        if (!empty($sanitizedData['mobile_number'])) {
            // Check uniqueness - skip for updates of the same record
            $existingMobile = Extensions::findFirst([
                'conditions' => 'number = :number: AND userid != :userid:',
                'bind' => [
                    'number' => $sanitizedData['mobile_number'],
                    'userid' => $sanitizedData['id'] ?? ''
                ]
            ]);
            if ($existingMobile) {
                $validationErrors[] = TranslationProvider::translate('ex_ValidateMobileNumberIsDouble');
            }
            
            // Basic mobile number format validation
            if (!preg_match('/^\+?[1-9]\d{1,14}$/', $sanitizedData['mobile_number'])) {
                $validationErrors[] = TranslationProvider::translate('ex_ValidateMobileIsNotCorrect');
            }
        }

        // Validate fwd_ringlength (3-180 if forwarding is set)
        if (!empty($sanitizedData['fwd_forwarding'])) {
            $ringLength = (int)($sanitizedData['fwd_ringlength'] ?? 0);
            if ($ringLength < 3 || $ringLength > 180) {
                $validationErrors[] = str_replace('{ruleValue}', '3-180', 
                    TranslationProvider::translate('ex_ValidateRingingBeforeForwardOutOfRange'));
            }
        }

        // Validate forwarding destinations (must be different from main number)
        $forwardingFields = ['fwd_forwarding', 'fwd_forwardingonbusy', 'fwd_forwardingonunavailable'];
        foreach ($forwardingFields as $field) {
            if (!empty($sanitizedData[$field]) && $sanitizedData[$field] === $sanitizedData['number']) {
                $validationErrors[] = TranslationProvider::translate('ex_ValidateForwardingToBeDifferent');
                break;
            }
        }

        return $validationErrors;
    }
}