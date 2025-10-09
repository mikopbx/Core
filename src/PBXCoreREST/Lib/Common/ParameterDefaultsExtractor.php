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
 * Utility for extracting default values from ApiParameter attributes
 *
 * This class provides automatic extraction of default parameter values
 * from controller method attributes, eliminating the need to manually
 * define defaults in multiple places.
 *
 * Usage:
 * ```php
 * // In processor or action class
 * $defaults = ParameterDefaultsExtractor::extractFromController(
 *     YourController::class,
 *     'create'
 * );
 * $data = array_merge($defaults, $requestData);
 * ```
 *
 * Benefits:
 * - Single Source of Truth: defaults defined only in ApiParameter attributes
 * - Type Safety: defaults are properly typed (int, bool, string, etc.)
 * - Maintainability: changing default value in attribute automatically updates behavior
 * - No duplication: no need to define defaults in both controller and processor
 *
 * @package MikoPBX\PBXCoreREST\Lib\Common
 */
class ParameterDefaultsExtractor
{
    /**
     * Cache for extracted defaults to avoid repeated reflection operations
     *
     * @var array<string, array<string, array<string, mixed>>>
     */
    private static array $cache = [];

    /**
     * Extract default values from controller method's ApiParameter attributes
     *
     * Extracts all default values defined in ApiParameter attributes for a specific
     * controller method. Returns an associative array where keys are parameter names
     * and values are their defaults.
     *
     * Example:
     * ```php
     * // Controller method:
     * #[ApiParameter('limit', 'integer', ..., default: 20)]
     * #[ApiParameter('offset', 'integer', ..., default: 0)]
     * #[ApiParameter('order', 'string', ..., default: 'name')]
     * public function getList(): void { }
     *
     * // Extract:
     * $defaults = ParameterDefaultsExtractor::extractFromController(
     *     MyController::class,
     *     'getList'
     * );
     * // Returns: ['limit' => 20, 'offset' => 0, 'order' => 'name']
     * ```
     *
     * @param string $controllerClass Fully qualified controller class name
     * @param string $methodName Method name (e.g., 'create', 'getList', 'update')
     * @return array<string, mixed> Associative array of parameter names to default values
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

        $defaults = [];

        try {
            $reflection = new ReflectionClass($controllerClass);
            $method = $reflection->getMethod($methodName);
            $attributes = $method->getAttributes(ApiParameter::class);

            foreach ($attributes as $attribute) {
                $param = $attribute->newInstance();

                // Only extract if default is explicitly set
                if ($param->default !== null) {
                    $defaults[$param->name] = $param->default;
                }
            }
        } catch (ReflectionException $e) {
            // If reflection fails, return empty array
            // This can happen if class or method doesn't exist
            return [];
        }

        // Cache the result
        self::$cache[$cacheKey] = $defaults;

        return $defaults;
    }

    /**
     * Apply default values to request data
     *
     * Merges default values with request data, where request data takes precedence.
     * Only applies defaults for parameters that are not present in request data.
     *
     * Example:
     * ```php
     * $requestData = ['name' => 'Test', 'extension' => '200'];
     * $data = ParameterDefaultsExtractor::applyDefaults(
     *     MyController::class,
     *     'create',
     *     $requestData
     * );
     * // Result: ['name' => 'Test', 'extension' => '200', 'timeout' => 7, 'strategy' => 'ringall', ...]
     * ```
     *
     * @param string $controllerClass Controller class name
     * @param string $methodName Method name
     * @param array<string, mixed> $requestData Request data from client
     * @return array<string, mixed> Request data with defaults applied
     */
    public static function applyDefaults(
        string $controllerClass,
        string $methodName,
        array $requestData
    ): array {
        $defaults = self::extractFromController($controllerClass, $methodName);

        // Apply defaults only for missing keys
        foreach ($defaults as $key => $defaultValue) {
            if (!array_key_exists($key, $requestData)) {
                $requestData[$key] = $defaultValue;
            }
        }

        return $requestData;
    }

    /**
     * Get all defaults for a controller method (alias for extractFromController)
     *
     * @param string $controllerClass Controller class name
     * @param string $methodName Method name
     * @return array<string, mixed> Default values
     */
    public static function getDefaults(
        string $controllerClass,
        string $methodName
    ): array {
        return self::extractFromController($controllerClass, $methodName);
    }

    /**
     * Clear cache for specific controller or all controllers
     *
     * Useful for testing or when controllers are modified dynamically.
     *
     * @param string|null $controllerClass If null, clears entire cache. Otherwise, clears cache for specific controller.
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
     * Check if a parameter has a default value
     *
     * @param string $controllerClass Controller class name
     * @param string $methodName Method name
     * @param string $parameterName Parameter name to check
     * @return bool True if parameter has a default value
     */
    public static function hasDefault(
        string $controllerClass,
        string $methodName,
        string $parameterName
    ): bool {
        $defaults = self::extractFromController($controllerClass, $methodName);
        return array_key_exists($parameterName, $defaults);
    }

    /**
     * Get default value for a specific parameter
     *
     * @param string $controllerClass Controller class name
     * @param string $methodName Method name
     * @param string $parameterName Parameter name
     * @param mixed $fallback Fallback value if parameter has no default
     * @return mixed Default value or fallback
     */
    public static function getDefault(
        string $controllerClass,
        string $methodName,
        string $parameterName,
        mixed $fallback = null
    ): mixed {
        $defaults = self::extractFromController($controllerClass, $methodName);
        return $defaults[$parameterName] ?? $fallback;
    }

    /**
     * Extract defaults from DataStructure schema (alternative approach)
     *
     * This method extracts default values from OpenAPI schema defined in DataStructure.
     * Can be used when defaults need to be consistent between API and database models.
     *
     * @param string $dataStructureClass DataStructure class name (must implement OpenApiSchemaProvider)
     * @return array<string, mixed> Default values from schema
     */
    public static function extractFromSchema(string $dataStructureClass): array
    {
        // Check if class has getDetailSchema method
        if (!method_exists($dataStructureClass, 'getDetailSchema')) {
            return [];
        }

        $schema = $dataStructureClass::getDetailSchema();
        $defaults = [];

        if (!isset($schema['properties'])) {
            return [];
        }

        foreach ($schema['properties'] as $fieldName => $fieldSchema) {
            if (isset($fieldSchema['default'])) {
                $defaults[$fieldName] = $fieldSchema['default'];
            }
        }

        return $defaults;
    }

    /**
     * Merge defaults from both controller attributes and schema
     *
     * Controller attributes take precedence over schema defaults.
     *
     * @param string $controllerClass Controller class name
     * @param string $methodName Method name
     * @param string $dataStructureClass DataStructure class name
     * @return array<string, mixed> Merged defaults
     */
    public static function extractFromBoth(
        string $controllerClass,
        string $methodName,
        string $dataStructureClass
    ): array {
        $schemaDefaults = self::extractFromSchema($dataStructureClass);
        $attributeDefaults = self::extractFromController($controllerClass, $methodName);

        // Attribute defaults override schema defaults
        return array_merge($schemaDefaults, $attributeDefaults);
    }
}
