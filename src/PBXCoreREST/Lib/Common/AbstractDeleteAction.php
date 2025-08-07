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
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Abstract base class for REST API record delete actions
 * 
 * Provides unified patterns for:
 * - ID parameter validation
 * - Record lookup with uniqid/id fallback
 * - Transaction-based deletion with proper error handling
 * - Extension cleanup for entities that have extensions
 * - Consistent logging and error reporting
 * 
 * Eliminates code duplication between CallQueues, IVR Menu, Dialplan Applications, etc.
 */
abstract class AbstractDeleteAction
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
     * Validate delete parameters
     * 
     * Performs standard validation on delete request parameters.
     * Currently validates that ID is not empty, but can be extended.
     *
     * @param string $id Record ID to validate
     * @return array Array of validation errors (empty if valid)
     */
    protected static function validateDeleteParameters(string $id): array
    {
        $errors = [];
        
        if (empty($id)) {
            $errors[] = 'Record ID is required';
        }
        
        return $errors;
    }

    /**
     * Delete associated Extension record for entities that have extensions
     * 
     * Many MikoPBX entities (CallQueues, IVR Menus, Dialplan Applications)
     * have corresponding Extension records that must be cleaned up.
     *
     * @param string|null $extensionNumber Extension number to delete
     * @throws \Exception If extension deletion fails
     */
    protected static function deleteAssociatedExtension(?string $extensionNumber): void
    {
        if (empty($extensionNumber)) {
            return;
        }

        $extension = Extensions::findFirstByNumber($extensionNumber);
        if ($extension && !$extension->delete()) {
            throw new \Exception('Failed to delete extension: ' . implode(', ', $extension->getMessages()));
        }
    }

    /**
     * Execute delete operation within transaction
     * 
     * Provides consistent transaction handling for delete operations.
     * Automatically rolls back on exceptions and logs errors.
     *
     * @param callable $deleteCallback Function that performs the actual deletion
     * @return mixed Result from callback function
     * @throws \Exception If transaction fails
     */
    protected static function executeDeleteInTransaction(callable $deleteCallback)
    {
        try {
            return BaseActionHelper::executeInTransaction($deleteCallback);
        } catch (\Exception $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            throw $e;
        }
    }

    /**
     * Create standardized API result for delete operations
     *
     * @param string $processorMethod Method name (__METHOD__)
     * @return PBXApiResult Initialized result object
     */
    protected static function createDeleteResult(string $processorMethod): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = $processorMethod;
        return $res;
    }

    /**
     * Log successful delete operation
     *
     * @param string $entityType Type of entity (e.g., 'Call queue', 'IVR menu')
     * @param string $entityName Name/identifier of deleted entity
     * @param string $entityExtension Extension number of deleted entity
     * @param string $method Method that performed the deletion
     */
    protected static function logSuccessfulDelete(
        string $entityType,
        string $entityName,
        string $entityExtension,
        string $method
    ): void {
        SystemMessages::sysLogMsg(
            $method,
            "{$entityType} '{$entityName}' ({$entityExtension}) deleted successfully",
            LOG_INFO
        );
    }

    /**
     * Handle delete operation errors consistently
     *
     * @param \Exception $exception Exception that occurred during delete
     * @param PBXApiResult $result Result object to populate with error
     * @return PBXApiResult Result with error information
     */
    protected static function handleDeleteError(\Exception $exception, PBXApiResult $result): PBXApiResult
    {
        $result->messages['error'][] = $exception->getMessage();
        CriticalErrorsHandler::handleExceptionWithSyslog($exception);
        return $result;
    }

    /**
     * Standard delete operation with extension cleanup
     * 
     * Implements the most common delete pattern:
     * 1. Validate parameters
     * 2. Find record
     * 3. Delete in transaction (extension + main record)
     * 4. Log success
     * 
     * This covers ~80% of delete use cases. For complex cases with additional
     * related records, implement custom delete logic in the concrete class.
     *
     * @param string $modelClass Fully qualified model class name
     * @param string $id Record ID to delete
     * @param string $entityType Human-readable entity type for logging
     * @param string $notFoundMessage Error message when record not found
     * @param callable|null $additionalCleanup Optional callback for additional cleanup
     * @return PBXApiResult Delete operation result
     */
    protected static function executeStandardDelete(
        string $modelClass,
        string $id,
        string $entityType,
        string $notFoundMessage,
        ?callable $additionalCleanup = null
    ): PBXApiResult {
        $res = self::createDeleteResult(debug_backtrace()[1]['class'] . '::' . debug_backtrace()[1]['function']);

        // Validate parameters
        $validationErrors = self::validateDeleteParameters($id);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }

        try {
            // Find record
            $record = self::findRecordById($modelClass, $id);
            if (!$record) {
                $res->messages['error'][] = $notFoundMessage;
                return $res;
            }

            // Get entity name - check common fields
            $entityName = $record->name ?? $record->rulename ?? $record->id ?? 'Unknown';
            $entityExtension = $record->extension ?? '';

            // Delete in transaction
            self::executeDeleteInTransaction(function() use ($record, $additionalCleanup) {
                // Execute additional cleanup if provided
                if ($additionalCleanup) {
                    $additionalCleanup($record);
                }

                // Delete associated extension (common pattern)
                if (!empty($record->extension)) {
                    self::deleteAssociatedExtension($record->extension);
                }

                // Delete main record
                if (!$record->delete()) {
                    throw new \Exception('Failed to delete record: ' . implode(', ', $record->getMessages()));
                }

                return true;
            });

            $res->success = true;
            $res->data = ['deleted_id' => $id];

            // Log successful operation
            self::logSuccessfulDelete($entityType, $entityName, $entityExtension, $res->processor);

        } catch (\Exception $e) {
            return self::handleDeleteError($e, $res);
        }

        return $res;
    }
}