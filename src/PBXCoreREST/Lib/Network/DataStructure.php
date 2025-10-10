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

use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for network configuration
 *
 * Creates consistent data format for API responses including network interfaces,
 * NAT settings, and port configurations.
 *
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Network
 */
class DataStructure implements OpenApiSchemaProvider
{
    /**
     * Get OpenAPI schema for network interface list item
     *
     * This schema matches the structure returned by GetListAction.
     * Used for GET /api/v3/network endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'interface', 'name'],
            'description' => 'rest_schema_net_interface_list_item',
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_id',
                    'example' => '1'
                ],
                'interface' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_interface',
                    'maxLength' => 50,
                    'example' => 'eth0'
                ],
                'name' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_name',
                    'maxLength' => 100,
                    'example' => 'LAN Interface'
                ],
                'vlanid' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_vlanid',
                    'pattern' => '^[0-9]{1,4}$',
                    'example' => '4095'
                ],
                'ipaddr' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_ipaddr',
                    'pattern' => '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
                    'example' => '192.168.1.1'
                ],
                'subnet' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_subnet',
                    'example' => '255.255.255.0'
                ],
                'gateway' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_gateway',
                    'pattern' => '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
                    'example' => '192.168.1.254'
                ],
                'dhcp' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_dhcp',
                    'enum' => ['0', '1'],
                    'example' => '0'
                ],
                'internet' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_internet',
                    'enum' => ['0', '1'],
                    'example' => '1'
                ],
                'isDeletable' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_net_is_deletable',
                    'example' => false
                ],
                'isInternet' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_net_is_internet',
                    'example' => true
                ],
                'isDhcp' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_net_is_dhcp',
                    'example' => false
                ],
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed network interface record
     *
     * This schema matches the structure returned by GetRecordAction.
     * Used for GET /api/v3/network/{id} endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'interface', 'name'],
            'description' => 'rest_schema_net_interface_detail',
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_id',
                    'example' => '1'
                ],
                'interface' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_interface',
                    'maxLength' => 50,
                    'example' => 'eth0'
                ],
                'name' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_name',
                    'maxLength' => 100,
                    'example' => 'LAN Interface'
                ],
                'vlanid' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_vlanid',
                    'pattern' => '^[0-9]{1,4}$',
                    'example' => '4095'
                ],
                'ipaddr' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_ipaddr',
                    'pattern' => '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
                    'example' => '192.168.1.1'
                ],
                'subnet' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_subnet',
                    'example' => '255.255.255.0'
                ],
                'gateway' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_gateway',
                    'pattern' => '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
                    'example' => '192.168.1.254'
                ],
                'hostname' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_hostname',
                    'maxLength' => 255,
                    'example' => 'mikopbx-server'
                ],
                'domain' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_domain',
                    'maxLength' => 255,
                    'example' => 'example.com'
                ],
                'primarydns' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_primarydns',
                    'pattern' => '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
                    'example' => '8.8.8.8'
                ],
                'secondarydns' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_secondarydns',
                    'pattern' => '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
                    'example' => '8.8.4.4'
                ],
                'dhcp' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_dhcp',
                    'enum' => ['0', '1'],
                    'example' => '0'
                ],
                'internet' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_internet',
                    'enum' => ['0', '1'],
                    'example' => '1'
                ],
                'disabled' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_disabled',
                    'enum' => ['0', '1'],
                    'example' => '0'
                ],
                'topology' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_topology',
                    'enum' => ['public', 'private'],
                    'example' => 'private'
                ],
                'extipaddr' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_extipaddr',
                    'pattern' => '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
                    'example' => '203.0.113.1'
                ],
                'exthostname' => [
                    'type' => 'string',
                    'description' => 'rest_schema_net_exthostname',
                    'maxLength' => 255,
                    'example' => 'pbx.example.com'
                ],
            ]
        ];
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
            'required' => ['interfaces', 'nat', 'ports', 'settings'],
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
                        'SIP_PORT' => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_ports_sip',
                            'example' => '5060'
                        ],
                        'EXTERNAL_SIP_PORT' => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_ports_external_sip',
                            'example' => '5060'
                        ],
                        'TLS_PORT' => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_ports_tls',
                            'example' => '5061'
                        ],
                        'EXTERNAL_TLS_PORT' => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_ports_external_tls',
                            'example' => '5061'
                        ],
                        'RTP_PORT_FROM' => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_ports_rtp_from',
                            'example' => '10000'
                        ],
                        'RTP_PORT_TO' => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_ports_rtp_to',
                            'example' => '10200'
                        ],
                    ]
                ],
                'settings' => [
                    'type' => 'object',
                    'description' => 'rest_schema_net_config_settings',
                    'properties' => [
                        'hostname' => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_settings_hostname',
                            'example' => 'mikopbx-server'
                        ],
                        'domain' => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_settings_domain',
                            'example' => 'example.com'
                        ],
                        'gateway' => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_settings_gateway',
                            'example' => '192.168.1.254'
                        ],
                        'primarydns' => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_settings_primarydns',
                            'example' => '8.8.8.8'
                        ],
                        'secondarydns' => [
                            'type' => 'string',
                            'description' => 'rest_schema_net_settings_secondarydns',
                            'example' => '8.8.4.4'
                        ],
                    ]
                ],
                'isDocker' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_net_config_is_docker',
                    'example' => false
                ],
            ]
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * Returns schemas for nested objects used in network responses.
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        return [
            'NetworkInterface' => self::getDetailSchema()
        ];
    }

    /**
     * Generate sanitization rules automatically from controller attributes
     *
     * Uses ParameterSanitizationExtractor to extract rules from #[ApiParameter] attributes.
     * This ensures Single Source of Truth - rules defined only in controller attributes.
     *
     * @return array<string, string> Sanitization rules in format 'field' => 'type|constraint:value'
     */
    public static function getSanitizationRules(): array
    {
        return \MikoPBX\PBXCoreREST\Lib\Common\ParameterSanitizationExtractor::extractFromController(
            \MikoPBX\PBXCoreREST\Controllers\Network\RestController::class,
            'saveConfig'
        );
    }
}
