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

use MikoPBX\Common\Providers\EventBusProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\UserPageTracker\UserPageTrackerLib;
use Phalcon\Di\Di;
use Throwable;

/**
 * Get all providers status and publish to EventBus
 * 
 * This action checks provider statuses directly from Asterisk and manages
 * all status enrichment, history tracking, and statistics calculation.
 * The WorkerProviderStatusMonitor now acts as a scheduler that calls this action.
 * 
 * @api {get} /pbxcore/api/v2/providers/getStatuses Get all provider statuses
 * @apiVersion 2.0.0
 * @apiName GetStatuses
 * @apiGroup Providers
 * 
 * @apiParam {Boolean} [publishEvents] Whether to publish events to EventBus (default: true)
 * @apiParam {Boolean} [updateCache] Whether to update cache (default: true)
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Enriched provider statuses by type (sip/iax)
 *
 * @package MikoPBX\PBXCoreREST\Lib\Providers
 */
class GetAllStatusesAction extends AbstractProviderStatusAction
{
    // Provider pages tracked for EventBus publishing
    private const PROVIDER_PAGES = [
        'AdminCabinet/Providers/index',
        'AdminCabinet/Providers/modifysip',
        'AdminCabinet/Providers/modifyiax'
    ];
    
    /**
     * Gets current provider statuses and publishes them to EventBus
     *
     * @param array $data Request data containing optional parameters:
     *                    - forceCheck (bool): Force fetch from Asterisk, ignore cache for reading (default: false)
     *                    - fromWorker (bool): Indicates call is from worker context (default: false)
     *                    - publishEvents (bool): Whether to publish events to EventBus (default: true)
     *                    - updateCache (bool): Whether to update cache (default: true)
     * @return PBXApiResult An object containing the result of the API call.
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        // Extract parameters from request data
        $forceCheck = filter_var($data['forceCheck'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $fromWorker = filter_var($data['fromWorker'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $publishEvents = filter_var($data['publishEvents'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $updateCache = filter_var($data['updateCache'] ?? true, FILTER_VALIDATE_BOOLEAN);
        
        // If called from worker or with forceCheck, always fetch fresh data
        $skipCache = $fromWorker || $forceCheck;
        
        try {
            $di = Di::getDefault();
            $redis = $di->get(RedisClientProvider::SERVICE_NAME);
            
            // Get last known statuses for comparison (always needed for change detection)
            $lastStatuses = self::getLastStatusesFromCache($redis);
            
            // Check if we should use cached data
            if (!$skipCache && !empty($lastStatuses)) {
                // Check if cache is still fresh (less than 10 seconds old)
                $lastCheckKey = self::LAST_CHECK_KEY;
                $lastCheckTime = $redis->get($lastCheckKey);
                
                if ($lastCheckTime && (time() - (int)$lastCheckTime < 10)) {
                    // Return cached data for API requests (not workers)
                    $res->data = $lastStatuses;
                    $res->success = true;
                    $res->messages['info'][] = 'Using cached data (fresh)';
                    return $res;
                }
            }
            
            // Fetch current statuses from Asterisk
            $currentStatuses = self::fetchProviderStatuses();
            
            if ($currentStatuses === null) {
                // Error fetching statuses - return cached data if available
                if (!empty($lastStatuses)) {
                    $res->data = $lastStatuses;
                    $res->success = true;
                    $res->messages['warning'][] = 'Using cached data due to fetch error';
                } else {
                    $res->messages['error'][] = 'Failed to fetch provider statuses';
                }
                return $res;
            }
            
            // Detect changes
            $changes = self::detectStatusChanges($lastStatuses, $currentStatuses);
            
            // Process changes and update history/statistics
            if (!empty($changes)) {
                self::processStatusChanges($changes, $redis);
            }
            
            // Update daily statistics for all providers
            self::updateAllProviderStatistics($currentStatuses, $redis);
            
            // ALWAYS update cache with fresh data (even if forceCheck or fromWorker)
            // This ensures cache is always up-to-date for other consumers
            self::updateStatusCache($currentStatuses, $redis);
            self::updateLastCheckTimestamp($redis);
            
            // Publish events if requested and there are active users
            if ($publishEvents) {
                self::publishToEventBus($currentStatuses, $changes, $di);
            }
            
            // Add debug info if force check was used
            if ($forceCheck) {
                $res->messages['info'][] = 'Force check completed, cache updated';
            }
            if ($fromWorker) {
                $res->messages['debug'][] = 'Called from worker context';
            }
            
            $res->data = $currentStatuses;
            $res->success = true;
            
        } catch (\Throwable $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
    
    /**
     * Detect changes between old and new status data
     */
    private static function detectStatusChanges(array $lastStatuses, array $currentStatuses): array
    {
        $changes = [];
        
        foreach (['sip', 'iax'] as $type) {
            $lastType = $lastStatuses[$type] ?? [];
            $currentType = $currentStatuses[$type] ?? [];
            
            // Convert stdClass to array for iteration
            if ($lastType instanceof \stdClass) {
                $lastType = (array)$lastType;
            }
            if ($currentType instanceof \stdClass) {
                $currentType = (array)$currentType;
            }
            
            foreach ($currentType as $providerId => $status) {
                $lastStatus = $lastType[$providerId] ?? null;
                
                if (!$lastStatus || $lastStatus['state'] !== $status['state']) {
                    $changes[] = [
                        'provider_id' => $providerId,
                        'type' => $type,
                        'old_state' => $lastStatus ? $lastStatus['state'] : 'UNKNOWN',
                        'new_state' => $status['state'],
                        'username' => $status['username'] ?? '',
                        'host' => $status['host'] ?? '',
                        'timestamp' => time(),
                        'details' => self::generateEventDetails($status, $lastStatus)
                    ];
                }
            }
            
            // Check for removed providers
            foreach ($lastType as $providerId => $status) {
                if (!isset($currentType[$providerId])) {
                    $changes[] = [
                        'provider_id' => $providerId,
                        'type' => $type,
                        'old_state' => $status['state'],
                        'new_state' => 'REMOVED',
                        'username' => $status['username'] ?? '',
                        'host' => $status['host'] ?? '',
                        'timestamp' => time(),
                        'details' => 'Provider removed from configuration'
                    ];
                }
            }
        }
        
        return $changes;
    }
    
