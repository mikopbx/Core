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

namespace MikoPBX\PBXCoreREST\Lib\CallQueues;

use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\SearchIndexTrait;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for call queues with extension representations
 *
 * Creates consistent data format for API responses including representation
 * fields needed for proper dropdown display with icons and security.
 *
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\CallQueues
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    use SearchIndexTrait;
    /**
     * Create data array from CallQueues model with representation fields
     *
     * This method generates all necessary representation fields for proper
     * dropdown display in the frontend, following the IVR Menu pattern.
     *
     * Following "Store Clean, Escape at Edge" principle:
     * Returns raw data that was sanitized on input. HTML escaping
     * is the responsibility of the presentation layer.
     *
     * @param \MikoPBX\Common\Models\CallQueues $model Queue model instance
     * @param array<int, array<string, mixed>> $members Array of queue members with representations
     * @return array<string, mixed> Complete data structure with representation fields
     */
    public static function createFromModel($model, array $members = []): array
    {
        // Start with base structure (raw data, no HTML escaping)
        $data = self::createBaseStructure($model);

        // Replace numeric id with uniqid for v3 API
        $data['id'] = $model->uniqid;
        unset($data['uniqid']); // Remove uniqid field to avoid duplication

        // Add all call queue fields from model (raw values)
        $data['strategy'] = $model->strategy;
        $data['seconds_to_ring_each_member'] = $model->seconds_to_ring_each_member;
        $data['seconds_for_wrapup'] = $model->seconds_for_wrapup;
        $data['recive_calls_while_on_a_call'] = $model->recive_calls_while_on_a_call;  // Default false in schema
        $data['announce_position'] = $model->announce_position;  // Default false in schema
        $data['announce_hold_time'] = $model->announce_hold_time;  // Default false in schema
        $data['caller_hear'] = $model->caller_hear;
        $data['periodic_announce_frequency'] = $model->periodic_announce_frequency;
        $data['timeout_to_redirect_to_extension'] = $model->timeout_to_redirect_to_extension;
        $data['number_unanswered_calls_to_redirect'] = $model->number_unanswered_calls_to_redirect;
        $data['number_repeat_unanswered_to_redirect'] = $model->number_repeat_unanswered_to_redirect;
        $data['callerid_prefix'] = $model->callerid_prefix ?? '';

        // Add extension fields with representations using unified approach
        $data = self::addMultipleExtensionFields($data, [
            'timeout_extension' => $model->timeout_extension,
            'redirect_to_extension_if_empty' => $model->redirect_to_extension_if_empty,
            'redirect_to_extension_if_unanswered' => $model->redirect_to_extension_if_unanswered,
            'redirect_to_extension_if_repeat_exceeded' => $model->redirect_to_extension_if_repeat_exceeded,
        ]);

        // Add sound file fields with representations using unified approach
        // Using standard naming convention: field_name_represent (lowercase with underscores)
        $data = self::addSoundFileField($data, 'periodic_announce_sound_id', $model->periodic_announce_sound_id);
        $data = self::addSoundFileField($data, 'moh_sound_id', $model->moh_sound_id);

        // Add members
        $data['members'] = $members;

        // Apply OpenAPI schema formatting to convert types automatically
        // This replaces manual formatBooleanFields(), convertIntegerFields(), convertNumericFieldsToStrings()
        // The schema defines which fields should be boolean, integer, or string
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }

    /**
     * Create simplified data structure for list display
     *
     * @param \MikoPBX\Common\Models\CallQueues $model Queue model instance
     * @param array<int, \MikoPBX\Common\Models\CallQueueMembers> $preloadedMembers Pre-loaded members to avoid N+1 queries
     * @return array<string, mixed> Simplified data structure for table display
     */
    public static function createForList($model, array $preloadedMembers = []): array
    {
        // Use unified base method for list creation
        $data = parent::createForList($model);

        // Replace numeric id with uniqid for v3 API
        $data['id'] = $model->uniqid;
        unset($data['uniqid']); // Remove uniqid field to avoid duplication

        // Add call queue specific fields for list display
        $data['strategy'] = $model->strategy;
        $data['extension'] = $model->extension;

        // Create custom represent field for queue display
        // Note: The represent field contains HTML markup and will be escaped by the frontend when needed
        $data['represent'] = '<i class="users icon"></i> ' . ($model->name ?? '') . " <{$model->extension}>";

        // Add members summary for list display
        $members = [];

        // Use pre-loaded members if provided, otherwise fall back to lazy loading
        $membersToProcess = !empty($preloadedMembers) ? $preloadedMembers : $model->CallQueueMembers;

        foreach ($membersToProcess as $member) {
            $members[] = [
                'extension' => $member->extension,
                'represent' => self::getExtensionRepresentation($member->extension)
            ];
        }

        $data['members'] = $members;

        // Generate search index automatically from all fields
        // This will use all _represent fields and extract extension numbers
        $data['search_index'] = self::generateAutoSearchIndex($data);

        // Apply OpenAPI list schema formatting to ensure proper types
        // This guarantees consistency with API documentation
        $data = self::formatBySchema($data, 'list');

        return $data;
    }

    /**
     * Get OpenAPI schema for call queue list item
     *
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/call-queues endpoint (list of queues).
     *
     * Inherits ALL fields from getParameterDefinitions() (NO duplication!):
     * - Request parameters from 'request' section
     * - Response-only fields from 'response' section
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestParams = $definitions['request'];
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit request parameters used in list view
        $listFields = ['strategy', 'extension', 'name', 'description'];
        foreach ($listFields as $field) {
            if (isset($requestParams[$field])) {
                $properties[$field] = $requestParams[$field];
                // Transform description key: rest_param_* → rest_schema_*
                $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);

                // Override examples for list display (optional, can be different from create)
                if ($field === 'extension') {
                    $properties[$field]['example'] = '2200777';
                } elseif ($field === 'name') {
                    $properties[$field]['example'] = 'Support Queue';
                } elseif ($field === 'description') {
                    $properties[$field]['example'] = 'Queue for technical support';
                } elseif ($field === 'strategy') {
                    $properties[$field]['example'] = 'leastrecent';
                }
            }
        }

        // ✨ Inherit response-only fields for list (NO duplication!)
        $listResponseFields = ['id', 'represent', 'search_index'];
        foreach ($listResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        // Members field from response section (but rename from members_list)
        if (isset($responseFields['members_list'])) {
            $properties['members'] = $responseFields['members_list'];
        }

        return [
            'type' => 'object',
            'required' => ['id', 'extension', 'name', 'strategy', 'represent'],
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed call queue record
     *
     * Uses getParameterDefinitions() as Single Source of Truth (NO SchemaGenerator!).
     * Inherits ALL request parameters + response-only fields.
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/call-queues/{id}, POST, PUT, PATCH endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        $definitions = self::getParameterDefinitions();
        $requestParams = $definitions['request'];
        $responseFields = $definitions['response'];

        $properties = [];

        // ✨ Inherit ALL request parameters for detail view (NO duplication!)
        foreach ($requestParams as $field => $definition) {
            $properties[$field] = $definition;
            // Transform description key: rest_param_* → rest_schema_*
            $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
        }

        // ✨ Inherit response-only fields for detail (NO duplication!)
        $detailResponseFields = [
            'id',
            'timeout_extension_represent',
            'redirect_to_extension_if_empty_represent',
            'redirect_to_extension_if_unanswered_represent',
            'redirect_to_extension_if_repeat_exceeded_represent',
            'periodic_announce_sound_id_represent',
            'moh_sound_id_represent',
        ];

        foreach ($detailResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        // Members field from response section
        if (isset($responseFields['members_list'])) {
            $properties['members'] = $responseFields['members_list'];
        }

        return [
            'type' => 'object',
            'required' => ['id', 'extension', 'name', 'strategy'],
            'properties' => $properties
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * Returns schemas for nested objects used in call queue responses.
     * Inherits from getParameterDefinitions()['related'] section.
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
                'description' => 'rest_schema_cq_id',
                'pattern' => '^QUEUE-[A-Z0-9]{8,32}$',
                'readOnly' => true,
                'example' => 'QUEUE-CF423A55'
            ],
            'strategy' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_strategy',
                'enum' => ['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory', 'linear'],
                'sanitize' => 'string',
                'default' => 'ringall',
                'example' => 'ringall'
            ],
            'name' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_name',
                'maxLength' => 100,
                'sanitize' => 'text',
                'required' => true,
                'example' => 'Sales Queue'
            ],
            'extension' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_extension',
                'pattern' => '^[0-9]{2,8}$',
                'sanitize' => 'string',
                'required' => true,
                'example' => '2200100'
            ],
            'description' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_description',
                'maxLength' => 500,
                'sanitize' => 'text',
                'example' => 'Queue for sales department calls'
            ],
            'seconds_to_ring_each_member' => [
                'type' => 'integer',
                'description' => 'rest_schema_cq_seconds_to_ring_each_member',
                'minimum' => 1,
                'maximum' => 300,
                'sanitize' => 'int',
                'default' => 15,
                'example' => 20
            ],
            'seconds_for_wrapup' => [
                'type' => 'integer',
                'description' => 'rest_schema_cq_seconds_for_wrapup',
                'minimum' => 0,
                'maximum' => 300,
                'sanitize' => 'int',
                'default' => 15,
                'example' => 10
            ],
            'recive_calls_while_on_a_call' => [
                'type' => 'boolean',
                'description' => 'rest_schema_cq_recive_calls_while_on_a_call',
                'sanitize' => 'bool',
                'default' => false,
                'example' => false
            ],
            'caller_hear' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_caller_hear',
                'enum' => ['ringing', 'moh'],
                'sanitize' => 'string',
                'default' => 'ringing',
                'example' => 'moh'
            ],
            'announce_position' => [
                'type' => 'boolean',
                'description' => 'rest_schema_cq_announce_position',
                'sanitize' => 'bool',
                'default' => false,
                'example' => true
            ],
            'announce_hold_time' => [
                'type' => 'boolean',
                'description' => 'rest_schema_cq_announce_hold_time',
                'sanitize' => 'bool',
                'default' => false,
                'example' => false
            ],
            'moh_sound_id' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_moh_sound_id',
                'sanitize' => 'string',
                'example' => '43'
            ],
            'periodic_announce_sound_id' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_periodic_announce_sound_id',
                'sanitize' => 'string',
                'example' => '45'
            ],
            'periodic_announce_frequency' => [
                'type' => 'integer',
                'description' => 'rest_schema_cq_periodic_announce_frequency',
                'minimum' => 0,
                'maximum' => 600,
                'sanitize' => 'int',
                'example' => 60
            ],
            'timeout_to_redirect_to_extension' => [
                'type' => 'integer',
                'description' => 'rest_schema_cq_timeout_to_redirect_to_extension',
                'minimum' => 0,
                'maximum' => 3600,
                'sanitize' => 'int',
                'default' => 0,
                'example' => 300
            ],
            'timeout_extension' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_timeout_extension',
                'pattern' => '^[0-9]{2,8}$',
                'sanitize' => 'string',
                'example' => '201'
            ],
            'redirect_to_extension_if_empty' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_redirect_to_extension_if_empty',
                'pattern' => '^[0-9]{2,8}$',
                'sanitize' => 'string',
                'example' => '202'
            ],
            'redirect_to_extension_if_unanswered' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_redirect_to_extension_if_unanswered',
                'pattern' => '^[0-9]{2,8}$',
                'sanitize' => 'string',
                'example' => '203'
            ],
            'number_unanswered_calls_to_redirect' => [
                'type' => 'integer',
                'description' => 'rest_schema_cq_number_unanswered_calls_to_redirect',
                'minimum' => 1,
                'maximum' => 100,
                'sanitize' => 'int',
                'default' => 3,
                'example' => 3
            ],
            'redirect_to_extension_if_repeat_exceeded' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_redirect_to_extension_if_repeat_exceeded',
                'pattern' => '^[0-9]{2,8}$',
                'sanitize' => 'string',
                'example' => '204'
            ],
            'number_repeat_unanswered_to_redirect' => [
                'type' => 'integer',
                'description' => 'rest_schema_cq_number_repeat_unanswered_to_redirect',
                'minimum' => 1,
                'maximum' => 100,
                'sanitize' => 'int',
                'default' => 3,
                'example' => 3
            ],
            'callerid_prefix' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_callerid_prefix',
                'maxLength' => 50,
                'sanitize' => 'text',
                'example' => 'Q:'
            ],
            'members' => [
                'type' => 'array',
                'description' => 'rest_schema_cq_members',
                'sanitize' => 'array',
                'example' => '[{"extension":"201","priority":1},{"extension":"202","priority":2}]'
            ],
            // Response-only fields
            'represent' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_represent',
                'readOnly' => true,
                'example' => '<i class="users icon"></i> Support Queue <2200777>'
            ],
            'search_index' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_search_index',
                'readOnly' => true,
                'example' => 'support queue 2200777 queue for technical support'
            ],
            'timeout_extension_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_timeout_extension_represent',
                'readOnly' => true
            ],
            'redirect_to_extension_if_empty_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_redirect_to_extension_if_empty_represent',
                'readOnly' => true
            ],
            'redirect_to_extension_if_unanswered_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_redirect_to_extension_if_unanswered_represent',
                'readOnly' => true
            ],
            'redirect_to_extension_if_repeat_exceeded_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_redirect_to_extension_if_repeat_exceeded_represent',
                'readOnly' => true
            ],
            'periodic_announce_sound_id_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_periodic_announce_sound_id_represent',
                'readOnly' => true
            ],
            'moh_sound_id_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_cq_moh_sound_id_represent',
                'readOnly' => true
            ],
        ];
    }

    /**
     * Get all field definitions (request parameters + response-only fields + related schemas)
     *
     * Single Source of Truth for ALL definitions in call queues API.
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
            // Used in API requests (POST, PUT, PATCH)
            // Referenced by ApiParameterRef in Controller
            'request' => $writableFields,

            // ========== RESPONSE-ONLY FIELDS ==========
            // Only in API responses, not in requests
            // Used by getListItemSchema() and getDetailSchema()
            'response' => array_merge(
                $responseOnlyFields,
                [
                    // Members array (special structure for OpenAPI schema)
                    'members_list' => [
                        'type' => 'array',
                        'description' => 'rest_schema_cq_members',
                        'items' => [
                            '$ref' => '#/components/schemas/CallQueueMember'
                        ]
                    ],
                ]
            ),

            // ========== RELATED SCHEMAS ==========
            // Nested object schemas referenced by $ref in OpenAPI
            // Used by getRelatedSchemas() method
            'related' => [
                'CallQueueMember' => [
                    'type' => 'object',
                    'required' => ['extension'],
                    'properties' => [
                        'extension' => [
                            'type' => 'string',
                            'description' => 'rest_schema_cq_member_extension',
                            'example' => '201'
                        ],
                        'represent' => [
                            'type' => 'string',
                            'description' => 'rest_schema_cq_member_represent',
                            'example' => '<i class="icons"><i class="user outline icon"></i></i> Alexander Petrov <201>'
                        ]
                    ]
                ]
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // No need to override - uses getParameterDefinitions() automatically
}