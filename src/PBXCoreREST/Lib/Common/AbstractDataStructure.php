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

namespace MikoPBX\PBXCoreREST\Lib\Common;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Providers\TranslationProvider;

/**
 * Abstract base class for REST API data structure creation
 *
 * Provides unified patterns for:
 * - Boolean field formatting for frontend consumption
 * - Extension and sound file representation generation
 * - Standardized data structure formats
 * - Optional text field escaping for specific contexts
 *
 * Follows "Store Clean, Escape at Edge" principle:
 * - REST API returns raw sanitized data
 * - HTML escaping is done by presentation layer only when needed
 *
 * Eliminates code duplication between CallQueues, IVR Menu, and other modules.
 *
 * @method static array<string, mixed> getListItemSchema() Get OpenAPI schema for list item (from OpenApiSchemaProvider)
 * @method static array<string, mixed> getDetailSchema() Get OpenAPI schema for detail view (from OpenApiSchemaProvider)
 * @method static array<string, array<string, mixed>> getRelatedSchemas() Get related schemas (from OpenApiSchemaProvider)
 */
abstract class AbstractDataStructure
{
    /**
     * Escape text fields for HTML output using unified processor
     * 
     * IMPORTANT: This method should NOT be used for REST API responses.
     * REST API should return raw data. Use this only when preparing
     * data for direct HTML rendering (e.g., server-side templates).
     * 
     * Applies HTML escaping to specified text fields in data array.
     * Uses TextFieldProcessor for consistent escaping across all modules.
     *
     * @deprecated Avoid using in REST API contexts
     * @param array $data Input data array
     * @param array $textFields List of text field names to escape
     * @return array Data array with HTML-escaped text fields
     */
    protected static function escapeTextFields(array $data, array $textFields): array
    {
        return TextFieldProcessor::escapeTextFieldsForHtml($data, $textFields);
    }

    /**
     * Format boolean fields for consistent frontend handling
     * 
     * Converts database boolean values ('1'/'0' strings) to actual booleans
     * for proper JavaScript consumption.
     *
     * @param array $data Input data array
     * @param array $booleanFields List of boolean field names
     * @return array Data array with converted boolean fields
     */
    protected static function formatBooleanFields(array $data, array $booleanFields): array
    {
        $result = $data;
        
        foreach ($booleanFields as $field) {
            if (isset($result[$field])) {
                $result[$field] = ($result[$field] ?? '0') === '1';
            }
        }
        
        return $result;
    }

    /**
     * Get extension representation for display in dropdowns
     *
     * Finds extension by number and returns its formatted representation
     * with appropriate icons and labels.
     *
     * @param string|null $extensionNumber Extension number to look up
     * @return string Formatted extension representation or empty string
     */
    protected static function getExtensionRepresentation(?string $extensionNumber): string
    {
        if (empty($extensionNumber)) {
            return '';
        }

        $extension = Extensions::findFirstByNumber($extensionNumber);
        return $extension ? $extension->getRepresent() : '';
    }

    /**
     * Get sound file representation for display in dropdowns
     * 
     * Finds sound file by ID and returns its formatted representation
     * with appropriate icons and labels.
     *
     * @param string|null $soundFileId Sound file ID to look up
     * @return string Formatted sound file representation or empty string
     */
    protected static function getSoundFileRepresentation(?string $soundFileId): string
    {
        if (empty($soundFileId)) {
            return '';
        }

        $soundFile = SoundFiles::findFirstById($soundFileId);
        return $soundFile ? $soundFile->getRepresent() : '';
    }

    /**
     * Create extension field pair with representation
     * 
     * Common pattern for creating extension field + representation field pairs
     * used in CallQueues, IVR Menu, etc.
     *
     * @param array $data Data array to modify
     * @param string $fieldName Base field name (e.g., 'timeout_extension')
     * @param string|null $extensionNumber Extension number value
     * @return array Data array with extension field and representation field
     */
    protected static function addExtensionField(array $data, string $fieldName, ?string $extensionNumber): array
    {
        $data[$fieldName] = $extensionNumber ?? '';
        $data[$fieldName . '_represent'] = self::getExtensionRepresentation($extensionNumber);
        return $data;
    }

    /**
     * Create sound file field pair with representation
     * 
     * Common pattern for creating sound file field + representation field pairs
     * used in CallQueues, IVR Menu, etc.
     * 
     * Standard naming convention: field_name_represent (lowercase with underscores)
     *
     * @param array $data Data array to modify
     * @param string $fieldName Base field name (e.g., 'audio_message_id')
     * @param string|null $soundFileId Sound file ID value
     * @return array Data array with sound file field and representation field
     */
    protected static function addSoundFileField(array $data, string $fieldName, ?string $soundFileId): array
    {
        $data[$fieldName] = $soundFileId ?? '';
        $data[$fieldName . '_represent'] = self::getSoundFileRepresentation($soundFileId);
        return $data;
    }

