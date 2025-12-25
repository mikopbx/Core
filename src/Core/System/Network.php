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
use MikoPBX\Common\Models\NetworkStaticRoutes;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Configs\DnsConf;
use MikoPBX\Core\Utilities\IpAddressHelper;
use MikoPBX\Core\Utilities\SubnetCalculator;
use MikoPBX\PBXCoreREST\Lib\Sysinfo\GetExternalIpInfoAction;
use Phalcon\Di\Injectable;
use Throwable;

/**
 * Class Network
 *
 *
 *
 * @package MikoPBX\Core\System
 */
class Network extends Injectable
{
    public const string INTERNET_FLAG_FILE = '/var/etc/internet_flag';

    /**
     * Retrieves the names of all PCI network interfaces.
     *
     * @return array<string> An array containing the names of the network interfaces.
     */
    public function getInterfacesNames(): array
    {
        $grep = Util::which('grep');
        $awk = Util::which('awk');
        if (System::isDocker()) {
            $ifconfig = Util::which('ifconfig');
            $command = "$ifconfig | $grep -o -E '^[a-zA-Z0-9]+' | $grep -v 'lo'";
        } else {
            // Universal command to retrieve all PCI network interfaces.
            $ls = Util::which('ls');
            $command = "$ls -l /sys/class/net | $grep devices | $grep -v virtual | $awk '{ print $9 }'";
        }
        Processes::mwExec($command, $names);
        return $names;
    }

    /**
     * Configures the LAN settings inside the Docker container.
     *
     * If the environment is not Docker, this method does nothing.
     *
     * @return void
     */
    public function configureLanInDocker(): void
    {
        // Check if the environment is Docker
        if (!System::isDocker()) {
            return;
        }

        // Find the path to the busybox binary
        $ifconfig = Util::which('ifconfig');
        $route = Util::which('route');
        $awk = Util::which('awk');
        $hostname = Util::which('hostname');

        // Retrieve the network settings
        $networks = $this->getGeneralNetSettings();

        foreach ($networks as $if_data) {

            // Keep original interface name for database operations
            $if_name = trim($if_data['interface']);
            // Escape for shell commands only
            $if_name_escaped = escapeshellarg($if_name);

            $commands = [
                'subnet' => $ifconfig . ' '.$if_name_escaped.' | '.$awk.' \'/Mask:/ {sub("Mask:", "", $NF); print $NF}\'',
                'ipaddr' => $ifconfig . ' '.$if_name_escaped.' | '.$awk.' \'/inet / {sub("addr:", "", $2); print $2}\'',
                'gateway' => $route . ' -n | '.$awk.' \'/^0.0.0.0/ {print $2}\'',
                'hostname' => $hostname,
            ];

            $data = [];
            foreach ($commands as $key => $command) {
                $output = [];
                if (Processes::MWExec($command, $output) === 0) {
                    $value = implode("", $output);
                    if ($key === 'subnet') {
                        $data[$key] = $this->netMaskToCidr($value);
                    } else {
                        $data[$key] = $value;
                    }
                }
            }

            // Save information to the database using original (unescaped) interface name
            $this->updateIfSettings($data, $if_name);
        }

    }

    /**
     * Retrieves the general network settings and performs additional processing.
     *
     * @return array<string, mixed> An array of network interfaces and their settings.
     */
    public function getGeneralNetSettings(): array
    {
        // Get the list of network interfaces visible to the operating system
        $src_array_eth = $this->getInterfacesNames();

        // Create a copy of the network interfaces array
        $array_eth = $src_array_eth;

        // Retrieve the LAN interface settings from the database
        $res = LanInterfaces::find(['order' => 'interface,vlanid']);
        $networks = $res->toArray();

        if (count($networks) > 0) {
            // Additional data processing
            foreach ($networks as &$if_data) {
                $if_data['interface_orign'] = $if_data['interface'];
                $if_data['interface'] = ($if_data['vlanid'] > 0) ? "vlan{$if_data['vlanid']}" : $if_data['interface'];
                $if_data['dhcp'] = ($if_data['vlanid'] > 0) ? 0 : $if_data['dhcp'];

                if (Verify::isIpAddress($if_data['subnet'])) {
                    $if_data['subnet'] = $this->netMaskToCidr($if_data['subnet']);
                }

                $key = array_search($if_data['interface_orign'], $src_array_eth, true);
                if ($key !== false) {
                    // Base interface found
                    if ($if_data['vlanid'] === '0') {
                        // Regular interface (not VLAN)
                        unset($array_eth[$key]);
                        $this->enableLanInterface($if_data['interface_orign']);
                    } else {
                        // VLAN interface - check if VLAN interface itself exists
                        $vlan_key = array_search($if_data['interface'], $src_array_eth, true);
                        if ($vlan_key !== false) {
                            // VLAN interface exists physically (e.g., Docker host mode)
                            unset($array_eth[$vlan_key]);
                        } else {
                            // VLAN interface does not exist (e.g., Docker bridge mode)
                            // Delete VLAN from database as it cannot be used
                            $this->deleteLanInterfaceByVlanId($if_data['interface_orign'], $if_data['vlanid']);
                            SystemMessages::sysLogMsg(__METHOD__, "VLAN interface {$if_data['interface']} deleted - not supported in current environment");
                            // Mark as disabled in the returned array to skip further processing
                            $if_data['disabled'] = 1;
                        }
                    }
                } else {
                    // Base interface does not exist
                    $this->disableLanInterface($if_data['interface_orign']);
                    // Disable the interface
                    $if_data['disabled'] = 1;
                }
            }
            unset($if_data);
        } elseif (count($array_eth) > 0) {
            $networks = [];
            // Configure the main interface
            $networks[] = $this->addLanInterface($array_eth[0], true);
            unset($array_eth[0]);
        }
        // $array_eth will contain only the elements without settings in the database
        // Add the "default" settings for these interfaces
        foreach ($array_eth as $eth) {
            // Add the interface and disable it
            $networks[] = $this->addLanInterface($eth, false);
        }

        // Check if there is an active internet interface, if not, set the first available interface as internet
        $res = LanInterfaces::findFirst("internet = '1' AND disabled='0'");
        if (null === $res) {
            /** @var LanInterfaces $eth_settings */
            $eth_settings = LanInterfaces::findFirst("disabled='0'");
            if ($eth_settings !== null) {
                $eth_settings->internet = '1';
                if (PbxSettings::getValueByKey(PbxSettings::ENABLE_USE_NAT)==='1'){
                    $eth_settings->topology=LanInterfaces::TOPOLOGY_PRIVATE;
                }
                $eth_settings->save();
            }
        }

        return $networks;
    }

