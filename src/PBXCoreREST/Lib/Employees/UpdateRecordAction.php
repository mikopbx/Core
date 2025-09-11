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

namespace MikoPBX\PBXCoreREST\Lib\Employees;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Class UpdateRecordAction
 * 
 * Handles PUT /employees/{id} - Full update of an employee record
 * 
 * This is a wrapper around SaveEmployeeAction that ensures we're updating an existing record
 * with a complete replacement of all data. PUT requests should provide all fields.
 * 
 * @package MikoPBX\PBXCoreREST\Lib\Employees
 */
class UpdateRecordAction
{
    /**
     * Update an employee record (full replacement)
     * 
     * @param array $data Employee data from request
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        // For update operation, we must have an ID
        if (empty($data['id'])) {
            $res = new PBXApiResult();
            $res->messages['error'][] = 'Employee ID is required for update operation';
            return $res;
        }
        
        // PUT expects all fields to be provided for full replacement
        // SaveEmployeeAction will handle the actual update logic
        return SaveEmployeeAction::main($data);
    }
}