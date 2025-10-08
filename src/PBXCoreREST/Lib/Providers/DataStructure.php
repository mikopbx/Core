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
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for Providers with OpenAPI schema support
 *
 * Handles data transformation for SIP and IAX providers.
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Providers
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
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
        
        // Override id with uniqid for API consistency
        $data['id'] = $provider->uniqid;
        
        // Remove fields not needed for providers
        unset($data['extension']);
        unset($data['uniqid']);  // Remove uniqid from API response
        
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
        
        // Override id with uniqid for API consistency
        $data['id'] = $provider->uniqid;
        
        // Remove fields not needed for providers
        unset($data['extension']);
        unset($data['uniqid']);  // Remove uniqid from API response
        
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
                $data['port'] = (int)($config->port ?? 4569);
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
            'id' => $provider->uniqid,  // Use uniqid as id for API consistency
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
        // Mask password only for outbound registration
        $secret = $sip->secret ?? '';
        if (!empty($secret) && $sip->registration_type === 'outbound') {
            $secret = 'XXXXXXXX';
        }
        
        // Get network filter representation using unified helper
        $networkfilterRepresent = self::getNetworkFilterRepresentation($sip->networkfilterid);
        
        return [
            'disabled' => $sip->disabled === '1',
            'username' => $sip->username ?? '',
            'secret' => $secret,
            'host' => $sip->host ?? '',
            'port' => (int)($sip->port ?? 5060),
            'transport' => $sip->transport ?? 'UDP',
            'qualify' => $sip->qualify === '1',
            'qualifyfreq' => (int)($sip->qualifyfreq ?? 60),
            'registration_type' => $sip->registration_type ?? 'none',
            'description' => $sip->description ?? '',
            'networkfilterid' => (!empty($sip->networkfilterid) ? $sip->networkfilterid : 'none'),
            'networkfilter_represent' => $networkfilterRepresent,
            'manualattributes' => $sip->manualattributes ?? '',
            'dtmfmode' => $sip->dtmfmode ?? 'auto',
            'fromuser' => $sip->fromuser ?? '',
            'fromdomain' => $sip->fromdomain ?? '',
            'outbound_proxy' => $sip->outbound_proxy ?? '',
            'disablefromuser' => $sip->disablefromuser === '1',
            'receive_calls_without_auth' => $sip->receive_calls_without_auth === '1',
            // CallerID and DID source fields
            'cid_source' => $sip->cid_source ?? Sip::CALLERID_SOURCE_DEFAULT,
            'cid_custom_header' => $sip->cid_custom_header ?? '',
            'cid_parser_start' => $sip->cid_parser_start ?? '',
            'cid_parser_end' => $sip->cid_parser_end ?? '',
            'cid_parser_regex' => $sip->cid_parser_regex ?? '',
            'did_source' => $sip->did_source ?? Sip::DID_SOURCE_DEFAULT,
            'did_custom_header' => $sip->did_custom_header ?? '',
            'did_parser_start' => $sip->did_parser_start ?? '',
            'did_parser_end' => $sip->did_parser_end ?? '',
            'did_parser_regex' => $sip->did_parser_regex ?? '',
            'cid_did_debug' => $sip->cid_did_debug === '1',
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
        // Mask password only for outbound registration
        $secret = $iax->secret ?? '';
        if (!empty($secret) && $iax->registration_type === 'outbound') {
            $secret = 'XXXXXXXX';
        }
        
        // Get network filter representation using unified helper
        $networkfilterRepresent = self::getNetworkFilterRepresentation($iax->networkfilterid);
        
        return [
            'disabled' => $iax->disabled === '1',
            'username' => $iax->username ?? '',
            'secret' => $secret,
            'host' => $iax->host ?? '',
            'port' => (int)($iax->port ?? 4569),
            'registration_type' => $iax->registration_type ?? 'none',
            'description' => $iax->description ?? '',
            'manualattributes' => $iax->manualattributes ?? '',
            'networkfilterid' => (!empty($iax->networkfilterid) ? $iax->networkfilterid : 'none'),
            'networkfilter_represent' => $networkfilterRepresent,
            'receive_calls_without_auth' => $iax->receive_calls_without_auth === '1'
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

    /**
     * Get OpenAPI schema for provider list item
     *
     * This schema matches the structure returned by createForList() method.
     * Works for both SIP and IAX providers.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'type', 'disabled'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_id',
                    'example' => 'SIP-PROVIDER-12345'
                ],
                'type' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_type',
                    'enum' => ['SIP', 'IAX'],
                    'example' => 'SIP'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_description',
                    'maxLength' => 255,
                    'example' => 'Main SIP Trunk'
                ],
                'note' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_note',
                    'maxLength' => 500,
                    'example' => 'Provider notes'
                ],
                'disabled' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_provider_disabled',
                    'example' => false
                ],
                'username' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_username',
                    'maxLength' => 100,
                    'example' => 'trunk001'
                ],
                'host' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_host',
                    'maxLength' => 255,
                    'example' => 'sip.provider.com'
                ],
                'port' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_provider_port',
                    'minimum' => 1,
                    'maximum' => 65535,
                    'example' => 5060
                ],
                'registration_type' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_registration_type',
                    'enum' => ['none', 'outbound', 'inbound'],
                    'example' => 'outbound'
                ],
                'transport' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_transport',
                    'enum' => ['UDP', 'TCP', 'TLS', 'UDP,TCP', 'UDP,TCP,TLS'],
                    'example' => 'UDP'
                ],
                'represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_represent',
                    'example' => '<i class="globe icon"></i> Main SIP Trunk'
                ],
                'statusClass' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_status_class',
                    'example' => ''
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed provider record
     *
     * This schema is polymorphic - contains both SIP and IAX specific fields.
     * The 'type' field determines which fields are relevant.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'type'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_id',
                    'example' => 'SIP-PROVIDER-12345'
                ],
                'type' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_type',
                    'enum' => ['SIP', 'IAX'],
                    'example' => 'SIP'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_description',
                    'maxLength' => 255,
                    'example' => 'Main SIP Trunk'
                ],
                'note' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_note',
                    'maxLength' => 500,
                    'example' => 'Additional notes'
                ],
                'disabled' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_provider_disabled',
                    'example' => false
                ],
                'username' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_username',
                    'maxLength' => 100,
                    'example' => 'trunk001'
                ],
                'secret' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_secret',
                    'maxLength' => 100,
                    'example' => 'SecurePass123'
                ],
                'host' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_host',
                    'maxLength' => 255,
                    'example' => 'sip.provider.com'
                ],
                'port' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_provider_port',
                    'minimum' => 1,
                    'maximum' => 65535,
                    'example' => 5060
                ],
                'registration_type' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_registration_type',
                    'enum' => ['none', 'outbound', 'inbound'],
                    'example' => 'outbound'
                ],
                'manualattributes' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_manualattributes',
                    'example' => 'context=from-trunk\nallow=ulaw,alaw'
                ],
                'networkfilterid' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_networkfilterid',
                    'pattern' => '^([0-9]+|none)$',
                    'example' => '1'
                ],
                'networkfilter_represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_networkfilter_represent',
                    'example' => '<i class="filter icon"></i> Office Network'
                ],
                'receive_calls_without_auth' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_provider_receive_without_auth',
                    'default' => false,
                    'example' => true
                ],
                // SIP-specific fields
                'transport' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_transport',
                    'enum' => ['UDP', 'TCP', 'TLS', 'UDP,TCP', 'UDP,TCP,TLS'],
                    'example' => 'UDP'
                ],
                'qualify' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_provider_qualify',
                    'default' => true,
                    'example' => true
                ],
                'qualifyfreq' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_provider_qualifyfreq',
                    'minimum' => 10,
                    'maximum' => 3600,
                    'default' => 60,
                    'example' => 60
                ],
                'dtmfmode' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_dtmfmode',
                    'enum' => ['auto', 'auto_info', 'inband', 'rfc2833', 'info'],
                    'default' => 'auto',
                    'example' => 'rfc2833'
                ],
                'fromuser' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_fromuser',
                    'maxLength' => 100,
                    'example' => 'customuser'
                ],
                'fromdomain' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_fromdomain',
                    'maxLength' => 255,
                    'example' => 'mydomain.com'
                ],
                'outbound_proxy' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_outbound_proxy',
                    'maxLength' => 255,
                    'example' => 'proxy.provider.com:5060'
                ],
                'disablefromuser' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_provider_disablefromuser',
                    'default' => false,
                    'example' => false
                ],
                // CallerID and DID source fields (SIP only)
                'cid_source' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_cid_source',
                    'example' => 'default'
                ],
                'cid_custom_header' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_cid_custom_header',
                    'maxLength' => 100,
                    'example' => 'X-CallerID'
                ],
                'cid_parser_start' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_cid_parser_start',
                    'maxLength' => 50,
                    'example' => '<'
                ],
                'cid_parser_end' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_cid_parser_end',
                    'maxLength' => 50,
                    'example' => '>'
                ],
                'cid_parser_regex' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_cid_parser_regex',
                    'maxLength' => 255,
                    'example' => '/(\d+)/'
                ],
                'did_source' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_did_source',
                    'example' => 'default'
                ],
                'did_custom_header' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_did_custom_header',
                    'maxLength' => 100,
                    'example' => 'X-DID'
                ],
                'did_parser_start' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_did_parser_start',
                    'maxLength' => 50,
                    'example' => '<'
                ],
                'did_parser_end' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_did_parser_end',
                    'maxLength' => 50,
                    'example' => '>'
                ],
                'did_parser_regex' => [
                    'type' => 'string',
                    'description' => 'rest_schema_provider_did_parser_regex',
                    'maxLength' => 255,
                    'example' => '/(\d+)/'
                ],
                'cid_did_debug' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_provider_cid_did_debug',
                    'default' => false,
                    'example' => false
                ],
                'additionalHosts' => [
                    'type' => 'array',
                    'description' => 'rest_schema_provider_additional_hosts',
                    'items' => [
                        '$ref' => '#/components/schemas/ProviderHost'
                    ],
                    'example' => [
                        ['id' => '1', 'address' => 'backup.provider.com']
                    ]
                ]
            ]
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        return [
            'ProviderHost' => [
                'type' => 'object',
                'required' => ['id', 'address'],
                'properties' => [
                    'id' => [
                        'type' => 'string',
                        'description' => 'rest_schema_provider_host_id',
                        'example' => '1'
                    ],
                    'address' => [
                        'type' => 'string',
                        'description' => 'rest_schema_provider_host_address',
                        'maxLength' => 255,
                        'example' => 'backup.provider.com'
                    ]
                ]
            ]
        ];
    }

    /**
     * Generate sanitization rules from OpenAPI schema
     *
     * Note: Rules are kept minimal for providers as they have complex polymorphic structure.
     *
     * @return array<string, string> Sanitization rules
     */
    public static function getSanitizationRules(): array
    {
        return [
            'type' => 'string|in:SIP,IAX',
            'description' => 'string|max:255',
            'note' => 'string|max:500',
            'disabled' => 'bool',
            'username' => 'string|max:100',
            'secret' => 'string|max:100',
            'host' => 'string|max:255',
            'port' => 'int|min:1|max:65535',
            'registration_type' => 'string|in:none,outbound,inbound',
            'networkfilterid' => 'string',
            'receive_calls_without_auth' => 'bool',
            // SIP specific
            'transport' => 'string',
            'qualify' => 'bool',
            'qualifyfreq' => 'int|min:10|max:3600',
            'dtmfmode' => 'string|in:auto,auto_info,inband,rfc2833,info',
            'disablefromuser' => 'bool',
            'cid_did_debug' => 'bool'
        ];
    }
}