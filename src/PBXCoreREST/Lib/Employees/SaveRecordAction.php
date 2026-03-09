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

namespace MikoPBX\PBXCoreREST\Lib\Employees;

use MikoPBX\Common\Models\ExtensionForwardingRights;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\ExternalPhones;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\Common\AvatarHelper;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Core\System\PasswordService;
use Phalcon\Di\Di;

/**
 * ✨ REFERENCE IMPLEMENTATION: Employees Save Action
 *
 * This follows the canonical 7-phase pattern with multi-entity save.
 * Single Source of Truth pattern - all definitions in DataStructure::getParameterDefinitions()
 *
 * Processing Pipeline (7 Phases):
 * 1. SANITIZE: Clean user input (XSS, SQL injection prevention)
 * 2. VALIDATE REQUIRED: Check required fields (username, number, sip_secret)
 * 3. DETERMINE OPERATION: Detect CREATE vs UPDATE
 * 4. APPLY DEFAULTS: Add missing values (CREATE only!)
 * 5. VALIDATE SCHEMA: Check constraints + business rules (password strength, email, uniqueness)
 * 6. SAVE: Transaction with multi-entity save (Users + Extensions + Sip + ForwardingRights + ExternalPhones)
 * 7. BUILD RESPONSE: Format data using GetRecordAction
 *
 * Multi-Entity Save:
 * - Users: Main user record
 * - Extensions: SIP extension (internal number) + Mobile extension (external number)
 * - Sip: SIP configuration (password, transport, recording)
 * - ExtensionForwardingRights: Call forwarding settings
 * - ExternalPhones: Mobile phone configuration
 *
 * @package MikoPBX\PBXCoreREST\Lib\Employees
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save employee record with comprehensive validation and multi-entity save
     *
     * Handles CREATE and UPDATE operations:
     * - CREATE: New user with auto-increment ID
     * - UPDATE: Full replacement of existing user
     *
     * @param array<string, mixed> $data Input data from API request
     * @return PBXApiResult Result with data/errors and HTTP status code
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        // ============================================================
        // PHASE 1: DATA SANITIZATION
        // WHY: Security - never trust user input
        // ============================================================

        $sanitizationRules = DataStructure::getSanitizationRules();
        $textFields = ['user_username'];

        // Preserve ID field that may not be in sanitization rules
        $recordId = $data['id'] ?? null;

        try {
            // Sanitize: remove dangerous chars, trim whitespace, normalize format
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Restore preserved field (essential for UPDATE operations)
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }

            // Sanitize routing destination fields (forwarding extensions)
            $routingFields = [
                'fwd_forwarding',
                'fwd_forwardingonbusy',
                'fwd_forwardingonunavailable',
            ];
            $sanitizedData = self::sanitizeRoutingDestinations($sanitizedData, $routingFields, 20);

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }

        // ============================================================
        // PHASE 2: REQUIRED FIELDS VALIDATION
        // WHY: Fail fast - don't waste resources on invalid data
        // ============================================================

        $validationRules = [
            'user_username' => [
                ['type' => 'required', 'message' => 'ex_ValidateUsernameEmpty']
            ],
            'number' => [
                ['type' => 'required', 'message' => 'ex_ValidateNumberIsEmpty'],
                ['type' => 'regex', 'pattern' => '/^[0-9]+$/', 'message' => 'ex_ValidateExtensionNumber']
            ],
        ];

        // sip_secret required only for CREATE (UPDATE can skip if keeping existing password)
        $isCreateOperation = empty($sanitizedData['id']);
        if ($isCreateOperation) {
            $validationRules['sip_secret'] = [
                ['type' => 'required', 'message' => 'ex_ValidateSecretEmpty']
            ];
        }

        $validationErrors = self::validateRequiredFields($sanitizedData, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }

        // ============================================================
        // PHASE 3: DETERMINE OPERATION TYPE
        // WHY: Different logic for new vs existing records
        // ============================================================

        // Get record ID and HTTP method from data
        $recordId = $sanitizedData['id'] ?? null;
        $httpMethod = $data['httpMethod'] ?? 'POST'; // Default to POST for backward compatibility

        $userEntity = null;
        if (!empty($recordId)) {
            // Try to find existing user by ID
            $userEntity = Users::findFirstById($recordId);

            if ($userEntity) {
                // Record exists - UPDATE operation
                $isCreateOperation = false;
            } else {
                // Record not found - check if PUT/PATCH should fail with 404
                $error = self::validateRecordExistence($httpMethod, 'Employee');
                if ($error) {
                    $res->messages['error'][] = $error['message'];
                    $res->httpCode = $error['code'];
                    return $res;
                }
                // POST with custom ID allowed for migrations/imports
            }
        }

        // ============================================================
        // PHASE 4: APPLY DEFAULTS (CREATE ONLY!)
        // WHY CREATE: New records need complete dataset with all fields
        // WHY NOT UPDATE: Would overwrite existing values with defaults!
        // ============================================================

        if ($isCreateOperation) {
            $sanitizedData = DataStructure::applyDefaults($sanitizedData);
        }

        // ============================================================
        // PHASE 5: SCHEMA VALIDATION + BUSINESS RULES
        // WHY: Validate AFTER defaults to check complete dataset
        // ============================================================

        // Schema validation (minLength/maxLength, enum constraints)
        $schemaErrors = DataStructure::validateInputData($sanitizedData);
        if (!empty($schemaErrors)) {
            $res->messages['error'] = $schemaErrors;
            $res->httpCode = 422; // Unprocessable Entity
            return $res;
        }

        // Business rules validation (password strength, email, uniqueness)
        $businessErrors = self::validateEmployeeData($sanitizedData, $isCreateOperation);
        if (!empty($businessErrors)) {
            $res->messages['error'] = array_merge($res->messages['error'] ?? [], $businessErrors);
            $res->httpCode = 422;
            return $res;
        }

        // ============================================================
        // PHASE 6: SAVE TO DATABASE
        // WHY: All-or-nothing transaction with multi-entity save
        // ============================================================

        try {
            $savedUser = self::executeInTransaction(function() use (&$sanitizedData, $isCreateOperation) {
                // Save Users entity (without avatar for new users - need ID first)
                list($userEntity, $success, $pendingAvatarData) = self::saveUser($sanitizedData);
                if (!$success) {
                    throw new \Exception('Failed to save user: ' . implode(', ', $userEntity->getMessages()));
                }
                $sanitizedData['id'] = $userEntity->id;

                // Handle pending avatar data (needs user ID for filename)
                if (!empty($pendingAvatarData)) {
                    $avatarData = AvatarHelper::saveAvatarToFile($pendingAvatarData, (string)$userEntity->id);
                    if ($avatarData === null) {
                        throw new \Exception('Invalid avatar image: must be at least 1KB and a valid image format (JPEG, PNG, GIF, WEBP)');
                    }
                    // Delete old avatar file if exists
                    if (!empty($userEntity->avatar)) {
                        AvatarHelper::deleteAvatarFile($userEntity->avatar);
                    }
                    $userEntity->avatar = $avatarData;
                    if (!$userEntity->save()) {
                        throw new \Exception('Failed to save user avatar: ' . implode(', ', $userEntity->getMessages()));
                    }
                }

                // Save SIP Extension entity
                list($extension, $success) = self::saveExtension($sanitizedData, false);
                if (!$success) {
                    throw new \Exception('Failed to save SIP extension: ' . implode(', ', $extension->getMessages()));
                }

                // Save Sip entity (SIP configuration)
                list($sipEntity, $success) = self::saveSip($sanitizedData);
                if (!$success) {
                    throw new \Exception('Failed to save SIP configuration: ' . implode(', ', $sipEntity->getMessages()));
                }

                // Save ExtensionForwardingRights entity
                list($fwdEntity, $success) = self::saveForwardingRights($sanitizedData);
                if (!$success) {
                    throw new \Exception('Failed to save forwarding rights: ' . implode(', ', $fwdEntity->getMessages()));
                }

                // Handle mobile number (optional)
                if (!empty($sanitizedData['mobile_number'])) {
                    // Save mobile extension
                    list($mobileExtension, $success) = self::saveExtension($sanitizedData, true);
                    if (!$success) {
                        throw new \Exception('Failed to save mobile extension: ' . implode(', ', $mobileExtension->getMessages()));
                    }

                    // Save ExternalPhones for mobile number
                    list($externalPhone, $success) = self::saveExternalPhones($sanitizedData);
                    if (!$success) {
                        throw new \Exception('Failed to save mobile phone: ' . implode(', ', $externalPhone->getMessages()));
                    }
                } else {
                    // Delete mobile number if it was associated with the user
                    list($deletedMobileNumber, $success) = self::deleteMobileNumber($sanitizedData);
                    if (!$success && $deletedMobileNumber !== null) {
                        throw new \Exception('Failed to delete mobile number: ' . implode(', ', $deletedMobileNumber->getMessages()));
                    }
                }

                return $userEntity;
            });

            // ============================================================
            // PHASE 7: BUILD RESPONSE
            // WHY: Consistent API format using GetRecordAction transformation
            // ============================================================

            // Use GetRecordAction to build complete response with all representations
            $res = GetRecordAction::main((string)$savedUser->id);
            $res->processor = __METHOD__;
            $res->success = true;
            $res->httpCode = $isCreateOperation ? 201 : 200; // 201 Created, 200 OK

            if ($isCreateOperation) {
                $res->reload = "extensions/modify/{$savedUser->id}";
            }

            self::logSuccessfulSave('Employee', $sanitizedData['user_username'], (string)$savedUser->id, __METHOD__);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Save parameters to the Users table
     *
     * @param array $sanitizedData The data array containing the input data.
     * @return array An array containing: [Users entity, save result, pending avatar data or null]
     */
    private static function saveUser(array $sanitizedData): array
    {
        $userEntity = Users::findFirstById($sanitizedData['id']??'');
        if ($userEntity === null) {
            $userEntity = new Users();
        }

        // Set language from system settings
        $userEntity->language = PbxSettings::getValueByKey(PbxSettings::PBX_LANGUAGE);

        // Handle avatar field with special logic:
        // - If empty string: clear avatar (user clicked clear button)
        // - If starts with 'data:image': new base64 image - save to file after getting user ID
        // - If starts with '/' or '{' (URL path or JSON): unchanged, skip update
        $pendingAvatarData = null;

        if (array_key_exists('user_avatar', $sanitizedData)) {
            $avatarValue = $sanitizedData['user_avatar'];

            if ($avatarValue === '' || $avatarValue === null) {
                // Empty value means clear the avatar
                // Delete old avatar file if exists (handles JSON, path, and legacy formats)
                if (!empty($userEntity->avatar)) {
                    AvatarHelper::deleteAvatarFile($userEntity->avatar);
                }
                $userEntity->avatar = '';
            } elseif (str_starts_with($avatarValue, 'data:image')) {
                // New base64 image - save to file after getting user ID
                // For new users, we need ID first for filename generation
                $pendingAvatarData = $avatarValue;
            }
            // If it's a URL path (starts with '/') or JSON (starts with '{'), don't update
        }

        // Set username
        if (isset($sanitizedData['user_username'])) {
            $userEntity->username = $sanitizedData['user_username'];
        }

        // Set email
        if (isset($sanitizedData['user_email'])) {
            $userEntity->email = $sanitizedData['user_email'];
        }

        $result = $userEntity->save();
        return [$userEntity, $result, $pendingAvatarData];
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
            $extension->uniqid = Extensions::generateUniqueID(Extensions::PREFIX_EXTENSION);
            $extension->show_in_phonebook = '1';
            $extension->public_access = '1';
            $extension->is_general_user_number = '1';
        }

        // Set type
        $extension->type = $isMobile ? Extensions::TYPE_EXTERNAL : Extensions::TYPE_SIP;

        // Sanitize the caller ID
        $extension->callerid = self::sanitizeCallerId($sanitizedData['user_username']);

        // Set userid to the ID of the user entity
        $extension->userid = $sanitizedData['id'];

        // Set number based on the value of mobile_number or number
        $extension->number = $isMobile ? $sanitizedData['mobile_number'] : $sanitizedData['number'];

        // Generate search index for the extension
        $extension->search_index = self::generateSearchIndex($sanitizedData, $isMobile);

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

        // Set extension based on the value of number
        $sipEntity->extension = $sanitizedData['number'];

        // Set description based on the value of user_username
        $sipEntity->description = $sanitizedData['user_username'];

        // Handle network filter ID (PATCH support with isset())
        if (isset($sanitizedData['sip_networkfilterid'])) {
            if ($sanitizedData['sip_networkfilterid'] === 'none') {
                $sipEntity->networkfilterid = null;
            } else {
                $sipEntity->networkfilterid = $sanitizedData['sip_networkfilterid'];
            }
        }

        // Handle SIP secret (PATCH support with isset())
        if (isset($sanitizedData['sip_secret'])) {
            $sipEntity->secret = $sanitizedData['sip_secret'];
        }

        // Handle DTMF mode (PATCH support with isset())
        if (isset($sanitizedData['sip_dtmfmode'])) {
            $sipEntity->dtmfmode = $sanitizedData['sip_dtmfmode'];
        }

        // Handle transport (PATCH support with isset())
        if (isset($sanitizedData['sip_transport'])) {
            $sipEntity->transport = $sanitizedData['sip_transport'];
        }

        // Handle manual attributes (PATCH support with isset())
        if (isset($sanitizedData['sip_manualattributes'])) {
            $sipEntity->setManualAttributes($sanitizedData['sip_manualattributes']);
        }

        // Convert boolean values to '1' or '0' for database fields that expect string
        if (isset($sanitizedData['sip_enableRecording'])) {
            $sipEntity->enableRecording = $sanitizedData['sip_enableRecording'] ? '1' : '0';
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

        // Set extension based on the value of number
        $forwardingRight->extension = $sanitizedData['number'];

        // Set ringlength with smart defaults
        if (isset($sanitizedData['fwd_ringlength'])) {
            $forwardingRight->ringlength = $sanitizedData['fwd_ringlength'];
        } elseif (!empty($sanitizedData['fwd_forwarding'])) {
            // If forwarding is set but ringlength is not provided, use default 45
            $forwardingRight->ringlength = 45;
        } else {
            $forwardingRight->ringlength = 0;
        }

        // Handle forwarding fields (PATCH support with isset())
        if (isset($sanitizedData['fwd_forwarding'])) {
            $forwardingRight->forwarding = $sanitizedData['fwd_forwarding'] === -1 ? '' : $sanitizedData['fwd_forwarding'];
        }

        if (isset($sanitizedData['fwd_forwardingonbusy'])) {
            $forwardingRight->forwardingonbusy = $sanitizedData['fwd_forwardingonbusy'] === -1 ? '' : $sanitizedData['fwd_forwardingonbusy'];
        }

        if (isset($sanitizedData['fwd_forwardingonunavailable'])) {
            $forwardingRight->forwardingonunavailable = $sanitizedData['fwd_forwardingonunavailable'] === -1 ? '' : $sanitizedData['fwd_forwardingonunavailable'];
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

        // Set extension based on mobile_number
        $externalPhone->extension = $sanitizedData['mobile_number']??'';

        // Set description based on user_username
        $externalPhone->description = $sanitizedData['user_username']??'';

        // Set dialstring (PATCH support with isset())
        if (isset($sanitizedData['mobile_dialstring'])) {
            $externalPhone->dialstring = $sanitizedData['mobile_dialstring'];
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
     * @param array &$sanitizedData The sanitized input data (passed by reference to allow cleaning)
     * @param bool $isCreateOperation Whether this is a create (true) or update (false) operation
     * @return array Array of validation error messages
     */
    private static function validateEmployeeData(array &$sanitizedData, bool $isCreateOperation): array
    {
        $validationErrors = [];
        $t = Di::getDefault()->get(TranslationProvider::SERVICE_NAME);

        // Check uniqueness of extension number - skip for updates of the same record
        $existingExtension = Extensions::findFirst([
            'conditions' => 'number = :number: AND userid != :userid:',
            'bind' => [
                'number' => $sanitizedData['number'],
                'userid' => $sanitizedData['id'] ?? ''
            ]
        ]);
        if ($existingExtension) {
            $validationErrors[] = $t->_('ex_ValidateNumberIsDouble');
        }

        // Validate sip_secret (required, min 5 chars, strength check) - only for create or when password is provided
        if ($isCreateOperation || !empty($sanitizedData['sip_secret'])) {
            if (empty($sanitizedData['sip_secret'])) {
                $validationErrors[] = $t->_('ex_ValidateSecretEmpty');
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
                            $validationErrors[] = $t->_('ex_ValidateSecretWeak');
                        } elseif (str_contains($message, 'security requirements')) {
                            $validationErrors[] = $t->_('ex_ValidatePasswordTooWeak');
                        } else {
                            // Use original message from PasswordService
                            $validationErrors[] = $message;
                        }
                    }
                }
            }
        }

        // Validate user_email (optional, email format)
        if (!empty($sanitizedData['user_email'])) {
            // Check for placeholder values
            $placeholders = ['_@_._', '@', '_@_', '___@___.___'];
            if (in_array($sanitizedData['user_email'], $placeholders, true)) {
                // Clear placeholder value
                $sanitizedData['user_email'] = '';
            } elseif (!filter_var($sanitizedData['user_email'], FILTER_VALIDATE_EMAIL)) {
                $validationErrors[] = $t->_('ex_ValidateEmailEmpty');
            }
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
                $validationErrors[] = $t->_('ex_ValidateMobileNumberIsDouble');
            }

            // Basic mobile number format validation
            if (!preg_match('/^\+?[1-9]\d{1,14}$/', $sanitizedData['mobile_number'])) {
                $validationErrors[] = $t->_('ex_ValidateMobileIsNotCorrect');
            }
        }

        // Validate fwd_ringlength (3-180 if forwarding is set)
        if (!empty($sanitizedData['fwd_forwarding'])) {
            $ringLength = (int)($sanitizedData['fwd_ringlength'] ?? 0);
            if ($ringLength < 3 || $ringLength > 180) {
                $validationErrors[] = str_replace('{ruleValue}', '3-180',
                    $t->_('ex_ValidateRingingBeforeForwardOutOfRange'));
            }
        }

        // Validate forwarding destinations (must be different from main number)
        $forwardingFields = ['fwd_forwarding', 'fwd_forwardingonbusy', 'fwd_forwardingonunavailable'];
        foreach ($forwardingFields as $field) {
            if (!empty($sanitizedData[$field]) && $sanitizedData[$field] === $sanitizedData['number']) {
                $validationErrors[] = $t->_('ex_ValidateForwardingToBeDifferent');
                break;
            }
        }

        return $validationErrors;
    }
}
