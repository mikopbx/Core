<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Services;

use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\PBXCoreREST\Http\Request;
use MikoPBX\PBXCoreREST\Services\TokenValidationService;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use Phalcon\Di\Di;

/**
 * Network filter restriction of Bearer API keys.
 *
 * A key bound to a deleted filter used to be accepted from any IP (fail-open), and the deny list
 * was checked before the permit list, so a regular filter (permit=<subnet>, deny=0.0.0.0/0)
 * rejected every client, including the permitted one.
 */
class TokenValidationServiceNetworkFilterTest extends AbstractUnitTest
{
    public function setUp(): void
    {
        parent::setUp();
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $_SERVER['REQUEST_URI'] = '/pbxcore/api/v3/employees';
        $_SERVER['REMOTE_ADDR'] = '192.0.2.10';
    }

    public function tearDown(): void
    {
        unset($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI'], $_SERVER['REMOTE_ADDR']);
        parent::tearDown();
    }

    public function testMissingFilterDeniesAccess(): void
    {
        $missingId = (int)(NetworkFilters::maximum(['column' => 'id']) ?? 0) + 1000;
        $keyData = [
            'id' => 7,
            'full_permissions' => '1',
            'allowed_paths' => '',
            'networkfilterid' => (string)$missingId,
        ];
        $service = new TokenValidationService(Di::getDefault());

        $this->assertFalse(
            $this->invokeMethod($service, 'checkNetworkFilter', [$keyData, new Request()]),
            'a key bound to a deleted filter must not become reachable from any IP'
        );
    }

    /**
     * @return array<string, array{string, string, string, bool}>
     */
    public static function filterProvider(): array
    {
        return [
            'permitted subnet over deny all' => ['192.0.2.10', '192.0.2.0/24', '0.0.0.0/0', true],
            'permitted host over deny all' => ['192.0.2.10', '192.0.2.10/32', '0.0.0.0/0', true],
            'outside permitted subnet' => ['198.51.100.7', '192.0.2.0/24', '0.0.0.0/0', false],
            'internet filter' => ['198.51.100.7', '0.0.0.0/0', '0.0.0.0/0', true],
            'empty permit, denied' => ['198.51.100.7', '', '198.51.100.0/24', false],
            'empty permit, not denied' => ['192.0.2.10', '', '198.51.100.0/24', true],
            'permit list' => ['198.51.100.7', '192.0.2.0/24, 198.51.100.0/24', '0.0.0.0/0', true],
            'permit without deny is an allowlist' => ['198.51.100.7', '192.0.2.0/24', '', false],
            // Asterisk ACL applies permit after deny, so a permit match wins over a narrower deny too
            'deny inside permit' => ['192.0.2.10', '192.0.2.0/24', '192.0.2.0/28', true],
            // Firewall stores deny=0.0.0.0/0 for IPv6 filters too
            'ipv6 permitted' => ['2001:db8::5', '2001:db8::/32', '0.0.0.0/0', true],
            'ipv6 outside' => ['2001:db9::5', '2001:db8::/32', '0.0.0.0/0', false],
            'ipv6 client, ipv4 filter' => ['2001:db8::5', '192.0.2.0/24', '0.0.0.0/0', false],
            'ipv4 client, ipv6 filter' => ['192.0.2.10', '2001:db8::/32', '::/0', false],
            'ipv6 internet filter' => ['2001:db8::5', '::/0', '::/0', true],
            'localhost acl, local v4' => ['127.0.0.1', NetworkFilters::ACL_LOCALHOST, NetworkFilters::ACL_ANY, true],
            'localhost acl, local v6' => ['::1', NetworkFilters::ACL_LOCALHOST, NetworkFilters::ACL_ANY, true],
            'localhost acl, remote' => ['192.0.2.10', NetworkFilters::ACL_LOCALHOST, NetworkFilters::ACL_ANY, false],
        ];
    }

    /**
     * @dataProvider filterProvider
     */
    public function testPermitOverridesDeny(string $ip, string $permit, string $deny, bool $expected): void
    {
        $service = new TokenValidationService(Di::getDefault());

        $this->assertSame(
            $expected,
            $this->invokeMethod($service, 'isIpAllowedByFilter', [$ip, $permit, $deny])
        );
    }
}
