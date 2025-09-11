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

use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\SipHosts;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;

/**
 * Action for saving provider record
 * 
 * @api {post} /pbxcore/api/v2/providers/saveRecord Create provider
 * @api {put} /pbxcore/api/v2/providers/saveRecord/:id Update provider
 * @apiVersion 2.0.0
 * @apiName SaveRecord
 * @apiGroup Providers
 * 
 * @apiParam {String} [id] Record ID (for update)
 * @apiParam {String} type Provider type (SIP/IAX)
 * @apiParam {String} note Provider description
 * @apiParam {Object} config Provider configuration (type-specific)
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Saved provider data
 * @apiSuccess {String} reload URL for page reload
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save provider record
     * 
     * @param array $data Data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        // Check if this is a status-only update (contains only id, type, disabled)
        $isStatusUpdate = isset($data['id']) && isset($data['type']) && isset($data['disabled']) && 
                          count(array_diff_key($data, array_flip(['id', 'type', 'disabled']))) === 0;
        
        if ($isStatusUpdate) {
            return self::updateStatusOnly($data, $res);
        }
        
        // Determine if this is a CREATE or UPDATE operation based on HTTP method
        // For saveRecord action:
        // - POST method = CREATE operation (even with pre-generated ID)
        // - PUT method = UPDATE operation (must find existing record)
        $httpMethod = $data['httpMethod'] ?? null;
        unset($data['httpMethod']); // Remove from data to avoid saving it
        
        // Define sanitization rules based on provider type
        $providerType = strtoupper($data['type'] ?? 'SIP');
        
        // Common sanitization rules
        $sanitizationRules = [
            'id' => 'string|max:64',  // Provider ID is a string like "SIP-TRUNK-XXXXX"
            'type' => 'string|upper|max:3',
            'note' => 'string|sanitize|max:255|empty_to_null',
        ];
        
        // Type-specific sanitization rules
        if ($providerType === 'SIP') {
            $sanitizationRules = array_merge($sanitizationRules, self::getSipSanitizationRules());
        } else {
            $sanitizationRules = array_merge($sanitizationRules, self::getIaxSanitizationRules());
        }
        
        // Text fields for unified processing
        $textFields = ['note', 'description', 'manualattributes'];
        
        try {
            // Sanitize only allowed fields
            $allowedData = array_intersect_key($data, $sanitizationRules);
            
            // Unified data sanitization using new approach
            $sanitizedData = self::sanitizeInputData($allowedData, $sanitizationRules, $textFields);
            
            // Provide defaults for missing bool fields
            $boolFields = ['disabled', 'qualify', 'disablefromuser', 'receive_calls_without_auth'];
            foreach ($boolFields as $field) {
                if (!array_key_exists($field, $sanitizedData) && isset($sanitizationRules[$field]) && $sanitizationRules[$field] === 'bool') {
                    $sanitizedData[$field] = false;
                }
            }
            
            // Validate provider type
            if (!in_array($sanitizedData['type'], ['SIP', 'IAX'])) {
                $res->messages['error'][] = 'api_InvalidProviderType';
                return $res;
            }
            
            // Save in transaction, passing the HTTP method info
            $savedProvider = self::executeInTransaction(function() use ($sanitizedData, $httpMethod) {
                return self::saveProviderInTransaction($sanitizedData, $httpMethod);
            });
            
            $res->data = DataStructure::createFromModel($savedProvider);
            $res->success = true;
            
            // Set reload URL for new records (POST requests)
            if ($httpMethod === 'POST') {
                // Convert type to lowercase for URL (modifysip, modifyiax)
                $urlType = strtolower($savedProvider->type);
                $res->reload = "providers/modify{$urlType}/{$savedProvider->uniqid}";
            }
            
            // Log successful operation
            $configType = ucfirst(strtolower($savedProvider->type));
            $config = $savedProvider->$configType;
            $description = $config ? $config->description : $savedProvider->note;
            self::logSuccessfulSave('Provider', $description, $savedProvider->type, __METHOD__);
            
        } catch (\Exception $e) {
            // Handle save error using unified approach
            return self::handleSaveError($e, $res);
        }
        
        return $res;
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
                $res->messages['error'][] = 'api_InvalidProviderType';
                return $res;
            }
            
            // Find provider by uniqid (id in API contains uniqid value)
            $provider = Providers::findFirst([
                'conditions' => 'uniqid = :id: AND type = :type:',
                'bind' => [
                    'id' => $providerId,
                    'type' => $providerType
                ]
            ]);
            
            if (!$provider) {
                $res->messages['error'][] = 'api_ProviderNotFound';
                return $res;
            }
            
            // Update status in the type-specific table
            if ($providerType === 'SIP') {
                $config = $provider->Sip;
                if (!$config) {
                    $res->messages['error'][] = 'api_SipConfigNotFound';
                    return $res;
                }
            } else {
                $config = $provider->Iax;
                if (!$config) {
                    $res->messages['error'][] = 'api_IaxConfigNotFound';
                    return $res;
                }
            }
            
            // Update disabled status
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
            
            // Log the status change
            $status = $disabled ? 'disabled' : 'enabled';
            $description = $config->description ?: $provider->note;
            error_log("Provider '{$description}' ({$providerType}) has been {$status} via API");
            
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            error_log("Failed to update provider status: " . $e->getMessage());
        }
        
        return $res;
    }
    
    /**
     * Get SIP-specific sanitization rules
     * 
     * @return array
     */
    private static function getSipSanitizationRules(): array
    {
        return [
            'disabled' => 'bool',
            'username' => 'string|max:64',
            'secret' => 'string|max:64',
            'host' => 'string|max:255',
            'port' => 'int',
            'transport' => 'string|upper|max:10',
            'qualify' => 'bool',
            'qualifyfreq' => 'int',
            'registration_type' => 'string|max:20',
            'description' => 'string|sanitize|max:255',
            'networkfilterid' => 'string|max:64|empty_to_null',
            'manualattributes' => 'string|sanitize|max:1024|empty_to_null',
            'dtmfmode' => 'string|max:20',
            'fromuser' => 'string|max:64|empty_to_null',
            'fromdomain' => 'string|max:255|empty_to_null',
            'outbound_proxy' => 'string|max:255|empty_to_null',
            'disablefromuser' => 'bool',
            'receive_calls_without_auth' => 'bool',
            'additionalHosts' => 'array',
            // CallerID and DID source fields
            'cid_source' => 'string|max:20',
            'cid_custom_header' => 'string|max:100|empty_to_null',
            'cid_parser_start' => 'string|max:10|empty_to_null',
            'cid_parser_end' => 'string|max:10|empty_to_null',
            'cid_parser_regex' => 'string|max:255|empty_to_null',
            'did_source' => 'string|max:20',
            'did_custom_header' => 'string|max:100|empty_to_null',
            'did_parser_start' => 'string|max:10|empty_to_null',
            'did_parser_end' => 'string|max:10|empty_to_null',
            'did_parser_regex' => 'string|max:255|empty_to_null',
            'cid_did_debug' => 'bool',
        ];
    }
    
    /**
     * Get IAX-specific sanitization rules
     * 
     * @return array
     */
    private static function getIaxSanitizationRules(): array
    {
        return [
            'disabled' => 'bool',
            'username' => 'string|max:64',
            'secret' => 'string|max:64',
            'host' => 'string|max:255',
            'port' => 'int',
            'registration_type' => 'string|max:20',
            'description' => 'string|sanitize|max:255',
            'manualattributes' => 'string|sanitize|max:1024|empty_to_null',
            'networkfilterid' => 'string|max:64|empty_to_null',
            'receive_calls_without_auth' => 'bool',
        ];
    }
    
    /**
     * Save provider and configuration in transaction
     * 
     * @param array $data Sanitized data
     * @param string|null $httpMethod HTTP method used for the request
     * @return Providers Saved provider model
     * @throws \Exception
     */
    private static function saveProviderInTransaction(array $data, ?string $httpMethod = null): Providers
    {
        // Determine if this is a CREATE or UPDATE operation
        $isCreateOperation = ($httpMethod === 'POST');

        // Find or create provider based on operation type
        if (!$isCreateOperation && !empty($data['id'])) {
            // UPDATE operation - provider must exist
            $provider = Providers::findFirstByUniqid($data['id']);
            if (!$provider) {
                throw new \Exception('Provider not found');
            }
        } else {
            // CREATE operation - create new provider
            $provider = new Providers();
            // Use provided ID if available (pre-generated), otherwise generate new one
            $provider->uniqid = !empty($data['id']) ? $data['id'] : 
                                Providers::generateUniqueID($data['type'] . '-TRUNK-');
            $provider->type = $data['type'];
        }
        
        $provider->note = $data['note'] ?? '';
        
        // Save provider first
        if (!$provider->save()) {
            throw new \Exception('Failed to save provider: ' . implode(', ', $provider->getMessages()));
        }
        
        // Update type-specific configuration
        if ($data['type'] === 'SIP') {
            self::saveSipConfiguration($provider, $data);
        } else {
            self::saveIaxConfiguration($provider, $data);
        }
        
        return $provider;
    }
    
    /**
     * Save SIP configuration
     * 
     * @param Providers $provider Provider model
     * @param array $data Configuration data
     * @throws \Exception
     */
    private static function saveSipConfiguration(Providers $provider, array $data): void
    {
        // Find or create SIP configuration
        $sip = $provider->Sip ?: new Sip();
        $sip->uniqid = $provider->uniqid;
        
        // Define boolean fields for SIP
        $booleanFields = ['disabled', 'qualify', 'disablefromuser', 'receive_calls_without_auth', 'cid_did_debug'];
        
        // Convert boolean fields using parent method
        $data = self::convertBooleanFields($data, $booleanFields);
        
        // Update fields
        $sip->disabled = $data['disabled'] ?? '0';
        $sip->username = $data['username'] ?? '';
        
        // Handle password update based on registration type
        if (isset($data['secret'])) {
            // For outbound registration, check if password is masked
            if ($data['registration_type'] === 'outbound' && $data['secret'] === 'XXXXXXXX') {
                // Don't update password if it's masked value for outbound
                // Keep existing password - do nothing
            } else {
                // Update password for all other cases
                $sip->secret = $data['secret'];
            }
        } elseif (!$provider->Sip) {
            // New provider - set empty password if not provided
            $sip->secret = '';
        }
        
        $sip->host = $data['host'] ?? '';
        $sip->port = (string)($data['port'] ?? 5060);
        $sip->transport = $data['transport'] ?? 'UDP';
        $sip->type = 'friend'; // Always use friend for providers
        $sip->qualify = $data['qualify'] ?? '0';
        $sip->qualifyfreq = (string)($data['qualifyfreq'] ?? 60);
        $sip->registration_type = $data['registration_type'] ?? 'none';
        $sip->extension = ''; // Always empty for providers
        $sip->description = $data['description'] ?? '';
        // Handle network filter: 'none' means empty string in DB
        $networkfilterid = $data['networkfilterid'] ?? 'none';
        $sip->networkfilterid = ($networkfilterid === 'none' || $networkfilterid === '') ? '' : $networkfilterid;
        $sip->manualattributes = $data['manualattributes'] ?? '';
        $sip->dtmfmode = $data['dtmfmode'] ?? 'auto';
        $sip->nat = 'auto_force'; // Always use auto_force for providers
        $sip->fromuser = $data['fromuser'] ?? '';
        $sip->fromdomain = $data['fromdomain'] ?? '';
        $sip->outbound_proxy = $data['outbound_proxy'] ?? '';
        $sip->disablefromuser = $data['disablefromuser'] ?? '0';
        $sip->noregister = '0'; // Always 0 for providers
        $sip->receive_calls_without_auth = $data['receive_calls_without_auth'] ?? '0';
        
        // CallerID and DID source fields
        $sip->cid_source = $data['cid_source'] ?? Sip::CALLERID_SOURCE_DEFAULT;
        $sip->cid_custom_header = $data['cid_custom_header'] ?? '';
        $sip->cid_parser_start = $data['cid_parser_start'] ?? '';
        $sip->cid_parser_end = $data['cid_parser_end'] ?? '';
        $sip->cid_parser_regex = $data['cid_parser_regex'] ?? '';
        $sip->did_source = $data['did_source'] ?? Sip::DID_SOURCE_DEFAULT;
        $sip->did_custom_header = $data['did_custom_header'] ?? '';
        $sip->did_parser_start = $data['did_parser_start'] ?? '';
        $sip->did_parser_end = $data['did_parser_end'] ?? '';
        $sip->did_parser_regex = $data['did_parser_regex'] ?? '';
        $sip->cid_did_debug = $data['cid_did_debug'] ?? '0';
        
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
     * @throws \Exception
     */
    private static function saveIaxConfiguration(Providers $provider, array $data): void
    {
        // Find or create IAX configuration
        $iax = $provider->Iax ?: new Iax();
        $iax->uniqid = $provider->uniqid;
        
        // Define boolean fields for IAX
        $booleanFields = ['disabled', 'receive_calls_without_auth'];
        
        // Convert boolean fields using parent method
        $data = self::convertBooleanFields($data, $booleanFields);
        
        // Update fields
        $iax->disabled = $data['disabled'] ?? '0';
        $iax->username = $data['username'] ?? '';
        
        // Handle password update based on registration type
        if (isset($data['secret'])) {
            // For outbound registration, check if password is masked
            if ($data['registration_type'] === 'outbound' && $data['secret'] === 'XXXXXXXX') {
                // Don't update password if it's masked value for outbound
                // Keep existing password - do nothing
            } else {
                // Update password for all other cases
                $iax->secret = $data['secret'];
            }
        } elseif (!$provider->Iax) {
            // New provider - set empty password if not provided
            $iax->secret = '';
        }
        
        $iax->host = $data['host'] ?? '';
        $iax->port = (string)($data['port'] ?? 4569);
        $iax->qualify = '1'; // Always enabled for providers
        $iax->registration_type = $data['registration_type'] ?? 'none';
        $iax->description = $data['description'] ?? '';
        $iax->manualattributes = $data['manualattributes'] ?? '';
        $iax->noregister = '0'; // Always 0 for providers
        $iax->receive_calls_without_auth = $data['receive_calls_without_auth'] ?? '0';
        $networkfilterid = $data['networkfilterid'] ?? 'none';
        $iax->networkfilterid = ($networkfilterid === 'none' || $networkfilterid === '') ? '' : $networkfilterid;
        
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
}