<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib\IvrMenu;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;
use MikoPBX\PBXCoreREST\Lib\Common\SearchIndexTrait;
use MikoPBX\Common\Models\Extensions;


/**
 * Data structure for IVR menu with OpenAPI schema support
 *
 * Provides consistent data format for IVR (Interactive Voice Response) menu records.
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\IvrMenu
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    use SearchIndexTrait;
    /**
     * Create complete data array from IvrMenu model including actions
     * @param \MikoPBX\Common\Models\IvrMenu $model
     * @param array<int, array<string, mixed>>|bool $actionsOrInclude Actions array for copy mode, or boolean to include actions
     * @return array<string, mixed>
     */
    public static function createFromModel($model, $actionsOrInclude = true): array
    {
        // Start with base structure (raw data, no HTML escaping)
        $data = self::createBaseStructure($model);

        // Replace numeric id with uniqid for v3 API
        $data['id'] = $model->uniqid;
        unset($data['uniqid']); // Remove uniqid field to avoid duplication

        // Add IVR menu specific fields (defaults defined in OpenAPI schema)
        $data['timeout'] = $model->timeout;
        $data['number_of_repeat'] = $model->number_of_repeat;
        $data['allow_enter_any_internal_extension'] = $model->allow_enter_any_internal_extension;

        // Add extension fields with representations using unified approach
        $data = self::addMultipleExtensionFields($data, [
            'timeout_extension' => $model->timeout_extension,
        ]);

        // Add sound file field using standard naming convention: field_name_represent
        $data = self::addSoundFileField($data, 'audio_message_id', $model->audio_message_id);
        
        // Handle actions - either from provided array (copy mode) or from model relations
        if (is_array($actionsOrInclude)) {
            // Copy mode - use provided actions array and load extension representations
            $actions = [];
            foreach ($actionsOrInclude as $actionData) {
                $extensionNumber = $actionData['extension'] ?? '';
                $extensionRepresent = '';
                
                // Load extension representation if extension number exists
                if (!empty($extensionNumber)) {
                    $extension = Extensions::findFirstByNumber($extensionNumber);
                    if ($extension) {
                        $extensionRepresent = $extension->getRepresent();
                    }
                }
                
                $actions[] = [
                    'id' => $actionData['id'] ?? '',
                    'digits' => $actionData['digits'] ?? '',
                    'extension' => $extensionNumber,
                    'extension_represent' => $extensionRepresent
                ];
            }
            // Sort actions by digits
            usort($actions, function($a, $b) {
                return (int)$a['digits'] <=> (int)$b['digits'];
            });
            $data['actions'] = $actions;
        } elseif ($actionsOrInclude && !empty($model->id)) {
            // Normal mode - get actions from model relations
            $actions = [];
            foreach ($model->IvrMenuActions as $action) {
                $actions[] = [
                    'id' => (string)$action->id,
                    'digits' => $action->digits,
                    'extension' => $action->extension,
                    'extension_represent' => $action->Extensions?->getRepresent() ?? 'ERROR'
                ];
            }
            // Sort actions by digits
            usort($actions, function($a, $b) {
                return (int)$a['digits'] <=> (int)$b['digits'];
            });
            $data['actions'] = $actions;
        } elseif ($actionsOrInclude) {
            // For new records, set empty actions array
            $data['actions'] = [];
        }
        
        // Generate search index automatically
        $data['search_index'] = self::generateAutoSearchIndex($data);

        // Apply OpenAPI schema formatting to convert types automatically
        // This replaces manual formatBooleanFields() and ensures consistency with schema
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }
    
    /**
     * Create simplified data array for list view
     * @param \MikoPBX\Common\Models\IvrMenu $model
     * @return array<string, mixed>
     */
    public static function createForList($model): array
    {
        // Use unified base method for list creation
        $data = parent::createForList($model);

        // Replace numeric id with uniqid for v3 API
        $data['id'] = $model->uniqid;
        unset($data['uniqid']); // Remove uniqid field to avoid duplication

        // Add IVR menu specific fields for list display (defaults defined in OpenAPI schema)
        $data['timeout'] = $model->timeout;
        $data['number_of_repeat'] = $model->number_of_repeat;
        $data['timeout_extension'] = $model->timeout_extension;

        // Add timeout extension representation
        $data['timeout_extension_represent'] = self::getExtensionRepresentation($model->timeout_extension);
        $data['timeoutExtensionRepresent'] = $model->TimeoutExtensions?->getRepresent() ?? '';

        // Add simplified actions summary
        $actions = [];
        foreach ($model->IvrMenuActions as $action) {
            $actions[] = [
                'digits' => $action->digits,
                'represent' => $action->Extensions?->getRepresent() ?? 'ERROR'
            ];
        }
        usort($actions, function($a, $b) {
            return (int)$a['digits'] <=> (int)$b['digits'];
        });
        $data['actions'] = $actions;

        // Generate search index automatically from all fields
        // This will use all _represent fields and extract extension numbers
        $data['search_index'] = self::generateAutoSearchIndex($data);

        // Apply OpenAPI schema formatting
        $data = self::formatBySchema($data, 'list');

        return $data;
    }

    /**
     * Get OpenAPI schema for IVR menu list item
     *
     * Builds schema from getParameterDefinitions() to avoid duplication.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestFields = $definitions['request'];
        $responseFields = $definitions['response'];

        // List view includes: id, name, extension, description, timeout, number_of_repeat,
        // timeout_extension, timeout_extension_represent, timeoutExtensionRepresent,
        // represent, actions (simplified), search_index
        return [
            'type' => 'object',
            'required' => ['id', 'extension', 'name'],
            'properties' => [
                'id' => $responseFields['id'],
                'extension' => $requestFields['extension'],
                'name' => $requestFields['name'],
                'description' => $requestFields['description'],
                'timeout' => $requestFields['timeout'],
                'number_of_repeat' => $requestFields['number_of_repeat'],
                'timeout_extension' => $requestFields['timeout_extension'],
                'timeout_extension_represent' => $responseFields['timeout_extension_represent'],
                'timeoutExtensionRepresent' => $responseFields['timeoutExtensionRepresent'],
                'represent' => $responseFields['represent'],
                'actions' => [
                    'type' => 'array',
                    'description' => $requestFields['actions']['description'],
                    'items' => [
                        '$ref' => '#/components/schemas/IvrMenuActionSimple'
                    ]
                ],
                'search_index' => $responseFields['search_index']
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed IVR menu record
     *
     * Builds schema from getParameterDefinitions() to avoid duplication.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestFields = $definitions['request'];
        $responseFields = $definitions['response'];

        // Detail view includes all request fields + response-only fields
        return [
            'type' => 'object',
            'required' => ['id', 'extension', 'name'],
            'properties' => [
                'id' => $responseFields['id'],
                'extension' => $requestFields['extension'],
                'name' => $requestFields['name'],
                'description' => $requestFields['description'],
                'timeout' => $requestFields['timeout'],
                'number_of_repeat' => $requestFields['number_of_repeat'],
                'allow_enter_any_internal_extension' => $requestFields['allow_enter_any_internal_extension'],
                'timeout_extension' => $requestFields['timeout_extension'],
                'timeout_extension_represent' => $responseFields['timeout_extension_represent'],
                'audio_message_id' => $requestFields['audio_message_id'],
                'audio_message_id_represent' => $responseFields['audio_message_id_represent'],
                'actions' => [
                    'type' => 'array',
                    'description' => $requestFields['actions']['description'],
                    'items' => [
                        '$ref' => '#/components/schemas/IvrMenuAction'
                    ]
                ],
                'search_index' => $responseFields['search_index']
            ]
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * Inherits from getParameterDefinitions()['related'] section.
     * This implements Single Source of Truth pattern.
     *
     * @return array<string, array<string, mixed>> Related schemas
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
     * @return array<string, array<string, mixed>> Complete field definitions
     */
    private static function getAllFieldDefinitions(): array
    {
        return [
            'id' => [
                'type' => 'string',
                'description' => 'rest_schema_ivr_id',
                'pattern' => '^IVR-MENU-[A-Z0-9]+$',
                'readOnly' => true,
                'example' => 'IVR-MENU-12345'
            ],
            'name' => [
                'type' => 'string',
                'description' => 'rest_schema_ivr_name',
                'maxLength' => 255,
                'sanitize' => 'text',
                'required' => true,
                'example' => 'Main Menu'
            ],
            'extension' => [
                'type' => 'string',
                'description' => 'rest_schema_ivr_extension',
                'pattern' => '^[0-9]{2,8}$',
                'sanitize' => 'string',
                'required' => true,
                'example' => '2000'
            ],
            'description' => [
                'type' => 'string',
                'description' => 'rest_schema_ivr_description',
                'maxLength' => 500,
                'sanitize' => 'text',
                'example' => 'Company main menu'
            ],
            'timeout' => [
                'type' => 'integer',
                'description' => 'rest_schema_ivr_timeout',
                'minimum' => 1,
                'maximum' => 60,
                'sanitize' => 'int',
                'default' => 7,
                'example' => 7
            ],
            'timeout_extension' => [
                'type' => 'string',
                'description' => 'rest_schema_ivr_timeout_extension',
                'pattern' => '^[0-9]{2,8}$',
                'sanitize' => 'string',
                'example' => '201'
            ],
            'number_of_repeat' => [
                'type' => 'integer',
                'description' => 'rest_schema_ivr_number_of_repeat',
                'minimum' => 0,
                'maximum' => 10,
                'sanitize' => 'int',
                'default' => 3,
                'example' => 3
            ],
            'allow_enter_any_internal_extension' => [
                'type' => 'boolean',
                'description' => 'rest_schema_ivr_allow_enter_any_internal_extension',
                'sanitize' => 'bool',
                'default' => false,
                'example' => true
            ],
            'audio_message_id' => [
                'type' => 'string',
                'description' => 'rest_schema_ivr_audio_message_id',
                'sanitize' => 'string',
                'example' => '12'
            ],
            'actions' => [
                'type' => 'array',
                'description' => 'rest_schema_ivr_actions',
                'sanitize' => 'array',
                'example' => '[{"digits":"1","extension":"201"},{"digits":"2","extension":"202"}]'
            ],
            // Response-only fields
            'timeout_extension_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_ivr_timeout_ext_repr',
                'readOnly' => true,
                'example' => '<i class="phone icon"></i> Operator <100>'
            ],
            'timeoutExtensionRepresent' => [
                'type' => 'string',
                'description' => 'rest_schema_ivr_timeout_ext_repr_alt',
                'readOnly' => true,
                'example' => '<i class="phone icon"></i> Operator <100>'
            ],
            'audio_message_id_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_ivr_audio_repr',
                'readOnly' => true,
                'example' => '<i class="file audio icon"></i> welcome.wav'
            ],
            'represent' => [
                'type' => 'string',
                'description' => 'rest_schema_ivr_represent',
                'readOnly' => true,
                'example' => '<i class="sitemap icon"></i> Main Menu <2000>'
            ],
            'search_index' => [
                'type' => 'string',
                'description' => 'rest_schema_ivr_search_index',
                'readOnly' => true,
                'example' => 'Main Menu 2000 Operator Sales'
            ]
        ];
    }

    /**
     * Get all field definitions (request parameters + response-only fields + related schemas)
     *
     * Single Source of Truth for ALL definitions in IVR Menu API.
     *
     * Structure:
     * - 'request': Request parameters (used in API requests, referenced by ApiParameterRef)
     * - 'response': Response-only fields (only in API responses, not in requests)
     * - 'related': Related schemas for nested objects (referenced by $ref in OpenAPI)
     *
     * This eliminates duplication between:
     * - Controller attributes (via ApiParameterRef)
     * - getListItemSchema() (inherits from here)
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
            // Used in API requests (POST, PUT, PATCH) AND responses (GET)
            // Referenced by ApiParameterRef in Controller
            'request' => $writableFields,

            // ========== RESPONSE-ONLY FIELDS ==========
            // Only in API responses, not in requests
            // Used by getListItemSchema() and getDetailSchema()
            'response' => $responseOnlyFields,

            // ========== RELATED SCHEMAS ==========
            // Nested object schemas referenced by $ref in OpenAPI
            // Used by getRelatedSchemas() method
            'related' => [
                'IvrMenuAction' => [
                    'type' => 'object',
                    'required' => ['digits', 'extension'],
                    'properties' => [
                        'id' => [
                            'type' => 'string',
                            'description' => 'rest_schema_ivr_action_id',
                            'example' => '1'
                        ],
                        'digits' => [
                            'type' => 'string',
                            'description' => 'rest_schema_ivr_action_digits',
                            'pattern' => '^[0-9#*]{1,10}$',
                            'example' => '1'
                        ],
                        'extension' => [
                            'type' => 'string',
                            'description' => 'rest_schema_ivr_action_extension',
                            'example' => '201'
                        ],
                        'extension_represent' => [
                            'type' => 'string',
                            'description' => 'rest_schema_ivr_action_ext_repr',
                            'example' => '<i class="phone icon"></i> Sales <201>'
                        ]
                    ]
                ],
                'IvrMenuActionSimple' => [
                    'type' => 'object',
                    'required' => ['digits'],
                    'properties' => [
                        'digits' => [
                            'type' => 'string',
                            'description' => 'rest_schema_ivr_action_digits',
                            'pattern' => '^[0-9#*]{1,10}$',
                            'example' => '1'
                        ],
                        'represent' => [
                            'type' => 'string',
                            'description' => 'rest_schema_ivr_action_repr',
                            'example' => '<i class="phone icon"></i> Sales <201>'
                        ]
                    ]
                ]
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // No need to override - uses getParameterDefinitions() automatically
}