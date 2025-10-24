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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\Common\OpenApiSchemaProvider;
use MikoPBX\Core\System\Util;

/**
 * Response Schema Validator
 *
 * Validates API responses against OpenAPI schemas to catch discrepancies
 * between actual responses and documented schemas.
 *
 * Features:
 * - Detects unexpected fields (not in schema)
 * - Detects missing required fields
 * - Type validation (string, integer, boolean, array, object)
 * - Logs violations to SystemMessages for monitoring
 * - In development mode: throws exceptions to fail fast
 *
 * Usage:
 * ```php
 * ResponseSchemaValidator::validate($data, $dataStructureClass, 'detail');
 * ```
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class ResponseSchemaValidator
{
    /**
     * Enable strict mode (throws exceptions on violations)
     * Set to true in development/testing environments
     *
     * Can be enabled via:
     * 1. Environment variable: SCHEMA_VALIDATION_STRICT=1
     * 2. Runtime: ResponseSchemaValidator::setStrictMode(true)
     */
    private static bool $strictMode = false;

    /**
     * Check if strict mode should be enabled based on environment
     *
     * @return bool
     */
    private static function shouldEnableStrictMode(): bool
    {
        // Check if already explicitly set
        if (self::$strictMode) {
            return true;
        }

        // Check environment variable
        $envValue = getenv('SCHEMA_VALIDATION_STRICT');
        if ($envValue !== false && in_array(strtolower($envValue), ['1', 'true', 'yes', 'on'])) {
            return true;
        }

        // Check PHP ini setting (for testing environments)
        if (ini_get('display_errors') === '1' && PHP_SAPI === 'cli') {
            // In CLI with display_errors=1, assume testing environment
            return false; // Still require explicit opt-in
        }

        return false;
    }

    /**
     * Validate response data against OpenAPI schema
     *
     * @param array<string, mixed> $data Response data to validate
     * @param string $dataStructureClass Fully qualified DataStructure class name
     * @param string $schemaType Schema type: 'detail' (single record) or 'list' (collection)
     * @param string $context Context for logging (e.g., "AsteriskManagers::getRecord")
     * @return bool True if valid, false if violations found
     */
    public static function validate(
        array $data,
        string $dataStructureClass,
        string $schemaType = 'detail',
        string $context = ''
    ): bool {
        // Skip validation if class doesn't implement OpenApiSchemaProvider
        if (!is_subclass_of($dataStructureClass, OpenApiSchemaProvider::class)) {
            return true;
        }

        // Get schema from DataStructure
        $schema = self::getSchema($dataStructureClass, $schemaType);
        if ($schema === null) {
            self::logWarning("Schema not found for {$dataStructureClass}::{$schemaType}", $context);
            return true; // Don't fail if schema is missing
        }

        // Validate data against schema
        $violations = self::validateAgainstSchema($data, $schema, $context);

        // Log violations
        if (!empty($violations)) {
            // ALWAYS log violations first (before exception)
            $violationMessages = [];
            foreach ($violations as $violation) {
                self::logViolation($violation, $context);
                $violationMessages[] = "- {$violation['message']}";
            }

            // Log summary to make it easier to find in logs
            $summary = "Schema validation failed for {$dataStructureClass}::{$schemaType} in {$context}\n" .
                       "Total violations: " . count($violations) . "\n" .
                       implode("\n", $violationMessages);

            Util::sysLogMsg(
                'ResponseSchemaValidator',
                "[SCHEMA VALIDATION FAILED] {$summary}",
                LOG_ERR
            );

            // In strict mode, throw exception with full details
            if (self::shouldEnableStrictMode()) {
                throw new \RuntimeException(
                    "Schema validation failed for {$dataStructureClass}::{$schemaType}\n" .
                    "Context: {$context}\n" .
                    "Violations:\n" . implode("\n", $violationMessages)
                );
            }

            return false;
        }

        return true;
    }

    /**
     * Get schema from DataStructure class
     *
     * @param string $dataStructureClass
     * @param string $schemaType
     * @return array<string, mixed>|null
     */
    private static function getSchema(string $dataStructureClass, string $schemaType): ?array
    {
        try {
            if ($schemaType === 'detail') {
                return $dataStructureClass::getDetailSchema();
            }

            if ($schemaType === 'list') {
                return $dataStructureClass::getListItemSchema();
            }

            return null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Validate data against schema
     *
     * @param array<string, mixed> $data
     * @param array<string, mixed> $schema
     * @param string $context
     * @return array<int, array{type: string, field: string, message: string}>
     */
    private static function validateAgainstSchema(array $data, array $schema, string $context): array
    {
        $violations = [];
        $properties = $schema['properties'] ?? [];
        $required = $schema['required'] ?? [];

        // Check for unexpected fields (fields in data but not in schema)
        foreach ($data as $fieldName => $fieldValue) {
            if (!isset($properties[$fieldName])) {
                $violations[] = [
                    'type' => 'unexpected_field',
                    'field' => $fieldName,
                    'message' => "Field '{$fieldName}' is present in response but not defined in schema"
                ];
            }
        }

        // Check for missing required fields
        foreach ($required as $fieldName) {
            if (!array_key_exists($fieldName, $data)) {
                $violations[] = [
                    'type' => 'missing_required',
                    'field' => $fieldName,
                    'message' => "Required field '{$fieldName}' is missing from response"
                ];
            }
        }

        // Type validation for present fields
        foreach ($data as $fieldName => $fieldValue) {
            if (isset($properties[$fieldName])) {
                $fieldSchema = $properties[$fieldName];
                $expectedType = $fieldSchema['type'] ?? null;

                if ($expectedType !== null) {
                    $actualType = self::getActualType($fieldValue);

                    if (!self::isTypeCompatible($actualType, $expectedType)) {
                        $violations[] = [
                            'type' => 'type_mismatch',
                            'field' => $fieldName,
                            'message' => "Field '{$fieldName}' has type '{$actualType}' but schema expects '{$expectedType}'"
                        ];
                    }
                }
            }
        }

        return $violations;
    }

    /**
     * Get actual PHP type as OpenAPI type
     *
     * @param mixed $value
     * @return string
     */
    private static function getActualType($value): string
    {
        if (is_bool($value)) {
            return 'boolean';
        }
        if (is_int($value)) {
            return 'integer';
        }
        if (is_float($value)) {
            return 'number';
        }
        if (is_string($value)) {
            return 'string';
        }
        if (is_array($value)) {
            // Empty arrays are always arrays (lists), not objects
            if (empty($value)) {
                return 'array';
            }
            // Check if it's an object (associative array) or array (list)
            return array_keys($value) === range(0, count($value) - 1) ? 'array' : 'object';
        }
        if (is_object($value)) {
            return 'object';
        }
        if (is_null($value)) {
            return 'null';
        }

        return 'unknown';
    }

    /**
     * Check if actual type is compatible with expected type
     *
     * @param string $actualType
     * @param string $expectedType
     * @return bool
     */
    private static function isTypeCompatible(string $actualType, string $expectedType): bool
    {
        // Exact match
        if ($actualType === $expectedType) {
            return true;
        }

        // String compatibility (integers/floats can be represented as strings in JSON)
        if ($expectedType === 'string' && in_array($actualType, ['integer', 'number', 'boolean'])) {
            return true;
        }

        // Number compatibility
        if ($expectedType === 'number' && $actualType === 'integer') {
            return true;
        }

        return false;
    }

    /**
     * Log schema violation to SystemMessages
     *
     * @param array{type: string, field: string, message: string} $violation
     * @param string $context
     * @return void
     */
    private static function logViolation(array $violation, string $context): void
    {
        $message = "[Schema Violation] {$context}: {$violation['message']} (type: {$violation['type']}, field: {$violation['field']})";

        // Log to system messages
        Util::sysLogMsg(
            'ResponseSchemaValidator',
            $message,
            LOG_WARNING
        );
    }

    /**
     * Log warning message
     *
     * @param string $message
     * @param string $context
     * @return void
     */
    private static function logWarning(string $message, string $context): void
    {
        Util::sysLogMsg(
            'ResponseSchemaValidator',
            "[Warning] {$context}: {$message}",
            LOG_INFO
        );
    }

    /**
     * Enable strict mode (throws exceptions on violations)
     * Use in development/testing environments
     *
     * @param bool $enabled
     * @return void
     */
    public static function setStrictMode(bool $enabled): void
    {
        self::$strictMode = $enabled;
    }

    /**
     * Check if strict mode is enabled
     *
     * @return bool
     */
    public static function isStrictMode(): bool
    {
        return self::$strictMode;
    }
}
