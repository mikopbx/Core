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
     * Get list of settings that should be exposed through the General Settings API
     *
     * WHY: Single Source of Truth for allowed settings.
     * Settings not in this list are managed by other controllers or are system-only.
     *
     * @return array<string> Array of PbxSettings constants that are allowed
     */
    public static function getAllowedSettings(): array
    {
        // Extract all keys from response properties
        $definitions = self::getParameterDefinitions();
        $allowedSettings = array_keys($definitions['response']['settings']['properties'] ?? []);

        // Add hidden/internal settings that are still needed by the form but not in schema
        $additionalSettings = [
            PbxSettings::SSH_PASSWORD_HASH_STRING,
            PbxSettings::CLOUD_PROVISIONING,
        ];

        return array_merge($allowedSettings, $additionalSettings);
    }

    /**
     * Get list of read-only settings
     *
     * WHY: These settings are auto-generated or system-managed and should not be modified via API.
     * Used to filter out read-only fields during save operations.
     *
     * @return array<string> Array of PbxSettings constants that are read-only
     */
    public static function getReadOnlySettings(): array
    {
        $definitions = self::getParameterDefinitions();
        $readOnlySettings = [];

        // Extract settings marked as readOnly
        foreach ($definitions['response']['settings']['properties'] ?? [] as $fieldName => $fieldDef) {
            if (!empty($fieldDef['readOnly'])) {
                $readOnlySettings[] = $fieldName;
            }
        }

        return $readOnlySettings;
    }

    /**
     * Get field type from parameter definitions
     *
     * WHY: Provides Single Source of Truth for field types.
     * Used by API responses to properly format values.
     *
     * @param string $fieldName The PbxSettings constant name
     * @return string The field type ('string', 'integer', 'boolean', 'password')
     */
    public static function getFieldType(string $fieldName): string
    {
        $definitions = self::getParameterDefinitions();

        // Check in response section first (most complete)
        if (isset($definitions['response']['settings']['properties'][$fieldName])) {
            $fieldDef = $definitions['response']['settings']['properties'][$fieldName];
            $type = $fieldDef['type'] ?? 'string';

            // Check for password format in schema
            if (isset($fieldDef['format']) && $fieldDef['format'] === 'password') {
                return 'password';
            }

            // Fallback: check field name for password-like fields
            if (str_contains(strtolower($fieldName), 'password') ||
                str_contains(strtolower($fieldName), 'private_key')) {
                return 'password';
            }

            return $type;
        }

        // Fallback to request section
        if (isset($definitions['request']['settings']['properties'][$fieldName])) {
            return $definitions['request']['settings']['properties'][$fieldName]['type'] ?? 'string';
        }

        // Default type based on naming convention
        if (str_contains(strtolower($fieldName), 'password')) {
            return 'password';
        }
        if (str_contains(strtolower($fieldName), 'port') ||
            str_contains(strtolower($fieldName), 'timeout') ||
            str_contains(strtolower($fieldName), 'expiry')) {
            return 'integer';
        }
        if (str_contains(strtolower($fieldName), 'enabled') ||
            str_contains(strtolower($fieldName), 'disable')) {
            return 'boolean';
        }

        return 'string';
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
                            'enum' => ['en-en', 'ru-ru', 'de-de', 'da-dk', 'es-es', 'es-es', 'gr-gr', 'fr-ca', 'it-it', 'ja-jp', 'nl-nl', 'pl-pl', 'pt-br', 'sv-sv', 'cs-cs', 'tr-tr'],
                            'default' => self::getDefaultValue(PbxSettings::PBX_LANGUAGE),
                            'example' => self::getDefaultValue(PbxSettings::PBX_LANGUAGE)
                        ],
                        PbxSettings::PBX_INTERNAL_EXTENSION_LENGTH => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_internal_extension_length',
                            'minimum' => 2,
                            'maximum' => 11,
                            'default' => (int)self::getDefaultValue(PbxSettings::PBX_INTERNAL_EXTENSION_LENGTH),
                            'example' => (int)self::getDefaultValue(PbxSettings::PBX_INTERNAL_EXTENSION_LENGTH)
                        ],
                        PbxSettings::PBX_ALLOW_GUEST_CALLS => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_allow_guest_calls',
                            'default' => (bool)self::getDefaultValue(PbxSettings::PBX_ALLOW_GUEST_CALLS),
                            'example' => (bool)self::getDefaultValue(PbxSettings::PBX_ALLOW_GUEST_CALLS)
                        ],
                        PbxSettings::RESTART_EVERY_NIGHT => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_restart_every_night',
                            'default' => (bool)self::getDefaultValue(PbxSettings::RESTART_EVERY_NIGHT),
                            'example' => (bool)self::getDefaultValue(PbxSettings::RESTART_EVERY_NIGHT)
                        ],
                        PbxSettings::SEND_METRICS => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_send_metrics',
                            'default' => (bool)self::getDefaultValue(PbxSettings::SEND_METRICS),
                            'example' => (bool)self::getDefaultValue(PbxSettings::SEND_METRICS)
                        ],

                        // Web settings
                        PbxSettings::WEB_PORT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_web_port',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'default' => (int)self::getDefaultValue(PbxSettings::WEB_PORT),
                            'example' => (int)self::getDefaultValue(PbxSettings::WEB_PORT)
                        ],
                        PbxSettings::WEB_HTTPS_PORT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_web_https_port',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'default' => (int)self::getDefaultValue(PbxSettings::WEB_HTTPS_PORT),
                            'example' => (int)self::getDefaultValue(PbxSettings::WEB_HTTPS_PORT)
                        ],
                        PbxSettings::REDIRECT_TO_HTTPS => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_redirect_to_https',
                            'default' => (bool)self::getDefaultValue(PbxSettings::REDIRECT_TO_HTTPS),
                            'example' => (bool)self::getDefaultValue(PbxSettings::REDIRECT_TO_HTTPS)
                        ],
                        PbxSettings::WEB_ADMIN_LOGIN => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_web_admin_login',
                            'maxLength' => 50,
                            'example' => 'admin'
                        ],
                        PbxSettings::WEB_ADMIN_PASSWORD => [
                            'type' => 'string',
                            'format' => 'password',
                            'description' => 'rest_schema_gs_web_admin_password',
                            'example' => '********'
                        ],
                        PbxSettings::WEB_HTTPS_PUBLIC_KEY => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_web_https_public_key',
                            'example' => '-----BEGIN CERTIFICATE-----...'
                        ],
                        PbxSettings::WEB_HTTPS_PRIVATE_KEY => [
                            'type' => 'string',
                            'format' => 'password',
                            'description' => 'rest_schema_gs_web_https_private_key',
                            'example' => '********'
                        ],

                        // SSH settings
                        PbxSettings::SSH_PORT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_ssh_port',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'default' => (int)self::getDefaultValue(PbxSettings::SSH_PORT),
                            'example' => (int)self::getDefaultValue(PbxSettings::SSH_PORT)
                        ],
                        PbxSettings::SSH_LOGIN => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_ssh_login',
                            'maxLength' => 50,
                            'default' => self::getDefaultValue(PbxSettings::SSH_LOGIN),
                            'example' => self::getDefaultValue(PbxSettings::SSH_LOGIN)
                        ],
                        PbxSettings::SSH_PASSWORD => [
                            'type' => 'string',
                            'format' => 'password',
                            'description' => 'rest_schema_gs_ssh_password',
                            'example' => '********'
                        ],
                        PbxSettings::SSH_DISABLE_SSH_PASSWORD => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_ssh_disable_password',
                            'default' => (bool)self::getDefaultValue(PbxSettings::SSH_DISABLE_SSH_PASSWORD),
                            'example' => (bool)self::getDefaultValue(PbxSettings::SSH_DISABLE_SSH_PASSWORD)
                        ],
                        PbxSettings::SSH_AUTHORIZED_KEYS => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_ssh_authorized_keys',
                            'example' => 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQAB...'
                        ],
                        PbxSettings::SSH_ID_RSA_PUB => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_ssh_id_rsa_pub',
                            'readOnly' => true, // Auto-generated SSH public key
                            'example' => 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQAB...'
                        ],
                        PbxSettings::SSH_RSA_KEY => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_ssh_rsa_key',
                            'readOnly' => true, // Auto-generated SSH host key
                            'example' => 'ssh-rsa-cert-v01@openssh.com...'
                        ],
                        PbxSettings::SSH_DSS_KEY => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_ssh_dss_key',
                            'readOnly' => true, // Auto-generated SSH host key
                            'example' => 'ssh-dss AAAAB3NzaC1kc3...'
                        ],
                        PbxSettings::SSH_ECDSA_KEY => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_ssh_ecdsa_key',
                            'readOnly' => true, // Auto-generated SSH host key
                            'example' => 'ecdsa-sha2-nistp256...'
                        ],
                        PbxSettings::SSH_ED25519_KEY => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_ssh_ed25519_key',
                            'readOnly' => true, // Auto-generated SSH host key
                            'example' => 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5...'
                        ],

                        // SIP settings
                        PbxSettings::SIP_PORT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_sip_port',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'default' => (int)self::getDefaultValue(PbxSettings::SIP_PORT),
                            'example' => (int)self::getDefaultValue(PbxSettings::SIP_PORT)
                        ],
                        PbxSettings::TLS_PORT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_tls_port',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'default' => (int)self::getDefaultValue(PbxSettings::TLS_PORT),
                            'example' => (int)self::getDefaultValue(PbxSettings::TLS_PORT)
                        ],
                        PbxSettings::RTP_PORT_FROM => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_rtp_port_from',
                            'minimum' => 1024,
                            'maximum' => 65535,
                            'default' => (int)self::getDefaultValue(PbxSettings::RTP_PORT_FROM),
                            'example' => (int)self::getDefaultValue(PbxSettings::RTP_PORT_FROM)
                        ],
                        PbxSettings::RTP_PORT_TO => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_rtp_port_to',
                            'minimum' => 1024,
                            'maximum' => 65535,
                            'default' => (int)self::getDefaultValue(PbxSettings::RTP_PORT_TO),
                            'example' => (int)self::getDefaultValue(PbxSettings::RTP_PORT_TO)
                        ],
                        PbxSettings::RTP_STUN_SERVER => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_rtp_stun_server',
                            'maxLength' => 255,
                            'example' => 'stun.l.google.com:19302'
                        ],
                        PbxSettings::SIP_AUTH_PREFIX => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_sip_auth_prefix',
                            'maxLength' => 50,
                            'default' => (string)self::getDefaultValue(PbxSettings::SIP_AUTH_PREFIX),
                            'example' => (string)self::getDefaultValue(PbxSettings::SIP_AUTH_PREFIX),
                        ],
                        PbxSettings::USE_WEB_RTC => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_use_webrtc',
                            'default' => (bool)self::getDefaultValue(PbxSettings::USE_WEB_RTC),
                            'example' => (bool)self::getDefaultValue(PbxSettings::USE_WEB_RTC)
                        ],
                        PbxSettings::SIP_DEFAULT_EXPIRY => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_sip_default_expiry',
                            'minimum' => 60,
                            'maximum' => 7200,
                            'default' => (int)self::getDefaultValue(PbxSettings::SIP_DEFAULT_EXPIRY),
                            'example' => (int)self::getDefaultValue(PbxSettings::SIP_DEFAULT_EXPIRY)
                        ],
                        PbxSettings::SIP_MIN_EXPIRY => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_sip_min_expiry',
                            'minimum' => 60,
                            'maximum' => 7200,
                            'default' => (int)self::getDefaultValue(PbxSettings::SIP_MIN_EXPIRY),
                            'example' => (int)self::getDefaultValue(PbxSettings::SIP_MIN_EXPIRY)
                        ],
                        PbxSettings::SIP_MAX_EXPIRY => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_sip_max_expiry',
                            'minimum' => 60,
                            'maximum' => 86400,
                            'default' => (int)self::getDefaultValue(PbxSettings::SIP_MAX_EXPIRY),
                            'example' => (int)self::getDefaultValue(PbxSettings::SIP_MAX_EXPIRY)
                        ],

                        // Recording settings
                        PbxSettings::PBX_RECORD_CALLS => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_record_calls',
                            'enum' => ['all', 'internal', 'external', 'none'],
                            'default' => (bool)self::getDefaultValue(PbxSettings::PBX_RECORD_CALLS),
                            'example' => (bool)self::getDefaultValue(PbxSettings::PBX_RECORD_CALLS)
                        ],
                        PbxSettings::PBX_RECORD_CALLS_INNER => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_record_calls_inner',
                            'default' => (bool)self::getDefaultValue(PbxSettings::PBX_RECORD_CALLS_INNER),
                            'example' => (bool)self::getDefaultValue(PbxSettings::PBX_RECORD_CALLS_INNER)
                        ],
                        PbxSettings::PBX_SPLIT_AUDIO_THREAD => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_split_audio_thread',
                            'default' => (bool)self::getDefaultValue(PbxSettings::PBX_SPLIT_AUDIO_THREAD),
                            'example' => (bool)self::getDefaultValue(PbxSettings::PBX_SPLIT_AUDIO_THREAD)
                        ],
                        PbxSettings::PBX_RECORD_ANNOUNCEMENT_IN => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_record_announcement_in',
                            'example' => '1'
                        ],
                        PbxSettings::PBX_RECORD_ANNOUNCEMENT_OUT => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_record_announcement_out',
                            'example' => '2'
                        ],

                        // AMI/AJAM/ARI settings
                        PbxSettings::AMI_ENABLED => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_ami_enabled',
                            'default' => (bool)self::getDefaultValue(PbxSettings::AMI_ENABLED),
                            'example' => (bool)self::getDefaultValue(PbxSettings::AMI_ENABLED)
                        ],
                        PbxSettings::AMI_PORT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_ami_port',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'default' => (int)self::getDefaultValue(PbxSettings::AMI_PORT),
                            'example' => (int)self::getDefaultValue(PbxSettings::AMI_PORT)
                        ],
                        PbxSettings::AJAM_ENABLED => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_ajam_enabled',
                            'default' => (bool)self::getDefaultValue(PbxSettings::AJAM_ENABLED),
                            'example' => (bool)self::getDefaultValue(PbxSettings::AJAM_ENABLED)
                        ],
                        PbxSettings::AJAM_PORT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_ajam_port',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'default' => (int)self::getDefaultValue(PbxSettings::AJAM_PORT),
                            'example' => (int)self::getDefaultValue(PbxSettings::AJAM_PORT)
                        ],
                        PbxSettings::AJAM_PORT_TLS => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_ajam_port_tls',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'default' => (int)self::getDefaultValue(PbxSettings::AJAM_PORT_TLS),
                            'example' => (int)self::getDefaultValue(PbxSettings::AJAM_PORT_TLS)
                        ],
                        PbxSettings::ARI_ENABLED => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_gs_ari_enabled',
                            'default' => (bool)self::getDefaultValue(PbxSettings::ARI_ENABLED),
                            'example' => (bool)self::getDefaultValue(PbxSettings::ARI_ENABLED)
                        ],
                        PbxSettings::ARI_ALLOWED_ORIGINS => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_ari_allowed_origins',
                            'example' => 'http://localhost:3000,https://example.com'
                        ],

                        // IAX settings
                        PbxSettings::IAX_PORT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_iax_port',
                            'minimum' => 1,
                            'maximum' => 65535,
                            'default' => (int)self::getDefaultValue(PbxSettings::IAX_PORT),
                            'example' => (int)self::getDefaultValue(PbxSettings::IAX_PORT)
                        ],

                        // Features settings
                        PbxSettings::PBX_CALL_PARKING_EXT => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_call_parking_ext',
                            'pattern' => '^[0-9*#]+$',
                            'default' => self::getDefaultValue(PbxSettings::PBX_CALL_PARKING_EXT),
                            'example' => self::getDefaultValue(PbxSettings::PBX_CALL_PARKING_EXT)
                        ],
                        PbxSettings::PBX_CALL_PARKING_START_SLOT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_call_parking_start_slot',
                            'minimum' => 1,
                            'maximum' => 9999,
                            'default' => (int)self::getDefaultValue(PbxSettings::PBX_CALL_PARKING_START_SLOT),
                            'example' => (int)self::getDefaultValue(PbxSettings::PBX_CALL_PARKING_START_SLOT)
                        ],
                        PbxSettings::PBX_CALL_PARKING_END_SLOT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_call_parking_end_slot',
                            'minimum' => 1,
                            'maximum' => 9999,
                            'default' => (int)self::getDefaultValue(PbxSettings::PBX_CALL_PARKING_END_SLOT),
                            'example' => (int)self::getDefaultValue(PbxSettings::PBX_CALL_PARKING_END_SLOT)
                        ],
                        PbxSettings::PBX_FEATURE_ATTENDED_TRANSFER => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_attended_transfer',
                            'maxLength' => 10,
                            'default' => self::getDefaultValue(PbxSettings::PBX_FEATURE_ATTENDED_TRANSFER),
                            'example' => self::getDefaultValue(PbxSettings::PBX_FEATURE_ATTENDED_TRANSFER)
                        ],
                        PbxSettings::PBX_FEATURE_BLIND_TRANSFER => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_blind_transfer',
                            'maxLength' => 10,
                            'default' => self::getDefaultValue(PbxSettings::PBX_FEATURE_BLIND_TRANSFER),
                            'example' => self::getDefaultValue(PbxSettings::PBX_FEATURE_BLIND_TRANSFER)
                        ],
                        PbxSettings::PBX_FEATURE_PICKUP_EXTEN => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_pickup_exten',
                            'maxLength' => 10,
                            'default' => self::getDefaultValue(PbxSettings::PBX_FEATURE_PICKUP_EXTEN),
                            'example' => self::getDefaultValue(PbxSettings::PBX_FEATURE_PICKUP_EXTEN)
                        ],
                        PbxSettings::PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_atxfer_no_answer_timeout',
                            'default' => self::getDefaultValue(PbxSettings::PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT),
                            'example' => self::getDefaultValue(PbxSettings::PBX_FEATURE_ATXFER_NO_ANSWER_TIMEOUT)
                        ],
                        PbxSettings::PBX_FEATURE_DIGIT_TIMEOUT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_digit_timeout',
                            'minimum' => 1,
                            'maximum' => 60,
                            'default' => (int)self::getDefaultValue(PbxSettings::PBX_FEATURE_DIGIT_TIMEOUT),
                            'example' => (int)self::getDefaultValue(PbxSettings::PBX_FEATURE_DIGIT_TIMEOUT)
                        ],
                        PbxSettings::PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT => [
                            'type' => 'integer',
                            'description' => 'rest_schema_gs_transfer_digit_timeout',
                            'minimum' => 1,
                            'maximum' => 60,
                            'default' => (int)self::getDefaultValue(PbxSettings::PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT),
                            'example' => (int)self::getDefaultValue(PbxSettings::PBX_FEATURE_TRANSFER_DIGIT_TIMEOUT)
                        ],
                        PbxSettings::PBX_FEATURE_ATXFER_ABORT => [
                            'type' => 'string',
                            'description' => 'rest_schema_gs_atxfer_abort',
                            'default' => self::getDefaultValue(PbxSettings::PBX_FEATURE_ATXFER_ABORT),
                            'example' => self::getDefaultValue(PbxSettings::PBX_FEATURE_ATXFER_ABORT)
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
