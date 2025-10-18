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

namespace MikoPBX\PBXCoreREST\Lib\Network;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for network configuration
 *
 * Creates consistent data format for API responses including network interfaces,
 * NAT settings, and port configurations.
 *
 * Implements Single Source of Truth pattern - all field definitions centralized
 * in getAllFieldDefinitions() to eliminate duplication.
 *
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Network
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * ✨ SINGLE SOURCE OF TRUTH - all network interface field definitions
     *
     * WHY: Centralizes field definitions to eliminate duplication between
     * request/response schemas and controller attributes.
     *
     * @return array<string, array<string, mixed>> Field definitions
     */
    private static function getAllFieldDefinitions(): array
    {
        return [
            // Interface identification
            'id' => [
                'type' => 'string',
                'description' => 'rest_schema_net_id',
                'pattern' => '^[0-9]+$',
                'readOnly' => true, // Auto-generated
                'example' => '1'
            ],

            // Interface configuration
            'interface' => [
                'type' => 'string',
                'description' => 'rest_schema_net_interface',
                'maxLength' => 50,
                'sanitize' => 'string',
                'required' => true,
                'example' => 'eth0'
            ],
            'name' => [
                'type' => 'string',
                'description' => 'rest_schema_net_name',
                'maxLength' => 100,
                'sanitize' => 'text',
                'example' => 'LAN Interface'
            ],
            'vlanid' => [
                'type' => 'string',
                'description' => 'rest_schema_net_vlanid',
                'pattern' => '^[0-9]{1,4}$',
                'sanitize' => 'string',
                'default' => '0',
                'example' => '100'
            ],

            // IP configuration
            'ipaddr' => [
                'type' => 'string',
                'description' => 'rest_schema_net_ipaddr',
                'pattern' => '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
                'sanitize' => 'string',
                'example' => '192.168.1.1'
            ],
            'subnet' => [
                'type' => 'string',
                'description' => 'rest_schema_net_subnet',
                'sanitize' => 'string',
                'default' => '24',
                'example' => '255.255.255.0'
            ],
            'gateway' => [
                'type' => 'string',
                'description' => 'rest_schema_net_gateway',
                'pattern' => '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
                'sanitize' => 'string',
                'example' => '192.168.1.254'
            ],
            'dhcp' => [
                'type' => 'string',
                'description' => 'rest_schema_net_dhcp',
                'enum' => ['0', '1'],
                'sanitize' => 'string',
                'default' => '0',
                'example' => '0'
            ],
            'internet' => [
                'type' => 'string',
                'description' => 'rest_schema_net_internet',
                'enum' => ['0', '1'],
                'sanitize' => 'string',
                'default' => '0',
                'example' => '1'
            ],
            'disabled' => [
                'type' => 'string',
                'description' => 'rest_schema_net_disabled',
                'enum' => ['0', '1'],
                'sanitize' => 'string',
                'default' => '0',
                'example' => '0'
            ],

            // DNS configuration
            'hostname' => [
                'type' => 'string',
                'description' => 'rest_schema_net_hostname',
                'maxLength' => 255,
                'sanitize' => 'string',
                'example' => 'mikopbx-server'
            ],
            'domain' => [
                'type' => 'string',
                'description' => 'rest_schema_net_domain',
                'maxLength' => 255,
                'sanitize' => 'string',
                'example' => 'example.com'
            ],
            'primarydns' => [
                'type' => 'string',
                'description' => 'rest_schema_net_primarydns',
                'pattern' => '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
                'sanitize' => 'string',
                'example' => '8.8.8.8'
            ],
            'secondarydns' => [
                'type' => 'string',
                'description' => 'rest_schema_net_secondarydns',
                'pattern' => '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
                'sanitize' => 'string',
                'example' => '8.8.4.4'
            ],

            // NAT configuration
            'topology' => [
                'type' => 'string',
                'description' => 'rest_schema_net_topology',
                'enum' => ['public', 'private'],
                'sanitize' => 'string',
                'example' => 'private'
            ],
            'extipaddr' => [
                'type' => 'string',
                'description' => 'rest_schema_net_extipaddr',
                'pattern' => '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
                'sanitize' => 'string',
                'example' => '203.0.113.1'
            ],
            'exthostname' => [
                'type' => 'string',
                'description' => 'rest_schema_net_exthostname',
                'maxLength' => 255,
                'sanitize' => 'string',
                'example' => 'pbx.example.com'
            ],

            // Derived fields (computed, read-only)
            'isDeletable' => [
                'type' => 'boolean',
                'description' => 'rest_schema_net_is_deletable',
                'readOnly' => true,
                'example' => false
            ],
            'isInternet' => [
                'type' => 'boolean',
                'description' => 'rest_schema_net_is_internet',
                'readOnly' => true,
                'example' => true
            ],
            'isDhcp' => [
                'type' => 'boolean',
                'description' => 'rest_schema_net_is_dhcp',
                'readOnly' => true,
                'example' => false
            ],
        ];
    }
    /**
     * Get OpenAPI schema for network interface list item
     *
     * ✨ Inherits field definitions from getAllFieldDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by GetListAction.
     * Used for GET /api/v3/network endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // ✨ Select list-specific fields (NO duplication!)
        $listFields = ['id', 'interface', 'name', 'vlanid', 'ipaddr', 'subnet', 'gateway', 'dhcp', 'internet', 'isDeletable', 'isInternet', 'isDhcp'];
        $properties = array_intersect_key($allFields, array_flip($listFields));

        return [
            'type' => 'object',
            'required' => ['id', 'interface', 'name'],
            'description' => 'rest_schema_net_interface_list_item',
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed network interface record
     *
     * ✨ Inherits from getParameterDefinitions()['related'] - Single Source of Truth.
     * This schema matches the structure returned by GetRecordAction.
     * Used for GET /api/v3/network/{id} endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        return $definitions['related']['NetworkInterface'] ?? [];
    }


    /**
     * Get default value for a field from Single Source of Truth
     *
     * WHY: Eliminates duplication by using PbxSettingsDefaultValuesTrait.
     * Ensures consistency across the entire application.
     *
     * @param string $fieldName The PbxSettings constant name
     * @return mixed The default value from PbxSettingsDefaultValuesTrait
     */
    public static function getDefaultValue(string $fieldName): mixed
    {
        $defaults = PbxSettings::getDefaultArrayValues();
        return $defaults[$fieldName] ?? null;
    }

    /**
     * Get OpenAPI schema for complete network configuration
     *
     * This schema matches the structure returned by GetConfigAction.
     * Used for GET /api/v3/network:getConfig endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getConfigSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['interfaces', 'nat', 'ports'],
            'description' => 'rest_schema_net_config',
            'properties' => [
                'interfaces' => [
                    'type' => 'array',
                    'description' => 'rest_schema_net_config_interfaces',
                    'items' => [
                        '$ref' => '#/components/schemas/NetworkInterface'
                    ]
                ],
                'template' => [
                    'type' => 'object',
                    'description' => 'rest_schema_net_config_template',
                    'additionalProperties' => true
                ],
                'internetInterfaceId' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_net_config_internet_interface_id',
                    'example' => 1
                ],
                'deletableInterfaces' => [
                    'type' => 'array',
                    'description' => 'rest_schema_net_config_deletable_interfaces',
                    'items' => [
                        'type' => 'string'
                    ],
                    'example' => ['eth0', 'eth1']
                ],
                'nat' => [
                    'type' => 'object',
                    'description' => 'rest_schema_net_config_nat',
                    'properties' => [
                        'usenat' => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_net_nat_usenat',
                            'example' => true
                        ],
                        'extipaddr' => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_nat_extipaddr',
                            'example' => '203.0.113.1'
                        ],
                        'exthostname' => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_nat_exthostname',
                            'example' => 'pbx.example.com'
                        ],
                        'AUTO_UPDATE_EXTERNAL_IP' => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_net_nat_auto_update',
                            'example' => false
                        ],
                    ]
                ],
                'ports' => [
                    'type' => 'object',
                    'description' => 'rest_schema_net_config_ports',
                    'properties' => [
                        PbxSettings::SIP_PORT => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_ports_sip',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'example' => (string)self::getDefaultValue(PbxSettings::SIP_PORT),
                            'default' => (string)self::getDefaultValue(PbxSettings::SIP_PORT)
                        ],
                        PbxSettings::EXTERNAL_SIP_PORT => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_ports_external_sip',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'example' => (string)self::getDefaultValue(PbxSettings::EXTERNAL_SIP_PORT),
                            'default' => (string)self::getDefaultValue(PbxSettings::EXTERNAL_SIP_PORT)
                        ],
                        PbxSettings::TLS_PORT => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_ports_tls',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'example' => (string)self::getDefaultValue(PbxSettings::TLS_PORT),
                            'default' => (string)self::getDefaultValue(PbxSettings::TLS_PORT)
                        ],
                        PbxSettings::EXTERNAL_TLS_PORT => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_ports_external_tls',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'example' => (string)self::getDefaultValue(PbxSettings::EXTERNAL_TLS_PORT),
                            'default' => (string)self::getDefaultValue(PbxSettings::EXTERNAL_TLS_PORT)
                        ],
                        PbxSettings::RTP_PORT_FROM => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_ports_rtp_from',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'example' => (string)self::getDefaultValue(PbxSettings::RTP_PORT_FROM),
                            'default' => (string)self::getDefaultValue(PbxSettings::RTP_PORT_FROM)
                        ],
                        PbxSettings::RTP_PORT_TO => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_ports_rtp_to',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'example' => (string)self::getDefaultValue(PbxSettings::RTP_PORT_TO),
                            'default' => (string)self::getDefaultValue(PbxSettings::RTP_PORT_TO)
                        ],
                    ]
                ],
                'isDocker' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_net_config_is_docker',
                    'example' => false
                ],
                'staticRoutes' => [
                    'type' => 'array',
                    'description' => 'rest_schema_net_config_static_routes',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => [
                                'type' => 'string',
                                'description' => 'rest_schema_net_route_id',
                                'example' => '1'
                            ],
                            'network' => [
                                'type' => 'string',
                                'description' => 'rest_schema_net_route_network',
                                'pattern' => '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
                                'example' => '192.168.10.0'
                            ],
                            'subnet' => [
                                'type' => 'string',
                                'description' => 'rest_schema_net_route_subnet',
                                'pattern' => '^[0-9]{1,2}$',
                                'example' => '24'
                            ],
                            'gateway' => [
                                'type' => 'string',
                                'description' => 'rest_schema_net_route_gateway',
                                'pattern' => '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
                                'example' => '192.168.1.1'
                            ],
                            'interface' => [
                                'type' => 'string',
                                'description' => 'rest_schema_net_route_interface',
                                'example' => 'eth0'
                            ],
                            'description' => [
                                'type' => 'string',
                                'description' => 'rest_schema_net_route_description',
                                'maxLength' => 255,
                                'example' => 'Route for office network'
                            ],
                            'priority' => [
                                'type' => 'integer',
                                'description' => 'rest_schema_net_route_priority',
                                'example' => 1
                            ]
                        ]
                    ]
                ],
            ]
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * ✨ Inherits from getParameterDefinitions()['related'] - Single Source of Truth.
     * Returns schemas for nested objects used in network responses.
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        $definitions = self::getParameterDefinitions();
        return $definitions['related'] ?? [];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes network configuration parameter definitions.
     * Network resource handles interface configuration, NAT settings, and DNS management.
     * Uses getAllFieldDefinitions() to eliminate duplication.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // Filter writable fields (exclude readOnly)
        $writableFields = array_filter($allFields, fn($f) => empty($f['readOnly']));

        return [
            'request' => $writableFields + [
                // Additional bulk configuration fields (not part of single interface)
                'interfaces' => [
                    'type' => 'array',
                    'description' => 'rest_param_net_interfaces',
                    'sanitize' => 'array',
                    'example' => [['id' => '1', 'dhcp' => true]]
                ],
                'staticRoutes' => [
                    'type' => 'array',
                    'description' => 'rest_param_net_static_routes',
                    'sanitize' => 'array',
                    'example' => [[
                        'network' => '192.168.10.0',
                        'subnet' => '24',
                        'gateway' => '192.168.1.1',
                        'interface' => '',
                        'description' => 'Office network route'
                    ]]
                ]
            ],
            'response' => $allFields,
            // ========== RELATED SCHEMAS ==========
            'related' => [
                // Complete network interface schema
                // ✨ Inherits ALL fields from getAllFieldDefinitions() - Single Source of Truth
                'NetworkInterface' => [
                    'type' => 'object',
                    'required' => ['id', 'interface', 'name'],
                    'description' => 'rest_schema_net_interface_detail',
                    'properties' => $allFields
                ]
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}
