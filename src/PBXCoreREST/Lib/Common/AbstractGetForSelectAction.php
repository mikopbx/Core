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

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Abstract base class for REST API dropdown select data actions
 *
 * Provides unified patterns for:
 * - Generating data for dropdown/select UI components
 * - Filtering by various criteria (type, category, status)
 * - Including empty/none options for optional fields
 * - Consistent data formatting for frontend consumption
 * - Support for HTML representation in dropdowns
 *
 * Eliminates code duplication between Providers, SoundFiles, Extensions, and other selectable entities.
 *
 * ## Standard Select Data Format:
 * ```php
 * [
 *     'value' => 'id',           // Dropdown value
 *     'text' => 'Display text',  // Display text
 *     'name' => 'Name',          // Alternative to text
 *     'icon' => 'icon-class',    // Optional icon
 *     'disabled' => false        // Optional disabled state
 * ]
 * ```
 *
 * ## Usage Example:
 * ```php
 * class GetForSelectAction extends AbstractGetForSelectAction
 * {
 *     public static function main(array $data): PBXApiResult
 *     {
 *         return self::executeStandardGetForSelect(
 *             MyModel::class,
 *             $data,
 *             'name',           // Display field
 *             ['type' => 'active'],  // Filters
 *             'name ASC'        // Order
 *         );
 *     }
 * }
 * ```
 */
