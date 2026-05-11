<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\PBXCoreREST\Lib\FirewallBouncer\ExportDecisionsAction;
use MikoPBX\PBXCoreREST\Lib\FirewallBouncer\ExportWhitelistAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for the firewall-bouncer resource.
 */
enum FirewallBouncerAction: string
{
    case EXPORT_DECISIONS = 'exportDecisions';
    case EXPORT_WHITELIST = 'exportWhitelist';
}

/**
 * Firewall Bouncer management processor.
 *
 * Single-method processor that maps `exportDecisions` onto
 * {@see ExportDecisionsAction}. Mirrors the standard MikoPBX processor
 * pattern (enum + match) so the resource auto-discovers like any other
 * controller and stays under the same security/permission pipeline.
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class FirewallBouncerManagementProcessor extends Injectable
{
    /**
     * Routes a firewall-bouncer request to the appropriate Action.
     *
     * @param array<string, mixed> $request Request data with 'action' and 'data' fields.
     * @return PBXApiResult API response object with success status and data.
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = $request['action'] ?? '';
        $action       = FirewallBouncerAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        $res = match ($action) {
            FirewallBouncerAction::EXPORT_DECISIONS => ExportDecisionsAction::main(),
            FirewallBouncerAction::EXPORT_WHITELIST => ExportWhitelistAction::main(),
        };

        $res->function = $actionString;
        return $res;
    }
}
