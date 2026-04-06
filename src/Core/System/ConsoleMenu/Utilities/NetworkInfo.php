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

namespace MikoPBX\Core\System\ConsoleMenu\Utilities;

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Di;
use Phalcon\Translate\Adapter\NativeArray;

/**
 * Network information display utility
 *
 * Shows detailed network configuration:
 * - All IPv4 addresses with DHCP/Static labels
 * - All IPv6 addresses with DHCPv6/SLAAC/link-local labels
 * - Routing tables (IPv4 and IPv6)
 * - DNS servers (IPv4 and IPv6)
 */
class NetworkInfo
{
    private NativeArray $translation;

    public function __construct()
    {
        $di = Di::getDefault();
        $this->translation = $di->getShared(TranslationProvider::SERVICE_NAME);
    }

    /**
     * Display comprehensive network information
     *
     * @return void
     */
    public function display(): void
    {
        $this->clearScreen();
        $this->printHeader();
        $this->displayInterfaces();
        $this->displayRoutes();
        $this->displayDns();
    }

    /**
     * Clear screen
     *
     * @return void
     */
    private function clearScreen(): void
    {
        echo "\033[2J\033[H";
    }

    /**
     * Print header
     *
     * @return void
     */
    private function printHeader(): void
    {
        $title = $this->translation->_('cm_NetworkInformation');
        $line = str_repeat('=', 70);
        echo "\n$line\n";
        echo "  $title\n";
        echo "$line\n\n";
    }

    /**
     * Display interface information with IPv4 and IPv6 addresses
     *
     * @return void
     */
    private function displayInterfaces(): void
    {
        $interfaces = LanInterfaces::find()->toArray();

        foreach ($interfaces as $ifData) {
            // Generate real interface name (vlan{id} for VLANs)
            $baseInterface = $ifData['interface'] ?? 'unknown';
            $vlanId = $ifData['vlanid'] ?? '0';
            $ifName = ($vlanId > 0) ? "vlan{$vlanId}" : $baseInterface;

            // Add VLAN ID label for VLAN interfaces
            $vlanLabel = ($vlanId > 0) ? " \033[0;36m(VLAN ID: $vlanId)\033[0m" : "";
            echo "Interface: \033[1;33m$ifName\033[0m$vlanLabel\n";
            echo str_repeat('-', 50) . "\n";

            // IPv4 Configuration
            $this->displayIpv4Config($ifData, $ifName);

            // IPv6 Configuration
            $this->displayIpv6Config($ifData, $ifName);

            echo "\n";
        }
    }

    /**
     * Display IPv4 configuration for an interface
     *
     * @param array $ifData Interface data from database
     * @param string $ifName Interface name
     * @return void
     */
    private function displayIpv4Config(array $ifData, string $ifName): void
    {
        echo "  \033[1;36mIPv4:\033[0m\n";

        $dhcp = ($ifData['dhcp'] ?? '0') === '1';
        $ipaddr = $ifData['ipaddr'] ?? '';
        $subnet = $ifData['subnet'] ?? '';
        $gateway = $ifData['gateway'] ?? '';

        if ($dhcp) {
            // Get current DHCP-assigned address
            $currentIp = $this->getCurrentIpv4Address($ifName);
            if (!empty($currentIp)) {
                echo "    Address: $currentIp \033[0;32m(DHCP)\033[0m\n";
            } else {
                echo "    Mode: \033[0;32mDHCP\033[0m (waiting for address)\n";
            }
        } elseif (!empty($ipaddr)) {
            echo "    Address: $ipaddr/$subnet \033[0;34m(Static)\033[0m\n";
            if (!empty($gateway)) {
                echo "    Gateway: $gateway\n";
            }
        } else {
            echo "    Status: \033[0;31mDisabled\033[0m\n";
        }
    }

    /**
     * Display IPv6 configuration for an interface
     *
     * @param array $ifData Interface data from database
     * @param string $ifName Interface name
     * @return void
     */
    private function displayIpv6Config(array $ifData, string $ifName): void
    {
        echo "  \033[1;36mIPv6:\033[0m\n";

        $ipv6Mode = $ifData['ipv6_mode'] ?? '0';

        switch ($ipv6Mode) {
            case '1':
                // Auto mode (DHCPv6 + SLAAC)
                $this->displayAutoIpv6Addresses($ifName);
                break;
            case '2':
                // Manual mode
                $ipv6addr = $ifData['ipv6addr'] ?? '';
                $ipv6_subnet = $ifData['ipv6_subnet'] ?? '';
                $ipv6_gateway = $ifData['ipv6_gateway'] ?? '';

                if (!empty($ipv6addr)) {
                    echo "    Address: $ipv6addr/$ipv6_subnet \033[0;34m(Static)\033[0m\n";
                    if (!empty($ipv6_gateway)) {
                        echo "    Gateway: $ipv6_gateway\n";
                    }
                }
                // Also show any auto-configured addresses
                $this->displayAutoIpv6Addresses($ifName, true);
                break;
            default:
                echo "    Status: \033[0;31mDisabled\033[0m\n";
                break;
        }
    }

