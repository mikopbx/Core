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

namespace MikoPBX\PBXCoreREST\Lib\Storage;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckStorageUsage;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * Get Storage Settings Action
 *
 * Retrieves current storage settings, usage information and device list.
 * Usage data is read from cache (calculated by background worker) to prevent
 * blocking the REST API with expensive `du` commands.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Storage
 */
class GetSettingsAction
{
    /**
     * Get storage settings
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            // Get record save period setting
            $recordSavePeriod = PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_SAVE_PERIOD);

            // Get storage usage from cache (calculated by background worker)
            $cache = Di::getDefault()->getShared(ManagedCacheProvider::SERVICE_NAME);
            $usageData = $cache->get(CheckStorageUsage::CACHE_KEY);

            // If cache is empty, return empty structure with pending flag
            if (empty($usageData)) {
                $usageData = [
                    'pending' => true,
                    'total_size' => 0,
                    'used_space' => 0,
                    'free_space' => 0,
                    'usage_percentage' => 0,
                    'categories' => [
                        'call_recordings' => ['size' => 0, 'percentage' => 0, 'paths' => []],
                        'cdr_database' => ['size' => 0, 'percentage' => 0, 'paths' => []],
                        'system_logs' => ['size' => 0, 'percentage' => 0, 'paths' => []],
                        'modules' => ['size' => 0, 'percentage' => 0, 'paths' => []],
                        'backups' => ['size' => 0, 'percentage' => 0, 'paths' => []],
                        'system_caches' => ['size' => 0, 'percentage' => 0, 'paths' => []],
                        's3_cache' => ['size' => 0, 'percentage' => 0, 'paths' => []],
                        'other' => ['size' => 0, 'percentage' => 0, 'paths' => []],
                    ]
                ];
            }

            // Get device list (fast operation, no caching needed)
            $storage = new Storage();
            $devicesList = $storage->getAllHdd();

            // Prepare response data
            $res->data = [
                'PBXRecordSavePeriod' => $recordSavePeriod,
                'usage' => $usageData,
                'devices' => $devicesList
            ];

            $res->success = true;

        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
        }

        return $res;
    }
}
