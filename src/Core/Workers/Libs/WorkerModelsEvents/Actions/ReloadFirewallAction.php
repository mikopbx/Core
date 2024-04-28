<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

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
    }
}