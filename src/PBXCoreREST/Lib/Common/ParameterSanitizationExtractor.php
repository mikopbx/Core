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

use MikoPBX\PBXCoreREST\Attributes\ApiParameter;
use ReflectionClass;
use ReflectionException;

/**
 * Utility for extracting sanitization rules from ApiParameter attributes
 *
 * This class provides automatic extraction of validation and sanitization rules
 * from controller method attributes, eliminating the need to manually define
 * rules in multiple places.
 *
 * Usage:
 * ```php
 * // Extract rules from controller attributes
 * $rules = ParameterSanitizationExtractor::extractFromController(
 *     YourController::class,
 *     'create'
 * );
 *
 * // Use with BaseActionHelper
 * $sanitized = BaseActionHelper::sanitizeData($data, $rules);
 * ```
 *
 * Benefits:
 * - Single Source of Truth: rules defined only in ApiParameter attributes
 * - Automatic generation of validation rules from constraints
 * - Type Safety: proper type handling (int, bool, string, array)
 * - No duplication: no need to define rules in both controller and processor
 *
 * @package MikoPBX\PBXCoreREST\Lib\Common
 */
class ParameterSanitizationExtractor
{
    /**
     * Cache for extracted rules to avoid repeated reflection operations
     *
     * @var array<string, array<string, string>>
     */
    private static array $cache = [];

    /**
     * Extract sanitization rules from controller method's ApiParameter attributes
     *
     * Generates rules in format compatible with BaseActionHelper::sanitizeData().
     * Each rule is a string with pipe-separated constraints:
     * - Type: int, float, bool, string, array
     * - Min/Max: min:1, max:100
     * - Length: min:2, max:255
     * - Pattern: regex:/^[0-9]+$/
     * - Enum: in:value1,value2,value3
     *
     * Example output:
     * ```php
     * [
     *     'timeout' => 'int|min:1|max:60',
     *     'extension' => 'string|regex:/^[0-9]{2,8}$/',
     *     'strategy' => 'string|in:ringall,leastrecent,random',
     *     'enabled' => 'bool'
     * ]
     * ```
     *
     * @param string $controllerClass Fully qualified controller class name
     * @param string $methodName Method name (e.g., 'create', 'getList', 'update')
     * @return array<string, string> Associative array of parameter names to sanitization rules
     */
    public static function extractFromController(
        string $controllerClass,
        string $methodName
    ): array {
        // Check cache first
        $cacheKey = $controllerClass . '::' . $methodName;
        if (isset(self::$cache[$cacheKey])) {
            return self::$cache[$cacheKey];
        }

        $rules = [];

        try {
            $reflection = new ReflectionClass($controllerClass);
            $method = $reflection->getMethod($methodName);
            $attributes = $method->getAttributes(ApiParameter::class);

            foreach ($attributes as $attribute) {
                $param = $attribute->newInstance();

                // Generate sanitization rule from parameter constraints
                $rule = self::generateRuleFromParameter($param);

                if (!empty($rule)) {
                    $rules[$param->name] = $rule;
                }
            }
        } catch (ReflectionException $e) {
            // If reflection fails, return empty array
            return [];
        }

        // Cache the result
        self::$cache[$cacheKey] = $rules;

        return $rules;
    }

