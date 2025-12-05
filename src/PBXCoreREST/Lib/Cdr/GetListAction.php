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

use MikoPBX\Common\Models\CallDetailRecords;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\Config\CDRConfigInterface;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * Get list of CDR records action
 *
 * Unified endpoint that supports both:
 * - REST API format (for CRM integration)
 * - DataTables format (for web UI)
 *
 * Format is automatically detected by presence of 'draw' parameter.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Cdr
 */
class GetListAction
{
    /**
     * Get list of CDR records
     *
     * Returns REST API format only.
     * Frontend is responsible for transforming to DataTables format if needed.
     *
     * @param array $data Request parameters
     * @param array $sessionContext Session context from REST API (role, user_name, session_id).
     *                              Passed to module hooks for ACL filtering.
     * @return PBXApiResult
     */
    public static function main(array $data, array $sessionContext = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Always return REST format with grouped records
            // WHY: Single format, easier maintenance, reusable for CRM and WebUI
            $result = self::handleRestRequest($data, $sessionContext);

            // WHY: Follow REST API protocol - all data inside 'data' block
            // Structure: {data: {records: [...], pagination: {...}}}
            $res->data = [
                'records' => $result['data'],
                'pagination' => $result['pagination']
            ];
            $res->success = true;

        } catch (\InvalidArgumentException $e) {
            // WHY: Validation errors (date range, negative offset) return 422
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();
            $res->httpCode = 422;
        } catch (\Exception $e) {
            // WHY: Unexpected errors return 500 Internal Server Error
            $res->success = false;
            $res->messages['error'][] = $e->getMessage();
            $res->httpCode = 500;
        }

