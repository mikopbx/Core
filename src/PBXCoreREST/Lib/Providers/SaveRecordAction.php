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

namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\SipHosts;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * ✨ REFERENCE IMPLEMENTATION: Provider Save Action (Polymorphic)
 *
 * This follows the canonical 7-phase pattern with polymorphic schema support (SIP + IAX).
 * Single Source of Truth pattern - all definitions in DataStructure::getParameterDefinitions()
 *
 * Processing Pipeline (7 Phases):
 * 1. SANITIZE: Clean user input (XSS, SQL injection prevention)
 * 2. VALIDATE REQUIRED: Check required fields (type, description, registration_type)
 * 3. DETERMINE OPERATION: Detect CREATE vs UPDATE/PATCH
 * 4. APPLY DEFAULTS: Add missing values (CREATE only!) type-specific defaults
 * 5. VALIDATE SCHEMA: Check enum/range constraints + business rules
 * 6. SAVE: Transaction with model + type-specific config (SIP/IAX)
 * 7. BUILD RESPONSE: Format data using DataStructure
 *
 * @api {post} /pbxcore/api/v3/providers Create provider
 * @api {put} /pbxcore/api/v3/providers/:id Full update
 * @api {patch} /pbxcore/api/v3/providers/:id Partial update
 * @apiVersion 3.0.0
 * @apiName SaveProvider
 * @apiGroup Providers
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save provider with comprehensive validation (polymorphic SIP/IAX)
     *
     * @param array<string, mixed> $data Input data from API request
     * @return PBXApiResult Result with data/errors and HTTP status code
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        // ============================================================
        // SPECIAL CASE: Status-only update (lightweight operation)
        // WHY: Allows quick enable/disable without full validation
        // ============================================================

        $isStatusUpdate = isset($data['id']) && isset($data['type']) && isset($data['disabled']) &&
                          count(array_diff_key($data, array_flip(['id', 'type', 'disabled']))) === 0;

        if ($isStatusUpdate) {
            return self::updateStatusOnly($data, $res);
        }

        // ============================================================
        // PHASE 1: DATA SANITIZATION
        // Clean user input to prevent XSS, SQL injection, etc.
        // WHY: Security first - never trust user input
        // ============================================================

        $sanitizationRules = DataStructure::getSanitizationRules();
        $textFields = ['note', 'description', 'manualattributes'];

        // Preserve ID field (not in sanitization rules, uses uniqid)
        $recordId = $data['id'] ?? null;

        // Determine provider type for type-specific validation
        $providerType = strtoupper($data['type'] ?? 'SIP');

        try {
            // Sanitize: remove dangerous chars, trim whitespace, normalize format
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);

            // Restore preserved ID field (essential for UPDATE/PATCH operations)
            if ($recordId !== null) {
                $sanitizedData['id'] = $recordId;
            }

            // Force uppercase for type
            if (isset($sanitizedData['type'])) {
                $sanitizedData['type'] = strtoupper($sanitizedData['type']);
            }

            // Handle 'none' value for networkfilterid
            if (isset($sanitizedData['networkfilterid']) &&
                ($sanitizedData['networkfilterid'] === 'none' || $sanitizedData['networkfilterid'] === '')) {
                $sanitizedData['networkfilterid'] = null;
            }

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            return $res;
        }

        // ============================================================
        // PHASE 2.5: EARLY EXISTENCE CHECK (for PATCH/PUT)
        // WHY: Check if resource exists BEFORE validating required fields
        // This prevents misleading "field required" errors for non-existent resources
        // ============================================================

        $httpMethod = $data['httpMethod'] ?? 'POST';
        $provider = null;
        $isNewRecord = true;

        if (!empty($sanitizedData['id'])) {
            // Try to find existing record by uniqid
            $provider = Providers::findFirstByUniqid($sanitizedData['id']);

            if ($provider) {
                // Record exists - UPDATE or PATCH operation
                $isNewRecord = false;
            } else {
                // ID provided but record not found
                // Check if PUT/PATCH should fail with 404 BEFORE validating required fields
                $error = self::validateRecordExistence($httpMethod, 'Provider');
                if ($error) {
                    $res->messages['error'][] = $error['message'];
                    $res->httpCode = $error['code'];
                    return $res;
                }
                // POST with custom ID allowed for migrations
            }
        }

        // ============================================================
        // PHASE 2: REQUIRED FIELDS VALIDATION
        // Check required fields before database operations
        // WHY: Fail fast - don't waste resources on incomplete data
        // Note: For PATCH, required fields are optional (partial update)
        // ============================================================

        $isPatch = ($httpMethod === 'PATCH');

        $validationRules = [
            'type' => [
                ['type' => 'required', 'message' => 'Provider type is required'],
                ['type' => 'enum', 'values' => ['SIP', 'IAX'], 'message' => 'Provider type must be SIP or IAX']
            ]
        ];

        // For PATCH, description and registration_type are optional (partial update)
        if (!$isPatch) {
            $validationRules['description'] = [
                ['type' => 'required', 'message' => 'Provider description is required']
            ];
            $validationRules['registration_type'] = [
                ['type' => 'required', 'message' => 'Registration type is required'],
                ['type' => 'enum', 'values' => ['none', 'outbound', 'inbound'],
                 'message' => 'Registration type must be: none, outbound, or inbound']
            ];
        }

        $validationErrors = self::validateRequiredFields($sanitizedData, $validationRules);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }

        // Type cannot be changed on existing provider
        if (!$isNewRecord && isset($sanitizedData['type']) && $provider->type !== $sanitizedData['type']) {
            $res->messages['error'][] = 'Cannot change provider type after creation';
            return $res;
        }

        // ============================================================
        // PHASE 3: FINALIZE OPERATION TYPE
        // Initialize model if needed
        // ============================================================

        if ($isNewRecord) {
            // CREATE: Initialize new provider
            $provider = new Providers();
            $provider->type = $sanitizedData['type'];
            $provider->uniqid = !empty($sanitizedData['id']) ? $sanitizedData['id'] :
                                Providers::generateUniqueID($sanitizedData['type']);
        }

        // ============================================================
        // PHASE 4: APPLY DEFAULTS (CREATE ONLY!)
        // Add missing field defaults from schema
        // WHY CREATE: New records need complete data with sensible defaults
        // WHY NOT UPDATE/PATCH: Would overwrite existing values!
        // ============================================================

        if ($isNewRecord) {
            // ✅ CREATE: Apply defaults for missing fields
            // Type-specific defaults: SIP uses port 5060, IAX uses 4569
            $sanitizedData = DataStructure::applyDefaults($sanitizedData);

            // Override port default based on provider type
            if (!isset($sanitizedData['port']) || empty($sanitizedData['port'])) {
                $sanitizedData['port'] = ($providerType === 'IAX') ? 4569 : 5060;
            }
        }
        // ❌ UPDATE/PATCH: Do NOT apply defaults (would overwrite existing values!)

        // ============================================================
        // PHASE 5: SCHEMA VALIDATION
        // Validate enum, min/max constraints + business rules
        // WHY: Validate AFTER defaults to check complete dataset
        // ============================================================

        $schemaErrors = DataStructure::validateInputData($sanitizedData);
        if (!empty($schemaErrors)) {
            $res->messages['error'] = $schemaErrors;
            $res->httpCode = 422; // Unprocessable Entity
            return $res;
        }

        // Business rules validation (depends on registration_type)
        $businessErrors = self::validateBusinessRules($sanitizedData, $isNewRecord, $provider);
        if (!empty($businessErrors)) {
            $res->messages['error'] = $businessErrors;
            $res->httpCode = 422;
            return $res;
        }

        // ============================================================
        // PHASE 6: SAVE TO DATABASE
        // Transaction ensures atomicity (provider + SIP/IAX config)
        // WHY: All-or-nothing - either complete save or complete rollback
        // ============================================================

        try {
            $savedProvider = self::executeInTransaction(function() use ($provider, $sanitizedData, $isNewRecord) {

                // Update Providers model
                $provider->note = $sanitizedData['note'] ?? '';

                if (!$provider->save()) {
                    throw new \Exception('Failed to save provider: ' . implode(', ', $provider->getMessages()));
                }

                // Save type-specific configuration
                if ($sanitizedData['type'] === 'SIP') {
                    self::saveSipConfiguration($provider, $sanitizedData, $isNewRecord);
                } else {
                    self::saveIaxConfiguration($provider, $sanitizedData, $isNewRecord);
                }

                return $provider;
            });

            // ============================================================
            // PHASE 7: BUILD RESPONSE
            // Format data using DataStructure (representations, types, etc.)
            // WHY: Consistent API response format with all computed fields
            // ============================================================

            $res->data = DataStructure::createFromModel($savedProvider);
            $res->success = true;
            $res->httpCode = $isNewRecord ? 201 : 200; // 201 Created, 200 OK

            // Set reload path for frontend navigation
            // WHY: Frontend needs to know where to redirect after save
            if ($isNewRecord) {
                $urlType = strtolower($savedProvider->type);
                $res->reload = "providers/modify{$urlType}/{$savedProvider->uniqid}";
            }

            // Log successful operation
            $configType = ucfirst(strtolower($savedProvider->type));
            $config = $savedProvider->$configType;
            $description = $config ? $config->description : $savedProvider->note;
            self::logSuccessfulSave('Provider', $description, $savedProvider->type, __METHOD__);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Validate business rules based on registration type
     *
     * Different registration types have different requirements:
     * - outbound: requires host, username, password (registration to remote server)
     * - inbound: requires username, password optional if receive_calls_without_auth enabled
     * - none: requires host only (direct calls without registration, username/password optional)
     *
     * @param array $data Sanitized data
     * @param bool $isNewRecord True if creating new provider
     * @param Providers|null $provider Existing provider for updates
     * @return array Error messages
     */
    private static function validateBusinessRules(array $data, bool $isNewRecord, ?Providers $provider): array
    {
        $errors = [];
        $regType = $data['registration_type'] ?? '';

        // ============================================================
        // OUTBOUND REGISTRATION: Requires host, username, password
        // WHY: We register to remote server with credentials
        // ============================================================
        if ($regType === 'outbound') {
            // Host is required
            if (empty($data['host']) || trim($data['host']) === '') {
                $errors[] = TranslationProvider::translate('pr_ValidationProviderHostIsEmpty');
            }

            // Username is required
            if (empty($data['username']) || trim($data['username']) === '') {
                $errors[] = TranslationProvider::translate('pr_ValidationProviderLogin');
            }

            // Password is required (except when updating with masked value)
            $passwordRequired = true;
            if (!$isNewRecord && isset($data['secret']) && $data['secret'] === 'XXXXXXXX') {
                $passwordRequired = false; // Keep existing password
            }

            if ($passwordRequired && (empty($data['secret']) || trim($data['secret']) === '')) {
                $errors[] = TranslationProvider::translate('pr_ValidationProviderPasswordEmpty');
            }
        }

        // ============================================================
        // INBOUND REGISTRATION: Requires username, password optional
        // WHY: Remote server registers to us with credentials
        // ============================================================
        if ($regType === 'inbound') {
            // Username is required
            if (empty($data['username']) || trim($data['username']) === '') {
                $errors[] = TranslationProvider::translate('pr_ValidationProviderLogin');
            }

            // Password validation logic:
            // 1. If receive_calls_without_auth=true, password is OPTIONAL
            // 2. If receive_calls_without_auth=false, password is REQUIRED
            // 3. For UPDATE: masked password (XXXXXXXX) means keep existing
            $receiveWithoutAuth = $data['receive_calls_without_auth'] ?? false;

            // Check if password is provided (not empty and not masked)
            $passwordProvided = !empty($data['secret']) &&
                               trim($data['secret']) !== '' &&
                               $data['secret'] !== 'XXXXXXXX';

            // Require password only if auth is required and no password provided
            if (!$receiveWithoutAuth && !$passwordProvided) {
                // For UPDATE: masked password is acceptable (keeps existing password)
                if (!$isNewRecord && isset($data['secret']) && $data['secret'] === 'XXXXXXXX') {
                    // Keep existing password - OK
                } else {
                    // Password required but not provided
                    $errors[] = TranslationProvider::translate('pr_ValidationProviderPasswordEmpty');
                }
            }
        }

        // ============================================================
        // NO REGISTRATION: Requires host only
        // WHY: Direct calls to IP/hostname, no authentication needed
        // Username/password are OPTIONAL for this mode
        // ============================================================
        if ($regType === 'none') {
            // Host is required (where to send calls)
            if (empty($data['host']) || trim($data['host']) === '') {
                $errors[] = TranslationProvider::translate('pr_ValidationProviderHostIsEmpty');
            }
            // Username and password are OPTIONAL for 'none' registration type
            // No validation required
        }

        return $errors;
    }

    /**
     * Save SIP configuration
     *
     * @param Providers $provider Provider model
     * @param array $data Configuration data
     * @param bool $isNewRecord True if creating new record
     * @throws \Exception
     */
    private static function saveSipConfiguration(Providers $provider, array $data, bool $isNewRecord): void
    {
        // Find or create SIP configuration
        $sip = $provider->Sip ?: new Sip();
        $sip->uniqid = $provider->uniqid;

        // Boolean fields for conversion
        $booleanFields = ['disabled', 'qualify', 'disablefromuser', 'receive_calls_without_auth', 'cid_did_debug'];
        $data = self::convertBooleanFields($data, $booleanFields);

        // Update fields using isset() for PATCH support
        if (isset($data['disabled'])) {
            $sip->disabled = $data['disabled'];
        } elseif ($isNewRecord) {
            $sip->disabled = '0';
        }

        if (isset($data['username'])) {
            $sip->username = $data['username'];
        }

        // Handle password update (never overwrite with masked value)
        if (isset($data['secret'])) {
            if ($data['registration_type'] === 'outbound' && $data['secret'] === 'XXXXXXXX') {
                // Keep existing password - do nothing
            } else {
                $sip->secret = $data['secret'];
            }
        } elseif ($isNewRecord) {
            $sip->secret = '';
        }

        if (isset($data['host'])) {
            $sip->host = $data['host'];
        }

        if (isset($data['port'])) {
            $sip->port = (string)$data['port'];
        } elseif ($isNewRecord) {
            $sip->port = '5060';
        }

        if (isset($data['transport'])) {
            $sip->transport = $data['transport'];
        } elseif ($isNewRecord) {
            $sip->transport = 'UDP';
        }

        if (isset($data['qualify'])) {
            $sip->qualify = $data['qualify'];
        } elseif ($isNewRecord) {
            $sip->qualify = '1';
        }

        if (isset($data['qualifyfreq'])) {
            $sip->qualifyfreq = (string)$data['qualifyfreq'];
        } elseif ($isNewRecord) {
            $sip->qualifyfreq = '60';
        }

        if (isset($data['registration_type'])) {
            $sip->registration_type = $data['registration_type'];
        } elseif ($isNewRecord) {
            $sip->registration_type = 'none';
        }

        if (isset($data['description'])) {
            $sip->description = $data['description'];
        }

        if (isset($data['networkfilterid'])) {
            $sip->networkfilterid = $data['networkfilterid'] ?: '';
        }

        if (isset($data['manualattributes'])) {
            $sip->manualattributes = $data['manualattributes'];
        }

        if (isset($data['dtmfmode'])) {
            $sip->dtmfmode = $data['dtmfmode'];
        } elseif ($isNewRecord) {
            $sip->dtmfmode = 'auto';
        }

        if (isset($data['fromuser'])) {
            $sip->fromuser = $data['fromuser'];
        }

        if (isset($data['fromdomain'])) {
            $sip->fromdomain = $data['fromdomain'];
        }

        if (isset($data['outbound_proxy'])) {
            $sip->outbound_proxy = $data['outbound_proxy'];
        }

        if (isset($data['disablefromuser'])) {
            $sip->disablefromuser = $data['disablefromuser'];
        } elseif ($isNewRecord) {
            $sip->disablefromuser = '0';
        }

        if (isset($data['receive_calls_without_auth'])) {
            $sip->receive_calls_without_auth = $data['receive_calls_without_auth'];
        } elseif ($isNewRecord) {
            $sip->receive_calls_without_auth = '0';
        }

        // CallerID and DID fields
        if (isset($data['cid_source'])) $sip->cid_source = $data['cid_source'];
        elseif ($isNewRecord) $sip->cid_source = Sip::CALLERID_SOURCE_DEFAULT;

        if (isset($data['cid_custom_header'])) $sip->cid_custom_header = $data['cid_custom_header'];
        if (isset($data['cid_parser_start'])) $sip->cid_parser_start = $data['cid_parser_start'];
        if (isset($data['cid_parser_end'])) $sip->cid_parser_end = $data['cid_parser_end'];
        if (isset($data['cid_parser_regex'])) $sip->cid_parser_regex = $data['cid_parser_regex'];

        if (isset($data['did_source'])) $sip->did_source = $data['did_source'];
        elseif ($isNewRecord) $sip->did_source = Sip::DID_SOURCE_DEFAULT;

        if (isset($data['did_custom_header'])) $sip->did_custom_header = $data['did_custom_header'];
        if (isset($data['did_parser_start'])) $sip->did_parser_start = $data['did_parser_start'];
        if (isset($data['did_parser_end'])) $sip->did_parser_end = $data['did_parser_end'];
        if (isset($data['did_parser_regex'])) $sip->did_parser_regex = $data['did_parser_regex'];

        if (isset($data['cid_did_debug'])) {
            $sip->cid_did_debug = $data['cid_did_debug'];
        } elseif ($isNewRecord) {
            $sip->cid_did_debug = '0';
        }

        // Fixed fields for providers
        $sip->type = 'friend';
        $sip->nat = 'auto_force';
        $sip->noregister = '0';
        $sip->extension = '';

        if (!$sip->save()) {
            throw new \Exception('Failed to save SIP configuration: ' . implode(', ', $sip->getMessages()));
        }

        // Update provider reference
        $provider->sipuid = $sip->uniqid;
        $provider->save();

        // Handle additional hosts
        if (isset($data['additionalHosts'])) {
            self::updateAdditionalHosts($sip->uniqid, $data['additionalHosts']);
        }
    }

    /**
     * Save IAX configuration
     *
     * @param Providers $provider Provider model
     * @param array $data Configuration data
     * @param bool $isNewRecord True if creating new record
     * @throws \Exception
     */
    private static function saveIaxConfiguration(Providers $provider, array $data, bool $isNewRecord): void
    {
        // Find or create IAX configuration
        $iax = $provider->Iax ?: new Iax();
        $iax->uniqid = $provider->uniqid;

        // Boolean fields for conversion
        $booleanFields = ['disabled', 'receive_calls_without_auth'];
        $data = self::convertBooleanFields($data, $booleanFields);

        // Update fields using isset() for PATCH support
        if (isset($data['disabled'])) {
            $iax->disabled = $data['disabled'];
        } elseif ($isNewRecord) {
            $iax->disabled = '0';
        }

        if (isset($data['username'])) {
            $iax->username = $data['username'];
        }

        // Handle password update (never overwrite with masked value)
        if (isset($data['secret'])) {
            if ($data['registration_type'] === 'outbound' && $data['secret'] === 'XXXXXXXX') {
                // Keep existing password - do nothing
            } else {
                $iax->secret = $data['secret'];
            }
        } elseif ($isNewRecord) {
            $iax->secret = '';
        }

        if (isset($data['host'])) {
            $iax->host = $data['host'];
        }

        if (isset($data['port'])) {
            $iax->port = (string)$data['port'];
        } elseif ($isNewRecord) {
            $iax->port = '4569';
        }

        if (isset($data['registration_type'])) {
            $iax->registration_type = $data['registration_type'];
        } elseif ($isNewRecord) {
            $iax->registration_type = 'none';
        }

        if (isset($data['description'])) {
            $iax->description = $data['description'];
        }

        if (isset($data['manualattributes'])) {
            $iax->manualattributes = $data['manualattributes'];
        }

        if (isset($data['networkfilterid'])) {
            $iax->networkfilterid = $data['networkfilterid'] ?: '';
        }

        if (isset($data['receive_calls_without_auth'])) {
            $iax->receive_calls_without_auth = $data['receive_calls_without_auth'];
        } elseif ($isNewRecord) {
            $iax->receive_calls_without_auth = '0';
        }

        // Fixed fields for providers
        $iax->qualify = '1';
        $iax->noregister = '0';

        if (!$iax->save()) {
            throw new \Exception('Failed to save IAX configuration: ' . implode(', ', $iax->getMessages()));
        }

        // Update provider reference
        $provider->iaxuid = $iax->uniqid;
        $provider->save();
    }

    /**
     * Update additional SIP hosts
     *
     * @param string $sipUniqid SIP unique identifier
     * @param array $hosts Array of host configurations
     */
    private static function updateAdditionalHosts(string $sipUniqid, array $hosts): void
    {
        // Delete existing hosts
        $existingHosts = SipHosts::find([
            'conditions' => 'provider_id = :uid:',
            'bind' => ['uid' => $sipUniqid]
        ]);

        foreach ($existingHosts as $host) {
            $host->delete();
        }

        // Add new hosts
        foreach ($hosts as $hostData) {
            if (!empty($hostData['address'])) {
                $sipHost = new SipHosts();
                $sipHost->provider_id = $sipUniqid;
                $sipHost->address = $hostData['address'];
                $sipHost->save();
            }
        }
    }

    /**
     * Update provider status only (lightweight operation)
     *
     * @param array $data Data containing id, type, disabled
     * @param PBXApiResult $res Result object
     * @return PBXApiResult
     */
    private static function updateStatusOnly(array $data, PBXApiResult $res): PBXApiResult
    {
        try {
            // Sanitize inputs
            $providerId = trim($data['id']);
            $providerType = strtoupper(trim($data['type']));
            $disabled = isset($data['disabled']) ? (bool)$data['disabled'] : false;

            // Validate provider type
            if (!in_array($providerType, ['SIP', 'IAX'])) {
                $res->messages['error'][] = 'Invalid provider type';
                return $res;
            }

            // Find provider
            $provider = Providers::findFirst([
                'conditions' => 'uniqid = :id: AND type = :type:',
                'bind' => [
                    'id' => $providerId,
                    'type' => $providerType
                ]
            ]);

            if (!$provider) {
                $res->messages['error'][] = 'Provider not found';
                $res->httpCode = 404;
                return $res;
            }

            // Update status in type-specific table
            $config = $providerType === 'SIP' ? $provider->Sip : $provider->Iax;
            if (!$config) {
                $res->messages['error'][] = 'Provider configuration not found';
                return $res;
            }

            $config->disabled = $disabled ? '1' : '0';

            if (!$config->save()) {
                $res->messages['error'] = $config->getMessages();
                return $res;
            }

            // Return updated data
            $res->data = [
                'id' => $provider->uniqid,
                'type' => $provider->type,
                'disabled' => $disabled,
                'description' => $config->description ?? $provider->note
            ];
            $res->success = true;

            // Log status change
            $status = $disabled ? 'disabled' : 'enabled';
            $description = $config->description ?: $provider->note;
            SystemMessages::sysLogMsg(__CLASS__, "Provider '{$description}' ({$providerType}) {$status} via API", LOG_INFO);

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(__CLASS__, "Failed to update provider status: " . $e->getMessage(), LOG_ERROR);
        }

        return $res;
    }
}