    /**
     * Converts a net mask to CIDR notation (IPv4 only).
     *
     * This method converts IPv4 dotted-decimal subnet masks (e.g., "255.255.255.0")
     * to CIDR prefix length notation (e.g., 24).
     *
     * Note: This method is IPv4-specific. IPv6 does not use dotted-decimal subnet masks;
     * IPv6 prefix lengths are already stored directly as integers (1-128).
     *
     * @param string $net_mask The IPv4 net mask in dotted-decimal format (e.g., "255.255.255.0")
     * @return int The CIDR prefix length (0-32 for IPv4)
     */
    public function netMaskToCidr(string $net_mask): int
    {
        $bits = 0;
        $net_mask = explode(".", $net_mask);

        foreach ($net_mask as $oct_ect) {
            $bits += strlen(str_replace("0", "", decbin((int)$oct_ect)));
        }

        return $bits;
    }

    /**
     * Enables a LAN interface
     *
     * @param string $name The name of the interface to enable.
     * @return void
     */
    public function enableLanInterface(string $name): void
    {
        $parameters = [
            'conditions' => 'interface = :ifName: and disabled = :disabled:',
            'bind' => [
                'ifName' => $name,
                'disabled' => 1,
            ],
        ];

        $if_data = LanInterfaces::findFirst($parameters);
        if ($if_data !== null) {
            $if_data->disabled = 0;
            $if_data->update();
        }
    }

    /**
     * Disables a LAN interface by setting its internet flag to 0 and disabled flag to 1.
     *
     * @param string $name The name of the interface to disable.
     * @return void
     */
    public function disableLanInterface(string $name): void
    {
        $if_data = LanInterfaces::findFirst([
            'conditions' => 'interface = :name:',
            'bind' => ['name' => $name]
        ]);
        if ($if_data !== null) {
            $if_data->internet = 0;
            $if_data->disabled = 1;
            $if_data->update();
        }
    }

    /**
     * Disables a VLAN interface by interface name and VLAN ID.
     *
     * @param string $name The name of the base interface.
     * @param string|int $vlanId The VLAN ID.
     * @return void
     */
    public function disableLanInterfaceByVlanId(string $name, string|int $vlanId): void
    {
        $parameters = [
            'conditions' => 'interface = :ifName: AND vlanid = :vlanId:',
            'bind' => [
                'ifName' => $name,
                'vlanId' => (string)$vlanId,
            ],
        ];

        $if_data = LanInterfaces::findFirst($parameters);
        if ($if_data !== null) {
            $if_data->internet = 0;
            $if_data->disabled = 1;
            $if_data->update();
        }
    }

    /**
     * Deletes a VLAN interface by interface name and VLAN ID.
     *
     * @param string $name The name of the base interface.
     * @param string|int $vlanId The VLAN ID.
     * @return void
     */
    public function deleteLanInterfaceByVlanId(string $name, string|int $vlanId): void
    {
        $parameters = [
            'conditions' => 'interface = :ifName: AND vlanid = :vlanId:',
            'bind' => [
                'ifName' => $name,
                'vlanId' => (string)$vlanId,
            ],
        ];

        $if_data = LanInterfaces::findFirst($parameters);
        if ($if_data !== null) {
            $if_data->delete();
        }
    }

    /**
     * Adds a LAN interface with the specified name and settings.
     *
     * @param string $name The name of the interface.
     * @param bool $general Flag indicating if the interface is a general interface.
     * @return array<string, mixed> The array representation of the added interface.
     */
    private function addLanInterface(string $name, bool $general = false): array
    {
        $data = new LanInterfaces();
        $data->name = $name;
        $data->interface = $name;
        $data->dhcp = '1';
        $data->internet = ($general === true) ? '1' : '0';
        $data->disabled = '0';
        $data->vlanid = '0';
        $data->hostname = 'MikoPBX';
        $data->domain = '';
        $data->topology = LanInterfaces::TOPOLOGY_PRIVATE;
        $data->primarydns = '';
        $data->save();

        return $data->toArray();
    }

    /**
     * Updates the interface settings with the provided data.
     *
     * @param array<string, mixed> $data The data to update the interface settings with.
     * @param string $name The name of the interface.
     * @return void;
     */
    public function updateIfSettings(array $data, string $name): void
    {
        /** @var LanInterfaces $res */
        $res = LanInterfaces::findFirst([
            'conditions' => 'interface = :name: AND vlanid = 0',
            'bind' => ['name' => $name]
        ]);
        if ($res === null || !$this->settingsIsChange($data, $res->toArray())) {
            return;
        }
        foreach ($data as $key => $value) {
            $res->writeAttribute($key, $value);
        }
        $res->save();
    }

    /**
     * Checks if the network settings have changed.
     *
     * @param array<string, mixed> $data The new network settings.
     * @param array<string, mixed> $dbData The existing network settings from the database.
     * @return bool  Returns true if the settings have changed, false otherwise.
     */
    public function settingsIsChange(array $data, array $dbData): bool
    {
        $isChange = false;
        foreach ($dbData as $key => $value) {
            if (!isset($data[$key]) || (string)$value === (string)$data[$key]) {
                continue;
            }
            SystemMessages::sysLogMsg(__METHOD__, "Find new network settings: $key changed $value=>$data[$key]");
            $isChange = true;
        }
        return $isChange;
    }

