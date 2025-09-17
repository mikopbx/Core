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
 * GetListAction - retrieves all general settings
 *
 * This action returns all settings as a wrapper around GetSettingsAction
 * to maintain consistency with RESTful CRUD pattern.
 *
 * @package MikoPBX\PBXCoreREST\Lib\GeneralSettings
 */
class GetListAction
{
    /**
     * Get all general settings
     *
     * @param array<string, mixed> $data Request data (not used for list operation)
     * @return PBXApiResult Result with all settings, codecs, and validation info
     */
    public static function main(array $data): PBXApiResult
    {
        // Use existing GetSettingsAction to get all settings
        // This maintains all existing functionality including:
        // - Settings with type conversion
        // - Codecs information
        // - Password validation status
        // - Sound file representations
        return GetSettingsAction::main([]);
    }
}