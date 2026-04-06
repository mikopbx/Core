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

use MikoPBX\Common\Providers\ModelsMetadataProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Mvc\Model\MetaData;

/**
 * Abstract base class for partially updating records via REST API (PATCH operation)
 *
 * Provides unified partial update operation pattern:
 * - Validates ID is present (required for updates)
 * - Retrieves existing record
 * - Merges patch data with existing data
 * - Delegates actual save to SaveRecordAction
 * - Consistent error handling
 *
 * PATCH operation only updates fields that are explicitly provided.
 * Missing fields retain their current values.
 *
 * Usage:
 * ```php
 * class PatchRecordAction extends AbstractPatchAction
 * {
 *     protected static function getEntityName(): string
 *     {
 *         return 'call queue';
 *     }
 *
 *     protected static function getModelClass(): string
 *     {
 *         return CallQueues::class;
 *     }
 *
 *     protected static function getDataStructureClass(): string
 *     {
 *         return DataStructure::class;
 *     }
 *
 *     protected static function getSaveActionClass(): string
 *     {
 *         return SaveRecordAction::class;
 *     }
 * }
 * ```
 *
 * @package MikoPBX\PBXCoreREST\Lib\Common
 */
abstract class AbstractPatchAction extends AbstractSaveRecordAction
{
    /**
     * Get human-readable entity name for error messages
     *
     * Examples: 'call queue', 'conference room', 'IVR menu', 'employee'
     *
     * @return string Entity name in lowercase
     */
    abstract protected static function getEntityName(): string;

    /**
     * Get Model class for this entity
     *
     * Returns the fully qualified class name of the Phalcon Model.
     *
     * Example: 'MikoPBX\Common\Models\CallQueues'
     *
     * @return string Fully qualified Model class name
     */
    abstract protected static function getModelClass(): string;

    /**
     * Get DataStructure class for this entity
     *
     * Returns the fully qualified class name of the DataStructure
     * that handles model-to-API transformation.
     *
     * Example: 'MikoPBX\PBXCoreREST\Lib\CallQueues\DataStructure'
     *
     * @return string Fully qualified DataStructure class name
     */
    abstract protected static function getDataStructureClass(): string;

    /**
     * Get SaveRecordAction class for this entity
     *
     * Returns the fully qualified class name of the SaveRecordAction
     * that handles the actual save logic.
     *
     * Example: 'MikoPBX\PBXCoreREST\Lib\CallQueues\SaveRecordAction'
     *
     * @return string Fully qualified SaveRecordAction class name
     */
    abstract protected static function getSaveActionClass(): string;

    /**
     * Partially update a record
     *
     * Standard patch operation flow:
     * 1. Validate ID is present (required for updates)
     * 2. Retrieve existing record
     * 3. Build full data structure from existing record
     * 4. Merge patch data on top of existing data
     * 5. Delegate to SaveRecordAction for actual save
     * 6. Handle errors consistently
     *
     * PATCH operation semantics:
     * - Only provided fields are updated
     * - Missing fields retain their current values
     * - For full replacement, use PUT instead
     *
     * @param array<string, mixed> $data Partial entity data with ID
     * @return PBXApiResult Result with updated entity or error messages
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // Validate ID is present (required for PATCH)
            if (empty($data['id'])) {
                $entityName = static::getEntityName();
                $res->messages['error'][] = ucfirst($entityName) . ' ID is required for partial update';
                $res->httpCode = 400;
                return $res;
            }

            // Get model class and find existing record
            $modelClass = static::getModelClass();
            
            // Check if model has 'uniqid' field using DI metadata service
            $di = Di::getDefault();
            /** @var MetaData $metaData */
            $metaData = $di->get(ModelsMetadataProvider::SERVICE_NAME);
            $dummyModel = new $modelClass();
            $attributes = $metaData->getAttributes($dummyModel);
            $hasUniqid = in_array('uniqid', $attributes);
            
            // Find record by appropriate field
            if ($hasUniqid) {
                $record = $modelClass::findFirst("uniqid='{$data['id']}'");
            } else {
                $record = $modelClass::findFirstById($data['id']);
            }

            if (!$record) {
                $entityName = static::getEntityName();
                $res->messages['error'][] = ucfirst($entityName) . " not found: {$data['id']}";
                $res->httpCode = 404;
                return $res;
            }

            // Build full data structure from existing record
            $dataStructureClass = static::getDataStructureClass();
            $currentData = $dataStructureClass::createFromModel($record);

            // Merge patch data on top of current data
            // This ensures only provided fields are updated
            $fullData = array_merge($currentData, $data);

            // Ensure ID is preserved (v3 API uses uniqid for most models, id for some)
            $fullData['id'] = $hasUniqid ? $record->uniqid : $record->id;

            // Get SaveRecordAction class and call main method
            $saveActionClass = static::getSaveActionClass();
            $res = $saveActionClass::main($fullData);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}
