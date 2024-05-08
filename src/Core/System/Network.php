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
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
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
    public const INTERNET_FLAG_FILE = '/var/etc/internet_flag';

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
    public function getInterfacesNames(): array
    {
        $grepPath = Util::which('grep');
        $awkPath = Util::which('awk');
        if (Util::isDocker()) {
            $ifconfigPath = Util::which('ifconfig');
            $command = "{$ifconfigPath} | {$grepPath} -o -E '^[a-zA-Z0-9]+' | {$grepPath} -v 'lo'";
        } else {
            // Universal command to retrieve all PCI network interfaces.
            $lsPath = Util::which('ls');
            $command = "{$lsPath} -l /sys/class/net | {$grepPath} devices | {$grepPath} -v virtual | {$awkPath} '{ print $9 }'";
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
        if (!Util::isDocker()) {
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

            $if_name = $if_data['interface'];
            $if_name = escapeshellcmd(trim($if_name));

            $commands = [
                'subnet' => $ifconfig . ' '.$if_name.' | '.$awk.' \'/Mask:/ {sub("Mask:", "", $NF); print $NF}\'',
                'ipaddr' => $ifconfig . ' '.$if_name.' | '.$awk.' \'/inet / {sub("addr:", "", $2); print $2}\'',
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

            // Save information to the database.
            $this->updateIfSettings($data, $if_name);
        }

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
                $eth_settings->internet = '1';
                if (PbxSettings::getValueByKey(PbxSettingsConstants::ENABLE_USE_NAT)==='1'){
                    $eth_settings->topology=LanInterfaces::TOPOLOGY_PRIVATE;
                }
                $eth_settings->save();
            }
        }

        return $networks;
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
     * @param array $data The data to update the interface settings with.
     * @param string $name The name of the interface.
     *
     * @return void;
     */
    public function updateIfSettings(array $data, string $name): void
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
     * Checks if the network settings have changed.
     *
     * @param array $data The new network settings.
     * @param array $dbData The existing network settings from the database.
     *
     * @return bool  Returns true if the settings have changed, false otherwise.
     */
    public function settingsIsChange(array $data, array $dbData): bool
    {
        $isChange = false;
        foreach ($dbData as $key => $value) {
            if (!isset($data[$key]) || (string)$value === (string)$data[$key]) {
                continue;
            }
            SystemMessages::sysLogMsg(__METHOD__, "Find new network settings: {$key} changed {$value}=>{$data[$key]}");
            $isChange = true;
        }
        return $isChange;
    }

    /**
     * Updates the DNS settings with the provided data.
     *
     * @param array $data The data to update the DNS settings with.
     * @param string $name The name of the interface.
     *
     * @return void
     */
    public function updateDnsSettings(array $data, string $name): void
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
     * @return array  An array of enabled LAN interfaces.
     */
    public function getEnabledLanInterfaces(): array
    {
        /** @var LanInterfaces $res */
        $res = LanInterfaces::find('disabled=0');

        return $res->toArray();
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
     * Update external IP address
     */
    public function updateExternalIp(): void
    {
        if (PbxSettings::getValueByKey(PbxSettingsConstants::AUTO_UPDATE_EXTERNAL_IP)!=='1'){
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
                        SystemMessages::sysLogMsg(__METHOD__, "External IP address updated for interface {$lan->interface}");
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
        if (Util::isDocker()) {
            return;
        }

        if ('start' === $action) {

            /**
             * Generate the resolv.conf file for DNS configuration.
             */
            $this->resolvConfGenerate();
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
                $systemctlPath = Util::which('systemctl');
                Processes::mwExec("{$systemctlPath} stop networking");
            } else {
                /**
                 * Stop networking on T2SDE (non-systemd) systems.
                 */
                $if_list = $this->getInterfaces();
                $arr_commands = [];
                $ifconfigPath = Util::which('ifconfig');
                foreach ($if_list as $if_name => $data) {
                    $arr_commands[] = "{$ifconfigPath} $if_name down";
                }

                /**
                 * Execute the stop commands for each interface.
                 */
                Processes::mwExecCommands($arr_commands, $out, 'net_stop');
            }
        }
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
    public function generatePdnsdConfig(array $named_dns): void
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
            $kill = Util::which('kill');
            Processes::mwExec("$kill '$pid'");
        }

        // Start the pdnsd service with the updated configuration
        Processes::mwExec("{$pdnsdPath} -c /etc/pdnsd.conf -4");
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
     * Configures the LAN interfaces and performs related network operations.
     *
     * @return int The result of the configuration process.
     */
    public function lanConfigure(): int
    {
        if (Util::isDocker()) {
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
            $if_name = escapeshellcmd(trim($if_name));
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
                $pid_file = "/var/run/udhcpc_{$if_name}";
                $pid_pcc = Processes::getPidOfProcess($pid_file);
                if (!empty($pid_pcc) && file_exists($pid_file)) {
                    // Terminate the old udhcpc process
                    $kill = Util::which('kill');
                    $cat = Util::which('cat');
                    system("$kill `$cat {$pid_file}` {$pid_pcc}");
                }
                $udhcpc = Util::which('udhcpc');
                $nohup = Util::which('nohup');

                // Obtain IP and wait for the process to finish
                $workerPath = '/etc/rc/udhcpc_configure';
                $options = '-t 6 -T 5 -q -n';
                $arr_commands[] = "$udhcpc $options -i $if_name -x hostname:$hostname -s $workerPath";
                // Start a new udhcpc process in the background
                $options = '-t 6 -T 5 -S -b -n';
                $arr_commands[] = "$nohup $udhcpc $options -p {$pid_file} -i $if_name -x hostname:$hostname -s $workerPath 2>&1 &";
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

                $ifconfig = Util::which('ifconfig');
                $arr_commands[] = "$ifconfig $if_name $ipaddr netmask $subnet";

                if ("" !== trim($gateway)) {
                    $gw_param = "gw $gateway";
                }

                $route = Util::which('route');
                $arr_commands[] = "$route del default $if_name";

                /** @var LanInterfaces $if_data */
                $if_data = LanInterfaces::findFirst("id = '{$if_data['id']}'");
                $is_inet = ($if_data !== null) ? (string)$if_data->internet : '0';

                if ($is_inet === '1') {
                    // Create default route only if the interface is for internet
                    $arr_commands[] = "$route add default $gw_param dev $if_name";
                }
                // Bring up the interface
                $arr_commands[] = "$ifconfig $if_name up";

                $eth_mtu[] = $if_name;
            }
        }
        $out = null;
        Processes::mwExecCommands($arr_commands, $out, 'net');
        $this->hostsGenerate();

        foreach ($eth_mtu as $eth) {
            Processes::mwExecBg("/etc/rc/networking_set_mtu '{$eth}'");
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
        Processes::mwExec($hostnamePath . ' ' . escapeshellarg($data['hostname']));
    }

    /**
     * Add custom static routes based on the `/etc/static-routes` file.
     *
     * @param string $interface The network interface to add routes to, e.g., eth0 (optional)
     * @return void
     */
    protected function addCustomStaticRoutes(string $interface = ''): void
    {
        Util::fileWriteContent('/etc/static-routes', '');

        $grep = Util::which('grep');
        $awk = Util::which('awk');
        $cat = Util::which('cat');
        if (empty($interface)) {
            $command = "$cat /etc/static-routes | $grep '^rout' | $awk -F ';' '{print $1}'";
        } else {
            $command = "$cat /etc/static-routes | $grep '^rout' | $awk -F ';' '{print $1}' | $grep '{$interface}'";
        }
        $arr_commands = [];
        Processes::mwExec($command, $arr_commands);
        Processes::mwExecCommands($arr_commands, $out, 'rout');
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
            Processes::mwExecBg("$openvpn --config /etc/openvpn.ovpn --writepid {$pidFile}", '/dev/null', 5);
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
        $ifconfig = Util::which('ifconfig');
        Processes::mwExec("$ifconfig $name 2>/dev/null", $output);
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

        // Get the default gateway.
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

        // Get DNS servers.
        $cat = Util::which('cat');
        Processes::mwExec("$cat /etc/resolv.conf | $grep nameserver | $cut -d ' ' -f 2", $dnsout);

        $dnsSrv = [];
        foreach ($dnsout as $line) {
            if (Verify::isIpAddress($line)) {
                $dnsSrv[] = $line;
            }
        }
        $interface['dns'] = $dnsSrv;

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
        $network->resolvConfGenerate();
        $network->loConfigure();
        $network->lanConfigure();
        $network->configureLanInDocker();
        $network->updateExternalIp();
    }
}