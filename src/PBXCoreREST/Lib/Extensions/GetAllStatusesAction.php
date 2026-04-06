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

use MikoPBX\Common\Providers\EventBusProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\UserPageTracker\UserPageTrackerLib;
use Phalcon\Di\Di;
use Throwable;

/**
 * Get all extension statuses and publish to EventBus
 * 
 * This action checks extension statuses directly from Asterisk PJSIP and manages
 * all status enrichment, history tracking, and statistics calculation.
 * The WorkerExtensionStatusMonitor acts as a scheduler that calls this action.
 * 
 * @api {get} /pbxcore/api/v2/extensions/getStatuses Get all extension statuses
 * @apiVersion 2.0.0
 * @apiName GetStatuses
 * @apiGroup Extensions
 * 
 * @apiParam {Boolean} [publishEvents] Whether to publish events to EventBus (default: true)
 * @apiParam {Boolean} [updateCache] Whether to update cache (default: true)
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Object} data Enriched extension statuses by extension number
 *
 * @package MikoPBX\PBXCoreREST\Lib\Extensions
 */
class GetAllStatusesAction extends AbstractExtensionStatusAction
{
    // Extension pages tracked for EventBus publishing
    private const EXTENSION_PAGES = [
        'AdminCabinet/Extensions/index',
        'AdminCabinet/Extensions/modify'
    ];
    
    /**
     * Gets current extension statuses and publishes them to EventBus
     *
     * @param array $data Request data containing optional parameters:
     *                    - forceCheck (bool): Force fetch from Asterisk, ignore cache for reading (default: false)
     *                    - fromWorker (bool): Indicates call is from worker context (default: false)
     *                    - publishEvents (bool): Whether to publish events to EventBus (default: true)
     *                    - updateCache (bool): Whether to update cache (default: true)
     *                    - simplified (bool): Return simplified data for index page (default: false)
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
        $simplified = filter_var($data['simplified'] ?? false, FILTER_VALIDATE_BOOLEAN);
        
        // If called from worker or with forceCheck, always fetch fresh data
        $skipCache = $fromWorker || $forceCheck;
        
        try {
            $di = Di::getDefault();
            $redis = $di->get(RedisClientProvider::SERVICE_NAME);
            
            // Get last known statuses for comparison (always needed for change detection)
            $lastStatuses = self::getLastStatusesFromCache($redis);
            
            // Check if we should use cached data
            if (!$skipCache && !empty($lastStatuses)) {
                // Check if cache is still fresh (less than 30 seconds old)
                $lastCheckKey = self::LAST_CHECK_KEY;
                $lastCheckTime = $redis->get($lastCheckKey);
                
                if ($lastCheckTime && (time() - (int)$lastCheckTime < 30)) {
                    // Return cached data for API requests (not workers)
                    // Apply simplification if requested
                    if ($simplified) {
                        $res->data = self::simplifyStatusData($lastStatuses);
                    } else {
                        $res->data = $lastStatuses;
                    }
                    $res->success = true;
                    $res->messages['info'][] = 'Using cached data (fresh)';
                    return $res;
                }
            }
            
            // Fetch current statuses from Asterisk
            $currentStatuses = self::fetchExtensionStatuses();
            
            if ($currentStatuses === null) {
                // Error fetching statuses - return cached data if available
                if (!empty($lastStatuses)) {
                    // Apply simplification if requested
                    if ($simplified) {
                        $res->data = self::simplifyStatusData($lastStatuses);
                    } else {
                        $res->data = $lastStatuses;
                    }
                    $res->success = true;
                    $res->messages['warning'][] = 'Using cached data due to fetch error';
                } else {
                    $res->messages['error'][] = 'Failed to fetch extension statuses';
                }
                return $res;
            }
            
            // Detect changes
            $changes = self::detectStatusChanges($lastStatuses, $currentStatuses);
            
            // Process changes and update history/statistics
            if (!empty($changes)) {
                self::processStatusChanges($changes, $redis);
            }
            
            // Update daily statistics for all extensions
            self::updateAllExtensionStatistics($currentStatuses, $redis);
            
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
            
            // Return simplified data if requested (for index page)
            if ($simplified) {
                $res->data = self::simplifyStatusData($currentStatuses);
            } else {
                $res->data = $currentStatuses;
            }
            $res->success = true;
            
        } catch (Throwable $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(
                static::class,
                "Error in extension status check: " . $e->getMessage(),
                LOG_ERR
            );
        }
        
        return $res;
    }
    
    /**
     * Detect changes between old and new status data
     */
    private static function detectStatusChanges(array $lastStatuses, array $currentStatuses): array
    {
        $changes = [];

        foreach ($currentStatuses as $extension => $status) {
            $lastStatus = $lastStatuses[$extension] ?? null;

            // Check if overall status changed
            if (!$lastStatus || $lastStatus['status'] !== $status['status']) {
                // Skip recording initial Unknown -> Unavailable transition
                $oldStatus = $lastStatus ? $lastStatus['status'] : 'Unknown';
                if ($oldStatus === 'Unknown' && $status['status'] === 'Unavailable') {
                    // Don't record this transition in history, it's just initialization
                    continue;
                }

                // Extract device info from first available device
                $firstDevice = (!empty($status['devices']) && is_array($status['devices']))
                    ? $status['devices'][0]
                    : null;

                $changes[] = [
                    'extension' => (string)$extension,
                    'callerid' => $status['callerid'] ?? '',
                    'userid' => $status['userid'] ?? '',
                    'old_status' => $oldStatus,
                    'new_status' => $status['status'],
                    'ip_address' => $firstDevice['ip'] ?? '',
                    'user_agent' => $firstDevice['user_agent'] ?? '',
                    'rtt' => $status['rtt'] ?? $firstDevice['rtt'] ?? null,
                    'timestamp' => time(),
                    'details' => self::generateEventDetails($status, $lastStatus),
                    'devices' => $status['devices'] ?? [],
                    'event_type' => 'status_change'
                ];
            } else {
                // Status is the same, but check for device changes
                $deviceChanges = self::detectDeviceChanges(
                    $lastStatus['devices'] ?? [],
                    $status['devices'] ?? [],
                    (string)$extension,
                    $status
                );

                foreach ($deviceChanges as $deviceChange) {
                    $changes[] = $deviceChange;
                }
            }
        }

        // Check for removed extensions
        foreach ($lastStatuses as $extension => $status) {
            if (!isset($currentStatuses[$extension])) {
                $changes[] = [
                    'extension' => (string)$extension,
                    'callerid' => $status['callerid'] ?? '',
                    'userid' => $status['userid'] ?? '',
                    'old_status' => $status['status'],
                    'new_status' => 'REMOVED',
                    'ip_address' => '',
                    'user_agent' => '',
                    'rtt' => null,
                    'timestamp' => time(),
                    'details' => 'Extension removed from configuration',
                    'event_type' => 'extension_removed'
                ];
            }
        }

        return $changes;
    }

