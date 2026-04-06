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

namespace MikoPBX\PBXCoreREST\Lib\IncomingRoutes;

use MikoPBX\Common\Models\Providers;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\Workers\WorkerCdr;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * GetUniqueDIDsAction - Retrieves unique DID numbers from CDR history
 *
 * Queries the permanent CDR table (cdr_general) for unique DID values
 * associated with a specific provider. Used to populate DID suggestions
 * in the incoming route configuration form.
 *
 * @package MikoPBX\PBXCoreREST\Lib\IncomingRoutes
 */
class GetUniqueDIDsAction
{
    /**
     * Get unique DID numbers from CDR history filtered by provider
     *
     * @param array $data Request data containing 'providerid' parameter
     * @return PBXApiResult API result with array of {value, name} objects
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $providerId = $data['providerid'] ?? '';

        // Resolve provider's SIP endpoint (from_account in CDR) and login username to exclude
        [$fromAccount, $excludeUsername] = self::resolveProviderInfo($providerId);

        // Build CDR query filter
        // Sent via Beanstalk to WorkerCdr -> SelectCDR -> CallDetailRecords::find()
        $conditions = "did <> '' AND from_account = :from_account:";
        $bind = ['from_account' => $fromAccount];

        if ($excludeUsername !== '') {
            $conditions .= " AND did <> :exclude_did:";
            $bind['exclude_did'] = $excludeUsername;
        }

        $filter = [
            'conditions' => $conditions,
            'bind'       => $bind,
            'columns'    => 'did',
            'group'      => 'did',
            'limit'      => 20,
        ];

        $client = new BeanstalkClient(WorkerCdr::SELECT_CDR_TUBE);
        [$result, $message] = $client->sendRequest(json_encode($filter), 5);

        $res->success = true;
        $res->data = [];

        if ($result !== false) {
            $rows = json_decode($message, true) ?: [];
            foreach ($rows as $row) {
                $did = $row['did'] ?? '';
                if ($did !== '') {
                    $res->data[] = ['value' => $did, 'name' => $did];
                }
            }
        }

        return $res;
    }

    /**
     * Resolve provider's SIP/IAX endpoint identifier and login username
     *
     * @param string $providerId Provider uniqid or 'none'/empty for any provider
     * @return array{0: string, 1: string} [fromAccount, excludeUsername]
     */
    private static function resolveProviderInfo(string $providerId): array
    {
        if (empty($providerId) || $providerId === 'none') {
            return ['', ''];
        }

        $provider = Providers::findFirstByUniqid($providerId);
        if ($provider === null) {
            return ['', ''];
        }

        // SIP provider: sipuid is the PJSIP endpoint name stored as from_account in CDR
        if (!empty($provider->sipuid)) {
            $username = $provider->Sip?->username ?? '';
            return [$provider->sipuid, $username];
        }

        // IAX provider
        if (!empty($provider->iaxuid)) {
            $username = $provider->Iax?->username ?? '';
            return [$provider->iaxuid, $username];
        }

        return ['', ''];
    }
}
