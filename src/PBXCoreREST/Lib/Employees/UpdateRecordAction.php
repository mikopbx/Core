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

use MikoPBX\PBXCoreREST\Lib\Common\AbstractUpdateAction;

/**
 * UpdateRecordAction
 *
 * Handles PUT /employees/{id} - Full update of an employee record
 *
 * This is a wrapper around SaveRecordAction that ensures we're updating an existing record
 * with a complete replacement of all data. PUT requests should provide all fields.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Employees
 */
class UpdateRecordAction extends AbstractUpdateAction
{
    /**
     * Get human-readable entity name for error messages
     *
     * @return string Entity name in lowercase
     */
    protected static function getEntityName(): string
    {
        return 'employee';
    }

    /**
     * Get SaveRecordAction class for this entity
     *
     * @return string Fully qualified SaveRecordAction class name
     */
    protected static function getSaveActionClass(): string
    {
        return SaveRecordAction::class;
    }
}