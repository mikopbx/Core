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
}