        return $res;
    }


    /**
     * Handle REST API request
     *
     * Uses CDRDatabaseProvider::getCdr() to support ACL filtering from modules.
     *
     * Supports:
     * - Pagination (limit/offset or idFrom)
     * - Filtering (dateFrom/dateTo, src_num, dst_num, disposition, did)
     * - Sorting (sort/order)
     * - Grouping (grouped=true for linkedid aggregation)
     * - Field selection (fields parameter)
     * - ACL filtering via module hooks
     *
     * @param array $data Request parameters
     * @param array $sessionContext Session context from REST API for ACL filtering
     * @return array Response with data and pagination
     */
    private static function handleRestRequest(array $data, array $sessionContext = []): array
    {
        // Pagination parameters
        // WHY: Clamp limit to 1-1000 range to prevent excessive queries
        $limit = min(max(1, intval($data['limit'] ?? 50)), 1000);

        // WHY: Reject negative offset with validation error
        // Security: Negative offsets can cause unintended database behavior
        $requestedOffset = intval($data['offset'] ?? 0);
        if ($requestedOffset < 0) {
            throw new \InvalidArgumentException(
                "Invalid offset value: {$requestedOffset}. Offset must be non-negative."
            );
        }
        $offset = $requestedOffset;

        $idFrom = isset($data['idFrom']) ? intval($data['idFrom']) : null;

        // Filtering parameters
        $dateFrom = $data['dateFrom'] ?? null;
        $dateTo = $data['dateTo'] ?? null;
        $srcNum = $data['src_num'] ?? null;
        $dstNum = $data['dst_num'] ?? null;
        $disposition = $data['disposition'] ?? null;
        $did = $data['did'] ?? null;
        $linkedid = $data['linkedid'] ?? null;  // Exact linkedid search
        $search = $data['search'] ?? null;       // Smart search with prefix support

        // Normalize date filters to include time
        // WHY: Database field 'start' contains timestamp, but users provide date-only values
        // Example: '2025-10-13' should match records from '2025-10-13 00:00:00' to '2025-10-13 23:59:59'
        if ($dateFrom !== null && strlen($dateFrom) === 10) {
            // Date-only format (YYYY-MM-DD), add start of day
            $dateFrom .= ' 00:00:00';
        }
        if ($dateTo !== null && strlen($dateTo) === 10) {
            // Date-only format (YYYY-MM-DD), add end of day
            $dateTo .= ' 23:59:59';
        }

        // Enforce date range limits to prevent excessive queries
        // WHY: Prevent DoS attacks via unlimited date ranges (e.g., dateFrom=2000-01-01&dateTo=2030-12-31)
        $maxDaysRange = 365; // Maximum 1 year range
        if ($dateFrom !== null && $dateTo !== null) {
            try {
                $dateFromObj = new \DateTime($dateFrom);
                $dateToObj = new \DateTime($dateTo);
                $daysDiff = $dateFromObj->diff($dateToObj)->days;

                if ($daysDiff > $maxDaysRange) {
                    // WHY: Throw InvalidArgumentException to return 422 validation error
                    throw new \InvalidArgumentException(
                        "Date range exceeds maximum allowed ({$maxDaysRange} days). " .
                        "Please narrow your search criteria."
                    );
                }
            } catch (\Exception $e) {
                if ($e instanceof \InvalidArgumentException) {
                    throw $e; // Re-throw validation errors
                }
                // Invalid date format - throw as validation error
                throw new \InvalidArgumentException(
                    "Invalid date format. Expected: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS"
                );
            }
        }

        // Auto-apply date range if no filters specified
        // WHY: Prevent full table scans on massive datasets
        if ($dateFrom === null && $dateTo === null && $linkedid === null &&
            $srcNum === null && $dstNum === null && $search === null && $did === null) {
            // Default to last 30 days if no filters provided
            $dateTo = date('Y-m-d 23:59:59');
            $dateFrom = date('Y-m-d 00:00:00', strtotime('-30 days'));
        }

        // Sorting parameters with SQL injection protection
        // WHY: Whitelist allowed fields to prevent SQL injection in ORDER BY clause
        $allowedSortFields = [
            'id',           // Primary key
            'start',        // Call start time (most common sort)
            'linkedid',     // Group by conversation
            'src_num',      // Source number
            'dst_num',      // Destination number
            'did',          // DID number
            'disposition',  // Call status (ANSWERED, NO ANSWER, etc)
            'duration',     // Total call duration
            'billsec'       // Billable duration
        ];

        $requestedSort = $data['sort'] ?? 'id';
        $sortField = in_array($requestedSort, $allowedSortFields, true) ? $requestedSort : 'id';

        $sortOrder = strtoupper($data['order'] ?? 'DESC');
        if (!in_array($sortOrder, ['ASC', 'DESC'], true)) {
            $sortOrder = 'DESC';
        }

        // Grouping parameter
        // WHY: Support both grouped (linkedid aggregation) and ungrouped (individual records) modes
        // grouped=true: Complex calls with transfers displayed as one entity
        // grouped=false: Individual CDR records for CRM integration
        // Default: true (for web UI compatibility)
        $grouped = !isset($data['grouped']) || filter_var($data['grouped'], FILTER_VALIDATE_BOOLEAN);

        // Field selection (for future use)
        $fields = $data['fields'] ?? null;

        // ============ ACL FILTERING ============
        // WHY: Apply module ACL filters BEFORE building query
        // Modules can add conditions to restrict CDR access based on user permissions
        // Example: ModuleUsersUI can limit CDR to specific extensions only
        $parameters = [
            'conditions' => '',
            'bind' => []
        ];

        // Apply ACL filters via module hooks
        // WHY: Pass sessionContext (role, user_name from JWT) for REST API context
        // In AdminCabinet context, sessionContext is empty - modules use SessionProvider
        // In REST API context, modules should use sessionContext['role'] instead
        PBXConfModulesProvider::hookModulesMethod(
            CDRConfigInterface::APPLY_ACL_FILTERS_TO_CDR_QUERY,
            [&$parameters, $sessionContext]
        );

        // Build query conditions (Phalcon ORM format)
        // Start with ACL conditions if any were added by modules
        $conditions = [];
        $bind = [];

        if (!empty($parameters['conditions'])) {
            // Preserve ACL conditions from module hooks
            $conditions[] = $parameters['conditions'];
            if (!empty($parameters['bind'])) {
                $bind = array_merge($bind, $parameters['bind']);
            }
        }

        // Linkedid filter (exact match, highest priority)
        // WHY: If linkedid specified, it's most specific filter
        if ($linkedid !== null) {
            $conditions[] = 'linkedid = :linkedid:';
            $bind['linkedid'] = $linkedid;
        }

        // Regular filters
        if ($idFrom !== null) {
            $conditions[] = 'id > :idFrom:';
            $bind['idFrom'] = $idFrom;
        }

        if ($dateFrom !== null) {
            $conditions[] = 'start >= :dateFrom:';
            $bind['dateFrom'] = $dateFrom;
        }

        if ($dateTo !== null) {
            $conditions[] = 'start <= :dateTo:';
            $bind['dateTo'] = $dateTo;
        }

        // Smart search: search phrase in CDR fields + Extensions lookup
        // WHY: Users want to search by phone number OR employee name
        // Example: "Smith" finds all calls where src_num/dst_num matches extension with "Smith" in search_index
        if ($search !== null && trim($search) !== '') {
            $searchTrimmed = trim($search);

            // STEP 1: Find matching extension numbers using ORM
            // WHY: User might search by employee name, need to find their extension numbers
            $extensionNumbers = [];
            try {
                $extensions = \MikoPBX\Common\Models\Extensions::find([
                    'conditions' => 'search_index LIKE :pattern:',
                    'bind' => ['pattern' => '%' . $searchTrimmed . '%'],
                    'columns' => 'number'
                ]);

                foreach ($extensions as $ext) {
                    $extensionNumbers[] = $ext->number;
                }

                // Extensions found - will be used in CDR query
            } catch (\Exception $e) {
                // If Extensions search fails, continue with CDR-only search
                // WHY: Graceful degradation - search will still work with LIKE on CDR fields
            }

            // STEP 2: Build OR condition for CDR search
            // Search by: LIKE phrase in src_num/dst_num/did OR exact match with found extension numbers
            $searchConditions = [];

            // LIKE search in CDR fields (for direct number search)
            $searchConditions[] = 'src_num LIKE :searchLike:';
            $searchConditions[] = 'dst_num LIKE :searchLike:';
            $searchConditions[] = 'did LIKE :searchLike:';
            $bind['searchLike'] = '%' . $searchTrimmed . '%';

            // Exact match with extension numbers (for name-based search)
            if (!empty($extensionNumbers)) {
                $searchConditions[] = 'src_num IN ({extNumbers:array})';
                $searchConditions[] = 'dst_num IN ({extNumbers:array})';
                $bind['extNumbers'] = $extensionNumbers;
            }

            $conditions[] = '(' . implode(' OR ', $searchConditions) . ')';
        }

        if ($srcNum !== null) {
            $conditions[] = 'src_num LIKE :srcNum:';
            $bind['srcNum'] = '%' . $srcNum . '%';
        }

        if ($dstNum !== null) {
            $conditions[] = 'dst_num LIKE :dstNum:';
            $bind['dstNum'] = '%' . $dstNum . '%';
        }

        if ($disposition !== null) {
            $conditions[] = 'disposition = :disposition:';
            $bind['disposition'] = $disposition;
        }

        if ($did !== null) {
            $conditions[] = 'did LIKE :did:';
            $bind['did'] = '%' . $did . '%';
        }

        $whereClause = !empty($conditions) ? implode(' AND ', $conditions) : '1=1';

        // Format response
        $responseData = [];
        $lastId = null;

        if ($grouped) {
            // ============ GROUPED PAGINATION LOGIC ============
            // WHY: Must paginate by groups (linkedid), not individual records
            // STEP 1: Get paginated linkedids using raw SQL (fast!)
            // STEP 2: Fetch only CDR records for these linkedids via ORM
            // STEP 3: Group and format
            // PERFORMANCE: Raw SQL for aggregation, ORM only for final data fetch

            $di = Di::getDefault();
            $dbCDR = $di->get('dbCDR');

            // Convert Phalcon placeholders to PDO format for raw SQL
            // WHY: Raw SQL uses PDO placeholders :name, but Phalcon ORM uses :name:
            $whereRaw = $whereClause;
            $bindForRawSql = $bind;

            // Handle array placeholder {extNumbers:array} for IN clause
            // WHY: Raw SQL doesn't support Phalcon's array binding, need to expand manually
            if (isset($bindForRawSql['extNumbers']) && is_array($bindForRawSql['extNumbers'])) {
                $placeholders = [];
                foreach ($bindForRawSql['extNumbers'] as $idx => $number) {
                    $key = "extNum{$idx}";
                    $placeholders[] = ":{$key}";
                    $bindForRawSql[$key] = $number;
                }
                // Replace {extNumbers:array} with :extNum0,:extNum1,:extNum2,...
                $whereRaw = str_replace('{extNumbers:array}', implode(',', $placeholders), $whereRaw);
                unset($bindForRawSql['extNumbers']);
            }

            // Handle array placeholder {filteredExtensions:array} for ACL filtering
            // WHY: ModuleUsersUI adds CDR ACL filters with this placeholder
            if (isset($bindForRawSql['filteredExtensions']) && is_array($bindForRawSql['filteredExtensions'])) {
                $placeholders = [];
                foreach ($bindForRawSql['filteredExtensions'] as $idx => $number) {
                    $key = "filtExt{$idx}";
                    $placeholders[] = ":{$key}";
                    $bindForRawSql[$key] = $number;
                }
                // Replace {filteredExtensions:array} with :filtExt0,:filtExt1,:filtExt2,...
                $whereRaw = str_replace('{filteredExtensions:array}', implode(',', $placeholders), $whereRaw);
                unset($bindForRawSql['filteredExtensions']);
            }

            // Replace simple Phalcon placeholders (:name:) with PDO format (:name)
            $whereRaw = str_replace(
                [':linkedid:', ':idFrom:', ':dateFrom:', ':dateTo:', ':searchLike:', ':srcNum:', ':dstNum:', ':disposition:', ':did:'],
                [':linkedid', ':idFrom', ':dateFrom', ':dateTo', ':searchLike', ':srcNum', ':dstNum', ':disposition', ':did'],
                $whereRaw
            );

            // Replace dynamically created extNum placeholders
            foreach ($bindForRawSql as $key => $value) {
                if (strpos($key, 'extNum') === 0) {
                    $whereRaw = str_replace(":{$key}:", ":{$key}", $whereRaw);
                }
            }

            // Count total unique linkedids
            // WHY: Need for pagination metadata
            $countSql = "SELECT COUNT(DISTINCT linkedid) as total FROM cdr_general WHERE {$whereRaw}";
            $totalRows = $dbCDR->fetchAll($countSql, \Phalcon\Db\Enum::FETCH_ASSOC, $bindForRawSql);
            $total = !empty($totalRows) ? (int)$totalRows[0]['total'] : 0;

            // Get paginated list of unique linkedids
            // WHY: Only fetch linkedids for current page (memory efficient)
            // WHY GROUP BY: For grouped mode, use MAX() aggregation to get correct sort value per linkedid
            // Example: If sorting by 'id DESC', we want linkedid with MAX(id), not just any record's id
            $linkedIdsSql = "
                SELECT linkedid, MAX({$sortField}) as sort_value
                FROM cdr_general
                WHERE {$whereRaw}
                GROUP BY linkedid
                ORDER BY sort_value {$sortOrder}
                LIMIT {$limit} OFFSET {$offset}
            ";

            $linkedIdsRows = $dbCDR->fetchAll($linkedIdsSql, \Phalcon\Db\Enum::FETCH_ASSOC, $bindForRawSql);
            $linkedIds = array_column($linkedIdsRows, 'linkedid');

            if (!empty($linkedIds)) {
                // Fetch all CDR records for selected linkedids using ORM
                // WHY: ORM handles object mapping and relationships well
                $records = CallDetailRecords::find([
                    'conditions' => 'linkedid IN ({linkedIds:array})',
                    'bind' => ['linkedIds' => $linkedIds],
                    'order' => "{$sortField} {$sortOrder}"
                ]);

                // Group by linkedid for display
                $groupedData = self::groupByLinkedId($records);
                $responseData = array_values($groupedData);

                // Get last ID from grouped data
                if (!empty($groupedData)) {
                    $lastGroup = end($groupedData);
                    if (isset($lastGroup['records']) && !empty($lastGroup['records'])) {
                        $lastRecord = end($lastGroup['records']);
                        $lastId = $lastRecord['id'] ?? null;
                    }
                }
            }

        } else {
            // ============ INDIVIDUAL RECORD PAGINATION ============
            // WHY: Simple pagination for ungrouped view

            $queryParams = [
                'conditions' => $whereClause,
                'bind' => $bind,
                'limit' => $limit,
                'offset' => $offset,
                'order' => "{$sortField} {$sortOrder}"
            ];

            $records = CallDetailRecords::find($queryParams);

            // Return individual records - convert to array for PHPStan
            $recordsArray = iterator_to_array($records);
            foreach ($recordsArray as $record) {
                $responseData[] = DataStructure::createFromModel($record);
            }

            // Count total individual records
            $total = CallDetailRecords::count([
                'conditions' => $whereClause,
                'bind' => $bind
            ]);

            // Get last ID
            if (!empty($recordsArray)) {
                $lastRecord = end($recordsArray);
                $lastId = $lastRecord->id;
            }
        }

        return [
            'data' => $responseData,
            'pagination' => [
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
                'hasMore' => ($offset + $limit) < $total,
                'lastId' => $lastId
            ]
        ];
    }

    /**
     * Group CDR records by linkedid
     *
     * WHY: Complex calls with transfers have multiple CDR records with same linkedid
     * Grouping provides a single view of the entire call flow with all segments
     *
     * @param \Phalcon\Mvc\Model\ResultsetInterface|CallDetailRecords[] $records CDR records to group
     * @return array<string, array<string, mixed>> Grouped records indexed by linkedid
     */
    private static function groupByLinkedId($records): array
    {
        $grouped = [];

        /** @var CallDetailRecords $record */
        foreach ($records as $record) {
            $linkedId = $record->linkedid;

            if (!isset($grouped[$linkedId])) {
                // Initialize group with first record's data
                $grouped[$linkedId] = [
                    'linkedid' => $linkedId,
                    'start' => $record->start,
                    'src_num' => $record->src_num,
                    'dst_num' => $record->dst_num,  // Initial value
                    'did' => $record->did,          // Initial DID value
                    'disposition' => $record->disposition,
                    'totalDuration' => 0,
                    'totalBillsec' => 0,
                    'records' => []
                ];
            }

            // Update start: always use earliest timestamp
            // WHY: Group should show when the call actually started, not first record in query result
            $currentStart = $grouped[$linkedId]['start'];

            // Compare timestamps as strings (format: YYYY-MM-DD HH:MM:SS.mmm)
            // WHY: String comparison works correctly for ISO datetime format
            if ($record->start < $currentStart) {
                $grouped[$linkedId]['start'] = $record->start;
                // When we find earlier start, also update src_num from that record
                // WHY: The earliest record shows the original caller
                if (empty($grouped[$linkedId]['src_num']) || $record->start < $currentStart) {
                    $grouped[$linkedId]['src_num'] = $record->src_num;
                }
            }

            // Update dst_num: always prefer DID if present in ANY record
            // WHY: For incoming calls, users want to see which external number (DID) was called
            // not the first internal extension in transfer chain
            if (!empty($record->did)) {
                // If this record has DID, always use it as dst_num for display
                $grouped[$linkedId]['dst_num'] = $record->did;
                // Also update the group's DID field to ensure consistency
                $grouped[$linkedId]['did'] = $record->did;
            }

            // Update aggregated metrics
            $grouped[$linkedId]['totalDuration'] += intval($record->duration);
            $grouped[$linkedId]['totalBillsec'] += intval($record->billsec);

            // Update disposition if current is ANSWERED
            if (($record->disposition === 'ANSWERED' || $record->disposition === 'ANSWER')
                && $grouped[$linkedId]['disposition'] !== 'ANSWERED') {
                $grouped[$linkedId]['disposition'] = 'ANSWERED';
            }

            // Add individual record to group
            $grouped[$linkedId]['records'][] = DataStructure::createFromModel($record);
        }

        return $grouped;
    }
}
