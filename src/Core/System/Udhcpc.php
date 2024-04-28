<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

/**
 * Class Udhcpc
 *
 * @package MikoPBX\Core\System
 */
class Udhcpc extends Network
{
    /**
     * @param string $action
     * @return void
     */
    public function configure(string $action):void
    {
        /**
         * Check if running inside a Docker container.
         * If true, skip the action and exit the script.
         */
        if(Util::isDocker()){
            Util::sysLogMsg(__METHOD__, "Skipped action {$action}... because of docker", LOG_DEBUG);
            return;
        } else {
            Util::sysLogMsg(__METHOD__, "Starting action {$action}...", LOG_DEBUG);
        }

        if ($action === 'deconfig' && Util::isT2SdeLinux()) {
            /**
             * Perform deconfiguration for T2SDE Linux.
             */

            $this->deconfigAction();
        } elseif ('bound' === $action || 'renew' === $action) {
            if (Util::isSystemctl()) {
                /**
                 * Perform configuration renewal and bound actions using systemctl (systemd-based systems).
                 */
                $this->renewBoundSystemCtlAction();
            } elseif (Util::isT2SdeLinux()) {
                /**
                 * Perform configuration renewal and bound actions for T2SDE Linux.
                 */
                $this->renewBoundAction();
            }
        }
    }

    /**
     * Performs deconfiguration of the udhcpc configuration.
     */
    private function deconfigAction(): void
    {
        $interface = trim(getenv('interface'));

        // For MIKO LFS Edition.
        $ifconfig = Util::which('ifconfig');

        // Bring the interface up.
        Processes::mwExec("$ifconfig $interface up");

        // Set a default IP configuration for the interface.
        Processes::mwExec("$ifconfig $interface 192.168.2.1 netmask 255.255.255.0");
    }

    /**
     * Renews and configures the network settings after successful DHCP negotiation using systemd environment variables.
     * For OS systemctl (Debian).
     *  Configures LAN interface FROM dhcpc (renew_bound).
     * @return void
     */
    public function renewBoundSystemCtlAction(): void
    {
        $prefix = "new_";

        // Initialize the environment variables array.
        $env_vars = [
            'broadcast' => 'broadcast_address',
            'interface' => 'interface',
            'ip' => 'ip_address',
            'router' => 'routers',
            'timesvr' => '',
            'namesvr' => 'netbios_name_servers',
            'dns' => 'domain_name_servers',
            'hostname' => 'host_name',
            'subnet' => 'subnet_mask',
            'serverid' => '',
            'ipttl' => '',
            'lease' => 'new_dhcp_lease_time',
            'domain' => 'domain_name',
        ];

        // Get the values of environment variables.
        foreach ($env_vars as $key => $value) {
            $env_vars[$key] = trim(getenv("{$prefix}{$value}"));
        }

        /** @var LanInterfaces $if_data */
        $if_data = LanInterfaces::findFirst("interface = '{$env_vars['interface']}'");
        $is_inet = ($if_data !== null) ? (string)$if_data->internet : '0';

        $named_dns = [];
        if ('' !== $env_vars['dns']) {
            $named_dns = explode(' ', $env_vars['dns']);
        }
        if ($is_inet === '1') {
            // Only generate pdnsd config if this interface is for internet.
            $this->generatePdnsdConfig($named_dns);
        }

        // Save information to the database.
        $data = [
            'subnet' => '',
            'ipaddr' => $env_vars['ip'],
            'gateway' => $env_vars['router'],
        ];
        if (Verify::isIpAddress($env_vars['ip'])) {
            $data['subnet'] = $this->netMaskToCidr($env_vars['subnet']);
        }
        $this->updateIfSettings($data, $env_vars['interface']);
        $data = [
            'primarydns' => $named_dns[0] ?? '',
            'secondarydns' => $named_dns[1] ?? '',
        ];
        $this->updateDnsSettings($data, $env_vars['interface']);

        Processes::mwExec("/etc/rc/networking_set_mtu '{$env_vars['interface']}'");
    }

