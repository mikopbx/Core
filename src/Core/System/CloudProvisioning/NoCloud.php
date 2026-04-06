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

namespace MikoPBX\Core\System\CloudProvisioning;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Promise\Create;
use GuzzleHttp\Promise\PromiseInterface;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;

/**
 * NoCloud provider for on-premise deployments.
 *
 * Implements cloud-init compatible NoCloud datasource for provisioning MikoPBX
 * on VMware, Proxmox, KVM, and other virtualization platforms.
 *
 * Supports multiple data sources in priority order:
 * 1. CIDATA ISO (/dev/sr0, /dev/sr1) - Standard cloud-init format
 * 2. Seed directory (/var/lib/cloud/seed/nocloud/) - For testing and manual provisioning
 * 3. Kernel cmdline (ds=nocloud;s=http://...) - For PXE boot scenarios
 * 4. HTTP endpoint (from cmdline 's=' parameter) - For network provisioning
 *
 * Expected file structure on ISO/seed:
 * - meta-data: Instance metadata (YAML/JSON)
 * - user-data: User configuration (YAML/JSON)
 * - vendor-data: Vendor-specific configuration (optional)
 *
 * @see https://cloudinit.readthedocs.io/en/latest/reference/datasources/nocloud.html
 * @package MikoPBX\Core\System\CloudProvisioning
 */
class NoCloud extends CloudProvider
{
    public const string CloudID = 'NoCloud';

    /**
     * Standard paths for CIDATA ISO devices.
     */
    private const array ISO_DEVICES = ['/dev/sr0', '/dev/sr1', '/dev/cdrom'];

    /**
     * Standard seed directory paths.
     */
    private const array SEED_PATHS = [
        '/var/lib/cloud/seed/nocloud/',
        '/var/lib/cloud/seed/nocloud-net/',
    ];

    /**
     * Mount point for ISO.
     */
    private const string MOUNT_POINT = '/tmp/nocloud-cidata';

    /**
     * HTTP client for network datasource.
     */
    private ?Client $client = null;

    /**
     * Detected datasource type.
     */
    private string $datasourceType = '';

    /**
     * Path or URL to the datasource.
     */
    private string $datasourcePath = '';

    /**
     * Performs an asynchronous check to determine if NoCloud datasource is available.
     *
     * @return PromiseInterface Promise that resolves to bool
     */
    public function checkAvailability(): PromiseInterface
    {
        // Check all possible datasources synchronously (no network I/O for local checks)
        $available = $this->detectDatasource();
        return Create::promiseFor($available);
    }

    /**
     * Performs NoCloud provisioning from detected datasource.
     * Uses direct SQLite queries to avoid Redis/ORM dependency during early boot.
     *
     * @return bool True if provisioning was successful, false otherwise.
     */
    public function provision(): bool
    {
        // Re-detect datasource in case state changed
        if (!$this->detectDatasource()) {
            return false;
        }

        SystemMessages::sysLogMsg(__CLASS__, "Using NoCloud datasource: {$this->datasourceType} at {$this->datasourcePath}");

        // Read meta-data
        $metaData = $this->readFile('meta-data');
        $userData = $this->readFile('user-data');
        $vendorData = $this->readFile('vendor-data');

        // Build configuration from meta-data
        $config = $this->parseMetaData($metaData);

        // Merge user-data (overrides meta-data)
        if (!empty($userData)) {
            $userConfig = $this->parseUserData($userData);
            if ($userConfig !== null) {
                $config = $config->merge($userConfig);
            }
        }

        // Merge vendor-data (lowest priority, only fills gaps)
        if (!empty($vendorData)) {
            $vendorConfig = $this->parseUserData($vendorData);
            if ($vendorConfig !== null) {
                // Vendor data fills only null values
                $config = $vendorConfig->merge($config);
            }
        }

        if ($config->isEmpty()) {
            SystemMessages::sysLogMsg(__CLASS__, "NoCloud: No configuration data found");
            return false;
        }

        // Apply configuration using direct SQLite (no Redis/ORM)
        return $this->applyConfigDirect($config);
    }

    /**
     * Detects available NoCloud datasource.
     *
     * Checks in priority order:
     * 1. Kernel cmdline (ds=nocloud)
     * 2. CIDATA ISO
     * 3. Seed directories
     *
     * @return bool True if datasource found
     */
    private function detectDatasource(): bool
    {
        // 1. Check kernel cmdline for NoCloud datasource
        if ($this->checkKernelCmdline()) {
            return true;
        }

        // 2. Check for CIDATA ISO
        if ($this->checkCidataIso()) {
            return true;
        }

        // 3. Check seed directories
        if ($this->checkSeedDirectories()) {
            return true;
        }

        return false;
    }

