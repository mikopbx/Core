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

namespace MikoPBX\PBXCoreREST\Lib\Network;

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting list of all network interfaces
 *
 * @api {get} /pbxcore/api/v3/network Get all network interfaces
 * @apiVersion 3.0.0
 * @apiName GetNetworkList
 * @apiGroup Network
 *
 * @apiParam {String} [search] Search term for filtering
 * @apiParam {String} [order] Field to order by
 * @apiParam {String} [orderWay] Order direction (ASC/DESC)
 * @apiParam {Number} [limit] Maximum number of records to return
 * @apiParam {Number} [offset] Number of records to skip
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of network interfaces
 * @apiSuccess {String} data.id Unique identifier
 * @apiSuccess {String} data.interface Physical interface name
 * @apiSuccess {String} data.name Interface display name
 * @apiSuccess {String} data.vlanid VLAN ID
 * @apiSuccess {String} data.ipaddr IP address
 * @apiSuccess {String} data.subnet Subnet mask
 * @apiSuccess {String} data.gateway Gateway IP
 * @apiSuccess {String} data.dhcp DHCP enabled flag
 * @apiSuccess {String} data.internet Internet interface flag
 */
class GetListAction
{
    /**
     * Get list of all network interfaces with filtering and pagination support
     *
     * @param array $data Filter parameters (search, ordering, pagination)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Build query
            $parameters = [];
            $conditions = [];

            // Only show enabled interfaces by default
            $conditions[] = 'disabled = :disabled:';
            $parameters['disabled'] = '0';

            // Apply search filter if provided
            if (!empty($data['search'])) {
                $searchTerm = '%' . $data['search'] . '%';
                $conditions[] = '(name LIKE :search: OR interface LIKE :search: OR ipaddr LIKE :search:)';
                $parameters['search'] = $searchTerm;
            }

            // Build conditions string
            $conditionsString = implode(' AND ', $conditions);

            // SECURITY (GHSA-mhhq-c73g-ffm8): the ORDER BY clause cannot be bound as a
            // parameter, so a raw $data['order'] was an SQL-injection sink. Resolve the
            // request against a whitelist of sortable columns and a validated direction;
            // anything unrecognised falls back to the default order.
            $order = self::resolveOrder($data['order'] ?? null);

            // Get interfaces
            $interfaces = LanInterfaces::find([
                $conditionsString,
                'bind' => $parameters,
                'order' => $order
            ]);

            // Convert to array
            $result = [];
            foreach ($interfaces as $interface) {
                $item = $interface->toArray();

                // Add computed fields
                $item['isDeletable'] = false;
                if ($interface->interface !== '') {
                    // Check if this interface has VLANs
                    $vlanCount = LanInterfaces::count([
                        'interface = :interface: AND disabled = :disabled:',
                        'bind' => [
                            'interface' => $interface->interface,
                            'disabled' => '0'
                        ]
                    ]);
                    $item['isDeletable'] = $vlanCount > 1 && $interface->internet !== '1';
                }

                $item['isInternet'] = $interface->internet === '1';
                $item['isDhcp'] = $interface->dhcp === '1';

                $result[] = $item;
            }

            // Apply pagination if requested
            if (isset($data['limit']) && $data['limit'] > 0) {
                $offset = $data['offset'] ?? 0;
                $result = array_slice($result, $offset, $data['limit']);
            }

            $res->data = $result;
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }

    /**
     * Sortable columns for the interface list. Only these may appear in ORDER BY.
     */
    private const array ALLOWED_ORDER_FIELDS = [
        'id', 'name', 'interface', 'vlanid', 'subnet', 'ipaddr', 'topology', 'dhcp', 'disabled',
    ];

    private const string DEFAULT_ORDER = 'interface ASC, vlanid ASC';

    /**
     * Resolve a client-supplied ORDER BY request against a column/direction whitelist.
     *
     * The ORDER BY clause cannot be a bound parameter, so the raw value is never passed
     * to PHQL. Each comma-separated term must be a whitelisted column with an optional
     * ASC/DESC direction; any deviation discards the whole request and uses the default
     * order (GHSA-mhhq-c73g-ffm8).
     *
     * @param string|null $requested
     * @return string
     */
    private static function resolveOrder(?string $requested): string
    {
        if ($requested === null || trim($requested) === '') {
            return self::DEFAULT_ORDER;
        }

        $terms = [];
        foreach (explode(',', $requested) as $term) {
            $parts = preg_split('/\s+/', trim($term));
            $field = $parts[0] ?? '';
            if (!in_array($field, self::ALLOWED_ORDER_FIELDS, true)) {
                return self::DEFAULT_ORDER;
            }
            $direction = strtoupper($parts[1] ?? 'ASC');
            if (isset($parts[2]) || !in_array($direction, ['ASC', 'DESC'], true)) {
                return self::DEFAULT_ORDER;
            }
            $terms[] = "{$field} {$direction}";
        }

        return $terms === [] ? self::DEFAULT_ORDER : implode(', ', $terms);
    }
}