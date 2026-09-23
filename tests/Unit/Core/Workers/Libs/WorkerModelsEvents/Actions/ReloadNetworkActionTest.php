<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadNetworkAction;
use PHPUnit\Framework\TestCase;

require_once 'Globals.php';

/**
 * Reload strategy selection for LanInterfaces changes (issue #1128:
 * an IPv6-only change must not restart the IPv4 DHCP client).
 */
final class ReloadNetworkActionTest extends TestCase
{
    private static function plan(array $changedFields, string $dhcp = '1', string $ipv6Mode = '2'): array
    {
        $lan = (object)['dhcp' => $dhcp, 'ipv6_mode' => $ipv6Mode];
        $parameters = ['h1' => ['recordId' => '1', 'changedFields' => array_combine($changedFields, $changedFields)]];
        return ReloadNetworkAction::planReload($parameters, static fn($id) => $lan);
    }

    public function testIpv6ModeChangeReconfiguresOnlyIpv6(): void
    {
        $plan = self::plan(['ipv6_mode', 'ipv6addr', 'ipv6_subnet', 'ipv6_gateway'], '1', '0');

        self::assertFalse($plan['dhcpRestart']);
        self::assertFalse($plan['networkReload']);
        self::assertSame(['1'], $plan['ipv6InterfaceIds']);
    }

    public function testManualIpv6AddressChangeKeepsIpv4(): void
    {
        $plan = self::plan(['ipv6addr'], '0', '2');

        self::assertFalse($plan['dhcpRestart']);
        self::assertFalse($plan['networkReload']);
        self::assertSame(['1'], $plan['ipv6InterfaceIds']);
    }

    public function testIpv6AddressChangeOnAutoInterfaceNeedsNothing(): void
    {
        $plan = self::plan(['ipv6addr'], '1', '1');

        self::assertSame([], $plan['ipv6InterfaceIds']);
        self::assertFalse($plan['networkReload']);
    }

    public function testDhcpModeChangeStillRestartsDhcp(): void
    {
        self::assertTrue(self::plan(['dhcp', 'ipv6_mode'])['dhcpRestart']);
        self::assertTrue(self::plan(['disabled'])['dhcpRestart']);
        self::assertTrue(self::plan(['interface'])['dhcpRestart']);
    }

    public function testStaticIpv4ChangeReloadsNetwork(): void
    {
        $plan = self::plan(['ipaddr', 'ipv6_mode'], '0');

        self::assertFalse($plan['dhcpRestart']);
        self::assertTrue($plan['networkReload']);
    }

    public function testIpv4ChangeOnDhcpInterfaceNeedsOnlyDns(): void
    {
        $plan = self::plan(['ipaddr', 'gateway'], '1');

        self::assertFalse($plan['dhcpRestart']);
        self::assertFalse($plan['networkReload']);
        self::assertSame([], $plan['ipv6InterfaceIds']);
    }
}