    /**
     * Checks kernel command line for NoCloud datasource specification.
     *
     * Looks for: ds=nocloud;s=http://... or ds=nocloud-net;s=http://...
     *
     * @return bool True if NoCloud specified in cmdline
     */
    private function checkKernelCmdline(): bool
    {
        $cmdline = @file_get_contents('/proc/cmdline');
        if ($cmdline === false) {
            return false;
        }

        // Pattern: ds=nocloud or ds=nocloud-net, optionally with seedfrom (s=URL)
        if (preg_match('/\bds=nocloud(-net)?(?:;|\s|$)/i', $cmdline)) {
            // Extract seedfrom URL if present
            if (preg_match('/\bds=nocloud(?:-net)?;s=([^\s;]+)/i', $cmdline, $matches)) {
                $url = $matches[1];

                // Validate URL to prevent SSRF attacks
                if (!$this->validateDatasourceUrl($url)) {
                    SystemMessages::sysLogMsg(__CLASS__, "Invalid NoCloud URL in cmdline: $url", LOG_WARNING);
                    return false;
                }

                $this->datasourceType = 'cmdline-http';
                $this->datasourcePath = $url;
                $this->client = new Client(['timeout' => self::HTTP_TIMEOUT]);
                return true;
            }

            // NoCloud without URL - will use ISO or seed directory
            // Continue checking other sources
        }

        return false;
    }

