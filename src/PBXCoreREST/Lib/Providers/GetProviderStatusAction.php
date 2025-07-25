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

namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Providers\EventBusProvider;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * Get provider status and publish to EventBus
 *
 * @package MikoPBX\PBXCoreREST\Lib\Providers
 */
class GetProviderStatusAction extends Injectable
{
    private const CACHE_KEY = 'Workers:WorkerProviderStatusMonitor:statusCache';
    
    /**
     * Gets current provider statuses and publishes them to EventBus
     *
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            $di = Di::getDefault();
            
            // Try to get cached status first
            $managedCache = $di->get(ManagedCacheProvider::SERVICE_NAME);
            $cachedData = $managedCache->get(self::CACHE_KEY);
            
            if ($cachedData !== null && isset($cachedData['statuses'])) {
                // Use cached data
                $statuses = $cachedData['statuses'];
                $res->data = $statuses;
            } else {
                // Fetch fresh data
                $statuses = self::fetchProviderStatuses($di);
                $res->data = $statuses;
            }
            
            // Publish to EventBus for real-time update
            // No need to check for active subscribers here since this is called by the user
            $eventData = [
                'event' => 'status_complete',
                'data' => [
                    'statuses' => $statuses,
                    'change_count' => 0,
                    'timestamp' => time()
                ]
            ];
            
            $di->get(EventBusProvider::SERVICE_NAME)->publish('provider-status', $eventData);
            
            $res->success = true;
            
        } catch (\Throwable $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
    /**
     * Fetch provider statuses from REST API
     */
    private static function fetchProviderStatuses($di): array
    {
        $statuses = [
            'sip' => [],
            'iax' => []
        ];
        
        // Get SIP provider statuses
        $sipResponse = $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/sip/getRegistry',
            PBXCoreRESTClientProvider::HTTP_METHOD_GET,
            []
        ]);
        
        if ($sipResponse->success && isset($sipResponse->data)) {
            // Transform array to keyed by provider ID
            foreach ($sipResponse->data as $provider) {
                if (isset($provider['id'])) {
                    $statuses['sip'][$provider['id']] = $provider;
                }
            }
        }
        
        // Get IAX provider statuses
        $iaxResponse = $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/iax/getRegistry',
            PBXCoreRESTClientProvider::HTTP_METHOD_GET,
            []
        ]);
        
        if ($iaxResponse->success && isset($iaxResponse->data)) {
            // Transform array to keyed by provider ID
            foreach ($iaxResponse->data as $provider) {
                if (isset($provider['id'])) {
                    $statuses['iax'][$provider['id']] = $provider;
                }
            }
        }
        
        return $statuses;
    }
}