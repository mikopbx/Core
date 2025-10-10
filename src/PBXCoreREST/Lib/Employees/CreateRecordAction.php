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

use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * CreateRecordAction
 * Creates a new employee record.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Employees
 */
class CreateRecordAction extends AbstractSaveRecordAction
{
    /**
     * Create a new employee record.
     *
     * @param array<string, mixed> $data Employee data to save
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        try {
            // For create operation, allow custom ID if provided (for migrations/imports)
            // ID validation is handled by SaveEmployeeAction
            // If no ID provided, SaveEmployeeAction will use auto-increment

            // Remove legacy uniqid field if present (use 'id' instead in v3 API)
            unset($data['uniqid']);

            // Use existing SaveEmployeeAction logic for actual save
            $res = SaveEmployeeAction::main($data);

            // If successful, publish event for new employee creation
            if ($res->success && isset($res->data['id'])) {
                SystemMessages::sysLogMsg(__CLASS__, 'New employee created: ' . $res->data['id'], LOG_INFO);
            }

        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}