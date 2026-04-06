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
 * Abstract base class for REST API record copy actions
 *
 * Provides unified patterns for:
 * - Finding source record by ID
 * - Creating new unique identifiers
 * - Automatically assigning new extension numbers
 * - Copying related records (one-to-many relationships)
 * - Prefixing names with "copy of"
 * - Consistent error handling and logging
 *
 * Eliminates code duplication between IvrMenu, CallQueues, DialplanApplications, and other copyable entities.
 *
 * ## Usage Example:
 * ```php
 * class CopyRecordAction extends AbstractCopyRecordAction
 * {
 *     public static function main(string $sourceId): PBXApiResult
 *     {
 *         return self::executeStandardCopy(
 *             $sourceId,
 *             MyModel::class,
 *             DataStructure::class,
 *             Extensions::PREFIX_QUEUE,    // Unique ID prefix (tilde added by generateUniqueID)
 *             ['field1', 'field2'],        // Fields to copy
 *             true,                        // Needs extension
 *             function($source, $new) {    // Copy related records (optional)
 *                 $related = RelatedModel::find(['parent_id' => $source->id]);
 *                 return array_map(fn($r) => ['id' => '', 'field' => $r->field], $related);
 *             },
 *             'My Entity',                 // Entity type for error messages
 *             'name'                       // Name field for "copy of" prefix (default: 'name')
 *         );
 *     }
 * }
 * ```
 */
abstract class AbstractCopyRecordAction
{
    /**
     * Find source record by ID with standard uniqid/id lookup
     *
     * @param string $modelClass Model class name
     * @param string $sourceId Source record ID
     * @return mixed Model instance or null
     */
    protected static function findSourceRecord(string $modelClass, string $sourceId)
    {
        // Check if model has uniqid property
        $modelInstance = new $modelClass();
        if (property_exists($modelInstance, 'uniqid')) {
            return $modelClass::findFirst([
                'conditions' => 'uniqid = :uniqid: OR id = :id:',
                'bind' => ['uniqid' => $sourceId, 'id' => $sourceId]
            ]);
        } else {
            // For models without uniqid, only search by id
            return $modelClass::findFirst([
                'conditions' => 'id = :id:',
                'bind' => ['id' => $sourceId]
            ]);
        }
    }

    /**
     * Create copy of model with new identifiers
     *
     * @param mixed $sourceModel Source model to copy
     * @param string $modelClass Model class name
     * @param string $uniqueIdPrefix Prefix for unique ID generation
     * @param array $fieldsToCopy List of fields to copy from source
     * @param bool $needsExtension Whether to assign new extension
     * @param string $nameField Field containing the name (for "copy of" prefix)
     * @return mixed New model instance with copied values
     */
    protected static function createCopyFromSource(
        $sourceModel,
        string $modelClass,
        string $uniqueIdPrefix,
        array $fieldsToCopy,
        bool $needsExtension = true,
        string $nameField = 'name'
    ) {
        $newModel = new $modelClass();

        // Set new identifiers
        $newModel->id = '';

        // Generate unique ID if model has uniqid property
        if (property_exists($newModel, 'uniqid')) {
            if (method_exists($modelClass, 'generateUniqueID')) {
                $newModel->uniqid = $modelClass::generateUniqueID($uniqueIdPrefix);
            } else {
                // Fallback to simple generation
                $newModel->uniqid = uniqid($uniqueIdPrefix, true);
            }
        }

        // Assign new extension if needed
        if ($needsExtension && property_exists($newModel, 'extension')) {
            $newModel->extension = Extensions::getNextFreeApplicationNumber();
        }

        // Copy specified fields
        foreach ($fieldsToCopy as $field) {
            if (property_exists($sourceModel, $field) && property_exists($newModel, $field)) {
                // Special handling for name field - add "copy of" prefix
                if ($field === $nameField && !empty($sourceModel->$field)) {
                    $newModel->$field = 'copy of ' . $sourceModel->$field;
                } else {
                    $newModel->$field = $sourceModel->$field;
                }
            }
        }

        return $newModel;
    }

