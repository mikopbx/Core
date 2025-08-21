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

use MikoPBX\AdminCabinet\Forms\GeneralSettingsEditForm;
use Phalcon\Annotations\Adapter\Memory as AnnotationsMemory;
use Phalcon\Di\Di;
use ReflectionClass;

/**
 * FieldTypeResolver - Universal field type resolver based on annotations
 * 
 * This class provides a unified way to determine field types from annotations
 * on any class (models, settings, data structures). It supports:
 * - Property annotations: @FieldType on class properties
 * - Constant annotations: @FieldType on class constants
 * - Method for automatic value conversion based on type
 * 
 * Usage:
 * - Add @FieldType('type') annotations to properties or constants
 * - Use FieldTypeResolver to get type info and convert values
 * 
 * Supported types:
 * - boolean: Converts "1"/"0" to true/false
 * - integer: Converts numeric strings to integers
 * - float: Converts numeric strings to floats
 * - password: Masks sensitive data
 * - json: Encodes/decodes JSON data
 * - array: Handles array serialization
 * - string: Default type, no conversion
 */
class FieldTypeResolver
{
    /**
     * Cache for resolved field types per class
     * Format: ['ClassName' => ['fieldName' => 'type']]
     * 
     * @var array<string, array<string, string>>
     */
    private static array $typeCache = [];
    
    /**
     * Default field type when no annotation is found
     */
    private const string DEFAULT_TYPE = 'string';
    
    /**
     * Valid field types
     */
    private const array VALID_TYPES = [
        'boolean', 
        'integer', 
        'float',
        'password', 
        'string',
        'json',
        'array',
        'datetime',
        'date',
        'time'
    ];
    
    /**
     * Get the field type for a given class and field
     * 
     * @param string $className Fully qualified class name
     * @param string $fieldName Field name (property or constant value)
     * @return string The field type
     */
    public static function getFieldType(string $className, string $fieldName): string
    {
        if (!isset(self::$typeCache[$className])) {
            self::buildTypeCacheForClass($className);
        }
        
        return self::$typeCache[$className][$fieldName] ?? self::DEFAULT_TYPE;
    }
    
    /**
     * Convert value to API format based on field type
     * 
     * @param mixed $value Raw value (usually from database)
     * @param string $className Class that defines the field
     * @param string $fieldName Field name
     * @return mixed Converted value for API response
     */
    public static function convertToApiFormat(mixed $value, string $className, string $fieldName): mixed
    {
        $type = self::getFieldType($className, $fieldName);
        
        return match($type) {
            'boolean' => self::convertToBoolean($value),
            'integer' => self::convertToInteger($value),
            'float' => self::convertToFloat($value),
            'password' => self::maskPassword(),
            'json' => self::decodeJson($value),
            'array' => self::convertToArray($value),
            'datetime', 'date', 'time' => self::formatDateTime($value, $type),
            default => (string)$value
        };
    }
    
    /**
     * Convert value from API format to storage format
     * 
     * @param mixed $value Value from API request
     * @param string $className Class that defines the field
     * @param string $fieldName Field name
     * @return string Value formatted for database storage
     */
    public static function convertForStorage(mixed $value, string $className, string $fieldName): string
    {
        $type = self::getFieldType($className, $fieldName);
        
        return match($type) {
            'boolean' => self::booleanToStorage($value),
            'integer', 'float' => (string)$value,
            'json' => self::encodeJson($value),
            'array' => self::arrayToStorage($value),
            'datetime', 'date', 'time' => self::dateTimeToStorage($value, $type),
            default => (string)$value
        };
    }
    
    /**
     * Check if a field is of a specific type
     * 
     * @param string $className Class name
     * @param string $fieldName Field name
     * @param string $type Type to check
     * @return bool True if field is of specified type
     */
    public static function isFieldType(string $className, string $fieldName, string $type): bool
    {
        return self::getFieldType($className, $fieldName) === $type;
    }
    
    /**
     * Get all fields of a specific type for a class
     * 
     * @param string $className Class name
     * @param string $type Field type to filter by
     * @return array<string> Array of field names
     */
    public static function getFieldsByType(string $className, string $type): array
    {
        if (!isset(self::$typeCache[$className])) {
            self::buildTypeCacheForClass($className);
        }
        
        return array_keys(array_filter(
            self::$typeCache[$className] ?? [],
            fn($fieldType) => $fieldType === $type
        ));
    }
    
    /**
     * Build type cache for a specific class
     * 
     * @param string $className Fully qualified class name
     */
    private static function buildTypeCacheForClass(string $className): void
    {
        self::$typeCache[$className] = [];
        
        try {
            // Get annotations adapter
            $di = Di::getDefault();
            if ($di && $di->has('annotations')) {
                $annotationsAdapter = $di->getShared('annotations');
            } else {
                $annotationsAdapter = new AnnotationsMemory();
            }
            
            // Get annotations for the class
            $reflection = $annotationsAdapter->get($className);
            
            // Process property annotations
            $propertiesAnnotations = $reflection->getPropertiesAnnotations();
            foreach ($propertiesAnnotations as $propertyName => $annotations) {
                if ($annotations->has('FieldType')) {
                    $annotation = $annotations->get('FieldType');
                    $arguments = $annotation->getArguments();
                    
                    if (!empty($arguments) && in_array($arguments[0], self::VALID_TYPES, true)) {
                        self::$typeCache[$className][$propertyName] = $arguments[0];
                    }
                }
            }
            
            // Process constant annotations (for settings classes)
            $constantsAnnotations = $reflection->getConstantsAnnotations();
            if ($constantsAnnotations) {
                $reflectionClass = new ReflectionClass($className);
                $constants = $reflectionClass->getConstants();
                
                foreach ($constantsAnnotations as $constantName => $annotations) {
                    if ($annotations->has('FieldType')) {
                        $annotation = $annotations->get('FieldType');
                        $arguments = $annotation->getArguments();
                        
                        if (!empty($arguments) && in_array($arguments[0], self::VALID_TYPES, true)) {
                            $type = $arguments[0];
                            
                            // Store by constant name
                            self::$typeCache[$className][$constantName] = $type;
                            
                            // Also store by constant value for convenience
                            if (isset($constants[$constantName])) {
                                self::$typeCache[$className][$constants[$constantName]] = $type;
                            }
                        }
                    }
                }
            }
            
        } catch (\Exception $e) {
            // If annotation parsing fails, cache stays empty (will use defaults)
            self::$typeCache[$className] = [];
        }
    }
    
