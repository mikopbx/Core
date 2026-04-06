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

use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * Get CDR metadata action (date range from last N records)
 *
 * Returns lightweight metadata about CDR records without fetching full data.
 * Used for initializing date range picker with meaningful default period.
 *
 * WHY: Avoids double request on page load (HEAD for metadata + GET for data)
 * Instead of fetching 100 full records just to get dates, we return only
 * the earliest and latest timestamps.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Cdr
 */
class GetMetadataAction
{
    /**
     * Get CDR metadata (date range from last N records)
     *
     * Returns:
     * - earliestDate: Start date from the last N records
     * - latestDate: End date from the last N records
     * - hasRecords: Whether database has any CDR records
     *
     * @param array<string, mixed> $data Request parameters (limit for sample size)
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Sample size (default 100 records)
            // WHY: 100 records provide meaningful date range without overwhelming query
            $limit = min(intval($data['limit'] ?? 100), 1000);

            $di = Di::getDefault();
            $dbCDR = $di->get('dbCDR');

            // Get MIN and MAX start dates from last N records
            // WHY: Single efficient query instead of fetching all record data
            $sql = "
                SELECT
                    MIN(start) as earliestDate,
                    MAX(start) as latestDate,
                    COUNT(*) as recordCount
                FROM (
                    SELECT start
                    FROM cdr_general
                    ORDER BY start DESC
                    LIMIT :limit
                ) AS recent_calls
            ";

            $result = $dbCDR->fetchAll($sql, \Phalcon\Db\Enum::FETCH_ASSOC, ['limit' => $limit]);

            if (!empty($result) && $result[0]['recordCount'] > 0) {
                $res->data = [
                    'earliestDate' => $result[0]['earliestDate'],
                    'latestDate' => $result[0]['latestDate'],
                    'hasRecords' => true,
                    'sampleSize' => (int)$result[0]['recordCount']
                ];
            } else {
                // Empty database
                $res->data = [
                    'earliestDate' => null,
                    'latestDate' => null,
                    'hasRecords' => false,
                    'sampleSize' => 0
                ];
            }

            $res->success = true;

        } catch (\Exception $e) {
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();
            $res->httpCode = 500;
        }

        return $res;
    }
}
