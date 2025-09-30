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

/**
 * Formatter for applying OpenAPI schema types to data
 *
 * Automatically converts data types according to OpenAPI schema definitions,
 * eliminating the need for manual type conversion in DataStructure classes.
 *
 * Features:
 * - Converts string '0'/'1' to boolean false/true
 * - Converts strings to integers where specified
 * - Converts values to strings where specified
 * - Handles nullable fields
 * - Processes nested objects and arrays
 * - Preserves values that don't need conversion
 *
 * Usage:
 * ```php
 * $formatted = SchemaFormatter::format($data, $schema);
 * ```
 *
 * This replaces manual formatting like:
 * - formatBooleanFields()
 * - convertIntegerFields()
 * - convertNumericFieldsToStrings()
 *
 * @package MikoPBX\PBXCoreREST\Lib\Common
 */
class SchemaFormatter
{
    /**
     * Format data according to OpenAPI schema
     *
     * Applies type conversions based on schema definitions.
     * Only modifies fields that are present in the data.
     *
     * @param array<string, mixed> $data Data to format
     * @param array<string, mixed> $schema OpenAPI schema definition
     * @return array<string, mixed> Formatted data with proper types
     */
    public static function format(array $data, array $schema): array
    {
        $formatted = $data;

        // Process each property defined in schema
        if (isset($schema['properties']) && is_array($schema['properties'])) {
            foreach ($schema['properties'] as $fieldName => $fieldSchema) {
                // Only format fields that exist in data
                if (!array_key_exists($fieldName, $formatted)) {
                    continue;
                }

                $formatted[$fieldName] = self::formatField(
                    $formatted[$fieldName],
                    $fieldSchema
                );
            }
        }

        return $formatted;
    }

    /**
     * Format a single field value according to its schema
     *
     * @param mixed $value Field value to format
     * @param array<string, mixed> $fieldSchema Field schema definition
     * @return mixed Formatted value
     */
    private static function formatField($value, array $fieldSchema)
    {
        // Handle null values
        if ($value === null) {
            if (isset($fieldSchema['nullable']) && $fieldSchema['nullable'] === true) {
                return null; // Keep null for nullable fields
            }
            // Convert null to appropriate default for non-nullable fields
            return self::getDefaultForType($fieldSchema['type'] ?? 'string');
        }

        // Get expected type
        $type = $fieldSchema['type'] ?? null;

        if ($type === null) {
            // No type specified, return as-is
            return $value;
        }

        // Apply type conversion
        return match ($type) {
            'boolean' => self::formatBoolean($value),
            'integer' => self::formatInteger($value),
            'number' => self::formatNumber($value),
            'string' => self::formatString($value),
            'array' => self::formatArray($value, $fieldSchema),
            'object' => self::formatObject($value, $fieldSchema),
            default => $value
        };
    }

    /**
     * Format value as boolean
     *
     * Converts common boolean representations:
     * - '1' → true
     * - '0' → false
     * - 1 → true
     * - 0 → false
     * - Already boolean → unchanged
     *
     * @param mixed $value Value to convert
     * @return bool Boolean value
     */
    private static function formatBoolean($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_string($value)) {
            return $value === '1';
        }

        if (is_int($value)) {
            return $value === 1;
        }

        // Default to false for other types
        return (bool)$value;
    }

    /**
     * Format value as integer
     *
     * @param mixed $value Value to convert
     * @return int Integer value
     */
    private static function formatInteger($value): int
    {
        if (is_int($value)) {
            return $value;
        }

        if (is_string($value) || is_float($value)) {
            return (int)$value;
        }

        return 0;
    }

    /**
     * Format value as number (float or int)
     *
     * @param mixed $value Value to convert
     * @return int|float Numeric value
     */
    private static function formatNumber($value)
    {
        if (is_int($value) || is_float($value)) {
            return $value;
        }

        if (is_string($value)) {
            // Try to preserve integer if possible
            if (ctype_digit($value) || (str_starts_with($value, '-') && ctype_digit(substr($value, 1)))) {
                return (int)$value;
            }
            return (float)$value;
        }

        return 0;
    }

    /**
     * Format value as string
     *
     * @param mixed $value Value to convert
     * @return string String value
     */
    private static function formatString($value): string
    {
        if (is_string($value)) {
            return $value;
        }

        if (is_bool($value)) {
            return $value ? '1' : '0';
        }

        if (is_int($value) || is_float($value)) {
            return (string)$value;
        }

        if (is_array($value)) {
            return json_encode($value);
        }

        return '';
    }

    /**
     * Format array according to schema
     *
     * Applies item schema to each array element if defined
     *
     * @param mixed $value Value to format
     * @param array<string, mixed> $fieldSchema Field schema with items definition
     * @return array<mixed> Formatted array
     */
    private static function formatArray($value, array $fieldSchema): array
    {
        if (!is_array($value)) {
            return [];
        }

        // If no items schema defined, return as-is
        if (!isset($fieldSchema['items'])) {
            return $value;
        }

        // Format each item according to items schema
        $formatted = [];
        foreach ($value as $key => $item) {
            $formatted[$key] = self::formatField($item, $fieldSchema['items']);
        }

        return $formatted;
    }

    /**
     * Format nested object according to schema
     *
     * Recursively applies schema to nested object properties
     *
     * @param mixed $value Value to format
     * @param array<string, mixed> $fieldSchema Field schema with nested properties
     * @return array<string, mixed> Formatted object
     */
    private static function formatObject($value, array $fieldSchema): array
    {
        if (!is_array($value)) {
            return [];
        }

        // If no properties schema defined, return as-is
        if (!isset($fieldSchema['properties'])) {
            return $value;
        }

        // Recursively format nested object
        return self::format($value, $fieldSchema);
    }

    /**
     * Get default value for a type
     *
     * @param string $type OpenAPI type name
     * @return mixed Default value for type
     */
    private static function getDefaultForType(string $type)
    {
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
     * Format only specified fields from schema (convenience method)
     *
     * Useful when you want to format only a subset of fields.
     *
     * @param array<string, mixed> $data Data to format
     * @param array<string, mixed> $schema OpenAPI schema definition
     * @param array<string> $fieldNames List of field names to format
     * @return array<string, mixed> Data with only specified fields formatted
     */
    public static function formatFields(array $data, array $schema, array $fieldNames): array
    {
        $formatted = $data;

        if (!isset($schema['properties'])) {
            return $formatted;
        }

        foreach ($fieldNames as $fieldName) {
            if (isset($schema['properties'][$fieldName]) && array_key_exists($fieldName, $formatted)) {
                $formatted[$fieldName] = self::formatField(
                    $formatted[$fieldName],
                    $schema['properties'][$fieldName]
                );
            }
        }

        return $formatted;
    }

    /**
     * Check if a value needs formatting for the given type
     *
     * Helper method to determine if formatting is necessary
     *
     * @param mixed $value Value to check
     * @param string $expectedType Expected OpenAPI type
     * @return bool True if value needs formatting
     */
    public static function needsFormatting($value, string $expectedType): bool
    {
        return match ($expectedType) {
            'boolean' => !is_bool($value),
            'integer' => !is_int($value),
            'number' => !(is_int($value) || is_float($value)),
            'string' => !is_string($value),
            'array' => !is_array($value),
            'object' => !is_array($value),
            default => false
        };
    }
}