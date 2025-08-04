# Provider Status Monitoring System Design

## Overview

This document details the design and implementation of an efficient provider status monitoring system for MikoPBX that follows best practices for background workers, resource management, and user activity-based optimization.

## Current Issues with Proposed Implementation

### 1. **Worker Lifecycle Problems**
- ❌ No proper signal handling (SIGUSR1, SIGTERM, SIGINT)
- ❌ Missing integration with WorkerSafeScriptsCore system
- ❌ No graceful shutdown mechanism
- ❌ Continuous `while(true)` loop without exit conditions

### 2. **Resource Usage Issues**
- ❌ Fixed 10-second polling regardless of user activity
- ❌ Monitors providers even when no users are online
- ❌ Excessive EventBus publishing (even when no changes)
- ❌ No memory management or cleanup procedures

### 3. **Architecture Violations**
- ❌ Doesn't extend proper WorkerBase classes
- ❌ Missing PID file management
- ❌ No health monitoring integration
- ❌ Doesn't follow established Redis patterns

## Improved Architecture Design

### 1. **Redis-based Worker Implementation**

```php
<?php
namespace MikoPBX\Core\Workers;

require_once 'Globals.php';

use MikoPBX\Core\System\{SystemMessages, UnifiedProviderStatusEvents};
use MikoPBX\PBXCoreREST\Lib\Providers\GetStatusAction;
use MikoPBX\Common\Providers\RedisClientProvider;
use Throwable;

/**
 * Adaptive provider status monitoring worker
 * 
 * Features:
 * - Redis-based management like WorkerApiCommands and WorkerPrepareAdvice
 * - Adaptive polling based on user activity
 * - Proper signal handling and graceful shutdown
 * - Memory management and health monitoring inherited from WorkerRedisBase
 * - Integration with MikoPBX worker system
 */
class буд extends WorkerRedisBase
{
    // Monitoring intervals (seconds)
    private const ACTIVE_USER_INTERVAL = 10;    // When users are active
    private const IDLE_INTERVAL = 60;           // When no users active
    private const RECENT_CHANGES_INTERVAL = 10; // When recent changes detected
    private const ERROR_BACKOFF_INTERVAL = 30;  // After errors
    
    // Cache keys
    private const CACHE_KEY = 'provider_status_monitor';
    private const EVENT_CHANNEL = 'provider-status';
    private const HEALTH_KEY = 'worker_health:provider_status_monitor';
    private const LAST_CHANGE_KEY = 'provider_status_last_change';
    
    private UnifiedProviderStatusEvents $statusEvents;
    private float $workerStartTime;
    private int $lastHealthCheck = 0;
    private array $lastStatuses = [];
    
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
                $this->performHealthCheck();
                
                sleep($this->getOptimalSleepInterval());
                
            } catch (\Throwable $e) {
                $this->handleWorkerError($e);
                sleep(self::ERROR_BACKOFF_INTERVAL);
            }
        }
        
        $this->cleanup();
    }
    
    /**
     * Initialize worker state
     */
    private function initialize(): void
    {
        $this->di = Di::getDefault();
        $this->statusEvents = new UnifiedProviderStatusEvents(self::EVENT_CHANNEL);
        $this->workerStartTime = microtime(true);
        $this->lastHealthCheck = time();
        
        // Load last known statuses from cache
        $this->loadLastStatusesFromCache();
        
        // Register shutdown handler
        register_shutdown_function([$this, 'cleanup']);
    }
    
    /**
     * Execute one monitoring cycle
     */
    private function executeMonitoringCycle(): void
    {
        $pollInterval = $this->getAdaptivePollInterval();
        
        // Only check if enough time has passed
        if (!$this->shouldPerformStatusCheck($pollInterval)) {
            return;
        }
        
        $hasSubscribers = $this->hasActiveEventBusSubscribers();
        
        // Notify start only if someone is listening
        if ($hasSubscribers) {
            $this->statusEvents->pushMessageToBrowser(
                UnifiedProviderStatusEvents::PROVIDER_STATUS_STAGE_CHECK,
                [
                    'message' => 'Checking provider statuses...',
                    'interval' => $pollInterval,
                    'timestamp' => time()
                ]
            );
        }
        
        // Get current statuses
        $result = GetStatusAction::main([]);
        
        if ($result->success && isset($result->data)) {
            $this->processStatusResult($result->data, $hasSubscribers);
        } else {
            $this->handleStatusCheckError($result);
        }
        
        // Update last check timestamp
        $this->updateLastCheckTimestamp();
    }
    
    /**
     * Get adaptive polling interval based on system state
     */
    private function getAdaptivePollInterval(): int
    {
        // Check for active users first
        if ($this->hasActiveUserSessions()) {
            return self::ACTIVE_USER_INTERVAL;
        }
        
        // Check for recent provider changes
        if ($this->hasRecentProviderChanges()) {
            return self::RECENT_CHANGES_INTERVAL;
        }
        
        // No activity - use idle interval
        return self::IDLE_INTERVAL;
    }
    
    /**
     * Check if we have active user sessions
     */
    private function hasActiveUserSessions(): bool
    {
        try {
            $redis = $this->di->get('redis');
            
            // Check for active admin sessions
            $sessionKeys = $redis->keys('user_activity:*');
            
            foreach ($sessionKeys as $key) {
                $lastActivity = $redis->get($key);
                if ($lastActivity && (time() - (int)$lastActivity) < 300) { // 5 minutes
                    return true;
                }
            }
            
            return false;
            
        } catch (\Throwable $e) {
            // On Redis error, assume active to be safe
            SystemMessages::sysLogMsg(
                static::class,
                "Error checking user sessions: " . $e->getMessage(),
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
            $redis = $this->di->get('redis');
            $lastChange = $redis->get(self::LAST_CHANGE_KEY);
            
            if ($lastChange === false) {
                return false;
            }
            
            // Consider recent if changed in last 2 minutes
            return (time() - (int)$lastChange) < 120;
            
        } catch (\Throwable $e) {
            return false;
        }
    }
    
    /**
     * Check if we have active EventBus subscribers
     */
    private function hasActiveEventBusSubscribers(): bool
    {
        try {
            $redis = $this->di->get('redis');
            $subscriberKey = 'eventbus_subscribers:' . self::EVENT_CHANNEL;
            $subscribers = $redis->scard($subscriberKey);
            return $subscribers > 0;
            
        } catch (\Throwable $e) {
            // Assume subscribers exist on error
            return true;
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
    private function processStatusResult(array $currentStatuses, bool $hasSubscribers): void
    {
        $changes = $this->detectStatusChanges($this->lastStatuses, $currentStatuses);
        
        if (!empty($changes)) {
            // Record change timestamp for adaptive timing
            $this->recordProviderChange();
            
            if ($hasSubscribers) {
                $this->publishStatusUpdate($changes, $currentStatuses);
            }
            
            SystemMessages::sysLogMsg(
                static::class,
                "Provider status changes detected: " . count($changes) . " changes",
                LOG_INFO
            );
        }
        
        // Always send complete status if someone is actively listening
        if ($hasSubscribers) {
            $this->statusEvents->pushMessageToBrowser(
                UnifiedProviderStatusEvents::PROVIDER_STATUS_STAGE_COMPLETE,
                [
                    'full_status' => $currentStatuses,
                    'changes_count' => count($changes),
                    'timestamp' => time(),
                    'cached' => false
                ]
            );
        }
        
        // Update cache and last known status
        $this->lastStatuses = $currentStatuses;
        $this->updateStatusCache($currentStatuses);
    }
    
    /**
     * Publish status update via EventBus
     */
    private function publishStatusUpdate(array $changes, array $currentStatuses): void
    {
        $this->statusEvents->pushMessageToBrowser(
            UnifiedProviderStatusEvents::PROVIDER_STATUS_STAGE_UPDATE,
            [
                'changes' => $changes,
                'timestamp' => time(),
                'provider_count' => [
                    'sip' => count($currentStatuses['sip'] ?? []),
                    'iax' => count($currentStatuses['iax'] ?? [])
                ]
            ]
        );
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
     * Record provider change timestamp
     */
    private function recordProviderChange(): void
    {
        try {
            $redis = $this->di->get('redis');
            $redis->setex(self::LAST_CHANGE_KEY, 300, time()); // 5 minute TTL
        } catch (\Throwable $e) {
            // Log but continue
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
            $redis = $this->di->get('redis');
            $cacheData = [
                'statuses' => $statuses,
                'last_update' => time(),
                'worker_pid' => getmypid()
            ];
            
            $redis->setex(self::CACHE_KEY, 300, json_encode($cacheData)); // 5 minute TTL
            
        } catch (\Throwable $e) {
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
            $redis = $this->di->get('redis');
            $cachedData = $redis->get(self::CACHE_KEY);
            
            if ($cachedData !== false) {
                $data = json_decode($cachedData, true);
                if (isset($data['statuses'])) {
                    $this->lastStatuses = $data['statuses'];
                    
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Loaded cached provider statuses from previous run",
                        LOG_INFO
                    );
                }
            }
            
        } catch (\Throwable $e) {
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
            $redis = $this->di->get('redis');
            $redis->setex('provider_status_last_check', 120, time()); // 2 minute TTL
        } catch (\Throwable $e) {
            // Silently fail
        }
    }
    
    /**
     * Enhanced health check with provider-specific metrics
     * Note: Basic memory management and health monitoring is inherited from WorkerRedisBase
     */
    private function performHealthCheck(): void
    {
        // Basic health check is performed automatically by WorkerRedisBase::updateWorkerStatus()
        // during status updates. This method adds provider-specific health metrics.
        
        $currentTime = time();
        
        if ($currentTime - $this->lastHealthCheck < parent::HEALTH_UPDATE_INTERVAL) {
            return;
        }
        
        // Add provider-specific health data to the inherited health monitoring
        $providerHealthData = [
            'provider_count' => [
                'sip' => count($this->lastStatuses['sip'] ?? []),
                'iax' => count($this->lastStatuses['iax'] ?? [])
            ],
            'last_provider_check' => $this->getLastProviderCheckTime(),
            'active_subscribers' => $this->hasActiveEventBusSubscribers() ? 1 : 0,
            'adaptive_interval' => $this->getAdaptivePollInterval()
        ];
        
        // Update health status with provider-specific data
        // The inherited updateHealthStatus from WorkerRedisBase will handle Redis operations
        $this->updateHealthStatus($providerHealthData);
        
        $this->lastHealthCheck = $currentTime;
    }
    
    /**
     * Get timestamp of last provider status check
     */
    private function getLastProviderCheckTime(): int
    {
        try {
            $redis = $this->di->get('redis');
            $lastCheck = $redis->get('provider_status_last_check');
            return $lastCheck !== false ? (int)$lastCheck : 0;
        } catch (\Throwable $e) {
            return 0;
        }
    }
    
    // Note: updateHealthStatus() and parseMemoryLimit() methods are inherited from WorkerRedisBase
    // No need to reimplement them here
    
    /**
     * Get optimal sleep interval to prevent excessive CPU usage
     */
    private function getOptimalSleepInterval(): int
    {
        // Always sleep at least 1 second to prevent CPU spinning
        return min($this->getAdaptivePollInterval() / 2, 5);
    }
    
    /**
     * Handle worker errors
     */
    private function handleWorkerError(\Throwable $e): void
    {
        SystemMessages::sysLogMsg(
            static::class,
            "Worker error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine(),
            LOG_ERR
        );
        
        // Publish error to EventBus if someone is listening
        if ($this->hasActiveEventBusSubscribers()) {
            $this->statusEvents->pushMessageToBrowser(
                UnifiedProviderStatusEvents::PROVIDER_STATUS_STAGE_COMPLETE,
                [
                    'error' => true,
                    'message' => $e->getMessage(),
                    'timestamp' => time()
                ]
            );
        }
        
        // Update health status with error
        $this->updateHealthStatus([
            'status' => 'error',
            'error' => $e->getMessage(),
            'timestamp' => time()
        ]);
    }
    
    /**
     * Handle status check error
     */
    private function handleStatusCheckError($result): void
    {
        $errorMsg = "Status check failed";
        if (isset($result->messages['error'])) {
            $errorMsg .= ": " . implode(', ', $result->messages['error']);
        }
        
        SystemMessages::sysLogMsg(static::class, $errorMsg, LOG_ERR);
        
        // Publish error stage
        if ($this->hasActiveEventBusSubscribers()) {
            $this->statusEvents->pushMessageToBrowser(
                UnifiedProviderStatusEvents::PROVIDER_STATUS_STAGE_COMPLETE,
                [
                    'error' => true,
                    'message' => $errorMsg,
                    'timestamp' => time()
                ]
            );
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
        
        // Reinitialize status events
        $this->statusEvents = new UnifiedProviderStatusEvents(self::EVENT_CHANNEL);
    }
    
    /**
     * Cleanup worker resources
     */
    private function cleanup(): void
    {
        SystemMessages::sysLogMsg(
            static::class,
            "Provider status monitor shutting down gracefully",
            LOG_INFO
        );
        
        // Update health status to indicate shutdown
        $this->updateHealthStatus([
            'status' => 'shutdown',
            'timestamp' => time(),
            'uptime' => round(microtime(true) - $this->workerStartTime, 1)
        ]);
        
        // Clean up resources
        $this->statusEvents = null;
        
        // Clear PID cache if exists
        try {
            $redis = $this->di->get('redis');
            $redis->del('worker_pid:' . static::class);
        } catch (\Throwable $e) {
            // Ignore cleanup errors
        }
    }
}

// Start worker process
WorkerProviderStatusMonitor::startWorker($argv ?? []);
```

