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

namespace MikoPBX\PBXCoreREST\Lib\Sip;

use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Throwable;

/**
 * Clear authentication failure statistics for an extension
 */
class ClearAuthFailureStatsAction
{
    // Cache keys
    private const AUTH_FAILURES_PREFIX = 'Extensions:AuthFailures:';

    /**
     * Clear authentication failure statistics for an extension
     *
     * @param string $extension Extension number
     * @return PBXApiResult
     */
    public static function main(string $extension): PBXApiResult
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

            $redisKey = self::AUTH_FAILURES_PREFIX . $extension;
            $redis->del($redisKey);

            $res->success = true;
            $res->messages['info'][] = 'Auth failure stats cleared for extension ' . $extension;

            SystemMessages::sysLogMsg(
                __CLASS__,
                "Cleared auth failure stats for extension {$extension}",
                LOG_INFO
            );

        } catch (Throwable $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Error clearing auth failure stats: " . $e->getMessage(),
                LOG_WARNING
            );
        }

        return $res;
    }
}
