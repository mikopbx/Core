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

use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for License API responses
 *
 * Provides OpenAPI schemas for license management endpoints.
 * This is a singleton resource - there is only one license per system.
 *
 * @package MikoPBX\PBXCoreREST\Lib\License
 */
class DataStructure implements OpenApiSchemaProvider
{
    /**
     * Get detail schema for license information
     *
     * This schema defines the structure for license data responses.
     * Used for GET /api/v3/license:getLicenseInfo endpoint.
     *
     * @return array<string, mixed>
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'licenseKey' => [
                    'type' => 'string',
                    'description' => 'rest_schema_lic_licenseKey',
                    'pattern' => '^MIKO-[A-Z0-9]{3}-[A-Z0-9]{3}$',
                    'nullable' => true,
                    'example' => 'MIKO-ABC-123'
                ],
                'companyName' => [
                    'type' => 'string',
                    'description' => 'rest_schema_lic_companyName',
                    'maxLength' => 255,
                    'example' => 'Acme Corporation'
                ],
                'email' => [
                    'type' => 'string',
                    'description' => 'rest_schema_lic_email',
                    'format' => 'email',
                    'maxLength' => 255,
                    'example' => 'admin@example.com'
                ],
                'licenseType' => [
                    'type' => 'string',
                    'description' => 'rest_schema_lic_licenseType',
                    'enum' => ['trial', 'commercial', 'free'],
                    'example' => 'commercial'
                ],
                'expirationDate' => [
                    'type' => 'string',
                    'description' => 'rest_schema_lic_expirationDate',
                    'format' => 'date',
                    'nullable' => true,
                    'example' => '2025-12-31'
                ],
                'products' => [
                    'type' => 'array',
                    'description' => 'rest_schema_lic_products',
                    'items' => [
                        '$ref' => '#/components/schemas/LicenseProduct'
                    ]
                ],
                'features' => [
                    'type' => 'array',
                    'description' => 'rest_schema_lic_features',
                    'items' => [
                        '$ref' => '#/components/schemas/LicenseFeature'
                    ]
                ],
                'maxUsers' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_lic_maxUsers',
                    'minimum' => 0,
                    'nullable' => true,
                    'example' => 50
                ],
                'currentUsers' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_lic_currentUsers',
                    'minimum' => 0,
                    'example' => 25
                ],
                'isValid' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_lic_isValid',
                    'example' => true
                ],
                'serverResponse' => [
                    'type' => 'string',
                    'description' => 'rest_schema_lic_serverResponse',
                    'example' => 'License is active and valid'
                ]
            ]
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
     * @return array<string, array<string, mixed>>
     */
    public static function getRelatedSchemas(): array
    {
        return [
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
            'LicenseUserRequest' => [
                'type' => 'object',
                'properties' => [
                    'licKey' => [
                        'type' => 'string',
                        'description' => 'rest_param_lic_licKey',
                        'pattern' => '^MIKO-[A-Z0-9]{3}-[A-Z0-9]{3}$',
                        'example' => 'MIKO-ABC-123'
                    ],
                    'coupon' => [
                        'type' => 'string',
                        'description' => 'rest_param_lic_coupon',
                        'maxLength' => 50,
                        'example' => 'PROMO2024'
                    ]
                ]
            ],
            'LicenseCaptureFeatureRequest' => [
                'type' => 'object',
                'required' => ['productId', 'featureId'],
                'properties' => [
                    'productId' => [
                        'type' => 'string',
                        'description' => 'rest_param_lic_productId',
                        'example' => 'ModuleSmartIVR'
                    ],
                    'featureId' => [
                        'type' => 'string',
                        'description' => 'rest_param_lic_featureId',
                        'example' => 'AdvancedCallRouting'
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
            ]
        ];
    }

    /**
     * Generate sanitization rules from OpenAPI schema
     *
     * Converts OpenAPI schema constraints into SystemSanitizer format.
     * This eliminates duplication between schema definition and validation rules.
     *
     * @return array<string, string> Sanitization rules in format 'field' => 'type|constraint:value'
     */
    public static function getSanitizationRules(): array
    {
        $schema = static::getDetailSchema();
        $rules = [];

        if (!isset($schema['properties'])) {
            return $rules;
        }

        foreach ($schema['properties'] as $fieldName => $fieldSchema) {
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
            if (isset($fieldSchema['minLength'])) {
                $ruleParts[] = 'min:' . $fieldSchema['minLength'];
            }
            if (isset($fieldSchema['maxLength'])) {
                $ruleParts[] = 'max:' . $fieldSchema['maxLength'];
            }
            if (isset($fieldSchema['minimum'])) {
                $ruleParts[] = 'min:' . $fieldSchema['minimum'];
            }
            if (isset($fieldSchema['maximum'])) {
                $ruleParts[] = 'max:' . $fieldSchema['maximum'];
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
            if (isset($fieldSchema['format']) && $fieldSchema['format'] === 'email') {
                $ruleParts[] = 'email';
            }

            $rules[$fieldName] = implode('|', $ruleParts);
        }

        return $rules;
    }
}
