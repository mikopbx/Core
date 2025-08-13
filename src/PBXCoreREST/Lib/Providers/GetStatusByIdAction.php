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

namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * Get individual provider status by ID
 * 
 * Returns enriched status data with real-time information from Asterisk AMI,
 * including state duration, success/failure metrics, recent events, and current problems.
 * 
 * @api {get} /pbxcore/api/v2/providers/getStatus/:id Get provider status by ID
 * @apiVersion 2.0.0
 * @apiName GetStatus
 * @apiGroup Providers
 * 
 * @apiParam {String} id Provider unique ID
 * @apiParam {Boolean} [refreshFromAmi] Whether to fetch fresh data from Asterisk AMI (default: true)
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Enriched provider status with history and problem info
 *
 * @package MikoPBX\PBXCoreREST\Lib\Providers
 */
class GetStatusByIdAction extends AbstractProviderStatusAction
{
    /**
     * Get provider status by ID
     *
     * @param string $providerId Provider unique ID
     * @param array $data Optional parameters:
     *                    - refreshFromAmi (bool): Fetch fresh data from Asterisk AMI (default: true)
     *                    - forceCheck (bool): Force immediate check via worker (default: false)
     *                    - type (string): Provider type hint (sip/iax) for optimization
     * @return PBXApiResult
     */
    public static function main(string $providerId, array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($providerId)) {
            $res->messages['error'][] = 'Provider ID is required';
            return $res;
        }
        
        // Extract parameters
        $refreshFromAmi = filter_var($data['refreshFromAmi'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $forceCheck = filter_var($data['forceCheck'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $providerType = isset($data['type']) ? strtolower($data['type']) : null;
        
        try {
            $di = Di::getDefault();
            $redis = $di->get(RedisClientProvider::SERVICE_NAME);
            
            // Handle force check request
            if ($forceCheck) {
                // Request immediate check from worker
                $checkRequest = [
                    'action' => 'forceCheck',
                    'providerId' => $providerId,
                    'timestamp' => time()
                ];
                
                // Send request to worker via Redis pub/sub
                $redis->publish('provider-status-check', json_encode($checkRequest));
                
                // Add info message
                $res->messages['info'][] = 'Provider check requested';
                
                // Wait a bit for the worker to process (optional)
                usleep(500000); // 500ms
            }
            
            $statusData = null;
            
            if ($refreshFromAmi) {
                // Fetch fresh data from Asterisk AMI for this specific provider
                $freshStatuses = self::fetchProviderStatuses($providerId);
                
                if ($freshStatuses !== null) {
                    // Find the provider in the fresh data
                    // If type is provided, check it first for better performance
                    $typesToCheck = $providerType ? [$providerType] : ['sip', 'iax'];
                    
                    foreach ($typesToCheck as $type) {
                        if (isset($freshStatuses[$type][$providerId])) {
                            $statusData = $freshStatuses[$type][$providerId];
                            break;
                        }
                    }
                    
                    // If not found with provided type, check all types as fallback
                    if ($statusData === null && $providerType) {
                        foreach (['sip', 'iax'] as $type) {
                            if ($type !== $providerType && isset($freshStatuses[$type][$providerId])) {
                                $statusData = $freshStatuses[$type][$providerId];
                                break;
                            }
                        }
                    }
                }
            }
            
            // Fallback to cached data if fresh fetch failed or not requested
            if ($statusData === null) {
                $statusData = self::getStatusFromCache($providerId, $redis);
            }
            
            // Final fallback to individual Redis key (legacy support)
            if ($statusData === null) {
                $statusKey = self::STATUS_KEY_PREFIX . $providerId;
                $statusJson = $redis->get($statusKey);
                
                if ($statusJson) {
                    $statusData = json_decode($statusJson, true);
                }
            }
            
            if ($statusData === null) {
                // Provider not found or no status available
                $provider = self::findProvider($providerId);
                if (!$provider) {
                    $res->messages['error'][] = 'Provider not found';
                    return $res;
                }
                
                // Return basic info with unknown status
                $statusData = [
                    'uniqid' => $providerId,
                    'type' => $provider['type'],
                    'state' => 'UNKNOWN',
                    'stateText' => 'pr_ProviderStateUnknown',
                    'stateColor' => 'grey',
                    'stateIcon' => 'question',
                    'stateDescription' => 'pr_ProviderStateUnknownDesc',
                    'description' => $provider['description'] ?? '',
                    'host' => $provider['host'] ?? '',
                    'username' => $provider['username'] ?? '',
                    'message' => 'No status data available'
                ];
            }
            
            // Enrich status data with history and problem information
            $statusData = self::enrichStatusWithHistory($statusData, $redis);
            
            // Ensure provider details are available
            if (empty($statusData['description'])) {
                $provider = self::findProvider($providerId);
                if ($provider) {
                    $statusData['description'] = $provider['description'] ?? '';
                    $statusData['host'] = $statusData['host'] ?? $provider['host'] ?? '';
                    $statusData['username'] = $statusData['username'] ?? $provider['username'] ?? '';
                }
            }
            
            $res->data = $statusData;
            $res->success = true;
            
        } catch (\Throwable $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}