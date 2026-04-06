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
 * GetRecordAction - retrieves a single general setting by key
 *
 * Implements RESTful pattern for fetching individual resources.
 * The 'id' in this context is the setting key.
 *
 * @package MikoPBX\PBXCoreREST\Lib\GeneralSettings
 */
class GetRecordAction
{
    /**
     * Get single setting value by key
     *
     * @param string $key Setting key to retrieve
     * @return PBXApiResult Result with single key-value pair
     */
    public static function main(string $key): PBXApiResult
    {
        // Use existing GetSettingsAction with key filter
        return GetSettingsAction::main(['key' => $key]);
    }
}