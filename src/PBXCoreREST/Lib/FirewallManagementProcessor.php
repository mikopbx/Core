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

use MikoPBX\PBXCoreREST\Lib\Firewall\GetListAction;
use MikoPBX\PBXCoreREST\Lib\Firewall\GetRecordAction;
use MikoPBX\PBXCoreREST\Lib\Firewall\GetDefaultAction;
use MikoPBX\PBXCoreREST\Lib\Firewall\SaveRecordAction;
use MikoPBX\PBXCoreREST\Lib\Firewall\DeleteRecordAction;
use MikoPBX\PBXCoreREST\Lib\Firewall\EnableFirewallAction;
use MikoPBX\PBXCoreREST\Lib\Firewall\DisableFirewallAction;
use MikoPBX\PBXCoreREST\Lib\Firewall\GetBannedIpsAction;
use MikoPBX\PBXCoreREST\Lib\Firewall\UnbanIpAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for firewall management
 */
enum FirewallAction: string
{
    // Standard CRUD operations
    case GET_LIST = 'getList';
    case GET_RECORD = 'getRecord';
    case GET_DEFAULT = 'getDefault';
    case CREATE = 'create';
    case UPDATE = 'update';
    case PATCH = 'patch';
    case DELETE = 'delete';
    
    // Firewall-specific operations
    case ENABLE_FIREWALL = 'enable';
    case DISABLE_FIREWALL = 'disable';
    case GET_BANNED_IPS = 'getBannedIps';
    case UNBAN_IP = 'unbanIp';
}

/**
 * Firewall management processor
 *
 * Handles all firewall management operations using RESTful CRUD operations (v3 API)
 * Manages NetworkFilters, FirewallRules, and Fail2Ban operations
 * 
 * RESTful API mapping:
 * - GET /firewall                -> getList (all rules with status)
 * - GET /firewall/{id}           -> getRecord
 * - GET /firewall:getDefault     -> getDefault
 * - POST /firewall               -> create (new network filter with rules)
 * - PUT /firewall/{id}           -> update (full update)
 * - PATCH /firewall/{id}         -> patch (partial update)
 * - DELETE /firewall/{id}        -> delete
 * 
 * Custom actions:
 * - POST /firewall:enable        -> enable (enable firewall)
 * - POST /firewall:disable       -> disable (disable firewall)
 * - GET /firewall:getBannedIps   -> getBannedIps (get Fail2Ban blocked IPs)
 * - POST /firewall:unbanIp       -> unbanIp (unban IP from Fail2Ban)
 * 
 * @package MikoPBX\PBXCoreREST\Lib
 */
class FirewallManagementProcessor extends Injectable
{
    /**
     * Processes firewall management requests with type-safe enum matching
     *
     * @param array<string, mixed> $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = $request['action'];
        $data = $request['data'];

        // Pass HTTP method to actions for PUT/PATCH validation
        // WHY: PUT/PATCH on non-existent resource should return 404, not create new record
        if (isset($request['httpMethod'])) {
            $data['httpMethod'] = $request['httpMethod'];
        }

        // Type-safe action matching with enum
        $action = FirewallAction::tryFrom($actionString);
        
        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }
        
        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            // Standard CRUD operations
            FirewallAction::GET_LIST => GetListAction::main($data),
            FirewallAction::GET_RECORD => GetRecordAction::main($data['id'] ?? null),
            FirewallAction::GET_DEFAULT => GetDefaultAction::main(),
            // Unified save action handles CREATE, UPDATE (PUT), and PATCH
            FirewallAction::CREATE => SaveRecordAction::main($data),
            FirewallAction::UPDATE => SaveRecordAction::main($data),
            FirewallAction::PATCH => SaveRecordAction::main($data),
            FirewallAction::DELETE => DeleteRecordAction::main($data['id'] ?? ''),

            // Firewall-specific operations
            FirewallAction::ENABLE_FIREWALL => EnableFirewallAction::main(),
            FirewallAction::DISABLE_FIREWALL => DisableFirewallAction::main(),
            FirewallAction::GET_BANNED_IPS => GetBannedIpsAction::main(),
            FirewallAction::UNBAN_IP => UnbanIpAction::main($data['ip'] ?? ''),
        };

        $res->function = $actionString;
        return $res;
    }
}