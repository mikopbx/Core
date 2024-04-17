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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Common\Models\{FirewallRules, NetworkFilters, PbxSettings, PbxSettingsConstants, Sip};
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Processes;
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
    public const IP_TABLE_MIKO_CONF = '/etc/iptables/iptables.mikopbx';

    // Indicates if the firewall is enabled.
    private bool $firewall_enable;

    // The Fail2Ban configuration object.
    private Fail2BanConf $fail2ban;

    // Various port settings.
    private string $sipPort;
    private string $tlsPort;
    private string $rtpPorts;

    /**
     * Firewall constructor.
     *
     * Initializes object properties based on configuration settings.
     */
    public function __construct()
    {
        // Check if the firewall is enabled.
        $firewall_enable       = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_FIREWALL_ENABLED);
        $this->firewall_enable = ($firewall_enable === '1');

        // Get the SIP, TLS, and RTP port settings.
        $this->sipPort  = PbxSettings::getValueByKey(PbxSettingsConstants::SIP_PORT);
        $this->tlsPort  = PbxSettings::getValueByKey(PbxSettingsConstants::TLS_PORT);
        $defaultRTPFrom = PbxSettings::getValueByKey(PbxSettingsConstants::RTP_PORT_FROM);
        $defaultRTPTo   = PbxSettings::getValueByKey(PbxSettingsConstants::RTP_PORT_TO);
        $this->rtpPorts = "$defaultRTPFrom:$defaultRTPTo";

        // Initialize the Fail2Ban configuration.
        $this->fail2ban = new Fail2BanConf();
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
     */
    public function applyConfig(): void
    {
        $this->fail2ban->fail2banStop();
        $this->dropAllRules();
        $this->fail2ban->fail2banMakeDirs();

        if ($this->firewall_enable) {
            $arr_command   = [];
            $arr_command[] = $this->getIptablesInputRule('', '-m conntrack --ctstate ESTABLISHED,RELATED');

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

            $dropCommand = $this->getIptablesInputRule('', '', 'DROP');
            if (Util::isSystemctl()) {
                Util::mwMkdir('/etc/iptables');
                file_put_contents(self::IP_TABLE_MIKO_CONF, implode("\n", $arr_command));
                file_put_contents(
                    self::IP_TABLE_MIKO_CONF,
                    "\n" . implode("\n", $arr_commands_custom),
                    FILE_APPEND
                );
                file_put_contents(
                    self::IP_TABLE_MIKO_CONF,
                    "\n" . $dropCommand,
                    FILE_APPEND
                );
                $systemctlPath = Util::which('systemctl');
                Processes::mwExec("$systemctlPath restart mikopbx_iptables");
            } else {
                // T2SDE or Docker
                Processes::mwExecCommands($arr_command, $out, 'firewall');
                Processes::mwExecCommands($arr_commands_custom, $out, 'firewall_additional');
                // Drop everything else
                Processes::mwExec($dropCommand);
            }
        }

        // Setup fail2ban
        if ($this->fail2ban->fail2ban_enable) {
            $this->fail2ban->writeConfig();
            $this->fail2ban->fail2banStart();
        } else {
            $this->fail2ban->fail2banStop();
        }
    }

    /**
     *  Flushes all firewall rules.
     *
     * It uses the iptables command to flush the INPUT chain.
     */
    private function dropAllRules(): void
    {
        $iptablesPath = Util::which('iptables');
        Processes::mwExec("$iptablesPath -F INPUT");
        Processes::mwExec("$iptablesPath -X INPUT");
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

        return "iptables -A INPUT $other_data $data_port -j $action";
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
        /** @var Sip $data */
        $db_data  = Sip::find("type = 'friend' AND ( disabled <> '1')");
        $sipHosts = SIPConf::getSipHosts();

        $hashArray = [];
        foreach ($db_data as $data) {
            $data = $sipHosts[$data->uniqid] ?? [];
            foreach ($data as $host) {
                if($host === '127.0.0.1'){
                    continue;
                }
                if (in_array($host, $hashArray, true)) {
                    // For every unique host only one string.
                    continue;
                }
                $hashArray[]   = $host;
                $arr_command[] = "iptables -A INPUT -s $host -p tcp -m multiport --dport $this->sipPort,$this->tlsPort -j ACCEPT";
                $arr_command[] = "iptables -A INPUT -s $host -p udp -m multiport --dport $this->sipPort,$this->rtpPorts -j ACCEPT";
            }
        }
        // Allow all local connections
        $arr_command[] = $this->getIptablesInputRule('', '-s 127.0.0.1 ');
        unset($db_data, $sipHosts, $hashArray);
    }

    /**
     * Adds the main firewall rules.
     *
     * @param array $arr_command Reference to the command array.
     *
     * @return void
     */
    public function addMainFirewallRules(array &$arr_command):void
    {
        $options = [];
        /** @var FirewallRules $rule */
        $result = FirewallRules::find('action="allow"');
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
     * @param array $options      Options for constructing the command.
     * @param array $arr_command  Reference to the command array.
     *
     * @return void
     */
    private function makeCmdMultiport($options, &$arr_command)
    {
        foreach ($options as $protocol => $data){
            foreach ($data as $subnet => $ports){
                if($protocol === 'icmp'){
                    $other_data = '--icmp-type echo-reques';
                }else{
                    $portsString = implode(',', array_unique($ports));
                    $other_data = "-m multiport --dport $portsString";
                }
                $arr_command[] = "iptables -A INPUT -s $subnet -p $protocol $other_data -j ACCEPT";
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