    /**
     * Updates the DNS settings with the provided data.
     *
     * @param array<string, mixed> $data The data to update the DNS settings with.
     * @param string $name The name of the interface.
     * @return void
     */
    public function updateDnsSettings(array $data, string $name): void
    {
        /** @var LanInterfaces $res */
        $res = LanInterfaces::findFirst([
            'conditions' => 'interface = :name: AND vlanid = 0',
            'bind' => ['name' => $name]
        ]);
        if ($res === null || !$this->settingsIsChange($data, $res->toArray())) {
            return;
        }
        foreach ($data as $key => $value) {
            $res->writeAttribute($key, $value);
        }
        if (empty($res->primarydns) && !empty($res->secondarydns)) {
            // Swap primary and secondary DNS if primary is empty
            $res->primarydns = $res->secondarydns;
            $res->secondarydns = '';
        }
        if (empty($res->primarydns6) && !empty($res->secondarydns6)) {
            // Swap primary and secondary IPv6 DNS if primary is empty
            $res->primarydns6 = $res->secondarydns6;
            $res->secondarydns6 = '';
        }
        $res->save();
    }

    /**
     * Retrieves the interface name by its ID.
     *
     * @param string $id_net The ID of the network interface.
     *
     * @return string  The interface name.
     */
    public function getInterfaceNameById(string $id_net): string
    {
        $res = LanInterfaces::findFirstById($id_net);
        if ($res !== null && $res->interface !== null) {
            return $res->interface;
        }

        return '';
    }

    /**
     * Retrieves the enabled LAN interfaces.
     *
     * @return array<string, mixed>  An array of enabled LAN interfaces.
     */
    public function getEnabledLanInterfaces(): array
    {
        /** @var LanInterfaces $res */
        $res = LanInterfaces::find('disabled=0');

        return $res->toArray();
    }

    /**
     * Updates the network settings with the provided data.
     * @param array<string, mixed> $data The network settings data to update.
     * @return bool
     */
    public function updateNetSettings(array $data): bool
    {
        if(isset( $data['internet']) ){
            $filter = [
                "interface <> :interface: AND internet = '1'",
                'bind' => [
                    'interface' => $data['interface']
                ]
            ];
            $res = LanInterfaces::findFirst($filter);
            if($res){
                $res->internet = 0;
                $res->save();
            }
        }
        $filter = [
            "interface = :interface:",
            'bind' => [
                'interface' => $data['interface']
            ]
        ];
        $res = LanInterfaces::findFirst($filter);
        if ($res === null) {
            return false;
        }
        foreach ($data as $key => $value) {
            $res->$key = $value;
        }
        if(isset($data['internet'])){
            $res->internet = 1;
        }
        return $res->save();
    }

    /**
     * Update external IP address
     */
    public function updateExternalIp(): void
    {
        if (PbxSettings::getValueByKey(PbxSettings::AUTO_UPDATE_EXTERNAL_IP)!=='1'){
            return;
        }
        $ipInfoResult = GetExternalIpInfoAction::main();
        if ($ipInfoResult->success && isset($ipInfoResult->data['ip'])) {
            $currentIP = $ipInfoResult->data['ip'];
            $lanData = LanInterfaces::find('internet=1');
            foreach ($lanData as $lan) {
                $oldExtIp = $lan->extipaddr;
                if ($oldExtIp !== $currentIP) {
                    $lan->extipaddr = $currentIP;
                    if ($lan->save()) {
                        SystemMessages::sysLogMsg(__METHOD__, "External IP address updated for interface $lan->interface");
                    }
                }
            }
        }
    }

    /**
     * Execute cli command to set up network
     * @param string $action Action to perform (start or stop)
     * @return void
     */
    public function cliAction(string $action): void
    {
        /**
         * If running inside a Docker container, exit the script.
         */
        if (System::isDocker()) {
            return;
        }

        if ('start' === $action) {

            /**
             * Generate the resolv.conf file for DNS configuration.
             */
            $dnsConf = new DnsConf();
            $dnsConf->resolveConfGenerate($this->getHostDNS());
            $dnsConf->reStart();

            if (Util::isT2SdeLinux()) {
                /**
                 * Configure the loopback interface for T2SDE Linux.
                 */
                $this->loConfigure();
            }
            /**
             * Configure the LAN interfaces.
             */
            $this->lanConfigure();
        } elseif ('stop' === $action) {
            if (Util::isSystemctl()) {
                /**
                 * Stop networking using systemctl (systemd-based systems).
                 */
                $systemctl = Util::which('systemctl');
                Processes::mwExec("$systemctl stop networking");
            } else {
                /**
                 * Stop networking on T2SDE (non-systemd) systems.
                 */
                $if_list = $this->getInterfaces();
                $arr_commands = [];
                $ifconfig = Util::which('ifconfig');
                foreach ($if_list as $if_name => $data) {
                    $arr_commands[] = "$ifconfig $if_name down";
                }

                /**
                 * Execute the stop commands for each interface.
                 */
                Processes::mwExecCommands($arr_commands, $out, 'net_stop');
            }
        }
    }

    /**
     * Retrieves the hostname and domain information.
     *
     * @return array<string, string> An array containing the hostname and domain.
     */
    public static function getHostName(): array
    {
        // Initialize default hostname and domain
        $data = [
            'hostname' => 'mikopbx',
            'domain' => '',
        ];

        // Find the first LanInterfaces record with internet set to '1'
        /** @var LanInterfaces $res */
        $res = LanInterfaces::findFirst("internet = '1'");

        // If a matching record is found, update the hostname and domain
        if (null !== $res) {
            $data['hostname'] = $res->hostname;
            $data['domain'] = $res->domain;
        }

        // If the hostname is empty, set it to the default value 'mikopbx'
        $data['hostname'] = (empty($data['hostname'])) ? 'mikopbx' : $data['hostname'];

        return $data;
    }

