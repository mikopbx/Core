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

namespace MikoPBX\PBXCoreREST\Middleware;

use MikoPBX\PBXCoreREST\Services\ApiMetadataRegistry;
use MikoPBX\PBXCoreREST\Attributes\ApiResource;
use Phalcon\Di\Injectable;
use Phalcon\Http\Request;
use Phalcon\Http\Response;
use Phalcon\Filter\Validation;
use Phalcon\Filter\Validation\Validator\{
    PresenceOf,
    StringLength,
    Numericality,
    Regex,
    InclusionIn
};
use ReflectionClass;

/**
 * API validation middleware for request parameter validation
 *
 * This middleware validates incoming API requests against schemas defined
 * in PHP 8 Attributes. Security and authentication are handled by other middleware.
 *
 * @package MikoPBX\PBXCoreREST\Middleware
 */
class ApiValidationMiddleware extends Injectable
{
    /**
     * Cached validation schemas
     *
     * @var array<string, mixed>
     */
    private array $validationCache = [];


    /**
     * Validate request before processing
     *
     * @param string $controllerClass Controller class name
     * @param string $actionName Action method name
     * @param array<string, mixed> $requestData Request data to validate
     * @return array<string, mixed> Validation result with success status and messages
     */
    public function validateRequest(string $controllerClass, string $actionName, array $requestData): array
    {
        $result = [
            'success' => true,
            'messages' => [],
            'validatedData' => $requestData
        ];

        try {
            // Get validation schema for this endpoint
            $schema = $this->getValidationSchema($controllerClass, $actionName);

            if (empty($schema)) {
                // No validation rules defined, allow request
                return $result;
            }

            // Validate request data
            $validation = new Validation();
            $this->buildValidationRules($validation, $schema);

            $validationResult = $validation->validate($requestData);

            if (count($validationResult) > 0) {
                $result['success'] = false;
                foreach ($validationResult as $message) {
                    $result['messages'][] = $message->getMessage();
                }
            } else {
                // Sanitize and type-cast validated data
                $result['validatedData'] = $this->sanitizeValidatedData($requestData, $schema);
            }

        } catch (\Exception $e) {
            $result['success'] = false;
            $result['messages'][] = 'Validation error: ' . $e->getMessage();
        }

        return $result;
    }


    /**
     * Get validation schema for a specific endpoint
     *
     * @param string $controllerClass Controller class name
     * @param string $actionName Action method name
     * @return array<string, mixed> Validation schema
     */
    private function getValidationSchema(string $controllerClass, string $actionName): array
    {
        $cacheKey = $controllerClass . '::' . $actionName;

        if (isset($this->validationCache[$cacheKey])) {
            return $this->validationCache[$cacheKey];
        }

        try {
            $registry = $this->getDI()->getShared('apiMetadataRegistry');
            if (!$registry instanceof ApiMetadataRegistry) {
                $registry = new ApiMetadataRegistry();
            }

            /** @var class-string $controllerClass */
            $metadata = $registry->scanController($controllerClass);
            $schema = [];

            if (isset($metadata['operations'][$actionName])) {
                foreach ($metadata['operations'][$actionName]['parameters'] ?? [] as $param) {
                    $schema[$param['name']] = $param;
                }
            }

            $this->validationCache[$cacheKey] = $schema;
            return $schema;

        } catch (\Exception $e) {
            return [];
        }
    }


    /**
     * Build Phalcon validation rules from schema
     *
     * @param Validation $validation Phalcon validation instance
     * @param array<string, mixed> $schema Validation schema
     */
    private function buildValidationRules(Validation $validation, array $schema): void
    {
        foreach ($schema as $fieldName => $fieldSchema) {
            // Required validation
            if ($fieldSchema['required'] ?? false) {
                $validation->add($fieldName, new PresenceOf([
                    'message' => "Field '{$fieldName}' is required"
                ]));
            }

            // Type-specific validations
            switch ($fieldSchema['type']) {
                case 'string':
                    $this->addStringValidation($validation, $fieldName, $fieldSchema);
                    break;

                case 'integer':
                case 'number':
                    $this->addNumberValidation($validation, $fieldName, $fieldSchema);
                    break;
            }

            // Enum validation
            if (!empty($fieldSchema['enum'])) {
                $validation->add($fieldName, new InclusionIn([
                    'domain' => $fieldSchema['enum'],
                    'message' => "Field '{$fieldName}' must be one of: " . implode(', ', $fieldSchema['enum'])
                ]));
            }

            // Pattern validation
            if (!empty($fieldSchema['pattern'])) {
                $validation->add($fieldName, new Regex([
                    'pattern' => $fieldSchema['pattern'],
                    'message' => "Field '{$fieldName}' format is invalid"
                ]));
            }
        }
    }

    /**
     * Add string-specific validation rules
     *
     * @param Validation $validation
     * @param string $fieldName
     * @param array<string, mixed> $fieldSchema
     */
    private function addStringValidation(Validation $validation, string $fieldName, array $fieldSchema): void
    {
        $minLength = $fieldSchema['minLength'] ?? null;
        $maxLength = $fieldSchema['maxLength'] ?? null;

        if ($minLength !== null || $maxLength !== null) {
            $options = ['message' => "Field '{$fieldName}' length is invalid"];

            if ($minLength !== null) {
                $options['min'] = $minLength;
            }

            if ($maxLength !== null) {
                $options['max'] = $maxLength;
            }

            $validation->add($fieldName, new StringLength($options));
        }
    }

    /**
     * Add number-specific validation rules
     *
     * @param Validation $validation
     * @param string $fieldName
     * @param array<string, mixed> $fieldSchema
     */
    private function addNumberValidation(Validation $validation, string $fieldName, array $fieldSchema): void
    {
        $minimum = $fieldSchema['minimum'] ?? null;
        $maximum = $fieldSchema['maximum'] ?? null;

        $options = ['message' => "Field '{$fieldName}' must be a valid number"];

        if ($minimum !== null) {
            $options['min'] = $minimum;
        }

        if ($maximum !== null) {
            $options['max'] = $maximum;
        }

        $validation->add($fieldName, new Numericality($options));
    }


    /**
     * Sanitize and type-cast validated data
     *
     * @param array<string, mixed> $data Input data
     * @param array<string, mixed> $schema Validation schema
     * @return array<string, mixed> Sanitized data
     */
    private function sanitizeValidatedData(array $data, array $schema): array
    {
        $sanitized = [];

        foreach ($schema as $fieldName => $fieldSchema) {
            if (!isset($data[$fieldName])) {
                if (isset($fieldSchema['default'])) {
                    $sanitized[$fieldName] = $fieldSchema['default'];
                }
                continue;
            }

            $value = $data[$fieldName];

            // Type casting
            switch ($fieldSchema['type']) {
                case 'integer':
                    $sanitized[$fieldName] = (int) $value;
                    break;
                case 'number':
                    $sanitized[$fieldName] = (float) $value;
                    break;
                case 'boolean':
                    $sanitized[$fieldName] = (bool) $value;
                    break;
                case 'string':
                default:
                    $sanitized[$fieldName] = (string) $value;
                    break;
            }
        }

        return $sanitized;
    }

    /**
     * Clear validation cache
     */
    public function clearCache(): void
    {
        $this->validationCache = [];
    }
}