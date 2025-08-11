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

namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Models\SipHosts;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;

/**
 * Data structure for Providers
 * 
 * Handles data transformation for SIP and IAX providers
 * 
 * @package MikoPBX\PBXCoreREST\Lib\Providers
 */
class DataStructure extends AbstractDataStructure
{
    /**
     * Create complete data array from Provider model
     * 
     * @param Providers $provider Provider model
     * @return array Complete provider data structure
     */
    public static function createFromModel($provider): array
    {
        // Start with base structure
        $data = self::createBaseStructure($provider);
        
        // Add provider specific fields
        $data['type'] = $provider->type;
        $data['note'] = $provider->note ?? '';
        
        // Get type-specific configuration
        $configType = ucfirst(strtolower($provider->type));
        $config = $provider->$configType;
        
        if ($config) {
            if ($provider->type === 'SIP') {
                $data = array_merge($data, self::getSipData($config));
                $data['additionalHosts'] = self::getAdditionalHosts($config->uniqid);
            } else {
                $data = array_merge($data, self::getIaxData($config));
            }
        }
        
        // Handle null values for consistent JSON output
        $data = self::handleNullValues($data, ['note']);
        
        return $data;
    }
    
    /**
     * Create simplified data array for list view
     * 
     * @param Providers $provider Provider model
     * @return array Simplified provider data for list display
     */
    public static function createForList($provider): array
    {
        $data = self::createBaseStructure($provider);
        
        // Add essential fields for list display
        $data['type'] = $provider->type;
        $data['note'] = $provider->note ?? '';
        $data['disabled'] = false;
        $data['represent'] = '';
        
        // Get type-specific minimal data
        $configType = ucfirst(strtolower($provider->type));
        $config = $provider->$configType;
        
        if ($config) {
            $data['disabled'] = $config->disabled === '1';
            $data['represent'] = $config->getRepresent();
            $data['username'] = $config->username ?? '';
            $data['host'] = $config->host ?? '';
            
            if ($provider->type === 'SIP') {
                $data['registration_type'] = $config->registration_type ?? 'none';
                $data['transport'] = $config->transport ?? 'UDP';
                $data['port'] = (int)($config->port ?? 5060);
            } else {
                $data['registration_type'] = $config->registration_type ?? 'none';
            }
        }
        
        // Generate status class for UI
        $data['statusClass'] = $data['disabled'] ? 'grey' : '';
        
        return $data;
    }
    
    /**
     * Create data structure for dropdown/select options
     * 
     * @param Providers $provider Provider model
     * @return array Select option data
     */
    public static function createForSelect($provider): array
    {
        $configType = ucfirst(strtolower($provider->type));
        $config = $provider->$configType;
        
        return [
            'id' => (string)$provider->id,
            'uniqid' => $provider->uniqid,
            'type' => $provider->type,
            'name' => $config ? $config->getRepresent() : $provider->note,
            'disabled' => $config ? ($config->disabled === '1') : false,
            'represent' => $config ? $config->getRepresent() : $provider->note
        ];
    }
    
    /**
     * Extract SIP provider data from model
     * 
     * @param Sip|object $sip SIP configuration model or object
     * @return array SIP-specific data
     */
    private static function getSipData($sip): array
    {
        return [
            'sipuid' => $sip->uniqid,
            'disabled' => $sip->disabled === '1',
            'username' => $sip->username ?? '',
            'secret' => $sip->secret ?? '',
            'host' => $sip->host ?? '',
            'port' => (int)($sip->port ?? 5060),
            'transport' => $sip->transport ?? 'UDP',
            'type' => $sip->type ?? 'friend',
            'qualify' => $sip->qualify === '1',
            'qualifyfreq' => (int)($sip->qualifyfreq ?? 60),
            'registration_type' => $sip->registration_type ?? 'none',
            'extension' => $sip->extension ?? '',
            'description' => $sip->description ?? '',
            'networkfilterid' => (!empty($sip->networkfilterid) ? $sip->networkfilterid : 'none'),
            'manualattributes' => $sip->manualattributes ?? '',
            'dtmfmode' => $sip->dtmfmode ?? 'auto',
            'nat' => $sip->nat ?? 'auto_force',
            'fromuser' => $sip->fromuser ?? '',
            'fromdomain' => $sip->fromdomain ?? '',
            'outbound_proxy' => $sip->outbound_proxy ?? '',
            'disablefromuser' => $sip->disablefromuser === '1',
            'noregister' => $sip->noregister === '1',
            'receive_calls_without_auth' => $sip->receive_calls_without_auth === '1',
        ];
    }
    
    /**
     * Extract IAX provider data from model
     * 
     * @param Iax|object $iax IAX configuration model or object
     * @return array IAX-specific data
     */
    private static function getIaxData($iax): array
    {
        return [
            'iaxuid' => $iax->uniqid,
            'disabled' => $iax->disabled === '1',
            'username' => $iax->username ?? '',
            'secret' => $iax->secret ?? '',
            'host' => $iax->host ?? '',
            'qualify' => $iax->qualify === '1',
            'registration_type' => $iax->registration_type ?? 'none',
            'description' => $iax->description ?? '',
            'manualattributes' => $iax->manualattributes ?? '',
            'noregister' => $iax->noregister === '1'
        ];
    }
    
    /**
     * Get additional SIP hosts for provider
     * 
     * @param string $sipUniqid SIP unique identifier
     * @return array Array of additional hosts
     */
    private static function getAdditionalHosts(string $sipUniqid): array
    {
        $hosts = [];
        $sipHosts = SipHosts::find([
            'conditions' => 'provider_id = :uid:',
            'bind' => ['uid' => $sipUniqid],
            'order' => 'id ASC'
        ]);
        
        foreach ($sipHosts as $host) {
            $hosts[] = [
                'id' => (string)$host->id,
                'address' => $host->address
            ];
        }
        
        return $hosts;
    }
}