    /**
     * Retrieves the DNS servers configured for the host.
     *
     * @return array<string> An array containing the DNS servers.
     */
    public function getHostDNS(): array
    {
        $dns = [];

        // Find the first LanInterfaces record with internet set to '1'
        /** @var LanInterfaces $res */
        $res = LanInterfaces::findFirst("internet = '1'");

        // If a matching record is found, check and add primary and secondary DNS servers
        if (null !== $res) {
            // Check and add primary DNS server if not empty and not '127.0.0.1'
            if (!empty($res->primarydns) && '127.0.0.1' !== $res->primarydns) {
                $dns[] = $res->primarydns;
            }
            // Check and add secondary DNS server if not empty and not '127.0.0.1'
            if (!empty($res->secondarydns) && '127.0.0.1' !== $res->secondarydns) {
                $dns[] = $res->secondarydns;
            }
        }

        return $dns;
    }

    /**
     * Retrieves IPv6 DNS servers from LanInterfaces
     *
     * Returns array of IPv6 DNS server addresses from all enabled interfaces,
     * ordered by internet flag (internet interface DNS servers first).
     *
     * @return array<string> Array of IPv6 DNS server addresses
     */
    public function getHostDNS6(): array
    {
        $dns = [];

        // Get all enabled interfaces ordered by internet flag (internet interface first)
        $data = LanInterfaces::find([
            'conditions' => "disabled IS NULL OR disabled = '0'",
            'order' => 'internet DESC'
        ]);

        foreach ($data as $if_data) {
            // Add primary IPv6 DNS if valid
            if (!empty($if_data->primarydns6) && IpAddressHelper::isIpv6($if_data->primarydns6)) {
                $dns[] = $if_data->primarydns6;
            }
            // Add secondary IPv6 DNS if valid
            if (!empty($if_data->secondarydns6) && IpAddressHelper::isIpv6($if_data->secondarydns6)) {
                $dns[] = $if_data->secondarydns6;
            }
        }

        return array_unique($dns);
    }

    /**
     * Configures the loopback interface (lo) with the IP address 127.0.0.1.
     *
     * @return void
     */
    public function loConfigure(): void
    {
        $ifconfig = Util::which('ifconfig');
        Processes::mwExec("$ifconfig lo 127.0.0.1");
    }