### 2. **User Activity Tracking System**

```php
<?php
namespace MikoPBX\Common\Providers;

/**
 * User activity tracking for adaptive monitoring
 */
class UserActivityProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'userActivity';
    
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () {
                return new UserActivityTracker();
            }
        );
    }
}

class UserActivityTracker
{
    private const ACTIVITY_TTL = 600; // 10 minutes
    private const ACTIVITY_KEY_PREFIX = 'user_activity:';
    
    /**
     * Update user activity timestamp
     */
    public function updateActivity(string $sessionId, string $page = ''): void
    {
        try {
            $di = Di::getDefault();
            $redis = $di->get('redis');
            
            $activityData = [
                'timestamp' => time(),
                'page' => $page,
                'session_id' => $sessionId
            ];
            
            $redis->setex(
                self::ACTIVITY_KEY_PREFIX . $sessionId,
                self::ACTIVITY_TTL,
                json_encode($activityData)
            );
            
        } catch (\Throwable $e) {
            // Silently fail to avoid breaking UI
        }
    }
    
    /**
     * Check if user is on providers page
     */
    public function isUserOnProvidersPage(string $sessionId): bool
    {
        try {
            $di = Di::getDefault();
            $redis = $di->get('redis');
            
            $data = $redis->get(self::ACTIVITY_KEY_PREFIX . $sessionId);
            if ($data !== false) {
                $activity = json_decode($data, true);
                return strpos($activity['page'] ?? '', 'providers') !== false;
            }
            
        } catch (\Throwable $e) {
            // On error, assume true
        }
        
        return false;
    }
    
    /**
     * Get count of active users on providers page
     */
    public function getActiveProvidersPageUsers(): int
    {
        try {
            $di = Di::getDefault();
            $redis = $di->get('redis');
            
            $count = 0;
            $keys = $redis->keys(self::ACTIVITY_KEY_PREFIX . '*');
            
            foreach ($keys as $key) {
                $data = $redis->get($key);
                if ($data !== false) {
                    $activity = json_decode($data, true);
                    if (strpos($activity['page'] ?? '', 'providers') !== false) {
                        // Check if activity is recent (within 5 minutes)
                        if ((time() - ($activity['timestamp'] ?? 0)) < 300) {
                            $count++;
                        }
                    }
                }
            }
            
            return $count;
            
        } catch (\Throwable $e) {
            return 0;
        }
    }
}
```

