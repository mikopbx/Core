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

namespace MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice;

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Storage;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * Class CheckStorageUsage
 *
 * Background worker that calculates detailed storage usage by category.
 * This prevents the REST API from blocking while running expensive `du` commands.
 *
 * The calculated data is cached and used by:
 * - GET /pbxcore/api/v3/storage:usage (GetUsageAction)
 * - GET /pbxcore/api/v3/storage (GetSettingsAction)
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckStorageUsage extends Injectable
{
    /**
     * Cache key for storage usage data.
     * Must match the key used in GetUsageAction and GetSettingsAction.
     */
    public const string CACHE_KEY = 'STORAGE:USAGE';

    /**
     * Process storage usage calculation.
     *
     * This method runs expensive disk analysis commands (du) in the background
     * worker context, preventing REST API request blocking.
     *
     * @return array Empty array (this check doesn't generate advice messages)
     */
    public function process(): array
    {
        $start = microtime(true);

        try {
            $storage = new Storage();
            $usageData = $storage->getStorageUsageByCategory();

            // Store in separate cache key for API access
            // Note: WorkerPrepareAdvice also caches the return value,
            // but we need a separate key for GetUsageAction/GetSettingsAction
            $cache = Di::getDefault()->getShared(ManagedCacheProvider::SERVICE_NAME);
            $cache->set(self::CACHE_KEY, $usageData, 1800);

            $elapsed = round(microtime(true) - $start, 2);
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Storage usage analysis completed in {$elapsed}s",
                LOG_DEBUG
            );

        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Storage usage analysis failed: " . $e->getMessage(),
                LOG_ERR
            );
        }

        // This check doesn't generate advice messages - it only updates cache
        return [];
    }
}
