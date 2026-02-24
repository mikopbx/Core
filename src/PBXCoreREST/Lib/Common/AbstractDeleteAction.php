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
     * @return array<string> Array of validation errors (empty if valid)
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
            $messages = $extension->getMessages();
            throw new \Exception(implode(', ', $messages));
        }
    }

    /**
     * Execute delete operation within transaction
     *
     * Provides consistent transaction handling for delete operations.
     * Lets exceptions propagate to the caller for proper classification
     * (constraint violations vs unexpected errors).
     *
     * @param callable $deleteCallback Function that performs the actual deletion
     * @return mixed Result from callback function
     * @throws \Exception If transaction fails
     */
    protected static function executeDeleteInTransaction(callable $deleteCallback)
    {
        return BaseActionHelper::executeInTransaction($deleteCallback);
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
     * Check if an exception message indicates a constraint violation
     *
     * Constraint violations are expected business logic (record is in use by other entities),
     * not critical errors, and should not be reported to Sentry.
     *
     * @param string $message Exception message to check
     * @return bool True if message indicates a constraint violation
     */
    protected static function isConstraintViolation(string $message): bool
    {
        return str_contains($message, 'ui header')
            || str_contains($message, 'FOREIGN KEY')
            || str_contains($message, 'constraint')
            || str_contains($message, 'is in use');
    }

    /**
     * Handle delete operation errors consistently
     *
     * Constraint violations (record in use) are returned as 409 Conflict
     * without reporting to Sentry. Unexpected errors are reported to Sentry.
     *
     * @param \Exception $exception Exception that occurred during delete
     * @param PBXApiResult $result Result object to populate with error
     * @return PBXApiResult Result with error information
     */
    protected static function handleDeleteError(\Exception $exception, PBXApiResult $result): PBXApiResult
    {
        $result->messages['error'][] = $exception->getMessage();

        if (self::isConstraintViolation($exception->getMessage())) {
            $result->httpCode = 409;
        } else {
            CriticalErrorsHandler::handleExceptionWithSyslog($exception);
        }

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
     * @param callable|null $additionalCleanup Optional callback for additional cleanup.
     *                                         Should return array with cleanup statistics:
     *                                         ['deleted_count' => int, 'deleted_type' => string]
     * @return PBXApiResult Delete operation result
     */
    protected static function executeStandardDelete(
        string $modelClass,
        string $id,
        string $entityType,
        string $notFoundMessage,
        ?callable $additionalCleanup = null
    ): PBXApiResult {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2);
        $caller = ($trace[1]['class'] ?? 'Unknown') . '::' . ($trace[1]['function'] ?? 'unknown');
        $res = self::createDeleteResult($caller);

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
                $res->messages['error'][] = $notFoundMessage . " (ID: {$id})";
                $res->httpCode = 404; // Not Found
                return $res;
            }

            // Get entity name - check common fields
            $entityName = $record->name ?? $record->description ?? $record->rulename ?? (string)($record->id ?? 'Unknown');
            $entityExtension = $record->extension ?? '';

            // Delete in transaction and collect cleanup statistics
            $cleanupStats = self::executeDeleteInTransaction(function() use ($record, $additionalCleanup) {
                $stats = [];

                // Execute additional cleanup if provided and collect statistics
                if ($additionalCleanup) {
                    $cleanupResult = $additionalCleanup($record);
                    // If callback returns statistics, merge them
                    if (is_array($cleanupResult)) {
                        $stats = array_merge($stats, $cleanupResult);
                    }
                }

                // Delete associated extension (common pattern)
                if (!empty($record->extension)) {
                    self::deleteAssociatedExtension($record->extension);
                    $stats['deleted_extension'] = true;
                }

                // Delete main record
                if (!$record->delete()) {
                    $messages = $record->getMessages();
                    throw new \Exception(implode(', ', $messages));
                }

                return $stats;
            });

            $res->success = true;
            $res->data = is_array($cleanupStats) ? $cleanupStats : [];
            $res->httpCode = 200; // OK (for v4 could be 204 No Content)

            // Build log message with cleanup statistics
            $logMessage = "{$entityType} '{$entityName}' ({$entityExtension}) deleted successfully";
            if (is_array($cleanupStats) && !empty($cleanupStats)) {
                $statsParts = [];
                if (isset($cleanupStats['deleted_count']) && $cleanupStats['deleted_count'] > 0) {
                    $type = $cleanupStats['deleted_type'] ?? 'related record';
                    $statsParts[] = "{$cleanupStats['deleted_count']} {$type}(s)";
                }
                if (isset($cleanupStats['deleted_extension']) && $cleanupStats['deleted_extension']) {
                    $statsParts[] = "associated extension";
                }
                if (!empty($statsParts)) {
                    $logMessage .= " along with " . implode(' and ', $statsParts);
                }
            }

            SystemMessages::sysLogMsg($res->processor, $logMessage, LOG_INFO);

        } catch (\Exception $e) {
            return self::handleDeleteError($e, $res);
        }

        return $res;
    }
}