    /**
     * Generate sanitization rule string from ApiParameter
     *
     * Converts ApiParameter constraints into BaseActionHelper format:
     * - type → int, float, bool, string, array
     * - minimum/maximum → min:N, max:N
     * - minLength/maxLength → min:N, max:N (for strings)
     * - pattern → regex:/pattern/
     * - enum → in:val1,val2,val3
     *
     * @param ApiParameter $param Parameter attribute instance
     * @return string Sanitization rule (e.g., 'int|min:1|max:100')
     */
    private static function generateRuleFromParameter(ApiParameter $param): string
    {
        $ruleParts = [];

        // Add type constraint
        $type = $param->type;
        $ruleParts[] = match ($type) {
            'integer' => 'int',
            'number' => 'float',
            'boolean' => 'bool',
            'array' => 'array',
            default => 'string'
        };

        // Add numeric range constraints (for integer/number types)
        if (in_array($type, ['integer', 'number'], true)) {
            if ($param->minimum !== null) {
                $ruleParts[] = 'min:' . $param->minimum;
            }
            if ($param->maximum !== null) {
                $ruleParts[] = 'max:' . $param->maximum;
            }
        }

        // Add string length constraints
        if ($type === 'string') {
            if ($param->minLength !== null) {
                $ruleParts[] = 'min:' . $param->minLength;
            }
            if ($param->maxLength !== null) {
                $ruleParts[] = 'max:' . $param->maxLength;
            }
        }

        // Add pattern constraint
        if ($param->pattern !== null && is_string($param->pattern)) {
            // Remove ^ and $ anchors as they're added by regex validator
            $pattern = str_replace(['^', '$'], '', $param->pattern);
            $ruleParts[] = 'regex:/' . $pattern . '/';
        }

        // Add enum constraint
        if (!empty($param->enum) && is_array($param->enum)) {
            $ruleParts[] = 'in:' . implode(',', $param->enum);
        }

        // Add nullable constraint if needed
        if (!$param->required) {
            $ruleParts[] = 'nullable';
        }

        return implode('|', $ruleParts);
    }

    /**
     * Extract sanitization rules and apply to data
     *
     * Convenience method that combines extraction and sanitization in one call.
     *
     * @param string $controllerClass Controller class name
     * @param string $methodName Method name
     * @param array<string, mixed> $data Data to sanitize
     * @return array<string, mixed> Sanitized data
     */
    public static function sanitizeData(
        string $controllerClass,
        string $methodName,
        array $data
    ): array {
        $rules = self::extractFromController($controllerClass, $methodName);

        // Filter data to only include fields that have rules
        $dataToSanitize = array_intersect_key($data, $rules);

        return BaseActionHelper::sanitizeData($dataToSanitize, $rules);
    }

    /**
     * Extract validation rules in different format (for custom validators)
     *
     * Returns rules in array format instead of string format:
     * ```php
     * [
     *     'timeout' => ['type' => 'int', 'min' => 1, 'max' => 60],
     *     'extension' => ['type' => 'string', 'pattern' => '^[0-9]{2,8}$']
     * ]
     * ```
     *
     * @param string $controllerClass Controller class name
     * @param string $methodName Method name
     * @return array<string, array<string, mixed>> Validation rules in array format
     */
    public static function extractValidationRules(
        string $controllerClass,
        string $methodName
    ): array {
        $rules = [];

        try {
            $reflection = new ReflectionClass($controllerClass);
            $method = $reflection->getMethod($methodName);
            $attributes = $method->getAttributes(ApiParameter::class);

            foreach ($attributes as $attribute) {
                $param = $attribute->newInstance();

                $fieldRules = [
                    'type' => $param->type,
                    'required' => $param->required
                ];

                // Add numeric constraints
                if ($param->minimum !== null) {
                    $fieldRules['minimum'] = $param->minimum;
                }
                if ($param->maximum !== null) {
                    $fieldRules['maximum'] = $param->maximum;
                }

                // Add string constraints
                if ($param->minLength !== null) {
                    $fieldRules['minLength'] = $param->minLength;
                }
                if ($param->maxLength !== null) {
                    $fieldRules['maxLength'] = $param->maxLength;
                }

                // Add pattern
                if ($param->pattern !== null) {
                    $fieldRules['pattern'] = $param->pattern;
                }

                // Add enum
                if (!empty($param->enum)) {
                    $fieldRules['enum'] = $param->enum;
                }

                // Add format
                if ($param->format !== null) {
                    $fieldRules['format'] = $param->format;
                }

                $rules[$param->name] = $fieldRules;
            }
        } catch (ReflectionException $e) {
            return [];
        }

        return $rules;
    }

