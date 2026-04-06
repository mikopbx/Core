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

namespace MikoPBX\PBXCoreREST\Lib\GeneralSettings;

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * UpdateRecordAction - performs full update of general settings (PUT)
 *
 * This action represents a complete replacement of settings data.
 * In the context of general settings, it behaves similarly to PATCH
 * but follows RESTful conventions.
 *
 * @package MikoPBX\PBXCoreREST\Lib\GeneralSettings
 */
class UpdateRecordAction
{
    /**
     * Perform full update of general settings
     *
     * @param array<string, mixed> $data Complete settings data to save
     * @return PBXApiResult Result with success status and messages
     */
    public static function main(array $data): PBXApiResult
    {
        // Use existing SaveSettingsAction which handles all validation,
        // password synchronization, parking extensions, etc.
        return SaveSettingsAction::main($data);
    }
}