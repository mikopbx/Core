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
 * This class monitors the growth rate of Asterisk security log file.
 * Rapid growth indicates potential security issues (brute force attacks, scanning, etc.).
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckSecurityLog extends Injectable
{
    private const string CACHE_KEY_PREFIX = 'CheckSecurityLog:';
    private const string CACHE_KEY_SIZE = self::CACHE_KEY_PREFIX . 'lastSize';
    private const string CACHE_KEY_TIMESTAMP = self::CACHE_KEY_PREFIX . 'lastCheckTimestamp';

    // Threshold: 1MB growth per 10 minutes is considered suspicious
    private const int SUSPICIOUS_GROWTH_BYTES = 1048576; // 1MB in bytes
    private const int CHECK_INTERVAL_SECONDS = 600; // 10 minutes

    // Threshold: 5MB growth per 10 minutes is critical
    private const int CRITICAL_GROWTH_BYTES = 5242880; // 5MB in bytes

    /**
     * Check security log growth rate.
     *
     * @return array<string, array<int, array<string, mixed>>> An array containing warning or error messages.
     */
    public function process(): array
    {
        $messages = [];
        $logFile = Directories::getDir(Directories::CORE_LOGS_DIR) . '/asterisk/security_log';

        // Check if log file exists
        if (!file_exists($logFile)) {
            // No security log yet - this is normal for new installations
            return $messages;
        }

        $currentSize = filesize($logFile);
        $currentTimestamp = time();

        $di = Di::getDefault();
        if ($di === null) {
            // Cannot proceed without DI container
            return $messages;
        }
        $managedCache = $di->get(ManagedCacheProvider::SERVICE_NAME);

        // Get previous check data
        $lastSize = $managedCache->get(self::CACHE_KEY_SIZE);
        $lastTimestamp = $managedCache->get(self::CACHE_KEY_TIMESTAMP);

        // If this is the first check, just store current values
        if ($lastSize === null || $lastTimestamp === null) {
            $managedCache->set(self::CACHE_KEY_SIZE, $currentSize, self::CHECK_INTERVAL_SECONDS * 2);
            $managedCache->set(self::CACHE_KEY_TIMESTAMP, $currentTimestamp, self::CHECK_INTERVAL_SECONDS * 2);
            return $messages;
        }

        // Calculate growth
        $sizeGrowth = $currentSize - (int)$lastSize;
        $timeElapsed = $currentTimestamp - (int)$lastTimestamp;

        // If log was rotated (current size < last size), reset tracking
        if ($sizeGrowth < 0) {
            $managedCache->set(self::CACHE_KEY_SIZE, $currentSize, self::CHECK_INTERVAL_SECONDS * 2);
            $managedCache->set(self::CACHE_KEY_TIMESTAMP, $currentTimestamp, self::CHECK_INTERVAL_SECONDS * 2);
            return $messages;
        }

        // Calculate growth rate normalized to CHECK_INTERVAL_SECONDS
        if ($timeElapsed > 0) {
            $normalizedGrowth = (int)(($sizeGrowth / $timeElapsed) * self::CHECK_INTERVAL_SECONDS);
        } else {
            // Avoid division by zero
            $normalizedGrowth = $sizeGrowth;
        }

        // Check if growth exceeds thresholds
        $isCritical = $normalizedGrowth >= self::CRITICAL_GROWTH_BYTES;
        $isSuspicious = $normalizedGrowth >= self::SUSPICIOUS_GROWTH_BYTES;

        if ($isCritical || $isSuspicious) {
            $growthMB = round($normalizedGrowth / 1048576, 2);
            $intervalMinutes = (int)(self::CHECK_INTERVAL_SECONDS / 60);

            $messageType = $isCritical ? 'error' : 'warning';
            $messageKey = $isCritical
                ? 'adv_SecurityLogCriticalGrowth'
                : 'adv_SecurityLogSuspiciousGrowth';

            $messages[$messageType][] = [
                'messageTpl' => $messageKey,
                'messageParams' => [
                    'growth' => $growthMB,
                    'interval' => $intervalMinutes,
                    'logFile' => $logFile
                ]
            ];

            // Send email notification for security concerns
            $this->sendSecurityNotification($growthMB, $intervalMinutes, $isCritical);
        }

        // Update cache with current values
        $managedCache->set(self::CACHE_KEY_SIZE, $currentSize, self::CHECK_INTERVAL_SECONDS * 2);
        $managedCache->set(self::CACHE_KEY_TIMESTAMP, $currentTimestamp, self::CHECK_INTERVAL_SECONDS * 2);

        return $messages;
    }

    /**
     * Send security notification email about rapid log growth
     *
     * @param float $growthMB Size growth in megabytes
     * @param int $intervalMinutes Time interval in minutes
     * @param bool $isCritical Whether this is a critical alert
     * @return void
     */
    private function sendSecurityNotification(float $growthMB, int $intervalMinutes, bool $isCritical): void
    {
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

        // Security issues have highest priority
        NotificationQueueHelper::queueOrSend(
            $builder,
            async: true,
            priority: NotificationQueueHelper::PRIORITY_CRITICAL
        );
    }

    /**
     * Build admin panel URL using network settings
     *
     * @param string $path Path to append to base URL
     * @return string Full URL to admin panel
     */
    private function buildAdminUrl(string $path = ''): string
    {
        // Get HTTPS port from settings
        $httpsPort = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PORT) ?: '443';

        // Try to get external IP first, then local IP
        $host = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_IP_ADDR);
        if (empty($host)) {
            $host = gethostname() ?: 'localhost';
        }

        // Build URL
        $portSuffix = ($httpsPort === '443') ? '' : ':' . $httpsPort;
        return 'https://' . $host . $portSuffix . $path;
    }
}
