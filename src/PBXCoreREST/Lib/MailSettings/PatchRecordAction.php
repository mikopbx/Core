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

namespace MikoPBX\PBXCoreREST\Lib\MailSettings;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * PatchRecordAction - performs partial update of mail settings (PATCH)
 *
 * This action updates only the provided fields, leaving others unchanged.
 *
 * @package MikoPBX\PBXCoreREST\Lib\MailSettings
 */
class PatchRecordAction
{
    /**
     * Perform partial update of mail settings
     *
     * @param array<string, mixed> $data Partial settings data to update
     * @return PBXApiResult Result with success status and messages
     */
    public static function main(array $data): PBXApiResult
    {
        // PATCH uses the same logic as PUT but only updates provided fields
        // The UpdateRecordAction already handles partial updates correctly
        // as it only updates fields that exist in the provided data
        return UpdateRecordAction::main($data);
    }
}