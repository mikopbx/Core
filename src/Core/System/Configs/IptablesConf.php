<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2020
 */

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Common\Models\{FirewallRules, NetworkFilters};
use MikoPBX\Core\System\MikoPBXConfig;
use MikoPBX\Core\System\Util;
use Phalcon\Di\Injectable;

class IptablesConf extends Injectable
{
    private bool $firewall_enable;
    private Fail2BanConf $fail2ban;

    /**
     * Firewall constructor.
     */
    public function __construct()
    {
        $mikoPBXConfig = new MikoPBXConfig();

        $firewall_enable       = $mikoPBXConfig->getGeneralSettings('PBXFirewallEnabled');
        $this->firewall_enable = ($firewall_enable === '1');

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
            $process = Util::getPidOfProcess("^{$old_pid}");
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
            $this->addFirewallRules($arr_command);
            // Все остальное запрещаем.
            $arr_command[] = $this->getIptablesInputRule('', '', 'DROP');

            // Кастомизация правил firewall.
            $arr_commands_custom = [];
            $out                 = [];
            Util::fileWriteContent('/etc/firewall_additional', '');

            $catPath     = Util::which('cat');
            $grepPath    = Util::which('grep');
            $busyboxPath = Util::which('busybox');
            $awkPath     = Util::which('awk');
            Util::mwExec(
                "{$catPath} /etc/firewall_additional | {$grepPath} -v '|' | {$grepPath} -v '&'| {$grepPath} '^iptables' | {$busyboxPath} {$awkPath} -F ';' '{print $1}'",
                $arr_commands_custom
            );
            if (Util::isSystemctl()) {
                Util::mwMkdir('/etc/iptables');
                file_put_contents('/etc/iptables/iptables.mikopbx', implode("\n", $arr_command));
                file_put_contents(
                    '/etc/iptables/iptables.mikopbx',
                    "\n" . implode("\n", $arr_commands_custom),
                    FILE_APPEND
                );
                $systemctlPath = Util::which('systemctl');
                Util::mwExec("{$systemctlPath} restart mikopbx_iptables");
            } else {
                Util::mwExecCommands($arr_command, $out, 'firewall');
                Util::mwExecCommands($arr_commands_custom, $out, 'firewall_additional');
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
        Util::mwExec("{$iptablesPath} -F");
        Util::mwExec("{$iptablesPath} -X");
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
    private function getIptablesInputRule($dport = '', $other_data = '', $action = 'ACCEPT'): string
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
    private function addFirewallRules(&$arr_command): void
    {
        /** @var \MikoPBX\Common\Models\FirewallRules $result */
        /** @var \MikoPBX\Common\Models\FirewallRules $rule */
        $result = FirewallRules::find();
        foreach ($result as $rule) {
            if ($rule->portfrom !== $rule->portto && trim($rule->portto) !== '') {
                $port = "{$rule->portfrom}:{$rule->portto}";
            } else {
                $port = $rule->portfrom;
            }
            /** @var \MikoPBX\Common\Models\NetworkFilters $network_filter */
            $network_filter = NetworkFilters::findFirst($rule->networkfilterid);
            if ($network_filter === null) {
                Util::sysLogMsg('Firewall', "network_filter_id not found {$rule->networkfilterid}");
                continue;
            }
            if ('0.0.0.0/0' === $network_filter->permit && $rule->action !== 'allow') {
                continue;
            }
            $other_data = "-p {$rule->protocol}";
            $other_data .= ($network_filter === null) ? '' : ' -s ' . $network_filter->permit;
            if ($rule->protocol === 'icmp') {
                $port       = '';
                $other_data .= ' --icmp-type echo-request';
            }

            $action        = ($rule->action === 'allow') ? 'ACCEPT' : 'DROP';
            $arr_command[] = $this->getIptablesInputRule($port, $other_data, $action);
        }
        // Allow all local connections
        $arr_command[] = $this->getIptablesInputRule('', '-s 127.0.0.1 ', 'ACCEPT');
    }

    /**
     * Updates firewall rules according to default template
     *
     */
    public static function updateFirewallRules(): void
    {
        // Store current conditions
        $currentRules  = [];
        $firewallRules = FirewallRules::find();
        foreach ($firewallRules as $firewallRule) {
            $currentRules[$firewallRule->networkfilterid][$firewallRule->category] =
                        [
                            'action'      => $firewallRule->action,
                            'description' => $firewallRule->description
                        ];
        }
        // Delete outdated records
        $firewallRules->delete();

        $defaultRules   = FirewallRules::getDefaultRules();
        $networkFilters = NetworkFilters::find();

        foreach ($networkFilters as $networkFilter) {
            foreach ($defaultRules as $key => $value) {
                foreach ($value['rules'] as $rule) {
                    $newRule                  = new FirewallRules();
                    $newRule->networkfilterid = $networkFilter->id;
                    $newRule->protocol        = $rule['protocol'];
                    $newRule->portfrom        = $rule['portfrom'];
                    $newRule->portto          = $rule['portto'];
                    $newRule->category        = $key;

                    if (array_key_exists($key, $currentRules[$networkFilter->id])) {
                        $newRule->action = $currentRules[$networkFilter->id][$key]['action'];
                    } else {
                        $newRule->action = 'block';
                    }
                    $newRule->description = $currentRules[$networkFilter->id][$key]['description'];
                    $newRule->save();
                }
            }
        }
    }
}
