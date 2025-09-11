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
 * Class CreateRecordAction
 * 
 * Handles POST /employees - Creates a new employee record
 * 
 * This is a wrapper around SaveEmployeeAction that ensures we're creating a new record
 * with all required fields provided.
 * 
 * @package MikoPBX\PBXCoreREST\Lib\Employees
 */
class CreateRecordAction
{
    /**
     * Create a new employee record
     * 
     * @param array $data Employee data from request
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        // For create operation, ensure we don't have an ID or it's empty
        // This prevents accidentally updating an existing record
        if (!empty($data['id'])) {
            $res = new PBXApiResult();
            $res->messages['error'][] = 'Cannot create employee with existing ID. Use PUT or PATCH to update.';
            return $res;
        }
        
        // Mark as new record for SaveEmployeeAction
        $data['id'] = '';
        
        // Use SaveEmployeeAction for actual creation
        return SaveEmployeeAction::main($data);
    }
}