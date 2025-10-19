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

namespace MikoPBX\PBXCoreREST\Lib\OutboundRoutes;

use MikoPBX\Common\Models\OutgoingRoutingTable;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;

/**
 * Data structure for Outbound Routes
 *
 * Creates consistent data format for API responses.
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * @package MikoPBX\PBXCoreREST\Lib\OutboundRoutes
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    /**
     * Create complete data array from OutgoingRoutingTable model.
     * 
     * @param \MikoPBX\Common\Models\OutgoingRoutingTable $model
     * @return array
     */
    public static function createFromModel($model): array
    {
        // Start with base structure
        $data = self::createBaseStructure($model);

        // Remove fields not applicable to outbound routes
        // WHY: Outbound routes are not extensions, don't need uniqid/extension
        unset($data['uniqid'], $data['extension']);

        // Add outbound route specific fields (defaults defined in OpenAPI schema)
        $data['rulename'] = $model->rulename ?? '';
        $data['providerid'] = $model->providerid ?? '';  // Unified field name
        $data['priority'] = (int)($model->priority ?? 0);
        $data['numberbeginswith'] = $model->numberbeginswith ?? '';
        $data['restnumbers'] = $model->restnumbers;  // Default '9' in schema
        $data['trimfrombegin'] = $model->trimfrombegin;  // Default '0' in schema
        $data['prepend'] = $model->prepend ?? '';
        $data['note'] = $model->note ?? '';
        
        // Add provider details
        $data = array_merge($data, self::getProviderData($model->Providers));
        
        // Add representation
        $data['represent'] = $model->getRepresent();

        // Handle null values for consistent JSON output
        $data = self::handleNullValues($data, ['rulename', 'providerid', 'numberbeginswith', 'prepend', 'note']);

        // Apply OpenAPI schema formatting to convert types automatically
        // This ensures consistency with API documentation
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }
    
    /**
     * Create simplified data array for list view.
     * 
     * @param \MikoPBX\Common\Models\OutgoingRoutingTable $model
     * @return array
     */
    public static function createForList($model): array
    {
        $data = self::createBaseStructure($model);

        // Remove fields not applicable to outbound routes
        // WHY: Outbound routes are not extensions, don't need uniqid/extension
        unset($data['uniqid'], $data['extension']);

        // Add essential fields for list display (defaults defined in OpenAPI schema)
        $data['rulename'] = $model->rulename ?? '';
        $data['priority'] = (int)($model->priority ?? 0);
        $data['numberbeginswith'] = $model->numberbeginswith ?? '';
        $data['restnumbers'] = $model->restnumbers;  // Default '9' in schema
        $data['trimfrombegin'] = $model->trimfrombegin;  // Default '0' in schema
        $data['prepend'] = $model->prepend ?? '';
        $data['note'] = $model->note ?? '';
        
        // Add provider data for list display
        $providerData = self::getProviderData($model->Providers);
        $data['providerid'] = $model->providerid ?? '';  // Provider ID
        $data['providerid_represent'] = $providerData['providerid_represent'];
        $data['provider_disabled'] = $providerData['provider_disabled'];
        
        // Generate ready-to-use description for the rule
        $data['ruleDescription'] = self::generateRuleDescription($model);

        // Handle null values for consistent JSON output
        $data = self::handleNullValues($data, ['rulename', 'numberbeginswith', 'prepend', 'note']);

        // Apply OpenAPI list schema formatting to ensure proper types
        $data = self::formatBySchema($data, 'list');

        return $data;
    }
    
    /**
     * Create data structure for dropdown/select options.
     * 
     * @param \MikoPBX\Common\Models\OutgoingRoutingTable $model
     * @return array
     */
    public static function createForSelect($model): array
    {
        return [
            'id' => $model->id,
            'name' => $model->rulename,
            'represent' => $model->getRepresent(),
            'disabled' => false
        ];
    }
    
    /**
     * Generate HTML description for the outbound route rule with provider.
     * 
     * @param OutgoingRoutingTable $model
     * @return string HTML description of the rule
     */
    private static function generateRuleDescription(OutgoingRoutingTable $model): string
    {
        $di = \Phalcon\Di\Di::getDefault();
        $translation = $di->get(TranslationProvider::SERVICE_NAME);
        
        $numberbeginswith = $model->numberbeginswith ?? '';
        $restnumbers = (int)($model->restnumbers ?? 0);
        $trimfrombegin = (int)($model->trimfrombegin ?? 0);
        $prepend = $model->prepend ?? '';
        
        // Get provider representation (already includes icon from getRepresent())
        $providerName = $model->Providers?->getRepresent();
        if ($providerName === null) {
            // No provider selected
            return $translation->_('or_RuleNotConfigured');
        }
        // The getRepresent() method already returns HTML with icon, so we don't need to add it
        $providerDisplay = '<span class="provider">' . $providerName . '</span>';
        
        // Determine the base translation key based on pattern
        $baseKey = '';
        $params = ['provider' => $providerDisplay];
        
        if (!$numberbeginswith && $restnumbers === 0) {
            // Rule is not configured
            return $translation->_('or_RuleNotConfigured');
        } elseif (!$numberbeginswith && $restnumbers < 0) {
            // Any numbers
            $baseKey = 'or_RuleAnyNumbersWithProvider';
        } elseif (!$numberbeginswith && $restnumbers > 0) {
            // Numbers with specific length
            $baseKey = 'or_RuleDescriptionBeginEmptyWithProvider';
            $params['restnumbers'] = (string)$restnumbers;
        } elseif ($numberbeginswith) {
            if ($restnumbers > 0) {
                // Pattern with prefix and rest numbers
                $baseKey = 'or_RuleDescriptionWithProvider';
                $params['numberbeginswith'] = htmlspecialchars($numberbeginswith);
                $params['restnumbers'] = (string)$restnumbers;
            } elseif ($restnumbers === 0) {
                // Exact match
                $baseKey = 'or_RuleDescriptionFullMatchWithProvider';
                $params['numberbeginswith'] = htmlspecialchars($numberbeginswith);
            } else {
                // Prefix match with any rest numbers (restnumbers = -1)
                $baseKey = 'or_RuleDescriptionBeginMatchWithProvider';
                $params['numberbeginswith'] = htmlspecialchars($numberbeginswith);
            }
        }
        
        // Add modification suffixes if needed
        if ($trimfrombegin > 0 && !empty($prepend)) {
            // Both trim and prepend
            $baseKey = str_replace('WithProvider', 'WithProviderAndModify', $baseKey);
            $params['trim'] = (string)$trimfrombegin;
            $params['prepend'] = htmlspecialchars($prepend);
        } elseif ($trimfrombegin > 0) {
            // Only trim
            $baseKey = str_replace('WithProvider', 'WithProviderAndTrim', $baseKey);
            $params['trim'] = (string)$trimfrombegin;
        } elseif (!empty($prepend)) {
            // Only prepend
            $baseKey = str_replace('WithProvider', 'WithProviderAndPrepend', $baseKey);
            $params['prepend'] = htmlspecialchars($prepend);
        }
        
        // Generate the final description
        $description = $translation->_($baseKey, $params);
        
        return $description;
    }
    
    /**
     * Get provider data including name and status.
     *
     * @param mixed $provider Provider model or null
     * @return array Provider data with name, type, and disabled status
     */
    private static function getProviderData($provider): array
    {
        if ($provider === null) {
            return [
                'providerid_represent' => '',
                'provider_type' => '',
                'provider_disabled' => false,
            ];
        }

        $isDisabled = false;
        $modelType = ucfirst($provider->type);

        if (isset($provider->$modelType) && isset($provider->$modelType->disabled)) {
            $isDisabled = $provider->$modelType->disabled === '1';
        }

        return [
            'providerid_represent' => $provider->getRepresent(),
            'provider_type' => $provider->type,
            'provider_disabled' => $isDisabled,
        ];
    }

    /**
     * Get OpenAPI schema for outbound route list item
     *
     * ✨ Inherits field definitions from getAllFieldDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/outbound-routes endpoint (list of outbound routes).
     *
     * @return array<string, mixed>
     */
    public static function getListItemSchema(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // ✨ Select list-specific fields (NO duplication!)
        $listFields = ['id', 'rulename', 'priority', 'numberbeginswith', 'restnumbers', 'trimfrombegin', 'prepend', 'note', 'providerid',
            'providerid_represent', 'provider_disabled', 'ruleDescription'];
        $properties = array_intersect_key($allFields, array_flip($listFields));

        return [
            'type' => 'object',
            'required' => ['id', 'rulename', 'priority'],
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed outbound route record
     *
     * ✨ Inherits field definitions from getAllFieldDefinitions() - Single Source of Truth.
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/outbound-routes/{id}, POST, PUT, PATCH endpoints.
     *
     * @return array<string, mixed>
     */
    public static function getDetailSchema(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // ✨ All fields for detail view (NO duplication!)
        return [
            'type' => 'object',
            'required' => ['id', 'rulename', 'priority'],
            'properties' => $allFields
        ];
    }

    /**
     * Single Source of Truth: All field definitions in ONE place
     *
     * WHY: Eliminates duplication between request and response schemas.
     * Each field defined once with all constraints, then filtered by readOnly for request.
     *
     * @return array<string, array<string, mixed>> All field definitions
     */
    private static function getAllFieldDefinitions(): array
    {
        return [
            // ========== AUTO-GENERATED FIELDS (readOnly) ==========
            'id' => [
                'type' => 'string',
                'description' => 'rest_schema_obr_id',
                'pattern' => '^[0-9]+$',
                'readOnly' => true,
                'example' => '15'
            ],

            // ========== WRITABLE FIELDS ==========
            'rulename' => [
                'type' => 'string',
                'description' => 'rest_schema_obr_rulename',
                'minLength' => 1,
                'maxLength' => 100,
                'sanitize' => 'text',
                'required' => true,
                'example' => 'International Calls'
            ],
            'providerid' => [
                'type' => 'string',
                'description' => 'rest_schema_obr_providerid',
                'sanitize' => 'string',
                'required' => true,
                'example' => 'SIP-PROVIDER-1234'
            ],
            'priority' => [
                'type' => 'integer',
                'description' => 'rest_schema_obr_priority',
                'minimum' => 0,
                'maximum' => 9999,
                'sanitize' => 'int',
                'default' => 0,
                'example' => 1
            ],
            'numberbeginswith' => [
                'type' => 'string',
                'description' => 'rest_schema_obr_numberbeginswith',
                'maxLength' => 20,
                'sanitize' => 'string',
                'example' => '00'
            ],
            'restnumbers' => [
                'type' => 'integer',
                'description' => 'rest_schema_obr_restnumbers',
                'minimum' => -1,
                'maximum' => 20,
                'sanitize' => 'int',
                'default' => -1,
                'example' => 9
            ],
            'trimfrombegin' => [
                'type' => 'integer',
                'description' => 'rest_schema_obr_trimfrombegin',
                'minimum' => 0,
                'maximum' => 30,
                'sanitize' => 'int',
                'default' => 0,
                'example' => 0
            ],
            'prepend' => [
                'type' => 'string',
                'description' => 'rest_schema_obr_prepend',
                'maxLength' => 20,
                'sanitize' => 'string',
                'example' => '8'
            ],
            'note' => [
                'type' => 'string',
                'description' => 'rest_schema_obr_note',
                'maxLength' => 1024,
                'sanitize' => 'text',
                'example' => 'Route for international calls'
            ],

            // ========== RESPONSE-ONLY FIELDS (computed, readOnly) ==========
            'providerid_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_obr_providerid_represent',
                'readOnly' => true,
                'example' => '<i class="globe icon"></i> Main Provider'
            ],
            'provider_type' => [
                'type' => 'string',
                'description' => 'rest_schema_obr_provider_type',
                'enum' => ['SIP', 'IAX2'],
                'readOnly' => true,
                'example' => 'SIP'
            ],
            'provider_disabled' => [
                'type' => 'boolean',
                'description' => 'rest_schema_obr_provider_disabled',
                'readOnly' => true,
                'example' => false
            ],
            'ruleDescription' => [
                'type' => 'string',
                'description' => 'rest_schema_obr_ruleDescription',
                'readOnly' => true,
                'example' => 'Numbers starting with 00 and 9 digits via <span>Provider</span>'
            ],
            'represent' => [
                'type' => 'string',
                'description' => 'rest_schema_obr_represent',
                'readOnly' => true,
                'example' => 'International Calls'
            ]
        ];
    }

    /**
     * Get parameter definitions (Single Source of Truth)
     *
     * WHY: Centralizes outbound route parameter definitions.
     * Uses getAllFieldDefinitions() to eliminate duplication between request/response.
     *
     * Benefits:
     * - Change field constraint in ONE place → affects validation, sanitization, defaults, OpenAPI
     * - No duplication, no drift between different definitions
     * - Automatic validation (enum, min/max, pattern) via validateInputData()
     * - Automatic defaults via applyDefaults()
     * - Automatic sanitization rules via getSanitizationRules()
     *
     * @return array{request: array<string, array<string, mixed>>, response: array<string, array<string, mixed>>}
     */
    public static function getParameterDefinitions(): array
    {
        $allFields = self::getAllFieldDefinitions();

        // Filter writable fields (exclude readOnly)
        $writableFields = array_filter($allFields, fn($f) => empty($f['readOnly']));

        return [
            'request' => $writableFields,
            'response' => $allFields,
            'related' => [
                'priorities' => [
                    'type' => 'array',
                    'description' => 'rest_param_obr_priorities',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'string'],
                            'priority' => ['type' => 'integer']
                        ]
                    ],
                    'sanitize' => 'array',
                    'example' => [['id' => '1', 'priority' => 0], ['id' => '42', 'priority' => 1]]
                ]
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}