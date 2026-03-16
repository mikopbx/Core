<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Configs\IptablesConf;

class ReloadFirewallAction implements ReloadActionInterface
{
    /**
     * Applies iptables settings and restart firewall.
     *
     * Fail2ban stop/restart is handled inside reloadFirewall() to prevent
     * "Invariant check failed" errors when iptables INPUT chain is flushed.
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        IptablesConf::updateFirewallRules();
        IptablesConf::reloadFirewall();
    }
}