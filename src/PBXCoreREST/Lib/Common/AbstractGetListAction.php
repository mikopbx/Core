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
 * Abstract base class for REST API list retrieval actions
 * 
 * Provides unified patterns for:
 * - Standard list retrieval with ordering and filtering
 * - Consistent data transformation through DataStructure classes
 * - Uniform error handling and logging
 * - Support for pagination and search (future enhancements)
 * - Optimal performance patterns (use createForList vs createFromModel)
 * 
 * Eliminates code duplication between CallQueues, IVR Menu, Dialplan Applications, etc.
 */
abstract class AbstractGetListAction
{
    /**
     * Get list of records with standard ordering
     * 
     * Implements the most common list pattern:
     * 1. Query model with standard ordering
     * 2. Transform records through DataStructure
     * 3. Return formatted array
     * 
     * Uses createForList() by default for better performance (excludes heavy fields).
     * Override $useFullData parameter for cases requiring complete records.
     *
     * @param string $modelClass Fully qualified model class name
     * @param string $dataStructureClass Fully qualified DataStructure class name
     * @param array $queryOptions Additional query options (conditions, order, limit, etc.)
     * @param bool $useFullData If true, uses createFromModel(), else createForList()
     * @param callable|null $recordFilter Optional callback to filter individual records
     * @return array Array of formatted records
     */
    protected static function getRecordsList(
        string $modelClass,
        string $dataStructureClass,
        array $queryOptions = [],
        bool $useFullData = false,
        ?callable $recordFilter = null
    ): array {
        // Set default ordering if not specified
        if (!isset($queryOptions['order'])) {
            $queryOptions['order'] = 'name ASC';
        }

        // Query the model
        $records = $modelClass::find($queryOptions);

        $resultData = [];
        foreach ($records as $record) {
            // Apply record filter if provided
            if ($recordFilter && !$recordFilter($record)) {
                continue;
            }

            // Transform record through DataStructure
            if ($useFullData) {
                $resultData[] = $dataStructureClass::createFromModel($record);
            } else {
                // Use createForList for better performance if available
                if (method_exists($dataStructureClass, 'createForList')) {
                    $resultData[] = $dataStructureClass::createForList($record);
                } else {
                    // Fallback to createFromModel if createForList not available
                    $resultData[] = $dataStructureClass::createFromModel($record);
                }
            }
        }

        return $resultData;
    }

    /**
     * Apply search filters to query options
     * 
     * Adds search conditions to query options based on search parameters.
     * Supports basic text search across common fields.
     *
     * @param array $queryOptions Existing query options
     * @param array $searchParams Search parameters from request
     * @param array $searchableFields Fields that can be searched
     * @return array Updated query options with search conditions
     */
    protected static function applySearchFilters(
        array $queryOptions,
        array $searchParams,
        array $searchableFields = ['name', 'description']
    ): array {
        if (empty($searchParams['search']) || empty($searchableFields)) {
            return $queryOptions;
        }

        $searchTerm = trim($searchParams['search']);
        if (empty($searchTerm)) {
            return $queryOptions;
        }

        // Build search conditions for specified fields
        $searchConditions = [];
        $bindParams = [];
        
        foreach ($searchableFields as $field) {
            $searchConditions[] = "{$field} LIKE :search_term:";
        }

        $bindParams['search_term'] = '%' . $searchTerm . '%';

        // Add to existing conditions if present
        if (isset($queryOptions['conditions'])) {
            $queryOptions['conditions'] = '(' . $queryOptions['conditions'] . ') AND (' . implode(' OR ', $searchConditions) . ')';
            $queryOptions['bind'] = array_merge($queryOptions['bind'] ?? [], $bindParams);
        } else {
            $queryOptions['conditions'] = implode(' OR ', $searchConditions);
            $queryOptions['bind'] = $bindParams;
        }

        return $queryOptions;
    }

    /**
     * Apply ordering to query options
     * 
     * Validates and applies ordering parameters from request.
     * Supports common ordering patterns and prevents SQL injection.
     *
     * @param array $queryOptions Existing query options
     * @param array $orderParams Ordering parameters from request
     * @param array $allowedOrderFields Valid fields for ordering
     * @param string $defaultOrder Default order clause
     * @return array Updated query options with ordering
     */
    protected static function applyOrdering(
        array $queryOptions,
        array $orderParams,
        array $allowedOrderFields = ['name', 'extension', 'id'],
        string $defaultOrder = 'name ASC'
    ): array {
        if (empty($orderParams['order_by']) || empty($allowedOrderFields)) {
            $queryOptions['order'] = $defaultOrder;
            return $queryOptions;
        }

        $orderBy = $orderParams['order_by'];
        $orderDirection = strtoupper($orderParams['order_direction'] ?? 'ASC');

        // Validate order field
        if (!in_array($orderBy, $allowedOrderFields)) {
            $queryOptions['order'] = $defaultOrder;
            return $queryOptions;
        }

        // Validate order direction
        if (!in_array($orderDirection, ['ASC', 'DESC'])) {
            $orderDirection = 'ASC';
        }

        $queryOptions['order'] = "{$orderBy} {$orderDirection}";
        return $queryOptions;
    }

