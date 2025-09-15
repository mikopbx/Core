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

use MikoPBX\PBXCoreREST\Lib\AsteriskRestUsers\{
    GetListAction,
    GetRecordAction,
    GetDefaultsAction,
    CreateRecordAction,
    UpdateRecordAction,
    PatchRecordAction,
    DeleteRecordAction
};
use Phalcon\Di\Injectable;

/**
 * Available actions for ARI users management.
 */
enum AsteriskRestUserAction: string
{
    case GET_LIST = 'getList';
    case GET_RECORD = 'getRecord';
    case GET_DEFAULTS = 'getDefaults';
    case CREATE = 'create';
    case UPDATE = 'update';
    case PATCH = 'patch';
    case DELETE = 'delete';
}

/**
 * ARI users management processor.
 *
 * Handles all ARI user operations following RESTful principles:
 * - getList: Get paginated list of ARI users
 * - getRecord: Get single ARI user by ID
 * - create: Create new ARI user
 * - update: Full update (replace) of ARI user
 * - patch: Partial update (modify) of ARI user
 * - delete: Delete ARI user
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class AsteriskRestUsersManagementProcessor extends Injectable
{
    /**
     * Process ARI users management requests.
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
        $action = AsteriskRestUserAction::tryFrom($actionString);
        
        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }
        
        $res = match ($action) {
            AsteriskRestUserAction::GET_LIST => GetListAction::main($data),
            AsteriskRestUserAction::GET_RECORD => GetRecordAction::main($data['id'] ?? ''),
            AsteriskRestUserAction::GET_DEFAULTS => GetDefaultsAction::main(),
            AsteriskRestUserAction::CREATE => CreateRecordAction::main($data),
            AsteriskRestUserAction::UPDATE => UpdateRecordAction::main($data),
            AsteriskRestUserAction::PATCH => PatchRecordAction::main($data),
            AsteriskRestUserAction::DELETE => DeleteRecordAction::main($data['id'] ?? ''),
        };

        $res->function = $actionString;
        return $res;
    }
}