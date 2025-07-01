<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\Configs\IptablesConf;

class ReloadFirewallAction implements ReloadActionInterface
{
    /**
     * Applies iptables settings and restart firewall
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        IptablesConf::updateFirewallRules();
        IptablesConf::reloadFirewall();

        $fail2ban = new Fail2BanConf();
        $fail2ban->reStart();
    }
}