    /**
     * Convert numeric fields to strings for consistent API output
     * 
     * Ensures numeric fields are returned as strings for consistent
     * JSON API responses and frontend handling.
     *
     * @param array $data Input data array
     * @param array $numericFields List of numeric field names
     * @return array Data array with numeric fields converted to strings
     */
    protected static function convertNumericFieldsToStrings(array $data, array $numericFields): array
    {
        $result = $data;
        
        foreach ($numericFields as $field) {
            if (isset($result[$field])) {
                $result[$field] = (string)$result[$field];
            }
        }
        
        return $result;
    }

    /**
     * Convert integer fields to integers for consistent API output
     * 
     * Ensures integer fields are returned as actual integers for proper
     * JSON API responses and frontend handling.
     *
     * @param array $data Input data array
     * @param array $integerFields List of integer field names
     * @return array Data array with integer fields converted to integers
     */
    protected static function convertIntegerFields(array $data, array $integerFields): array
    {
        $result = $data;
        
        foreach ($integerFields as $field) {
            if (isset($result[$field])) {
                $result[$field] = (int)$result[$field];
            }
        }
        
        return $result;
    }

    /**
     * Create base data structure from model
     * 
     * Common fields present in most entity models:
     * - id (as string)
     * - uniqid 
     * - extension
     * - name (raw data, already sanitized on input)
     * - description (raw data, already sanitized on input)
     * 
     * Following "Store Clean, Escape at Edge" principle:
     * REST API returns raw data, escaping is done by the presentation layer.
     *
     * @param mixed $model Model instance
     * @return array Base data structure
     */
    protected static function createBaseStructure($model): array
    {
        $data = [
            'id' => (string)$model->id,
            'uniqid' => $model->uniqid ?? '',
            'extension' => $model->extension ?? '',
        ];

        // Return raw data - already sanitized on input, escaping is presentation layer's responsibility
        if (isset($model->name)) {
            $data['name'] = $model->name;
        }

        // Return raw data - already sanitized on input, escaping is presentation layer's responsibility
        if (isset($model->description)) {
            $data['description'] = $model->description;
        }

        return $data;
    }

    /**
     * Add multiple extension fields with representations
     * 
     * Convenient method for adding multiple extension fields at once.
     *
     * @param array $data Data array to modify
     * @param array $extensionFields Array of field_name => extension_number pairs
     * @return array Data array with all extension fields and representations
     */
    protected static function addMultipleExtensionFields(array $data, array $extensionFields): array
    {
        foreach ($extensionFields as $fieldName => $extensionNumber) {
            $data = self::addExtensionField($data, $fieldName, $extensionNumber);
        }
        
        return $data;
    }

    /**
     * Add multiple sound file fields with representations
     * 
     * Convenient method for adding multiple sound file fields at once.
     *
     * @param array $data Data array to modify
     * @param array $soundFileFields Array of field_name => sound_file_id pairs
     * @return array Data array with all sound file fields and representations
     */
    protected static function addMultipleSoundFileFields(array $data, array $soundFileFields): array
    {
        foreach ($soundFileFields as $fieldName => $soundFileId) {
            $data = self::addSoundFileField($data, $fieldName, $soundFileId);
        }
        
        return $data;
    }

    /**
     * Create simplified data structure for list display
     * 
     * Common pattern for list views that need basic info + representation.
     * Used by getList actions in various modules.
     *
     * @param mixed $model Model instance
     * @return array Simplified data structure for lists
     */
    protected static function createForList($model): array
    {
        $data = self::createBaseStructure($model);
        
        // Add represent field for dropdown display
        if (method_exists($model, 'getRepresent')) {
            $data['represent'] = $model->getRepresent();
        }
        
        return $data;
    }

    /**
     * Apply field transformations in sequence
     * 
     * Applies multiple transformation functions to data in order.
     * Useful for complex data processing pipelines.
     *
     * @param array $data Initial data array
     * @param array $transformations Array of transformation functions
     * @return array Final transformed data array
     */
    protected static function applyTransformations(array $data, array $transformations): array
    {
        $result = $data;
        
        foreach ($transformations as $transformation) {
            if (is_callable($transformation)) {
                $result = $transformation($result);
            }
        }
        
        return $result;
    }

