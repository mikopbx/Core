<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\PBXCoreREST\Lib\System\ChangeLanguageAction;
use MikoPBX\PBXCoreREST\Lib\System\CheckForUpdatesAction;
use MikoPBX\PBXCoreREST\Lib\System\DateTimeAction;
use MikoPBX\PBXCoreREST\Lib\System\GetAvailableLanguagesAction;
use MikoPBX\PBXCoreREST\Lib\System\GetDeleteStatisticsAction;
use MikoPBX\PBXCoreREST\Lib\System\RebootAction;
use MikoPBX\PBXCoreREST\Lib\System\RestoreDefaultSettingsAction;
use MikoPBX\PBXCoreREST\Lib\System\ShutdownAction;
use MikoPBX\PBXCoreREST\Lib\System\UpdateMailSettingsAction;
use MikoPBX\PBXCoreREST\Lib\System\UpgradeFromImageAction;
use Phalcon\Di\Injectable;

/**
 * Enum for System API actions
 */
enum SystemAction: string
{
    case PING = 'ping';
    case CHECK_AUTH = 'checkAuth';
    case REBOOT = 'reboot';
    case SHUTDOWN = 'shutdown';
    case DATETIME = 'datetime';
    case UPDATE_MAIL_SETTINGS = 'updateMailSettings';
    case UPGRADE = 'upgrade';
    case RESTORE_DEFAULT = 'restoreDefault';
    case GET_DELETE_STATISTICS = 'getDeleteStatistics';
    case GET_AVAILABLE_LANGUAGES = 'getAvailableLanguages';
    case CHANGE_LANGUAGE = 'changeLanguage';
    case CHECK_FOR_UPDATES = 'checkForUpdates';
}

/**
 * Class SystemManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class SystemManagementProcessor extends Injectable
{
    /**
     * Processes System requests
     *
     * @param array $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     *
     * @throws \Exception
     */
    public static function callBack(array $request): PBXApiResult
    {
        $actionString   = $request['action'];
        $data           = $request['data'];
        $action         = SystemAction::tryFrom($actionString);

        if ($action === null) {
            $res = new PBXApiResult();
            $res->processor = __METHOD__;
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        $res = match ($action) {
            SystemAction::PING => self::handlePing(),
            SystemAction::CHECK_AUTH => self::handleCheckAuth(),
            SystemAction::REBOOT => RebootAction::main(),
            SystemAction::SHUTDOWN => ShutdownAction::main(),
            SystemAction::DATETIME => DateTimeAction::main($data),
            SystemAction::UPDATE_MAIL_SETTINGS => UpdateMailSettingsAction::main(),
            SystemAction::UPGRADE => UpgradeFromImageAction::main($data['temp_filename'] ?? ''),
            SystemAction::RESTORE_DEFAULT => self::handleRestoreDefault($data),
            SystemAction::GET_DELETE_STATISTICS => GetDeleteStatisticsAction::main(),
            SystemAction::GET_AVAILABLE_LANGUAGES => GetAvailableLanguagesAction::main($data),
            SystemAction::CHANGE_LANGUAGE => ChangeLanguageAction::main($data),
            SystemAction::CHECK_FOR_UPDATES => CheckForUpdatesAction::main(),
        };

        $res->function = $actionString;

        return $res;
    }

    /**
     * Handle ping action
     *
     * @return PBXApiResult
     */
    private static function handlePing(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        return $res;
    }

    /**
     * Handle checkAuth action
     *
     * @return PBXApiResult
     */
    private static function handleCheckAuth(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        return $res;
    }

    /**
     * Handle restoreDefault action with async/sync modes
     *
     * @param array $data Request data
     * @return PBXApiResult
     */
    private static function handleRestoreDefault(array $data): PBXApiResult
    {
        // Check if async channel ID is provided
        $asyncChannelId = $data['asyncChannelId'] ?? '';

        if (!empty($asyncChannelId)) {
            // Async mode - process with WebSocket events
            $res = RestoreDefaultSettingsAction::main($asyncChannelId);
        } else {
            // Sync mode - retry logic
            $ch = 0;
            do {
                $ch++;
                $res = RestoreDefaultSettingsAction::main();
                sleep(1);
            } while ($ch <= 10 && !$res->success);
        }

        if ($res->success) {
            PbxSettings::setValueByKey(PbxSettings::PBX_SETTINGS_WAS_RESET, '1');
        }

        return $res;
    }
}
