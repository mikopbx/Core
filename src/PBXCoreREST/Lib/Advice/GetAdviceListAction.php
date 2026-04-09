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

namespace MikoPBX\PBXCoreREST\Lib\Advice;

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\Workers\WorkerPrepareAdvice;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\Common\Providers\EventBusProvider;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;
/**
 * Get active calls based on CDR data.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Advice
 */
class GetAdviceListAction extends Injectable
{
    /**
     * Generates a list of notifications about the system, firewall, passwords, and wrong settings.
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;
        $result = [];
        $di = Di::getDefault();
        $managedCache = $di->get(ManagedCacheProvider::SERVICE_NAME);
        foreach (WorkerPrepareAdvice::ARR_ADVICE_TYPES as $adviceType) {
            $cacheKey = WorkerPrepareAdvice::getCacheKey($adviceType['type']);
            $advice = [];
            $cachedData = $managedCache->get($cacheKey);
            if ($cachedData !== null) {
                $advice = $cachedData;
            }
            
            foreach ($advice as $key => $messages) {
                if (!isset($result[$key])) {
                    $result[$key] = [];
                }
                foreach ($messages as $message) {
                    if (is_array($message) && isset($message['messageTpl'])) {
                        // Add structured messages (for UI display)
                        $result[$key] = array_merge($result[$key], [$message]);
                    } elseif (is_string($message)) {
                        // Preserve string markers (e.g., 'WebAdminPassword', 'SSHPassword')
                        // These are used by frontend for navigation logic, not for display
                        $result[$key] = array_merge($result[$key], [$message]);
                    }
                }
            }
        }
        $res->data['advice'] = $result;

        // Always publish to EventBus, even when result is empty.
        // This replaces stale nchan messages (e.g., after password change clears the warning).
        // Without this, nchan retains the last stored message with outdated warnings.
        $di->get(EventBusProvider::SERVICE_NAME)->publish('advice', $res->getResult());

        return $res;
    }

}
