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

use GuzzleHttp\Promise\Create;
use GuzzleHttp\Promise\PromiseInterface;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\System;

/**
 * LXC cloud provider for Proxmox container deployments.
 *
 * This provider handles provisioning of MikoPBX when running in LXC containers.
 * It reads configuration from Proxmox-provided files:
 * - /etc/hostname - container hostname
 * - /root/.ssh/authorized_keys - SSH public keys
 * - /etc/network/interfaces - network configuration (IP, gateway, DNS)
 *
 * Unlike Docker, LXC containers manage their own network and have full system access.
 * Proxmox passes configuration through these standard Linux files.
 *
 * @package MikoPBX\Core\System\CloudProvisioning
 */
class LxcCloud extends CloudProvider
{
    public const string CloudID = 'LxcCloud';

    /**
     * Proxmox configuration file paths.
     */
    private const string PATH_HOSTNAME = '/etc/hostname';
    private const string PATH_SSH_KEYS = '/root/.ssh/authorized_keys';
    private const string PATH_NETWORK_INTERFACES = '/etc/network/interfaces';

    /**
     * Detected network interface name from /etc/network/interfaces.
     */
    private string $detectedInterface = 'eth0';

    /**
     * Performs an asynchronous check to determine if running in LXC.
     *
     * @return PromiseInterface Promise that resolves to bool
     */
    public function checkAvailability(): PromiseInterface
    {
        return Create::promiseFor(System::isLxc());
    }

    /**
     * Applies Proxmox configuration overrides on EVERY container start.
     *
     * This follows the 12-factor app pattern where configuration should be applied
     * on each start, not just the first boot. Reads Proxmox-provided files:
     * - /etc/hostname - container hostname
     * - /root/.ssh/authorized_keys - SSH public keys
     * - /etc/network/interfaces - network configuration (static IP, gateway, DNS)
     *
     * Called from CloudProvisioning::start() BEFORE the one-time provisioning check.
     * Similar to DockerCloud::applyEnvironmentOverrides().
     * Redis is already running at this point, so ORM can be used.
     *
     * @return void
     */
    public static function applyProxmoxOverrides(): void
    {
        $message = PHP_EOL . "   |- Applying Proxmox configuration overrides...";
        SystemMessages::echoToTeletype($message);

        $instance = new self();

        // Build configuration from Proxmox files (also detects interface name)
        $config = $instance->buildConfigFromProxmoxFiles();

        // ALWAYS reset LAN interface for LXC containers
        // This ensures internet='1' and disabled='0' even with DHCP/empty config
        // Required for welcome banner to display IP address
        $instance->resetLanInterface($instance->detectedInterface);

        if ($config->isEmpty()) {
            SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_SKIPPED);
            return;
        }

        // Apply the configuration using ORM (Redis is already running)
        $instance->applyConfig($config);

