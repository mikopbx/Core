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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\PBXCoreREST\Lib\Providers\{
    GetAllStatusesAction,
    GetForSelectAction,
    GetListAction,
    GetRecordAction,
    SaveRecordAction,
    DeleteRecordAction,
    UpdateStatusAction,
    GetStatusByIdAction,
    GetHistoryAction,
    GetStatsAction,
    CopyRecordAction
};
use Phalcon\Di\Injectable;

/**
 * Available actions for providers management
 */
enum ProviderAction: string
{
    case GET_FOR_SELECT = 'getForSelect';
    case GET_LIST = 'getList';
    case GET_RECORD = 'getRecord';
    case CREATE = 'create';
    case UPDATE = 'update';
    case PATCH = 'patch';
    case DELETE = 'delete';
    case GET_STATUSES = 'getStatuses';
    case UPDATE_STATUS = 'updateStatus';
    case GET_STATUS = 'getStatus';
    case GET_HISTORY = 'getHistory';
    case GET_STATS = 'getStats';
    case FORCE_CHECK = 'forceCheck';
    case GET_DEFAULT = 'getDefault';
    case COPY = 'copy';
}

/**
 * Providers management processor
 * 
 * Handles all provider management operations including:
 * - getForSelect: Get providers list for dropdown selects
 * - getList: Get list of all providers
 * - getRecord: Get single provider by ID or create new structure
 * - create: Create new provider
 * - update: Update provider  
 * - patch: Partially update provider
 * - delete: Delete provider
 * - getStatuses: Get current provider registration statuses
 * - getStatus: Get individual provider status by ID
 * - getHistory: Get provider history events
 * - getStats: Get provider statistics and availability metrics
 * - forceCheck: Force immediate provider status check
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class ProvidersManagementProcessor extends Injectable
{
    /**
     * Process provider management requests
     *
     * @param array $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = $request['action'];
        // Ensure data is always an array
        $data = $request['data'] ?? [];
        if (!is_array($data)) {
            $data = [];
        }
        
        // Try to match action with enum
        $action = ProviderAction::tryFrom($actionString);
        
        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }
        
        // For create/update actions, pass httpMethod from request level to data
        if (in_array($action, [ProviderAction::CREATE, ProviderAction::UPDATE, ProviderAction::PATCH], true) && isset($request['httpMethod'])) {
            $data['httpMethod'] = $request['httpMethod'];
        }
        
        $res = match ($action) {
            ProviderAction::GET_FOR_SELECT, 'getForSelect' => GetForSelectAction::main($data),
            ProviderAction::GET_LIST => GetListAction::main(
                !empty($data['includeDisabled']) && $data['includeDisabled'] === 'true'
            ),
            ProviderAction::GET_RECORD => GetRecordAction::main(
                $data['id'] ?? null,
                $data['type'] ?? 'SIP'
            ),
            ProviderAction::GET_DEFAULT => GetRecordAction::main(
                'new',
                $data['type'] ?? 'SIP'
            ),
            ProviderAction::CREATE,
            ProviderAction::UPDATE,
            ProviderAction::PATCH => SaveRecordAction::main($data),
            ProviderAction::DELETE => DeleteRecordAction::main($data['id'] ?? ''),
            ProviderAction::GET_STATUSES => GetAllStatusesAction::main($data),
            ProviderAction::UPDATE_STATUS => UpdateStatusAction::main($data),
            ProviderAction::GET_STATUS => GetStatusByIdAction::main(
                $data['id'] ?? '',
                $data
            ),
            ProviderAction::GET_HISTORY => GetHistoryAction::main(
                $data['id'] ?? '',
                $data
            ),
            ProviderAction::GET_STATS => GetStatsAction::main(
                $data['id'] ?? '',
                $data
            ),
            ProviderAction::FORCE_CHECK => GetStatusByIdAction::main(
                $data['id'] ?? '',
                array_merge($data, ['forceCheck' => true, 'refreshFromAmi' => true])
            ),
            ProviderAction::COPY => CopyRecordAction::main(
                $data['id'] ?? '',
                $data['type'] ?? null
            ),
        };

        $res->function = $actionString;
        return $res;
    }
}