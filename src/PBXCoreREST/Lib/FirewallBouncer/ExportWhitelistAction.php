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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\FirewallBouncer;

use MikoPBX\Core\System\DockerNetworkFilterService;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Injectable;

/**
 * Operator-defined whitelist as a flat JSON array.
 *
 * Sibling of {@see ExportDecisionsAction}. Not part of CrowdSec LAPI —
 * stock cs-firewall-bouncer uses its own `whitelists.yaml` and never polls
 * this path. Exists so MikoPBX-aware integrations can consume the same
 * whitelist that NetworkFilters enforces server-side
 * ({@see DockerNetworkFilterService::isIpWhitelisted()}).
 *
 * Response body is a top-level JSON array of CIDR / IP strings:
 *
 *     ["10.0.0.0/8", "192.168.1.0/24", "2001:db8::/32"]
 *
 * Order is not stable; consumers should treat the result as a set.
 *
 * @package MikoPBX\PBXCoreREST\Lib\FirewallBouncer
 */
class ExportWhitelistAction extends Injectable
{
    /**
     * Build the whitelist payload.
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            $whitelist = array_values(array_unique(
                DockerNetworkFilterService::getNetworkFiltersWhitelist()
            ));

            // Top-level JSON array, no MikoPBX envelope. Emitted via the
            // `raw_json_body` special-response channel in
            // {@see \MikoPBX\PBXCoreREST\Controllers\BaseController::handleRawJsonResponse()}.
            $res->data = [
                'raw_json_body' => json_encode(
                    $whitelist,
                    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
                ),
                'content_type'  => 'application/json',
                'http_code'     => 200,
            ];
            $res->success = true;
            $res->httpCode = 200;
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(__CLASS__, 'Bouncer whitelist export failed: ' . $e->getMessage(), LOG_ERR);
            $res->success = false;
            $res->httpCode = 500;
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}
