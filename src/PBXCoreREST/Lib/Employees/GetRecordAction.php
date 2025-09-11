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

use MikoPBX\Common\Models\Users;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;

/**
 * Get Employee record action
 * 
 * Returns employee data with user_id as primary identifier (in 'id' field)
 * while maintaining the same data structure as Extensions API
 *
 * @api {get} /pbxcore/api/v2/employees/:id Get employee record
 * @apiVersion 2.0.0
 * @apiName GetRecord
 * @apiGroup Employees
 *
 * @apiParam {String} [id] User ID, "new" for new record structure
 *
 * @apiSuccess {Boolean} result Operation result  
 * @apiSuccess {Object} data Employee data with representation fields
 * @apiSuccess {String} data.id User ID (primary identifier)
 * @apiSuccess {String} data.user_username Employee name
 * @apiSuccess {String} data.number Internal extension number
 * @apiSuccess {String} data.mobile_dialstring Mobile phone number
 * @apiSuccess {String} data.fwd_forwarding_represent Forwarding extension representation
 *
 * @package MikoPBX\PBXCoreREST\Lib\Employees
 */
class GetRecordAction extends AbstractGetRecordAction
{
    /**
     * Gets employee data for existing or for the new record
     * 
     * @param string|null $userId User ID of the employee to be retrieved
     * @return PBXApiResult Result of the operation
     */
    public static function main(?string $userId = null): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);
        
        try {
            if (empty($userId) || $userId === 'new') {
                // Create structure for new employee
                $res->data = DataStructure::createForNewEmployee();
                $res->success = true;
            } else {
                // Get existing employee with all related data
                $user = Users::findFirstById($userId);
                
                if (!$user) {
                    $res->success = false;
                    $res->messages['error'][] = 'Employee with user_id ' . $userId . ' not found';
                    return $res;
                }
                
                // Create data structure using DataStructure class
                $res->data = DataStructure::createFromModel($user);
                $res->success = true;
            }
            
        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }
        
        return $res;
    }
}