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

namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * PatchRecordAction
 * Partially updates an existing AMI user (PATCH method).
 *
 * This is a lightweight wrapper around SaveRecordAction which handles
 * all validation, sanitization, and business logic.
 *
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskManagers
 */
class PatchRecordAction
{
    /**
     * Perform partial update (PATCH) of an existing AMI user.
     *
     * Delegates to SaveRecordAction which detects existing record by ID
     * and performs PATCH operation (only updates provided fields).
     *
     * @param array<string, mixed> $data Partial AMI user data with id
     * @return PBXApiResult Result with success status and data
     */
    public static function main(array $data): PBXApiResult
    {
        // SaveRecordAction handles CREATE/UPDATE/PATCH automatically based on:
        // - Presence of ID: determines if new or existing record
        // - isset() checks: allows partial updates (PATCH support)
        return SaveRecordAction::main($data);
    }
}