    /**
     * Display auto-configured IPv6 addresses from the interface
     *
     * @param string $ifName Interface name
     * @param bool $excludeStatic Exclude the primary static address
     * @return void
     */
    private function displayAutoIpv6Addresses(string $ifName, bool $excludeStatic = false): void
    {
        $addresses = $this->getInterfaceIpv6Addresses($ifName);

        if (empty($addresses)) {
            echo "    Status: \033[0;33mWaiting for address\033[0m\n";
            return;
        }

        // Sort addresses: global scope first, then link-local
        usort($addresses, function($a, $b) {
            $scopeOrder = ['global' => 0, 'link' => 1, 'host' => 2];
            $orderA = $scopeOrder[$a['scope'] ?? 'link'] ?? 3;
            $orderB = $scopeOrder[$b['scope'] ?? 'link'] ?? 3;
            return $orderA <=> $orderB;
        });

        foreach ($addresses as $addr) {
            $ip = $addr['ip'];
            $prefix = $addr['prefix'];
            $type = $this->determineIpv6AddressType($ip, $addr['scope'] ?? 'global');

            // Format output based on address type
            $colorCode = match ($type) {
                'DHCPv6' => '0;32',
                'SLAAC' => '0;33',
                'link-local' => '0;35',
                default => '0;37',
            };

            echo "    Address: $ip/$prefix \033[{$colorCode}m($type)\033[0m\n";
        }
    }

    /**
     * Get current IPv4 address from interface
     *
     * @param string $ifName Interface name
     * @return string IPv4 address or empty string
     */
    private function getCurrentIpv4Address(string $ifName): string
    {
        $ipPath = Util::which('ip');
        if (empty($ipPath)) {
            return '';
        }

        $output = [];
        exec("$ipPath -4 addr show $ifName 2>/dev/null | grep 'inet ' | awk '{print \$2}'", $output);

        if (!empty($output[0])) {
            return trim($output[0]);
        }

        return '';
    }

    /**
     * Get all IPv6 addresses from interface
     *
     * @param string $ifName Interface name
     * @return array Array of addresses with ip, prefix, and scope
     */
    private function getInterfaceIpv6Addresses(string $ifName): array
    {
        $ipPath = Util::which('ip');
        if (empty($ipPath)) {
            return [];
        }

        $output = [];
        exec("$ipPath -6 addr show $ifName 2>/dev/null", $output);

        $addresses = [];
        foreach ($output as $line) {
            if (preg_match('/inet6\s+([0-9a-f:]+)\/(\d+)\s+scope\s+(\w+)/', $line, $matches)) {
                $addresses[] = [
                    'ip' => $matches[1],
                    'prefix' => $matches[2],
                    'scope' => $matches[3],
                ];
            }
        }

        return $addresses;
    }

    /**
     * Determine IPv6 address type based on prefix and characteristics
     *
     * @param string $ip IPv6 address
     * @param string $scope Address scope (global, link, host)
     * @return string Address type description
     */
    private function determineIpv6AddressType(string $ip, string $scope): string
    {
        // Link-local addresses (fe80::)
        if (str_starts_with(strtolower($ip), 'fe80:')) {
            return 'link-local';
        }

        // Loopback (::1)
        if ($ip === '::1') {
            return 'loopback';
        }

        // Check for EUI-64 pattern (SLAAC typically uses EUI-64 or random)
        // EUI-64 has ff:fe in the middle of the interface identifier
        if (preg_match('/::[\da-f]{0,4}:[\da-f]{0,4}:[\da-f]{2}ff:fe[\da-f]{2}:[\da-f]{4}$/i', $ip)) {
            return 'SLAAC';
        }

        // DHCPv6 addresses are typically global scope without EUI-64
        if ($scope === 'global') {
            // Check if address looks like it could be from DHCPv6
            // DHCPv6 often assigns sequential or patterned addresses
            return 'DHCPv6';
        }

        return 'auto';
    }

