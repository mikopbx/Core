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
        
        // Define sanitization rules based on provider type
        $providerType = strtoupper($data['type'] ?? 'SIP');
        
        // Common sanitization rules
        $sanitizationRules = [
            'id' => 'int',
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
            $boolFields = ['disabled', 'qualify', 'disablefromuser', 'noregister', 'receive_calls_without_auth'];
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
            
            // Save in transaction
            $savedProvider = self::executeInTransaction(function() use ($sanitizedData) {
                return self::saveProviderInTransaction($sanitizedData);
            });
            
            $res->data = DataStructure::createFromModel($savedProvider);
            $res->success = true;
            
            // Only set reload for new records
            if (empty($data['id'])) {
                $res->reload = "providers/modify{$savedProvider->type}/{$savedProvider->uniqid}";
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
            
            // Find provider by uniqid
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
            'sipuid' => 'string|max:64',
            'disabled' => 'bool',
            'username' => 'string|max:64',
            'secret' => 'string|max:64',
            'host' => 'string|max:255',
            'port' => 'int',
            'transport' => 'string|upper|max:10',
            'qualify' => 'bool',
            'qualifyfreq' => 'int',
            'registration_type' => 'string|max:20',
            'extension' => 'string|max:32',
            'description' => 'string|sanitize|max:255',
            'networkfilterid' => 'string|max:64|empty_to_null',
            'manualattributes' => 'string|sanitize|max:1024|empty_to_null',
            'dtmfmode' => 'string|max:20',
            'nat' => 'string|max:20',
            'fromuser' => 'string|max:64|empty_to_null',
            'fromdomain' => 'string|max:255|empty_to_null',
            'outbound_proxy' => 'string|max:255|empty_to_null',
            'disablefromuser' => 'bool',
            'noregister' => 'bool',
            'receive_calls_without_auth' => 'bool',
            'additionalHosts' => 'array',
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
            'iaxuid' => 'string|max:64',
            'disabled' => 'bool',
            'username' => 'string|max:64',
            'secret' => 'string|max:64',
            'host' => 'string|max:255',
            'qualify' => 'bool',
            'registration_type' => 'string|max:20',
            'description' => 'string|sanitize|max:255',
            'manualattributes' => 'string|sanitize|max:1024|empty_to_null',
            'noregister' => 'bool',
        ];
    }
    
    /**
     * Save provider and configuration in transaction
     * 
     * @param array $data Sanitized data
     * @return Providers Saved provider model
     * @throws \Exception
     */
    private static function saveProviderInTransaction(array $data): Providers
    {
        // Find or create provider
        if (!empty($data['id'])) {
            $provider = Providers::findFirstById($data['id']);
            if (!$provider) {
                throw new \Exception('Provider not found');
            }
        } else {
            $provider = new Providers();
            $provider->uniqid = Providers::generateUniqueID($data['type'] . '-TRUNK-');
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
        
        // Update fields
        $sip->disabled = isset($data['disabled']) && $data['disabled'] ? '1' : '0';
        $sip->username = $data['username'] ?? '';
        $sip->secret = $data['secret'] ?? '';
        $sip->host = $data['host'] ?? '';
        $sip->port = (string)($data['port'] ?? 5060);
        $sip->transport = $data['transport'] ?? 'UDP';
        $sip->type = 'friend'; // Always use friend for providers
        $sip->qualify = isset($data['qualify']) && $data['qualify'] ? '1' : '0';
        $sip->qualifyfreq = (string)($data['qualifyfreq'] ?? 60);
        $sip->registration_type = $data['registration_type'] ?? 'none';
        $sip->extension = $data['extension'] ?? '';
        $sip->description = $data['description'] ?? '';
        // Handle network filter: 'none' means empty string in DB
        $networkfilterid = $data['networkfilterid'] ?? 'none';
        $sip->networkfilterid = ($networkfilterid === 'none' || $networkfilterid === '') ? '' : $networkfilterid;
        $sip->manualattributes = $data['manualattributes'] ?? '';
        $sip->dtmfmode = $data['dtmfmode'] ?? 'auto';
        $sip->nat = $data['nat'] ?? 'auto_force';
        $sip->fromuser = $data['fromuser'] ?? '';
        $sip->fromdomain = $data['fromdomain'] ?? '';
        $sip->outbound_proxy = $data['outbound_proxy'] ?? '';
        $sip->disablefromuser = isset($data['disablefromuser']) && $data['disablefromuser'] ? '1' : '0';
        $sip->noregister = isset($data['noregister']) && $data['noregister'] ? '1' : '0';
        $sip->receive_calls_without_auth = isset($data['receive_calls_without_auth']) && $data['receive_calls_without_auth'] ? '1' : '0';
        
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
        
        // Update fields
        $iax->disabled = isset($data['disabled']) && $data['disabled'] ? '1' : '0';
        $iax->username = $data['username'] ?? '';
        $iax->secret = $data['secret'] ?? '';
        $iax->host = $data['host'] ?? '';
        $iax->qualify = isset($data['qualify']) && $data['qualify'] ? '1' : '0';
        $iax->registration_type = $data['registration_type'] ?? 'none';
        $iax->description = $data['description'] ?? '';
        $iax->manualattributes = $data['manualattributes'] ?? '';
        $iax->noregister = isset($data['noregister']) && $data['noregister'] ? '1' : '0';
        
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