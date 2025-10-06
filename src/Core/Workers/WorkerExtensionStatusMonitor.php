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

namespace MikoPBX\Core\Workers;

require_once 'Globals.php';

use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\PBXCoreREST\Lib\UserPageTracker\UserPageTrackerLib;
use Throwable;

/**
 * Extension status monitoring scheduler with simplified 2-state system
 * 
 * This worker monitors extension device status with:
 * - 10 seconds interval when users are viewing extension pages
 * - 5 minutes (300 seconds) interval when idle
 * - Redis-based device history with 24-hour TTL for session tracking
 * 
 * Device history stores online/offline transitions with proper session management.
 * Each device session tracks when it came online and when it went offline,
 * with automatic cleanup after 24 hours of inactivity.
 */
class WorkerExtensionStatusMonitor extends WorkerRedisBase
{
    // Simplified 2-state monitoring intervals (seconds)
    private const ACTIVE_USER_INTERVAL = 3;     // When users are viewing extension pages
    private const IDLE_INTERVAL = 300;           // When no users active (5 minutes)
    private const ERROR_BACKOFF_INTERVAL = 30;   // After errors
    
    // Cache keys
    private const HEALTH_KEY = 'Extensions:StatusMonitor:health';
    private const DEVICE_HISTORY_PREFIX = 'Extensions:DeviceHistory:';
    
    // TTL settings
    private const DEVICE_HISTORY_TTL = 86400;    // 24 hours for device history
    
    // Extension pages tracked
    private const EXTENSION_PAGES = [
        'AdminCabinet/Extensions/index',
        'AdminCabinet/Extensions/modify'
    ];
    
    private ?UserPageTrackerLib $pageTracker = null;
    protected $redis;
    private int $lastCheckTime = 0;
    
    /**
     * Worker check interval for WorkerSafeScriptsCore
     */
    public static function getCheckInterval(): int
    {
        return 60; // Check worker health every 60 seconds
    }
    
    /**
     * Main worker execution loop
     */
    public function start($argv): void
    {
        $this->initialize();
        
        SystemMessages::sysLogMsg(
            static::class,
            "Extension status monitor scheduler started with PID: " . getmypid(),
            LOG_INFO
        );
        
        // Main processing loop
        while (!$this->needRestart && !$this->isShuttingDown) {
            pcntl_signal_dispatch(); // Handle system signals
            
            try {
                $this->executeMonitoringCycle();
                
                sleep($this->getOptimalSleepInterval());
                
            } catch (Throwable $e) {
                $this->handleWorkerError($e);
                sleep(self::ERROR_BACKOFF_INTERVAL);
            }
        }
    }
    
    /**
     * Initialize worker state
     */
    private function initialize(): void
    {
        // Initialize RedisClientProvider
        $this->redis = $this->di->get(RedisClientProvider::SERVICE_NAME);
        
        // Initialize unified page tracker
        $this->pageTracker = new UserPageTrackerLib();
        
        SystemMessages::sysLogMsg(
            static::class,
            "Extension status monitor scheduler initialized",
            LOG_INFO
        );
    }
    