    /**
     * Get required field names
     *
     * @param string $controllerClass Controller class name
     * @param string $methodName Method name
     * @return array<string> List of required field names
     */
    public static function getRequiredFields(
        string $controllerClass,
        string $methodName
    ): array {
        $required = [];

        try {
            $reflection = new ReflectionClass($controllerClass);
            $method = $reflection->getMethod($methodName);
            $attributes = $method->getAttributes(ApiParameter::class);

            foreach ($attributes as $attribute) {
                $param = $attribute->newInstance();
                if ($param->required) {
                    $required[] = $param->name;
                }
            }
        } catch (ReflectionException $e) {
            return [];
        }

        return $required;
    }

    /**
     * Check if parameter has specific constraint
     *
     * @param string $controllerClass Controller class name
     * @param string $methodName Method name
     * @param string $parameterName Parameter name
     * @param string $constraint Constraint name (e.g., 'required', 'enum', 'pattern')
     * @return bool True if parameter has the constraint
     */
    public static function hasConstraint(
        string $controllerClass,
        string $methodName,
        string $parameterName,
        string $constraint
    ): bool {
        try {
            $reflection = new ReflectionClass($controllerClass);
            $method = $reflection->getMethod($methodName);
            $attributes = $method->getAttributes(ApiParameter::class);

            foreach ($attributes as $attribute) {
                $param = $attribute->newInstance();
                if ($param->name === $parameterName) {
                    return match ($constraint) {
                        'required' => $param->required,
                        'enum' => !empty($param->enum),
                        'pattern' => $param->pattern !== null,
                        'minimum' => $param->minimum !== null,
                        'maximum' => $param->maximum !== null,
                        'minLength' => $param->minLength !== null,
                        'maxLength' => $param->maxLength !== null,
                        default => false
                    };
                }
            }
        } catch (ReflectionException $e) {
            return false;
        }

        return false;
    }

    /**
     * Extract rules from DataStructure schema (alternative source)
     *
     * @param string $dataStructureClass DataStructure class name
     * @return array<string, string> Sanitization rules
     */
    public static function extractFromSchema(string $dataStructureClass): array
    {
        // Check if class has getSanitizationRules method
        if (!method_exists($dataStructureClass, 'getSanitizationRules')) {
            return [];
        }

        return $dataStructureClass::getSanitizationRules();
    }

    /**
     * Merge rules from both controller attributes and schema
     *
     * Controller attributes take precedence over schema rules.
     *
     * @param string $controllerClass Controller class name
     * @param string $methodName Method name
     * @param string $dataStructureClass DataStructure class name
     * @return array<string, string> Merged sanitization rules
     */
    public static function extractFromBoth(
        string $controllerClass,
        string $methodName,
        string $dataStructureClass
    ): array {
        $schemaRules = self::extractFromSchema($dataStructureClass);
        $attributeRules = self::extractFromController($controllerClass, $methodName);

        // Attribute rules override schema rules
        return array_merge($schemaRules, $attributeRules);
    }

    /**
     * Clear cache for specific controller or all controllers
     *
     * @param string|null $controllerClass If null, clears entire cache
     * @return void
     */
    public static function clearCache(?string $controllerClass = null): void
    {
        if ($controllerClass === null) {
            self::$cache = [];
        } else {
            foreach (array_keys(self::$cache) as $key) {
                if (str_starts_with($key, $controllerClass . '::')) {
                    unset(self::$cache[$key]);
                }
            }
        }
    }

    /**
     * Get rule for specific parameter
     *
     * @param string $controllerClass Controller class name
     * @param string $methodName Method name
     * @param string $parameterName Parameter name
     * @return string|null Sanitization rule or null if not found
     */
    public static function getRule(
        string $controllerClass,
        string $methodName,
        string $parameterName
    ): ?string {
        $rules = self::extractFromController($controllerClass, $methodName);
        return $rules[$parameterName] ?? null;
    }
}