    /**
     * Handle null values in data array
     * 
     * Converts null values to empty strings for consistent JSON output.
     *
     * @param array $data Input data array
     * @param array $fields List of field names to process (empty = all fields)
     * @return array Data array with null values converted to empty strings
     */
    protected static function handleNullValues(array $data, array $fields = []): array
    {
        $fieldsToProcess = empty($fields) ? array_keys($data) : $fields;
        
        foreach ($fieldsToProcess as $field) {
            if (array_key_exists($field, $data) && $data[$field] === null) {
                $data[$field] = '';
            }
        }
        
        return $data;
    }

    /**
     * Get network filter representation with HTML and icon
     * 
     * Unified method for getting network filter representation across all modules.
     * Returns HTML formatted representation with appropriate icon:
     * - 'none' returns globe icon with translated text
     * - 'localhost' returns home icon with translated text
     * - Valid filter ID returns filter's getRepresent() output
     * - Invalid filter ID returns empty string
     *
     * @param string|int|null $networkFilterId Network filter ID ('none', 'localhost', numeric ID, or null)
     * @return string HTML formatted representation with icon
     */
    public static function getNetworkFilterRepresentation($networkFilterId): string
    {
        $translation = \Phalcon\Di\Di::getDefault()->get(TranslationProvider::SERVICE_NAME);
        
        // Handle empty or 'none' values
        if (empty($networkFilterId) || $networkFilterId === 'none') {
            // Get translation for "none" option with globe icon
            $noneText = $translation->_('ex_NoNetworkFilter');
            return '<i class="globe icon"></i> ' . $noneText;
        }
        
        // Handle localhost special value (for AMI/API connections)
        if ($networkFilterId === 'localhost') {
            // Get translation for "localhost only" option with home icon
            $localhostText = $translation->_('fw_LocalhostOnly');
            return '<i class="home icon"></i> ' . $localhostText;
        }
        
        // Look up the network filter
        $filter = NetworkFilters::findFirstById($networkFilterId);
        if ($filter) {
            // Use getRepresent() which includes HTML and icon
            return $filter->getRepresent();
        }
        
        // Invalid filter ID - return empty string
        return '';
    }

    /**
     * Add network filter field pair with representation
     *
     * Common pattern for creating network filter field + representation field pairs.
     * Always returns 'none' instead of empty string for API consistency.
     *
     * @param array $data Data array to modify
     * @param string $fieldName Base field name (e.g., 'networkfilterid')
     * @param string|int|null $networkFilterId Network filter ID value
     * @return array Data array with network filter field and representation field
     */
    public static function addNetworkFilterField(array $data, string $fieldName, $networkFilterId): array
    {
        // Always return 'none' instead of empty string for API consistency
        $data[$fieldName] = !empty($networkFilterId) ? (string)$networkFilterId : 'none';
        $data[$fieldName . '_represent'] = self::getNetworkFilterRepresentation($networkFilterId);
        return $data;
    }

    /**
     * Format data according to OpenAPI schema
     *
     * Automatically applies type conversions based on the schema definition.
     * This replaces manual formatting methods like formatBooleanFields() and convertIntegerFields().
     *
     * The schema is obtained from the DataStructure class that implements OpenApiSchemaProvider.
     *
     * @param array<string, mixed> $data Data to format
     * @param string $schemaType Schema type to use: 'list' or 'detail'
     * @return array<string, mixed> Data with types formatted according to schema
     */
    protected static function formatBySchema(array $data, string $schemaType = 'detail'): array
    {
        // Check if implementing class provides OpenAPI schema
        if (!is_subclass_of(static::class, OpenApiSchemaProvider::class)) {
            return $data; // No schema available, return unchanged
        }

        // Get appropriate schema
        $schema = match ($schemaType) {
            'list' => static::getListItemSchema(),
            'detail' => static::getDetailSchema(),
            default => static::getDetailSchema()
        };

        // Apply schema formatting
        return SchemaFormatter::format($data, $schema);
    }

    /**
     * Validate data against OpenAPI schema
     *
     * Checks if the data structure matches the OpenAPI schema definition.
     * Returns array of validation errors (empty array if valid).
     *
     * This is useful for:
     * - Development/debugging to catch schema mismatches
     * - Ensuring API responses match documentation
     * - Quality assurance testing
     *
     * @param array<string, mixed> $data Data to validate
     * @param string $schemaType Schema type to use: 'list' or 'detail'
     * @return array<string> Validation error messages (empty if valid)
     */
    protected static function validateAgainstSchema(array $data, string $schemaType = 'detail'): array
    {
        // Check if implementing class provides OpenAPI schema
        if (!is_subclass_of(static::class, OpenApiSchemaProvider::class)) {
            return []; // No schema available, cannot validate
        }

        // Get appropriate schema
        $schema = match ($schemaType) {
            'list' => static::getListItemSchema(),
            'detail' => static::getDetailSchema(),
            default => static::getDetailSchema()
        };

        // Validate against schema
        return SchemaValidator::validate($data, $schema);
    }

