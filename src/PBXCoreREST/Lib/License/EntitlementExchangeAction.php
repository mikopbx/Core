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

namespace MikoPBX\PBXCoreREST\Lib\License;

use MikoPBX\Common\Providers\MarketPlaceProvider;
use MikoPBX\Core\System\LicenseV2\LicenseV2;
use MikoPBX\Core\System\LicenseV2\TokenRejectedException;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;
use RuntimeException;
use Throwable;

/**
 * Closed contour: the request file the administrator carries to the licensing cabinet and the
 * token that comes back, and the status/forced round behind the admin block (#1148).
 * Export is a POST because it writes the pending request to the state.
 *
 * @package MikoPBX\PBXCoreREST\Lib\License
 */
class EntitlementExchangeAction extends Injectable
{
    /**
     * Exports the signed request file or imports the entitlement token answering it.
     *
     * @param string $action One of entitlementExport, entitlementImport, entitlementStatus, entitlementRefresh.
     * @param array<string, mixed> $data Request data.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(string $action, array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $license = Di::getDefault()->get(MarketPlaceProvider::SERVICE_NAME);
        if (!$license instanceof LicenseV2) {
            $res->httpCode = 501;
            $res->messages['error'][] = 'LicenseV2 is not enabled on this PBX';
            return $res;
        }

        try {
            switch ($action) {
                case 'entitlementExport':
                    $res->data = ['request' => $license->exportOfflineRequest()];
                    break;
                case 'entitlementImport':
                    $token = $data['token'] ?? '';
                    if (!is_string($token)) {
                        throw new TokenRejectedException('token must be a string, not ' . get_debug_type($token));
                    }
                    $license->importOfflineToken($token);
                    $res->data = [];
                    break;
                case 'entitlementStatus':
                    $res->data = $license->entitlementStatus();
                    break;
                case 'entitlementRefresh':
                    // The outcome of the forced round, then the state it left: one answer for the button.
                    $res->data = ['outcome' => $license->refreshNow()] + $license->entitlementStatus();
                    break;
                default:
                    throw new RuntimeException("Unknown entitlement action $action");
            }
            $res->success = true;
        } catch (Throwable $e) {
            // 400 is reserved for the one thing the caller can fix: the document it offered.
            // Everything else — an unwritable /cf, a lock we can not take, a key we can not read —
            // is this PBX failing, and export can fail in no other way.
            $res->httpCode = $e instanceof TokenRejectedException ? 400 : 500;
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}
