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

namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractDeleteAction;

/**
 * Delete Asterisk manager record action.
 *
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskManagers
 */
class DeleteRecordAction extends AbstractDeleteAction
{
    /**
     * Delete Asterisk manager by ID.
     *
     * @param string $id Manager ID
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        $res = self::createDeleteResult(__METHOD__);

        // Validate parameters
        $validationErrors = self::validateDeleteParameters($id);
        if (!empty($validationErrors)) {
            $res->messages['error'] = $validationErrors;
            return $res;
        }

        try {
            // Find record
            $manager = self::findRecordById(AsteriskManagerUsers::class, $id);
            if (!$manager) {
                $res->messages['error'][] = "Manager with ID $id not found";
                return $res;
            }

            // SECURITY: Prevent deletion of system managers
            if (in_array($manager->username, DataStructure::SYSTEM_MANAGERS, true)) {
                $res->messages['error'][] = "Cannot delete system manager '{$manager->username}'";
                $res->httpCode = 403; // Forbidden
                return $res;
            }

            // Delete in transaction
            self::executeDeleteInTransaction(function() use ($manager) {
                // Delete main record
                if (!$manager->delete()) {
                    throw new \Exception('Failed to delete manager: ' . implode(', ', $manager->getMessages()));
                }

                // Configuration reload will be triggered automatically by model events

                return true;
            });

            $res->success = true;
            $res->data = ['deleted_id' => $id];

            // Log successful operation with correct parameters
            self::logSuccessfulDelete(
                'Asterisk manager',
                $manager->username ?: 'Unknown', // Use username, not id
                '', // AMI users don't have extensions
                $res->processor
            );

        } catch (\Exception $e) {
            return self::handleDeleteError($e, $res);
        }

        return $res;
    }
}