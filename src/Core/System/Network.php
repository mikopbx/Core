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

use MikoPBX\Common\Models\{LanInterfaces, PbxSettings};
use MikoPBX\Core\Utilities\SubnetCalculator;
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

    /**
     * Starts the SIP dump process.
     */
    public static function startSipDump(): void
    {
        $config = new MikoPBXConfig();
        $use = $config->getGeneralSettings('USE_PCAP_SIP_DUMP');
        if ($use !== '1') {
            return;
        }

        Processes::killByName('pcapsipdump');
        $log_dir = System::getLogDir() . '/pcapsipdump';
        Util::mwMkdir($log_dir);

        $network = new Network();
        $arr_eth = $network->getInterfacesNames();
        $pcapsipdumpPath = Util::which('pcapsipdump');
        foreach ($arr_eth as $eth) {
            $pid_file = "/var/run/pcapsipdump_{$eth}.pid";
            Processes::mwExecBg(
                $pcapsipdumpPath . ' -T 120 -P ' . $pid_file . ' -i ' . $eth . ' -m \'^(INVITE|REGISTER)$\' -L ' . $log_dir . '/dump.db'
            );
        }
    }

    /**
     * Retrieves the names of all PCI network interfaces.
     *
     * @return array An array containing the names of the network interfaces.
     */
    public function getInterfacesNames()
    {
        // Universal command to retrieve all PCI network interfaces.
        $lsPath = Util::which('ls');
        $grepPath = Util::which('grep');
        $awkPath = Util::which('awk');
        Processes::mwExec("{$lsPath} -l /sys/class/net | {$grepPath} devices | {$grepPath} -v virtual | {$awkPath} '{ print $9 }'", $names);

        return $names;
    }

    /**
     * Configures the loopback interface (lo) with the IP address 127.0.0.1.
     *
     * @return void
     */
    public function loConfigure(): void
    {
        $busyboxPath = Util::which('busybox');
        $ifconfigPath = Util::which('ifconfig');
        Processes::mwExec("{$busyboxPath} {$ifconfigPath} lo 127.0.0.1");
    }

    /**
     * Generates the resolv.conf file based on system configuration.
     */
    public function resolvConfGenerate(): void
    {
        if (Util::isDocker()) {
            return;
        }

        // Initialize resolv.conf content
        $resolv_conf = '';

        // Get hostname information
        $data_hostname = self::getHostName();

        // Append domain to resolv.conf if it is not empty
        if (trim($data_hostname['domain']) !== '') {
            $resolv_conf .= "domain {$data_hostname['domain']}\n";
        }

        // Append local nameserver to resolv.conf
        $resolv_conf .= "nameserver 127.0.0.1\n";

        // Initialize an array to store named DNS servers
        $named_dns = [];

        // Retrieve host DNS settings
        $dns = $this->getHostDNS();

        // Iterate over each DNS server
        foreach ($dns as $ns) {
            // Skip empty DNS servers
            if (trim($ns) === '') {
                continue;
            }
            // Add the DNS server to the named_dns array
            $named_dns[] = $ns;

            // Append the DNS server to resolv.conf
            $resolv_conf .= "nameserver {$ns}\n";
        }

        // If no DNS servers were found, use default ones and add them to named_dns
        if (count($dns) === 0) {
            $resolv_conf .= "nameserver 4.4.4.4\n";
            $named_dns[] .= "8.8.8.8";
        }

        // Check if systemctl is available
        if (Util::isSystemctl()) {

            // Generate resolved.conf content for systemd-resolved
            $s_resolv_conf = "[Resolve]\n"
                . "DNS=127.0.0.1\n";

            // Append domain to resolved.conf if it is not empty
            if (trim($data_hostname['domain']) !== '') {
                $s_resolv_conf .= "Domains={$data_hostname['domain']}\n";
            }

            // Write resolved.conf content to the file
            file_put_contents('/etc/systemd/resolved.conf', $s_resolv_conf);

            // Restart systemd-resolved service
            $systemctlPath = Util::which('systemctl');
            Processes::mwExec("{$systemctlPath} restart systemd-resolved");
        } else {
            // Write resolv.conf content to the file
            file_put_contents('/etc/resolv.conf', $resolv_conf);
        }

        // Generate pdnsd configuration using named_dns
        $this->generatePdnsdConfig($named_dns);
    }

    /**
     * Retrieves the hostname and domain information.
     *
     * @return array An array containing the hostname and domain.
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
     * @return array An array containing the DNS servers.
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
     * Generates the pdnsd configuration file and restarts the pdnsd service if necessary.
     *
     * @param array $named_dns An array of named DNS servers.
     */
    public function generatePdnsdConfig($named_dns): void
    {
        $tempDir = $this->di->getShared('config')->path('core.tempDir');
        $cache_dir = $tempDir . '/pdnsd/cache';
        Util::mwMkdir($cache_dir);

        $conf = 'global {' . "\n" .
            '	perm_cache=10240;' . "\n" .
            '	cache_dir="' . $cache_dir . '";' . "\n" .
            '	pid_file = /var/run/pdnsd.pid;' . "\n" .
            '	run_as="nobody";' . "\n" .
            '	server_ip = 127.0.0.1;' . "\n" .
            '	status_ctl = on;' . "\n" .
            '	query_method=udp_tcp;' . "\n" .
            '	min_ttl=15m;' . "\n" .
            '	max_ttl=1w;' . "\n" .
            '	timeout=10;' . "\n" .
            '	neg_domain_pol=on;' . "\n" .
            '	run_as=root;' . "\n" .
            '	daemon=on;' . "\n" .
            '}' . "\n" .
            'server {' . "\n" .
            '	label = "main";' . "\n" .
            '	ip = ' . implode(', ', $named_dns) . ';' . "\n" .
            '	interface=lo;' . "\n" .
            '	uptest=if;' . "\n" .
            '	interval=10m;' . "\n" .
            '	purge_cache=off;' . "\n" .
            '}';

        $pdnsdConfFile = '/etc/pdnsd.conf';

        // Update the pdnsd.conf file if it has changed
        $savedConf = '';
        if (file_exists($pdnsdConfFile)) {
            $savedConf = file_get_contents($pdnsdConfFile);
        }
        if ($savedConf !== $conf) {
            file_put_contents($pdnsdConfFile, $conf);
        }
        $pdnsdPath = Util::which('pdnsd');
        $pid = Processes::getPidOfProcess($pdnsdPath);

        // Check if pdnsd process is running and the configuration has not changed
        if (!empty($pid) && $savedConf === $conf) {

            // Perform additional check if the DNS server is working
            $resultResolve = gethostbynamel('lic.miko.ru');
            if ($resultResolve !== false) {
                // Configuration has not changed and the DNS server is working,
                // no need to restart or reload the service
                return;
            }
            // Perform a reload of the DNS server
        }

        // If pdnsd process is running, terminate the process
        if (!empty($pid)) {
            $busyboxPath = Util::which('busybox');
            $killPath = Util::which('kill');
            Processes::mwExec("{$busyboxPath} {$killPath} '$pid'");
        }

        // Start the pdnsd service with the updated configuration
        Processes::mwExec("{$pdnsdPath} -c /etc/pdnsd.conf -4");
    }

    /**
     * Configures the LAN interfaces and performs related network operations.
     *
     * @return int The result of the configuration process.
     */
    public function lanConfigure(): int
    {
        if (Util::isDocker()) {
            // Update the list of interfaces
            $this->getGeneralNetSettings();
            return 0;
        }

        // Retrieve the paths of required commands
        $busyboxPath = Util::which('busybox');
        $vconfigPath = Util::which('vconfig');
        $killallPath = Util::which('killall');

        // Retrieve the network settings
        $networks = $this->getGeneralNetSettings();
        $arr_commands = [];
        $arr_commands[] = "{$killallPath} udhcpc";
        $eth_mtu = [];
        foreach ($networks as $if_data) {
            if ($if_data['disabled'] === '1') {
                continue;
            }

            $if_name = $if_data['interface'];
            $if_name = escapeshellcmd(trim($if_name));
            if (empty($if_name)) {
                continue;
            }

            $data_hostname = self::getHostName();
            $hostname = $data_hostname['hostname'];

            if ($if_data['vlanid'] > 0) {
                // Override the interface name for VLAN interfaces
                $arr_commands[] = "{$vconfigPath} set_name_type VLAN_PLUS_VID_NO_PAD";
                // Add the new VLAN interface
                $arr_commands[] = "{$vconfigPath} add {$if_data['interface_orign']} {$if_data['vlanid']}";
            }
            // Disable and reset the interface
            $arr_commands[] = "{$busyboxPath} ifconfig $if_name down";
            $arr_commands[] = "{$busyboxPath} ifconfig $if_name 0.0.0.0";

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
                $pid_file = "/var/run/udhcpc_{$if_name}";
                $pid_pcc = Processes::getPidOfProcess($pid_file);
                if (!empty($pid_pcc) && file_exists($pid_file)) {
                    // Terminate the old udhcpc process
                    $killPath = Util::which('kill');
                    $catPath = Util::which('cat');
                    system("{$killPath} `{$catPath} {$pid_file}` {$pid_pcc}");
                }
                $udhcpcPath = Util::which('udhcpc');
                $nohupPath = Util::which('nohup');

                // Obtain IP and wait for the process to finish
                $workerPath = '/etc/rc/udhcpc.configure';
                $options = '-t 6 -T 5 -q -n';
                $arr_commands[] = "{$udhcpcPath} {$options} -i {$if_name} -x hostname:{$hostname} -s {$workerPath}";
                // Start a new udhcpc process in the background
                $options = '-t 6 -T 5 -S -b -n';
                $arr_commands[] = "{$nohupPath} {$udhcpcPath} {$options} -p {$pid_file} -i {$if_name} -x hostname:{$hostname} -s {$workerPath} 2>&1 &";
                /*
                   udhcpc - utility for configuring the interface
                               - configures /etc/resolv.conf
                    Further route configuration will be performed in udhcpcConfigureRenewBound();
                    and udhcpcConfigureDeconfig(). These methods will be called by the script WorkerUdhcpcConfigure.php.
                    // man udhcp
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

                $ifconfigPath = Util::which('ifconfig');
                $arr_commands[] = "{$busyboxPath} {$ifconfigPath} $if_name $ipaddr netmask $subnet";

                if ("" !== trim($gateway)) {
                    $gw_param = "gw $gateway";
                }

                $routePath = Util::which('route');
                $arr_commands[] = "{$busyboxPath} {$routePath} del default $if_name";

                /** @var LanInterfaces $if_data */
                $if_data = LanInterfaces::findFirst("id = '{$if_data['id']}'");
                $is_inet = ($if_data !== null) ? (string)$if_data->internet : '0';

                if ($is_inet === '1') {
                    // Create default route only if the interface is for internet
                    $arr_commands[] = "{$busyboxPath} {$routePath} add default $gw_param dev $if_name";
                }
                // Bring up the interface
                $arr_commands[] = "{$busyboxPath} {$ifconfigPath} $if_name up";

                $eth_mtu[] = $if_name;
            }
        }
        $out = null;
        Processes::mwExecCommands($arr_commands, $out, 'net');
        $this->hostsGenerate();

        foreach ($eth_mtu as $eth) {
            Processes::mwExecBg("/etc/rc/networking.set.mtu '{$eth}'");
        }

        // Additional "manual" routes
        Util::fileWriteContent('/etc/static-routes', '');
        $arr_commands = [];
        $out = [];
        $grepPath = Util::which('grep');
        $awkPath = Util::which('awk');
        $catPath = Util::which('cat');
        Processes::mwExec(
            "{$catPath} /etc/static-routes | {$grepPath} '^rout' | {$busyboxPath} {$awkPath} -F ';' '{print $1}'",
            $arr_commands
        );
        Processes::mwExecCommands($arr_commands, $out, 'rout');

        $this->openVpnConfigure();
        return 0;
    }

    /**
     * Retrieves the general network settings and performs additional processing.
     *
     * @return array An array of network interfaces and their settings.
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
                    // Interface found
                    // Remove the array element if it's not a VLAN
                    if ($if_data['vlanid'] === '0') {
                        unset($array_eth[$key]);
                        $this->enableLanInterface($if_data['interface_orign']);
                    }
                } else {
                    // Interface does not exist
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
                $eth_settings->internet = 1;
                $eth_settings->save();
            }
        }

        return $networks;
    }

    /**
     * Retrieves the information message containing available web interface addresses.
     *
     * @return string The information message.
     */
    public static function getInfoMessage(): string
    {
        $addresses = [
            'local' => [],
            'external' => []
        ];
        /** @var LanInterfaces $interface */
        $interfaces = LanInterfaces::find("disabled='0'");
        foreach ($interfaces as $interface) {
            if (!empty($interface->ipaddr)) {
                $addresses['local'][] = $interface->ipaddr;
            }
            if (!empty($interface->exthostname) && !in_array($interface->exthostname, $addresses['local'], true)) {
                $addresses['external'][] = explode(':', $interface->exthostname)[0] ?? '';
            }
            if (!empty($interface->extipaddr) && !in_array($interface->extipaddr, $addresses['local'], true)) {
                $addresses['external'][] = explode(':', $interface->extipaddr)[0] ?? '';
            }
        }
        unset($interfaces);
        $port = PbxSettings::getValueByKey('WEBHTTPSPort');
        $info = PHP_EOL . "   The web interface is available at the addresses:" . PHP_EOL . PHP_EOL;
        foreach ($addresses['local'] as $address) {
            if (empty($address)) {
                continue;
            }
            $info .= "    - https://$address:$port" . PHP_EOL;
        }
        $info .= PHP_EOL;
        $info .= "   The web interface is available at the external addresses:" . PHP_EOL . PHP_EOL;
        foreach ($addresses['external'] as $address) {
            if (empty($address)) {
                continue;
            }
            $info .= "    - https://$address:$port" . PHP_EOL;
        }
        $info .= PHP_EOL;

        return $info;
    }


    /**
     * Converts a net mask to CIDR notation.
     *
     * @param string $net_mask The net mask to convert.
     * @return int The CIDR notation.
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
        $if_data = LanInterfaces::findFirst("interface = '{$name}'");
        if ($if_data !== null) {
            $if_data->internet = 0;
            $if_data->disabled = 1;
            $if_data->update();
        }
    }

    /**
     * Adds a LAN interface with the specified name and settings.
     *
     * @param string $name The name of the interface.
     * @param bool $general Flag indicating if the interface is a general interface.
     * @return array The array representation of the added interface.
     */
    private function addLanInterface(string $name, bool $general = false)
    {
        $data = new LanInterfaces();
        $data->name = $name;
        $data->interface = $name;
        $data->dhcp = '1';
        $data->internet = ($general === true) ? '1' : '0';
        $data->disabled = '0';
        $data->vlanid = '0';
        $data->hostname = 'mikopbx';
        $data->domain = '';
        $data->topology = 'private';
        $data->primarydns = '';
        $data->save();

        return $data->toArray();
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
        $hosts_conf = "127.0.0.1 localhost\n" .
            "127.0.0.1 {$data['hostname']}\n";
        if (!empty($data['domain'])) {
            $hosts_conf .= "127.0.0.1 {$data['hostname']}.{$data['domain']}\n";
        }
        $hostnamePath = Util::which('hostname');
        if (Util::isDocker()) {
            $realHostName = shell_exec($hostnamePath);
            $hosts_conf .= "127.0.0.1 $realHostName\n";
        }
        Util::fileWriteContent('/etc/hosts', $hosts_conf);
        $hostnamePath = Util::which('hostname');
        Processes::mwExec($hostnamePath . ' ' . escapeshellarg($data['hostname']));
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
            $busyboxPath = Util::which('busybox');
            Processes::mwExec("{$busyboxPath} kill '$pid'");
        }
        if (!empty($data)) {
            $openvpnPath = Util::which('openvpn');
            Processes::mwExecBg("{$openvpnPath} --config /etc/openvpn.ovpn --writepid {$pidFile}", '/dev/null', 5);
        }
    }

    /**
     * Renews and configures the network settings after successful DHCP negotiation.
     *
     * @return void
     */
    public function udhcpcConfigureRenewBound(): void
    {
        // Initialize the environment variables array.
        $env_vars = [
            'broadcast' => '',
            'interface' => '',
            'ip' => '',
            'router' => '',
            'timesvr' => '',
            'namesvr' => '',
            'dns' => '',
            'hostname' => '',
            'subnet' => '',
            'serverid' => '',
            'ipttl' => '',
            'lease' => '',
            'domain' => '',
        ];

        $debugMode = $this->di->getShared('config')->path('core.debugMode');
        // Get the values of environment variables.
        foreach ($env_vars as $key => $value) {
            $env_vars[$key] = trim(getenv($key));
        }
        $BROADCAST = ($env_vars['broadcast'] === '') ? "" : "broadcast {$env_vars['broadcast']}";
        if ($env_vars['subnet'] === '255.255.255.255' || $env_vars['subnet'] === '') {
            // support /32 address assignment
            // https://forummikrotik.ru/viewtopic.php?f=3&t=6246&start=40
            $NET_MASK = '';
        } else {
            $NET_MASK = "netmask {$env_vars['subnet']}";
        }

        // Configure the interface.
        $busyboxPath = Util::which('busybox');
        Processes::mwExec("{$busyboxPath} ifconfig {$env_vars['interface']} {$env_vars['ip']} $BROADCAST $NET_MASK");

        // Remove old default routes.
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

        // Add default routes.
        /** @var LanInterfaces $if_data */
        $if_data = LanInterfaces::findFirst("interface = '{$env_vars['interface']}'");
        $is_inet = ($if_data !== null) ? (int)$if_data->internet : 0;
        if ('' !== $env_vars['router'] && $is_inet === 1) {
            // Only add default route if this interface is for internet.
            $routers = explode(' ', $env_vars['router']);
            foreach ($routers as $router) {
                Processes::mwExec("route add default gw {$router} dev {$env_vars['interface']}");
            }
        }
        // Add custom routes.
        if (file_exists('/etc/static-routes')) {
            $busyboxPath = Util::which('busybox');
            $grepPath = Util::which('grep');
            $awkPath = Util::which('awk');
            $catPath = Util::which('cat');
            $shPath = Util::which('sh');
            Processes::mwExec(
                "{$catPath} /etc/static-routes | {$grepPath} '^rout' | {$busyboxPath} {$awkPath} -F ';' '{print $1}' | {$grepPath} '{$env_vars['interface']}' | {$shPath}"
            );
        }
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
            'subnet' => $env_vars['subnet'],
            'ipaddr' => $env_vars['ip'],
            'gateway' => $env_vars['router'],
        ];
        if (Verify::isIpAddress($env_vars['ip'])) {
            $data['subnet'] = $this->netMaskToCidr($env_vars['subnet']);
        } else {
            $data['subnet'] = '';
        }
        $this->updateIfSettings($data, $env_vars['interface']);

        $data = [
            'primarydns' => $named_dns[0] ?? '',
            'secondarydns' => $named_dns[1] ?? '',
        ];
        $this->updateDnsSettings($data, $env_vars['interface']);

        Processes::mwExecBg("/etc/rc/networking.set.mtu '{$env_vars['interface']}'");
    }

    /**
     * Renews and configures the network settings after successful DHCP negotiation using systemd environment variables.
     * For OS systemctl (Debian).
     *  Configures LAN interface FROM dhcpc (renew_bound).
     * @return void
     */
    public function udhcpcConfigureRenewBoundSystemCtl(): void
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
            $var_name = "{$prefix}{$value}";
            if (empty($var_name)) {
                continue;
            }
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
            'subnet' => $env_vars['subnet'],
            'ipaddr' => $env_vars['ip'],
            'gateway' => $env_vars['router'],
        ];
        if (Verify::isIpAddress($env_vars['ip'])) {
            $data['subnet'] = $this->netMaskToCidr($env_vars['subnet']);
        } else {
            $data['subnet'] = '';
        }
        $this->updateIfSettings($data, $env_vars['interface']);
        $data = [
            'primarydns' => $named_dns[0] ?? '',
            'secondarydns' => $named_dns[1] ?? '',
        ];
        $this->updateDnsSettings($data, $env_vars['interface']);
    }

    /**
     * Updates the interface settings with the provided data.
     *
     * @param array  $data The data to update the interface settings with.
     * @param string $name The name of the interface.
     *
     * @return void;
     */
    public function updateIfSettings(array $data, string $name):void
    {
        /** @var LanInterfaces $res */
        $res = LanInterfaces::findFirst("interface = '$name' AND vlanid=0");
        if ($res === null || !$this->settingsIsChange($data, $res->toArray())) {
            return;
        }
        foreach ($data as $key => $value) {
            $res->writeAttribute($key, $value);
        }
        $res->save();
    }

    /**
     * Updates the DNS settings with the provided data.
     *
     * @param array  $data The data to update the DNS settings with.
     * @param string $name The name of the interface.
     *
     * @return void
     */
    public function updateDnsSettings($data, $name): void
    {
        /** @var LanInterfaces $res */
        $res = LanInterfaces::findFirst("interface = '$name' AND vlanid=0");
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
        $res->save();
    }

    /**
     * Checks if the network settings have changed.
     *
     * @param array $data    The new network settings.
     * @param array $dbData  The existing network settings from the database.
     *
     * @return bool  Returns true if the settings have changed, false otherwise.
     */
    private function settingsIsChange(array $data, array $dbData): bool
    {
        $isChange = false;
        foreach ($dbData as $key => $value) {
            if (!isset($data[$key]) || (string)$value === (string)$data[$key]) {
                continue;
            }
            Util::sysLogMsg(__METHOD__, "Find new network settings: {$key} changed {$value}=>{$data[$key]}");
            $isChange = true;
        }
        return $isChange;
    }

    /**
     * Retrieves the interface name by its ID.
     *
     * @param string $id_net  The ID of the network interface.
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
     * @return array  An array of enabled LAN interfaces.
     */
    public function getEnabledLanInterfaces(): array
    {
        /** @var LanInterfaces $res */
        $res = LanInterfaces::find('disabled=0');

        return $res->toArray();
    }

    /**
     * Performs deconfiguration of the udhcpc configuration.
     */
    public function udhcpcConfigureDeconfig(): void
    {
        $interface = trim(getenv('interface'));

        // For MIKO LFS Edition.
        $busyboxPath = Util::which('busybox');

        // Bring the interface up.
        Processes::mwExec("{$busyboxPath} ifconfig {$interface} up");

        // Set a default IP configuration for the interface.
        Processes::mwExec("{$busyboxPath} ifconfig {$interface} 192.168.2.1 netmask 255.255.255.0");
    }

    /**
     * Updates the network settings with the provided data.
     * @param array $data The network settings data to update.
     */
    public function updateNetSettings(array $data): void
    {
        $res = LanInterfaces::findFirst("internet = '1'");
        $update_inet = false;
        if ($res === null) {
            // If no interface with internet connection is found, get the first interface.
            $res = LanInterfaces::findFirst();
            $update_inet = true;
        }

        if ($res !== null) {
            foreach ($data as $key => $value) {
                $res->$key = $value;
            }
            if ($update_inet === true) {
                $res->internet = 1;
            }
            $res->save();
        }
    }

    /**
     * Retrieves information about all network interfaces.
     * @return array An array of network interfaces with their respective information.
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
     * @return array An array containing the interface information.
     */
    public function getInterface(string $name): array
    {
        $interface = [];

        // Get ifconfig's output for the specified interface.
        $busyboxPath = Util::which('busybox');
        Processes::mwExec("{$busyboxPath} ifconfig $name 2>/dev/null", $output);
        $output = implode(" ", $output);

        // Parse MAC address.
        preg_match("/HWaddr (\S+)/", $output, $matches);
        $interface['mac'] = (count($matches) > 0) ? $matches[1] : '';

        // Parse IP address.
        preg_match("/inet addr:(\S+)/", $output, $matches);
        $interface['ipaddr'] = (count($matches) > 0) ? $matches[1] : '';

        // Parse subnet mask.
        preg_match("/Mask:(\S+)/", $output, $matches);
        $subnet = (count($matches) > 0) ? $this->netMaskToCidr($matches[1]) : '';
        $interface['subnet'] = $subnet;

        // Check if the interface is up.
        preg_match("/\s+(UP)\s+/", $output, $matches);
        $status = (count($matches) > 0) ? $matches[1] : '';
        if ($status === "UP") {
            $interface['up'] = true;
        } else {
            $interface['up'] = false;
        }
        $busyboxPath = Util::which('busybox');

        // Get the default gateway.
        $grepPath = Util::which('grep');
        $cutPath = Util::which('cut');
        $routePath = Util::which('route');

        Processes::mwExec(
            "{$busyboxPath} {$routePath} -n | {$grepPath} {$name} | {$grepPath} \"^0.0.0.0\" | {$cutPath} -d ' ' -f 10",
            $matches
        );
        $gw = (count($matches) > 0) ? $matches[0] : '';
        if (Verify::isIpAddress($gw)) {
            $interface['gateway'] = $gw;
        }

        // Get DNS servers.
        $catPath = Util::which('cat');
        Processes::mwExec("{$catPath} /etc/resolv.conf | {$grepPath} nameserver | {$cutPath} -d ' ' -f 2", $dnsout);

        $dnsSrv = [];
        foreach ($dnsout as $line) {
            if (Verify::isIpAddress($line)) {
                $dnsSrv[] = $line;
            }
        }
        $interface['dns'] = $dnsSrv;

        return $interface;
    }
}