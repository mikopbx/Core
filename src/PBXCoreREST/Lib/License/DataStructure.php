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

namespace MikoPBX\PBXCoreREST\Lib\License;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for License API responses
 *
 * Provides OpenAPI schemas for license management endpoints.
 * This is a singleton resource - there is only one license per system.
 *
 * Implements Single Source of Truth pattern via getParameterDefinitions().
 *
 * @package MikoPBX\PBXCoreREST\Lib\License
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Get detail schema for license information
     *
     * ✨ Inherits field definitions from getParameterDefinitions() - Single Source of Truth.
     * This schema defines the structure for license data responses.
     * Used for GET /api/v3/license:getLicenseInfo endpoint.
     *
     * @return array<string, mixed>
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit ALL response-only fields (NO duplication!)
        foreach ($responseFields as $field => $definition) {
            $properties[$field] = $definition;
        }

        return [
            'type' => 'object',
            'properties' => $properties
        ];
    }

    /**
     * Get list item schema (not used for License - singleton resource)
     *
     * @return array<string, mixed>
     */
    public static function getListItemSchema(): array
    {
        return [];
    }

    /**
     * Get related schemas for License responses
     *
     * Inherits from getParameterDefinitions()['related'] section.
     * This implements Single Source of Truth pattern.
     *
     * @return array<string, array<string, mixed>>
     */
    public static function getRelatedSchemas(): array
    {
        $definitions = self::getParameterDefinitions();
        return $definitions['related'] ?? [];
    }

    /**
     * Get all field definitions with complete metadata
     *
     * Single Source of Truth for ALL field definitions.
     * Each field includes type, validation, sanitization, and examples.
     *
     * License combines:
     * - Request parameters (licKey, coupon, productId, featureId) - for write operations
     * - Response fields (licenseKey, companyName, etc.) - read-only license information
     * - Related schemas (LicenseProduct, LicenseFeature, LicensePingResponse) - nested objects
     *
     * @return array<string, array<string, mixed>> Complete field definitions
     */
    private static function getAllFieldDefinitions(): array
    {
        return [
            // ========== REQUEST PARAMETERS ==========
            'licKey' => [
                'type' => 'string',
                'description' => 'rest_schema_lic_licKey',
                'pattern' => '^MIKO-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$',
                'sanitize' => 'string',
                'example' => 'MIKO-GW9DC-EE22D-WB83S-C88PG'
            ],
            'coupon' => [
                'type' => 'string',
                'description' => 'rest_schema_lic_coupon',
                'pattern' => '^MIKOUPD-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$',
                'sanitize' => 'string',
                'example' => 'MIKOUPD-GK0DC-QE11D-WN87S-C88PF'
            ],
            'productId' => [
                'type' => 'string',
                'description' => 'rest_schema_lic_productId_param',
                'sanitize' => 'string',
                'example' => 'ModuleSmartIVR'
            ],
            'featureId' => [
                'type' => 'string',
                'description' => 'rest_schema_lic_featureId_param',
                'sanitize' => 'string',
                'example' => 'AdvancedCallRouting'
            ],

            // ========== RESPONSE-ONLY FIELDS ==========
            'licenseKey' => [
                'type' => 'string',
                'description' => 'rest_schema_lic_licenseKey',
                'pattern' => '^MIKO-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$',
                'nullable' => true,
                'readOnly' => true,
                'example' => 'MIKO-GW9DC-EE22D-WB83S-C88PG'
            ],
            'companyName' => [
                'type' => 'string',
                'description' => 'rest_schema_lic_companyName',
                'maxLength' => 255,
                'readOnly' => true,
                'example' => 'Acme Corporation'
            ],
            'email' => [
                'type' => 'string',
                'description' => 'rest_schema_lic_email',
                'format' => 'email',
                'maxLength' => 255,
                'readOnly' => true,
                'example' => 'admin@example.com'
            ],
            'licenseType' => [
                'type' => 'string',
                'description' => 'rest_schema_lic_licenseType',
                'enum' => ['trial', 'commercial', 'free'],
                'readOnly' => true,
                'example' => 'commercial'
            ],
            'expirationDate' => [
                'type' => 'string',
                'description' => 'rest_schema_lic_expirationDate',
                'format' => 'date',
                'nullable' => true,
                'readOnly' => true,
                'example' => '2025-12-31'
            ],
            'products' => [
                'type' => 'array',
                'description' => 'rest_schema_lic_products',
                'readOnly' => true,
                'items' => [
                    '$ref' => '#/components/schemas/LicenseProduct'
                ]
            ],
            'features' => [
                'type' => 'array',
                'description' => 'rest_schema_lic_features',
                'readOnly' => true,
                'items' => [
                    '$ref' => '#/components/schemas/LicenseFeature'
                ]
            ],
            'maxUsers' => [
                'type' => 'integer',
                'description' => 'rest_schema_lic_maxUsers',
                'minimum' => 0,
                'nullable' => true,
                'readOnly' => true,
                'example' => 50
            ],
            'currentUsers' => [
                'type' => 'integer',
                'description' => 'rest_schema_lic_currentUsers',
                'minimum' => 0,
                'readOnly' => true,
                'example' => 25
            ],
            'isValid' => [
                'type' => 'boolean',
                'description' => 'rest_schema_lic_isValid',
                'readOnly' => true,
                'example' => true
            ],
            'serverResponse' => [
                'type' => 'string',
                'description' => 'rest_schema_lic_serverResponse',
                'readOnly' => true,
                'example' => 'License is active and valid'
            ],
        ];
    }

    /**
     * Get all field definitions (request parameters + response-only fields + related schemas)
     *
     * Single Source of Truth for ALL definitions in License API.
     *
     * Structure:
     * - 'request': Request parameters (used in API requests, referenced by ApiParameterRef)
     * - 'response': Response-only fields (only in API responses, not in requests)
     * - 'related': Related schemas for nested objects (referenced by $ref in OpenAPI)
     *
     * This eliminates duplication between:
     * - Controller attributes (via ApiParameterRef)
     * - getDetailSchema() (inherits from here)
     * - getRelatedSchemas() (inherits from here)
     * - getSanitizationRules() (generated from here)
     *
     * @return array<string, array<string, array<string, mixed>>> Field definitions
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // Separate writable fields (for requests) and response-only fields
        $writableFields = [];
        $responseOnlyFields = [];

        foreach ($allFields as $fieldName => $fieldDef) {
            if (!empty($fieldDef['readOnly'])) {
                $responseOnlyFields[$fieldName] = $fieldDef;
            } else {
                // For request section, use rest_param_* descriptions
                $requestField = $fieldDef;
                $requestField['description'] = str_replace('rest_schema_', 'rest_param_', $fieldDef['description']);
                $writableFields[$fieldName] = $requestField;
            }
        }

        return [
            // ========== REQUEST PARAMETERS ==========
            // Used in API requests (POST)
            // Referenced by ApiParameterRef in Controller
            'request' => $writableFields,

            // ========== RESPONSE-ONLY FIELDS ==========
            // Only in API responses, not in requests
            // Used by getDetailSchema()
            'response' => $responseOnlyFields,

            // ========== RELATED SCHEMAS ==========
            // Nested object schemas referenced by $ref in OpenAPI
            // Used by getRelatedSchemas() method
            'related' => [
                'LicenseProduct' => [
                    'type' => 'object',
                    'required' => ['productId', 'productName'],
                    'properties' => [
                        'productId' => [
                            'type' => 'string',
                            'description' => 'rest_schema_lic_productId',
                            'example' => 'ModuleSmartIVR'
                        ],
                        'productName' => [
                            'type' => 'string',
                            'description' => 'rest_schema_lic_productName',
                            'example' => 'Smart IVR Module'
                        ],
                        'version' => [
                            'type' => 'string',
                            'description' => 'rest_schema_lic_productVersion',
                            'pattern' => '^[0-9]+\.[0-9]+\.[0-9]+$',
                            'example' => '1.2.3'
                        ],
                        'isActive' => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_lic_productIsActive',
                            'example' => true
                        ]
                    ]
                ],

                'LicenseFeature' => [
                    'type' => 'object',
                    'required' => ['featureId', 'featureName'],
                    'properties' => [
                        'featureId' => [
                            'type' => 'string',
                            'description' => 'rest_schema_lic_featureId',
                            'example' => 'AdvancedCallRouting'
                        ],
                        'featureName' => [
                            'type' => 'string',
                            'description' => 'rest_schema_lic_featureName',
                            'example' => 'Advanced Call Routing'
                        ],
                        'isEnabled' => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_lic_featureIsEnabled',
                            'example' => true
                        ],
                        'expirationDate' => [
                            'type' => 'string',
                            'description' => 'rest_schema_lic_featureExpirationDate',
                            'format' => 'date',
                            'nullable' => true,
                            'example' => '2025-12-31'
                        ]
                    ]
                ],

                'LicensePingResponse' => [
                    'type' => 'object',
                    'required' => ['success', 'message'],
                    'properties' => [
                        'success' => [
                            'type' => 'boolean',
                            'description' => 'rest_schema_lic_ping_success',
                            'example' => true
                        ],
                        'message' => [
                            'type' => 'string',
                            'description' => 'rest_schema_lic_ping_message',
                            'example' => 'License server is reachable'
                        ],
                        'responseTime' => [
                            'type' => 'integer',
                            'description' => 'rest_schema_lic_ping_responseTime',
                            'minimum' => 0,
                            'example' => 125
                        ]
                    ]
                ],
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // No need to override - uses getParameterDefinitions() automatically
}
