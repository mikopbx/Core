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

namespace MikoPBX\Core\System\ConsoleMenu\Banners;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\Configs\MonitConf;
use MikoPBX\Core\System\Configs\NatsConf;
use MikoPBX\Core\System\Configs\NginxConf;
use MikoPBX\Core\System\Configs\PbxConf;
use MikoPBX\Core\System\Configs\PHPConf;
use MikoPBX\Core\System\Configs\RedisConf;
use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\System;
use MikoPBX\Core\Utilities\IpAddressHelper;
use MikoPBX\Service\Main;

/**
 * Collects system data for banner display
 *
 * Gathers information about version, network, services, and system status.
 * Data is used by WelcomeBanner for rendering the ESXi-style banner.
 */
class BannerDataCollector
{
    private Network $network;

    public function __construct()
    {
        $this->network = new Network();
    }

    /**
     * Get MikoPBX version
     *
     * @return string Version string (e.g., "2025.1.1")
     */
    public function getVersion(): string
    {
        if (file_exists('/offload/version')) {
            $versionFile = '/offload/version';
        } else {
            $versionFile = '/etc/version';
        }

        return trim(file_get_contents($versionFile) ?: 'Unknown');
    }

    /**
     * Get build timestamp
     *
     * @return string Build date/time string
     */
    public function getBuildTime(): string
    {
        return trim(file_get_contents('/etc/version.buildtime') ?: 'Unknown');
    }

    /**
     * Get virtual hardware type (Docker, VMware, KVM, etc.)
     *
     * @return string Hardware type in uppercase, empty for baremetal
     */
    public function getVirtualHardwareType(): string
    {
        $pbxEnvDetect = '/sbin/pbx-env-detect';
        if (!file_exists($pbxEnvDetect) || !is_executable($pbxEnvDetect)) {
            return '';
        }

        $detectedType = trim(shell_exec("$pbxEnvDetect --type --nocache 2>/dev/null") ?? '');
        if (empty($detectedType) || $detectedType === 'baremetal') {
            return '';
        }

        return strtoupper($detectedType);
    }

    /**
     * Get CPU architecture display name
     *
     * @return string Architecture (x64, arm64, or raw uname value)
     */
    public function getArchitecture(): string
    {
        if (System::isARM64()) {
            return 'arm64';
        }
        if (System::isAMD64()) {
            return 'x64';
        }
        return php_uname('m');
    }

    /**
     * Get PBX name from settings
     *
     * @return string PBX name
     */
    public function getPbxName(): string
    {
        return PbxSettings::getValueByKey(PbxSettings::PBX_NAME) ?: 'PBX system';
    }

    /**
     * Get PBX description from settings
     *
     * @return string PBX description (empty if not set)
     */
    public function getDescription(): string
    {
        return PbxSettings::getValueByKey(PbxSettings::PBX_DESCRIPTION) ?: '';
    }

    /**
     * Get web interface URL for the internet interface
     *
     * @return array{url: string, ip: string, port: string} Web interface info
     */
    public function getWebInterfaceInfo(): array
    {
        $result = ['url' => '', 'ip' => '', 'port' => ''];

        $networks = $this->network->getEnabledLanInterfaces();

        foreach ($networks as $if_data) {
            if ($if_data['internet'] !== '1') {
                continue;
            }

            $ifName = ($if_data['vlanid'] > 0) ? "vlan{$if_data['vlanid']}" : $if_data['interface'];
            $interface = $this->network->getInterface($ifName);

            // Prefer IPv4, fallback to IPv6
            $ip = '';
            if (!empty($interface['ipaddr'])) {
                $ip = $interface['ipaddr'];
            } elseif (!empty($interface['ipv6addr'])) {
                $ip = $interface['ipv6addr'];
            }

            if (empty($ip)) {
                break;
            }

            $httpsPort = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PORT) ?: '443';

            // Build URL with proper IPv6 bracket handling
            $webUrl = 'https://';
            if (IpAddressHelper::isIpv6($ip)) {
                $webUrl .= '[' . $ip . ']';
            } else {
                $webUrl .= $ip;
            }

            // Add port only if non-standard
            if ($httpsPort !== '443') {
                $webUrl .= ':' . $httpsPort;
            }

            $result = ['url' => $webUrl, 'ip' => $ip, 'port' => $httpsPort];
            break;
        }

