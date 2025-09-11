<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\PBXCoreREST\Lib\Extensions\DropdownsAction;
use MikoPBX\PBXCoreREST\Lib\Extensions\GetAllStatusesAction;
use MikoPBX\PBXCoreREST\Lib\Extensions\GetBulkStatusAction;
use MikoPBX\PBXCoreREST\Lib\Extensions\GetHistoryAction;
use MikoPBX\PBXCoreREST\Lib\Extensions\GetListAction;
use MikoPBX\PBXCoreREST\Lib\Extensions\GetStatsAction;
use MikoPBX\PBXCoreREST\Lib\Extensions\Utils;
use Phalcon\Di\Injectable;

/**
 * Class ExtensionManagementProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class ExtensionsManagementProcessor extends Injectable
{
    /**
     * Processes Extensions management requests
     *
     * @param array<string, mixed> $request
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $action = $request['action'];
        $data = $request['data'];
        switch ($action) {
            case 'getForSelect':
                $res = DropdownsAction::getForSelect(
                    $data['type'] ?? 'all',
                    $data['query'] ?? '',
                    $data['exclude'] ?? ''
                );
                break;
            case 'available':
                if (!empty($data['number'])) {
                    $res = Utils::ifNumberAvailable($data['number']);
                } else {
                    $res->messages['error'][] = 'Empty number value in POST/GET data';
                }
                break;
            case 'getPhonesRepresent':
                if (!empty($data['numbers']) || !is_array($data['numbers'])) {
                    $res = Utils::getPhonesRepresent($data['numbers']);
                } else {
                    $res->messages['error'][] = 'Wrong numbers value in POST/GET data';
                }
                break;
            case 'getPhoneRepresent':
                if (!empty($data['number'])) {
                    $res = Utils::getPhoneRepresent($data['number']);
                } else {
                    $res->messages['error'][] = 'Empty number value in POST/GET data';
                }
                break;
            case 'bulkCreate':
                $res = BulkCreateAction::main($data);
                break;
            case 'getBulkStatus':
                if (!empty($data['processId'])) {
                    $res = GetBulkStatusAction::main($data['processId']);
                } else {
                    $res->messages['error'][] = 'Empty process ID in POST/GET data';
                }
                break;
            case 'cancelBulkProcess':
                if (!empty($data['processId'])) {
                    $res = GetBulkStatusAction::cancel($data['processId']);
                } else {
                    $res->messages['error'][] = 'Empty process ID in POST/GET data';
                }
                break;
            case 'getStatuses':
            case 'statuses':
                $res = GetAllStatusesAction::main($data);
                break;
            case 'getStatus':
                if (!empty($data['extension'])) {
                    // For single extension status, call GetAllStatusesAction and filter result
                    $allStatuses = GetAllStatusesAction::main($data);
                    if ($allStatuses->success && isset($allStatuses->data[$data['extension']])) {
                        $res->success = true;
                        $res->data = $allStatuses->data[$data['extension']];
                    } else {
                        $res->messages['error'][] = 'Extension not found or status unavailable';
                    }
                } else {
                    $res->messages['error'][] = 'Empty extension value in POST/GET data';
                }
                break;
            case 'forceCheck':
                if (!empty($data['extension'])) {
                    // Force check for specific extension
                    $forceData = array_merge($data, ['forceCheck' => true]);
                    $allStatuses = GetAllStatusesAction::main($forceData);
                    if ($allStatuses->success && isset($allStatuses->data[$data['extension']])) {
                        $res->success = true;
                        $res->data = $allStatuses->data[$data['extension']];
                        $res->messages['info'][] = 'Force check completed for extension ' . $data['extension'];
                    } else {
                        $res->messages['error'][] = 'Extension not found or status check failed';
                    }
                } else {
                    // Force check for all extensions
                    $forceData = array_merge($data, ['forceCheck' => true]);
                    $res = GetAllStatusesAction::main($forceData);
                }
                break;
            case 'getHistory':
                if (!empty($data['extension'])) {
                    $res = GetHistoryAction::main($data['extension'], $data);
                } else {
                    $res->messages['error'][] = 'Empty extension value in POST/GET data';
                }
                break;
            case 'getStats':
                if (!empty($data['extension'])) {
                    $res = GetStatsAction::main($data['extension'], $data);
                } else {
                    $res->messages['error'][] = 'Empty extension value in POST/GET data';
                }
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
        }

        $res->function = $action;

        return $res;
    }


}