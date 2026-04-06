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


use MikoPBX\PBXCoreREST\Lib\Sip\GetPeersStatusesAction;
use MikoPBX\PBXCoreREST\Lib\Sip\GetPeerStatusAction;
use MikoPBX\PBXCoreREST\Lib\Sip\GetRegistryAction;
use MikoPBX\PBXCoreREST\Lib\Sip\GetSipSecretAction;
use MikoPBX\PBXCoreREST\Lib\Sip\ProcessAuthFailuresAction;
use MikoPBX\PBXCoreREST\Lib\Sip\GetAuthFailureStatsAction;
use MikoPBX\PBXCoreREST\Lib\Sip\ClearAuthFailureStatsAction;
use MikoPBX\PBXCoreREST\Lib\Extensions\GetAllStatusesAction;
use MikoPBX\PBXCoreREST\Lib\Extensions\GetHistoryAction;
use MikoPBX\PBXCoreREST\Lib\Extensions\GetStatsAction;
use Phalcon\Di\Injectable;

/**
 * Class SIPStackProcessor
 *
 * @package MikoPBX\PBXCoreREST\Lib
 *
 */
class SIPStackProcessor extends Injectable
{
    /**
     * Processes SIP requests
     *
     * @param array $request The request data
     *   - action: The action to be performed
     *   - data: Additional data related to the action
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $action = $request['action'];
        $data = $request['data'];

        // Map 'id' parameter to appropriate parameter based on action for RESTful API compatibility
        if (isset($data['id']) && !empty($data['id'])) {
            $id = $data['id'];
            unset($data['id']);

            if (in_array($action, ['getStatus', 'forceCheck', 'getHistory', 'getStats'])) {
                $data['extension'] = $id;
            } elseif ($action === 'getSecret') {
                $data['peer'] = $id;
            } else {
                // For other actions, keep as 'id' or map as needed
                $data['id'] = $id;
            }
        }
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        switch ($action) {
            case 'getPeersStatuses':
                $res = GetPeersStatusesAction::main();
                break;
            case 'getSipPeer':
                if (!empty($data['peer'])) {
                    $res = GetPeerStatusAction::main($data['peer']);
                } else {
                    $res->messages['error'][] = 'Empty peer value in POST/GET data';
                }
                break;
            case 'getRegistry':
                $res = GetRegistryAction::main();
                break;
            case 'getSecret':
                if (!empty($data['number'])) {
                    $res = GetSipSecretAction::main($data['number']);
                } elseif (!empty($data['peer'])) {
                    $res = GetSipSecretAction::main($data['peer']);
                } else {
                    $res->messages['error'][] = 'Empty number/peer value in POST/GET data';
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
            case 'processAuthFailures':
                $res = ProcessAuthFailuresAction::main($data);
                break;
            case 'getAuthFailureStats':
                if (!empty($data['extension'])) {
                    $res = GetAuthFailureStatsAction::main($data['extension']);
                } elseif (!empty($data['id'])) {
                    $res = GetAuthFailureStatsAction::main($data['id']);
                } else {
                    $res->messages['error'][] = 'Empty extension value in POST/GET data';
                }
                break;
            case 'clearAuthFailureStats':
                if (!empty($data['extension'])) {
                    $res = ClearAuthFailureStatsAction::main($data['extension']);
                } elseif (!empty($data['id'])) {
                    $res = ClearAuthFailureStatsAction::main($data['id']);
                } else {
                    $res->messages['error'][] = 'Empty extension value in POST/GET data';
                }
                break;
            default:
                $res->messages['error'][] = "Unknown action - $action in " . __CLASS__;
                break;
        }

        $res->function = $action;

        return $res;
    }

}