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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Common\Models\{FirewallRules, NetworkFilters, PbxSettings, Sip};
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\Utilities\IpAddressHelper;
use Phalcon\Di\Injectable;

/**
 * Class IptablesConf
 *
 * Manages the creation and application of iptables rules, using various configuration settings.
 *
 * @package MikoPBX\Core\System\Configs
 */
class IptablesConf extends Injectable
{
    // Path to the MikoPBX iptables configuration file.
    public const string IP_TABLE_MIKO_CONF = '/etc/iptables/iptables.mikopbx';

    // Indicates if the firewall is enabled.
    private bool $firewall_enable;

    // Various port settings.
    private string $sipPort;
    private string $tlsPort;
    private string $rtpPorts;
    private int $maxReqSec = 0;

    /**
     * Firewall constructor.
     *
     * Initializes object properties based on configuration settings.
     */
    public function __construct()
    {
        // Check if the firewall is enabled.
        $this->firewall_enable  =  intval(PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_ENABLED)) === 1;
        // Get the SIP, TLS, and RTP port settings.
        $this->sipPort          = PbxSettings::getValueByKey(PbxSettings::SIP_PORT);
        $this->tlsPort          = PbxSettings::getValueByKey(PbxSettings::TLS_PORT);
        $defaultRTPFrom         = PbxSettings::getValueByKey(PbxSettings::RTP_PORT_FROM);
        $defaultRTPTo           = PbxSettings::getValueByKey(PbxSettings::RTP_PORT_TO);
        $this->maxReqSec        = intval(PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_MAX_REQ));
        $this->rtpPorts         = "$defaultRTPFrom:$defaultRTPTo";
    }

    /**
     * Applies iptables settings and restarts firewall.
     *
     * The method first checks if a firewall restart process is already running. If not, it starts a new process,
     * applies the configuration and removes the process file. If a process is already running, it simply returns.
     */
    public static function reloadFirewall(): void
    {
        $pid_file = '/var/run/service_reload_firewall.pid';
        if (file_exists($pid_file)) {
            $old_pid = file_get_contents($pid_file);
            $process = Processes::getPidOfProcess("^$old_pid");
            if ($process !== '') {
                return; // another restart process exists
            }
        }
        file_put_contents($pid_file, getmypid());

        $firewall = new self();
        $firewall->applyConfig();
        if(file_exists($pid_file)){
            unlink($pid_file);
        }
    }

    /**
     * Applies iptables settings.
     *
     * It stops Fail2Ban, drops all existing rules, and then re-creates them based on the current configuration.
     * If the firewall is enabled, it applies the main and additional firewall rules.
     * It also takes care of setting up Fail2Ban according to its enabled status.
     *
     * IMPORTANT: If no firewall rules exist in database, all traffic is allowed (no DROP rule applied).
     * This prevents locking out SSH/WEB access when firewall is enabled without configured rules.
     */
    public function applyConfig(): void
    {
        // Skip iptables configuration in Docker containers - networking is handled by Docker
        if (System::isDocker()) {
            return;
        }

        $this->dropAllRules();
        if ($this->firewall_enable) {
            // Check if any firewall rules exist in database
            // If no rules configured - allow all traffic (don't apply DROP at the end)
            $hasRules = NetworkFilters::count() > 0;

            $arr_command   = [];
            $arr_command[] = $this->getIptablesInputRule('', '-m conntrack --ctstate ESTABLISHED,RELATED');
            if($this->maxReqSec > 0){
                $advancedSipRules = [
                    [$this->sipPort, 'udp'],
                    [$this->sipPort, 'tcp'],
                    [$this->tlsPort, 'tcp']
                ];
                foreach ($advancedSipRules as [$port, $protocol]) {
                    $arr_command[] = $this->getIptablesInputRule($port, "-p $protocol -m state --state NEW -m recent --set --name SipAttacks", '');
                    $arr_command[] = $this->getIptablesInputRule($port, "-p $protocol -m state --state NEW -m recent --update --seconds 1 --hitcount $this->maxReqSec --name SipAttacks", 'DROP');
                }
            }
            // Add allowed services
            $this->addMainFirewallRules($arr_command);
            $this->addAdditionalFirewallRules($arr_command);

            // Add firewall rules customisation
            $arr_commands_custom = [];
            $out                 = [];
            Util::fileWriteContent('/etc/firewall_additional', '');

            $cat     = Util::which('cat');
            $grep    = Util::which('grep');
            $awk     = Util::which('awk');
            Processes::mwExec(
                "$cat /etc/firewall_additional | $grep -v '|' | $grep -v '&'| $grep '^iptables' | $awk -F ';' '{print $1}'",
                $arr_commands_custom
            );

            // T2SDE or Docker
            Processes::mwExecCommands($arr_command, $out, 'firewall');
            Processes::mwExecCommands($arr_commands_custom, $out, 'firewall_additional');

            // Drop everything else - but ONLY if rules are configured
            // If no rules exist, allow all traffic to prevent lockout
            if ($hasRules) {
                // IPv4 DROP
                $dropCommand = $this->getIptablesInputRule('', '', 'DROP');
                Processes::mwExec($dropCommand);

                // IPv6 DROP
                $ip6tablesPath = Util::which('ip6tables');
                if (!empty($ip6tablesPath)) {
                    Processes::mwExec("$ip6tablesPath -A INPUT -j DROP");
                }
            }
        }
    }

    /**
     *  Flushes all firewall rules.
     *
     * It uses the iptables and ip6tables commands to flush the INPUT chain for both IPv4 and IPv6.
     */
    private function dropAllRules(): void
    {
        // Skip in Docker containers
        if (System::isDocker()) {
            return;
        }

        // Flush IPv4 rules
        $iptablesPath = Util::which('iptables');
        Processes::mwExec("$iptablesPath -F INPUT");
        Processes::mwExec("$iptablesPath -X INPUT");

        // Flush IPv6 rules
        $ip6tablesPath = Util::which('ip6tables');
        if (!empty($ip6tablesPath)) {
            Processes::mwExec("$ip6tablesPath -F INPUT");
            Processes::mwExec("$ip6tablesPath -X INPUT");
        }
    }

    /**
     * Makes iptables rule string.
     *
     * @param string $dport The destination port for the rule.
     * @param string $other_data Any other data to include in the rule.
     * @param string $action The action to take when the rule matches (default is 'ACCEPT').
     *
     * @return string The iptables rule as a string.
     */
    private function getIptablesInputRule(string $dport = '', string $other_data = '', string $action = 'ACCEPT'): string
    {
        $data_port = '';
        if (trim($dport) !== '') {
            $data_port = '--dport ' . $dport;
        }
        $other_data = trim($other_data);
        if (trim($action) !== '') {
            $action = '-j ' . $action;
        }
        return "iptables -A INPUT $other_data $data_port $action";
    }

    /**
     * Generates a firewall rule (iptables or ip6tables) based on IP address version.
     *
     * Detects if the subnet is IPv4 or IPv6 and generates the appropriate firewall command.
     *
     * @param string $subnet The subnet or IP address (CIDR notation or single IP).
     * @param string $protocol The protocol (tcp, udp, icmp).
     * @param string $other_data Additional rule parameters.
     * @param string $action The action to take (ACCEPT, DROP, etc.).
     *
     * @return string The firewall rule command (iptables or ip6tables).
     */
    private function getFirewallRule(string $subnet, string $protocol, string $other_data = '', string $action = 'ACCEPT'): string
    {
        $other_data = trim($other_data);
        if (trim($action) !== '') {
            $action = '-j ' . $action;
        }

        // Extract IP address from CIDR notation if present
        $ip = $subnet;
        if (strpos($subnet, '/') !== false) {
            [$ip, ] = explode('/', $subnet, 2);
        }

        // Detect IP version
        $isIpv6 = IpAddressHelper::isIpv6($ip);

        // Generate appropriate firewall command
        if ($isIpv6) {
            return "ip6tables -A INPUT -s $subnet -p $protocol $other_data $action";
        } else {
            return "iptables -A INPUT -s $subnet -p $protocol $other_data $action";
        }
    }

    /**
     * Adds additional firewall rules.
     *
     * @param array $arr_command Reference to the command array.
     *
     * @return void
     */
    private function addAdditionalFirewallRules(array &$arr_command): void
    {
        $db_data  = Sip::find("type = 'friend' AND ( disabled <> '1')");
        $sipHosts = SIPConf::getSipHosts();

        $hashArray = [];
        /** @var Sip $data */
        foreach ($db_data as $data) {
            $data = $sipHosts[$data->uniqid] ?? [];
            foreach ($data as $host) {
                // Skip localhost addresses (IPv4 and IPv6)
                if ($host === '127.0.0.1' || $host === '::1') {
                    continue;
                }
                if (in_array($host, $hashArray, true)) {
                    // For every unique host only one string.
                    continue;
                }
                $hashArray[] = $host;

                // Use dual-stack firewall rule generation
                $arr_command[] = $this->getFirewallRule($host, 'tcp', "-m multiport --dport $this->sipPort,$this->tlsPort");
                $arr_command[] = $this->getFirewallRule($host, 'udp', "-m multiport --dport $this->sipPort,$this->rtpPorts");
            }
        }

        // Allow all local connections (both IPv4 and IPv6)
        $arr_command[] = $this->getIptablesInputRule('', '-s 127.0.0.1 ');
        $arr_command[] = "ip6tables -A INPUT -s ::1 -j ACCEPT";

        unset($db_data, $sipHosts, $hashArray);
    }

    /**
     * Adds the main firewall rules.
     *
     * @param array<string> $arr_command Reference to the command array.
     * @return void
     */
    public function addMainFirewallRules(array &$arr_command):void
    {
        $options = [];
        $result = FirewallRules::find('action="allow"');
        /** @var FirewallRules $rule */
        foreach ($result as $rule) {
            if ($rule->portfrom !== $rule->portto && trim($rule->portto) !== '') {
                $port = "$rule->portfrom:$rule->portto";
            } else {
                $port = $rule->portfrom;
            }
            /** @var NetworkFilters $network_filter */
            $network_filter = NetworkFilters::findFirst($rule->networkfilterid);
            if ($network_filter === null) {
                SystemMessages::sysLogMsg('Firewall', "network_filter_id not found $rule->networkfilterid", LOG_WARNING);
                continue;
            }
            if ('0.0.0.0/0' === $network_filter->permit && $rule->action !== 'allow') {
                continue;
            }
            $options[$rule->protocol][$network_filter->permit][] = $port;
        }

        $this->makeCmdMultiport($options, $arr_command);
    }

    /**
     * Constructs the multiport command and adds it to the command array.
     *
     * Automatically detects IP version (IPv4 or IPv6) and generates appropriate firewall rules.
     *
     * @param array<string, mixed> $options      Options for constructing the command.
     * @param array<string> $arr_command  Reference to the command array.
     *
     * @return void
     */
    private function makeCmdMultiport(array $options, array &$arr_command): void
    {
        foreach ($options as $protocol => $data){
            foreach ($data as $subnet => $ports){
                if($protocol === 'icmp'){
                    $other_data = '--icmp-type echo-reques';
                }else{
                    $portsString = implode(',', array_unique($ports));
                    $other_data = "-m multiport --dport $portsString";
                }

                // Use dual-stack firewall rule generation based on IP version detection
                $arr_command[] = $this->getFirewallRule($subnet, $protocol, $other_data);
            }
        }
    }

    /**
     * Updates firewall rules according to default template
     */
    public static function updateFirewallRules(): void
    {
        $portSet   = FirewallRules::getProtectedPortSet();
        $portNames = array_keys($portSet);

        $conditions = [
            'conditions' => 'portFromKey IN ({ids:array}) OR portToKey IN ({ids:array})',
            'bind'       => [
                'ids' => $portNames,
            ],
        ];
        $rules      = FirewallRules::find($conditions);
        foreach ($rules as $rule) {
            $from   = $portSet[$rule->portFromKey]??'0';
            $to     = $portSet[$rule->portToKey]??'0';
            if($from === $rule->portfrom && $to === $rule->portto){
                continue;
            }
            $rule->portfrom = $from;
            $rule->portto = $to;
            $rule->update();
        }
    }

}
