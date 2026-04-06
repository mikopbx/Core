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

namespace MikoPBX\PBXCoreREST\Lib\Cdr;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\Providers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * Get aggregated CDR statistics grouped by provider/trunk
 *
 * Returns call counts, durations and billable seconds per trunk,
 * split by direction (incoming/outgoing). Useful for Zabbix monitoring,
 * dashboards, and web UI reporting.
 *
 * Direction detection:
 * - Incoming: from_account matches a known provider uniqid
 * - Outgoing: to_account matches a known provider uniqid
 *
 * Provider IDs are loaded from the Providers table to support all
 * historical prefix formats (SIP-TRUNK-xxx, SIP-PROVIDER-xxx, SIP-xxx).
 *
 * Deduplication: groups by (provider, linkedid) first to avoid counting
 * multi-leg calls (transfers) multiple times per conversation.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Cdr
 */
class GetStatsByProviderAction
{
    /**
     * Get CDR statistics grouped by provider
     *
     * @param array<string, mixed> $data Request parameters (dateFrom, dateTo, provider)
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Validate required date parameters
            $dateFrom = isset($data['dateFrom']) && is_string($data['dateFrom']) ? $data['dateFrom'] : null;
            $dateTo = isset($data['dateTo']) && is_string($data['dateTo']) ? $data['dateTo'] : null;

            if ($dateFrom === null || $dateTo === null) {
                throw new \InvalidArgumentException(
                    'Both dateFrom and dateTo parameters are required.'
                );
            }

            // Normalize date-only values to include time
            if (strlen($dateFrom) === 10) {
                $dateFrom .= ' 00:00:00';
            }
            if (strlen($dateTo) === 10) {
                $dateTo .= ' 23:59:59';
            }

            // Validate date range (max 365 days)
            try {
                $dateFromObj = new \DateTime($dateFrom);
                $dateToObj = new \DateTime($dateTo);
                $daysDiff = $dateFromObj->diff($dateToObj)->days;

                if ($dateFromObj > $dateToObj) {
                    throw new \InvalidArgumentException(
                        'dateFrom must be before dateTo.'
                    );
                }

                if ($daysDiff > 365) {
                    throw new \InvalidArgumentException(
                        'Date range exceeds maximum allowed (365 days). Please narrow your search criteria.'
                    );
                }
            } catch (\Exception $e) {
                if ($e instanceof \InvalidArgumentException) {
                    throw $e;
                }
                throw new \InvalidArgumentException(
                    'Invalid date format. Expected: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS'
                );
            }

            // Optional provider filter
            $provider = isset($data['provider']) && is_string($data['provider']) ? $data['provider'] : null;

            // Get provider IDs: specific filter or all known providers from DB
            if ($provider !== null) {
                $providerIds = [$provider];
            } else {
                $providerIds = self::getAllProviderIds();
            }

            if (empty($providerIds)) {
                $res->data = [];
                $res->success = true;
                return $res;
            }

            $di = Di::getDefault();
            $dbCDR = $di->get('dbCDR');

            $rows = [
                ...self::fetchDirectionStats($dbCDR, 'incoming', 'from_account', $dateFrom, $dateTo, $providerIds),
                ...self::fetchDirectionStats($dbCDR, 'outgoing', 'to_account', $dateFrom, $dateTo, $providerIds),
            ];

            // Sort by provider, direction for consistent output
            usort($rows, static function ($a, $b) {
                return ($a['provider'] <=> $b['provider']) ?: ($a['direction'] <=> $b['direction']);
            });

            // Resolve provider names from Extensions table (main DB)
            // array_values() required: array_unique preserves keys, and Phalcon's
            // {ids:array} binding fails with non-sequential keys on SQLite
            $providerIds = array_values(array_unique(array_column($rows, 'provider')));
            $providerNames = self::resolveProviderNames($providerIds);

            // Format response
            $stats = [];
            foreach ($rows as $row) {
                $providerId = $row['provider'];
                $stats[] = [
                    'provider' => $providerId,
                    'providerName' => $providerNames[$providerId] ?? $providerId,
                    'direction' => $row['direction'],
                    'totalCalls' => (int)$row['totalCalls'],
                    'answeredCalls' => (int)$row['answeredCalls'],
                    'totalDuration' => (int)$row['totalDuration'],
                    'totalBillsec' => (int)$row['totalBillsec'],
                ];
            }

            $res->data = $stats;
            $res->success = true;

        } catch (\InvalidArgumentException $e) {
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();
            $res->httpCode = 422;
        } catch (\Exception $e) {
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();
            $res->httpCode = 500;
        }

        return $res;
    }

    /**
     * Fetch aggregated stats for one direction (incoming or outgoing)
     *
     * Groups by (provider, linkedid) to deduplicate multi-leg calls (transfers),
     * then aggregates per provider.
     *
     * @param \Phalcon\Db\Adapter\AdapterInterface $dbCDR CDR database connection
     * @param string $direction 'incoming' or 'outgoing'
     * @param string $accountColumn 'from_account' for incoming, 'to_account' for outgoing
     * @param string $dateFrom Start date
     * @param string $dateTo End date
     * @param string[] $providerIds Provider IDs to filter by
     * @return array<int, array<string, mixed>> Aggregated rows
     */
    private static function fetchDirectionStats(
        $dbCDR,
        string $direction,
        string $accountColumn,
        string $dateFrom,
        string $dateTo,
        array $providerIds
    ): array {
        if (empty($providerIds)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($providerIds), '?'));
        $bind = [$dateFrom, $dateTo, ...$providerIds];