### 3. **Controller Integration for Activity Tracking**

```php
// Add to BaseController or specific controllers
protected function updateUserActivity(string $page = ''): void
{
    $userActivity = $this->di->get(UserActivityProvider::SERVICE_NAME);
    $sessionId = $this->session->getId();
    
    if ($sessionId) {
        $currentPage = $page ?: $this->router->getControllerName() . '/' . $this->router->getActionName();
        $userActivity->updateActivity($sessionId, $currentPage);
    }
}

// In ProvidersController
public function indexAction(): void
{
    $this->updateUserActivity('providers/index');
    // ... rest of the method
}

public function modifysipAction(string $uniqid = null): void
{
    $this->updateUserActivity('providers/modifysip');
    // ... rest of the method
}
```

### 4. **EventBus Subscriber Tracking**

```javascript
// Enhanced EventBus client with subscriber tracking
const ProvidersStatusMonitor = {
    channelId: 'provider-status',
    isSubscribed: false,
    
    initialize() {
        if (typeof EventBus !== 'undefined') {
            EventBus.subscribe(this.channelId, (data) => {
                this.handleEventBusMessage(data);
            });
            
            // Register as active subscriber
            this.registerSubscriber();
            this.isSubscribed = true;
            
            // Unregister on page unload
            window.addEventListener('beforeunload', () => {
                this.unregisterSubscriber();
            });
            
            // Handle visibility changes
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    if (!this.isSubscribed) {
                        this.registerSubscriber();
                    }
                } else {
                    this.unregisterSubscriber();
                }
            });
        }
    },
    
    registerSubscriber() {
        fetch('/pbxcore/api/internal/eventbus/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channel: this.channelId,
                action: 'subscribe'
            })
        }).catch(() => {
            // Silently fail
        });
        
        this.isSubscribed = true;
    },
    
    unregisterSubscriber() {
        if (this.isSubscribed) {
            fetch('/pbxcore/api/internal/eventbus/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    channel: this.channelId,
                    action: 'unsubscribe'
                })
            }).catch(() => {
                // Silently fail
            });
            
            this.isSubscribed = false;
        }
    }
};
```

