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
use MikoPBX\Core\System\ProviderStatusEvents;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\PBXCoreREST\Lib\UserPageTrackerLib;
use Throwable;

/**
 * Adaptive provider status monitoring worker
 * 
 * Features:
 * - Redis-based management like WorkerApiCommands
 * - Adaptive polling based on user page tracker data
 * - Proper signal handling and graceful shutdown
 * - Memory management and health monitoring inherited from WorkerRedisBase
 * - Integration with MikoPBX worker system
 */
class WorkerProviderStatusMonitor extends WorkerRedisBase
{
    // Monitoring intervals (seconds)
    private const ACTIVE_USER_INTERVAL = 5;      // When users are viewing provider pages
    private const RECENT_CHANGES_INTERVAL = 15;  // When recent changes detected
    private const IDLE_INTERVAL = 60;            // When no users active
    private const ERROR_BACKOFF_INTERVAL = 30;   // After errors
    
    // Cache keys
    private const CACHE_KEY = 'Workers:WorkerProviderStatusMonitor:statusCache';
    private const LAST_CHANGE_KEY = 'Workers:WorkerProviderStatusMonitor:lastChange';
    private const LAST_CHECK_KEY = 'Workers:WorkerProviderStatusMonitor:lastCheck';
    private const HEALTH_KEY = 'Workers:WorkerProviderStatusMonitor:health';
    private const ERROR_KEY = 'Workers:WorkerProviderStatusMonitor:error';
    
    // Provider pages tracked
    private const PROVIDER_PAGES = [
        'AdminCabinet/Providers/index',
        'AdminCabinet/Providers/modifysip',
        'AdminCabinet/Providers/modifyiax'
    ];
    
