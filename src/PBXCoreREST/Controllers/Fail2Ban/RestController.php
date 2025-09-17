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

namespace MikoPBX\PBXCoreREST\Controllers\Fail2Ban;

use MikoPBX\PBXCoreREST\Controllers\BaseRestController;
use MikoPBX\PBXCoreREST\Lib\Fail2BanManagementProcessor;

/**
 * RESTful controller for Fail2Ban management (v3 API)
 *
 * Fail2Ban is a singleton resource - there's only one fail2ban configuration in the system.
 * This controller implements standard REST operations without resource IDs.
 *
 * @RoutePrefix("/pbxcore/api/v3/fail2ban")
 *
 * @examples Singleton operations:
 *
 * # Get Fail2Ban settings (singleton GET)
 * curl -X GET http://127.0.0.1/pbxcore/api/v3/fail2ban
 *
 * # Update Fail2Ban settings (singleton PUT)
 * curl -X PUT http://127.0.0.1/pbxcore/api/v3/fail2ban \
 *      -H "Content-Type: application/json" \
 *      -d '{"maxretry":5,"bantime":86400,"findtime":1800,"whitelist":"192.168.1.0/24","PBXFirewallMaxReqSec":"100"}'
 *
 * # Partially update settings (singleton PATCH)
 * curl -X PATCH http://127.0.0.1/pbxcore/api/v3/fail2ban \
 *      -H "Content-Type: application/json" \
 *      -d '{"maxretry":10}'
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Fail2Ban
 */
class RestController extends BaseRestController
{
    /**
     * The processor class to handle requests
     * @var string
     */
    protected string $processorClass = Fail2BanManagementProcessor::class;

    /**
     * Indicates this is a singleton resource
     * @var bool
     */
    protected bool $isSingleton = true;
}