    /**
     * Display routing tables for IPv4 and IPv6
     *
     * @return void
     */
    private function displayRoutes(): void
    {
        echo $this->translation->_('cm_RoutingTables') . ":\n";
        echo str_repeat('-', 50) . "\n";

        // IPv4 routes
        echo "  \033[1;36mIPv4 Routes:\033[0m\n";
        $this->displayRoutingTable(4);

        // IPv6 routes
        echo "  \033[1;36mIPv6 Routes:\033[0m\n";
        $this->displayRoutingTable(6);

        echo "\n";
    }

    /**
     * Display routing table for specific IP version
     *
     * @param int $version IP version (4 or 6)
     * @return void
     */
    private function displayRoutingTable(int $version): void
    {
        $ipPath = Util::which('ip');
        if (empty($ipPath)) {
            echo "    (ip command not available)\n";
            return;
        }

        $flag = $version === 6 ? '-6' : '-4';
        $output = [];
        exec("$ipPath $flag route show 2>/dev/null", $output);

        if (empty($output)) {
            echo "    (no routes)\n";
            return;
        }

        foreach ($output as $line) {
            // Highlight default route
            if (str_starts_with($line, 'default')) {
                echo "    \033[1;32m$line\033[0m\n";
            } else {
                echo "    $line\n";
            }
        }
    }

    /**
     * Display DNS configuration
     *
     * @return void
     */
    private function displayDns(): void
    {
        echo $this->translation->_('cm_DnsServers') . ":\n";
        echo str_repeat('-', 50) . "\n";

        // Read DNS from database
        $interface = LanInterfaces::findFirst(['internet = "1"']);

        if ($interface) {
            $dnsServers = [];

            // IPv4 DNS
            if (!empty($interface->primarydns)) {
                $dnsServers[] = ['ip' => $interface->primarydns, 'type' => 'IPv4 Primary'];
            }
            if (!empty($interface->secondarydns)) {
                $dnsServers[] = ['ip' => $interface->secondarydns, 'type' => 'IPv4 Secondary'];
            }

            // IPv6 DNS
            if (!empty($interface->primarydns6)) {
                $dnsServers[] = ['ip' => $interface->primarydns6, 'type' => 'IPv6 Primary'];
            }
            if (!empty($interface->secondarydns6)) {
                $dnsServers[] = ['ip' => $interface->secondarydns6, 'type' => 'IPv6 Secondary'];
            }

            if (!empty($dnsServers)) {
                foreach ($dnsServers as $dns) {
                    echo "  {$dns['ip']} \033[0;36m({$dns['type']})\033[0m\n";
                }
            } else {
                echo "  (using system defaults)\n";
            }
        }

        // Also show current resolv.conf
        echo "\n  \033[1;36mActive resolv.conf:\033[0m\n";
        if (file_exists('/etc/resolv.conf')) {
            $content = file_get_contents('/etc/resolv.conf');
            $lines = explode("\n", $content);
            foreach ($lines as $line) {
                $line = trim($line);
                if (!empty($line) && !str_starts_with($line, '#')) {
                    echo "  $line\n";
                }
            }
        } else {
            echo "  (resolv.conf not found)\n";
        }

        echo "\n";
    }

    /**
     * Get network information as array for programmatic use
     *
     * @return array Network information
     */
    public function getInfo(): array
    {
        $info = [
            'interfaces' => [],
            'routes' => [
                'ipv4' => [],
                'ipv6' => [],
            ],
            'dns' => [],
        ];

        // Collect interface data
        $interfaces = LanInterfaces::find()->toArray();
        foreach ($interfaces as $ifData) {
            // Generate real interface name (vlan{id} for VLANs)
            $baseInterface = $ifData['interface'] ?? 'unknown';
            $vlanId = $ifData['vlanid'] ?? '0';
            $ifName = ($vlanId > 0) ? "vlan{$vlanId}" : $baseInterface;

            $info['interfaces'][$ifName] = [
                'ipv4' => [
                    'dhcp' => ($ifData['dhcp'] ?? '0') === '1',
                    'address' => $ifData['ipaddr'] ?? '',
                    'subnet' => $ifData['subnet'] ?? '',
                    'gateway' => $ifData['gateway'] ?? '',
                    'current' => $this->getCurrentIpv4Address($ifName),
                ],
                'ipv6' => [
                    'mode' => $ifData['ipv6_mode'] ?? '0',
                    'address' => $ifData['ipv6addr'] ?? '',
                    'subnet' => $ifData['ipv6_subnet'] ?? '',
                    'gateway' => $ifData['ipv6_gateway'] ?? '',
                    'addresses' => $this->getInterfaceIpv6Addresses($ifName),
                ],
            ];
        }

        return $info;
    }
}
