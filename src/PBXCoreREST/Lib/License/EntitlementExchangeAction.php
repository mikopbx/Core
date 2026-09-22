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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;
use RuntimeException;

/**
 * Closed contour: the request file the administrator carries to the licensing cabinet and the
 * token that comes back. Export is a POST because it makes the previous request file void.
 *
 * @package MikoPBX\PBXCoreREST\Lib\License
 */
class EntitlementExchangeAction extends Injectable
{
    /**
     * Exports the signed request file or imports the entitlement token answering it.
     *
     * @param string $action One of entitlementExport, entitlementImport.
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
            if ($action === 'entitlementExport') {
                $res->data = ['request' => $license->exportOfflineRequest()];
            } else {
                $license->importOfflineToken((string)($data['token'] ?? ''));
                $res->data = [];
            }
            $res->success = true;
        } catch (RuntimeException $e) {
            $res->httpCode = 400;
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}
