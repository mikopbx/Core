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
use MikoPBX\Core\System\LicenseV2\SeatException;
use MikoPBX\Core\System\LicenseV2\SeatLedger;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * Seat sessions over REST: thin wrappers of the LicenseV2 methods named after the licensing
 * server API (session.start -> sessionStart ...). Runs in the root API worker, so the ledger
 * is writable.
 *
 * @package MikoPBX\PBXCoreREST\Lib\License
 */
class SeatSessionAction extends Injectable
{
    /**
     * Licensing server error codes mapped to the HTTP semantics of the v3 API.
     */
    private const array HTTP_BY_EXTCODE = [
        SeatException::NO_SESSION => 404,
        SeatException::NO_SEATS => 409,
        SeatException::NOT_LICENSED => 403,
    ];

    /**
     * Handles one seat-session action.
     *
     * @param string $action One of sessionStart, captureFeature, sessionKeepalive, releaseFeature,
     *                       sessionEnd, featureAvailable, usageGet.
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

        $sessionId = (string)($data['sessionId'] ?? '');
        $featureId = (string)($data['featureId'] ?? '');
        $ttl = (int)($data['ttl'] ?? SeatLedger::TTL_DEFAULT);
        $badTtl = 'ttl must be between ' . SeatLedger::TTL_MIN . ' and ' . SeatLedger::TTL_MAX;

        $result = match ($action) {
            'sessionStart' => $ttl < SeatLedger::TTL_MIN || $ttl > SeatLedger::TTL_MAX
                ? ['success' => false, 'error' => $badTtl, 'httpCode' => 400]
                : $license->sessionStart(is_array($data['holder'] ?? null) ? $data['holder'] : [], $ttl),
            'captureFeature' => $sessionId === '' || $featureId === ''
                ? ['success' => false, 'error' => 'sessionId and featureId are required', 'httpCode' => 400]
                : $license->captureFeature($featureId, $sessionId),
            'sessionKeepalive' => $license->sessionKeepalive($sessionId),
            'releaseFeature' => $featureId === ''
                ? ['success' => false, 'error' => 'featureId is required', 'httpCode' => 400]
                : $license->releaseFeature($featureId, $sessionId === '' ? null : $sessionId),
            'sessionEnd' => $license->sessionEnd($sessionId),
            'featureAvailable' => $featureId === ''
                ? ['success' => false, 'error' => 'featureId is required', 'httpCode' => 400]
                : $license->featureAvailable($featureId),
            'usageGet' => $license->usageGet(),
            default => ['success' => false, 'error' => "Unknown action $action", 'httpCode' => 400],
        };

        $res->success = (bool)$result['success'];
        if ($res->success) {
            unset($result['success']);
            $res->data = $result;
            return $res;
        }

        $res->messages['error'][] = (string)($result['error'] ?? 'License error');
        $extcode = $result['extcode'] ?? null;
        $res->data = is_int($extcode) ? ['extcode' => $extcode] : [];
        // A storage failure carries no extcode: it is our fault, not the caller's.
        $res->httpCode = (int)($result['httpCode']
            ?? (is_int($extcode) ? (self::HTTP_BY_EXTCODE[$extcode] ?? 500) : 500));

        return $res;
    }
}
