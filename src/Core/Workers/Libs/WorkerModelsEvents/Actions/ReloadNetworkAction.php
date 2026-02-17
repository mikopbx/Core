<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Core\System\Configs\DnsConf;
use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\SystemMessages;

class ReloadNetworkAction implements ReloadActionInterface
{
    /**
     * Refreshes networks configs and restarts network daemon
     *
     * Analyzes changed fields to determine the appropriate reload strategy:
     * - DHCP mode changed: Full restart with DHCP client restart
     * - IPv6 mode changed: Full restart with DHCP client restart
     * - Interface enabled/disabled: Full restart with DHCP client restart
     * - Interface name changed: Full restart with DHCP client restart
     * - IPv4 IP/subnet/gateway changed on static interface: Network reload preserving DHCP clients
     * - IPv6 addr/subnet/gateway changed on manual interface: Network reload preserving DHCP clients
     * - Only IP/DNS changed on DHCP/Auto interface: DNS restart only (DHCP handles IP)
     *
     * NOTE: changedFields format is {"fieldName": "fieldName"} (field names only, no old/new values)
     *
     * @param array $parameters Array of model change data with changedFields
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        $needDhcpRestart = false;
        $needNetworkReload = false;

        // Fields that indicate a mode change requiring full DHCP client restart
        $modeChangeFields = ['dhcp', 'ipv6_mode', 'disabled', 'interface'];

        // Fields that indicate IPv4 settings change (may need reload for static interfaces)
        $staticIpFields = ['ipaddr', 'subnet', 'gateway'];

        // Fields that indicate IPv6 settings change (may need reload for manual IPv6 interfaces)
        $staticIpv6Fields = ['ipv6addr', 'ipv6_subnet', 'ipv6_gateway'];

        // Analyze changed fields from all parameter hashes
        foreach ($parameters as $hash => $modelData) {
            $changedFields = $modelData['changedFields'] ?? [];

            // Check if any mode change field was modified
            // WHY: Mode changes (DHCP on/off, IPv6 mode, enable/disable) require killing
            // and restarting DHCP clients to switch between DHCP and static configuration
            foreach ($modeChangeFields as $field) {
                if (array_key_exists($field, $changedFields)) {
                    $needDhcpRestart = true;
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "Network mode field '{$field}' changed (recordId: " . ($modelData['recordId'] ?? 'unknown') . ") - full DHCP restart required",
                        LOG_WARNING
                    );
                    break 2;
                }
            }

            // Check if IPv4 settings changed on a static (non-DHCP) interface
            // WHY: When ipaddr/subnet/gateway changes on a static interface, lanConfigure() must run
            // to apply the new IP via ifconfig. For DHCP interfaces, udhcpc handles IP application,
            // so only DNS restart is needed.
            foreach ($staticIpFields as $field) {
                if (array_key_exists($field, $changedFields)) {
                    $recordId = $modelData['recordId'] ?? null;
                    if ($recordId !== null) {
                        $lanInterface = LanInterfaces::findFirstById($recordId);
                        if ($lanInterface !== null && $lanInterface->dhcp !== '1') {
                            $needNetworkReload = true;
                            SystemMessages::sysLogMsg(
                                __METHOD__,
                                "Static interface IP settings changed (field: {$field}, interface ID: {$recordId}) - network reload required",
                                LOG_WARNING
                            );
                            break 2;
                        }
                    }
                }
            }

            // Check if IPv6 settings changed on a manual (ipv6_mode=2) interface
            // WHY: When ipv6addr/ipv6_subnet/ipv6_gateway changes on a manual IPv6 interface,
            // lanConfigure() must run to apply the new address via ip command.
            // For Auto mode (ipv6_mode=1), DHCPv6/SLAAC handles address application.
            foreach ($staticIpv6Fields as $field) {
                if (array_key_exists($field, $changedFields)) {
                    $recordId = $modelData['recordId'] ?? null;
                    if ($recordId !== null) {
                        $lanInterface = LanInterfaces::findFirstById($recordId);
                        if ($lanInterface !== null && $lanInterface->ipv6_mode === '2') {
                            $needNetworkReload = true;
                            SystemMessages::sysLogMsg(
                                __METHOD__,
                                "Manual IPv6 interface settings changed (field: {$field}, interface ID: {$recordId}) - network reload required",
                                LOG_WARNING
                            );
                            break 2;
                        }
                    }
                }
            }
        }

        if ($needDhcpRestart) {
            // Full network reload with DHCP client restart (mode change)
            Network::networkReload(false);
            return;
        }

        if ($needNetworkReload) {
            // Network reload preserving DHCP clients (static IP change)
            // WHY skipDhcpRestart=true: Only the static interface IP changed,
            // no need to kill DHCP clients on other interfaces
            Network::networkReload(true);
            return;
        }

        // Only IP/DNS changed on DHCP interface - update DNS only, skip network reconfiguration
        // WHY: DHCP client (udhcpc) already applied the IP via its callback.
        // Running lanConfigure() here would cause unnecessary IPv6 interface resets
        // that break DHCPv6 client.
        $network = new Network();
        $dnsConf = new DnsConf();
        $dnsConf->resolveConfGenerate($network->getHostDNS());
        $dnsConf->reStart();
    }
}
