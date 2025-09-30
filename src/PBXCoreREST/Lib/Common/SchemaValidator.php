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
 * Validator for OpenAPI schema compliance
 *
 * Validates data structures against OpenAPI 3.1 schemas to ensure
 * API responses match their documented specifications.
 *
 * Features:
 * - Type validation (string, integer, boolean, array, object)
 * - Required field checking
 * - Enum value validation
 * - Pattern matching (regex)
 * - Nested object/array validation
 * - Detailed error reporting with field paths
 *
 * Usage:
 * ```php
 * $errors = SchemaValidator::validate($data, $schema);
 * if (!empty($errors)) {
 *     // Handle validation errors
 * }
 * ```
 *
 * @package MikoPBX\PBXCoreREST\Lib\Common
 */
class SchemaValidator
{
    /**
     * Validate data against OpenAPI schema
     *
     * @param array<string, mixed> $data Data to validate
     * @param array<string, mixed> $schema OpenAPI schema definition
     * @param string $path Current path in data structure (for error reporting)
     * @return array<string> Array of validation error messages (empty if valid)
     */
    public static function validate(array $data, array $schema, string $path = ''): array
    {
        $errors = [];

        // Validate required fields
        if (isset($schema['required']) && is_array($schema['required'])) {
            foreach ($schema['required'] as $requiredField) {
                if (!array_key_exists($requiredField, $data)) {
                    $fieldPath = self::buildPath($path, $requiredField);
                    $errors[] = "Missing required field: {$fieldPath}";
                }
            }
        }

        // Validate properties if schema defines them
        if (isset($schema['properties']) && is_array($schema['properties'])) {
            foreach ($schema['properties'] as $fieldName => $fieldSchema) {
                $fieldPath = self::buildPath($path, $fieldName);

                // Skip validation if field is not present and not required
                if (!array_key_exists($fieldName, $data)) {
                    continue;
                }

                $fieldValue = $data[$fieldName];

                // Validate field
                $fieldErrors = self::validateField($fieldValue, $fieldSchema, $fieldPath);
                $errors = array_merge($errors, $fieldErrors);
            }
        }

        return $errors;
    }

    /**
     * Validate a single field against its schema
     *
     * @param mixed $value Field value
     * @param array<string, mixed> $schema Field schema definition
     * @param string $path Field path for error reporting
     * @return array<string> Validation errors
     */
    private static function validateField($value, array $schema, string $path): array
    {
        $errors = [];

        // Handle nullable fields
        if ($value === null) {
            if (isset($schema['nullable']) && $schema['nullable'] === true) {
                return []; // Null is allowed
            }
            $errors[] = "Field {$path} cannot be null";
            return $errors;
        }

        // Validate type
        if (isset($schema['type'])) {
            $typeErrors = self::validateType($value, $schema['type'], $path);
            $errors = array_merge($errors, $typeErrors);

            // Stop validation if type is wrong (prevents cascading errors)
            if (!empty($typeErrors)) {
                return $errors;
            }
        }

        // Validate enum values
        if (isset($schema['enum']) && is_array($schema['enum'])) {
            if (!in_array($value, $schema['enum'], true)) {
                $allowedValues = implode(', ', array_map(fn($v) => var_export($v, true), $schema['enum']));
                $errors[] = "Field {$path} must be one of: {$allowedValues}, got: " . var_export($value, true);
            }
        }

        // Validate pattern (regex) for strings
        if (isset($schema['pattern']) && is_string($value)) {
            if (!preg_match('/' . $schema['pattern'] . '/', $value)) {
                $errors[] = "Field {$path} does not match pattern: {$schema['pattern']}";
            }
        }

        // Validate string length
        if (is_string($value)) {
            if (isset($schema['minLength']) && mb_strlen($value) < $schema['minLength']) {
                $errors[] = "Field {$path} is too short (minimum: {$schema['minLength']})";
            }
            if (isset($schema['maxLength']) && mb_strlen($value) > $schema['maxLength']) {
                $errors[] = "Field {$path} is too long (maximum: {$schema['maxLength']})";
            }
        }

        // Validate numeric ranges
        if (is_int($value) || is_float($value)) {
            if (isset($schema['minimum']) && $value < $schema['minimum']) {
                $errors[] = "Field {$path} is below minimum value: {$schema['minimum']}";
            }
            if (isset($schema['maximum']) && $value > $schema['maximum']) {
                $errors[] = "Field {$path} exceeds maximum value: {$schema['maximum']}";
            }
        }

        // Validate nested objects
        if (is_array($value) && ($schema['type'] ?? null) === 'object') {
            $nestedErrors = self::validate($value, $schema, $path);
            $errors = array_merge($errors, $nestedErrors);
        }

        // Validate arrays
        if (is_array($value) && ($schema['type'] ?? null) === 'array') {
            if (isset($schema['items'])) {
                foreach ($value as $index => $item) {
                    $itemPath = "{$path}[{$index}]";
                    $itemErrors = self::validateField($item, $schema['items'], $itemPath);
                    $errors = array_merge($errors, $itemErrors);
                }
            }
        }

        return $errors;
    }

    /**
     * Validate value type
     *
     * @param mixed $value Value to validate
     * @param string $expectedType Expected OpenAPI type
     * @param string $path Field path for error reporting
     * @return array<string> Type validation errors
     */
    private static function validateType($value, string $expectedType, string $path): array
    {
        $actualType = self::getValueType($value);

        // OpenAPI type mapping
        $typeValid = match ($expectedType) {
            'string' => is_string($value),
            'integer' => is_int($value),
            'number' => is_int($value) || is_float($value),
            'boolean' => is_bool($value),
            'array' => is_array($value) && array_keys($value) === range(0, count($value) - 1),
            'object' => is_array($value),
            default => true // Unknown type, skip validation
        };

        if (!$typeValid) {
            return ["Field {$path} has wrong type: expected {$expectedType}, got {$actualType}"];
        }

        return [];
    }

    /**
     * Get OpenAPI type name for a value
     *
     * @param mixed $value Value to get type for
     * @return string OpenAPI type name
     */
    private static function getValueType($value): string
    {
        return match (true) {
            is_string($value) => 'string',
            is_int($value) => 'integer',
            is_float($value) => 'number',
            is_bool($value) => 'boolean',
            is_array($value) && array_keys($value) === range(0, count($value) - 1) => 'array',
            is_array($value) => 'object',
            is_null($value) => 'null',
            default => 'unknown'
        };
    }

    /**
     * Build field path for error reporting
     *
     * @param string $parentPath Parent path
     * @param string $fieldName Field name to append
     * @return string Combined path
     */
    private static function buildPath(string $parentPath, string $fieldName): string
    {
        if (empty($parentPath)) {
            return $fieldName;
        }

        return "{$parentPath}.{$fieldName}";
    }

    /**
     * Check if data is valid against schema (convenience method)
     *
     * @param array<string, mixed> $data Data to validate
     * @param array<string, mixed> $schema OpenAPI schema definition
     * @return bool True if valid, false if there are errors
     */
    public static function isValid(array $data, array $schema): bool
    {
        $errors = self::validate($data, $schema);
        return empty($errors);
    }
}