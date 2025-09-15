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
use MikoPBX\PBXCoreREST\Lib\UserPageTrackerLib;
use Throwable;

/**
 * Provider status monitoring scheduler
 * 
 * This worker acts as a scheduler that periodically calls the GetAllStatusesAction
 * REST API to check provider statuses. It uses adaptive intervals based on:
 * - Active users viewing provider pages
 * - Recent status changes
 * - Active problems
 * 
 * All status checking logic has been moved to GetAllStatusesAction for centralization.
 */
class WorkerProviderStatusMonitor extends WorkerRedisBase
{
    // Monitoring intervals (seconds)
    private const ACTIVE_USER_INTERVAL = 5;      // When users are viewing provider pages
    private const PROBLEM_INTERVAL = 10;          // During active problems
    private const RECENT_CHANGES_INTERVAL = 15;  // When recent changes detected
    private const IDLE_INTERVAL = 30;             // When no users active
    private const ERROR_BACKOFF_INTERVAL = 30;   // After errors
    
    // Cache keys
    private const LAST_CHANGE_KEY = 'Workers:WorkerProviderStatusMonitor:lastChange';
    private const HEALTH_KEY = 'Workers:WorkerProviderStatusMonitor:health';
    private const CACHE_KEY = 'Workers:WorkerProviderStatusMonitor:statusCache';
    
    // Provider pages tracked
    private const PROVIDER_PAGES = [
        'AdminCabinet/Providers/index',
        'AdminCabinet/Providers/modifysip',
        'AdminCabinet/Providers/modifyiax'
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
            "Provider status monitor scheduler started with PID: " . getmypid(),
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
            "Provider status monitor scheduler initialized",
            LOG_INFO
        );
    }
    
    /**
     * Execute one monitoring cycle
     */
    private function executeMonitoringCycle(): void
    {
        $pollInterval = $this->getAdaptiveMonitoringInterval();
        
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
            // Make internal REST API call to get provider statuses using v3 API
            $result = $this->di->get(
                PBXCoreRESTClientProvider::SERVICE_NAME,
                [
                    '/pbxcore/api/v3/providers:getStatuses',
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
                
                SystemMessages::sysLogMsg(
                    static::class,
                    "Status check completed successfully",
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
                "Error calling provider status API: " . $e->getMessage(),
                LOG_ERR
            );
            $this->updateHealthStatus('error', $e->getMessage());
        }
    }
    
    /**
     * Get adaptive monitoring interval based on system state
     */
    private function getAdaptiveMonitoringInterval(): int
    {
        // Check for active problems first
        if ($this->hasActiveProblems()) {
            return self::PROBLEM_INTERVAL;
        }
        
        // Active users on provider pages = frequent updates
        if ($this->hasActiveUsersOnProvidersPages()) {
            return self::ACTIVE_USER_INTERVAL;
        }
        
        // Recent status changes = moderate frequency
        if ($this->hasRecentProviderChanges()) {
            return self::RECENT_CHANGES_INTERVAL;
        }
        
        // No activity = infrequent checks
        return self::IDLE_INTERVAL;
    }
    
    /**
     * Check if we have active users on provider pages
     */
    private function hasActiveUsersOnProvidersPages(): bool
    {
        try {
            $hasActiveUsers = $this->pageTracker->hasActiveViewers(self::PROVIDER_PAGES);
            
            SystemMessages::sysLogMsg(
                static::class,
                "Active users on provider pages: " . ($hasActiveUsers ? 'true' : 'false'),
                LOG_DEBUG
            );
            
            return $hasActiveUsers;
        } catch (Throwable $e) {
            // On error, assume active to be safe
            return true;
        }
    }
    
    /**
     * Check if we had recent provider status changes
     */
    private function hasRecentProviderChanges(): bool
    {
        try {
            $lastChange = $this->redis->get(self::LAST_CHANGE_KEY);
            
            if ($lastChange === null) {
                return false;
            }
            
            // Consider recent if changed in last 2 minutes
            return (time() - (int)$lastChange) < 120;
            
        } catch (Throwable $e) {
            return false;
        }
    }
    
    /**
     * Check if there are active problems with any provider
     */
    private function hasActiveProblems(): bool
    {
        try {
            // Check the cached statuses for problem states
            $cachedDataJson = $this->redis->get(self::CACHE_KEY);
            
            if ($cachedDataJson === null) {
                return false;
            }
            
            $cachedData = json_decode($cachedDataJson, true);
            if (!$cachedData || !isset($cachedData['statuses'])) {
                return false;
            }
            
            $problemStates = ['unregistered', 'unreachable', 'lagged', 'rejected'];
            
            foreach ($cachedData['statuses'] as $type => $providers) {
                foreach ($providers as $status) {
                    if (in_array($status['state'] ?? '', $problemStates)) {
                        return true;
                    }
                }
            }
            
            return false;
        } catch (Throwable $e) {
            return false;
        }
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
        // Always sleep at least 1 second to prevent CPU spinning
        return min($this->getAdaptiveMonitoringInterval(), 5);
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
                'adaptive_interval' => $this->getAdaptiveMonitoringInterval(),
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
WorkerProviderStatusMonitor::startWorker($argv ?? []);