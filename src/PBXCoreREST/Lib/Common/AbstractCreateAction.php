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

use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Abstract base class for creating new records via REST API
 *
 * Provides unified create operation pattern:
 * - Removes legacy 'uniqid' field (v3 API uses 'id')
 * - Delegates actual save to SaveRecordAction
 * - Logs successful creation
 * - Consistent error handling
 *
 * Usage:
 * ```php
 * class CreateRecordAction extends AbstractCreateAction
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
abstract class AbstractCreateAction extends AbstractSaveRecordAction
{
    /**
     * Get human-readable entity name for logging
     *
     * Examples: 'call queue', 'conference room', 'IVR menu', 'dialplan application'
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
     * Create a new record
     *
     * Standard create operation flow:
     * 1. Remove legacy 'uniqid' field (v3 API migration)
     * 2. Delegate to SaveRecordAction for actual save
     * 3. Log successful creation
     * 4. Handle errors consistently
     *
     * For create operations:
     * - Custom ID can be provided (for migrations/imports)
     * - If no ID provided, SaveRecordAction generates one automatically
     * - ID validation is handled by SaveRecordAction via OpenAPI schema rules
     *
     * @param array<string, mixed> $data Entity data to save
     * @return PBXApiResult Result with created entity ID or error messages
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // For create operation, allow custom ID if provided (for migrations/imports)
            // ID validation is handled by SaveRecordAction via OpenAPI schema rules
            // If no ID provided, SaveRecordAction will generate one automatically

            // Remove legacy uniqid field if present (use 'id' instead in v3 API)
            unset($data['uniqid']);

            // Get SaveRecordAction class and call main method
            $saveActionClass = static::getSaveActionClass();
            $res = $saveActionClass::main($data);

            // If successful, log entity creation
            if ($res->success && isset($res->data['id'])) {
                $entityName = static::getEntityName();
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "New {$entityName} created: " . $res->data['id'],
                    LOG_INFO
                );
            }

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}