### 5. **Worker Registration with MikoPBX System**

```php
// Add to WorkerSafeScriptsCore::prepareWorkersList()
private function prepareWorkersList(): array
{
    $arrWorkers = [
        self::CHECK_BY_REDIS => [
            WorkerApiCommands::class,
            WorkerPrepareAdvice::class,
            WorkerProviderStatusMonitor::class, // New Redis-based worker
        ],
        // ... other worker types ...
    ];
    
    return $arrWorkers;
}
```

### 6. **Configuration Management**

```php
// Add configuration options for monitoring
// In mikopbx-settings.json or via web interface
{
    "providerStatusMonitoring": {
        "enabled": true,
        "activeUserInterval": 10,
        "idleInterval": 60,
        "maxMemoryPercent": 80,
        "enableUserActivityTracking": true
    }
}
```

## Benefits of Improved Design

### 1. **Resource Efficiency**
- ✅ Adaptive polling based on user activity
- ✅ Reduced monitoring when no users are active
- ✅ EventBus optimization (only publish when subscribers exist)
- ✅ Memory management with automatic restart

### 2. **System Integration**
- ✅ Proper WorkerRedisBase inheritance with Redis-based management
- ✅ Integration with WorkerSafeScriptsCore via CHECK_BY_REDIS monitoring
- ✅ Automatic health status reporting and memory management
- ✅ Redis-based caching, coordination and heartbeat system
- ✅ Signal handling (SIGUSR1/SIGTERM) inherited from base class
- ✅ Follows same patterns as WorkerApiCommands and WorkerPrepareAdvice

### 3. **User Experience**
- ✅ Faster updates when users are actively viewing providers
- ✅ Real-time notifications for important status changes
- ✅ Graceful degradation on connection issues
- ✅ Page visibility-aware monitoring

### 4. **Maintainability**
- ✅ Clear separation of concerns
- ✅ Comprehensive error handling
- ✅ Detailed logging and monitoring
- ✅ Easy configuration and tuning

## Implementation Priority

1. **Phase 1**: Implement basic adaptive worker with proper lifecycle management
2. **Phase 2**: Add user activity tracking system
3. **Phase 3**: Implement EventBus subscriber tracking
4. **Phase 4**: Add health monitoring and optimization features
5. **Phase 5**: Performance tuning and monitoring dashboards

## Testing Strategy

1. **Load Testing**: Multiple users, high provider count scenarios
2. **Resource Testing**: Memory usage over extended periods
3. **Network Testing**: Connection interruptions and recovery
4. **Integration Testing**: Worker lifecycle and signal handling
5. **User Activity Testing**: Activity-based frequency changes

This improved design addresses all the issues identified in the original implementation while providing a robust, efficient, and maintainable provider status monitoring system.