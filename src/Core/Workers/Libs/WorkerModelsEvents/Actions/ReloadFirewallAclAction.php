<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Configs\Fail2BanConf;
use MikoPBX\Core\System\System;

/**
 * Regenerates the Asterisk ACL deny files and reloads the modules that consume them
 * when the firewall or fail2ban master switch is toggled on a no-iptables host
 * (Docker, LXC without CAP_NET_ADMIN).
 *
 * Without this, disabling the firewall/fail2ban left stale deny rules loaded in
 * Asterisk and previously-blocked hosts stayed rejected (GitHub #1080). The heavy
 * lifting and the restart-safe reload rationale live in
 * {@see Fail2BanConf::regenerateAsteriskAclsAndReload()}; the call is a no-op where
 * iptables is available.
 */
class ReloadFirewallAclAction implements ReloadActionInterface
{
    /**
     * Regenerates Asterisk ACL deny files and reloads the acl/iax modules.
     *
     * @param array $parameters
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        // Settings changes can be processed during boot (e.g. provisioning) before Asterisk
        // is up; the boot config generation already builds the ACL files, so skip the live
        // 'asterisk -rx' reload here. The fail2ban ban/unban callers run at runtime and call
        // regenerateAsteriskAclsAndReload() directly, reloading unconditionally.
        if (System::isBooting()) {
            return;
        }
        Fail2BanConf::regenerateAsteriskAclsAndReload();
    }
}
