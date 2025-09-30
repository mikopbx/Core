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
        $data['recive_calls_while_on_a_call'] = $model->recive_calls_while_on_a_call ?? '0';
        $data['announce_position'] = $model->announce_position ?? '0';
        $data['announce_hold_time'] = $model->announce_hold_time ?? '0';
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
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'extension', 'name', 'strategy', 'represent'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_id',
                    'pattern' => '^QUEUE-[A-Z0-9]{8}$',
                    'example' => 'QUEUE-CF423A55'
                ],
                'extension' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_extension',
                    'pattern' => '^[0-9]{2,8}$',
                    'example' => '2200777'
                ],
                'name' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_name',
                    'maxLength' => 100,
                    'example' => 'Support Queue'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_description',
                    'maxLength' => 500,
                    'example' => 'Queue for technical support'
                ],
                'represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_represent',
                    'example' => '<i class="users icon"></i> Support Queue <2200777>'
                ],
                'strategy' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_strategy',
                    'enum' => ['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory', 'linear'],
                    'example' => 'leastrecent'
                ],
                'members' => [
                    'type' => 'array',
                    'description' => 'rest_schema_cq_members',
                    'items' => [
                        '$ref' => '#/components/schemas/CallQueueMember'
                    ]
                ],
                'search_index' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_search_index',
                    'example' => 'support queue 2200777 queue for technical support'
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed call queue record
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/call-queues/{id}, POST, PUT, PATCH endpoints.
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'extension', 'name', 'strategy'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_id',
                    'pattern' => '^QUEUE-[A-Z0-9]{8}$',
                    'example' => 'QUEUE-CF423A55'
                ],
                'extension' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_extension',
                    'pattern' => '^[0-9]{2,8}$',
                    'example' => '2200777'
                ],
                'name' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_name',
                    'maxLength' => 100,
                    'example' => 'Support Queue'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_description',
                    'maxLength' => 500,
                    'example' => 'Queue for technical support'
                ],
                'strategy' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_strategy',
                    'enum' => ['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory', 'linear'],
                    'default' => 'ringall',
                    'example' => 'leastrecent'
                ],
                'seconds_to_ring_each_member' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_cq_seconds_to_ring_each_member',
                    'minimum' => 1,
                    'maximum' => 300,
                    'default' => 15,
                    'example' => 25
                ],
                'seconds_for_wrapup' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_cq_seconds_for_wrapup',
                    'minimum' => 0,
                    'maximum' => 300,
                    'default' => 15,
                    'example' => 10
                ],
                'recive_calls_while_on_a_call' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_cq_recive_calls_while_on_a_call',
                    'default' => false,
                    'example' => false
                ],
                'announce_position' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_cq_announce_position',
                    'default' => false,
                    'example' => true
                ],
                'announce_hold_time' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_cq_announce_hold_time',
                    'default' => false,
                    'example' => false
                ],
                'caller_hear' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_caller_hear',
                    'enum' => ['ringing', 'musiconhold', 'mohClass'],
                    'default' => 'ringing',
                    'example' => 'musiconhold'
                ],
                'periodic_announce_frequency' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_cq_periodic_announce_frequency',
                    'nullable' => true,
                    'example' => 60
                ],
                'timeout_to_redirect_to_extension' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_cq_timeout_to_redirect_to_extension',
                    'example' => 300
                ],
                'number_unanswered_calls_to_redirect' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_cq_number_unanswered_calls_to_redirect',
                    'example' => 3
                ],
                'number_repeat_unanswered_to_redirect' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_cq_number_repeat_unanswered_to_redirect',
                    'example' => 3
                ],
                'callerid_prefix' => [
                    'type' => 'string',
                    'maxLength' => 50,
                    'description' => 'rest_schema_cq_callerid_prefix',
                    'example' => 'Q:'
                ],
                'timeout_extension' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_timeout_extension',
                    'example' => '201'
                ],
                'timeout_extension_represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_timeout_extension_represent'
                ],
                'redirect_to_extension_if_empty' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_redirect_to_extension_if_empty',
                    'example' => '202'
                ],
                'redirect_to_extension_if_empty_represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_redirect_to_extension_if_empty_represent'
                ],
                'redirect_to_extension_if_unanswered' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_redirect_to_extension_if_unanswered',
                    'example' => '203'
                ],
                'redirect_to_extension_if_unanswered_represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_redirect_to_extension_if_unanswered_represent'
                ],
                'redirect_to_extension_if_repeat_exceeded' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_redirect_to_extension_if_repeat_exceeded',
                    'example' => '204'
                ],
                'redirect_to_extension_if_repeat_exceeded_represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_redirect_to_extension_if_repeat_exceeded_represent'
                ],
                'periodic_announce_sound_id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_periodic_announce_sound_id',
                    'example' => '45'
                ],
                'periodic_announce_sound_id_represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_periodic_announce_sound_id_represent'
                ],
                'moh_sound_id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_moh_sound_id',
                    'example' => '43'
                ],
                'moh_sound_id_represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_cq_moh_sound_id_represent'
                ],
                'members' => [
                    'type' => 'array',
                    'description' => 'rest_schema_cq_members',
                    'items' => [
                        '$ref' => '#/components/schemas/CallQueueMember'
                    ]
                ]
            ]
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * Returns schemas for nested objects used in call queue responses.
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        return [
            'CallQueueMember' => [
                'type' => 'object',
                'required' => ['extension'],
                'properties' => [
                    'extension' => [
                        'type' => 'string',
                        'description' => 'rest_schema_cq_member_extension',
                        'example' => '200'
                    ],
                    'represent' => [
                        'type' => 'string',
                        'description' => 'rest_schema_cq_member_represent',
                        'example' => '<i class="icons"><i class="user outline icon"></i></i> Alexander Petrov <200>'
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
            if (isset($fieldSchema['minimum'])) {
                $ruleParts[] = 'min:' . $fieldSchema['minimum'];
            }
            if (isset($fieldSchema['maximum'])) {
                $ruleParts[] = 'max:' . $fieldSchema['maximum'];
            }
            if (isset($fieldSchema['maxLength'])) {
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