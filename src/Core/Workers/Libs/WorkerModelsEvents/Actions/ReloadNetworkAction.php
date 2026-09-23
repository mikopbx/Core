<?php

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Core\System\Configs\DnsConf;
use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\SystemMessages;

class ReloadNetworkAction implements ReloadActionInterface
{
    // Fields that switch IPv4 between DHCP and static or add/remove an interface
    private const MODE_CHANGE_FIELDS = ['dhcp', 'disabled', 'interface'];

    // IPv4 settings (need reload only on static interfaces)
    private const STATIC_IP_FIELDS = ['ipaddr', 'subnet', 'gateway'];

    // IPv6 settings (need reapply only on manual IPv6 interfaces)
    private const STATIC_IPV6_FIELDS = ['ipv6addr', 'ipv6_subnet', 'ipv6_gateway'];

    /**
     * Refreshes networks configs and restarts network daemon
     *
     * Analyzes changed fields to determine the appropriate reload strategy:
     * - DHCP mode / enabled / interface name changed: Full restart with DHCP client restart
     * - IPv4 IP/subnet/gateway changed on static interface: Network reload preserving DHCP clients
     * - IPv6 mode changed, or IPv6 addr/subnet/gateway changed on manual interface:
     *   IPv6 reapplied on that interface only, IPv4 and udhcpc untouched (issue #1128)
     * - Only IP/DNS changed on DHCP/Auto interface: DNS restart only (DHCP handles IP)
     *
     * NOTE: changedFields format is {"fieldName": "fieldName"} (field names only, no old/new values)
     *
     * @param array $parameters Array of model change data with changedFields
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        $plan = self::planReload($parameters, static fn($id) => LanInterfaces::findFirstById($id));

        if ($plan['dhcpRestart']) {
            Network::networkReload(false);
            return;
        }

        if ($plan['networkReload']) {
            // WHY skipDhcpRestart=true: Only the static interface IP changed,
            // no need to kill DHCP clients on other interfaces
            Network::networkReload(true);
            return;
        }

        $network = new Network();
        if ($plan['ipv6InterfaceIds'] !== []) {
            $network->ipv6Reconfigure($plan['ipv6InterfaceIds']);
        }

        // WHY no lanConfigure(): DHCP client (udhcpc) already applied the IP via its callback,
        // and lanConfigure() would reset interfaces and break the DHCPv6 client.
        $dnsConf = new DnsConf();
        $dnsConf->resolveConfGenerate($network->getHostDNS());
        $dnsConf->reStart();
    }

    /**
     * Picks the reload strategy for a batch of LanInterfaces changes.
     *
     * @param array $parameters Model change data with changedFields and recordId
     * @param callable(int|string): ?object $findInterface Loads a LanInterfaces record by id
     * @return array{dhcpRestart: bool, networkReload: bool, ipv6InterfaceIds: array<int|string>}
     */
    public static function planReload(array $parameters, callable $findInterface): array
    {
        $plan = ['dhcpRestart' => false, 'networkReload' => false, 'ipv6InterfaceIds' => []];

        foreach ($parameters as $modelData) {
            $changedFields = $modelData['changedFields'] ?? [];
            $recordId = $modelData['recordId'] ?? null;

            foreach (self::MODE_CHANGE_FIELDS as $field) {
                if (array_key_exists($field, $changedFields)) {
                    SystemMessages::sysLogMsg(
                        __METHOD__,
                        "Network mode field '{$field}' changed (recordId: " . ($recordId ?? 'unknown') . ") - full DHCP restart required",
                        LOG_WARNING
                    );
                    $plan['dhcpRestart'] = true;
                    return $plan;
                }
            }

            $ipv4Changed = self::anyChanged($changedFields, self::STATIC_IP_FIELDS);
            $ipv6ModeChanged = array_key_exists('ipv6_mode', $changedFields);
            $ipv6Changed = self::anyChanged($changedFields, self::STATIC_IPV6_FIELDS);
            if ($recordId === null || (!$ipv4Changed && !$ipv6ModeChanged && !$ipv6Changed)) {
                continue;
            }

            $lanInterface = $findInterface($recordId);
            if ($lanInterface === null) {
                continue;
            }

            if ($ipv4Changed && $lanInterface->dhcp !== '1') {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Static interface IP settings changed (interface ID: {$recordId}) - network reload required",
                    LOG_WARNING
                );
                $plan['networkReload'] = true;
            }

            if ($ipv6ModeChanged || ($ipv6Changed && $lanInterface->ipv6_mode === '2')) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "IPv6 settings changed (interface ID: {$recordId}) - IPv6-only reconfigure, IPv4 DHCP preserved",
                    LOG_INFO
                );
                $plan['ipv6InterfaceIds'][] = $recordId;
            }
        }

        return $plan;
    }

    private static function anyChanged(array $changedFields, array $fields): bool
    {
        return array_intersect_key($changedFields, array_flip($fields)) !== [];
    }
}
