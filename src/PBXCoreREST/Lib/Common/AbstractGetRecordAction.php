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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Abstract base class for REST API record retrieval actions
 * 
 * Provides unified patterns for:
 * - New record creation with default values and unique ID generation
 * - Existing record lookup with uniqid/id fallback
 * - Extension number allocation for entities that need extensions
 * - Consistent data transformation through DataStructure classes
 * - Uniform error handling and logging
 * 
 * Eliminates code duplication between CallQueues, IVR Menu, Dialplan Applications, etc.
 */
abstract class AbstractGetRecordAction
{
    /**
     * Find record by ID with standard uniqid/id lookup pattern
     * 
     * All MikoPBX entities follow the pattern of allowing lookup by either
     * uniqid (string identifier) or id (numeric primary key).
     *
     * @param string $modelClass Fully qualified model class name
     * @param string $id Record identifier (uniqid or numeric id)
     * @return mixed Model instance or null if not found
     */
    protected static function findRecordById(string $modelClass, string $id)
    {
        // Check if model has uniqid property
        $modelInstance = new $modelClass();
        if (property_exists($modelInstance, 'uniqid')) {
            return $modelClass::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $id, 'id' => $id]
            ]);
        } else {
            // For models without uniqid, only search by id
            return $modelClass::findFirst([
                'conditions' => 'id = :id:',
                'bind' => ['id' => $id]
            ]);
        }
    }

    /**
     * Create new model instance with base structure
     * 
     * Creates a new model instance with standard fields (id, uniqid, extension)
     * filled with appropriate default/generated values.
     *
     * @param string $modelClass Fully qualified model class name
     * @param string $uniqueIdPrefix Prefix for unique ID generation
     * @param bool $needsExtension Whether this entity needs an extension number
     * @return mixed New model instance with basic structure
     */
    protected static function createNewModelInstance(
        string $modelClass, 
        string $uniqueIdPrefix, 
        bool $needsExtension = true
    ) {
        $model = new $modelClass();
        $model->id = '';
        
        // Generate unique ID only if model has uniqid property
        if (property_exists($model, 'uniqid')) {
            if (method_exists($modelClass, 'generateUniqueID')) {
                $model->uniqid = $modelClass::generateUniqueID($uniqueIdPrefix);
            } else {
                // Fallback to simple prefix + timestamp
                $model->uniqid = $uniqueIdPrefix . time();
            }
        }
        
        // Assign extension number if needed
        if ($needsExtension && property_exists($model, 'extension')) {
            $model->extension = Extensions::getNextFreeApplicationNumber();
        }
        
        return $model;
    }

    /**
     * Apply default values to new model instance
     * 
     * Sets default field values on a new model instance.
     * This method can be overridden by specific implementations.
     *
     * @param mixed $model Model instance to set defaults on
     * @param array $defaults Array of field => default_value pairs
     * @return mixed Model with defaults applied
     */
    protected static function applyDefaultValues($model, array $defaults): mixed
    {
        foreach ($defaults as $field => $defaultValue) {
            if (property_exists($model, $field)) {
                $model->$field = $defaultValue;
            }
        }
        
        return $model;
    }

    /**
     * Create standardized API result with processor info
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
     * Handle get record operation errors consistently
     *
     * @deprecated Use handleError() instead
     * @param \Exception $exception Exception that occurred during record retrieval
     * @param PBXApiResult $result Result object to populate with error
     * @return PBXApiResult Result with error information
     */
    protected static function handleGetRecordError(\Exception $exception, PBXApiResult $result): PBXApiResult
    {
        return self::handleError($exception, $result);
    }
    
    /**
     * Handle operation errors consistently
     *
     * @param \Exception $exception Exception that occurred
     * @param PBXApiResult $result Result object to populate with error
     * @return PBXApiResult Result with error information
     */
    protected static function handleError(\Exception $exception, PBXApiResult $result): PBXApiResult
    {
        $result->messages['error'][] = $exception->getMessage();
        CriticalErrorsHandler::handleExceptionWithSyslog($exception);
        return $result;
    }

    /**
     * Execute standard get record operation
     * 
     * Implements the most common get record pattern:
     * 1. Check if ID is "new" or empty (create new record structure)
     * 2. If existing ID, find record by uniqid/id
     * 3. Transform data through DataStructure
     * 4. Return formatted result
     * 
     * This covers ~90% of get record use cases.
     *
     * @param string|null $id Record ID, "new", or null
     * @param string $modelClass Fully qualified model class name
     * @param string $dataStructureClass Fully qualified DataStructure class name
     * @param string $uniqueIdPrefix Prefix for unique ID generation (e.g., 'DIALPLAN-APP-')
     * @param array $defaultValues Default values for new records
     * @param string $notFoundMessage Error message when record not found
     * @param bool $needsExtension Whether new records need extension numbers
     * @param callable|null $newRecordCallback Optional callback for additional new record setup
     * @param callable|null $existingRecordCallback Optional callback for additional data loading
     * @return PBXApiResult Get record operation result
     */
    public static function executeStandardGetRecord(
        ?string $id,
        string $modelClass,
        string $dataStructureClass,
        string $uniqueIdPrefix,
        array $defaultValues = [],
        string $notFoundMessage = 'Record not found',
        bool $needsExtension = true,
        ?callable $newRecordCallback = null,
        ?callable $existingRecordCallback = null
    ): PBXApiResult {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2);
        $caller = ($trace[1]['class'] ?? 'Unknown') . '::' . ($trace[1]['function'] ?? 'unknown');
        $res = self::createApiResult($caller);

        try {
            if (empty($id) || $id === 'new') {
                // Create structure for new record
                $model = self::createNewModelInstance($modelClass, $uniqueIdPrefix, $needsExtension);
                
                // Apply default values
                if (!empty($defaultValues)) {
                    $model = self::applyDefaultValues($model, $defaultValues);
                }
                
                // Execute callback for additional new record setup
                if ($newRecordCallback) {
                    $model = $newRecordCallback($model);
                }
                
                $res->data = $dataStructureClass::createFromModel($model);
                $res->success = true;
                
            } else {
                // Find existing record
                $record = self::findRecordById($modelClass, $id);
                
                if ($record) {
                    // Execute callback for additional data loading
                    $additionalData = null;
                    if ($existingRecordCallback) {
                        $additionalData = $existingRecordCallback($record);
                    }
                    
                    // Create data structure (pass additional data if callback provided it)
                    if ($additionalData !== null) {
                        $res->data = $dataStructureClass::createFromModel($record, $additionalData);
                    } else {
                        $res->data = $dataStructureClass::createFromModel($record);
                    }
                    
                    $res->success = true;
                } else {
                    $res->messages['error'][] = $notFoundMessage;
                }
            }
            
        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Get next free extension number for entities that need extensions
     * 
     * Wrapper around Extensions::getNextFreeApplicationNumber() for consistency.
     *
     * @return string Next available extension number
     */
    protected static function getNextFreeExtension(): string
    {
        return Extensions::getNextFreeApplicationNumber();
    }

    /**
     * Create basic default values common to most entities
     * 
     * Provides standard defaults that most entities use.
     * Can be extended or overridden by specific implementations.
     *
     * @param array $additionalDefaults Additional entity-specific defaults
     * @return array Combined default values
     */
    protected static function createCommonDefaults(array $additionalDefaults = []): array
    {
        $commonDefaults = [
            'name' => '',
            'description' => ''
        ];
        
        return array_merge($commonDefaults, $additionalDefaults);
    }

    /**
     * Standard get record operation with simplified parameters
     * 
     * Simplified version of executeStandardGetRecord for the most common cases.
     * Uses sensible defaults for most parameters.
     *
     * @param string|null $id Record ID, "new", or null
     * @param string $modelClass Fully qualified model class name
     * @param string $dataStructureClass Fully qualified DataStructure class name
     * @param string $uniqueIdPrefix Prefix for unique ID generation
     * @param array $entityDefaults Entity-specific default values
     * @return PBXApiResult Get record operation result
     */
    public static function executeSimpleGetRecord(
        ?string $id,
        string $modelClass,
        string $dataStructureClass,
        string $uniqueIdPrefix,
        array $entityDefaults = []
    ): PBXApiResult {
        $defaults = self::createCommonDefaults($entityDefaults);
        
        return self::executeStandardGetRecord(
            $id,
            $modelClass,
            $dataStructureClass,
            $uniqueIdPrefix,
            $defaults,
            'Record not found',
            true, // Most entities need extensions
            null, // No additional new record setup
            null  // No additional data loading
        );
    }
}