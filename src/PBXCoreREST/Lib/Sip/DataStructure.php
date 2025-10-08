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
class DataStructure implements OpenApiSchemaProvider
{
    /**
     * Get OpenAPI schema for SIP peer status (list item)
     *
     * This schema matches the structure returned by GetPeersStatusesAction.
     * Used for GET /api/v3/sip:getStatuses and :getPeersStatuses endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
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
        ];
    }

    /**
     * Get OpenAPI schema for detailed SIP peer status
     *
     * This schema matches the structure returned by GetPeerStatusAction.
     * Used for GET /api/v3/sip:getStatus/{extension} endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
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
        ];
    }

    /**
     * Get OpenAPI schema for SIP registry status
     *
     * This schema matches the structure returned by GetRegistryAction.
     * Used for GET /api/v3/sip:getRegistry endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getRegistrySchema(): array
    {
        return [
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
        ];
    }

    /**
     * Get OpenAPI schema for SIP connection history
     *
     * Used for GET /api/v3/sip:getHistory/{extension} endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getHistorySchema(): array
    {
        return [
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
        ];
    }

    /**
     * Get OpenAPI schema for SIP statistics
     *
     * Used for GET /api/v3/sip:getStats/{extension} endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getStatsSchema(): array
    {
        return [
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
        ];
    }

    /**
     * Get OpenAPI schema for SIP secret
     *
     * Used for GET /api/v3/sip:getSecret/{extension} endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getSecretSchema(): array
    {
        return [
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
        ];
    }

    /**
     * Get OpenAPI schema for authentication failure statistics
     *
     * Used for GET /api/v3/sip:getAuthFailureStats/{extension} endpoint.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getAuthFailureStatsSchema(): array
    {
        return [
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
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * Returns schemas for nested objects used in SIP responses.
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        return [
            'SipPeerStatus' => self::getListItemSchema(),
            'SipRegistryItem' => self::getRegistrySchema(),
            'SipHistoryItem' => self::getHistorySchema(),
            'SipStats' => self::getStatsSchema(),
            'SipSecret' => self::getSecretSchema(),
            'SipAuthFailureStats' => self::getAuthFailureStatsSchema(),
        ];
    }

    /**
     * Generate sanitization rules from OpenAPI schema
     *
     * Converts OpenAPI schema constraints into SystemSanitizer format.
     * This eliminates duplication between schema definition and validation rules.
     *
     * Note: SIP is read-only for monitoring, so sanitization rules are
     * primarily for filtering parameters, not for data modification.
     *
     * @return array<string, string> Sanitization rules in format 'field' => 'type|constraint:value'
     */
    public static function getSanitizationRules(): array
    {
        $schema = static::getDetailSchema();
        $rules = [];

        if (!isset($schema['properties']) || !is_array($schema['properties'])) {
            return $rules;
        }

        foreach ($schema['properties'] as $fieldName => $fieldSchema) {
            if (!is_array($fieldSchema)) {
                continue;
            }

            $ruleParts = [];

            // Add type
            $type = $fieldSchema['type'] ?? 'string';
            $ruleParts[] = match ($type) {
                'integer' => 'int',
                'number' => 'float',
                'boolean' => 'bool',
                'array' => 'array',
                default => 'string'
            };

            // Add constraints
            if (isset($fieldSchema['minimum']) && is_numeric($fieldSchema['minimum'])) {
                $ruleParts[] = 'min:' . $fieldSchema['minimum'];
            }
            if (isset($fieldSchema['maximum']) && is_numeric($fieldSchema['maximum'])) {
                $ruleParts[] = 'max:' . $fieldSchema['maximum'];
            }
            if (isset($fieldSchema['maxLength']) && is_numeric($fieldSchema['maxLength'])) {
                $ruleParts[] = 'max:' . $fieldSchema['maxLength'];
            }
            if (isset($fieldSchema['pattern']) && is_string($fieldSchema['pattern'])) {
                $pattern = str_replace('^', '', $fieldSchema['pattern']);
                $pattern = str_replace('$', '', $pattern);
                $ruleParts[] = 'regex:/' . $pattern . '/';
            }
            if (isset($fieldSchema['enum']) && is_array($fieldSchema['enum'])) {
                $ruleParts[] = 'in:' . implode(',', $fieldSchema['enum']);
            }
            if (isset($fieldSchema['nullable']) && $fieldSchema['nullable'] === true) {
                $ruleParts[] = 'empty_to_null';
            }

            $rules[$fieldName] = implode('|', $ruleParts);
        }

        return $rules;
    }
}