    /**
     * Check if data is valid against OpenAPI schema
     *
     * Convenience method that returns boolean instead of error array.
     *
     * @param array<string, mixed> $data Data to validate
     * @param string $schemaType Schema type to use: 'list' or 'detail'
     * @return bool True if data is valid, false otherwise
     */
    protected static function isValidAgainstSchema(array $data, string $schemaType = 'detail'): bool
    {
        $errors = static::validateAgainstSchema($data, $schemaType);
        return empty($errors);
    }

    /**
     * Format data and log validation warnings if schema validation fails
     *
     * This method combines formatting and optional validation in one call.
     * Useful for development/staging environments to catch schema issues early.
     *
     * @param array<string, mixed> $data Data to format
     * @param string $schemaType Schema type to use: 'list' or 'detail'
     * @param bool $validateAfterFormat Whether to validate data after formatting (default: false)
     * @return array<string, mixed> Formatted data
     */
    protected static function formatAndValidate(array $data, string $schemaType = 'detail', bool $validateAfterFormat = false): array
    {
        // Format data first
        $formatted = static::formatBySchema($data, $schemaType);

        // Optionally validate (typically enabled in development mode)
        if ($validateAfterFormat) {
            $errors = static::validateAgainstSchema($formatted, $schemaType);

            if (!empty($errors)) {
                // Log validation errors without throwing exceptions
                // This allows development to continue while identifying issues
                $className = basename(str_replace('\\', '/', static::class));
                $errorMessage = "Schema validation warnings in {$className}::{$schemaType}: " . implode('; ', $errors);

                // Log to system log
                if (class_exists('\MikoPBX\Core\System\SystemMessages')) {
                    \MikoPBX\Core\System\SystemMessages::sysLogMsg(
                        static::class . '::' . __FUNCTION__,
                        $errorMessage,
                        LOG_WARNING
                    );
                }
            }
        }

        return $formatted;
    }

    /**
     * Create default data structure from OpenAPI schema
     *
     * Generates a default data structure by reading the OpenAPI schema and
     * creating appropriate default values for each field based on its type.
     *
     * This method eliminates the need for manual createForNew* methods by
     * using the schema as the single source of truth for data structure.
     *
     * Default value generation rules:
     * - Uses 'default' from schema if present
     * - Optionally uses 'example' from schema (disabled by default for new records)
     * - Falls back to type-based defaults:
     *   - boolean → false
     *   - integer → 0
     *   - number → 0
     *   - string → '' (or first enum value for enums)
     *   - array → []
     *   - object → {}
     *
     * The resulting data structure has proper types as defined in the schema.
     *
     * @param string $schemaType Schema type to use: 'list' or 'detail'
     * @param array<string, mixed> $overrides Optional field values to override defaults
     * @param bool $useExamples Whether to use 'example' values from schema (false = use type defaults)
     * @return array<string, mixed> Default data structure with proper types
     */
    public static function createFromSchema(
        string $schemaType = 'detail',
        array $overrides = [],
        bool $useExamples = false
    ): array
    {
        // Check if implementing class provides OpenAPI schema
        if (!is_subclass_of(static::class, OpenApiSchemaProvider::class)) {
            return $overrides; // No schema available, return overrides only
        }

        // Get appropriate schema
        $schema = match ($schemaType) {
            'list' => static::getListItemSchema(),
            'detail' => static::getDetailSchema(),
            default => static::getDetailSchema()
        };

        // Build default data structure from schema properties
        $data = [];

        if (isset($schema['properties']) && is_array($schema['properties'])) {
            foreach ($schema['properties'] as $fieldName => $fieldSchema) {
                // Skip if override is provided
                if (array_key_exists($fieldName, $overrides)) {
                    $data[$fieldName] = $overrides[$fieldName];
                    continue;
                }

                // Generate default value based on schema
                $data[$fieldName] = self::getDefaultValueForField($fieldSchema, $useExamples);
            }
        }

        // Merge any additional overrides not in schema
        foreach ($overrides as $fieldName => $value) {
            if (!array_key_exists($fieldName, $data)) {
                $data[$fieldName] = $value;
            }
        }

        // Apply schema formatting to ensure proper types
        return static::formatBySchema($data, $schemaType);
    }