    private array $lastStatuses = [];
    private ?ProviderStatusEvents $statusEvents = null;
    private $managedCache;
    private array $knownUsers = [];
    private ?UserPageTrackerLib $pageTracker = null;
    
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
            "Provider status monitor started with PID: " . getmypid(),
            LOG_INFO
        );
        
        // Main processing loop - uses WorkerRedisBase pattern  
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
        // Parent class already sets $workerStartTime
        $this->lastHealthCheck = time();
        
        // Initialize ManagedCacheProvider
        $this->managedCache = $this->di->get(ManagedCacheProvider::SERVICE_NAME);
        
        // Initialize EventBus events
        $this->statusEvents = new ProviderStatusEvents(ProviderStatusEvents::PROVIDER_STATUS_CHANNEL);
        
        // Initialize unified page tracker
        $this->pageTracker = new UserPageTrackerLib();
        
        // Load last known statuses from cache
        $this->loadLastStatusesFromCache();
    }
    
    /**
     * Execute one monitoring cycle
     */
    private function executeMonitoringCycle(): void
    {
        $pollInterval = $this->getAdaptiveMonitoringInterval();
        
        SystemMessages::sysLogMsg(
            static::class,
            "Monitoring cycle started, poll interval: {$pollInterval}s",
            LOG_INFO
        );
        
        // Only check if enough time has passed
        if (!$this->shouldPerformStatusCheck($pollInterval)) {
            return;
        }
        
        $hasActiveUsers = $this->hasActiveUsersOnProvidersPages();
        $newUsersDetected = $this->checkForNewUsers();
        
        SystemMessages::sysLogMsg(
            static::class,
            "Performing status check, hasActiveUsers: " . ($hasActiveUsers ? 'true' : 'false') . ", newUsers: " . ($newUsersDetected ? 'true' : 'false'),
            LOG_INFO
        );
        
        // Get current statuses using REST API
        $currentStatuses = $this->fetchProviderStatuses();
        
        if ($currentStatuses !== null) {
            $this->processStatusResult($currentStatuses, $hasActiveUsers, $newUsersDetected);
        } else {
            $this->handleStatusCheckError(null);
        }
        
        // Update last check timestamp
        $this->updateLastCheckTimestamp();
    }
    
    /**
     * Get adaptive monitoring interval based on system state
     */
    private function getAdaptiveMonitoringInterval(): int
    {
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
     * Check for new users on provider pages
     * 
     * @return bool True if new users detected
     */
    private function checkForNewUsers(): bool
    {
        try {
            $newUsersDetected = false;
            $currentUsers = [];
            
            // Collect all current users using unified page tracker
            foreach (self::PROVIDER_PAGES as $page) {
                $viewers = $this->pageTracker->getPageViewers($page);
                
                foreach ($viewers as $userId) {
                    $currentUsers[$userId] = true;
                    
                    // Check if this is a new user
                    if (!isset($this->knownUsers[$userId])) {
                        $newUsersDetected = true;
                        SystemMessages::sysLogMsg(
                            static::class,
                            "New user detected on provider page: {$userId}",
                            LOG_INFO
                        );
                    }
                }
            }
            
            // Update known users
            $this->knownUsers = $currentUsers;
            
            return $newUsersDetected;
            
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Error checking for new users: " . $e->getMessage(),
                LOG_WARNING
            );
            return false;
        }
    }
    
    /**
     * Check if we have active users on provider pages using page tracker
     */
    private function hasActiveUsersOnProvidersPages(): bool
    {
        try {
            // Use unified page tracker mechanism
            $hasActiveUsers = $this->pageTracker->hasActiveViewers(self::PROVIDER_PAGES);
            
            SystemMessages::sysLogMsg(
                static::class,
                "Checking provider pages for active viewers: " . ($hasActiveUsers ? 'true' : 'false'),
                LOG_INFO
            );
            
            return $hasActiveUsers;
        } catch (Throwable $e) {
            // On Redis error, assume active to be safe
            SystemMessages::sysLogMsg(
                static::class,
                "Error checking page tracker: " . $e->getMessage(),
                LOG_WARNING
            );
            return true;
        }
    }
    
    /**
     * Check if we had recent provider status changes
     */
    private function hasRecentProviderChanges(): bool
    {
        try {
            $lastChange = $this->managedCache->get(self::LAST_CHANGE_KEY);
            
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
     * Determine if we should perform status check based on interval
     */
    private function shouldPerformStatusCheck(int $interval): bool
    {
        static $lastCheckTime = 0;
        
        $currentTime = time();
        if ($currentTime - $lastCheckTime >= $interval) {
            $lastCheckTime = $currentTime;
            return true;
        }
        
        return false;
    }
    
    /**
     * Process status check result
     */
    private function processStatusResult(array $currentStatuses, bool $hasActiveUsers, bool $newUsersDetected = false): void
    {
        $changes = $this->detectStatusChanges($this->lastStatuses, $currentStatuses);
        
        if (!empty($changes)) {
            // Record change timestamp for adaptive timing
            $this->recordProviderChange();
            
            // Publish to modules that implement provider status hooks
            $this->publishStatusChanges($changes);
            
            // Publish to EventBus if active users
            if ($this->statusEvents) {
                $summary = [
                    'sip_count' => count($currentStatuses['sip'] ?? []),
                    'iax_count' => count($currentStatuses['iax'] ?? [])
                ];
                
                SystemMessages::sysLogMsg(
                    static::class,
                    "Publishing status update to EventBus: " . json_encode(['changes' => count($changes), 'summary' => $summary]),
                    LOG_INFO
                );
                
                $this->statusEvents->pushStatusUpdate($changes, $summary);
            }
            
            SystemMessages::sysLogMsg(
                static::class,
                "Provider status changes detected: " . count($changes) . " changes",
                LOG_INFO
            );
        }
        
        // Always send complete status to EventBus if active users or new users detected
        if ($this->statusEvents && ($hasActiveUsers || $newUsersDetected)) {
            SystemMessages::sysLogMsg(
                static::class,
                "Publishing complete status to EventBus, hasActiveUsers: " . ($hasActiveUsers ? 'true' : 'false') . ", newUsers: " . ($newUsersDetected ? 'true' : 'false'),
                LOG_INFO
            );
            
            $this->statusEvents->pushStatusComplete($currentStatuses, count($changes));
        }
        
        // Update cache and last known status
        $this->lastStatuses = $currentStatuses;
        $this->updateStatusCache($currentStatuses);
        
        // Update worker health with provider-specific data
        $this->updateProviderHealthData();
    }
    
    /**
     * Detect changes between old and new status data
     */
    private function detectStatusChanges(array $lastStatuses, array $currentStatuses): array
    {
        $changes = [];
        
        foreach (['sip', 'iax'] as $type) {
            $lastType = $lastStatuses[$type] ?? [];
            $currentType = $currentStatuses[$type] ?? [];
            
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
                        'timestamp' => time()
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
                        'timestamp' => time()
                    ];
                }
            }
        }
        
        return $changes;
    }
    
    /**
     * Publish status changes to modules
     */
    private function publishStatusChanges(array $changes): void
    {
        try {
            // Publish to modules that implement provider status hooks
            $changeData = [
                'changes' => $changes,
                'timestamp' => time(),
                'source' => 'WorkerProviderStatusMonitor'
            ];
            
            // Call module hooks for provider status changes using static method
            PBXConfModulesProvider::hookModulesMethod('onProviderStatusChange', [$changeData]);
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to publish status changes to modules: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
    
    /**
     * Record provider change timestamp
     */
    private function recordProviderChange(): void
    {
        try {
            $this->managedCache->set(self::LAST_CHANGE_KEY, time(), 300); // 5 minute TTL
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to record provider change: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
    
    /**
     * Update status cache
     */
    private function updateStatusCache(array $statuses): void
    {
        try {
            $cacheData = [
                'statuses' => $statuses,
                'last_update' => time(),
                'worker_pid' => getmypid()
            ];
            
            $this->managedCache->set(self::CACHE_KEY, $cacheData, 300); // 5 minute TTL
            
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to update status cache: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
    
    /**
     * Load last statuses from cache
     */
    private function loadLastStatusesFromCache(): void
    {
        try {
            $cachedData = $this->managedCache->get(self::CACHE_KEY);
            
            if ($cachedData !== null && isset($cachedData['statuses'])) {
                $this->lastStatuses = $cachedData['statuses'];
                
                SystemMessages::sysLogMsg(
                    static::class,
                    "Loaded cached provider statuses from previous run",
                    LOG_INFO
                );
            }
            
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to load cached statuses: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
    
    /**
     * Update last check timestamp
     */
    private function updateLastCheckTimestamp(): void
    {
        try {
            $this->managedCache->set(self::LAST_CHECK_KEY, time(), 120); // 2 minute TTL
        } catch (Throwable $e) {
            // Silently fail
        }
    }
    
    
    /**
     * Update provider health data
     */
    private function updateProviderHealthData(): void
    {
        try {
            // Build and store provider health data
            $healthData = $this->buildHealthData('active');
            
            // Store provider health data using ManagedCache
            $this->managedCache->set(
                self::HEALTH_KEY,
                $healthData,
                300
            );
            
        } catch (Throwable $e) {
            // Log but don't fail the worker
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to update provider health data: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }
    
    /**
     * Get timestamp of last provider status check
     */
    private function getLastProviderCheckTime(): int
    {
        try {
            $lastCheck = $this->managedCache->get(self::LAST_CHECK_KEY);
            return $lastCheck !== null ? (int)$lastCheck : 0;
        } catch (Throwable $e) {
            return 0;
        }
    }
    
    /**
     * Get optimal sleep interval to prevent excessive CPU usage
     */
    private function getOptimalSleepInterval(): int
    {
        // Always sleep at least 1 second to prevent CPU spinning
        return (int)min($this->getAdaptiveMonitoringInterval() / 2, 5);
    }
    
    /**
     * Build health data structure for monitoring
     * 
     * @param string $status Current status (active, error, shutdown)
     * @param string|null $errorMessage Error message if status is error
     * @return array Health data structure
     */
    private function buildHealthData(string $status = 'active', ?string $errorMessage = null): array
    {
        $data = [
            'status' => $status,
            'timestamp' => time(),
            'provider_count' => [
                'sip' => count($this->lastStatuses['sip'] ?? []),
                'iax' => count($this->lastStatuses['iax'] ?? [])
            ],
            'last_provider_check' => $this->getLastProviderCheckTime(),
            'active_users' => $this->hasActiveUsersOnProvidersPages() ? 1 : 0,
            'adaptive_interval' => $this->getAdaptiveMonitoringInterval()
        ];
        
        if ($status === 'error' && $errorMessage !== null) {
            $data['error'] = $errorMessage;
        }
        
        if ($status === 'shutdown') {
            $data['uptime'] = round(microtime(true) - $this->workerStartTime, 1);
        }
        
        return $data;
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
        
        // Store error information for monitoring
        try {
            $errorData = $this->buildHealthData('error', $e->getMessage());
            
            $this->managedCache->set(
                self::ERROR_KEY,
                $errorData,
                300
            );
        } catch (Throwable $redisError) {
            // Ignore cache errors during error handling
        }
    }
    
    /**
     * Fetch provider statuses from REST API
     */
    private function fetchProviderStatuses(): ?array
    {
        try {
            $statuses = [
                'sip' => [],
                'iax' => []
            ];
            
            // Get SIP provider statuses
            $sipStatuses = $this->getSipProviderStatuses();
            if ($sipStatuses !== null) {
                $statuses['sip'] = $sipStatuses;
            }
            
            // Get IAX provider statuses  
            $iaxStatuses = $this->getIaxProviderStatuses();
            if ($iaxStatuses !== null) {
                $statuses['iax'] = $iaxStatuses;
            }
            
            return $statuses;
            
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Failed to fetch provider statuses: " . $e->getMessage(),
                LOG_ERR
            );
            return null;
        }
    }
    
    /**
     * Handle status check error
     */
    private function handleStatusCheckError($result): void
    {
        $errorMsg = "Status check failed";
        if ($result && isset($result->messages['error'])) {
            $errorMsg .= ": " . implode(', ', $result->messages['error']);
        }
        
        SystemMessages::sysLogMsg(static::class, $errorMsg, LOG_ERR);
        
        // Publish error to EventBus if active subscribers
        if ($this->statusEvents) {
            $this->statusEvents->pushError($errorMsg);
        }
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
        
        // Clear cached data
        $this->lastStatuses = [];
    }
    
    /**
     * Get SIP provider statuses from REST API
     */
    private function getSipProviderStatuses(): ?array
    {
        try {
            // Get SIP registry status via REST API
            $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
                '/pbxcore/api/sip/getRegistry',
                PBXCoreRESTClientProvider::HTTP_METHOD_GET,
                []
            ]);
            
            if (!$restAnswer || !$restAnswer->success) {
                SystemMessages::sysLogMsg(
                    static::class,
                    "Failed to get SIP registry status from REST API",
                    LOG_ERR
                );
                return null;
            }
            
            $statuses = [];
            $registryData = $restAnswer->data ?? [];
            
            // Get all SIP providers from database to map registry data
            $sipProviders = \MikoPBX\Common\Models\Sip::find();
            
            foreach ($sipProviders as $provider) {
                if (empty($provider->uniqid)) {
                    continue;
                }
                
                // Find matching registry entry
                $registryEntry = null;
                foreach ($registryData as $entry) {
                    if (($entry['username'] === $provider->username && $entry['host'] === $provider->host) ||
                        ($entry['username'] === $provider->username)) {
                        $registryEntry = $entry;
                        break;
                    }
                }
                
                if ($registryEntry) {
                    $statuses[$provider->uniqid] = [
                        'state' => $registryEntry['state'] ?? 'UNKNOWN',
                        'username' => $provider->username,
                        'host' => $provider->host
                    ];
                } else {
                    $statuses[$provider->uniqid] = [
                        'state' => 'UNMONITORED',
                        'username' => $provider->username ?? '',
                        'host' => $provider->host ?? ''
                    ];
                }
            }
            
            return $statuses;
            
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Error getting SIP provider statuses: " . $e->getMessage(),
                LOG_ERR
            );
            return null;
        }
    }
    
    /**
     * Get IAX provider statuses from REST API
     */
    private function getIaxProviderStatuses(): ?array
    {
        try {
            // Get IAX registry status via REST API
            $restAnswer = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
                '/pbxcore/api/iax/getRegistry',
                PBXCoreRESTClientProvider::HTTP_METHOD_GET,
                []
            ]);
            
            if (!$restAnswer || !$restAnswer->success) {
                SystemMessages::sysLogMsg(
                    static::class,
                    "Failed to get IAX registry status from REST API",
                    LOG_ERR
                );
                return null;
            }
            
            $statuses = [];
            $registryData = $restAnswer->data ?? [];
            
            // Get all IAX providers from database to map registry data
            $iaxProviders = \MikoPBX\Common\Models\Iax::find();
            
            foreach ($iaxProviders as $provider) {
                if (empty($provider->uniqid)) {
                    continue;
                }
                
                // Find matching registry entry
                $registryEntry = null;
                foreach ($registryData as $entry) {
                    if (($entry['username'] === $provider->username && $entry['host'] === $provider->host) ||
                        ($entry['username'] === $provider->username)) {
                        $registryEntry = $entry;
                        break;
                    }
                }
                
                if ($registryEntry) {
                    $statuses[$provider->uniqid] = [
                        'state' => $registryEntry['state'] ?? 'UNKNOWN',
                        'username' => $provider->username,
                        'host' => $provider->host
                    ];
                } else {
                    $statuses[$provider->uniqid] = [
                        'state' => 'UNMONITORED',
                        'username' => $provider->username ?? '',
                        'host' => $provider->host ?? ''
                    ];
                }
            }
            
            return $statuses;
            
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Error getting IAX provider statuses: " . $e->getMessage(),
                LOG_ERR
            );
            return null;
        }
    }
}

// Start worker process
WorkerProviderStatusMonitor::startWorker($argv ?? []);