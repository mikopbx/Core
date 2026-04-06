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

namespace MikoPBX\PBXCoreREST\Lib\Sip;

use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Throwable;

/**
 * Process authentication failures from Asterisk security log
 *
 * Parses SecurityEvent="ChallengeResponseFailed" entries for internal extensions
 * and stores failure statistics in Redis
 */
class ProcessAuthFailuresAction
{
    // Cache keys
    private const AUTH_FAILURES_PREFIX = 'Extensions:AuthFailures:';
    private const LOG_POSITION_KEY = 'Extensions:AuthFailureMonitor:logPosition';

    // TTL settings
    private const AUTH_FAILURES_TTL = 86400;     // 24 hours for auth failure history
    private const LOG_POSITION_TTL = 172800;     // 48 hours for log position

    /**
     * Process authentication failures from security log
     *
     * @param array<string, mixed> $params Request parameters
     * @return PBXApiResult
     */
    public static function main(array $params = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        try {
            $di = Di::getDefault();
            $redis = $di->get(RedisClientProvider::SERVICE_NAME);

            // Load internal extensions
            $internalExtensions = self::loadInternalExtensions();

            if (empty($internalExtensions)) {
                $res->messages['warning'][] = 'No internal extensions found';
                $res->success = true;
                $res->data = ['processed' => 0];
                return $res;
            }

            // Parse security log
            $failures = self::parseSecurityLog($redis, $internalExtensions);

            if (!empty($failures)) {
                // Update Redis with failure data
                self::updateAuthFailureStats($redis, $failures);

                $res->data = [
                    'processed' => count($failures),
                    'extensions' => array_keys($failures)
                ];

                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "Processed " . count($failures) . " auth failures",
                    LOG_DEBUG
                );
            } else {
                $res->data = ['processed' => 0];
            }

            $res->success = true;

        } catch (Throwable $e) {
            $res->messages['error'][] = $e->getMessage();
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Error processing auth failures: " . $e->getMessage(),
                LOG_ERR
            );
        }

        return $res;
    }

    /**
     * Load list of internal SIP extensions from database
     *
     * Uses Sip model with type='peer' filter to exclude providers (type='friend').
     * All peer accounts represent internal user extensions with valid extension numbers.
     *
     * @return array<string, bool> Map of extension numbers to true for fast lookup
     */
    private static function loadInternalExtensions(): array
    {
        $internalExtensions = [];

        try {
            // Get all SIP accounts with type='peer' (user extensions)
            // Excludes type='friend' which are SIP providers
            $sipAccounts = Sip::find([
                'conditions' => 'type = :type:',
                'bind' => ['type' => 'peer'],
                'columns' => 'extension'
            ]);

            foreach ($sipAccounts->toArray() as $account) {
                if (!empty($account['extension'])) {
                    $internalExtensions[$account['extension']] = true;
                }
            }

        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Error loading internal extensions: " . $e->getMessage(),
                LOG_ERR
            );
        }

        return $internalExtensions;
    }

    /**
     * Get path to Asterisk security log file
     */
    private static function getSecurityLogPath(): string
    {
        return Directories::getDir(Directories::CORE_LOGS_DIR) . '/asterisk/security_log';
    }

    /**
     * Parse security log for authentication failures
     *
     * @param \Redis $redis
     * @param array<string, bool> $internalExtensions
     * @return array<string, array<string, array{remote_address: string, timestamp: int, count: int}>>
     */
    private static function parseSecurityLog(\Redis $redis, array $internalExtensions): array
    {
        $failures = [];

        try {
            $securityLogPath = self::getSecurityLogPath();

            // Check if log file exists
            if (!file_exists($securityLogPath)) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "Security log file not found: " . $securityLogPath,
                    LOG_WARNING
                );
                return [];
            }

            // Get last read position
            $lastPosition = (int)$redis->get(self::LOG_POSITION_KEY);

            // Open log file
            $fileSize = filesize($securityLogPath);

            // If file was rotated (smaller than last position), start from beginning
            if ($fileSize < $lastPosition) {
                $lastPosition = 0;
            }

            $handle = fopen($securityLogPath, 'r');
            if ($handle === false) {
                throw new \RuntimeException("Cannot open log file");
            }

            // Seek to last position
            if ($lastPosition > 0) {
                fseek($handle, $lastPosition);
            }

            // Read new lines
            while (($line = fgets($handle)) !== false) {
                $failure = self::parseSecurityLogLine($line);
                if ($failure !== null) {
                    $extension = $failure['extension'];
                    $ip = $failure['ip'];

                    // Only track internal extensions
                    if (isset($internalExtensions[$extension])) {
                        if (!isset($failures[$extension])) {
                            $failures[$extension] = [];
                        }

                        if (!isset($failures[$extension][$ip])) {
                            $failures[$extension][$ip] = [
                                'remote_address' => $failure['remote_address'],
                                'timestamp' => $failure['timestamp'],
                                'count' => 0
                            ];
                        }

                        $failures[$extension][$ip]['count']++;
                    }
                }
            }

            // Save new position
            $newPosition = ftell($handle);
            if ($newPosition !== false) {
                $redis->setex(self::LOG_POSITION_KEY, self::LOG_POSITION_TTL, $newPosition);
            }

            fclose($handle);

        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                __CLASS__,
                "Error parsing security log: " . $e->getMessage(),
                LOG_ERR
            );
        }

        return $failures;
    }

    /**
     * Parse single log line for authentication failure
     *
     * @param string $line Log line
     * @return array{extension: string, ip: string, remote_address: string, timestamp: int}|null
     */
    private static function parseSecurityLogLine(string $line): ?array
    {
        // Check if line contains ChallengeResponseFailed
        if (strpos($line, 'SecurityEvent="ChallengeResponseFailed"') === false) {
            return null;
        }

        // Extract timestamp from beginning of line [2025-10-03 12:11:20]
        $timestampMatch = [];
        if (preg_match('/^\[([^\]]+)\]/', $line, $timestampMatch)) {
            $timestamp = strtotime($timestampMatch[1]);
            if ($timestamp === false) {
                $timestamp = time();
            }
        } else {
            $timestamp = time();
        }

        // Extract AccountID (extension number)
        $accountIdMatch = [];
        if (!preg_match('/AccountID="([^"]+)"/', $line, $accountIdMatch)) {
            return null;
        }
        $extension = $accountIdMatch[1];

        // Extract RemoteAddress (source IP)
        $remoteAddressMatch = [];
        if (!preg_match('/RemoteAddress="([^"]+)"/', $line, $remoteAddressMatch)) {
            return null;
        }
        $remoteAddress = $remoteAddressMatch[1];

        // Extract IP from RemoteAddress (format: IPV4/UDP/192.168.117.0/60302)
        $ipMatch = [];
        if (preg_match('#IPV[46]/[^/]+/([^/]+)/#', $remoteAddress, $ipMatch)) {
            $ip = $ipMatch[1];
        } else {
            $ip = 'unknown';
        }

        return [
            'extension' => $extension,
            'ip' => $ip,
            'remote_address' => $remoteAddress,
            'timestamp' => $timestamp
        ];
    }

    /**
     * Update authentication failure statistics in Redis
     *
     * @param \Redis $redis
     * @param array<string, array<string, array{remote_address: string, timestamp: int, count: int}>> $failures
     */
    private static function updateAuthFailureStats(\Redis $redis, array $failures): void
    {
        foreach ($failures as $extension => $ipFailures) {
            try {
                $redisKey = self::AUTH_FAILURES_PREFIX . $extension;

                // Get current stats
                $statsData = $redis->get($redisKey);
                $stats = $statsData ? json_decode($statsData, true) : [];

                // Update stats for each IP
                foreach ($ipFailures as $ip => $failureData) {
                    if (!isset($stats[$ip])) {
                        $stats[$ip] = [
                            'count' => 0,
                            'last_attempt' => 0,
                            'remote_address' => ''
                        ];
                    }

                    $stats[$ip]['count'] += $failureData['count'];
                    $stats[$ip]['last_attempt'] = max($stats[$ip]['last_attempt'], $failureData['timestamp']);
                    $stats[$ip]['remote_address'] = $failureData['remote_address'];
                }

                // Save updated stats with TTL
                $redis->setex($redisKey, self::AUTH_FAILURES_TTL, json_encode($stats));

            } catch (Throwable $e) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "Error updating auth failure stats for extension {$extension}: " . $e->getMessage(),
                    LOG_WARNING
                );
            }
        }
    }
}
