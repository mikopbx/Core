<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Core\System\Configs\DnsConf;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Utilities\IpAddressHelper;

/**
 * DHCPv6 client event handler for udhcpc6
 *
 * Processes DHCPv6 lease events (bound/renew/deconfig) and updates
 * network configuration and database. Supports dual-stack addressing
 * where DHCPv6 and SLAAC addresses coexist on the same interface.
 *
 * Environment variables received from udhcpc6:
 * - interface: Network interface name (e.g., 'eth0')
 * - ipv6: DHCPv6-assigned IPv6 address (e.g., '2001:db8:100::a123')
 * - mask: Prefix length (typically '128' for single address, or delegated prefix length)
 * - dns: IPv6 DNS servers (space-separated)
 * - domain: Domain name
 */
class Udhcpc6 extends Network
{
    /**
     * Main entry point for DHCPv6 events
     *
     * @param string $action Event type: 'deconfig', 'bound', 'renew'
     * @return void
     */
    public function configure(string $action): void
    {
        // Skip in Docker environment (IPv6 managed by container runtime in non-host mode)
        if (System::isDocker()) {
            SystemMessages::sysLogMsg(__METHOD__, "Skipped action $action (Docker environment)", LOG_DEBUG);
            return;
        }

        SystemMessages::sysLogMsg(__METHOD__, "Processing DHCPv6 event: $action", LOG_INFO);

        if ($action === 'deconfig') {
            $this->deconfigAction();
        } elseif ($action === 'bound' || $action === 'renew') {
            $this->renewBoundAction();
        }
    }

    /**
     * Handles DHCPv6 lease loss (deconfig event)
     *
     * ARCHITECTURAL DECISION: Do NOT remove SLAAC addresses
     * - DHCPv6 and SLAAC addresses can coexist on same interface
     * - Only clear DHCPv6-specific configuration from database
     * - SLAAC provides fallback connectivity
     * - IPv6 mode remains '1' (Auto) so SLAAC continues
     *
     * @return void
     */
    private function deconfigAction(): void
    {
        $interface = trim((string)getenv('interface'));

        SystemMessages::sysLogMsg(
            __METHOD__,
            "DHCPv6 lease lost on $interface - SLAAC fallback active",
            LOG_WARNING
        );

        // Update database to clear DHCPv6-acquired values
        // But keep IPv6 mode as '1' (Auto) so SLAAC continues
        $data = [
            'ipv6addr' => '',        // Clear DHCPv6 address
            'ipv6_subnet' => '',
            'ipv6_gateway' => '',
        ];
        $this->updateIfSettings($data, $interface);

        // Clear DHCPv6-acquired DNS servers
        $data = [
            'primarydns6' => '',
            'secondarydns6' => '',
        ];
        $this->updateDnsSettings($data, $interface);
    }

    /**
     * Handles DHCPv6 lease acquisition and renewal
     *
     * Environment variables from udhcpc6:
     * - ipv6: DHCPv6-assigned address (e.g., "2001:db8:100::a123")
     * - mask: Prefix length (typically "128" for single address)
     * - dns: DNS servers (space-separated IPv6 addresses)
     * - domain: Domain name
     * - interface: Interface name
     *
     * ARCHITECTURAL DECISION: Add DHCPv6 address alongside SLAAC
     * - Use 'ip -6 addr add' to add DHCPv6 address
     * - Both addresses coexist (DHCPv6 typically gets higher priority per RFC 6724)
     * - Prefix length usually 128 for DHCPv6 (single host address)
     *
     * @return void
     */
    private function renewBoundAction(): void
    {
        // Read environment variables from udhcpc6
        $env_vars = [
            'interface' => trim((string)getenv('interface')),
            'ipv6' => trim((string)getenv('ipv6')),         // DHCPv6 address
            'mask' => trim((string)getenv('mask')),         // Prefix length
            'dns' => trim((string)getenv('dns')),           // IPv6 DNS servers
            'domain' => trim((string)getenv('domain')),
        ];

        // Validate DHCPv6 address
        if (empty($env_vars['ipv6']) || !IpAddressHelper::isIpv6($env_vars['ipv6'])) {
            SystemMessages::sysLogMsg(__METHOD__, "Invalid DHCPv6 address received", LOG_ERR);
            return;
        }

        // DHCPv6 typically assigns /128 (single host) addresses
        // Use mask from server if provided, otherwise default to 128
        $prefix_len = !empty($env_vars['mask']) ? (int)$env_vars['mask'] : 128;
        if ($prefix_len < 1 || $prefix_len > 128) {
            $prefix_len = 128;
        }

        $actual_prefix = !empty($env_vars['mask']) ? $env_vars['mask'] : '128 (default)';
        SystemMessages::sysLogMsg(
            __METHOD__,
            "DHCPv6 lease obtained: {$env_vars['ipv6']}/{$actual_prefix} on {$env_vars['interface']}",
            LOG_INFO
        );

        // Add DHCPv6 address to interface alongside SLAAC address
        // Use ifconfig (same approach as IPv4 DHCP in Udhcpc.php)
        $ifconfig = Util::which('ifconfig');
        $interface = $env_vars['interface'];
        $ipv6_addr = $env_vars['ipv6'];

        // Add DHCPv6 address using ifconfig (matches IPv4 implementation)
        $cmd = "$ifconfig $interface inet6 add $ipv6_addr/$prefix_len";
        $result = Processes::mwExec($cmd, $output);
        SystemMessages::sysLogMsg(
            __METHOD__,
            "Executing: $cmd (result: $result, output: " . implode(' ', $output) . ")",
            LOG_DEBUG
        );

        // Parse DNS servers
        $named_dns = [];
        if (!empty($env_vars['dns'])) {
            $dns_array = explode(' ', $env_vars['dns']);
            // Validate each DNS server
            foreach ($dns_array as $dns) {
                $dns = trim($dns);
                if (!empty($dns) && IpAddressHelper::isIpv6($dns)) {
                    $named_dns[] = $dns;
                }
            }
        }

        // Save DHCPv6 configuration to database
        // Note: BusyBox udhcpc6 doesn't provide 'mask' variable, use computed $prefix_len
        $data = [
            'ipv6addr' => $env_vars['ipv6'],
            'ipv6_subnet' => (string)$prefix_len,
            'ipv6_gateway' => '',  // DHCPv6 typically doesn't provide gateway (use RA default route)
        ];
        $this->updateIfSettings($data, $env_vars['interface']);

        // Save DNS servers
        $data = [
            'primarydns6' => $named_dns[0] ?? '',
            'secondarydns6' => $named_dns[1] ?? '',
        ];
        $this->updateDnsSettings($data, $env_vars['interface']);

        // Check if this is the internet interface
        $if_data = LanInterfaces::findFirst("interface = '{$env_vars['interface']}'");
        $is_inet = ($if_data !== null) ? (int)$if_data->internet : 0;

        // Restart DNS if this is the internet interface
        if ($is_inet === 1) {
            $dnsConf = new DnsConf();
            $dnsConf->reStart();  // Regenerates /etc/resolv.conf with IPv6 DNS
        }

        SystemMessages::sysLogMsg(
            __METHOD__,
            "DHCPv6 configuration applied and saved to database",
            LOG_INFO
        );
    }
}