    /**
     * Convert value to boolean
     * 
     * @param mixed $value Value to convert
     * @return bool Boolean representation
     */
    private static function convertToBoolean(mixed $value): bool
    {
        return $value === '1' || $value === 1 || $value === true || $value === 'true';
    }
    
    /**
     * Convert value to integer
     * 
     * @param mixed $value Value to convert
     * @return int|mixed Integer or original value if not numeric
     */
    private static function convertToInteger(mixed $value): mixed
    {
        return is_numeric($value) ? (int)$value : $value;
    }
    
    /**
     * Convert value to float
     * 
     * @param mixed $value Value to convert
     * @return float|mixed Float or original value if not numeric
     */
    private static function convertToFloat(mixed $value): mixed
    {
        return is_numeric($value) ? (float)$value : $value;
    }
    
    /**
     * Mask password field
     * 
     * @return string Masked password placeholder
     */
    private static function maskPassword(): string
    {
        return GeneralSettingsEditForm::HIDDEN_PASSWORD;
    }
    
    /**
     * Decode JSON string
     * 
     * @param mixed $value JSON string to decode
     * @return mixed Decoded value or original if not valid JSON
     */
    private static function decodeJson(mixed $value): mixed
    {
        if (!is_string($value)) {
            return $value;
        }
        
        $decoded = json_decode($value, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
    }
    
    /**
     * Encode value as JSON
     * 
     * @param mixed $value Value to encode
     * @return string JSON string
     */
    private static function encodeJson(mixed $value): string
    {
        if (is_string($value)) {
            return $value;
        }
        
        $encoded = json_encode($value);
        return $encoded !== false ? $encoded : '';
    }
    
    /**
     * Convert value to array
     * 
     * @param mixed $value Value to convert
     * @return array Array representation
     */
    private static function convertToArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        
        if (is_string($value)) {
            // Try JSON decode first
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $decoded;
            }
            
            // Try comma-separated values
            if (str_contains($value, ',')) {
                return array_map('trim', explode(',', $value));
            }
        }
        
        return [$value];
    }
    
    /**
     * Convert array to storage format
     * 
     * @param mixed $value Array to convert
     * @return string Storage representation
     */
    private static function arrayToStorage(mixed $value): string
    {
        if (!is_array($value)) {
            return (string)$value;
        }
        
        // Use JSON for complex arrays
        $encoded = json_encode($value);
        return $encoded !== false ? $encoded : '';
    }
    
    /**
     * Format datetime value for API
     * 
     * @param mixed $value Datetime value
     * @param string $type Type of datetime field
     * @return string Formatted datetime
     */
    private static function formatDateTime(mixed $value, string $type): string
    {
        if (empty($value)) {
            return '';
        }
        
        $timestamp = is_numeric($value) ? (int)$value : strtotime((string)$value);
        if ($timestamp === false) {
            return (string)$value;
        }
        
        return match($type) {
            'datetime' => date('Y-m-d H:i:s', $timestamp),
            'date' => date('Y-m-d', $timestamp),
            'time' => date('H:i:s', $timestamp),
            default => (string)$value
        };
    }
    
    /**
     * Convert datetime to storage format
     * 
     * @param mixed $value Datetime value
     * @param string $type Type of datetime field
     * @return string Storage representation
     */
    private static function dateTimeToStorage(mixed $value, string $type): string
    {
        if (empty($value)) {
            return '';
        }
        
        // If already in correct format, return as is
        if (is_string($value)) {
            return $value;
        }
        
        // Convert DateTime objects
        if ($value instanceof \DateTime) {
            return match($type) {
                'datetime' => $value->format('Y-m-d H:i:s'),
                'date' => $value->format('Y-m-d'),
                'time' => $value->format('H:i:s'),
                default => $value->format('Y-m-d H:i:s')
            };
        }
        
        return (string)$value;
    }
    
    /**
     * Convert boolean to storage format
     * 
     * @param mixed $value Boolean value
     * @return string "1" or "0"
     */
    private static function booleanToStorage(mixed $value): string
    {
        $isTrue = $value === true || $value === 'true' || $value === '1' || $value === 'on' || $value === 1;
        return $isTrue ? '1' : '0';
    }
    
    /**
     * Clear cache for a specific class or all classes
     * 
     * @param string|null $className Class name to clear, or null for all
     */
    public static function clearCache(?string $className = null): void
    {
        if ($className === null) {
            self::$typeCache = [];
        } elseif (isset(self::$typeCache[$className])) {
            unset(self::$typeCache[$className]);
        }
    }
}