    /**
     * Configures IPv6 on a network interface based on the specified mode.
     *
     * Supports three IPv6 modes:
     * - Mode '0' (Off): Flushes all IPv6 addresses from the interface
     * - Mode '1' (Auto/SLAAC): Enables interface for SLAAC autoconfiguration
     * - Mode '2' (Manual): Configures static IPv6 address and optional gateway
     *
     * @param string $ifName The network interface name (e.g., 'eth0', 'vlan100')
     * @param string $ipv6Mode IPv6 configuration mode: '0'=Off, '1'=Auto, '2'=Manual
     * @param string $ipv6Addr IPv6 address (required for Manual mode)
     * @param string $ipv6Subnet IPv6 prefix length (required for Manual mode, e.g., '64')
     * @param string $ipv6Gateway IPv6 gateway address (optional for Manual mode)
     * @return array<string> Array of shell commands to configure IPv6
     */
    private function configureIpv6Interface(
        string $ifName,
        string $ipv6Mode,
        string $ipv6Addr = '',
        string $ipv6Subnet = '',
        string $ipv6Gateway = ''
    ): array {
        $arr_commands = [];
        $ip = Util::which('ip');
        $sysctl = Util::which('sysctl');
        $escapedIfName = escapeshellarg($ifName);

        switch ($ipv6Mode) {
            case '0': // Off - Disable IPv6 completely on this interface
                SystemMessages::sysLogMsg(__METHOD__, "Disabling IPv6 on $ifName");

                // Disable IPv6 on this specific interface (not globally!)
                $arr_commands[] = "$sysctl -w net.ipv6.conf.$ifName.disable_ipv6=1";

                // Flush any existing IPv6 addresses
                $arr_commands[] = "$ip -6 addr flush dev $escapedIfName 2>/dev/null || true";
                break;

            case '1': // Auto - DHCPv6 with SLAAC fallback
                SystemMessages::sysLogMsg(__METHOD__, "Enabling IPv6 Auto (DHCPv6 + SLAAC fallback) on $ifName");

                // Enable IPv6 on this interface
                $arr_commands[] = "$sysctl -w net.ipv6.conf.$ifName.disable_ipv6=0";

                // Enable autoconf (SLAAC) - serves as fallback when DHCPv6 unavailable
                $arr_commands[] = "$sysctl -w net.ipv6.conf.$ifName.autoconf=1";
                $arr_commands[] = "$sysctl -w net.ipv6.conf.$ifName.accept_ra=1";

                // Launch DHCPv6 client (mimics IPv4 udhcpc pattern)
                // ARCHITECTURAL DECISION: DHCPv6 client behavior based on Router Advertisement flags
                // - M-flag set (Managed): Run stateful DHCPv6 to get IPv6 address
                // - O-flag set (Other Config): Run stateless DHCPv6 to get DNS servers
                // - Neither flag: SLAAC-only (current behavior)
                // - If DHCPv6 server doesn't respond: udhcpc6 exits, SLAAC continues (graceful fallback)

                $pid_file = "/var/run/udhcpc6_$ifName";

                // Try to find udhcpc6 symlink first, fallback to busybox direct call
                $udhcpc6 = Util::which('udhcpc6');
                if (empty($udhcpc6)) {
                    $busybox = Util::which('busybox');
                    if (!empty($busybox)) {
                        $udhcpc6 = "$busybox udhcpc6";
                    }
                }

                if (empty($udhcpc6)) {
                    SystemMessages::sysLogMsg(__METHOD__, "udhcpc6 not available in busybox, skipping DHCPv6 for $ifName", LOG_WARNING);
                    break;
                }

                $nohup = Util::which('nohup');
                $workerPath = '/etc/rc/udhcpc6_configure';

                // Kill existing udhcpc6 process if running
                $pid = Processes::getPidOfProcess($pid_file);
                if (!empty($pid) && file_exists($pid_file)) {
                    $kill = Util::which('kill');
                    $cat = Util::which('cat');
                    // Use $() instead of backticks to avoid quoting issues
                    system("$kill \$($cat $pid_file) $pid");
                }

                // Escape shell arguments for udhcpc6 commands
                $escapedPidFile = escapeshellarg($pid_file);
                $escapedWorkerPath = escapeshellarg($workerPath);

                // Run udhcpc6 once in foreground to get immediate lease (quick attempt)
                $options = '-t 2 -T 2 -q -n';  // 2 attempts, 2 sec timeout, quit after lease, exit if no lease
                $arr_commands[] = "$udhcpc6 $options -i $ifName -s $escapedWorkerPath";

                // Start persistent udhcpc6 in background (long-running daemon)
                // Use mwExecBg to properly handle background execution instead of shell &
                $bgOptions = '-t 6 -T 5 -S -b';  // 6 attempts, 5 sec, syslog, background
                $bgCommand = "$udhcpc6 $bgOptions -p $escapedPidFile -i $ifName -s $escapedWorkerPath";
                Processes::mwExecBg($bgCommand);

                // FALLBACK BEHAVIOR:
                // - If DHCPv6 server responds: udhcpc6 callback updates database with DHCPv6 address
                // - If DHCPv6 server not available: udhcpc6 exits (no lease), SLAAC continues to work
                // - Result: Graceful fallback to SLAAC when DHCPv6 unavailable
                break;

            case '2': // Manual - Static IPv6 configuration
                if (empty($ipv6Addr) || empty($ipv6Subnet)) {
                    SystemMessages::sysLogMsg(__METHOD__, "WARNING: Manual IPv6 mode requires address and subnet for $ifName");
                    break;
                }

                // Validate IPv6 address format
                if (!IpAddressHelper::isIpv6($ipv6Addr)) {
                    SystemMessages::sysLogMsg(__METHOD__, "ERROR: Invalid IPv6 address format: $ipv6Addr");
                    break;
                }

                // Validate subnet range
                if (!IpAddressHelper::isValidSubnet($ipv6Addr, (int)$ipv6Subnet)) {
                    SystemMessages::sysLogMsg(__METHOD__, "ERROR: Invalid IPv6 subnet: /$ipv6Subnet (must be 1-128)");
                    break;
                }

                SystemMessages::sysLogMsg(__METHOD__, "Configuring IPv6 Manual on $ifName: $ipv6Addr/$ipv6Subnet");

                // Escape all shell arguments to prevent command injection
                $escapedAddr = escapeshellarg($ipv6Addr);
                $escapedSubnet = escapeshellarg($ipv6Subnet);

                // Enable IPv6 on this interface
                $arr_commands[] = "$sysctl -w net.ipv6.conf.$ifName.disable_ipv6=0";

                // Disable autoconf for manual configuration
                $arr_commands[] = "$sysctl -w net.ipv6.conf.$ifName.autoconf=0";
                $arr_commands[] = "$sysctl -w net.ipv6.conf.$ifName.accept_ra=0";

                // Add static IPv6 address to interface
                $arr_commands[] = "$ip -6 addr add $escapedAddr/$escapedSubnet dev $escapedIfName";

                // Add default gateway if specified
                if (!empty($ipv6Gateway)) {
                    if (!IpAddressHelper::isIpv6($ipv6Gateway)) {
                        SystemMessages::sysLogMsg(__METHOD__, "WARNING: Invalid IPv6 gateway format: $ipv6Gateway");
                    } else {
                        SystemMessages::sysLogMsg(__METHOD__, "Adding IPv6 default gateway: $ipv6Gateway via $ifName");
                        $escapedGateway = escapeshellarg($ipv6Gateway);
                        // Delete any existing default IPv6 route on this interface first
                        $arr_commands[] = "$ip -6 route del default dev $escapedIfName 2>/dev/null || true";
                        // Add new default route
                        $arr_commands[] = "$ip -6 route add default via $escapedGateway dev $escapedIfName";
                    }
                }
                break;

            default:
                SystemMessages::sysLogMsg(__METHOD__, "WARNING: Unknown IPv6 mode '$ipv6Mode' for $ifName");
                break;
        }

        return $arr_commands;
    }

    /**
     * Configures IPv6 network settings inside Docker container.
     *
     * In Docker environment, IPv4 networking is managed by the container runtime,
     * but IPv6 can be configured manually inside the container using standard Linux commands.
     * This method applies IPv6 configuration based on the interface mode (Off/Auto/Manual).
     *
     * @return void
     */
    private function configureIpv6InDocker(): void
    {
        // Retrieve network settings from database
        $networks = $this->getGeneralNetSettings();

        $arr_commands = [];

        foreach ($networks as $if_data) {
            if ($if_data['disabled'] === '1') {
                continue;
            }

            $if_name = trim($if_data['interface']);
            if (empty($if_name)) {
                continue;
            }

            // Get IPv6 configuration
            $ipv6Mode = $if_data['ipv6_mode'] ?? '0';
            $ipv6Addr = $if_data['ipv6addr'] ?? '';
            $ipv6Subnet = $if_data['ipv6_subnet'] ?? '';
            $ipv6Gateway = $if_data['ipv6_gateway'] ?? '';

            // Configure IPv6 based on mode
            $ipv6Commands = $this->configureIpv6Interface(
                $if_name,
                $ipv6Mode,
                $ipv6Addr,
                $ipv6Subnet,
                $ipv6Gateway
            );

            $arr_commands = array_merge($arr_commands, $ipv6Commands);
        }

        // Execute IPv6 configuration commands
        if (!empty($arr_commands)) {
            Processes::mwExecCommands($arr_commands, $out, 'net');
            SystemMessages::sysLogMsg(__METHOD__, 'IPv6 configured in Docker container: ' . implode('; ', $arr_commands));
        } else {
            SystemMessages::sysLogMsg(__METHOD__, 'No IPv6 configuration needed in Docker (all interfaces have IPv6 mode=Off or invalid config)');
        }
    }