        SystemMessages::teletypeEchoResult($message, SystemMessages::RESULT_DONE);
    }

    /**
     * Performs one-time LXC provisioning (first container start only).
     *
     * Proxmox configuration is already applied by applyProxmoxOverrides() which runs
     * on every start. This method only confirms we're in LXC for the one-time
     * provisioning marker (VIRTUAL_HARDWARE_TYPE, etc.).
     *
     * Called from CloudProvisioning::start() during boot.
     *
     * @return bool True if running in LXC, false otherwise.
     */
    public function provision(): bool
    {
        // Configuration already applied by applyProxmoxOverrides()
        // Just confirm we're in LXC for the provisioning marker
        return System::isLxc();
    }

    /**
     * Builds ProvisioningConfig from Proxmox-provided files.
     *
     * @return ProvisioningConfig
     */
    private function buildConfigFromProxmoxFiles(): ProvisioningConfig
    {
        $config = new ProvisioningConfig();

        // Read hostname
        $hostname = $this->readHostname();
        if ($hostname !== null && $hostname !== 'mikopbx') {
            $config->hostname = $hostname;
        }

        // Read SSH keys
        $sshKeys = $this->readSshKeys();
        if ($sshKeys !== null) {
            $config->sshKeys = $sshKeys;
        }

        // Parse network interfaces (also sets $this->detectedInterface)
        $networkConfig = $this->parseNetworkInterfaces();
        if (!empty($networkConfig)) {
            // resetLanInterface() already sets internet='1' and disabled='0'
            $config->networkSettings = $networkConfig;
        }

        return $config;
    }

    /**
     * Reads hostname from /etc/hostname.
     *
     * @return string|null Hostname or null if not available
     */
    private function readHostname(): ?string
    {
        if (!file_exists(self::PATH_HOSTNAME)) {
            return null;
        }

        $hostname = trim(file_get_contents(self::PATH_HOSTNAME));
        if (empty($hostname)) {
            return null;
        }

        return $hostname;
    }

    /**
     * Reads SSH authorized keys from multiple sources (in priority order):
     * 1. SSH_AUTHORIZED_KEYS environment variable (set by Proxmox lxc.environment)
     * 2. /root/.ssh/authorized_keys file (created by Proxmox)
     *
     * @return string|null SSH keys (newline-separated) or null if not available
     */
    private function readSshKeys(): ?string
    {
        // Priority 1: Check ENV variable (set via lxc.environment in Proxmox config)
        // This is the most reliable method as Proxmox sets it before container starts
        $envKeys = getenv('SSH_AUTHORIZED_KEYS');
        if ($envKeys !== false && !empty(trim($envKeys))) {
            $keys = trim($envKeys);
            // Handle semicolon-separated keys (from lxc-entrypoint conversion)
            $keys = str_replace(';', "\n", $keys);
            SystemMessages::sysLogMsg(
                self::CloudID,
                "SSH keys read from ENV variable SSH_AUTHORIZED_KEYS",
                LOG_DEBUG
            );
            return $keys;
        }

        // Priority 2: Check file (may be overwritten later by MikoPBX SSHConf)
        if (!file_exists(self::PATH_SSH_KEYS)) {
            return null;
        }

        $keys = trim(file_get_contents(self::PATH_SSH_KEYS));
        if (empty($keys)) {
            return null;
        }

        SystemMessages::sysLogMsg(
            self::CloudID,
            "SSH keys read from file " . self::PATH_SSH_KEYS,
            LOG_DEBUG
        );

        return $keys;
    }

    /**
     * Parses /etc/network/interfaces file (Debian/Alpine format).
     *
     * Proxmox generates this file with static IP configuration:
     * ```
     * auto eth0
     * iface eth0 inet static
     *     address 192.168.1.100
     *     netmask 255.255.255.0
     *     gateway 192.168.1.1
     *
     * iface eth0 inet6 static
     *     address 2001:db8::100
     *     netmask 64
     *     gateway 2001:db8::1
     * ```
     *
     * @return array<string, string> Network settings for LanInterfaces
     */
    private function parseNetworkInterfaces(): array
    {
        if (!file_exists(self::PATH_NETWORK_INTERFACES)) {
            return [];
        }

        $content = file_get_contents(self::PATH_NETWORK_INTERFACES);
        if (empty($content)) {
            return [];
        }

        $settings = [];
        $lines = explode("\n", $content);
        $currentInterface = null;
        $currentFamily = null; // 'inet' or 'inet6'

        foreach ($lines as $line) {
            $line = trim($line);

            // Skip empty lines and comments
            if (empty($line) || str_starts_with($line, '#')) {
                continue;
            }

            // Parse interface declaration: "iface eth0 inet static"
            if (preg_match('/^iface\s+(\S+)\s+(inet6?)\s+(\S+)/', $line, $matches)) {
                $currentInterface = $matches[1];
                $currentFamily = $matches[2];
                $method = $matches[3];

                // Save first non-loopback interface name for resetLanInterface()
                if ($currentInterface !== 'lo' && $this->detectedInterface === 'eth0') {
                    $this->detectedInterface = $currentInterface;
                }

                // Track DHCP vs static for IPv4
                if ($currentFamily === 'inet') {
                    $settings['dhcp'] = ($method === 'dhcp') ? '1' : '0';
                }

                // Track IPv6 mode
                // Proxmox uses 'manual' or 'dhcp' for DHCPv6, 'static' for manual config
                // 'auto' is used for SLAAC-only
                if ($currentFamily === 'inet6') {
                    if (in_array($method, ['dhcp', 'manual', 'auto'], true)) {
                        // DHCPv6 or SLAAC - set Auto mode (mode 1)
                        $settings['ipv6_mode'] = '1';
                    }
                    // 'static' will be handled when address is parsed (sets mode 2)
                }
                continue;
            }

            // Skip loopback interface
            if ($currentInterface === 'lo') {
                continue;
            }

            // Parse address/netmask/gateway lines (indented with spaces/tabs)
            if ($currentInterface !== null && preg_match('/^\s*(address|netmask|gateway)\s+(\S+)/', $line, $matches)) {
                $key = $matches[1];
                $value = $matches[2];

                if ($currentFamily === 'inet6') {
                    // IPv6 settings
                    switch ($key) {
                        case 'address':
                            $settings['ipv6addr'] = $value;
                            $settings['ipv6_mode'] = '2'; // Manual mode
                            break;
                        case 'netmask':
                            $settings['ipv6_subnet'] = $value;
                            break;
                        case 'gateway':
                            $settings['ipv6_gateway'] = $value;
                            break;
                    }
                } else {
                    // IPv4 settings
                    switch ($key) {
                        case 'address':
                            $settings['ipaddr'] = $value;
                            break;
                        case 'netmask':
                            $settings['subnet'] = $this->netmaskToCidr($value);
                            break;
                        case 'gateway':
                            $settings['gateway'] = $value;
                            break;
                    }
                }
            }

            // Parse dns-nameservers: "dns-nameservers 8.8.8.8 8.8.4.4"
            if (preg_match('/^\s*dns-nameservers\s+(.+)$/i', $line, $matches)) {
                $dnsServers = preg_split('/\s+/', trim($matches[1]));
                if (!empty($dnsServers[0])) {
                    $settings['primarydns'] = $dnsServers[0];
                }
                if (!empty($dnsServers[1])) {
                    $settings['secondarydns'] = $dnsServers[1];
                }
            }

            // Parse dns-search: "dns-search example.com"
            if (preg_match('/^\s*dns-search\s+(.+)$/i', $line, $matches)) {
                $domains = preg_split('/\s+/', trim($matches[1]));
                if (!empty($domains[0])) {
                    $settings['domain'] = $domains[0];
                }
            }
        }

        // ALWAYS ensure interface is enabled and marked as internet-facing
        // This is critical for LXC containers to display IP in welcome banner
        // Even with DHCP (empty IP), these flags must be set
        $settings['internet'] = '1';
        $settings['disabled'] = '0';

        return $settings;
    }

    /**
     * Converts netmask to CIDR notation.
     *
     * @param string $netmask Netmask (e.g., "255.255.255.0") or CIDR (e.g., "24")
     * @return string CIDR prefix length (e.g., "24")
     */
    private function netmaskToCidr(string $netmask): string
    {
        // Already CIDR format
        if (is_numeric($netmask) && (int)$netmask >= 0 && (int)$netmask <= 32) {
            return $netmask;
        }

        // Convert dotted decimal to CIDR
        $long = ip2long($netmask);
        if ($long === false) {
            return '24'; // Default fallback
        }

        $cidr = 0;
        while ($long !== 0) {
            $cidr += ($long & 1);
            $long >>= 1;
        }

        return (string)$cidr;
    }

    /**
     * Determines if CloudInstanceId should be set for this provider.
     *
     * LXC is similar to NoCloud - on-premise installations where users control passwords.
     *
     * @return bool False - don't set CloudInstanceId for LXC
     */
    protected function shouldSetCloudInstanceId(): bool
    {
        return false;
    }

    /**
     * Returns the hardware type name for VirtualHardwareType setting.
     *
     * For LXC we return 'Lxc' instead of 'LxcCloud' for clarity.
     *
     * @return string Hardware type name
     */
    public function getHardwareTypeName(): string
    {
        return 'Lxc';
    }
}