        $sql = "
            SELECT
                provider,
                COUNT(*) as totalCalls,
                SUM(CASE WHEN answered > 0 THEN 1 ELSE 0 END) as answeredCalls,
                SUM(duration) as totalDuration,
                SUM(billsec) as totalBillsec
            FROM (
                SELECT
                    {$accountColumn} as provider,
                    linkedid,
                    MAX(CASE WHEN disposition = 'ANSWERED' THEN 1 ELSE 0 END) as answered,
                    MAX(duration) as duration,
                    MAX(billsec) as billsec
                FROM cdr_general
                WHERE start >= ?
                  AND start <= ?
                  AND {$accountColumn} IN ({$placeholders})
                GROUP BY {$accountColumn}, linkedid
            )
            GROUP BY provider
            ORDER BY provider
        ";

        $rows = $dbCDR->fetchAll($sql, \Phalcon\Db\Enum::FETCH_ASSOC, $bind);

        // Add direction to each row
        return array_map(static function ($row) use ($direction) {
            $row['direction'] = $direction;
            return $row;
        }, $rows);
    }

    /**
     * Get all provider uniqids from the Providers table
     *
     * Handles all historical provider ID formats regardless of prefix
     * (SIP-TRUNK-xxx, SIP-PROVIDER-xxx, SIP-xxx, IAX-TRUNK-xxx, etc.)
     *
     * @return string[]
     */
    private static function getAllProviderIds(): array
    {
        $providers = Providers::find(['columns' => 'uniqid']);
        return array_column($providers->toArray(), 'uniqid');
    }

    /**
     * Resolve provider extension IDs to human-readable names
     *
     * Looks up the callerid field in Extensions table for trunk-type extensions.
     *
     * @param string[] $providerIds Array of provider extension IDs (e.g., 'SIP-TRUNK-xxx')
     * @return array<string, string> Map of providerId => providerName
     */
    private static function resolveProviderNames(array $providerIds): array
    {
        if (empty($providerIds)) {
            return [];
        }

        $names = [];
        $extensions = Extensions::find([
            'conditions' => 'number IN ({ids:array})',
            'bind' => ['ids' => $providerIds],
            'columns' => 'number, callerid',
        ]);

        foreach ($extensions as $ext) {
            if (!empty($ext->callerid)) {
                $names[$ext->number] = $ext->callerid;
            }
        }

        return $names;
    }
}