    /**
     * Configures the LAN interfaces and performs related network operations.
     *
     * @return int The result of the configuration process.
     */
    public function lanConfigure(): int
    {
        // ALWAYS enable IPv6 at kernel level for stability
        // This allows applications (Asterisk, Nginx, PHP-FPM) to bind on IPv6 sockets
        // IPv6 addresses will be managed per-interface based on user configuration
        $sysctl = Util::which('sysctl');
        $enableIpv6Commands = [
            "$sysctl -w net.ipv6.conf.all.disable_ipv6=0",
            "$sysctl -w net.ipv6.conf.default.disable_ipv6=0",
        ];
        Processes::mwExecCommands($enableIpv6Commands, $out, 'ipv6_enable');
        SystemMessages::sysLogMsg(__METHOD__, 'IPv6 enabled at kernel level');

        if (!System::canManageNetwork()) {
            // In Docker: Only configure IPv6 (IPv4 is managed by Docker runtime)
            // LXC containers CAN manage their own network, so they continue below
            $this->configureIpv6InDocker();
            return 0;
        }

        // Retrieve the network settings
        $networks = $this->getGeneralNetSettings();

        // Retrieve the paths of required commands
        $vconfig = Util::which('vconfig');
        $killall = Util::which('killall');
        $ifconfig = Util::which('ifconfig');


        $arr_commands = [];
        $arr_commands[] = "$killall udhcpc";
        $eth_mtu = [];
        foreach ($networks as $if_data) {
            if ($if_data['disabled'] === '1') {
                continue;
            }

            $if_name = $if_data['interface'];
            $if_name = escapeshellarg(trim($if_name));
            if (empty($if_name)) {
                continue;
            }

            $data_hostname = self::getHostName();
            $hostname = $data_hostname['hostname'];

            if ($if_data['vlanid'] > 0) {
                // Override the interface name for VLAN interfaces
                $arr_commands[] = "$vconfig set_name_type VLAN_PLUS_VID_NO_PAD";
                // Add the new VLAN interface
                $arr_commands[] = "$vconfig add {$if_data['interface_orign']} {$if_data['vlanid']}";
            }
            // Disable and reset the interface
            $arr_commands[] = "$ifconfig $if_name down";
            $arr_commands[] = "$ifconfig $if_name 0.0.0.0";

            $gw_param = '';
            if (trim($if_data['dhcp']) === '1') {
                // DHCP configuration
                /*
                 * -t - number of attempts.
                 * -T - timeout for each attempt.
                 * -v - enable debugging.
                 * -S - log messages to syslog.
                 * -q - exit after obtaining lease.
                 * -n - exit if lease is not obtained.
                 */
                $pid_file = "/var/run/udhcpc_$if_name";
                $pid_pcc = Processes::getPidOfProcess($pid_file);
                if (!empty($pid_pcc) && file_exists($pid_file)) {
                    // Terminate the old udhcpc process
                    $kill = Util::which('kill');
                    $cat = Util::which('cat');
                    system("$kill `$cat $pid_file` $pid_pcc");
                }
                $udhcpc = Util::which('udhcpc');
                $nohup = Util::which('nohup');

                // Obtain IP and wait for the process to finish
                $workerPath = '/etc/rc/udhcpc_configure';
                $options = '-t 2 -T 2 -q -n';
                $arr_commands[] = "$udhcpc $options -i $if_name -x hostname:$hostname -s $workerPath";
                // Start a new udhcpc process in the background
                $options = '-t 6 -T 5 -S -b -n';
                $arr_commands[] = "$nohup $udhcpc $options -p $pid_file -i $if_name -x hostname:$hostname -s $workerPath 2>&1 &";
                /*
                   udhcpc - utility for configuring the interface
                          - configures /etc/resolv.conf
                    Further route configuration will be performed in udhcpcConfigureRenewBound();
                    and udhcpcConfigureDeconfig(). These methods will be called by the PHP script udhcpc_configure.
                    // http://pwet.fr/man/linux/administration_systeme/udhcpc/
                */
            } else {
                // Static IP configuration
                $ipaddr = trim($if_data['ipaddr']);
                $subnet = trim($if_data['subnet']);
                $gateway = trim($if_data['gateway']);
                if (empty($ipaddr)) {
                    continue;
                }
                try {
                    // Calculate the short subnet mask
                    $calc_subnet = new SubnetCalculator($ipaddr, $subnet);
                    $subnet = $calc_subnet->getSubnetMask();
                } catch (Throwable $e) {
                    echo "Caught exception: $ipaddr $subnet", $e->getMessage(), "\n";
                    continue;
                }

                $ifconfig = Util::which('ifconfig');
                $arr_commands[] = "$ifconfig $if_name $ipaddr netmask $subnet";

                if ("" !== trim($gateway)) {
                    $gw_param = "gw $gateway";
                }

                $route = Util::which('route');
                $arr_commands[] = "$route del default $if_name";

                /** @var LanInterfaces $if_data_model */
                $if_data_model = LanInterfaces::findFirst([
                    'conditions' => 'id = :id:',
                    'bind' => ['id' => $if_data['id']]
                ]);
                $is_inet = ($if_data_model !== null) ? (string)$if_data_model->internet : '0';

                if ($is_inet === '1') {
                    // Create default route only if the interface is for internet
                    $arr_commands[] = "$route add default $gw_param dev $if_name";
                }
                // Bring up the interface
                $arr_commands[] = "$ifconfig $if_name up";

                $eth_mtu[] = $if_name;
            }

            // Configure IPv6 for this interface (regardless of DHCP or static IPv4)
            // IPv6 can run independently alongside IPv4 (dual-stack)
            $ipv6Mode = $if_data['ipv6_mode'] ?? '0';
            $ipv6Addr = $if_data['ipv6addr'] ?? '';
            $ipv6Subnet = $if_data['ipv6_subnet'] ?? '';
            $ipv6Gateway = $if_data['ipv6_gateway'] ?? '';

            // Get IPv6 configuration commands
            // Pass unescaped interface name - configureIpv6Interface handles escaping internally
            $ipv6Commands = $this->configureIpv6Interface(
                $if_data['interface'],
                $ipv6Mode,
                $ipv6Addr,
                $ipv6Subnet,
                $ipv6Gateway
            );

            // Add IPv6 commands to the main command array
            $arr_commands = array_merge($arr_commands, $ipv6Commands);
        }
        $out = null;
        Processes::mwExecCommands($arr_commands, $out, 'net');
        $this->hostsGenerate();

        foreach ($eth_mtu as $eth) {
            Processes::mwExecBg("/etc/rc/networking_set_mtu '$eth'");
        }

        // Additional "manual" routes
        $this->addCustomStaticRoutes();
        $this->openVpnConfigure();
        return 0;
    }