        return $result;
    }

    /**
     * Get SSH port from settings
     *
     * @return string SSH port number
     */
    public function getSshPort(): string
    {
        return PbxSettings::getValueByKey(PbxSettings::SSH_PORT) ?: '22';
    }

    /**
     * Get system uptime in seconds
     *
     * @return int Uptime in seconds, 0 if unavailable
     */
    public function getUptimeSeconds(): int
    {
        $uptimeFile = '/proc/uptime';
        if (!file_exists($uptimeFile)) {
            return 0;
        }

        $uptimeData = file_get_contents($uptimeFile);
        if ($uptimeData === false) {
            return 0;
        }

        return (int)explode(' ', $uptimeData)[0];
    }

    /**
     * Get system uptime in compact format with seconds
     *
     * Shows seconds to indicate banner is live and updating.
     * Format: "Xd Yh Zm Ns" (e.g., "2d 3h 45m 12s")
     *
     * @return string Uptime string
     */
    public function getUptime(): string
    {
        $totalSeconds = $this->getUptimeSeconds();
        if ($totalSeconds === 0) {
            return '';
        }

        $days = floor($totalSeconds / 86400);
        $hours = floor(($totalSeconds % 86400) / 3600);
        $minutes = floor(($totalSeconds % 3600) / 60);
        $seconds = $totalSeconds % 60;

        $parts = [];
        if ($days > 0) {
            $parts[] = "{$days}d";
        }
        if ($hours > 0 || $days > 0) {
            $parts[] = "{$hours}h";
        }
        $parts[] = "{$minutes}m";
        $parts[] = "{$seconds}s";

        return implode(' ', $parts);
    }

    /**
     * Get service statuses for banner display
     *
     * Uses unified isRunning() method from service configuration classes.
     * This allows consistent status checking across console menu, Zabbix, and other tools.
     *
     * Returns services in two groups:
     * - Core: Asterisk, Nginx, PHP (essential for PBX operation)
     * - System: Redis, Nats, Fail2ban, Monit (infrastructure services)
     *
     * @return array<string, bool> Service name => running status
     */
    public function getServiceStatuses(): array
    {
        return [
            'Asterisk' => (new PbxConf())->isRunning(),
            'Nginx' => (new NginxConf())->isRunning(),
            'PHP' => (new PHPConf())->isRunning(),
            'Redis' => (new RedisConf())->isRunning(),
            'Nats' => (new NatsConf())->isRunning(),
            'Fail2ban' => (new Fail2BanConf())->isRunning(),
            'Monit' => (new MonitConf())->isRunning(),
        ];
    }

    /**
     * Get CPU core count
     *
     * @return int Number of CPU cores, 1 if unavailable
     */
    public function getCpuCores(): int
    {
        $cpuInfo = '/proc/cpuinfo';
        if (!file_exists($cpuInfo)) {
            return 1;
        }

        $content = file_get_contents($cpuInfo);
        if ($content === false) {
            return 1;
        }

        // Count "processor" lines
        preg_match_all('/^processor\s*:/m', $content, $matches);
        return max(1, count($matches[0]));
    }

    /**
     * Get system load average
     *
     * Reads from /proc/loadavg and returns load values for 1, 5, and 15 minutes.
     * Color thresholds: green < 1.0, yellow 1.0-2.0, red > 2.0
     *
     * @return array{load1: float, load5: float, load15: float}|null Load values or null if unavailable
     */
    public function getLoadAverage(): ?array
    {
        $loadAvgFile = '/proc/loadavg';
        if (!file_exists($loadAvgFile)) {
            return null;
        }

        $content = file_get_contents($loadAvgFile);
        if ($content === false) {
            return null;
        }

        $parts = explode(' ', $content);
        if (count($parts) < 3) {
            return null;
        }

        return [
            'load1' => (float)$parts[0],
            'load5' => (float)$parts[1],
            'load15' => (float)$parts[2],
        ];
    }

    /**
     * Check system integrity for corrupted files
     *
     * Uses silent mode to avoid syslog output in banner display.
     * Skipped on LiveCD as files may differ from installed version.
     *
     * @return bool True if system integrity is broken
     */
    public function hasCorruptedFiles(): bool
    {
        // Skip on LiveCD - files may differ from installed version
        if ($this->isLiveCd()) {
            return false;
        }

        return count(Main::checkForCorruptedFiles(true)) > 0;
    }

    /**
     * Check if running in LiveCD mode
     *
     * @return bool True if running from LiveCD
     */
    public function isLiveCd(): bool
    {
        return file_exists('/offload/livecd');
    }

    /**
     * Check if running in Docker
     *
     * @return bool True if running in Docker container
     */
    public function isDocker(): bool
    {
        return System::isDocker();
    }

    /**
     * Check if firewall is disabled
     *
     * @return bool True if firewall is disabled
     */
    public function isFirewallDisabled(): bool
    {
        return PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_ENABLED) !== '1';
    }

    /**
     * Get storage disk usage information
     *
     * @return array{used: string, total: string, percent: int}|null Storage info or null if not mounted
     */
    public function getStorageInfo(): ?array
    {
        $storagePath = '/storage/usbdisk1';

        if (!is_dir($storagePath) || !is_readable($storagePath)) {
            return null;
        }

        $total = @disk_total_space($storagePath);
        $free = @disk_free_space($storagePath);

        if ($total === false || $free === false || $total <= 0) {
            return null;
        }

        $used = $total - $free;
        $percent = (int)round(($used / $total) * 100);

        return [
            'used' => $this->formatBytes($used),
            'total' => $this->formatBytes($total),
            'percent' => $percent,
        ];
    }

    /**
     * Format bytes to human-readable string
     *
     * @param int|float $bytes Bytes count
     * @return string Formatted size (e.g., "1.5 GB")
     */
    private function formatBytes(int|float $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $index = 0;

        while ($bytes >= 1024 && $index < count($units) - 1) {
            $bytes /= 1024;
            $index++;
        }

        return round($bytes, 1) . ' ' . $units[$index];
    }

    /**
     * Get memory usage information
     *
     * Reads from /proc/meminfo and returns memory and swap usage.
     * Memory usage is calculated as: used = total - available
     *
     * @return array{
     *     mem_used: string,
     *     mem_total: string,
     *     mem_percent: int,
     *     swap_used: string,
     *     swap_total: string,
     *     swap_percent: int
     * }|null Memory info or null if unavailable
     */
    public function getMemoryInfo(): ?array
    {
        $meminfoFile = '/proc/meminfo';
        if (!file_exists($meminfoFile)) {
            return null;
        }

        $content = file_get_contents($meminfoFile);
        if ($content === false) {
            return null;
        }

        $memInfo = [];
        foreach (explode("\n", $content) as $line) {
            if (preg_match('/^(\w+):\s+(\d+)\s+kB/', $line, $matches)) {
                $memInfo[$matches[1]] = (int)$matches[2] * 1024; // Convert kB to bytes
            }
        }

        $memTotal = $memInfo['MemTotal'] ?? 0;
        $memAvailable = $memInfo['MemAvailable'] ?? 0;
        $swapTotal = $memInfo['SwapTotal'] ?? 0;
        $swapFree = $memInfo['SwapFree'] ?? 0;

        if ($memTotal <= 0) {
            return null;
        }

        $memUsed = $memTotal - $memAvailable;
        $swapUsed = $swapTotal - $swapFree;

        $memPercent = (int)round(($memUsed / $memTotal) * 100);
        $swapPercent = $swapTotal > 0 ? (int)round(($swapUsed / $swapTotal) * 100) : 0;

        return [
            'mem_used' => $this->formatBytes($memUsed),
            'mem_total' => $this->formatBytes($memTotal),
            'mem_percent' => $memPercent,
            'swap_used' => $this->formatBytes($swapUsed),
            'swap_total' => $this->formatBytes($swapTotal),
            'swap_percent' => $swapPercent,
        ];
    }

    /**
     * Get last login information (previous session, not current)
     *
     * Parses the output of `last` command to find the most recent completed login.
     * Skips current sessions (still logged in) and system entries.
     *
     * @return array{datetime: string, source: string, terminal: string}|null
     *         Login info or null if no previous login found
     */
    public function getLastLogin(): ?array
    {
        $output = shell_exec('last -n 20 2>/dev/null');
        if (empty($output)) {
            return null;
        }

        $lines = explode("\n", $output);
        foreach ($lines as $line) {
            $line = trim($line);

            // Skip empty lines, current sessions, and system entries
            if (empty($line)
                || str_contains($line, 'still logged in')
                || str_starts_with($line, 'wtmp begins')
                || str_starts_with($line, 'reboot')
                || str_starts_with($line, 'shutdown')
            ) {
                continue;
            }

            // Parse login entry
            // Format: user terminal [host] date time - end_time (duration)
            // SSH:    root pts/0   192.168.64.1  Mon Dec 15 12:39 - 12:40  (00:00)
            // Console: root ttyS0                Mon Dec 15 12:14 - 12:16  (00:02)
            $parts = preg_split('/\s+/', $line);
            if (count($parts) < 6) {
                continue;
            }

            $terminal = $parts[1] ?? '';
            $source = '';
            $dateStart = 2;

            // Check if this is an SSH login (pts/X) with IP address
            if (str_starts_with($terminal, 'pts/')) {
                // Has IP address in position 2
                $possibleIp = $parts[2] ?? '';
                if (filter_var($possibleIp, FILTER_VALIDATE_IP)) {
                    $source = $possibleIp;
                    $dateStart = 3;
                }
            }

            // Extract datetime (day month date time)
            // Format: Mon Dec 15 12:39
            if (count($parts) > $dateStart + 3) {
                $datetime = implode(' ', array_slice($parts, $dateStart, 4));

                return [
                    'datetime' => $datetime,
                    'source' => $source,
                    'terminal' => $terminal,
                ];
            }
        }

        return null;
    }
}
