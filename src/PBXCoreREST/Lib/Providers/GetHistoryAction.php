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

use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Iax;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * Get provider history events
 * 
 * @api {get} /pbxcore/api/v2/providers/getHistory/:id Get provider history
 * @apiVersion 2.0.0
 * @apiName GetHistory
 * @apiGroup Providers
 * 
 * @apiParam {String} id Provider unique ID
 * @apiParam {Number} [limit=100] Number of events to retrieve (max 1000)
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Provider history with events
 *
 * @package MikoPBX\PBXCoreREST\Lib\Providers
 */
class GetHistoryAction extends Injectable
{
    private const HISTORY_KEY_PREFIX = 'Workers:ProviderMonitor:history:';
    private const MAX_LIMIT = 1000;
    private const DEFAULT_LIMIT = 100;
    
    /**
     * Get provider history
     *
     * @param string $providerId Provider unique ID
     * @param array $params Additional parameters (limit)
     * @return PBXApiResult
     */
    public static function main(string $providerId, array $params = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        if (empty($providerId)) {
            $res->messages['error'][] = 'Provider ID is required';
            return $res;
        }
        
        try {
            $di = Di::getDefault();
            $redis = $di->get(RedisClientProvider::SERVICE_NAME);
            
            // Parse and validate limit
            $limit = isset($params['limit']) ? (int)$params['limit'] : self::DEFAULT_LIMIT;
            $limit = min($limit, self::MAX_LIMIT);
            $limit = max($limit, 1);
            
            // Get history from Redis list
            $historyKey = self::HISTORY_KEY_PREFIX . $providerId;
            $events = $redis->lrange($historyKey, 0, $limit - 1);
            
            if (empty($events)) {
                // Check if provider exists
                $provider = self::getProviderInfo($providerId);
                if (!$provider) {
                    $res->messages['error'][] = 'Provider not found';
                    return $res;
                }
                
                $res->data = [
                    'provider' => $provider,
                    'events' => [],
                    'count' => 0,
                    'limit' => $limit,
                    'message' => 'No history available for this provider'
                ];
                $res->success = true;
                return $res;
            }
            
            // Parse JSON events
            $history = [];
            foreach ($events as $event) {
                $eventData = json_decode($event, true);
                if ($eventData) {
                    // Enhance event data with human-readable formats
                    if (isset($eventData['timestamp'])) {
                        $eventData['datetime'] = date('Y-m-d H:i:s', $eventData['timestamp']);
                        $eventData['timeAgo'] = self::getTimeAgo($eventData['timestamp']);
                    }

                    // Translate event name (replace original value)
                    if (isset($eventData['event'])) {
                        $eventData['event'] = TranslationProvider::translate($eventData['event']);
                    }

                    // Translate details if it's a state change message (replace original value)
                    // Keep state/previousState in English for programmatic use
                    if (isset($eventData['details']) && isset($eventData['state']) && isset($eventData['previousState'])) {
                        $eventData['details'] = TranslationProvider::translate('pr_StateChangedFromTo', [
                            'previousState' => self::translateState($eventData['previousState']),
                            'newState' => self::translateState($eventData['state'])
                        ]);
                    }

                    $history[] = $eventData;
                }
            }
            
            // Get provider info
            $provider = self::getProviderInfo($providerId);
            
            // Calculate statistics from history
            $stats = self::calculateHistoryStats($history);
            
            $res->data = [
                'provider' => $provider,
                'events' => $history,
                'count' => count($history),
                'limit' => $limit,
                'statistics' => $stats,
                'totalAvailable' => $redis->llen($historyKey)
            ];
            $res->success = true;
            
        } catch (\Throwable $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
    /**
     * Get provider information from database
     */
    private static function getProviderInfo(string $providerId): array
    {
        // Try SIP
        $sipProvider = Sip::findFirst([
            'conditions' => 'uniqid = :id:',
            'bind' => ['id' => $providerId]
        ]);
        
        if ($sipProvider) {
            return [
                'uniqid' => $providerId,
                'type' => 'sip',
                'description' => $sipProvider->description,
                'host' => $sipProvider->host,
                'username' => $sipProvider->username,
                'disabled' => $sipProvider->disabled === '1'
            ];
        }
        
        // Try IAX
        $iaxProvider = Iax::findFirst([
            'conditions' => 'uniqid = :id:',
            'bind' => ['id' => $providerId]
        ]);
        
        if ($iaxProvider) {
            return [
                'uniqid' => $providerId,
                'type' => 'iax',
                'description' => $iaxProvider->description,
                'host' => $iaxProvider->host,
                'username' => $iaxProvider->username,
                'disabled' => $iaxProvider->disabled === '1'
            ];
        }
        
        return ['uniqid' => $providerId];
    }
    
    /**
     * Calculate statistics from history events
     */
    private static function calculateHistoryStats(array $history): array
    {
        if (empty($history)) {
            return [];
        }
        
        $stats = [
            'totalEvents' => count($history),
            'stateChanges' => 0,
            'errors' => 0,
            'recoveries' => 0,
            'states' => []
        ];
        
        foreach ($history as $event) {
            // Count state changes
            if (isset($event['type']) && $event['type'] === 'state_change') {
                $stats['stateChanges']++;
                
                // Track state distribution
                if (isset($event['state'])) {
                    $state = $event['state'];
                    if (!isset($stats['states'][$state])) {
                        $stats['states'][$state] = 0;
                    }
                    $stats['states'][$state]++;
                }
                
                // Count errors and recoveries
                if (isset($event['state'])) {
                    if (in_array($event['state'], ['rejected', 'unreachable', 'unregistered', 'UNKNOWN'])) {
                        $stats['errors']++;
                    } elseif (in_array($event['state'], ['registered', 'OK', 'reachable'])) {
                        if (isset($event['previousState']) && 
                            in_array($event['previousState'], ['rejected', 'unreachable', 'unregistered'])) {
                            $stats['recoveries']++;
                        }
                    }
                }
            }
        }
        
        // Calculate time range
        if (count($history) > 0) {
            $firstEvent = $history[count($history) - 1];
            $lastEvent = $history[0];
            
            if (isset($firstEvent['timestamp']) && isset($lastEvent['timestamp'])) {
                $stats['timeRange'] = [
                    'from' => date('Y-m-d H:i:s', $firstEvent['timestamp']),
                    'to' => date('Y-m-d H:i:s', $lastEvent['timestamp']),
                    'duration' => $lastEvent['timestamp'] - $firstEvent['timestamp']
                ];
            }
        }
        
        return $stats;
    }
    
    /**
     * Get human-readable time ago string
     */
    private static function getTimeAgo(int $timestamp): string
    {
        $diff = time() - $timestamp;

        if ($diff < 60) {
            return $diff . ' seconds ago';
        } elseif ($diff < 3600) {
            $minutes = floor($diff / 60);
            return $minutes . ' minute' . ($minutes > 1 ? 's' : '') . ' ago';
        } elseif ($diff < 86400) {
            $hours = floor($diff / 3600);
            return $hours . ' hour' . ($hours > 1 ? 's' : '') . ' ago';
        } else {
            $days = floor($diff / 86400);
            return $days . ' day' . ($days > 1 ? 's' : '') . ' ago';
        }
    }

    /**
     * Translate state identifier to localized text
     *
     * @param string $state State identifier (e.g., "REGISTERED", "UNREGISTERED")
     * @return string Translated state text
     */
    private static function translateState(string $state): string
    {
        // Normalize state to lowercase for mapping
        $normalizedState = strtolower($state);

        // Map states to translation keys (same as in AbstractProviderStatusAction)
        $stateMap = [
            'registered' => 'pr_ProviderStateRegistered',
            'unregistered' => 'pr_ProviderStateUnregistered',
            'unreachable' => 'pr_ProviderStateUnreachable',
            'rejected' => 'pr_ProviderStateRejected',
            'off' => 'pr_ProviderStateOff',
            'lagged' => 'pr_ProviderStateLagged',
            'ok' => 'pr_ProviderStateOk',
            'unknown' => 'pr_ProviderStateUnknown',
            'unmonitored' => 'pr_ProviderStateUnmonitored'
        ];

        $translationKey = $stateMap[$normalizedState] ?? 'pr_ProviderStateUnknown';

        return TranslationProvider::translate($translationKey);
    }
}