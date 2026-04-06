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

/**
 * Abstract base class for updating existing records via REST API (PUT operation)
 *
 * Provides unified update operation pattern:
 * - Validates ID is present (required for updates)
 * - Delegates actual save to SaveRecordAction
 * - Consistent error handling
 *
 * PUT operation expects full replacement of the resource - all fields should be provided.
 * For partial updates, use PATCH operation (AbstractPatchAction).
 *
 * Usage:
 * ```php
 * class UpdateRecordAction extends AbstractUpdateAction
 * {
 *     protected static function getEntityName(): string
 *     {
 *         return 'call queue';
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
abstract class AbstractUpdateAction extends AbstractSaveRecordAction
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
     * Update an existing record (full replacement)
     *
     * Standard update operation flow:
     * 1. Validate ID is present (required for updates)
     * 2. Delegate to SaveRecordAction for actual save
     * 3. Handle errors consistently
     *
     * PUT operation semantics:
     * - All fields should be provided (full replacement)
     * - Missing fields may be reset to defaults
     * - For partial updates, use PATCH instead
     *
     * @param array<string, mixed> $data Entity data with ID
     * @return PBXApiResult Result with updated entity or error messages
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // Validate ID is present (required for UPDATE)
            if (empty($data['id'])) {
                $entityName = static::getEntityName();
                $res->messages['error'][] = ucfirst($entityName) . ' ID is required for update';
                $res->httpCode = 400;
                return $res;
            }

            // Get SaveRecordAction class and call main method
            $saveActionClass = static::getSaveActionClass();
            $res = $saveActionClass::main($data);

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}
