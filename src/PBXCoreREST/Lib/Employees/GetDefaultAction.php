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

use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * GetDefaultAction
 * Returns default values for a new employee.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Employees
 */
class GetDefaultAction extends AbstractGetRecordAction
{
    /**
     * Get default values for a new employee.
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // Use existing DataStructure method to get defaults
            $res->data = DataStructure::createForNewEmployee();
            $res->success = true;
            
        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}