    /**
     * Get default value for a field based on its OpenAPI schema
     *
     * Priority:
     * 1. 'default' property in schema (always used if present)
     * 2. 'example' property in schema (only if $useExamples = true)
     * 3. First enum value (for enum fields)
     * 4. Type-based default value
     *
     * @param array<string, mixed> $fieldSchema Field schema definition
     * @param bool $useExamples Whether to use 'example' values from schema
     * @return mixed Default value for the field
     */
    private static function getDefaultValueForField(array $fieldSchema, bool $useExamples = false)
    {
        // Priority 1: Use 'default' from schema (always used if present)
        if (array_key_exists('default', $fieldSchema)) {
            return $fieldSchema['default'];
        }

        // Priority 2: Use 'example' from schema (only if $useExamples = true)
        if ($useExamples && array_key_exists('example', $fieldSchema)) {
            return $fieldSchema['example'];
        }

        // Priority 3: For enums, use first value as default
        if (isset($fieldSchema['enum']) && is_array($fieldSchema['enum']) && !empty($fieldSchema['enum'])) {
            return $fieldSchema['enum'][0];
        }

        // Priority 4: Type-based defaults
        $type = $fieldSchema['type'] ?? 'string';

        return match ($type) {
            'boolean' => false,
            'integer' => 0,
            'number' => 0,
            'string' => '',
            'array' => [],
            'object' => [],
            default => null
        };
    }

    /**
     * Generate sanitization rules from parameter definitions
     *
     * Universal method that generates sanitization rules by reading parameter definitions
     * from getParameterDefinitions()['request'] section. This eliminates code duplication
     * across all DataStructure classes that implement the getParameterDefinitions pattern.
     *
     * Converts OpenAPI schema constraints to sanitization rule format:
     * - type → base type (string, integer, boolean, array)
     * - enum → in:value1,value2,...
     * - pattern → regex:/pattern/ (auto-adds delimiters)
     * - maxLength → max:value
     * - minimum → min:value (for integers)
     * - maximum → max:value (for integers)
     *
     * Usage:
     * ```php
     * // Direct usage (no need to override in child classes)
     * $rules = DataStructure::getSanitizationRules();
     * ```
     *
     * Requires child class to implement:
     * - getParameterDefinitions() returning ['request' => [...], 'response' => [...]]
     *
     * @return array<string, string> Sanitization rules in format 'field' => 'type|constraint:value'
     */
    public static function getSanitizationRules(): array
    {
        // Check if child class implements getParameterDefinitions()
        if (!method_exists(static::class, 'getParameterDefinitions')) {
            return [];
        }

        $definitions = static::getParameterDefinitions();
        $requestParams = $definitions['request'] ?? [];

        if (empty($requestParams)) {
            return [];
        }

        $rules = [];

        foreach ($requestParams as $field => $definition) {
            $sanitizationParts = [];

            // Add type (required)
            $type = $definition['type'] ?? 'string';
            $sanitizationParts[] = $type;

            // Add type-specific constraints
            if ($type === 'string') {
                // Pattern validation
                // Convert OpenAPI pattern (^pattern$) to PHP regex (/^pattern$/)
                if (isset($definition['pattern'])) {
                    $pattern = $definition['pattern'];
                    // Add delimiters if not present
                    if (!preg_match('/^[\/#~]/', $pattern)) {
                        $pattern = '/' . $pattern . '/';
                    }
                    $sanitizationParts[] = 'regex:' . $pattern;
                }

                // Max length constraint
                if (isset($definition['maxLength'])) {
                    $sanitizationParts[] = 'max:' . $definition['maxLength'];
                }

                // Enum (allowed values)
                if (isset($definition['enum'])) {
                    $sanitizationParts[] = 'in:' . implode(',', $definition['enum']);
                }
            } elseif ($type === 'integer' || $type === 'number') {
                // Minimum value
                if (isset($definition['minimum'])) {
                    $sanitizationParts[] = 'min:' . $definition['minimum'];
                }

                // Maximum value
                if (isset($definition['maximum'])) {
                    $sanitizationParts[] = 'max:' . $definition['maximum'];
                }
            } elseif ($type === 'boolean') {
                $sanitizationParts[] = 'boolean';
            } elseif ($type === 'array') {
                $sanitizationParts[] = 'array';
            }

            $rules[$field] = implode('|', $sanitizationParts);
        }

        return $rules;
    }
}