    /**
     * Validates a datasource URL for security.
     *
     * Prevents SSRF attacks by ensuring URL:
     * - Uses only http or https scheme
     * - Has a valid host
     * - Does not point to private/internal networks (default, can be overridden)
     *
     * Set NOCLOUD_ALLOW_PRIVATE_IPS=1 environment variable to allow private IPs
     * in single-tenant on-premise environments.
     *
     * @param string $url URL to validate
     * @return bool True if URL is valid and safe
     */
    private function validateDatasourceUrl(string $url): bool
    {
        // Parse URL components
        $parsed = parse_url($url);
        if ($parsed === false) {
            return false;
        }

        // Check scheme (only http/https allowed)
        $scheme = strtolower($parsed['scheme'] ?? '');
        if ($scheme !== 'http' && $scheme !== 'https') {
            return false;
        }

        // Must have a host
        if (empty($parsed['host'])) {
            return false;
        }

        // Host must be a valid hostname or IP
        $host = $parsed['host'];

        // Check if it's a valid IP address
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            // Check environment override for on-premise deployments
            $allowPrivateIps = getenv('NOCLOUD_ALLOW_PRIVATE_IPS') === '1';

            if (!$allowPrivateIps) {
                // Strict SSRF protection by default (prevents attacks in multi-tenant environments)
                if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
                    SystemMessages::sysLogMsg(__CLASS__, "NoCloud SSRF protection: blocked private IP $host. Set NOCLOUD_ALLOW_PRIVATE_IPS=1 to override.", LOG_WARNING);
                    return false;
                }
            } else {
                SystemMessages::sysLogMsg(__CLASS__, "NoCloud: private IP allowed via NOCLOUD_ALLOW_PRIVATE_IPS override: $host", LOG_NOTICE);
            }
            return true;
        }

        // Check if it's a valid hostname (RFC 1123)
        if (preg_match('/^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/', $host)) {
            return true;
        }

        return false;
    }

    /**
     * Checks for CIDATA ISO device with cloud-init files.
     *
     * @return bool True if CIDATA ISO found with valid data
     */
    private function checkCidataIso(): bool
    {
        foreach (self::ISO_DEVICES as $device) {
            if (!file_exists($device)) {
                continue;
            }

            // Check if device has CIDATA label using blkid
            $blkid = Util::which('blkid');
            $output = shell_exec("$blkid -s LABEL -o value " . escapeshellarg($device) . " 2>/dev/null");
            $label = trim((string)$output);

            if (strtoupper($label) !== 'CIDATA') {
                continue;
            }

            // Mount the ISO
            if ($this->mountCidataIso($device)) {
                $this->datasourceType = 'iso';
                $this->datasourcePath = self::MOUNT_POINT;
                return true;
            }
        }

        return false;
    }

    /**
     * Mounts CIDATA ISO to temporary mount point.
     *
     * @param string $device Device path (e.g., /dev/sr0)
     * @return bool True if mounted successfully
     */
    private function mountCidataIso(string $device): bool
    {
        // Create mount point if needed
        if (!is_dir(self::MOUNT_POINT)) {
            if (!mkdir(self::MOUNT_POINT, 0755, true)) {
                SystemMessages::sysLogMsg(__CLASS__, "Failed to create mount point: " . self::MOUNT_POINT);
                return false;
            }
        }

        // Check if already mounted
        $mountOutput = shell_exec('mount | grep ' . escapeshellarg(self::MOUNT_POINT));
        if (!empty($mountOutput)) {
            return true; // Already mounted
        }

        // Mount ISO read-only
        $mount = Util::which('mount');
        $cmd = "$mount -o ro -t iso9660 " . escapeshellarg($device) . " " . escapeshellarg(self::MOUNT_POINT) . " 2>&1";
        $result = shell_exec($cmd);

        if (!file_exists(self::MOUNT_POINT . '/meta-data') && !file_exists(self::MOUNT_POINT . '/user-data')) {
            // Mount succeeded but no cloud-init files - unmount and return false
            $this->unmountCidataIso();
            return false;
        }

        return true;
    }

    /**
     * Unmounts CIDATA ISO if mounted.
     */
    private function unmountCidataIso(): void
    {
        if (is_dir(self::MOUNT_POINT)) {
            $umount = Util::which('umount');
            shell_exec("$umount " . escapeshellarg(self::MOUNT_POINT) . " 2>/dev/null");
        }
    }

    /**
     * Checks seed directories for NoCloud data files.
     *
     * @return bool True if valid seed directory found
     */
    private function checkSeedDirectories(): bool
    {
        foreach (self::SEED_PATHS as $path) {
            if (!is_dir($path)) {
                continue;
            }

            // Check for at least one data file
            if (file_exists($path . 'meta-data') || file_exists($path . 'user-data')) {
                $this->datasourceType = 'seed';
                $this->datasourcePath = $path;
                return true;
            }
        }

        return false;
    }

    /**
     * Reads a file from the detected datasource.
     *
     * @param string $filename File to read (meta-data, user-data, vendor-data)
     * @return string File contents or empty string if not found
     */
    private function readFile(string $filename): string
    {
        switch ($this->datasourceType) {
            case 'cmdline-http':
                return $this->fetchHttpFile($filename);

            case 'iso':
            case 'seed':
                $path = rtrim($this->datasourcePath, '/') . '/' . $filename;
                if (file_exists($path)) {
                    $content = file_get_contents($path);
                    return $content !== false ? $content : '';
                }
                return '';

            default:
                return '';
        }
    }

    /**
     * Fetches a file from HTTP endpoint.
     *
     * @param string $filename File to fetch
     * @return string File contents or empty string on error
     */
    private function fetchHttpFile(string $filename): string
    {
        if ($this->client === null) {
            return '';
        }

        $url = rtrim($this->datasourcePath, '/') . '/' . $filename;

        try {
            $response = $this->client->request('GET', $url, [
                'timeout' => self::HTTP_TIMEOUT,
                'http_errors' => false,
            ]);

            if ($response->getStatusCode() === 200) {
                return $response->getBody()->getContents();
            }
        } catch (GuzzleException $e) {
            SystemMessages::sysLogMsg(__CLASS__, "Failed to fetch $url: " . $e->getMessage());
        }

        return '';
    }

    /**
     * Parses meta-data file into ProvisioningConfig.
     *
     * Standard NoCloud meta-data fields:
     * - instance-id: Required unique identifier
     * - local-hostname: Hostname for the instance
     * - dsmode: Datasource mode (local, net)
     *
     * @param string $metaData Raw meta-data content
     * @return ProvisioningConfig
     */
    private function parseMetaData(string $metaData): ProvisioningConfig
    {
        $config = new ProvisioningConfig();

        if (empty($metaData)) {
            return $config;
        }

        // Try YAML first (most common)
        $data = null;
        if (function_exists('yaml_parse')) {
            $data = @yaml_parse($metaData);
        }

        // Fall back to JSON
        if (!is_array($data)) {
            $data = json_decode($metaData, true);
        }

        if (!is_array($data)) {
            // Try simple key=value format
            $data = $this->parseKeyValueFormat($metaData);
        }

        if (!is_array($data)) {
            return $config;
        }

        // Map NoCloud meta-data to ProvisioningConfig
        $config->instanceId = $data['instance-id'] ?? $data['instance_id'] ?? null;
        $config->hostname = $data['local-hostname'] ?? $data['hostname'] ?? null;

        // SSH keys can be in meta-data (some implementations)
        if (isset($data['public-keys']) || isset($data['public_keys'])) {
            $keys = $data['public-keys'] ?? $data['public_keys'];
            if (is_array($keys)) {
                // Can be indexed array or associative with key names
                $keyLines = [];
                foreach ($keys as $key => $value) {
                    if (is_string($value)) {
                        $keyLines[] = $value;
                    } elseif (is_array($value) && isset($value['openssh-key'])) {
                        $keyLines[] = $value['openssh-key'];
                    }
                }
                $config->sshKeys = implode("\n", $keyLines);
            } elseif (is_string($keys)) {
                $config->sshKeys = $keys;
            }
        }

        // Network config can be in meta-data
        if (isset($data['network']) && is_array($data['network'])) {
            $config->networkSettings = $data['network'];
        }

        return $config;
    }

    /**
     * Parses simple key=value format.
     *
     * Some minimal NoCloud implementations use this format for meta-data:
     * instance-id: my-vm
     * local-hostname: pbx-server
     *
     * @param string $content Raw content
     * @return array|null Parsed data or null
     */
    private function parseKeyValueFormat(string $content): ?array
    {
        $lines = explode("\n", $content);
        $data = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || str_starts_with($line, '#')) {
                continue;
            }

            // Support both "key: value" and "key=value"
            if (preg_match('/^([a-zA-Z0-9_-]+)\s*[:=]\s*(.*)$/', $line, $matches)) {
                $data[$matches[1]] = trim($matches[2]);
            }
        }

        return empty($data) ? null : $data;
    }

    /**
     * Cleanup: unmount ISO if it was mounted.
     */
    public function __destruct()
    {
        if ($this->datasourceType === 'iso') {
            $this->unmountCidataIso();
        }
    }
}
