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

namespace MikoPBX\PBXCoreREST\Lib\Extensions;

use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Throwable;

/**
 * Get extension status history
 * 
 * @api {get} /pbxcore/api/v2/extensions/getHistory/{extension} Get extension status history
 * @apiVersion 2.0.0
 * @apiName GetHistory
 * @apiGroup Extensions
 * 
 * @apiParam {String} extension Extension number
 * @apiParam {Number} [limit=50] Maximum number of history records to return
 * @apiParam {Number} [offset=0] Number of records to skip
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data History records array
 * @apiSuccess {Number} total Total number of history records
 *
 * @package MikoPBX\PBXCoreREST\Lib\Extensions
 */
class GetHistoryAction extends AbstractExtensionStatusAction
{
    /**
     * Get extension status history
     *
     * @param string $extension Extension number
     * @param array $data Request parameters (limit, offset)
     * @return PBXApiResult
     */
    public static function main(string $extension, array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($extension)) {
            $res->messages['error'][] = 'Extension number is required';
            return $res;
        }
        
        try {
            $di = Di::getDefault();
            $redis = $di->get(RedisClientProvider::SERVICE_NAME);
            
            $limit = isset($data['limit']) ? max(1, min(200, (int)$data['limit'])) : 50;
            $offset = isset($data['offset']) ? max(0, (int)$data['offset']) : 0;
            
            $historyKey = self::HISTORY_KEY_PREFIX . $extension;
            
            // Get total count
            $total = $redis->llen($historyKey);
            
            if ($total === 0) {
                $res->success = true;
                $res->data = [];
                $res->messages['info'][] = 'No history records found for extension ' . $extension;
                return $res;
            }
            
            // Get history records with pagination
            $endIndex = $offset + $limit - 1;
            $records = $redis->lrange($historyKey, $offset, $endIndex);
            
            $history = [];
            foreach ($records as $recordJson) {
                $record = json_decode($recordJson, true);
                if ($record) {
                    $history[] = $record;
                }
            }
            
            $res->success = true;
            $res->data = [
                'extension' => $extension,
                'history' => $history,
                'pagination' => [
                    'total' => $total,
                    'limit' => $limit,
                    'offset' => $offset,
                    'returned' => count($history)
                ]
            ];
            
        } catch (Throwable $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}