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
use MikoPBX\PBXCoreREST\Lib\UserPageTracker\UserPageTrackerLib;
use Throwable;

/**
 * Worker for monitoring authentication failures on internal extensions
 *
 * Periodically calls REST API to process SecurityEvent="ChallengeResponseFailed"
 * from Asterisk security log. The API parses log entries for internal accounts
 * and stores failure statistics in Redis for 24 hours.
 *
 * This helps quickly identify misconfigured IP phones or SIP softphones.
 */
class WorkerAuthFailureMonitor extends WorkerRedisBase
{
    // Adaptive monitoring intervals (seconds)
    private const ACTIVE_USER_INTERVAL = 30;     // When users are viewing extension pages
    private const IDLE_INTERVAL = 300;           // When no users active (5 minutes)
    private const ERROR_BACKOFF_INTERVAL = 30;   // After errors

    // Cache keys
    private const HEALTH_KEY = 'Extensions:AuthFailureMonitor:health';

    // Extension pages tracked (same as WorkerExtensionStatusMonitor)
    private const EXTENSION_PAGES = [
        'AdminCabinet/Extensions/index',
        'AdminCabinet/Extensions/modify'
    ];

    private ?UserPageTrackerLib $pageTracker = null;
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
     * @param array<mixed> $argv
     */
    public function start($argv): void
    {
        $this->initialize();

        SystemMessages::sysLogMsg(
            static::class,
            "Auth failure monitor started with PID: " . getmypid(),
            LOG_INFO
        );

        // Main processing loop
        while (!$this->needRestart && !$this->isShuttingDown) {
            pcntl_signal_dispatch(); // Handle system signals
            $this->checkHeartbeat(); // Keep supervisor heartbeat alive

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
        // Initialize unified page tracker
        $this->pageTracker = new UserPageTrackerLib();

        SystemMessages::sysLogMsg(
            static::class,
            "Auth failure monitor initialized",
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
            "Calling SIP processAuthFailures API, poll interval: {$pollInterval}s",
            LOG_DEBUG
        );

        // Call the REST API to process auth failures
        try {
            $result = $this->di->get(
                PBXCoreRESTClientProvider::SERVICE_NAME,
                [
                    '/pbxcore/api/v3/sip:processAuthFailures',
                    PBXCoreRESTClientProvider::HTTP_METHOD_POST,
                    [
                        'fromWorker' => true  // Indicate this is from worker context
                    ]
                ]
            );

            if ($result->success) {
                $this->lastCheckTime = time();
                $this->updateHealthStatus('active');

                $processedCount = $result->data['processed'] ?? 0;
                if ($processedCount > 0) {
                    SystemMessages::sysLogMsg(
                        static::class,
                        "Processed {$processedCount} auth failure extensions",
                        LOG_DEBUG
                    );
                }
            } else {
                SystemMessages::sysLogMsg(
                    static::class,
                    "API call failed: " . json_encode($result->messages),
                    LOG_WARNING
                );
                $this->updateHealthStatus('error', implode(', ', $result->messages['error'] ?? []));
            }

        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Error calling processAuthFailures API: " . $e->getMessage(),
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
        // Active users on extension pages = frequent updates (30 seconds)
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
        // For active monitoring (30s), sleep 2s between checks
        // For idle monitoring (300s), sleep 10s between checks
        return min($interval, $interval <= 30 ? 2 : 10);
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
    }
}

// Start worker process
WorkerAuthFailureMonitor::startWorker($argv ?? []);