    /**
     * Processes DHCP renewal and binding for network interfaces.
     *
     * This function configures the network interface based on DHCP lease information.
     * It sets up the interface IP, subnet mask, default gateway, and static routes.
     * It also handles interface configuration deinitialization, DNS settings update, and MTU settings.
     *
     * @return void
     */
    public function renewBoundAction(): void
    {
        // Initialize an array to store environment variables related to network configuration.
        $env_vars = [
            'broadcast' => '', // 10.0.0.255
            'interface' => '', // eth0
            'ip' => '', // 10.0.0.249
            'router' => '', // 10.0.0.1
            'timesvr' => '',
            'namesvr' => '',
            'dns' => '', // 10.0.0.254
            'hostname' => '', // bad
            'subnet' => '', // 255.255.255.0
            'serverid' => '', // 10.0.0.1
            'ipttl' => '',
            'lease' => '', // 86400
            'domain' => '', // bad
            'mtu'=>'' , // 1500
            'staticroutes'=> '', // 0.0.0.0/0 10.0.0.1 169.254.169.254/32 10.0.0.65 0.0.0.0/0 10.0.0.1
            'mask' => '', // 24
        ];

        // Check for debug mode to enable logging.
        $debugMode = $this->di->getShared('config')->path('core.debugMode');

        // Retrieve and trim the values of the required environment variables.
        foreach ($env_vars as $key => $value) {
            $env_vars[$key] = trim(getenv($key));
        }
        unset($value);

        // Configure broadcast address if provided, otherwise leave it blank.
        $BROADCAST = !empty($env_vars['broadcast']) ? "broadcast {$env_vars['broadcast']}" : "";

        // Handle subnet mask for /32 assignments and other cases.
        $NET_MASK = (!empty($env_vars['subnet']) && $env_vars['subnet'] !== '255.255.255.255') ? "netmask {$env_vars['subnet']}" : "";

        // Configure the network interface with the provided IP, broadcast, and subnet mask.
        $ifconfig = Util::which('ifconfig');
        Processes::mwExec("$ifconfig {$env_vars['interface']} {$env_vars['ip']} $BROADCAST $NET_MASK");


        // Remove any existing default gateway routes associated with this interface.
        while (true) {
            $out = [];
            Processes::mwExec("route del default gw 0.0.0.0 dev {$env_vars['interface']}", $out);
            if (trim(implode('', $out)) !== '') {
                // An error occurred, indicating that all routes have been cleared.
                break;
            }
            if ($debugMode) {
                break;
            } // Otherwise, it will be an infinite loop.
        }

        // Add a default gateway route if a router address is provided and the interface is for the internet.
        $if_data = LanInterfaces::findFirst("interface = '{$env_vars['interface']}'");
        $is_inet = ($if_data !== null) ? (int)$if_data->internet : 0;
        if (!empty($env_vars['router']) && $is_inet === 1) {
            // Only add the default route if this interface is for the internet.
            $routers = explode(' ', $env_vars['router']);
            foreach ($routers as $router) {
                Processes::mwExec("route add default gw {$router} dev {$env_vars['interface']}");
            }
        }

        // Add custom static routes if any are provided.
        $this->addStaticRoutes($env_vars['staticroutes'], $env_vars['interface']);

        // Add custom routes.
        $this->addCustomStaticRoutes($env_vars['interface']);

        // Setup DNS.
        $named_dns = [];
        if ('' !== $env_vars['dns']) {
            $named_dns = explode(' ', $env_vars['dns']);
        }
        if ($is_inet === 1) {
            // Only generate pdnsd config if this interface is for internet.
            $this->generatePdnsdConfig($named_dns);
        }

        // Save information to the database.
        $data = [
            'subnet' => '',
            'ipaddr' => $env_vars['ip'],
            'gateway' => $env_vars['router'],
        ];
        if (Verify::isIpAddress($env_vars['ip'])) {
            $data['subnet'] = $this->netMaskToCidr($env_vars['subnet']);
        }

        $this->updateIfSettings($data, $env_vars['interface']);

        $data = [
            'primarydns' => $named_dns[0] ?? '',
            'secondarydns' => $named_dns[1] ?? '',
        ];
        $this->updateDnsSettings($data, $env_vars['interface']);

        Processes::mwExec("/etc/rc/networking_set_mtu '{$env_vars['interface']}'");
    }

    /**
     * Add static routes based on DHCP provided static routes information.
     * Parses the `staticroutes` environment variable and adds each route to the system.
     *
     * @param string $staticRoutes The static routes string from DHCP, format: "destination gateway"
     * @param string $interface The network interface to add routes to, e.g., eth0
     * @return void
     */
    private function addStaticRoutes(string $staticRoutes, string $interface): void
    {
        if (empty($staticRoutes)) {
            return;
        }

        // Split the static routes string into individual routes.
        $routes = explode(' ', $staticRoutes);
        $processedRoutes = []; // To keep track of processed routes and avoid duplicates.

        $ip = Util::which('ip');

        // Iterate through the routes, adding each to the system.
        $countRoutes = count($routes);
        for ($i = 0; $i < $countRoutes; $i += 2) {
            $destination = $routes[$i];
            $gateway = $routes[$i + 1] ?? '';

            // Check if the route has already been processed to prevent duplicates.
            if (!empty($destination) && !empty($gateway) && !in_array($destination, $processedRoutes)) {
                Processes::mwExec("$ip route add $destination via $gateway dev $interface");
                $processedRoutes[] = $destination; // Mark this route as processed.
            }
        }
    }
}