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
        // Create custom structure without calling createBaseStructure to avoid duplicate fields
        // Use only 'id' field that contains the uniqid value
        $data = [
            'id' => $model->uniqid ?? '',
            'extension' => $model->extension ?? '',
            'name' => $model->name ?? '',
            'description' => $model->description ?? ''
        ];
        
        // Add IVR menu specific fields
        $data['timeout'] = $model->timeout ?? '7';
        $data['number_of_repeat'] = $model->number_of_repeat ?? '3';

        // Convert boolean fields for frontend consumption
        $booleanFields = ['allow_enter_any_internal_extension'];
        $data = self::formatBooleanFields($data + [
            'allow_enter_any_internal_extension' => $model->allow_enter_any_internal_extension ?? '0'
        ], $booleanFields);

        // Add extension fields with representations using unified approach
        $data = self::addExtensionField($data, 'timeout_extension', $model->timeout_extension);

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
        
        return $data;
    }
    
    /**
     * Create simplified data array for list view
     * @param \MikoPBX\Common\Models\IvrMenu $model
     * @return array<string, mixed>
     */
    public static function createForList($model): array
    {
        $data = self::createFromModel($model, false);
        
        // Add represent field identical to IvrMenu->getRepresent()
        $data['represent'] = $model->getRepresent();
        
        // Add timeout extension representation
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
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getListItemSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'extension', 'name'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_id',
                    'example' => 'IVR-MENU-12345'
                ],
                'extension' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_extension',
                    'pattern' => '^[0-9]{2,8}$',
                    'example' => '2000'
                ],
                'name' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_name',
                    'maxLength' => 255,
                    'example' => 'Main Menu'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_description',
                    'maxLength' => 500,
                    'example' => 'Company main IVR menu'
                ],
                'timeout' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_ivr_timeout',
                    'minimum' => 1,
                    'maximum' => 60,
                    'example' => 7
                ],
                'number_of_repeat' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_ivr_repeat',
                    'minimum' => 0,
                    'maximum' => 10,
                    'example' => 3
                ],
                'timeout_extension' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_timeout_ext',
                    'example' => '100'
                ],
                'timeout_extension_represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_timeout_ext_repr',
                    'example' => '<i class="phone icon"></i> Operator <100>'
                ],
                'timeoutExtensionRepresent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_timeout_ext_repr_alt',
                    'example' => '<i class="phone icon"></i> Operator <100>'
                ],
                'represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_represent',
                    'example' => '<i class="sitemap icon"></i> Main Menu <2000>'
                ],
                'actions' => [
                    'type' => 'array',
                    'description' => 'rest_schema_ivr_actions',
                    'items' => [
                        '$ref' => '#/components/schemas/IvrMenuActionSimple'
                    ]
                ],
                'search_index' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_search_index',
                    'example' => 'Main Menu 2000 Operator'
                ]
            ]
        ];
    }

    /**
     * Get OpenAPI schema for detailed IVR menu record
     *
     * @return array<string, mixed> OpenAPI schema definition
     */
    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['id', 'extension', 'name'],
            'properties' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_id',
                    'example' => 'IVR-MENU-12345'
                ],
                'extension' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_extension',
                    'pattern' => '^[0-9]{2,8}$',
                    'example' => '2000'
                ],
                'name' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_name',
                    'maxLength' => 255,
                    'example' => 'Main Menu'
                ],
                'description' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_description',
                    'maxLength' => 500,
                    'example' => 'Company main IVR menu'
                ],
                'timeout' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_ivr_timeout',
                    'minimum' => 1,
                    'maximum' => 60,
                    'default' => 7,
                    'example' => 7
                ],
                'number_of_repeat' => [
                    'type' => 'integer',
                    'description' => 'rest_schema_ivr_repeat',
                    'minimum' => 0,
                    'maximum' => 10,
                    'default' => 3,
                    'example' => 3
                ],
                'allow_enter_any_internal_extension' => [
                    'type' => 'boolean',
                    'description' => 'rest_schema_ivr_allow_direct',
                    'default' => false,
                    'example' => true
                ],
                'timeout_extension' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_timeout_ext',
                    'example' => '100'
                ],
                'timeout_extension_represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_timeout_ext_repr',
                    'example' => '<i class="phone icon"></i> Operator <100>'
                ],
                'audio_message_id' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_audio_id',
                    'example' => '1'
                ],
                'audio_message_id_represent' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_audio_repr',
                    'example' => '<i class="file audio icon"></i> welcome.wav'
                ],
                'actions' => [
                    'type' => 'array',
                    'description' => 'rest_schema_ivr_actions',
                    'items' => [
                        '$ref' => '#/components/schemas/IvrMenuAction'
                    ]
                ],
                'search_index' => [
                    'type' => 'string',
                    'description' => 'rest_schema_ivr_search_index',
                    'example' => 'Main Menu 2000 Operator Sales'
                ]
            ]
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * @return array<string, array<string, mixed>> Related schemas
     */
    public static function getRelatedSchemas(): array
    {
        return [
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
            \MikoPBX\PBXCoreREST\Controllers\IvrMenu\RestController::class,
            'create'
        );
    }
}