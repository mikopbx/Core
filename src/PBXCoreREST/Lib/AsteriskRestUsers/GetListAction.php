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

namespace MikoPBX\PBXCoreREST\Lib\AsteriskRestUsers;

use MikoPBX\Common\Models\AsteriskRestUsers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetListAction;

/**
 * Get list of ARI users action.
 *
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskRestUsers
 */
class GetListAction extends AbstractGetListAction
{
    /**
     * Get list of ARI users.
     *
     * @param array $data Request parameters (limit, offset, search, etc.)
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Build query conditions
            $conditions = [];
            $bind = [];
            
            // Handle search filter
            if (!empty($data['search'])) {
                $searchTerm = '%' . $data['search'] . '%';
                $conditions[] = '(username LIKE :search: OR description LIKE :search:)';
                $bind['search'] = $searchTerm;
            }
            
            // Build final conditions string
            $conditionsStr = !empty($conditions) ? implode(' AND ', $conditions) : '';
            
            // Prepare query parameters
            $parameters = [
                'order' => 'username ASC',
            ];
            
            if (!empty($conditionsStr)) {
                $parameters['conditions'] = $conditionsStr;
                $parameters['bind'] = $bind;
            }
            
            // Get total count for pagination
            $totalCount = AsteriskRestUsers::count(!empty($conditionsStr) ? [
                'conditions' => $conditionsStr,
                'bind' => $bind
            ] : []);
            
            // Apply pagination
            $limit = isset($data['limit']) ? (int)$data['limit'] : 20;
            $offset = isset($data['offset']) ? (int)$data['offset'] : 0;
            
            if ($limit > 0) {
                $parameters['limit'] = $limit;
                $parameters['offset'] = $offset;
            }
            
            // Get records
            $records = AsteriskRestUsers::find($parameters);
            
            // Build response data
            $items = [];
            foreach ($records as $record) {
                $items[] = DataStructure::createForList($record);
            }
            
            $res->data = [
                'items' => $items,
                'total' => $totalCount,
                'limit' => $limit,
                'offset' => $offset,
            ];
            
            $res->success = true;
            
        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
}