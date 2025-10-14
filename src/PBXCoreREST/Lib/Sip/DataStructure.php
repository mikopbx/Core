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

namespace MikoPBX\PBXCoreREST\Lib\Sip;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for SIP device monitoring
 *
 * Creates consistent data format for SIP peer status, registry, and statistics responses.
 * SIP monitoring is read-only - configuration is managed via Extensions API.
 *
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Sip
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Get OpenAPI schema for SIP peer status (list item)
     *
     * ✨ Inherits from getParameterDefinitions()['related'] section - Single Source of Truth.
     * This schema matches the structure returned by GetPeersStatusesAction.
     * Used for GET /api/v3/sip:getStatuses and :getPeersStatuses endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        return $definitions['related']['SipPeerStatus'] ?? [];
    }

    /**
     * Get OpenAPI schema for detailed SIP peer status
     *
     * ✨ Inherits from getParameterDefinitions()['related'] section - Single Source of Truth.
     * This schema matches the structure returned by GetPeerStatusAction.
     * Used for GET /api/v3/sip:getStatus/{extension} endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        return $definitions['related']['SipPeerDetail'] ?? [];
    }

    /**
     * Get OpenAPI schema for SIP registry status
     *
     * ✨ Inherits from getParameterDefinitions()['related'] section - Single Source of Truth.
     * This schema matches the structure returned by GetRegistryAction.
     * Used for GET /api/v3/sip:getRegistry endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getRegistrySchema(): array
    {
        $definitions = self::getParameterDefinitions();
        return $definitions['related']['SipRegistryItem'] ?? [];
    }

    /**
     * Get OpenAPI schema for SIP connection history
     *
     * ✨ Inherits from getParameterDefinitions()['related'] section - Single Source of Truth.
     * Used for GET /api/v3/sip:getHistory/{extension} endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getHistorySchema(): array
    {
        $definitions = self::getParameterDefinitions();
        return $definitions['related']['SipHistoryItem'] ?? [];
    }

    /**
     * Get OpenAPI schema for SIP statistics
     *
     * ✨ Inherits from getParameterDefinitions()['related'] section - Single Source of Truth.
     * Used for GET /api/v3/sip:getStats/{extension} endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getStatsSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        return $definitions['related']['SipStats'] ?? [];
    }

    /**
     * Get OpenAPI schema for SIP secret
     *
     * ✨ Inherits from getParameterDefinitions()['related'] section - Single Source of Truth.
     * Used for GET /api/v3/sip:getSecret/{extension} endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getSecretSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        return $definitions['related']['SipSecret'] ?? [];
    }

    /**
     * Get OpenAPI schema for authentication failure statistics
     *
     * ✨ Inherits from getParameterDefinitions()['related'] section - Single Source of Truth.
     * Used for GET /api/v3/sip:getAuthFailureStats/{extension} endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getAuthFailureStatsSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        return $definitions['related']['SipAuthFailureStats'] ?? [];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * ✨ Inherits from getParameterDefinitions()['related'] section - Single Source of Truth.
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
     * WHY: Centralizes SIP monitoring parameter definitions.
     * SIP resource provides read-only access to SIP peer status, registry, and statistics.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                // Extension/peer identification
                'extension' => [
                    'type' => 'string',
                    'description' => 'rest_param_sip_extension',
                    'pattern' => '^[0-9]{2,10}$',
                    'sanitize' => 'string',
                    'example' => '201'
                ],
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_param_sip_id',
                    'pattern' => '^SIP-[A-Z0-9]{8,32}$',
                    'sanitize' => 'string',
                    'example' => 'SIP-201'
                ],
                // Query parameters for history filtering
                'dateFrom' => [
                    'type' => 'string',
                    'description' => 'rest_param_sip_date_from',
                    'format' => 'date-time',
                    'sanitize' => 'string',
                    'example' => '2025-01-01T00:00:00'
                ],
                'dateTo' => [
                    'type' => 'string',
                    'description' => 'rest_param_sip_date_to',
                    'format' => 'date-time',
                    'sanitize' => 'string',
                    'example' => '2025-01-31T23:59:59'
                ],
                'event' => [
                    'type' => 'string',
                    'description' => 'rest_param_sip_event',
                    'enum' => ['REGISTER', 'UNREGISTER', 'CALL', 'HANGUP'],
                    'sanitize' => 'string',
                    'example' => 'REGISTER'
                ],
                // Pagination parameters
                'limit' => [
                    'type' => 'integer',
                    'description' => 'rest_param_limit',
                    'minimum' => 1,
                    'maximum' => 1000,
                    'default' => 50,
                    'sanitize' => 'int',
                    'example' => 50
                ],
                'offset' => [
                    'type' => 'integer',
                    'description' => 'rest_param_offset',
                    'minimum' => 0,
                    'default' => 0,
                    'sanitize' => 'int',
                    'example' => 0
                ]
            ],
            'response' => [
                // Peer status fields
                'state' => [
                    'type' => 'string',
                    'description' => 'rest_schema_sip_peer_state',
                    'enum' => ['OK', 'UNREACHABLE', 'LAGGED', 'UNKNOWN', 'OFF', 'REGISTERED']
                ],
                'useragent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_sip_peer_useragent'
                ],
                'ipaddress' => [
                    'type' => 'string',
                    'description' => 'rest_schema_sip_peer_ipaddress'
                ],
                'port' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_sip_peer_port'
                ],
                // Registry fields
                'username' => [
                    'type' => 'string',
                    'description' => 'rest_schema_sip_registry_username'
                ],
                'host' => [
                    'type' => 'string',
                    'description' => 'rest_schema_sip_registry_host'
                ],
                // Statistics fields
                'totalCalls' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_sip_stats_total_calls'
                ],
                'successfulCalls' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_sip_stats_successful_calls'
                ],
                'failedCalls' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_sip_stats_failed_calls'
                ],
                // Secret field
                'secret' => [
                    'type' => 'string',
                    'description' => 'rest_schema_sip_secret_value'
                ]
            ],
            // ========== RELATED SCHEMAS ==========
            // Custom monitoring schemas for SIP endpoints
            'related' => [
                'SipPeerStatus' => [
                    'type' => 'object',
                    'description' => 'rest_schema_sip_peer_status',
                    'properties' => [
                        'id' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_peer_id',
                            'example' => 'SIP-201'
                        ],
                        'state' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_peer_state',
                            'enum' => ['OK', 'UNREACHABLE', 'LAGGED', 'UNKNOWN', 'OFF', 'REGISTERED'],
                            'example' => 'OK'
                        ],
                        'useragent' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_peer_useragent',
                            'example' => 'Grandstream GXP2170 1.0.5.26'
                        ],
                        'ipaddress' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_peer_ipaddress',
                            'pattern' => '^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$',
                            'example' => '192.168.1.100'
                        ],
                        'port' => [
                            'type' => 'integer',
                            'description' => 'rest_schema_sip_peer_port',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'example' => 5060
                        ],
                    ]
                ],
                'SipPeerDetail' => [
                    'type' => 'object',
                    'description' => 'rest_schema_sip_peer_detail',
                    'properties' => [
                        'id' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_peer_id',
                            'example' => 'SIP-201'
                        ],
                        'state' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_peer_state',
                            'enum' => ['OK', 'UNREACHABLE', 'LAGGED', 'UNKNOWN', 'OFF', 'REGISTERED'],
                            'example' => 'OK'
                        ],
                        'useragent' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_peer_useragent',
                            'example' => 'Grandstream GXP2170 1.0.5.26'
                        ],
                        'ipaddress' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_peer_ipaddress',
                            'example' => '192.168.1.100'
                        ],
                        'port' => [
                            'type' => 'integer',
                            'description' => 'rest_schema_sip_peer_port',
                            'example' => 5060
                        ],
                        'codec' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_peer_codec',
                            'example' => 'alaw,ulaw,g729'
                        ],
                        'extension' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_peer_extension',
                            'example' => '201'
                        ],
                    ]
                ],
                'SipRegistryItem' => [
                    'type' => 'object',
                    'required' => ['id', 'state', 'username', 'host'],
                    'description' => 'rest_schema_sip_registry_item',
                    'properties' => [
                        'id' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_registry_id',
                            'pattern' => '^SIP-[A-Z0-9]{8,32}$',
                            'example' => 'SIP-PROVIDER1'
                        ],
                        'state' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_registry_state',
                            'enum' => ['OFF', 'Registered', 'Unregistered', 'Rejected', 'OK', 'REGISTERED'],
                            'example' => 'Registered'
                        ],
                        'username' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_registry_username',
                            'maxLength' => 100,
                            'example' => 'mysipuser'
                        ],
                        'host' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_registry_host',
                            'maxLength' => 255,
                            'example' => 'sip.provider.com'
                        ],
                    ]
                ],
                'SipHistoryItem' => [
                    'type' => 'object',
                    'description' => 'rest_schema_sip_history_item',
                    'properties' => [
                        'timestamp' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_history_timestamp',
                            'format' => 'date-time',
                            'example' => '2025-01-15 10:30:45'
                        ],
                        'event' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_history_event',
                            'enum' => ['REGISTER', 'UNREGISTER', 'CALL', 'HANGUP'],
                            'example' => 'REGISTER'
                        ],
                        'ipaddress' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_history_ipaddress',
                            'example' => '192.168.1.100'
                        ],
                        'useragent' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_history_useragent',
                            'example' => 'Grandstream GXP2170'
                        ],
                    ]
                ],
                'SipStats' => [
                    'type' => 'object',
                    'description' => 'rest_schema_sip_stats',
                    'properties' => [
                        'totalCalls' => [
                            'type' => 'integer',
                            'description' => 'rest_schema_sip_stats_total_calls',
                            'minimum' => 0,
                            'example' => 150
                        ],
                        'successfulCalls' => [
                            'type' => 'integer',
                            'description' => 'rest_schema_sip_stats_successful_calls',
                            'minimum' => 0,
                            'example' => 145
                        ],
                        'failedCalls' => [
                            'type' => 'integer',
                            'description' => 'rest_schema_sip_stats_failed_calls',
                            'minimum' => 0,
                            'example' => 5
                        ],
                        'totalDuration' => [
                            'type' => 'integer',
                            'description' => 'rest_schema_sip_stats_total_duration',
                            'minimum' => 0,
                            'example' => 7200
                        ],
                        'averageDuration' => [
                            'type' => 'number',
                            'description' => 'rest_schema_sip_stats_average_duration',
                            'minimum' => 0,
                            'example' => 48.5
                        ],
                    ]
                ],
                'SipSecret' => [
                    'type' => 'object',
                    'required' => ['extension', 'secret'],
                    'description' => 'rest_schema_sip_secret',
                    'properties' => [
                        'extension' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_secret_extension',
                            'example' => '201'
                        ],
                        'secret' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_secret_value',
                            'example' => 'a1b2c3d4e5f6'
                        ],
                    ]
                ],
                'SipAuthFailureStats' => [
                    'type' => 'object',
                    'description' => 'rest_schema_sip_auth_failure_stats',
                    'properties' => [
                        'extension' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_auth_extension',
                            'example' => '201'
                        ],
                        'failureCount' => [
                            'type' => 'integer',
                            'description' => 'rest_schema_sip_auth_failure_count',
                            'minimum' => 0,
                            'example' => 3
                        ],
                        'lastFailureTime' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_auth_last_failure_time',
                            'format' => 'date-time',
                            'example' => '2025-01-15 10:30:45'
                        ],
                        'blockedUntil' => [
                            'type' => 'string',
                            'description' => 'rest_schema_sip_auth_blocked_until',
                            'format' => 'date-time',
                            'nullable' => true,
                            'example' => '2025-01-15 11:30:45'
                        ],
                    ]
                ],
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}