    /**
     * Detect changes in devices for an extension
     */
    private static function detectDeviceChanges(array $oldDevices, array $newDevices, string $extension, array $extensionStatus): array
    {
        $changes = [];

        // Create device signatures for comparison (ignore port as it can change)
        // We only care about IP + User Agent combination
        $oldSignatures = [];
        foreach ($oldDevices as $device) {
            // Use IP and User-Agent as unique identifier (port can change on re-registration)
            $signature = $device['ip'] . '|' . ($device['user_agent'] ?? 'unknown');
            $oldSignatures[$signature] = $device;
        }

        $newSignatures = [];
        foreach ($newDevices as $device) {
            // Use IP and User-Agent as unique identifier (port can change on re-registration)
            $signature = $device['ip'] . '|' . ($device['user_agent'] ?? 'unknown');
            $newSignatures[$signature] = $device;
        }

        // Check for new devices
        foreach ($newSignatures as $signature => $device) {
            if (!isset($oldSignatures[$signature])) {
                $changes[] = [
                    'extension' => $extension,
                    'callerid' => $extensionStatus['callerid'] ?? '',
                    'userid' => $extensionStatus['userid'] ?? '',
                    'old_status' => $extensionStatus['status'],
                    'new_status' => $extensionStatus['status'],
                    'ip_address' => $device['ip'] ?? '',
                    'user_agent' => $device['user_agent'] ?? '',
                    'rtt' => $device['rtt'] ?? null,
                    'timestamp' => time(),
                    'details' => sprintf('New device registered from %s:%s (%s, RTT: %sms)',
                        $device['ip'] ?? 'unknown',
                        $device['port'] ?? 'unknown',
                        $device['user_agent'] ?? 'unknown agent',
                        $device['rtt'] ?? 'N/A'
                    ),
                    'devices' => $newDevices,
                    'event_type' => 'device_added'
                ];
            }
        }

        // Check for removed devices
        foreach ($oldSignatures as $signature => $device) {
            if (!isset($newSignatures[$signature])) {
                $changes[] = [
                    'extension' => $extension,
                    'callerid' => $extensionStatus['callerid'] ?? '',
                    'userid' => $extensionStatus['userid'] ?? '',
                    'old_status' => $extensionStatus['status'],
                    'new_status' => $extensionStatus['status'],
                    'ip_address' => $device['ip'] ?? '',
                    'user_agent' => $device['user_agent'] ?? '',
                    'rtt' => null,
                    'timestamp' => time(),
                    'details' => sprintf('Device unregistered from %s:%s (%s)',
                        $device['ip'] ?? 'unknown',
                        $device['port'] ?? 'unknown',
                        $device['user_agent'] ?? 'unknown agent'
                    ),
                    'devices' => $newDevices,
                    'event_type' => 'device_removed'
                ];
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
            self::recordHistoryEvent((string)$change['extension'], $change, $redis);
            self::trackProblemState((string)$change['extension'], $change['new_status'], $change['old_status'], $redis);
        }
        
        // Publish to modules that implement extension status hooks
        self::publishStatusChangesToModules($changes);
        
        SystemMessages::sysLogMsg(
            static::class,
            "Extension status changes detected: " . count($changes) . " changes",
            LOG_INFO
        );
    }
    
    /**
     * Update all extension statistics
     */
    private static function updateAllExtensionStatistics(array $statuses, $redis): void
    {
        foreach ($statuses as $extension => $status) {
            self::updateDailyStatistics((string)$extension, $status, $redis);
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
            // Check if there are active users on extension pages
            $pageTracker = new UserPageTrackerLib();
            $hasActiveUsers = $pageTracker->hasActiveViewers(self::EXTENSION_PAGES);
            
            if (!$hasActiveUsers) {
                return; // No need to publish if no one is watching
            }
            
            $eventBus = $di->get(EventBusProvider::SERVICE_NAME);
            
            // Publish complete status - simplified structure to avoid double nesting
            $eventData = [
                'event' => 'status_complete',
                'statuses' => $statuses,
                'change_count' => count($changes),
                'timestamp' => time()
            ];
            
            $eventBus->publish('extension-status', $eventData);
            
            // Publish changes if any
            if (!empty($changes)) {
                $changeEvent = [
                    'event' => 'status_change',
                    'changes' => $changes,
                    'timestamp' => time()
                ];
                
                $eventBus->publish('extension-status', $changeEvent);
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
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
            
            PBXConfModulesProvider::hookModulesMethod('onExtensionStatusChange', [$changeData]);
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to publish status changes to modules: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
    
    /**
     * Record history event
     */
    private static function recordHistoryEvent(string $extension, array $change, $redis): void
    {
        try {
            $historyKey = self::HISTORY_KEY_PREFIX . $extension;

            // Prepare simplified event structure
            $event = [
                'timestamp' => time(),
                'status' => $change['new_status'],
                'previousStatus' => $change['old_status'],
                'event_type' => $change['event_type'] ?? 'status_change'
            ];

            // Handle different event types
            $eventType = $change['event_type'] ?? 'status_change';

            if ($eventType === 'device_added' || $eventType === 'device_removed') {
                // For device events, always include device info
                $event['ip_address'] = $change['ip_address'] ?? '';
                $event['user_agent'] = $change['user_agent'] ?? '';
                $event['rtt'] = $change['rtt'] ?? null;
                $event['details'] = $change['details'] ?? '';
            } elseif ($change['new_status'] === self::STATUS_AVAILABLE) {
                // When coming online, add current device info
                $event['ip_address'] = $change['ip_address'] ?? '';
                $event['user_agent'] = $change['user_agent'] ?? '';
                $event['rtt'] = $change['rtt'] ?? null;
            } elseif ($change['new_status'] === self::STATUS_UNAVAILABLE && $change['old_status'] === self::STATUS_AVAILABLE) {
                // When going offline from online state, try to get last known device info
                $cacheKey = self::CACHE_KEY_PREFIX . $extension;
                $cachedData = $redis->get($cacheKey);
                if ($cachedData) {
                    $lastStatus = json_decode($cachedData, true);
                    if ($lastStatus && !empty($lastStatus['devices'])) {
                        // Get the first device's info as representative
                        $firstDevice = $lastStatus['devices'][0];
                        $event['ip_address'] = $firstDevice['ip'] ?? '';
                        $event['user_agent'] = $firstDevice['user_agent'] ?? '';
                    }
                }
            }
            
            $eventJson = json_encode($event);
            
            // Use Redis directly for list operations
            $redis->lpush($historyKey, $eventJson);
            $redis->ltrim($historyKey, 0, self::MAX_HISTORY_EVENTS - 1);
            $redis->expire($historyKey, self::HISTORY_TTL_DAYS * 24 * 3600);
        } catch (Throwable $e) {
            // Ignore history errors
        }
    }
    
    /**
     * Get event type based on status change
     */
    private static function getEventType(array $change): string
    {
        if ($change['new_status'] === self::STATUS_AVAILABLE) {
            return 'success';
        } elseif (in_array($change['new_status'], [self::STATUS_UNAVAILABLE, self::STATUS_UNKNOWN])) {
            return 'warning';
        } else {
            return 'info';
        }
    }
    
    /**
     * Get event description based on status change
     */
    private static function getEventDescription(array $change): string
    {
        $descriptions = [
            self::STATUS_AVAILABLE => 'ex_ExtensionStatusAvailable',
            self::STATUS_UNAVAILABLE => 'ex_ExtensionStatusUnavailable', 
            self::STATUS_UNKNOWN => 'ex_ExtensionStatusUnknown',
            self::STATUS_DISABLED => 'ex_ExtensionStatusDisabled'
        ];
        
        return $descriptions[$change['new_status']] ?? 'ex_ExtensionStatusChanged';
    }
    
    /**
     * Generate human-readable details for status change event (supports multiple devices)
     */
    private static function generateEventDetails(array $currentStatus, ?array $previousStatus): string
    {
        $details = '';
        $status = $currentStatus['status'] ?? '';
        $previousStatusStr = $previousStatus ? ($previousStatus['status'] ?? '') : 'Unknown';
        $devices = $currentStatus['devices'] ?? [];
        $deviceCount = count($devices);
        
        switch ($status) {
            case self::STATUS_AVAILABLE:
                if ($deviceCount > 1) {
                    $details = "Extension online with {$deviceCount} devices";
                    // Add best RTT info
                    if ($currentStatus['rtt'] !== null) {
                        $details .= " (RTT: {$currentStatus['rtt']}ms)";
                    }
                } else if ($deviceCount === 1) {
                    $device = $devices[0];
                    $ipInfo = !empty($device['ip']) ? " from {$device['ip']}" : '';
                    $rttInfo = ($device['rtt'] ?? $currentStatus['rtt']) !== null ? " (RTT: " . ($device['rtt'] ?? $currentStatus['rtt']) . "ms)" : '';
                    $details = "Extension came online{$ipInfo}{$rttInfo}";
                } else {
                    $rttInfo = $currentStatus['rtt'] !== null ? " (RTT: {$currentStatus['rtt']}ms)" : '';
                    $details = "Extension came online{$rttInfo}";
                }
                break;
                
            case self::STATUS_UNAVAILABLE:
                if ($previousStatusStr === self::STATUS_AVAILABLE) {
                    $details = "Extension went offline";
                } else {
                    $details = "Extension is not registered or unreachable";
                }
                break;
                
            case self::STATUS_UNKNOWN:
                $details = "Unable to determine extension status";
                if ($deviceCount > 0) {
                    $unknownCount = $currentStatus['unknown_devices'] ?? 0;
                    $details .= " ({$unknownCount} of {$deviceCount} devices have unknown status)";
                }
                break;
                
            case self::STATUS_DISABLED:
                $details = "Extension disabled in configuration";
                break;
                
            default:
                $details = "Status changed from {$previousStatus} to {$status}";
        }
        
        // Add device info if available
        if (!empty($currentStatus['user_agents'])) {
            $userAgents = is_array($currentStatus['user_agents']) ? $currentStatus['user_agents'] : [$currentStatus['user_agents']];
            $uniqueAgents = array_unique($userAgents);
            if (count($uniqueAgents) === 1) {
                $details .= " (Device: {$uniqueAgents[0]})";
            } elseif (count($uniqueAgents) > 1) {
                $details .= " (Devices: " . implode(', ', array_slice($uniqueAgents, 0, 2));
                if (count($uniqueAgents) > 2) {
                    $details .= ', +' . (count($uniqueAgents) - 2) . ' more';
                }
                $details .= ')';
            }
        } elseif (!empty($currentStatus['user_agent'])) {
            $details .= " (Device: {$currentStatus['user_agent']})";
        }
        
        return $details;
    }
    
    /**
     * Track problem state transitions
     */
    private static function trackProblemState(string $extension, string $newStatus, string $oldStatus, $redis): void
    {
        try {
            $problemKey = self::PROBLEM_KEY_PREFIX . $extension;
            $problemStates = [self::STATUS_UNAVAILABLE, self::STATUS_UNKNOWN];
            $okStates = [self::STATUS_AVAILABLE];
            
            if (!in_array($oldStatus, $problemStates) && in_array($newStatus, $problemStates)) {
                // New problem started
                $problemData = [
                    'startTime' => time(),
                    'status' => $newStatus,
                    'lastCheck' => time(),
                    'checkCount' => 1
                ];
                
                $redis->setex($problemKey, 86400, json_encode($problemData));
            } elseif (in_array($oldStatus, $problemStates) && in_array($newStatus, $okStates)) {
                // Problem resolved
                $redis->delete($problemKey);
            }
        } catch (Throwable $e) {
            // Ignore problem tracking errors
        }
    }
    
    /**
     * Update daily statistics
     */
    private static function updateDailyStatistics(string $extension, array $status, $redis): void
    {
        try {
            $date = date('Y-m-d');
            $statsKey = self::DAILY_STATS_KEY_PREFIX . "{$extension}:{$date}";
            
            $statsJson = $redis->get($statsKey);
            $stats = $statsJson ? json_decode($statsJson, true) : self::createEmptyStats($date);
            
            if (!$stats) {
                $stats = self::createEmptyStats($date);
            }
            
            // Increment total checks counter
            $stats['total_checks'] = ($stats['total_checks'] ?? 0) + 1;
            
            // Track success/failure counts
            if ($status['status'] === self::STATUS_AVAILABLE) {
                $stats['success_count'] = ($stats['success_count'] ?? 0) + 1;
                $stats['successfulChecks']++;
            } else {
                $stats['failure_count'] = ($stats['failure_count'] ?? 0) + 1;
            }
            
            $stats['measurements']++;
            
            // Store RTT values for min/max/avg calculations
            if (isset($status['best_rtt']) && $status['best_rtt'] !== null && is_numeric($status['best_rtt'])) {
                // Initialize rtt_values array if not exists
                if (!isset($stats['rtt_values']) || !is_array($stats['rtt_values'])) {
                    $stats['rtt_values'] = [];
                }
                
                // Add current RTT value to the array
                $stats['rtt_values'][] = (float)$status['best_rtt'];
                
                // Keep only last 1000 RTT values to prevent memory issues
                if (count($stats['rtt_values']) > 1000) {
                    $stats['rtt_values'] = array_slice($stats['rtt_values'], -1000);
                }
                
                // Calculate average RTT from best_rtt
                if ($stats['avgRtt'] === 0) {
                    $stats['avgRtt'] = $status['best_rtt'];
                } else {
                    $stats['avgRtt'] = (($stats['avgRtt'] * ($stats['measurements'] - 1)) + $status['best_rtt']) / $stats['measurements'];
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
    
    /**
     * Simplify status data for index page
     * Returns minimal data needed for status indicators
     */
    private static function simplifyStatusData(array $fullStatuses): array
    {
        $simplified = [];
        
        foreach ($fullStatuses as $extension => $data) {
            $simplified[$extension] = [
                'extension' => $extension,
                'status' => $data['status'] ?? self::STATUS_UNKNOWN
            ];
        }
        
        return $simplified;
    }
}