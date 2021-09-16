<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Processes;
use Phalcon\Di\Injectable;

class IptablesConf extends Injectable
{
    public const IP_TABLE_MIKO_CONF = '/etc/iptables/iptables.mikopbx';
    private bool $firewall_enable;
    private Fail2BanConf $fail2ban;
    private string $sipPort;
    private string $rtpPorts;
    private string $redisPort;
    private string $beanstalkPort;

    /**
     * Firewall constructor.
     */
    public function __construct()
    {
        $this->redisPort     = $this->getDI()->get('config')->redis->port;
        $this->beanstalkPort = $this->getDI()->get('config')->beanstalk->port;

        $firewall_enable       = PbxSettings::getValueByKey('PBXFirewallEnabled');
        $this->firewall_enable = ($firewall_enable === '1');

        $this->sipPort  = PbxSettings::getValueByKey('SIPPort');
        $defaultRTPFrom = PbxSettings::getValueByKey('RTPPortFrom');
        $defaultRTPTo   = PbxSettings::getValueByKey('RTPPortTo');
        $this->rtpPorts = "$defaultRTPFrom:$defaultRTPTo";

        $this->fail2ban = new Fail2BanConf();
    }

    /**
     * Applies iptables settings and restart firewall
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
        unlink($pid_file);
    }

    /**
     * Apples iptables settings
     **/
    public function applyConfig(): void
    {
        $this->fail2ban->fail2banStop();
        $this->dropAllRules();
        $this->fail2ban->fail2banMakeDirs();

        if ($this->firewall_enable) {
            $arr_command   = [];
            $arr_command[] = $this->getIptablesInputRule('', '-m conntrack --ctstate ESTABLISHED,RELATED');
            // Добавляем разрешения на сервисы.
            $this->addMainFirewallRules($arr_command);
            $this->addAdditionalFirewallRules($arr_command);
            // Кастомизация правил firewall.
            $arr_commands_custom = [];
            $out                 = [];
            Util::fileWriteContent('/etc/firewall_additional', '');

            $catPath     = Util::which('cat');
            $grepPath    = Util::which('grep');
            $busyboxPath = Util::which('busybox');
            $awkPath     = Util::which('awk');
            Processes::mwExec(
                "$catPath /etc/firewall_additional | $grepPath -v '|' | $grepPath -v '&'| $grepPath '^iptables' | $busyboxPath $awkPath -F ';' '{print $1}'",
                $arr_commands_custom
            );

            $dropCommand = $this->getIptablesInputRule('', '', 'DROP');
            if (Util::isSystemctl() && ! Util::isDocker()) {
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
                Processes::mwExecCommands($arr_command, $out, 'firewall');
                Processes::mwExecCommands($arr_commands_custom, $out, 'firewall_additional');
                // Все остальное запрещаем.
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
     *  Flush all firewall rules
     */
    private function dropAllRules(): void
    {
        $iptablesPath = Util::which('iptables');
        Processes::mwExec("$iptablesPath -F");
        Processes::mwExec("$iptablesPath -X");
    }

    /**
     * Makes iptables rule string
     *
     * @param string $dport
     * @param string $other_data
     * @param string $action
     *
     * @return string
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
     * Makes iptables rules
     *
     * @param $arr_command
     */
    private function addAdditionalFirewallRules(&$arr_command): void
    {
        /** @var Sip $data */
        $db_data  = Sip::find("type = 'friend' AND ( disabled <> '1')");
        $sipHosts = SIPConf::getSipHosts();

        $hashArray = [];
        foreach ($db_data as $data) {
            $data = $sipHosts[$data->uniqid] ?? [];
            foreach ($data as $host) {
                if (in_array($host, $hashArray, true)) {
                    // Не допускаем повторения хост.
                    continue;
                }
                $hashArray[]   = $host;
                $arr_command[] = $this->getIptablesInputRule($this->sipPort, '-p tcp -s ' . $host . ' ');
                $arr_command[] = $this->getIptablesInputRule($this->sipPort, '-p udp -s ' . $host . ' ');
                $arr_command[] = $this->getIptablesInputRule($this->rtpPorts, '-p udp -s ' . $host . ' ');
            }
        }
        // Allow all local connections
        $arr_command[] = $this->getIptablesInputRule($this->redisPort, '-p tcp -s 127.0.0.1 ');
        $arr_command[] = $this->getIptablesInputRule($this->beanstalkPort, '-p tcp -s 127.0.0.1 ');
        $arr_command[] = $this->getIptablesInputRule('', '-s 127.0.0.1 ');
        unset($db_data, $sipHosts, $result, $hashArray);
    }

    /**
     * Формирование основных правил для iptables.
     * @param $arr_command
     */
    private function addMainFirewallRules(&$arr_command):void{
        /** @var FirewallRules $result */
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
                Util::sysLogMsg('Firewall', "network_filter_id not found $rule->networkfilterid", LOG_WARNING);
                continue;
            }
            if ('0.0.0.0/0' === $network_filter->permit && $rule->action !== 'allow') {
                continue;
            }
            $other_data = "-p $rule->protocol";
            $other_data .= ' -s ' . $network_filter->permit;
            if ($rule->protocol === 'icmp') {
                $port       = '';
                $other_data .= ' --icmp-type echo-request';
            }
            $action        = ($rule->action === 'allow') ? 'ACCEPT' : 'DROP';
            $arr_command[] = $this->getIptablesInputRule($port, $other_data, $action);
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
            $rule->portfrom = $portSet[$rule->portFromKey]??'0';
            $rule->portto = $portSet[$rule->portToKey]??'0';
            $rule->update();
        }
    }

}