    /**
     * Process status changes
     */
    private static function processStatusChanges(array $changes, $redis): void
    {
        // Record change timestamp
        $redis->setex(self::LAST_CHANGE_KEY, 300, (string)time());
        
        // Record history events for all changes
        foreach ($changes as $change) {
            self::recordHistoryEvent($change['provider_id'], $change, $redis);
            self::trackProblemState($change['provider_id'], $change['new_state'], $change['old_state'], $redis);
        }
        
        // Publish to modules that implement provider status hooks
        self::publishStatusChangesToModules($changes);
        
        SystemMessages::sysLogMsg(
            __CLASS__,
            "Provider status changes detected: " . count($changes) . " changes",
            LOG_INFO
        );
    }
    
    /**
     * Update all provider statistics
     */
    private static function updateAllProviderStatistics(array $statuses, $redis): void
    {
        foreach ($statuses as $type => $providers) {
            // Convert stdClass to array for iteration
            if ($providers instanceof \stdClass) {
                $providers = (array)$providers;
            }
            
            foreach ($providers as $providerId => $status) {
                self::updateDailyStatistics($providerId, $status, $redis);
            }
        }
    }
    
    /**
     * Update last check timestamp
     */
    private static function updateLastCheckTimestamp($redis): void
    {
        try {
            $redis->setex(self::LAST_CHECK_KEY, 120, (string)time());
        } catch (Throwable $e) {
            // Silently fail
        }
    }
    
