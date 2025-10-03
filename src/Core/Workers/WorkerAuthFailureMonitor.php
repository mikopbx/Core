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
    // Monitoring intervals (seconds)
    private const CHECK_INTERVAL = 10;           // Check logs every 10 seconds
    private const ERROR_BACKOFF_INTERVAL = 30;   // After errors

    // Cache keys
    private const HEALTH_KEY = 'Extensions:AuthFailureMonitor:health';

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

            try {
                $this->executeMonitoringCycle();

                sleep(self::CHECK_INTERVAL);

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
        $this->lastCheckTime = time();

        SystemMessages::sysLogMsg(
            static::class,
            "Calling SIP processAuthFailures API",
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
     * Update worker health status
     */
    private function updateHealthStatus(string $status = 'active', ?string $errorMessage = null): void
    {
        try {
            $healthData = [
                'status' => $status,
                'timestamp' => time(),
                'last_check' => $this->lastCheckTime,
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
