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

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Storage;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * Get Storage Usage Action
 *
 * Retrieves detailed storage usage statistics by category.
 * Results are cached in Redis to avoid repeated expensive du commands.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Storage
 */
class GetUsageAction
{
    private const string CACHE_KEY = 'STORAGE:USAGE';

    private const int CACHE_TTL = 300;

    /**
     * Get storage usage statistics with Redis caching
     *
     * @return PBXApiResult
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            $di = Di::getDefault();
            $cache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);

            $cached = $cache->get(self::CACHE_KEY);
            if (!empty($cached)) {
                $res->data = $cached;
                $res->success = true;
                return $res;
            }

            $storage = new Storage();
            $data = $storage->getStorageUsageByCategory();

            $cache->set(self::CACHE_KEY, $data, self::CACHE_TTL);

            $res->data = $data;
            $res->success = true;
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
        }

        return $res;
    }
}