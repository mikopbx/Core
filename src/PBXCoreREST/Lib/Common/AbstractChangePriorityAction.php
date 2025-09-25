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
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Common\Handlers\CriticalErrorsHandler;

/**
 * Abstract base class for REST API priority change actions
 *
 * Provides unified patterns for:
 * - Bulk priority updates for drag-and-drop reordering
 * - Transaction-based updates with proper error handling
 * - Validation of priority data
 * - Consistent logging and error reporting
 *
 * Eliminates code duplication between OutWorkTimes, OutboundRoutes, and other ordered entities.
 *
 * ## Usage Example:
 *
 * ```php
 * class ChangePriorityAction extends AbstractChangePriorityAction
 * {
 *     public static function main(array $data): PBXApiResult
 *     {
 *         return self::executeStandardPriorityChange(
 *             $data,
 *             MyModel::class,
 *             'My entity',
 *             'priority',     // Priority field name
 *             'name'         // Name field for logging
 *         );
 *     }
 * }
 * ```
 */
abstract class AbstractChangePriorityAction
{
    /**
     * Extract priorities data from request
     *
     * Supports both formats:
     * - `{ "priorities": { "1": 10, "2": 20 } }`
     * - `{ "1": 10, "2": 20 }`
     *
     * @param array $data Request data
     * @return array Priorities map (ID => priority)
     */
    protected static function extractPriorities(array $data): array
    {
        return $data['priorities'] ?? $data;
    }

    /**
     * Validate priorities data structure
     *
     * @param mixed $priorities Data to validate
     * @return array Array of validation errors (empty if valid)
     */
    protected static function validatePrioritiesData($priorities): array
    {
        $errors = [];

        if (empty($priorities)) {
            $errors[] = 'Priorities data is required';
            return $errors;
        }

        if (!is_array($priorities)) {
            $errors[] = 'Priorities must be an array';
            return $errors;
        }

        foreach ($priorities as $id => $priority) {
            if (empty($id)) {
                $errors[] = 'Empty ID found in priorities';
            }

            if (!is_numeric($priority)) {
                $errors[] = "Invalid priority value for ID {$id}: must be numeric";
            }
        }

        return $errors;
    }

    /**
     * Update priorities within a database transaction
     *
     * @param array $priorities Map of entity ID to priority value
     * @param string $modelClass Fully qualified model class name
     * @param string $entityType Human-readable entity type for logging
     * @param string $priorityField Name of the priority field in the model
     * @param string|null $nameField Name of the field to use for logging (optional)
     * @return array Result with 'success' boolean and 'count' or 'errors'
     */
    protected static function updatePrioritiesInTransaction(
        array $priorities,
        string $modelClass,
        string $entityType,
        string $priorityField = 'priority',
        ?string $nameField = null
    ): array {
        try {
            $result = BaseActionHelper::executeInTransaction(function() use (
                $priorities,
                $modelClass,
                $entityType,
                $priorityField,
                $nameField
            ) {
                $updatedCount = 0;
                $errors = [];

                foreach ($priorities as $entityId => $newPriority) {
                    $updateResult = self::updateSingleEntityPriority(
                        (string)$entityId,
                        (int)$newPriority,
                        $modelClass,
                        $entityType,
                        $priorityField,
                        $nameField
                    );

                    if ($updateResult['success']) {
                        $updatedCount++;
                    } elseif ($updateResult['error']) {
                        $errors[] = $updateResult['error'];
                    }
                }

                if (!empty($errors)) {
                    throw new \Exception(implode('; ', $errors));
                }

                return $updatedCount;
            });

            return ['success' => true, 'count' => $result];

        } catch (\Exception $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            return ['success' => false, 'errors' => [$e->getMessage()]];
        }
    }

    /**
     * Update priority for a single entity
     *
     * @param string $entityId Entity ID to update
     * @param int $newPriority New priority value
     * @param string $modelClass Model class name
     * @param string $entityType Entity type for logging
     * @param string $priorityField Priority field name
     * @param string|null $nameField Name field for logging
     * @return array Result with 'success' boolean and optional 'error' message
     */
    protected static function updateSingleEntityPriority(
        string $entityId,
        int $newPriority,
        string $modelClass,
        string $entityType,
        string $priorityField,
        ?string $nameField
    ): array {
        // Find entity by ID (supports both id and uniqid)
        $entity = self::findEntityById($modelClass, $entityId);

        if (!$entity) {
            return ['success' => false, 'error' => "{$entityType} ID {$entityId} not found"];
        }

        // Only update if priority changed
        $currentPriority = (int)$entity->$priorityField;
        if ($currentPriority !== $newPriority) {
            $oldPriority = $currentPriority;
            $entity->$priorityField = (string)$newPriority;

            if (!$entity->save()) {
                $errorMessage = implode(', ', $entity->getMessages());
                return ['success' => false, 'error' => "Failed to update {$entityType} ID {$entityId}: {$errorMessage}"];
            }

            // Log the change
            $entityName = $nameField && isset($entity->$nameField) ? $entity->$nameField : "ID {$entityId}";
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Updated priority for {$entityType} '{$entityName}' from {$oldPriority} to {$newPriority}",
                LOG_DEBUG
            );
        }

        return ['success' => true, 'error' => null];
    }

    /**
     * Find entity by ID with standard uniqid/id lookup pattern
     *
     * @param string $modelClass Model class name
     * @param string $id Entity identifier
     * @return mixed Model instance or null
     */
    protected static function findEntityById(string $modelClass, string $id)
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
     * Handle priority change operation errors
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
     * Execute standard priority change operation
     *
     * Main entry point for most priority change operations.
     * Handles validation, transaction, logging, and error reporting.
     *
     * @param array $data Request data containing priorities
     * @param string $modelClass Fully qualified model class name
     * @param string $entityType Human-readable entity type
     * @param string $priorityField Name of priority field in model (default: 'priority')
     * @param string|null $nameField Name field for logging (default: null)
     * @param string|null $errorMessage Custom error message for validation failure
     * @return PBXApiResult Priority change operation result
     */
    public static function executeStandardPriorityChange(
        array $data,
        string $modelClass,
        string $entityType,
        string $priorityField = 'priority',
        ?string $nameField = null,
        ?string $errorMessage = null
    ): PBXApiResult {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2);
        $caller = ($trace[1]['class'] ?? 'Unknown') . '::' . ($trace[1]['function'] ?? 'unknown');
        $res = self::createApiResult($caller);

        // Extract priorities from request data
        $priorities = self::extractPriorities($data);

        // Validate priorities data
        $validationErrors = self::validatePrioritiesData($priorities);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            if ($errorMessage) {
                array_unshift($res->messages['error'], $errorMessage);
            }
            return $res;
        }

        // Update priorities in transaction
        $updateResult = self::updatePrioritiesInTransaction(
            $priorities,
            $modelClass,
            $entityType,
            $priorityField,
            $nameField
        );

        if ($updateResult['success']) {
            $updatedCount = $updateResult['count'];
            $res->success = true;
            $res->data = [
                'updated' => $updatedCount,
                'message' => "Successfully updated {$updatedCount} {$entityType} priorities"
            ];

            // Log successful operation
            SystemMessages::sysLogMsg(
                $res->processor,
                "Successfully updated {$updatedCount} {$entityType} priorities",
                LOG_INFO
            );
        } else {
            $res->messages['error'] = $updateResult['errors'];
        }

        return $res;
    }
}