    /**
     * Apply pagination to query options
     * 
     * Adds LIMIT and OFFSET to query based on pagination parameters.
     * Validates parameters and applies reasonable defaults.
     *
     * @param array $queryOptions Existing query options
     * @param array $paginationParams Pagination parameters from request
     * @param int $defaultLimit Default records per page
     * @param int $maxLimit Maximum allowed records per page
     * @return array Updated query options with pagination
     */
    protected static function applyPagination(
        array $queryOptions,
        array $paginationParams,
        int $defaultLimit = 50,
        int $maxLimit = 1000
    ): array {
        $limit = (int)($paginationParams['limit'] ?? $defaultLimit);
        $offset = (int)($paginationParams['offset'] ?? 0);

        // Validate and constrain limit
        if ($limit <= 0) {
            $limit = $defaultLimit;
        }
        if ($limit > $maxLimit) {
            $limit = $maxLimit;
        }

        // Validate offset
        if ($offset < 0) {
            $offset = 0;
        }

        $queryOptions['limit'] = $limit;
        if ($offset > 0) {
            $queryOptions['offset'] = $offset;
        }

        return $queryOptions;
    }

    /**
     * Create standardized API result for list operations
     *
     * @param string $processorMethod Method name (__METHOD__)
     * @return PBXApiResult Initialized result object
     */
    protected static function createListResult(string $processorMethod): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = $processorMethod;
        return $res;
    }

    /**
     * Handle list operation errors consistently
     *
     * @param \Exception $exception Exception that occurred during list retrieval
     * @param PBXApiResult $result Result object to populate with error
     * @return PBXApiResult Result with error information
     */
    protected static function handleListError(\Exception $exception, PBXApiResult $result): PBXApiResult
    {
        $result->messages['error'][] = $exception->getMessage();
        CriticalErrorsHandler::handleExceptionWithSyslog($exception);
        return $result;
    }

    /**
     * Execute standard list operation
     * 
     * Implements the standard list pattern with optional search, ordering, and pagination:
     * 1. Create API result
     * 2. Apply filters, ordering, pagination
     * 3. Retrieve and transform records
     * 4. Return formatted result
     *
     * @param string $modelClass Fully qualified model class name
     * @param string $dataStructureClass Fully qualified DataStructure class name
     * @param array $requestParams Parameters from request (search, ordering, pagination)
     * @param array $baseQueryOptions Base query options (conditions, etc.)
     * @param bool $useFullData If true, uses createFromModel(), else createForList()
     * @param array $allowedOrderFields Valid fields for ordering
     * @param array $searchableFields Fields that can be searched
     * @param callable|null $recordFilter Optional callback to filter individual records
     * @return PBXApiResult List operation result
     */
    public static function executeStandardList(
        string $modelClass,
        string $dataStructureClass,
        array $requestParams = [],
        array $baseQueryOptions = [],
        bool $useFullData = false,
        array $allowedOrderFields = ['name', 'extension', 'id'],
        array $searchableFields = ['name', 'description'],
        ?callable $recordFilter = null
    ): PBXApiResult {
        $res = self::createListResult(debug_backtrace()[1]['class'] . '::' . debug_backtrace()[1]['function']);

        try {
            $queryOptions = $baseQueryOptions;

            // Apply search filters
            $queryOptions = self::applySearchFilters($queryOptions, $requestParams, $searchableFields);

            // Apply ordering
            $queryOptions = self::applyOrdering($queryOptions, $requestParams, $allowedOrderFields);

            // Apply pagination if requested
            if (isset($requestParams['limit']) || isset($requestParams['offset'])) {
                $queryOptions = self::applyPagination($queryOptions, $requestParams);
            }

            // Get records list
            $data = self::getRecordsList(
                $modelClass,
                $dataStructureClass,
                $queryOptions,
                $useFullData,
                $recordFilter
            );

            $res->data = $data;
            $res->success = true;

        } catch (\Exception $e) {
            return self::handleListError($e, $res);
        }

        return $res;
    }
}