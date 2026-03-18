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

namespace MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Mail\Builders\SecurityLogGrowthNotificationBuilder;
use MikoPBX\Core\System\Mail\NotificationQueueHelper;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 * Class CheckSecurityLog
 * Monitors the growth rate of Asterisk log files (security_log, messages, error, verbose).
 * Rapid growth indicates potential security issues (brute force attacks, scanning, etc.)
 * or system problems (misconfiguration causing log spam).
 *
 * Tracks the total size of all rotated copies for each log file to avoid missing attacks
 * that cause frequent log rotation (where the active file stays small but
 * rotated copies accumulate rapidly).
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckSecurityLog extends Injectable
{
    private const string CACHE_KEY_PREFIX = 'CheckSecurityLog:';

    // Cache TTL: 1 hour — survives worker restarts and busy periods
    private const int CACHE_TTL_SECONDS = 3600;

    // Threshold: 1MB growth per 10 minutes is considered suspicious
    private const int SUSPICIOUS_GROWTH_BYTES = 1048576; // 1MB
    private const int CHECK_INTERVAL_SECONDS = 600; // 10 minutes

    // Threshold: 5MB growth per 10 minutes is critical
    private const int CRITICAL_GROWTH_BYTES = 5242880; // 5MB

    /**
     * Asterisk log files to monitor.
     * Each entry maps a log base name to its alert translation keys.
     */
    private const array MONITORED_LOGS = [
        'security_log' => [
            'suspicious' => 'adv_SecurityLogSuspiciousGrowth',
            'critical' => 'adv_SecurityLogCriticalGrowth',
        ],
        'messages' => [
            'suspicious' => 'adv_AsteriskLogSuspiciousGrowth',
            'critical' => 'adv_AsteriskLogCriticalGrowth',
        ],
        'error' => [
            'suspicious' => 'adv_AsteriskLogSuspiciousGrowth',
            'critical' => 'adv_AsteriskLogCriticalGrowth',
        ],
        'verbose' => [
            'suspicious' => 'adv_AsteriskLogSuspiciousGrowth',
            'critical' => 'adv_AsteriskLogCriticalGrowth',
        ],
    ];

    /**
     * Check growth rate across all monitored Asterisk log files.
     *
     * @return array<string, array<int, array<string, mixed>>> An array containing warning or error messages.
     */
    public function process(): array
    {
        $messages = [];
        $logDir = Directories::getDir(Directories::CORE_LOGS_DIR) . '/asterisk/';

        $di = Di::getDefault();
        if ($di === null) {
            return $messages;
        }
        $managedCache = $di->get(ManagedCacheProvider::SERVICE_NAME);
        $currentTimestamp = time();

        foreach (self::MONITORED_LOGS as $logBaseName => $messageKeys) {
            $logFile = $logDir . $logBaseName;
            if (!file_exists($logFile)) {
                continue;
            }

            $result = $this->checkLogGrowth(
                $logDir,
                $logBaseName,
                $messageKeys,
                $managedCache,
                $currentTimestamp
            );

            foreach ($result as $type => $items) {
                foreach ($items as $item) {
                    $messages[$type][] = $item;
                }
            }
        }

        return $messages;
    }

    /**
     * Check growth rate for a single log file (including all its rotated copies).
     *
     * @param string $logDir Path to the asterisk log directory.
     * @param string $logBaseName Base name of the log file (e.g. 'security_log').
     * @param array $messageKeys Translation keys for suspicious/critical alerts.
     * @param mixed $managedCache Cache service instance.
     * @param int $currentTimestamp Current unix timestamp.
     * @return array<string, array<int, array<string, mixed>>>
     */
    private function checkLogGrowth(
        string $logDir,
        string $logBaseName,
        array $messageKeys,
        mixed $managedCache,
        int $currentTimestamp
    ): array {
        $messages = [];
        $cacheKeySize = self::CACHE_KEY_PREFIX . $logBaseName . ':totalSize';
        $cacheKeyTime = self::CACHE_KEY_PREFIX . $logBaseName . ':timestamp';

        $totalSize = $this->calculateTotalLogSize($logDir, $logBaseName);

        // Get previous check data
        $lastTotalSize = $managedCache->get($cacheKeySize);
        $lastTimestamp = $managedCache->get($cacheKeyTime);

        // First check — store baseline and return
        if ($lastTotalSize === null || $lastTimestamp === null) {
            $managedCache->set($cacheKeySize, $totalSize, self::CACHE_TTL_SECONDS);
            $managedCache->set($cacheKeyTime, $currentTimestamp, self::CACHE_TTL_SECONDS);
            return $messages;
        }

        $sizeGrowth = $totalSize - (int)$lastTotalSize;
        $timeElapsed = $currentTimestamp - (int)$lastTimestamp;

        // Total size decreased — old rotated files were cleaned up.
        // Use the new total as baseline without alerting.
        if ($sizeGrowth < 0) {
            $managedCache->set($cacheKeySize, $totalSize, self::CACHE_TTL_SECONDS);
            $managedCache->set($cacheKeyTime, $currentTimestamp, self::CACHE_TTL_SECONDS);
            return $messages;
        }

        // Normalize growth rate to CHECK_INTERVAL_SECONDS window
        if ($timeElapsed > 0) {
            $normalizedGrowth = (int)(($sizeGrowth / $timeElapsed) * self::CHECK_INTERVAL_SECONDS);
        } else {
            $normalizedGrowth = $sizeGrowth;
        }

        // Check if growth exceeds thresholds
        $isCritical = $normalizedGrowth >= self::CRITICAL_GROWTH_BYTES;
        $isSuspicious = $normalizedGrowth >= self::SUSPICIOUS_GROWTH_BYTES;

        if ($isCritical || $isSuspicious) {
            $growthMB = round($normalizedGrowth / 1048576, 2);
            $totalMB = round($totalSize / 1048576, 2);
            $intervalMinutes = (int)(self::CHECK_INTERVAL_SECONDS / 60);
            $logFile = $logDir . $logBaseName;

            $messageType = $isCritical ? 'error' : 'warning';
            $messageKey = $isCritical
                ? $messageKeys['critical']
                : $messageKeys['suspicious'];

            $messages[$messageType][] = [
                'messageTpl' => $messageKey,
                'messageParams' => [
                    'growth' => $growthMB,
                    'interval' => $intervalMinutes,
                    'logFile' => $logFile,
                    'totalSize' => $totalMB,
                ]
            ];

            // Send email only for security_log — it always signals an attack
            if ($logBaseName === 'security_log') {
                $this->sendSecurityNotification($growthMB, $intervalMinutes, $isCritical);
            }
        }

        // Update cache with current values
        $managedCache->set($cacheKeySize, $totalSize, self::CACHE_TTL_SECONDS);
        $managedCache->set($cacheKeyTime, $currentTimestamp, self::CACHE_TTL_SECONDS);

        return $messages;
    }

    /**
     * Calculate total size of all log files matching the base name (active + rotated uncompressed).
     * Compressed (.gz) files are excluded since they represent already-processed old data
     * and their size doesn't reflect the real volume of incoming traffic.
     *
     * @param string $logDir Path to the asterisk log directory.
     * @param string $logBaseName Base name of the log file (e.g. 'security_log').
     * @return int Total size in bytes.
     */
    private function calculateTotalLogSize(string $logDir, string $logBaseName): int
    {
        $totalSize = 0;

        // Add the active log file itself
        $activeFile = $logDir . $logBaseName;
        if (file_exists($activeFile)) {
            $size = filesize($activeFile);
            if ($size !== false) {
                $totalSize += $size;
            }
        }

        // Add rotated uncompressed copies: security_log.0, security_log.1, ... security_log.10
        // Uses single-character glob to match .0-.9 then checks for multi-digit (.10, .11, etc.)
        $rotatedFiles = glob($logDir . $logBaseName . '.[0-9]*');
        if ($rotatedFiles === false) {
            return $totalSize;
        }

        $baseLen = strlen($logDir . $logBaseName . '.');
        foreach ($rotatedFiles as $file) {
            // Skip compressed archives (.gz)
            if (str_ends_with($file, '.gz')) {
                continue;
            }
            // Ensure suffix after the dot is purely numeric (e.g. ".0", ".10")
            $suffix = substr($file, $baseLen);
            if (!ctype_digit($suffix)) {
                continue;
            }
            $size = filesize($file);
            if ($size !== false) {
                $totalSize += $size;
            }
        }

        return $totalSize;
    }

    /**
     * Send security notification email about rapid log growth.
     *
     * @param float $growthMB Size growth in megabytes per interval.
     * @param int $intervalMinutes Time interval in minutes.
     * @param bool $isCritical Whether this is a critical alert.
     * @return void
     */
    private function sendSecurityNotification(
        float $growthMB,
        int $intervalMinutes,
        bool $isCritical
    ): void {
        $adminEmail = PbxSettings::getValueByKey(PbxSettings::SYSTEM_NOTIFICATIONS_EMAIL);

        if (empty($adminEmail)) {
            return;
        }

        $builder = new SecurityLogGrowthNotificationBuilder();
        $builder->setRecipient($adminEmail)
                ->setGrowthRate($growthMB)
                ->setTimeInterval($intervalMinutes)
                ->setSeverity($isCritical ? 'critical' : 'warning')
                ->setAdminUrl($this->buildAdminUrl('/admin-cabinet/firewall/index/'));

        NotificationQueueHelper::queueOrSend(
            $builder,
            async: true,
            priority: NotificationQueueHelper::PRIORITY_CRITICAL
        );
    }

    /**
     * Build admin panel URL using network settings.
     *
     * @param string $path Path to append to base URL.
     * @return string Full URL to admin panel.
     */
    private function buildAdminUrl(string $path = ''): string
    {
        $httpsPort = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PORT) ?: '443';

        $host = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_IP_ADDR);
        if (empty($host)) {
            $host = gethostname() ?: 'localhost';
        }

        $portSuffix = ($httpsPort === '443') ? '' : ':' . $httpsPort;
        return 'https://' . $host . $portSuffix . $path;
    }
}
