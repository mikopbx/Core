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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\GeneralSettings\{
    GetSettingsAction,
    SaveSettingsAction
};
use Phalcon\Di\Injectable;

/**
 * Available actions for general settings management.
 */
enum GeneralSettingsAction: string
{
    case GET_SETTINGS = 'getSettings';
    case SAVE_SETTINGS = 'saveSettings';
    case UPDATE_CODECS = 'updateCodecs';
}

/**
 * General settings processor.
 *
 * Handles all general settings operations including:
 * - getSettings: Get settings with optional filtering by key/keys
 * - saveSettings: Save settings with validation and password synchronization
 * - updateCodecs: Update codec priorities and disabled status
 */
class GeneralSettingsProcessor extends Injectable
{
    /**
     * Process general settings requests.
     *
     * @param array $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = $request['action'];
        $data = $request['data'];
        
        // Try to match action with enum
        $action = GeneralSettingsAction::tryFrom($actionString);
        
        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }
        
        $res = match ($action) {
            GeneralSettingsAction::GET_SETTINGS => GetSettingsAction::main($data),
            GeneralSettingsAction::SAVE_SETTINGS => SaveSettingsAction::main($data)
        };

        $res->function = $actionString;
        return $res;
    }
}