    /**
     * Publish to EventBus
     */
    private static function publishToEventBus(array $statuses, array $changes, $di): void
    {
        try {
            // Check if there are active users on provider pages
            $pageTracker = new UserPageTrackerLib();
            $hasActiveUsers = $pageTracker->hasActiveViewers(self::PROVIDER_PAGES);
            
            if (!$hasActiveUsers) {
                return; // No need to publish if no one is watching
            }
            
            $eventBus = $di->get(EventBusProvider::SERVICE_NAME);
            
            // Publish complete status
            $eventData = [
                'event' => 'status_complete',
                'data' => [
                    'statuses' => $statuses,
                    'change_count' => count($changes),
                    'timestamp' => time()
                ]
            ];
            
            $eventBus->publish('provider-status', $eventData);
            
            // Publish changes if any
            if (!empty($changes)) {
                $changeEvent = [
                    'event' => 'status_change',
                    'data' => [
                        'changes' => $changes,
                        'timestamp' => time()
                    ]
                ];
                
                $eventBus->publish('provider-status', $changeEvent);
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Failed to publish to EventBus: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
    
    /**
     * Publish status changes to modules
     */
    private static function publishStatusChangesToModules(array $changes): void
    {
        try {
            $changeData = [
                'changes' => $changes,
                'timestamp' => time(),
                'source' => 'GetAllStatusesAction'
            ];
            
            PBXConfModulesProvider::hookModulesMethod('onProviderStatusChange', [$changeData]);
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Failed to publish status changes to modules: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
    
    /**
     * Record history event
     */
    private static function recordHistoryEvent(string $providerId, array $change, $redis): void
    {
        try {
            $historyKey = self::HISTORY_KEY_PREFIX . $providerId;
            
            $event = [
                'timestamp' => time(),
                'date' => date('Y-m-d H:i:s'),
                'type' => self::getEventType($change),
                'event' => self::getEventDescription($change),
                'details' => $change['details'] ?? '',
                'state' => $change['new_state'],
                'previousState' => $change['old_state']
            ];
            
            $eventJson = json_encode($event);
            
            // Use Redis directly for list operations
            $redis->lpush($historyKey, $eventJson);
            $redis->ltrim($historyKey, 0, self::MAX_HISTORY_EVENTS - 1);
            $redis->expire($historyKey, self::HISTORY_TTL_DAYS * 24 * 3600);
        } catch (Throwable $e) {
            // Ignore
        }
    }
    
    /**
     * Get event type based on state change
     */
    private static function getEventType(array $change): string
    {
        if (in_array($change['new_state'], ['registered', 'OK'])) {
            return 'info';
        } elseif (in_array($change['new_state'], ['unreachable', 'lagged'])) {
            return 'warning';
        } else {
            return 'error';
        }
    }
    
    /**
     * Get event description based on state change
     */
    private static function getEventDescription(array $change): string
    {
        $descriptions = [
            'registered' => 'pr_ProviderStatusRegistered',
            'unregistered' => 'pr_ProviderStatusUnregistered',
            'unreachable' => 'pr_ProviderStatusUnreachable',
            'lagged' => 'pr_ProviderStatusLagged',
            'rejected' => 'pr_ProviderStatusRejected',
            'OFF' => 'pr_ProviderStatusDisabled',
            'OK' => 'pr_ProviderStatusOK'
        ];
        
        return $descriptions[$change['new_state']] ?? 'pr_ProviderStatusChanged';
    }
    
    /**
     * Generate human-readable details for status change event
     */
    private static function generateEventDetails(array $currentStatus, ?array $previousStatus): string
    {
        $details = '';
        $state = $currentStatus['state'] ?? '';
        $previousState = $previousStatus ? ($previousStatus['state'] ?? '') : 'UNKNOWN';
        
        switch ($state) {
            case 'registered':
            case 'OK':
                if (isset($currentStatus['registrationDetails'])) {
                    $details = $currentStatus['registrationDetails'];
                } elseif (isset($currentStatus['rtt']) && $currentStatus['rtt'] !== null) {
                    $details = "RTT: {$currentStatus['rtt']}ms";
                } else {
                    $details = "Successfully connected to {$currentStatus['host']}";
                }
                break;
                
            case 'rejected':
                if (isset($currentStatus['rejectionReason'])) {
                    $details = $currentStatus['rejectionReason'];
                } else {
                    $details = "Registration rejected by {$currentStatus['host']}";
                }
                break;
                
            case 'unreachable':
                if (isset($previousStatus['lastUpdate'])) {
                    $downtime = time() - $previousStatus['lastUpdate'];
                    if ($downtime > 60) {
                        $minutes = round($downtime / 60);
                        $details = "Provider unreachable for {$minutes} minute" . ($minutes > 1 ? 's' : '');
                    } else {
                        $details = "Provider became unreachable";
                    }
                } else {
                    $details = "Unable to reach {$currentStatus['host']}";
                }
                break;
                
            case 'lagged':
                if (isset($currentStatus['rtt']) && $currentStatus['rtt'] !== null) {
                    $details = "High latency detected: RTT {$currentStatus['rtt']}ms";
                } else {
                    $details = "Provider experiencing high latency";
                }
                break;
                
            case 'unregistered':
                $details = "Provider not registered with {$currentStatus['host']}";
                break;
                
            case 'OFF':
                $details = "Provider disabled in configuration";
                break;
                
            case 'UNKNOWN':
                if ($previousState === 'UNKNOWN') {
                    $details = "Initial status check";
                } else {
                    $details = "Unable to determine provider status";
                }
                break;
                
            default:
                $details = "State changed from {$previousState} to {$state}";
        }
        
        return $details;
    }
    
    /**
     * Track problem state transitions
     */
    private static function trackProblemState(string $providerId, string $newState, string $oldState, $redis): void
    {
        try {
            $problemKey = self::PROBLEM_KEY_PREFIX . $providerId;
            $problemStates = ['unregistered', 'unreachable', 'lagged', 'rejected'];
            $okStates = ['registered', 'OK'];
            
            if (!in_array($oldState, $problemStates) && in_array($newState, $problemStates)) {
                // New problem started
                $problemData = [
                    'startTime' => time(),
                    'state' => $newState,
                    'lastCheck' => time(),
                    'checkCount' => 1
                ];
                
                $redis->setex($problemKey, 86400, json_encode($problemData));
            } elseif (in_array($oldState, $problemStates) && in_array($newState, $okStates)) {
                // Problem resolved
                $redis->delete($problemKey);
            }
        } catch (Throwable $e) {
            // Ignore
        }
    }
    
    /**
     * Update daily statistics
     */
    private static function updateDailyStatistics(string $providerId, array $status, $redis): void
    {
        try {
            $date = date('Y-m-d');
            $statsKey = self::DAILY_STATS_KEY_PREFIX . "{$providerId}:{$date}";
            
            $statsJson = $redis->get($statsKey);
            $stats = $statsJson ? json_decode($statsJson, true) : self::createEmptyStats($date);
            
            if (!$stats) {
                $stats = self::createEmptyStats($date);
            }
            
            // Increment total checks counter
            $stats['total_checks'] = ($stats['total_checks'] ?? 0) + 1;
            
            // Track success/failure counts
            if (in_array($status['state'], ['registered', 'OK'])) {
                $stats['success_count'] = ($stats['success_count'] ?? 0) + 1;
            } else if (in_array($status['state'], ['unregistered', 'unreachable', 'lagged', 'rejected', 'UNKNOWN'])) {
                $stats['failure_count'] = ($stats['failure_count'] ?? 0) + 1;
            }
            
            // Legacy fields for backward compatibility
            $stats['measurements']++;
            if (in_array($status['state'], ['registered', 'OK'])) {
                $stats['successfulChecks']++;
            }
            
            // Store RTT values for min/max/avg calculations
            if (isset($status['rtt']) && $status['rtt'] !== null && is_numeric($status['rtt'])) {
                // Initialize rtt_values array if not exists
                if (!isset($stats['rtt_values']) || !is_array($stats['rtt_values'])) {
                    $stats['rtt_values'] = [];
                }
                
                // Add current RTT value to the array
                $stats['rtt_values'][] = (int)$status['rtt'];
                
                // Keep only last 1000 RTT values to prevent memory issues
                if (count($stats['rtt_values']) > 1000) {
                    $stats['rtt_values'] = array_slice($stats['rtt_values'], -1000);
                }
                
                // Calculate average RTT (legacy field)
                if ($stats['avgRtt'] === 0) {
                    $stats['avgRtt'] = $status['rtt'];
                } else {
                    $stats['avgRtt'] = (($stats['avgRtt'] * ($stats['measurements'] - 1)) + $status['rtt']) / $stats['measurements'];
                }
            }
            
            // Calculate availability percentage
            $stats['availability'] = round(($stats['successfulChecks'] / $stats['measurements']) * 100, 2);
            
            // Save updated statistics with TTL
            $redis->setex($statsKey, self::STATS_TTL_DAYS * 24 * 3600, json_encode($stats));
        } catch (Throwable $e) {
            // Ignore statistics errors to prevent disrupting monitoring
        }
    }
    
    /**
     * Create empty statistics structure
     */
    private static function createEmptyStats(string $date): array
    {
        return [
            'date' => $date,
            'availability' => 100.0,
            'downtime' => '0s',
            'incidents' => 0,
            'avgRtt' => 0,
            'measurements' => 0,
            'successfulChecks' => 0,
            'total_checks' => 0,
            'success_count' => 0,
            'failure_count' => 0,
            'rtt_values' => []
        ];
    }
}