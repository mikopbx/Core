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

namespace MikoPBX\PBXCoreREST\Lib\GeneralSettings;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for General Settings with OpenAPI schema support
 *
 * Creates consistent data format for API responses with automatic validation
 * and type conversion based on OpenAPI schema definitions.
 *
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\GeneralSettings
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Format settings data using OpenAPI schema
     *
     * @param array<string, mixed> $settings Raw settings data
     * @param array<int, array<string, mixed>> $codecs Codecs data
     * @param array<string, bool> $passwordValidation Password validation flags
     * @return array<string, mixed> Formatted data structure
     */
    public static function createFromData(array $settings, array $codecs = [], array $passwordValidation = []): array
    {
        $data = [
            'settings' => $settings,
            'codecs' => $codecs,
            'passwordValidation' => $passwordValidation
        ];

        // Apply OpenAPI schema formatting to convert types automatically
        return self::formatBySchema($data, 'detail');
    }

    /**
     * Apply OpenAPI schema formatting to data
     *
     * @param array<string, mixed> $data Raw data
     * @param string $schemaType Schema type ('detail' or 'list')
     * @return array<string, mixed> Formatted data
     */
    protected static function formatBySchema(array $data, string $schemaType = 'detail'): array
    {
        $schema = $schemaType === 'detail' ? self::getDetailSchema() : self::getListItemSchema();

        if (!isset($schema['properties'])) {
            return $data;
        }

        $formatted = [];
        foreach ($data as $key => $value) {
            if (isset($schema['properties'][$key])) {
                $fieldSchema = $schema['properties'][$key];
                $formatted[$key] = self::convertByType($value, $fieldSchema);
            } else {
                $formatted[$key] = $value;
            }
        }

        return $formatted;
    }

    /**
     * Convert value based on schema type
     *
     * @param mixed $value Raw value
     * @param array<string, mixed> $fieldSchema Field schema definition
     * @return mixed Converted value
     */
    protected static function convertByType(mixed $value, array $fieldSchema): mixed
    {
        $type = $fieldSchema['type'] ?? 'string';

        return match ($type) {
            'boolean' => (bool)$value,
            'integer' => (int)$value,
            'number' => (float)$value,
            'array', 'object' => is_array($value) ? $value : [],
            default => (string)$value
        };
    }

    /**
     * Get OpenAPI schema for general settings list item
     *
     * This schema is used for singleton resource, so list and detail are the same.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return self::getDetailSchema();
    }

    /**
     * Get OpenAPI schema for detailed general settings record
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by GetSettingsAction.
     * Used for GET /api/v3/general-settings, PUT, PATCH endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit ALL response fields (NO duplication!)
        foreach ($responseFields as $field => $definition) {
            $properties[$field] = $definition;
        }

        return [
            'type' => 'object',
            'properties' => $properties
        ];
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
     * WHY: Centralizes general settings parameter definitions.
     * GeneralSettings is a singleton resource containing all PBX settings.
     *
     * @return array<string, array<string, mixed>> Parameter definitions
     */
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                // Key-value pairs structure for settings
                'settings' => [
                    'type' => 'object',
                    'description' => 'rest_param_gs_settings',
                    'sanitize' => 'array',
                    'example' => [PbxSettings::PBX_NAME => 'Company PBX']
                ],
                // Codecs array
                'codecs' => [
                    'type' => 'array',
                    'description' => 'rest_param_gs_codecs',
                    'sanitize' => 'array',
                    'example' => [['name' => 'alaw', 'priority' => 0]]
                ]
            ],
            'response' => [
                'settings' => [
                    'type' => 'object',
                    'description' => 'rest_schema_gs_settings',
                    'properties' => [
                        // General settings
                        PbxSettings::PBX_NAME => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_pbx_name',
                            'maxLength' => 255,
                            'example' => 'Company PBX'
                        ],
                        PbxSettings::PBX_DESCRIPTION => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_pbx_description',
                            'maxLength' => 500,
                            'example' => 'Main office telephone system'
                        ],
                        PbxSettings::PBX_LANGUAGE => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_pbx_language',
                            'enum' => ['en', 'ru', 'de', 'es', 'fr', 'it', 'pt', 'uk', 'cs', 'tr', 'ja', 'pl', 'sv', 'ro', 'nl', 'vi'],
                            'default' => 'en',
                            'example' => 'en'
                        ],
                        PbxSettings::PBX_INTERNAL_EXTENSION_LENGTH => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_internal_extension_length',
                            'minimum' => 2,
                            'maximum' => 10,
                            'default' => 3,
                            'example' => 3
                        ],
                        PbxSettings::PBX_ALLOW_GUEST_CALLS => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_allow_guest_calls',
                            'default' => false,
                            'example' => false
                        ],
                        PbxSettings::RESTART_EVERY_NIGHT => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_restart_every_night',
                            'default' => false,
                            'example' => false
                        ],
                        PbxSettings::SEND_METRICS => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_send_metrics',
                            'default' => false,
                            'example' => false
                        ],

                        // Web settings
                        PbxSettings::WEB_PORT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_web_port',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'default' => 80,
                            'example' => 8080
                        ],
                        PbxSettings::WEB_HTTPS_PORT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_web_https_port',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'default' => 443,
                            'example' => 8443
                        ],
                        PbxSettings::REDIRECT_TO_HTTPS => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_redirect_to_https',
                            'default' => false,
                            'example' => true
                        ],
                        PbxSettings::WEB_ADMIN_LOGIN => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_web_admin_login',
                            'maxLength' => 50,
                            'example' => 'admin'
                        ],

                        // SSH settings
                        PbxSettings::SSH_PORT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_ssh_port',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'default' => 22,
                            'example' => 22
                        ],
                        PbxSettings::SSH_LOGIN => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_ssh_login',
                            'maxLength' => 50,
                            'example' => 'root'
                        ],
                        PbxSettings::SSH_DISABLE_SSH_PASSWORD => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_ssh_disable_password',
                            'default' => false,
                            'example' => false
                        ],

                        // SIP settings
                        PbxSettings::SIP_PORT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_sip_port',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'default' => 5060,
                            'example' => 5060
                        ],
                        PbxSettings::TLS_PORT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_tls_port',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'default' => 5061,
                            'example' => 5061
                        ],
                        PbxSettings::RTP_PORT_FROM => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_rtp_port_from',
                            'minimum' => 1024,
                            'maximum' => 65535,
                            'default' => 10000,
                            'example' => 10000
                        ],
                        PbxSettings::RTP_PORT_TO => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_rtp_port_to',
                            'minimum' => 1024,
                            'maximum' => 65535,
                            'default' => 10200,
                            'example' => 10200
                        ],
                        PbxSettings::USE_WEB_RTC => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_use_webrtc',
                            'default' => false,
                            'example' => true
                        ],
                        PbxSettings::SIP_DEFAULT_EXPIRY => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_sip_default_expiry',
                            'minimum' => 60,
                            'maximum' => 7200,
                            'default' => 120,
                            'example' => 120
                        ],

                        // Recording settings
                        PbxSettings::PBX_RECORD_CALLS => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_record_calls',
                            'enum' => ['all', 'internal', 'external', 'none'],
                            'default' => 'none',
                            'example' => 'all'
                        ],
                        PbxSettings::PBX_RECORD_CALLS_INNER => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_record_calls_inner',
                            'default' => false,
                            'example' => true
                        ],
                        PbxSettings::PBX_SPLIT_AUDIO_THREAD => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_split_audio_thread',
                            'default' => false,
                            'example' => false
                        ],

                        // AMI/AJAM/ARI settings
                        PbxSettings::AMI_ENABLED => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_ami_enabled',
                            'default' => false,
                            'example' => true
                        ],
                        PbxSettings::AMI_PORT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_ami_port',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'default' => 5038,
                            'example' => 5038
                        ],
                        PbxSettings::AJAM_ENABLED => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_ajam_enabled',
                            'default' => false,
                            'example' => true
                        ],

                        // Features settings
                        PbxSettings::PBX_CALL_PARKING_EXT => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_call_parking_ext',
                            'pattern' => '^[0-9*#]+$',
                            'example' => '800'
                        ],
                        PbxSettings::PBX_FEATURE_ATTENDED_TRANSFER => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_attended_transfer',
                            'maxLength' => 10,
                            'example' => '*2'
                        ],
                        PbxSettings::PBX_FEATURE_BLIND_TRANSFER => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_blind_transfer',
                            'maxLength' => 10,
                            'example' => '##'
                        ],
                    ]
                ],
                'codecs' => [
                    'type' => 'array',
                    'description' => 'rest_schema_gs_codecs',
                    'items' => [
                        '$ref' => '#/components/schemas/Codec'
                    ]
                ],
                'passwordValidation' => [
                    'type' => 'object',
                    'description' => 'rest_schema_gs_password_validation',
                    'properties' => [
                        'isDefaultWebPassword' => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_is_default_web_password',
                            'example' => false
                        ],
                        'isDefaultSSHPassword' => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_is_default_ssh_password',
                            'example' => false
                        ]
                    ]
                ]
            ],
            // ========== RELATED SCHEMAS ==========
            'related' => [
                'Codec' => [
                    'type' => 'object',
                    'required' => ['name', 'type', 'priority', 'disabled'],
                    'properties' => [
                        'name' => [
                            'type' => 'string',
                            'description' => 'rest_schema_codec_name',
                            'example' => 'alaw'
                        ],
                        'type' => [
                            'type' => 'string',
                            'description' => 'rest_schema_codec_type',
                            'enum' => ['audio', 'video'],
                            'example' => 'audio'
                        ],
                        'priority' => [
                            'type' => 'integer',
                            'description' => 'rest_schema_codec_priority',
                            'minimum' => 0,
                            'example' => 0
                        ],
                        'disabled' => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_codec_disabled',
                            'example' => false
                        ],
                        'description' => [
                            'type' => 'string',
                            'description' => 'rest_schema_codec_description',
                            'example' => 'G.711 a-law'
                        ]
                    ]
                ]
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}