abstract class AbstractGetForSelectAction
{
    /**
     * Parse common select parameters from request
     *
     * @param array $data Request data
     * @return array Parsed parameters with defaults
     */
    protected static function parseCommonParameters(array $data): array
    {
        return [
            'includeEmpty' => filter_var($data['includeEmpty'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'includeNone' => filter_var($data['includeNone'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'includeDisabled' => filter_var($data['includeDisabled'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'emptyText' => $data['emptyText'] ?? '-',
            'noneText' => $data['noneText'] ?? 'None',
            'filters' => $data['filters'] ?? [],
        ];
    }

    /**
     * Build query conditions from filters
     *
     * @param array $filters Filter criteria
     * @param array $allowedFilters List of allowed filter fields
     * @return array Query parameters with conditions and bind values
     */
    protected static function buildQueryConditions(array $filters, array $allowedFilters): array
    {
        $conditions = [];
        $bind = [];

        foreach ($filters as $field => $value) {
            if (!in_array($field, $allowedFilters, true)) {
                continue;
            }

            if (is_array($value)) {
                // Handle IN conditions
                $placeholders = [];
                foreach ($value as $i => $v) {
                    $key = "{$field}_{$i}";
                    $placeholders[] = ":{$key}:";
                    $bind[$key] = $v;
                }
                $conditions[] = "{$field} IN (" . implode(',', $placeholders) . ")";
            } else {
                // Handle simple equality
                $conditions[] = "{$field} = :{$field}:";
                $bind[$field] = $value;
            }
        }

        $queryParams = [];
        if (!empty($conditions)) {
            $queryParams['conditions'] = implode(' AND ', $conditions);
            $queryParams['bind'] = $bind;
        }

        return $queryParams;
    }

    /**
     * Create empty option for dropdown
     *
     * @param string $text Display text for empty option
     * @param mixed $value Value for empty option (default: -1)
     * @return array Empty option data structure
     */
    protected static function createEmptyOption(string $text = '-', $value = -1): array
    {
        return [
            'value' => $value,
            'text' => $text,
            'name' => $text,
            'id' => $value,
            'icon' => '',
            'disabled' => false
        ];
    }

    /**
     * Create none option for dropdown (typically for "Any" selections)
     *
     * @param string $text Display text for none option
     * @param string $value Value for none option (default: 'none')
     * @return array None option data structure
     */
    protected static function createNoneOption(string $text = 'None', string $value = 'none'): array
    {
        return [
            'value' => $value,
            'text' => $text,
            'name' => $text,
            'id' => $value,
            'icon' => '',
            'disabled' => false
        ];
    }

    /**
     * Transform model to select option format
     *
     * Default implementation that can be overridden by specific implementations.
     *
     * @param mixed $model Model instance
     * @param string $displayField Field to use for display text
     * @param string $valueField Field to use for option value
     * @param array $additionalFields Additional fields to include
     * @return array Select option data structure
     */
    protected static function modelToSelectOption(
        $model,
        string $displayField = 'name',
        string $valueField = 'id',
        array $additionalFields = []
    ): array {
        // Get display text - support method calls and property access
        if (method_exists($model, 'getRepresent')) {
            $displayText = $model->getRepresent();
        } elseif (method_exists($model, $displayField)) {
            $displayText = $model->$displayField();
        } else {
            $displayText = $model->$displayField ?? '';
        }

        // Get value
        $value = $model->$valueField ?? $model->id ?? '';

        // Basic structure
        $option = [
            'value' => $value,
            'text' => $displayText,
            'name' => $displayText,
            'id' => $model->id ?? $value
        ];

        // Add additional fields if requested
        foreach ($additionalFields as $field) {
            if (isset($model->$field)) {
                $option[$field] = $model->$field;
            }
        }

        // Add icon if available
        if (isset($model->icon)) {
            $option['icon'] = $model->icon;
        }

        // Add disabled state if available
        if (isset($model->disabled)) {
            $option['disabled'] = (bool)$model->disabled;
        }

        return $option;
    }

    /**
     * Create standardized API result
     *
     * @param string $processorMethod Method name (__METHOD__)
     * @return PBXApiResult Initialized result object
     */
    protected static function createApiResult(string $processorMethod): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = $processorMethod;
        return $res;
    }

    /**
     * Handle errors consistently
     *
     * @param \Exception $exception Exception that occurred
     * @param PBXApiResult $result Result object to populate
     * @return PBXApiResult Result with error information
     */
    protected static function handleError(\Exception $exception, PBXApiResult $result): PBXApiResult
    {
        $result->messages['error'][] = $exception->getMessage();
        CriticalErrorsHandler::handleExceptionWithSyslog($exception);
        return $result;
    }

    /**
     * Execute standard get-for-select operation
     *
     * Main entry point for most select data operations.
     * Handles filtering, ordering, and option generation.
     *
     * @param string $modelClass Fully qualified model class name
     * @param array $requestData Request data with filters and options
     * @param string $displayField Field to use for display text
     * @param array $allowedFilters List of allowed filter fields
     * @param string $orderBy Order clause
     * @param string $valueField Field to use for option value
     * @param array $additionalFields Additional fields to include in response
     * @param callable|null $customTransform Custom transformation function
     * @return PBXApiResult Select data operation result
     */
    public static function executeStandardGetForSelect(
        string $modelClass,
        array $requestData,
        string $displayField = 'name',
        array $allowedFilters = [],
        string $orderBy = 'name ASC',
        string $valueField = 'id',
        array $additionalFields = [],
        ?callable $customTransform = null
    ): PBXApiResult {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2);
        $caller = ($trace[1]['class'] ?? 'Unknown') . '::' . ($trace[1]['function'] ?? 'unknown');
        $res = self::createApiResult($caller);

        try {
            // Parse common parameters
            $params = self::parseCommonParameters($requestData);

            // Extract filters from request data
            $filters = array_merge($params['filters'], $requestData);
            unset($filters['includeEmpty'], $filters['includeNone'], $filters['includeDisabled']);
            unset($filters['emptyText'], $filters['noneText'], $filters['filters']);

            // Build query conditions
            $queryParams = self::buildQueryConditions($filters, $allowedFilters);

            // Add ordering
            if (!empty($orderBy)) {
                $queryParams['order'] = $orderBy;
            }

            // Query records
            $records = $modelClass::find($queryParams);

            $selectOptions = [];

            // Add empty option if requested
            if ($params['includeEmpty']) {
                $selectOptions[] = self::createEmptyOption($params['emptyText']);
            }

            // Add none option if requested
            if ($params['includeNone']) {
                $selectOptions[] = self::createNoneOption($params['noneText']);
            }

            // Transform records to select options
            foreach ($records as $record) {
                // Skip disabled records unless requested
                if (!$params['includeDisabled'] && isset($record->disabled) && $record->disabled) {
                    continue;
                }

                // Use custom transform if provided
                if ($customTransform) {
                    $selectOptions[] = $customTransform($record);
                } else {
                    $selectOptions[] = self::modelToSelectOption(
                        $record,
                        $displayField,
                        $valueField,
                        $additionalFields
                    );
                }
            }

            $res->data = $selectOptions;
            $res->success = true;

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}