    /**
     * Generates the hosts configuration.
     *
     * @return void
     */
    public function hostsGenerate(): void
    {
        $this->hostnameConfigure();
    }

    /**
     * Configures the hostname and hosts file.
     *
     * @return void
     */
    public function hostnameConfigure(): void
    {
        $data = self::getHostName();
        $hosts_conf = "127.0.0.1 localhost\n";
        
        // Get external hostname to check for conflicts
        /** @var LanInterfaces|null $res */
        $res = LanInterfaces::findFirst("internet = '1'");
        $externalHostname = ($res !== null) ? $res->exthostname : '';
        
        // Build full hostname for comparison
        $fullHostname = $data['hostname'];
        if (!empty($data['domain'])) {
            $fullHostname .= '.' . $data['domain'];
        }
        
        // Only add hostname to /etc/hosts if it doesn't match the external hostname
        // This prevents DNS resolution conflicts when the same name is used for both local and external access
        if (strcasecmp($data['hostname'], $externalHostname ?? '') !== 0 &&
            strcasecmp($fullHostname, $externalHostname ?? '') !== 0) {
            $hosts_conf .= "127.0.0.1 {$data['hostname']}\n";
            if (!empty($data['domain'])) {
                $hosts_conf .= "127.0.0.1 {$data['hostname']}.{$data['domain']}\n";
            }
        }
        
        $hostnamePath = Util::which('hostname');
        if (System::isDocker()) {
            $realHostName = shell_exec($hostnamePath);
            $hosts_conf .= "127.0.0.1 $realHostName\n";
        }
        Util::fileWriteContent('/etc/hosts', $hosts_conf);
        Processes::mwExec($hostnamePath . ' ' . escapeshellarg($data['hostname']));
    }

    /**
     * Add custom static routes from database and legacy `/etc/static-routes` file.
     *
     * @param string $interface The network interface to add routes to, e.g., eth0 (optional)
     * @return void
     */
    protected function addCustomStaticRoutes(string $interface = ''): void
    {
        $arr_commands = [];

        // Load static routes from database (ordered by priority)
        /** @var NetworkStaticRoutes[] $staticRoutes */
        $staticRoutes = NetworkStaticRoutes::find([
            'order' => 'priority ASC'
        ]);

        if (count($staticRoutes) > 0) {
            $route = Util::which('route');
            $ip = Util::which('ip');

            foreach ($staticRoutes as $routeData) {
                // Skip if interface filter is specified and doesn't match
                if (!empty($interface) && !empty($routeData->interface) && $routeData->interface !== $interface) {
                    continue;
                }

                $network = trim($routeData->network ?? '');
                $subnet = trim($routeData->subnet ?? '');
                $gateway = trim($routeData->gateway ?? '');
                $iface = trim($routeData->interface ?? '');

                // Validate required fields
                if (empty($network) || empty($subnet) || empty($gateway)) {
                    SystemMessages::sysLogMsg(__METHOD__, "Skipping invalid route: network=$network, subnet=$subnet, gateway=$gateway");
                    continue;
                }

                // Detect if this is an IPv6 route by checking the network address
                $isIpv6 = IpAddressHelper::isIpv6($network);

                if ($isIpv6) {
                    // IPv6 route using modern 'ip' command
                    // Command format: ip -6 route add 2001:db8:1::/64 via 2001:db8::1 dev eth0
                    $command = "$ip -6 route add " . escapeshellarg("$network/$subnet") .
                               " via " . escapeshellarg($gateway);

                    if (!empty($iface)) {
                        $command .= " dev " . escapeshellarg($iface);
                    }

                    $arr_commands[] = $command;
                    SystemMessages::sysLogMsg(__METHOD__, "Adding IPv6 static route: $network/$subnet via $gateway" . (!empty($iface) ? " dev $iface" : ''));
                } else {
                    // IPv4 route using legacy 'route' command (backward compatibility)
                    // Command format: route add -net 192.168.10.0/24 gw 192.168.1.1 dev eth0
                    $command = "$route add -net " . escapeshellarg("$network/$subnet") .
                               " gw " . escapeshellarg($gateway);

                    if (!empty($iface)) {
                        $command .= " dev " . escapeshellarg($iface);
                    }

                    $arr_commands[] = $command;
                    SystemMessages::sysLogMsg(__METHOD__, "Adding IPv4 static route: $network/$subnet via $gateway" . (!empty($iface) ? " dev $iface" : ''));
                }
            }
        }

        // Legacy support: Load routes from /etc/static-routes file
        Util::fileWriteContent('/etc/static-routes', '');

        $grep = Util::which('grep');
        $awk = Util::which('awk');
        $cat = Util::which('cat');

        if (empty($interface)) {
            $command = "$cat /etc/static-routes | $grep '^rout' | $awk -F ';' '{print $1}'";
        } else {
            $command = "$cat /etc/static-routes | $grep '^rout' | $awk -F ';' '{print $1}' | $grep '$interface'";
        }

        $legacy_commands = [];
        Processes::mwExec($command, $legacy_commands);
        $arr_commands = array_merge($arr_commands, $legacy_commands);

        // Execute all route commands
        if (count($arr_commands) > 0) {
            Processes::mwExecCommands($arr_commands, $out, 'static-routes');
        }
    }