    /**
     * Copy related records (one-to-many relationships)
     *
     * @param mixed $sourceModel Source model with related records
     * @param mixed $newModel New model to associate with copied records
     * @param callable $findRelatedCallback Callback to find related records
     * @param callable $copyRelatedCallback Callback to copy each related record
     * @return array Array of copied related records
     */
    protected static function copyRelatedRecords(
        $sourceModel,
        $newModel,
        callable $findRelatedCallback,
        callable $copyRelatedCallback
    ): array {
        $copiedRecords = [];

        // Find related records using callback
        $relatedRecords = $findRelatedCallback($sourceModel);

        if ($relatedRecords) {
            foreach ($relatedRecords as $relatedRecord) {
                // Copy each related record using callback
                $copiedRecord = $copyRelatedCallback($relatedRecord, $newModel);
                if ($copiedRecord) {
                    $copiedRecords[] = $copiedRecord;
                }
            }
        }

        return $copiedRecords;
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
     * Handle copy operation errors
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
     * Log successful copy operation
     *
     * @param string $entityType Type of entity copied
     * @param string $sourceName Source entity name
     * @param string $newName New entity name
     * @param string $method Method that performed the copy
     */
    protected static function logSuccessfulCopy(
        string $entityType,
        string $sourceName,
        string $newName,
        string $method
    ): void {
        SystemMessages::sysLogMsg(
            $method,
            "{$entityType} '{$sourceName}' successfully copied to '{$newName}'",
            LOG_INFO
        );
    }

    /**
     * Execute standard copy operation
     *
     * Main entry point for most copy operations.
     * Handles finding source, creating copy, copying related records, and building response.
     *
     * @param string $sourceId Source record ID to copy
     * @param string $modelClass Fully qualified model class name
     * @param string $dataStructureClass DataStructure class for formatting response
     * @param string $uniqueIdPrefix Prefix for unique ID generation
     * @param array $fieldsToCopy List of fields to copy from source
     * @param bool $needsExtension Whether to assign new extension
     * @param callable|null $relatedRecordsCallback Callback for copying related records
     * @param string $entityType Human-readable entity type for errors
     * @param string $nameField Field containing the name
     * @return PBXApiResult Copy operation result
     */
    public static function executeStandardCopy(
        string $sourceId,
        string $modelClass,
        string $dataStructureClass,
        string $uniqueIdPrefix,
        array $fieldsToCopy,
        bool $needsExtension = true,
        ?callable $relatedRecordsCallback = null,
        string $entityType = 'Record',
        string $nameField = 'name'
    ): PBXApiResult {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 2);
        $caller = ($trace[1]['class'] ?? 'Unknown') . '::' . ($trace[1]['function'] ?? 'unknown');
        $res = self::createApiResult($caller);

        try {
            // Validate source ID
            if (empty($sourceId)) {
                $res->messages['error'][] = 'Source ID is required';
                return $res;
            }

            // Find source record
            $sourceModel = self::findSourceRecord($modelClass, $sourceId);

            if (!$sourceModel) {
                $res->messages['error'][] = "{$entityType} not found: {$sourceId}";
                SystemMessages::sysLogMsg(
                    $res->processor,
                    "Source {$entityType} not found for copy: {$sourceId}",
                    LOG_WARNING
                );
                return $res;
            }

            // Create copy with new identifiers
            $newModel = self::createCopyFromSource(
                $sourceModel,
                $modelClass,
                $uniqueIdPrefix,
                $fieldsToCopy,
                $needsExtension,
                $nameField
            );

            // Copy related records if callback provided
            $relatedData = null;
            if ($relatedRecordsCallback) {
                $relatedData = $relatedRecordsCallback($sourceModel, $newModel);
            }

            // Build response using DataStructure
            if ($relatedData !== null && method_exists($dataStructureClass, 'createFromModel')) {
                // Pass related data if DataStructure supports it
                $res->data = $dataStructureClass::createFromModel($newModel, $relatedData);
            } else {
                // Standard createFromModel without related data
                $res->data = $dataStructureClass::createFromModel($newModel);
            }

            $res->success = true;

            // Log successful copy
            $sourceName = property_exists($sourceModel, $nameField) ? $sourceModel->$nameField : "ID {$sourceId}";
            $newName = property_exists($newModel, $nameField) ? $newModel->$nameField : 'new copy';
            self::logSuccessfulCopy($entityType, $sourceName, $newName, $res->processor);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }

    /**
     * Execute simple copy without related records
     *
     * Simplified version for entities without related records.
     *
     * @param string $sourceId Source record ID
     * @param string $modelClass Model class name
     * @param string $dataStructureClass DataStructure class
     * @param string $uniqueIdPrefix Unique ID prefix
     * @param array $fieldsToCopy Fields to copy
     * @param bool $needsExtension Whether needs extension
     * @return PBXApiResult Copy operation result
     */
    public static function executeSimpleCopy(
        string $sourceId,
        string $modelClass,
        string $dataStructureClass,
        string $uniqueIdPrefix,
        array $fieldsToCopy,
        bool $needsExtension = true
    ): PBXApiResult {
        return self::executeStandardCopy(
            $sourceId,
            $modelClass,
            $dataStructureClass,
            $uniqueIdPrefix,
            $fieldsToCopy,
            $needsExtension,
            null, // No related records
            'Record',
            'name'
        );
    }
}