    /**
     * Execute one monitoring cycle
     */
    private function executeMonitoringCycle(): void
    {
        $pollInterval = $this->getMonitoringInterval();
        
        // Only check if enough time has passed
        if (!$this->shouldPerformStatusCheck($pollInterval)) {
            return;
        }
        
        SystemMessages::sysLogMsg(
            static::class,
            "Calling GetAllStatusesAction, poll interval: {$pollInterval}s",
            LOG_DEBUG
        );
        
        // Call the REST API using PBXCoreRESTClientProvider
        try {
            // Make internal REST API call to get SIP device statuses (v3)
            $result = $this->di->get(
                PBXCoreRESTClientProvider::SERVICE_NAME,
                [
                    '/pbxcore/api/v3/sip:getStatuses',
                    PBXCoreRESTClientProvider::HTTP_METHOD_GET,
                    [
                        'fromWorker' => true,       // Indicate this is from worker context
                        'forceCheck' => true,       // Always fetch fresh data from Asterisk
                        'publishEvents' => true,    // Publish to EventBus based on active users
                        'updateCache' => true       // Always update cache with fresh data
                    ]
                ]
            );
            
            if ($result->success) {
                $this->lastCheckTime = time();
                $this->updateHealthStatus('active');
                
                // Process device history for status transitions
                $this->processDeviceHistory($result->data ?? []);
                
                SystemMessages::sysLogMsg(
                    static::class,
                    "Status check completed successfully, checked " . count($result->data ?? []) . " extensions",
                    LOG_DEBUG
                );
            } else {
                SystemMessages::sysLogMsg(
                    static::class,
                    "Status check failed: " . json_encode($result->messages),
                    LOG_WARNING
                );
                $this->updateHealthStatus('error', implode(', ', $result->messages['error'] ?? []));
            }
            
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Error calling extension status API: " . $e->getMessage(),
                LOG_ERR
            );
            $this->updateHealthStatus('error', $e->getMessage());
        }
    }
    
    /**
     * Get monitoring interval based on simplified 2-state system
     */
    private function getMonitoringInterval(): int
    {
        // Active users on extension pages = frequent updates (10 seconds)
        if ($this->hasActiveUsersOnExtensionPages()) {
            return self::ACTIVE_USER_INTERVAL;
        }
        
        // No users on extension pages = idle monitoring (5 minutes)
        return self::IDLE_INTERVAL;
    }
    
    /**
     * Check if we have active users on extension pages
     */
    private function hasActiveUsersOnExtensionPages(): bool
    {
        try {
            return $this->pageTracker->hasActiveViewers(self::EXTENSION_PAGES);
        } catch (Throwable $e) {
            // On error, assume active to be safe
            return true;
        }
    }
    
    /**
     * Process device history for all extensions, tracking online/offline transitions
     */
    private function processDeviceHistory(array $extensionStatuses): void
    {
        $currentTime = time();
        
        foreach ($extensionStatuses as $extension => $statusData) {
            if (!isset($statusData['devices']) || !is_array($statusData['devices'])) {
                continue;
            }
            
            $this->processExtensionDevices($extension, $statusData['devices'], $currentTime);
        }
        
        SystemMessages::sysLogMsg(
            static::class,
            "Processed device history for " . count($extensionStatuses) . " extensions",
            LOG_DEBUG
        );
    }
    
    /**
     * Process devices for a single extension
     */
    private function processExtensionDevices(string $extension, array $devices, int $currentTime): void
    {
        $historyKey = self::DEVICE_HISTORY_PREFIX . $extension;
        
        try {
            // Get current device history from Redis
            $historyData = $this->redis->get($historyKey);
            $history = $historyData ? json_decode($historyData, true) : [];
            
            // Track current online devices
            $currentOnlineDevices = [];
            
            foreach ($devices as $device) {
                if (!isset($device['id']) || !isset($device['state'])) {
                    continue;
                }
                
                $deviceId = $device['id'];
                $isOnline = strtolower($device['state']) === 'ok';
                $deviceInfo = [
                    'ip' => $device['ip'] ?? '',
                    'port' => $device['port'] ?? '',
                    'user_agent' => $device['user_agent'] ?? '',
                ];
                
                if ($isOnline) {
                    $currentOnlineDevices[] = $deviceId;
                    $this->handleDeviceOnline($history, $deviceId, $deviceInfo, $currentTime);
                } else {
                    $this->handleDeviceOffline($history, $deviceId, $currentTime);
                }
            }
            
            // Handle devices that were online but are no longer reported (went offline)
            $this->handleMissingDevices($history, $currentOnlineDevices, $currentTime);
            
            // Save updated history with TTL
            $this->redis->setex($historyKey, self::DEVICE_HISTORY_TTL, json_encode($history));
            
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Error processing device history for extension {$extension}: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
    
    /**
     * Handle device coming online
     */
    private function handleDeviceOnline(array &$history, string $deviceId, array $deviceInfo, int $currentTime): void
    {
        // Check if device already has an active session
        if (isset($history[$deviceId]) && !isset($history[$deviceId]['session_end'])) {
            // Device is already online, just update the last seen time and device info
            $history[$deviceId]['last_seen'] = $currentTime;
            $history[$deviceId]['device_info'] = array_merge(
                $history[$deviceId]['device_info'] ?? [], 
                $deviceInfo
            );
            return;
        }
        
        // Device came online - start new session
        $history[$deviceId] = [
            'session_start' => $currentTime,
            'last_seen' => $currentTime,
            'device_info' => $deviceInfo,
        ];
        
        SystemMessages::sysLogMsg(
            static::class,
            "Device {$deviceId} came online at " . date('Y-m-d H:i:s', $currentTime),
            LOG_DEBUG
        );
    }
    
    /**
     * Handle device going offline
     */
    private function handleDeviceOffline(array &$history, string $deviceId, int $currentTime): void
    {
        // If device has an active session, close it
        if (isset($history[$deviceId]) && !isset($history[$deviceId]['session_end'])) {
            $history[$deviceId]['session_end'] = $currentTime;
            
            SystemMessages::sysLogMsg(
                static::class,
                "Device {$deviceId} went offline at " . date('Y-m-d H:i:s', $currentTime),
                LOG_DEBUG
            );
        }
    }
    
    /**
     * Handle devices that were online but are no longer reported (cleanup)
     */
    private function handleMissingDevices(array &$history, array $currentOnlineDevices, int $currentTime): void
    {
        foreach ($history as $deviceId => &$session) {
            // Skip already closed sessions
            if (isset($session['session_end'])) {
                continue;
            }
            
            // If device is not in current online list, mark as offline
            if (!in_array($deviceId, $currentOnlineDevices)) {
                $session['session_end'] = $currentTime;
                
                SystemMessages::sysLogMsg(
                    static::class,
                    "Device {$deviceId} marked offline (missing from status) at " . date('Y-m-d H:i:s', $currentTime),
                    LOG_DEBUG
                );
            }
        }
        unset($session); // Clean up reference
    }
    
    /**
     * Determine if we should perform status check based on interval
     */
    private function shouldPerformStatusCheck(int $interval): bool
    {
        $currentTime = time();
        if ($currentTime - $this->lastCheckTime >= $interval) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Get optimal sleep interval to prevent excessive CPU usage
     */
    private function getOptimalSleepInterval(): int
    {
        $interval = $this->getMonitoringInterval();
        // Always sleep at least 2 seconds to prevent CPU spinning
        // For active monitoring (10s), sleep 2s between checks
        // For idle monitoring (300s), sleep 10s between checks
        return min($interval, $interval <= 10 ? 2 : 10);
    }
    
    /**
     * Update worker health status
     */
    private function updateHealthStatus(string $status = 'active', ?string $errorMessage = null): void
    {
        try {
            $healthData = [
                'status' => $status,
                'timestamp' => time(),
                'last_check' => $this->lastCheckTime,
                'monitoring_interval' => $this->getMonitoringInterval(),
                'active_users' => $this->hasActiveUsersOnExtensionPages(),
                'pid' => getmypid()
            ];
            
            if ($status === 'error' && $errorMessage !== null) {
                $healthData['error'] = $errorMessage;
            }
            
            $this->redis->setex(self::HEALTH_KEY, 300, json_encode($healthData));
            
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to update health status: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
    
    /**
     * Handle worker errors
     */
    private function handleWorkerError(Throwable $e): void
    {
        SystemMessages::sysLogMsg(
            static::class,
            "Worker error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine(),
            LOG_ERR
        );
        
        $this->updateHealthStatus('error', $e->getMessage());
    }
    
    /**
     * Handle SIGUSR1 signal (reload)
     */
    protected function handleSignalUsr1(): void
    {
        parent::handleSignalUsr1();
        
        SystemMessages::sysLogMsg(
            static::class,
            "Received SIGUSR1, performing graceful restart",
            LOG_INFO
        );
        
        // Clear state
        $this->lastCheckTime = 0;
    } 
}

// Start worker process
WorkerExtensionStatusMonitor::startWorker($argv ?? []);