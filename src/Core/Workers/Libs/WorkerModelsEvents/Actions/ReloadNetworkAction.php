<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\System\Configs\DnsConf;
use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\SystemMessages;

class ReloadNetworkAction implements ReloadActionInterface
{
    /**
     * Refreshes networks configs and restarts network daemon
     *
     * Analyzes changed fields to determine if DHCP clients need restart:
     * - DHCP mode changed (0↔1): Restart required
     * - IPv6 mode changed (0↔1↔2): Restart required
     * - Interface enabled/disabled: Restart required
     * - Only IP/DNS changed: Restart NOT required (DHCP renewal scenario)
     *
     * @param array $parameters Array of model change data with changedFields
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        $needDhcpRestart = false;

        // Analyze changed fields from all parameter hashes
        foreach ($parameters as $hash => $modelData) {
            $changedFields = $modelData['changedFields'] ?? [];

            // Check if DHCP mode changed (0↔1)
            if (isset($changedFields['dhcp']['old'], $changedFields['dhcp']['new'])) {
                if ($changedFields['dhcp']['old'] !== $changedFields['dhcp']['new']) {
                    $needDhcpRestart = true;
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "DHCP mode changed from '{$changedFields['dhcp']['old']}' to '{$changedFields['dhcp']['new']}' - DHCP restart required",
                        LOG_WARNING
                    );
                    break;
                }
            }

            // Check if IPv6 mode changed (0↔1↔2)
            if (isset($changedFields['ipv6_mode']['old'], $changedFields['ipv6_mode']['new'])) {
                if ($changedFields['ipv6_mode']['old'] !== $changedFields['ipv6_mode']['new']) {
                    $needDhcpRestart = true;
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "IPv6 mode changed from '{$changedFields['ipv6_mode']['old']}' to '{$changedFields['ipv6_mode']['new']}' - DHCPv6 restart required",
                        LOG_WARNING
                    );
                    break;
                }
            }

            // Check if interface was enabled/disabled
            if (isset($changedFields['disabled']['old'], $changedFields['disabled']['new'])) {
                if ($changedFields['disabled']['old'] !== $changedFields['disabled']['new']) {
                    $needDhcpRestart = true;
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "Interface enabled/disabled state changed - DHCP restart required",
                        LOG_WARNING
                    );
                    break;
                }
            }

            // Check if interface name changed (rare but critical)
            if (isset($changedFields['interface']['old'], $changedFields['interface']['new'])) {
                if ($changedFields['interface']['old'] !== $changedFields['interface']['new']) {
                    $needDhcpRestart = true;
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "Interface name changed - DHCP restart required",
                        LOG_WARNING
                    );
                    break;
                }
            }
        }

        // Skip DHCP restart if only IP/DNS changed (DHCP renewal scenario)
        $skipDhcpRestart = !$needDhcpRestart;

        if ($skipDhcpRestart) {
            // Only IP/DNS changed (DHCP renewal) - update DNS only, skip network reconfiguration
            // This prevents unnecessary IPv6 interface resets that break DHCPv6 client
            $network = new Network();
            $dnsConf = new DnsConf();
            $dnsConf->resolveConfGenerate($network->getHostDNS());
            $dnsConf->reStart();

            return;
        }

        // Full network reload when DHCP/IPv6 mode changes
        Network::networkReload($skipDhcpRestart);
    }
}
