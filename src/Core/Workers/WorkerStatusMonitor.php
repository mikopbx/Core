<?php

declare(strict_types=1);

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

use MikoPBX\Core\System\Configs\GeoIP2Conf;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\PBXCoreREST\Lib\UserPageTracker\UserPageTrackerLib;
use Throwable;

/**
 * Unified status monitoring worker — replaces three separate workers:
 *   WorkerAuthFailureMonitor, WorkerProviderStatusMonitor, WorkerExtensionStatusMonitor
 *
 * Each task has independent timers and error handling.
 * Saves ~90MB RAM by running in a single process instead of three.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerStatusMonitor extends WorkerRedisBase
{
    // ─── Auth failure monitoring ─────────────────────────────────────────
    private const int AUTH_ACTIVE_INTERVAL = 30;
    private const int AUTH_IDLE_INTERVAL = 300;
    private const string AUTH_HEALTH_KEY = 'Extensions:AuthFailureMonitor:health';

    // ─── Provider status monitoring ──────────────────────────────────────
    private const int PROVIDER_ACTIVE_INTERVAL = 5;
    private const int PROVIDER_PROBLEM_INTERVAL = 10;
    private const int PROVIDER_RECENT_INTERVAL = 15;
    private const int PROVIDER_IDLE_INTERVAL = 30;
    private const string PROVIDER_HEALTH_KEY = 'Workers:WorkerProviderStatusMonitor:health';
    private const string PROVIDER_LAST_CHANGE_KEY = 'Workers:WorkerProviderStatusMonitor:lastChange';
    private const string PROVIDER_CACHE_KEY = 'Workers:WorkerProviderStatusMonitor:statusCache';

    // ─── Extension status monitoring ─────────────────────────────────────
    private const int EXT_ACTIVE_INTERVAL = 3;
    private const int EXT_IDLE_INTERVAL = 300;
    private const string EXT_HEALTH_KEY = 'Extensions:StatusMonitor:health';
    private const string EXT_DEVICE_HISTORY_PREFIX = 'Extensions:DeviceHistory:';
    private const int EXT_DEVICE_HISTORY_TTL = 86400;

    // ─── Common ──────────────────────────────────────────────────────────
    private const int ERROR_BACKOFF_INTERVAL = 30;

    private const array EXTENSION_PAGES = [
        'AdminCabinet/Extensions/index',
        'AdminCabinet/Extensions/modify',
    ];

    private const array PROVIDER_PAGES = [
        'AdminCabinet/Providers/index',
        'AdminCabinet/Providers/modifysip',
        'AdminCabinet/Providers/modifyiax',
    ];

    private ?UserPageTrackerLib $pageTracker = null;

    // Independent timers for each task
    private int $authLastCheckTime = 0;
    private int $providerLastCheckTime = 0;
    private int $extensionLastCheckTime = 0;

    /**
     * Worker check interval for WorkerSafeScriptsCore
     */
    public static function getCheckInterval(): int
    {
        return 60;
    }

    /**
     * Main worker loop — multiplexes three monitoring tasks
     */
    public function start(array $argv): void
    {
        $this->redis = $this->di->get(RedisClientProvider::SERVICE_NAME);
        $this->pageTracker = new UserPageTrackerLib();

        SystemMessages::sysLogMsg(
            static::class,
            'Unified status monitor started with PID: ' . getmypid(),
            LOG_INFO
        );

        while (!$this->needRestart && !$this->isShuttingDown) {
            pcntl_signal_dispatch();
            $this->checkHeartbeat();

            // Each task is independent — one failure does not block others
            $this->runTask('authFailures');
            $this->runTask('providerStatuses');
            $this->runTask('extensionStatuses');

            sleep(2);
        }
    }

    /**
     * Execute a single task with independent error handling
     */
    private function runTask(string $task): void
    {
        try {
            match ($task) {
                'authFailures' => $this->checkAuthFailures(),
                'providerStatuses' => $this->checkProviderStatuses(),
                'extensionStatuses' => $this->checkExtensionStatuses(),
            };
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Task {$task} error: {$e->getMessage()}",
                LOG_ERR
            );
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    //  TASK 1: Auth failure monitoring
    // ═════════════════════════════════════════════════════════════════════

    private function checkAuthFailures(): void
    {
        $interval = $this->hasActiveViewers(self::EXTENSION_PAGES)
            ? self::AUTH_ACTIVE_INTERVAL
            : self::AUTH_IDLE_INTERVAL;

        if ((time() - $this->authLastCheckTime) < $interval) {
            return;
        }

        $result = $this->di->get(
            PBXCoreRESTClientProvider::SERVICE_NAME,
            [
                '/pbxcore/api/v3/sip:processAuthFailures',
                PBXCoreRESTClientProvider::HTTP_METHOD_POST,
                ['fromWorker' => true],
            ]
        );

        $this->authLastCheckTime = time();
        $this->writeHealth(self::AUTH_HEALTH_KEY, $result->success, $interval, $result);
    }

    // ═════════════════════════════════════════════════════════════════════
    //  TASK 2: Provider status monitoring
    // ═════════════════════════════════════════════════════════════════════

    private function checkProviderStatuses(): void
    {
        $interval = $this->getProviderInterval();

        if ((time() - $this->providerLastCheckTime) < $interval) {
            return;
        }

        $result = $this->di->get(
            PBXCoreRESTClientProvider::SERVICE_NAME,
            [
                '/pbxcore/api/v3/providers:getStatuses',
                PBXCoreRESTClientProvider::HTTP_METHOD_GET,
                [
                    'fromWorker' => true,
                    'forceCheck' => true,
                    'publishEvents' => true,
                    'updateCache' => true,
                ],
            ]
        );

        $this->providerLastCheckTime = time();
        $this->writeHealth(self::PROVIDER_HEALTH_KEY, $result->success, $interval, $result);
    }

    /**
     * 4-state adaptive interval for provider monitoring
     */
    private function getProviderInterval(): int
    {
        if ($this->hasProviderProblems()) {
            return self::PROVIDER_PROBLEM_INTERVAL;
        }
        if ($this->hasActiveViewers(self::PROVIDER_PAGES)) {
            return self::PROVIDER_ACTIVE_INTERVAL;
        }
        if ($this->hasRecentProviderChanges()) {
            return self::PROVIDER_RECENT_INTERVAL;
        }
        return self::PROVIDER_IDLE_INTERVAL;
    }

    private function hasProviderProblems(): bool
    {
        try {
            $cached = $this->redis->get(self::PROVIDER_CACHE_KEY);
            if ($cached === null || $cached === false) {
                return false;
            }
            $data = json_decode($cached, true);
            if (!$data || !isset($data['statuses'])) {
                return false;
            }
            $problemStates = ['unregistered', 'unreachable', 'lagged', 'rejected'];
            foreach ($data['statuses'] as $providers) {
                foreach ($providers as $status) {
                    if (in_array($status['state'] ?? '', $problemStates)) {
                        return true;
                    }
                }
            }
        } catch (Throwable) {
        }
        return false;
    }

    private function hasRecentProviderChanges(): bool
    {
        try {
            $lastChange = $this->redis->get(self::PROVIDER_LAST_CHANGE_KEY);
            return $lastChange !== null && $lastChange !== false && (time() - (int)$lastChange) < 120;
        } catch (Throwable) {
            return false;
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    //  TASK 3: Extension status monitoring + device history
    // ═════════════════════════════════════════════════════════════════════

    private function checkExtensionStatuses(): void
    {
        $interval = $this->hasActiveViewers(self::EXTENSION_PAGES)
            ? self::EXT_ACTIVE_INTERVAL
            : self::EXT_IDLE_INTERVAL;

        if ((time() - $this->extensionLastCheckTime) < $interval) {
            return;
        }

        $result = $this->di->get(
            PBXCoreRESTClientProvider::SERVICE_NAME,
            [
                '/pbxcore/api/v3/sip:getStatuses',
                PBXCoreRESTClientProvider::HTTP_METHOD_GET,
                [
                    'fromWorker' => true,
                    'forceCheck' => true,
                    'publishEvents' => true,
                    'updateCache' => true,
                ],
            ]
        );

        $this->extensionLastCheckTime = time();

        if ($result->success) {
            $this->processDeviceHistory($result->data ?? []);
        }

        $this->writeHealth(self::EXT_HEALTH_KEY, $result->success, $interval, $result);
    }

    /**
     * Track device online/offline transitions for all extensions
     */
    private function processDeviceHistory(array $extensionStatuses): void
    {
        $currentTime = time();
        foreach ($extensionStatuses as $extension => $statusData) {
            if (!isset($statusData['devices']) || !is_array($statusData['devices'])) {
                continue;
            }
            // PHP silently coerces numeric-string keys to int at array construction.
            // On installations where every extension is purely numeric (the common
            // case for PBX) the foreach key ALWAYS arrives as int, violating the
            // string type-hint on processExtensionDevices(). Cast explicitly so
            // the callee always receives the contract it declares.
            $this->processExtensionDevices((string) $extension, $statusData['devices'], $currentTime);
        }
    }

    private function processExtensionDevices(string $extension, array $devices, int $currentTime): void
    {
        $historyKey = self::EXT_DEVICE_HISTORY_PREFIX . $extension;

        try {
            $historyData = $this->redis->get($historyKey);
            $history = $historyData ? json_decode($historyData, true) : [];
            $currentOnlineDevices = [];

            foreach ($devices as $device) {
                if (!isset($device['id'], $device['state'])) {
                    continue;
                }
                $deviceId = $device['id'];
                $isOnline = strtolower($device['state']) === 'ok';
                $ip = $device['ip'] ?? '';

                $countryInfo = GeoIP2Conf::getCountryByIp($ip);
                $deviceInfo = [
                    'ip' => $ip,
                    'port' => $device['port'] ?? '',
                    'user_agent' => $device['user_agent'] ?? '',
                    'country' => $countryInfo['isoCode'],
                    'country_name' => $countryInfo['name'],
                ];

                if ($isOnline) {
                    $currentOnlineDevices[] = $deviceId;
                    // Update or start session
                    if (isset($history[$deviceId]) && !isset($history[$deviceId]['session_end'])) {
                        $history[$deviceId]['last_seen'] = $currentTime;
                        $history[$deviceId]['device_info'] = array_merge(
                            $history[$deviceId]['device_info'] ?? [],
                            $deviceInfo
                        );
                    } else {
                        $history[$deviceId] = [
                            'session_start' => $currentTime,
                            'last_seen' => $currentTime,
                            'device_info' => $deviceInfo,
                        ];
                    }
                } else {
                    // Close active session
                    if (isset($history[$deviceId]) && !isset($history[$deviceId]['session_end'])) {
                        $history[$deviceId]['session_end'] = $currentTime;
                    }
                }
            }

            // Mark missing devices as offline
            foreach ($history as $deviceId => &$session) {
                if (!isset($session['session_end']) && !in_array($deviceId, $currentOnlineDevices)) {
                    $session['session_end'] = $currentTime;
                }
            }
            unset($session);

            $this->redis->setex($historyKey, self::EXT_DEVICE_HISTORY_TTL, json_encode($history));
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                static::class,
                "Device history error for {$extension}: {$e->getMessage()}",
                LOG_WARNING
            );
        }
    }

    // ═════════════════════════════════════════════════════════════════════
    //  Shared helpers
    // ═════════════════════════════════════════════════════════════════════

    /**
     * Check if any users are viewing the given pages
     */
    private function hasActiveViewers(array $pages): bool
    {
        try {
            return $this->pageTracker->hasActiveViewers($pages);
        } catch (Throwable) {
            return true; // assume active on error
        }
    }

    /**
     * Write health status to Redis (backward-compatible keys)
     */
    private function writeHealth(string $key, bool $success, int $interval, object $result): void
    {
        try {
            $health = [
                'status' => $success ? 'active' : 'error',
                'timestamp' => time(),
                'monitoring_interval' => $interval,
                'pid' => getmypid(),
            ];
            if (!$success) {
                $health['error'] = implode(', ', $result->messages['error'] ?? []);
            }
            $this->redis->setex($key, 300, json_encode($health));
        } catch (Throwable) {
        }
    }

    /**
     * Handle SIGUSR1 — reset all timers for immediate re-check after restart
     */
    protected function handleSignalUsr1(): void
    {
        parent::handleSignalUsr1();
        $this->authLastCheckTime = 0;
        $this->providerLastCheckTime = 0;
        $this->extensionLastCheckTime = 0;
    }
}

// Start worker process
WorkerStatusMonitor::startWorker($argv ?? []);