    /**
     * Configuring OpenVPN. If a custom configuration file is specified in the system file customization, the network will be brought up.
     */
    public function openVpnConfigure(): void
    {
        $confFile = '/etc/openvpn.ovpn';
        Util::fileWriteContent($confFile, '');
        $data = file_get_contents($confFile);

        $pidFile = '/var/run/openvpn.pid';
        $pid = Processes::getPidOfProcess('openvpn');
        if (!empty($pid)) {
            // Terminate the process.
            $kill = Util::which('kill');
            Processes::mwExec("$kill '$pid'");
        }
        if (!empty($data)) {
            $openvpn = Util::which('openvpn');
            Processes::mwExecBg("$openvpn --config /etc/openvpn.ovpn --writepid $pidFile", '/dev/null', 5);
        }
    }

    /**
     * Retrieves information about all network interfaces.
     * @return array<string, mixed> An array of network interfaces with their respective information.
     */
    public function getInterfaces(): array
    {
        // Get all PCI interface names (network interfaces).
        $i_names = $this->getInterfacesNames();
        $if_list = [];
        foreach ($i_names as $i) {
            $if_list[$i] = $this->getInterface($i);
        }

        return $if_list;
    }

    /**
     * Retrieves information about a specific network interface.
     * @param string $name The name of the network interface.
     * @return array<string, mixed> An array containing the interface information.
     */
    public function getInterface(string $name): array
    {
        $interface = [];

        // Get ifconfig's output for the specified interface.
        $ifconfig = Util::which('ifconfig');
        Processes::mwExec("$ifconfig $name 2>/dev/null", $output);
        $outputStr = implode(" ", $output ?? []);

        // Parse MAC address.
        preg_match("/HWaddr (\S+)/", $outputStr, $matches);
        $interface['mac'] = $matches[1] ?? '';

        // Parse IPv4 address.
        preg_match("/inet addr:(\S+)/", $outputStr, $matches);
        $interface['ipaddr'] = $matches[1] ?? '';

        // Parse IPv4 subnet mask.
        preg_match("/Mask:(\S+)/", $outputStr, $matches);
        $subnet = isset($matches[1]) ? $this->netMaskToCidr($matches[1]) : '';
        $interface['subnet'] = $subnet;

        // Check if the interface is up.
        preg_match("/\s+(UP)\s+/", $outputStr, $matches);
        $status = $matches[1] ?? '';
        if ($status === "UP") {
            $interface['up'] = true;
        } else {
            $interface['up'] = false;
        }

        // Parse IPv6 addresses (Global and Link-Local)
        // Example ifconfig output:
        //   inet6 addr: fd07:b51a:cc66:d000::2/64 Scope:Global
        //   inet6 addr: fe80::2c47:3ff:fe79:31d0/64 Scope:Link
        $ipv6Addresses = [];
        foreach ($output as $line) {
            if (preg_match("/inet6 addr:\s*([^\s\/]+)\/(\d+)\s+Scope:(\S+)/", $line, $matches)) {
                $ipv6Address = $matches[1];
                $ipv6Prefix = $matches[2];
                $scope = $matches[3];

                // Store Global addresses (skip Link-Local fe80::/10)
                if ($scope === 'Global' && !str_starts_with($ipv6Address, 'fe80:')) {
                    $ipv6Addresses[] = [
                        'address' => $ipv6Address,
                        'prefix' => $ipv6Prefix,
                        'scope' => $scope
                    ];
                }
            }
        }

        // Set IPv6 fields (use first Global address if available)
        if (!empty($ipv6Addresses)) {
            $interface['ipv6addr'] = $ipv6Addresses[0]['address'];
            $interface['ipv6_subnet'] = $ipv6Addresses[0]['prefix'];
        } else {
            $interface['ipv6addr'] = '';
            $interface['ipv6_subnet'] = '';
        }

        // Get the default IPv4 gateway.
        $grep = Util::which('grep');
        $cut = Util::which('cut');
        $route = Util::which('route');

        Processes::mwExec(
            "$route -n | $grep $name | $grep \"^0.0.0.0\" | $cut -d ' ' -f 10",
            $matches
        );
        $gw = (count($matches) > 0) ? $matches[0] : '';
        if (Verify::isIpAddress($gw)) {
            $interface['gateway'] = $gw;
        }

        // Get the default IPv6 gateway using ip -6 route
        $ip = Util::which('ip');
        Processes::mwExec(
            "$ip -6 route show default dev $name 2>/dev/null | $grep default | $cut -d ' ' -f 3",
            $ipv6GwMatches
        );
        $ipv6Gw = (count($ipv6GwMatches) > 0) ? trim($ipv6GwMatches[0]) : '';
        if (filter_var($ipv6Gw, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            $interface['ipv6_gateway'] = $ipv6Gw;
        } else {
            $interface['ipv6_gateway'] = '';
        }

        // Get DNS servers (both IPv4 and IPv6).
        $cat = Util::which('cat');
        Processes::mwExec("$cat /etc/resolv.conf | $grep nameserver | $cut -d ' ' -f 2", $dnsout);

        $dnsSrv = [];
        $dnsSrv6 = [];
        foreach ($dnsout as $line) {
            $line = trim($line);
            if (filter_var($line, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                $dnsSrv[] = $line;
            } elseif (filter_var($line, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
                $dnsSrv6[] = $line;
            }
        }
        $interface['dns'] = $dnsSrv;
        $interface['dns6'] = $dnsSrv6;

        // Set individual IPv6 DNS fields for backward compatibility
        $interface['primarydns6'] = $dnsSrv6[0] ?? '';
        $interface['secondarydns6'] = $dnsSrv6[1] ?? '';

        return $interface;
    }

    /**
     * Refreshes networks configs and restarts network daemon.
     *
     * @return void
     */
    public static function networkReload(): void
    {
        // Create Network object and configure settings
        $network = new Network();
        $network->hostnameConfigure();

        $dnsConf = new DnsConf();
        $dnsConf->resolveConfGenerate($network->getHostDNS());
        $dnsConf->reStart();

        $network->loConfigure();
        $network->lanConfigure();
        $network->configureLanInDocker();
        $network->updateExternalIp();
    }
}