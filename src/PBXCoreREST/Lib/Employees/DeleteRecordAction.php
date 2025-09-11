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

namespace MikoPBX\PBXCoreREST\Lib\Employees;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Models\Users;
use MikoPBX\Common\Providers\MainDatabaseProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * Action for deleting employee record
 * Deletes an employee and all their dependencies including extensions, mobile, and forwarding settings.
 *
 * @api {delete} /pbxcore/api/v2/employees/:id Delete employee (v2 legacy)
 * @api {delete} /pbxcore/api/v3/employees/:id Delete employee (v3 RESTful)
 * @apiVersion 3.0.0
 * @apiName DeleteRecord
 * @apiGroup Employees
 *
 * @apiParam {String} id User ID to delete
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Deletion result
 * @apiSuccess {String} data.deleted_id ID of deleted record
 */
class DeleteRecordAction
{
    /**
     * Delete employee record with proper logging
     * 
     * Handles both direct ID parameter and ID from data array for compatibility
     *
     * @param string|array $idOrData User ID to delete or data array with 'id' field
     * @return PBXApiResult
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        if (empty($id) || !is_numeric($id)) {
            $res->messages['error'][] = 'Invalid employee ID';
            return $res;
        }

        try {
            $di = Di::getDefault();
            $db = $di->get(MainDatabaseProvider::SERVICE_NAME);
            
            // Find user by ID (convert to int to ensure proper type)
            $user = Users::findFirstById($id);
            if (!$user) {
                $res->messages['error'][] = 'Employee not found';
                return $res;
            }

            // Begin transaction
            $db->begin();

            // Follow original ExtensionsController delete pattern:
            // 1. First delete forwarding settings to avoid circular references
            // 2. Then delete user (which will cascade to extensions, sip, external phones)
            
            $errors = null;
            $extensions = $user->Extensions;
            
            // Delete forwarding rights first for all user extensions to avoid circular references
            foreach ($extensions as $extension) {
                if ($extension->ExtensionForwardingRights && !$extension->ExtensionForwardingRights->delete()) {
                    $errors = $extension->ExtensionForwardingRights->getMessages();
                    break;
                }
            }

            // If no errors with forwarding rights, delete the user (cascade will handle the rest)
            if (!$errors && !$user->delete()) {
                $errors = $user->getMessages();
            }

            if ($errors) {
                $db->rollback();
                $res->messages['error'] = [];
                foreach ($errors as $message) {
                    $res->messages['error'][] = $message->getMessage();
                }
                return $res;
            }

            // Commit transaction
            $db->commit();

            // Return deleted ID
            $res->data = ['deleted_id' => $id];
            $res->success = true;

        } catch (\Exception $e) {
            if (isset($db)) {
                $db->rollback();
            }
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}