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

namespace MikoPBX\PBXCoreREST\Lib\CustomFiles;

use MikoPBX\Common\Models\CustomFiles;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting list of custom files
 *
 * @api {get} /pbxcore/api/v3/custom-files Get list of custom files
 * @apiVersion 3.0.0
 * @apiName GetList
 * @apiGroup CustomFiles
 *
 * @apiParam {Number} [limit=50] Number of records to return
 * @apiParam {Number} [offset=0] Offset for pagination
 * @apiParam {String} [search] Search string for filtering
 * @apiParam {String} [sort] Sort field (filepath, mode, changed)
 * @apiParam {String} [order=asc] Sort order (asc or desc)
 *
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data List of custom files
 * @apiSuccess {Object} metadata Pagination metadata
 * @apiSuccess {Number} metadata.total Total number of records
 * @apiSuccess {Number} metadata.limit Records per page
 * @apiSuccess {Number} metadata.offset Current offset
 */
class GetListAction
{
    /**
     * Get list of custom files with optional filtering and pagination
     *
     * @param array $data Request parameters
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Parse pagination parameters
            $limit = (int)($data['limit'] ?? 50);
            $offset = (int)($data['offset'] ?? 0);
            $search = $data['search'] ?? '';
            $sort = $data['sort'] ?? 'filepath';
            $order = strtoupper($data['order'] ?? 'ASC');

            // Validate sort field
            $allowedSortFields = ['filepath', 'mode', 'changed', 'id'];
            if (!in_array($sort, $allowedSortFields)) {
                $sort = 'filepath';
            }

            // Validate order
            if (!in_array($order, ['ASC', 'DESC'])) {
                $order = 'ASC';
            }

            // Build query conditions
            $conditions = [];
            $bind = [];

            if (!empty($search)) {
                $conditions[] = '(filepath LIKE :search: OR description LIKE :search:)';
                $bind['search'] = '%' . $search . '%';
            }

            // Count total records
            $totalParams = [
                'columns' => 'COUNT(*) as count'
            ];
            if (!empty($conditions)) {
                $totalParams['conditions'] = implode(' AND ', $conditions);
                $totalParams['bind'] = $bind;
            }
            $totalResult = CustomFiles::findFirst($totalParams);
            $total = $totalResult ? (int)$totalResult->count : 0;

            // Get records with pagination
            $params = [
                'order' => "$sort $order",
                'limit' => $limit,
                'offset' => $offset
            ];
            if (!empty($conditions)) {
                $params['conditions'] = implode(' AND ', $conditions);
                $params['bind'] = $bind;
            }

            $files = CustomFiles::find($params);

            // Format response data
            $items = [];
            foreach ($files as $file) {
                $items[] = DataStructure::createFromModel($file);
            }

            $res->data = $items;
            // Use data array for metadata to avoid dynamic property warning
            $res->data = [
                'items' => $items,
                'metadata' => [
                    'total' => $total,
                    'limit' => $limit,
                    'offset' => $offset
                ]
            ];
            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }

        return $res;
    }
}