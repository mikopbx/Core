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

namespace MikoPBX\PBXCoreREST\Lib\OutWorkTimes;

use MikoPBX\Common\Models\OutWorkTimes;
use MikoPBX\Common\Models\OutWorkTimesRouts;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDataStructure;
use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;
use MikoPBX\PBXCoreREST\Lib\Common\SearchIndexTrait;

/**
 * Data structure for out-of-work-time conditions
 *
 * Creates consistent data format for API responses.
 * Implements OpenApiSchemaProvider to provide typed schemas for OpenAPI specification.
 *
 * Provides methods to transform model data into API response format.
 * Implements two patterns:
 * - createFromModel: Full data structure with all relationships
 * - createForList: Lightweight structure for list display
 *
 * @package MikoPBX\PBXCoreREST\Lib\OutWorkTimes
 */
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    use SearchIndexTrait;

    /**
     * Create full data structure from model
     *
     * Used for single record retrieval and after save operations.
     * Includes all fields and loaded relationships.
     *
     * @param mixed $model Time condition model (OutWorkTimes)
     * @return array<string, mixed> Full data structure
     */
    public static function createFromModel($model): array
    {
        // Start with base structure
        $data = [
            'id' => $model->id,
            'name' => $model->description ?? 'Time Condition #' . $model->id,
            'description' => $model->description ?? '',
            'calType' => $model->calType ?: 'timeframe',  // Empty string in DB means 'timeframe'
            // Return dates as-is (timestamps) for API, not formatted for display
            'date_from' => $model->date_from ?? '',
            'date_to' => $model->date_to ?? '',
            // Return -1 for empty weekday values to match API v3 conventions
            'weekday_from' => empty($model->weekday_from) ? '-1' : $model->weekday_from,
            'weekday_to' => empty($model->weekday_to) ? '-1' : $model->weekday_to,
            'time_from' => $model->time_from ?? '',
            'time_to' => $model->time_to ?? '',
            'calUrl' => $model->calUrl ?? '',
            'calUser' => $model->calUser ?? '',
            // Never return real password, only masked value if password exists
            'calSecret' => !empty($model->calSecret) ? 'XXXXXX' : '',
            'priority' => $model->priority,
            'allowRestriction' => ($model->allowRestriction ?? '0') === '1',
            'allowedExtensions' => self::getAllowedExtensions((int)$model->id),
            // Only return IDs of associated incoming routes
            'incomingRouteIds' => self::getIncomingRouteIds((int)$model->id)
        ];

        // Add action field (explicit in OutWorkTimes, unlike IncomingRoutes where it's computed)
        $data['action'] = $model->action ?? 'extension';

        // Add extension field with representation using unified approach
        $data = self::addExtensionField($data, 'extension', $model->extension);

        // Add sound file field using standard naming convention: field_name_represent
        $data = self::addSoundFileField($data, 'audio_message_id', $model->audio_message_id);

        // Add search_index for frontend search functionality using trait
        $data['search_index'] = self::generateAutoSearchIndex($data);

        // Apply OpenAPI schema formatting to convert types automatically
        $data = self::formatBySchema($data, 'detail');

        return $data;
    }

    /**
     * Create lightweight data structure for list display
     *
     * Used for list operations to optimize performance.
     * Excludes heavy relationships and detailed info.
     *
     * @param mixed $model Time condition model
     * @return array<string, mixed> Lightweight data structure
     */
    public static function createForList($model): array
    {
        // Get calendar periods for display
        $calendarPeriods = self::getCalendarPeriodsForDisplay($model);

        // Get action information
        $actionInfo = self::getActionInfo($model);

        $data = [
            'id' => $model->id,
            'name' => $model->description ?? '',
            'description' => $model->description ?? '',
            'shot_description' => self::getShotDescription($model->description ?? ''),
            'calType' => $model->calType ?? '',
            'calendarPeriods' => $calendarPeriods,
            'allowRestriction' => ($model->allowRestriction ?? '0') === '1',
            'action' => $actionInfo['action'],
            'actionDisplay' => $actionInfo['display'],
            'audio_message_id' => $actionInfo['audio_message'] ?? '',
            'extension' => $actionInfo['extension'] ?? '',
            'priority' => (int)($model->priority ?? 0),

            // Fields for original table structure (formatted for display)
            'date_from' => self::formatDateForDisplay($model->date_from ?? ''),
            'date_to' => self::formatDateForDisplay($model->date_to ?? ''),
            'weekday_from' => self::getWeekdayName((int)($model->weekday_from ?? 0)),
            'weekday_to' => self::getWeekdayName((int)($model->weekday_to ?? 0)),
            'time_from' => $model->time_from ?? '',
            'time_to' => $model->time_to ?? '',
        ];

        // Add search_index for frontend search functionality using trait
        $data['search_index'] = self::generateAutoSearchIndex($data);

        // Apply OpenAPI list schema formatting to ensure proper types
        $data = self::formatBySchema($data, 'list');

        return $data;
    }

    /**
     * Create template for new record
     *
     * @return array<string, mixed> New record template with defaults
     */
    public static function createNewRecord(): array
    {
        $data = [
            'id' => '',
            'name' => '',
            'description' => '',
            'calType' => 'timeframe',
            'date_from' => '',
            'date_to' => '',
            // Return -1 for empty weekday values to match API v3 conventions
            'weekday_from' => '-1',
            'weekday_to' => '-1',
            'time_from' => '00:00',
            'time_to' => '23:59',
            'priority' => '0',
            'allowRestriction' => false,
            'allowedExtensions' => [],
            'incomingRouteIds' => []
        ];

        // Add extension field with empty representation
        $data = self::addExtensionField($data, 'extension', null);

        // Add sound file field with empty representation
        $data = self::addSoundFileField($data, 'audio_message_id', null);

        return $data;
    }

    /**
     * Get calendar periods for display matching original structure
     *
     * @param OutWorkTimes $model
     * @return list<array<string, string>> Calendar period items
     */
    private static function getCalendarPeriodsForDisplay(OutWorkTimes $model): array
    {
        $periods = [];

        // Date period
        if (!empty($model->date_from)) {
            $dateRange = self::formatDateForDisplay($model->date_from);
            if ($model->date_from !== $model->date_to && !empty($model->date_to)) {
                $dateRange .= ' - ' . self::formatDateForDisplay($model->date_to);
            }
            $periods[] = [
                'icon' => 'outline calendar alternate',
                'text' => $dateRange,
                'type' => 'date'
            ];
        }

        // Weekday period
        if (!empty($model->weekday_from)) {
            $weekdayRange = self::getWeekdayName((int)$model->weekday_from);
            if ($model->weekday_from !== $model->weekday_to && !empty($model->weekday_to)) {
                $weekdayRange .= ' - ' . self::getWeekdayName((int)$model->weekday_to);
            }
            $periods[] = [
                'icon' => 'outline calendar minus',
                'text' => $weekdayRange,
                'type' => 'weekday'
            ];
        }

        // Time period
        if (!empty($model->time_from)) {
            $timeRange = $model->time_from;
            if ($model->time_from !== $model->time_to && !empty($model->time_to)) {
                $timeRange .= ' - ' . $model->time_to;
            }
            $periods[] = [
                'icon' => 'clock outline',
                'text' => $timeRange,
                'type' => 'time'
            ];
        }

        // CalDAV/iCal calendar
        if (!empty($model->calType) && in_array($model->calType, ['caldav', 'ical'])) {
            $periods[] = [
                'icon' => 'outline calendar alternate',
                'text' => ucfirst($model->calType),
                'type' => 'calendar'
            ];
        }

        return $periods;
    }

    /**
     * Get action information for display
     *
     * @param OutWorkTimes $model
     * @return array<string, mixed> Action information
     */
    private static function getActionInfo(OutWorkTimes $model): array
    {
        $action = $model->action ?? '';
        $display = '';
        $audioMessage = null;
        $extension = null;

        if ($action === 'playmessage' && !empty($model->audio_message_id)) {
            $sound = SoundFiles::findFirstById($model->audio_message_id);
            if ($sound) {
                $audioMessage = $sound->name;

                // Get translation service and use the same key as in template
                $di = \Phalcon\Di\Di::getDefault();
                if ($di !== null) {
                    $translation = $di->get(TranslationProvider::SERVICE_NAME);
                    $actionText = $translation->_('tf_ActionPlayMessage', ['message' => $audioMessage]);
                } else {
                    $actionText = 'Play message: ' . $audioMessage;
                }

                // Create HTML with sound icon and translated text (don't escape HTML as translation contains safe HTML)
                $display = '<i class="file audio outline icon"></i>' . $actionText;
            }
        } elseif ($action === 'extension' && !empty($model->extension)) {
            $ext = Extensions::findFirstByNumber($model->extension);
            if ($ext) {
                $extension = $ext->number;

                // Get translation service and use the same key as in template
                $di = \Phalcon\Di\Di::getDefault();
                if ($di !== null) {
                    $translation = $di->get(TranslationProvider::SERVICE_NAME);
                    $actionText = $translation->_('tf_ActionTransferToExtension', ['extension' => $extension]);
                } else {
                    $actionText = 'Transfer to extension: ' . $extension;
                }

                // Create HTML with phone icon and translated text (don't escape HTML as translation contains safe HTML)
                $display = '<i class="phone icon"></i>' . $actionText;
            }
        }

        return [
            'action' => $action,
            'display' => $display,
            'audio_message' => $audioMessage,
            'extension' => $extension
        ];
    }

    /**
     * Get weekday name using translations
     *
     * @param int $weekday
     * @return string
     */
    private static function getWeekdayName(int $weekday): string
    {
        if ($weekday < 1 || $weekday > 7) {
            return '';
        }

        // Map weekday numbers to translation keys (using same logic as original form)
        $weekdayKeys = [
            1 => 'Mon',
            2 => 'Tue',
            3 => 'Wed',
            4 => 'Thu',
            5 => 'Fri',
            6 => 'Sat',
            7 => 'Sun'
        ];

        // Get translation service
        $di = \Phalcon\Di\Di::getDefault();
        if ($di !== null) {
            $translation = $di->get(TranslationProvider::SERVICE_NAME);
            return $translation->_($weekdayKeys[$weekday]);
        }

        // Fallback if DI not available
        return $weekdayKeys[$weekday];
    }

    /**
     * Get short description (first part before newline or period)
     *
     * @param string $description
     * @return string
     */
    private static function getShotDescription(string $description): string
    {
        if (empty($description)) {
            return '';
        }

        // Take first line or first sentence
        $lines = explode("\n", $description);
        $firstLine = trim($lines[0]);

        // If line is too long, take first 50 characters
        if (strlen($firstLine) > 50) {
            return substr($firstLine, 0, 47) . '...';
        }

        return $firstLine;
    }


    /**
     * Get IDs of incoming routes associated with time condition
     *
     * @param int $conditionId Time condition ID
     * @return list<int> Array of incoming route IDs
     */
    private static function getIncomingRouteIds(int $conditionId): array
    {
        $routeIds = [];

        $associations = OutWorkTimesRouts::find([
            'conditions' => 'timeConditionId = :conditionId:',
            'bind' => ['conditionId' => $conditionId]
        ]);

        if ($associations !== false && is_iterable($associations)) {
            foreach ($associations as $association) {
                $routeIds[] = (int)$association->routId;
            }
        }

        return $routeIds;
    }

    /**
     * Get allowed extensions for time condition
     *
     * @param int $conditionId Time condition ID
     * @return list<string> Array of allowed extension numbers
     */
    private static function getAllowedExtensions(int $conditionId): array
    {
        // This would retrieve allowed extensions from a related table
        // Implementation depends on your database schema
        // For now, returning empty array as placeholder
        return [];
    }

    /**
     * Format date for display, handling both unix timestamps and Y-m-d format
     *
     * @param string $date Date string (could be timestamp or Y-m-d format)
     * @return string Formatted date in Y-m-d format
     */
    private static function formatDateForDisplay(string $date): string
    {
        if (empty($date)) {
            return '';
        }

        // Check if it's a unix timestamp (numeric string)
        if (is_numeric($date)) {
            return date('Y-m-d', (int)$date);
        }

        // Check if it's already in Y-m-d format
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return $date;
        }

        // Try to parse other date formats
        $timestamp = strtotime($date);
        if ($timestamp !== false) {
            return date('Y-m-d', $timestamp);
        }

        // Return as-is if we can't parse it
        return $date;
    }

    /**
     * Get OpenAPI schema for time condition list item
     *
     * This schema matches the structure returned by createForList() method.
     * Used for GET /api/v3/off-work-times endpoint (list of time conditions).
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
        $listFields = [
            'name', 'description', 'calType', 'priority',
            'date_from', 'date_to', 'time_from', 'time_to',
            'weekday_from', 'weekday_to',  // Formatted weekday names for display
            'action', 'extension', 'audio_message_id', 'allowRestriction'
        ];
        foreach ($listFields as $field) {
            if (isset($requestParams[$field])) {
                $properties[$field] = $requestParams[$field];
                // Transform description key: rest_param_* → rest_schema_*
                $properties[$field]['description'] = str_replace('rest_param_', 'rest_schema_', $properties[$field]['description']);
            }
        }

        // ✨ Inherit response-only fields for list (NO duplication!)
        $listResponseFields = ['id', 'shot_description', 'calendarPeriods', 'actionDisplay', 'search_index'];
        foreach ($listResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'required' => ['id', 'name', 'priority'],
            'properties' => $properties
        ];
    }

    /**
     * Get OpenAPI schema for detailed time condition record
     *
     * Uses getParameterDefinitions() as Single Source of Truth (NO duplication!).
     * Inherits ALL request parameters + response-only fields.
     *
     * This schema matches the structure returned by createFromModel() method.
     * Used for GET /api/v3/off-work-times/{id}, POST, PUT, PATCH endpoints.
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
            'extension_represent',
            'audio_message_id_represent',
            'search_index'
        ];

        foreach ($detailResponseFields as $field) {
            if (isset($responseFields[$field])) {
                $properties[$field] = $responseFields[$field];
            }
        }

        return [
            'type' => 'object',
            'required' => ['id', 'name'],
            'properties' => $properties
        ];
    }

    /**
     * Get related schemas for OpenAPI components
     *
     * Returns schemas for nested objects used in time condition responses.
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
     * ✨ SINGLE SOURCE OF TRUTH - Each field defined once
     *
     * Each field includes type, validation, sanitization, and examples.
     *
     * @return array<string, array<string, mixed>> Complete field definitions
     */
    private static function getAllFieldDefinitions(): array
    {
        return [
            // ========== WRITABLE FIELDS ==========
            'description' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_description',
                'maxLength' => 500,
                'sanitize' => 'text',
                'example' => 'Weekend Schedule'
            ],
            'calType' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_calType',
                'enum' => ['', 'timeframe', 'caldav'],  // Empty string is alias for 'timeframe' (stored in DB as empty)
                'sanitize' => 'string',
                'default' => 'timeframe',
                'example' => 'timeframe'
            ],
            'date_from' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_date_from',
                'format' => 'date',
                'sanitize' => 'string',
                'example' => '2025-01-01'
            ],
            'date_to' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_date_to',
                'format' => 'date',
                'sanitize' => 'string',
                'example' => '2025-12-31'
            ],
            'weekday_from' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_weekday_from',
                'enum' => ['-1', '1', '2', '3', '4', '5', '6', '7'],
                'sanitize' => 'string',
                'default' => '-1',
                'example' => '1'
            ],
            'weekday_to' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_weekday_to',
                'enum' => ['-1', '1', '2', '3', '4', '5', '6', '7'],
                'sanitize' => 'string',
                'default' => '-1',
                'example' => '5'
            ],
            'time_from' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_time_from',
                'pattern' => '^([0-9]|[01][0-9]|2[0-3]):[0-5][0-9]$',  // Allow both H:MM and HH:MM formats
                'sanitize' => 'string',
                'default' => '00:00',
                'example' => '09:00'
            ],
            'time_to' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_time_to',
                'pattern' => '^([0-9]|[01][0-9]|2[0-3]):[0-5][0-9]$',  // Allow both H:MM and HH:MM formats
                'sanitize' => 'string',
                'default' => '23:59',
                'example' => '18:00'
            ],
            'calUrl' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_calUrl',
                'format' => 'uri',
                'maxLength' => 512,
                'sanitize' => 'string',
                'example' => 'https://calendar.example.com/cal.ics'
            ],
            'calUser' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_calUser',
                'maxLength' => 255,
                'sanitize' => 'text',
                'example' => 'admin'
            ],
            'calSecret' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_calSecret',
                'maxLength' => 255,
                'sanitize' => 'string',
                'writeOnly' => true,
                'example' => 'password123'
            ],
            'action' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_action',
                'enum' => ['extension', 'playmessage'],
                'sanitize' => 'string',
                'default' => 'extension',
                'example' => 'extension'
            ],
            'extension' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_extension',
                'pattern' => self::PATTERN_EXTENSION_WITH_SYSTEM_SHORT,  // Allow system extensions (hangup, busy, did2user, voicemail)
                'sanitize' => 'routing',  // Changed from 'string' to handle system extensions
                'example' => '201'
            ],
            'audio_message_id' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_audio_message_id',
                'sanitize' => 'string',
                'example' => '45'
            ],
            'priority' => [
                'type' => 'integer',
                'description' => 'rest_schema_owt_priority',
                'minimum' => 0,
                'sanitize' => 'int',
                'default' => 0,
                'example' => 1
            ],
            'allowRestriction' => [
                'type' => 'boolean',
                'description' => 'rest_schema_owt_allowRestriction',
                'sanitize' => 'bool',
                'default' => false,
                'example' => false
            ],
            'allowedExtensions' => [
                'type' => 'array',
                'description' => 'rest_schema_owt_allowedExtensions',
                'items' => ['type' => 'string'],
                'sanitize' => 'array',
                'default' => [],
                'example' => ['201', '202']
            ],
            'incomingRouteIds' => [
                'type' => 'array',
                'description' => 'rest_schema_owt_incomingRouteIds',
                'items' => ['type' => 'integer'],
                'sanitize' => 'array',
                'default' => [],
                'example' => [1, 2, 3]
            ],
            'name' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_name',
                'maxLength' => 255,
                'sanitize' => 'text',
                'example' => 'Weekend Schedule'
            ],

            // ========== RESPONSE-ONLY FIELDS ==========
            'id' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_id',
                'readOnly' => true,
                'example' => '15'
            ],
            'extension_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_extension_represent',
                'readOnly' => true,
                'example' => '<i class="user icon"></i> John Doe <201>'
            ],
            'audio_message_id_represent' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_audio_message_id_represent',
                'readOnly' => true,
                'example' => '<i class="sound icon"></i> Closed Message'
            ],
            'search_index' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_search_index',
                'readOnly' => true
            ],
            'shot_description' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_shot_description',
                'maxLength' => 50,
                'readOnly' => true,
                'example' => 'Routing for weekend calls'
            ],
            'calendarPeriods' => [
                'type' => 'array',
                'description' => 'rest_schema_owt_calendarPeriods',
                'readOnly' => true,
                'items' => [
                    'type' => 'object',
                    'properties' => [
                        'icon' => ['type' => 'string'],
                        'text' => ['type' => 'string'],
                        'type' => ['type' => 'string', 'enum' => ['date', 'weekday', 'time', 'calendar']]
                    ]
                ]
            ],
            'actionDisplay' => [
                'type' => 'string',
                'description' => 'rest_schema_owt_actionDisplay',
                'readOnly' => true,
                'example' => '<i class="phone icon"></i>Transfer to 201'
            ],
        ];
    }

    /**
     * Get all field definitions (request parameters + response-only fields + related schemas)
     *
     * ✨ SINGLE SOURCE OF TRUTH for ALL definitions in off-work-times API
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
            'response' => $responseOnlyFields,

            // ========== RELATED SCHEMAS ==========
            // Nested object schemas referenced by $ref in OpenAPI
            // Used by getRelatedSchemas() method
            'related' => [
                // Custom method: changePriorities
                'priorities' => [
                    'type' => 'array',
                    'description' => 'rest_param_owt_priorities',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'string'],
                            'priority' => ['type' => 'integer']
                        ]
                    ],
                    'sanitize' => 'array',
                    'example' => '[{"id":"15","priority":1},{"id":"16","priority":2}]'
                ]
            ]
        ];
    }

    // getSanitizationRules() inherited from AbstractDataStructure
    // Auto-generated from getParameterDefinitions() - Single Source of Truth
}
