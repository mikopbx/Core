<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Utilities;

use MikoPBX\Core\Utilities\IpAddressHelper;
use MikoPBX\Tests\Unit\AbstractUnitTest;

/**
 * Unit tests for IpAddressHelper utility class
 */
class IpAddressHelperTest extends AbstractUnitTest
{
    /**
     * Test getIpVersion with valid IPv4 addresses
     */
    public function testGetIpVersionWithValidIpv4(): void
    {
        $this->assertEquals(4, IpAddressHelper::getIpVersion('192.168.1.1'));
        $this->assertEquals(4, IpAddressHelper::getIpVersion('10.0.0.1'));
        $this->assertEquals(4, IpAddressHelper::getIpVersion('127.0.0.1'));
        $this->assertEquals(4, IpAddressHelper::getIpVersion('255.255.255.255'));
        $this->assertEquals(4, IpAddressHelper::getIpVersion('0.0.0.0'));
    }

    /**
     * Test getIpVersion with valid IPv6 addresses
     */
    public function testGetIpVersionWithValidIpv6(): void
    {
        $this->assertEquals(6, IpAddressHelper::getIpVersion('2001:db8::1'));
        $this->assertEquals(6, IpAddressHelper::getIpVersion('::1'));
        $this->assertEquals(6, IpAddressHelper::getIpVersion('fe80::1'));
        $this->assertEquals(6, IpAddressHelper::getIpVersion('2001:0db8:0000:0000:0000:0000:0000:0001'));
        $this->assertEquals(6, IpAddressHelper::getIpVersion('::'));
        $this->assertEquals(6, IpAddressHelper::getIpVersion('::ffff:192.0.2.1')); // IPv4-mapped IPv6
    }

    /**
     * Test getIpVersion with invalid addresses
     */
    public function testGetIpVersionWithInvalidAddresses(): void
    {
        $this->assertFalse(IpAddressHelper::getIpVersion(''));
        $this->assertFalse(IpAddressHelper::getIpVersion('invalid'));
        $this->assertFalse(IpAddressHelper::getIpVersion('256.256.256.256'));
        $this->assertFalse(IpAddressHelper::getIpVersion('192.168.1'));
        $this->assertFalse(IpAddressHelper::getIpVersion('gggg::1'));
    }

    /**
     * Test isIpv4 method
     */
    public function testIsIpv4(): void
    {
        // Valid IPv4
        $this->assertTrue(IpAddressHelper::isIpv4('192.168.1.1'));
        $this->assertTrue(IpAddressHelper::isIpv4('10.0.0.1'));
        $this->assertTrue(IpAddressHelper::isIpv4('127.0.0.1'));

        // Invalid or IPv6
        $this->assertFalse(IpAddressHelper::isIpv4('2001:db8::1'));
        $this->assertFalse(IpAddressHelper::isIpv4('::1'));
        $this->assertFalse(IpAddressHelper::isIpv4('invalid'));
        $this->assertFalse(IpAddressHelper::isIpv4(''));
    }

    /**
     * Test isIpv6 method
     */
    public function testIsIpv6(): void
    {
        // Valid IPv6
        $this->assertTrue(IpAddressHelper::isIpv6('2001:db8::1'));
        $this->assertTrue(IpAddressHelper::isIpv6('::1'));
        $this->assertTrue(IpAddressHelper::isIpv6('fe80::1'));
        $this->assertTrue(IpAddressHelper::isIpv6('::'));

        // Invalid or IPv4
        $this->assertFalse(IpAddressHelper::isIpv6('192.168.1.1'));
        $this->assertFalse(IpAddressHelper::isIpv6('10.0.0.1'));
        $this->assertFalse(IpAddressHelper::isIpv6('invalid'));
        $this->assertFalse(IpAddressHelper::isIpv6(''));
    }

    /**
     * Test normalizeCidr with valid IPv4 CIDR
     */
    public function testNormalizeCidrWithValidIpv4(): void
    {
        $result = IpAddressHelper::normalizeCidr('192.168.1.0/24');
        $this->assertIsArray($result);
        $this->assertEquals('192.168.1.0', $result['ip']);
        $this->assertEquals(24, $result['prefix']);
        $this->assertEquals(4, $result['version']);

        $result = IpAddressHelper::normalizeCidr('10.0.0.0/8');
        $this->assertEquals(8, $result['prefix']);

        $result = IpAddressHelper::normalizeCidr('192.168.1.100/32');
        $this->assertEquals(32, $result['prefix']);

        $result = IpAddressHelper::normalizeCidr('0.0.0.0/0');
        $this->assertEquals(0, $result['prefix']);
    }

    /**
     * Test normalizeCidr with valid IPv6 CIDR
     */
    public function testNormalizeCidrWithValidIpv6(): void
    {
        $result = IpAddressHelper::normalizeCidr('2001:db8::/64');
        $this->assertIsArray($result);
        $this->assertEquals('2001:db8::', $result['ip']);
        $this->assertEquals(64, $result['prefix']);
        $this->assertEquals(6, $result['version']);

        $result = IpAddressHelper::normalizeCidr('::1/128');
        $this->assertEquals(128, $result['prefix']);

        $result = IpAddressHelper::normalizeCidr('::/0');
        $this->assertEquals(0, $result['prefix']);
    }

    /**
     * Test normalizeCidr with invalid CIDR notation
     */
    public function testNormalizeCidrWithInvalidCidr(): void
    {
        $this->assertFalse(IpAddressHelper::normalizeCidr(''));
        $this->assertFalse(IpAddressHelper::normalizeCidr('192.168.1.0'));
        $this->assertFalse(IpAddressHelper::normalizeCidr('192.168.1.0/'));
        $this->assertFalse(IpAddressHelper::normalizeCidr('192.168.1.0/33')); // IPv4 prefix > 32
        $this->assertFalse(IpAddressHelper::normalizeCidr('2001:db8::/129')); // IPv6 prefix > 128
        $this->assertFalse(IpAddressHelper::normalizeCidr('invalid/24'));
        $this->assertFalse(IpAddressHelper::normalizeCidr('192.168.1.0/abc'));
    }

    /**
     * Test ipInNetwork with IPv4 addresses
     */
    public function testIpInNetworkWithIpv4(): void
    {
        // IP within network
        $this->assertTrue(IpAddressHelper::ipInNetwork('192.168.1.100', '192.168.1.0/24'));
        $this->assertTrue(IpAddressHelper::ipInNetwork('192.168.1.1', '192.168.1.0/24'));
        $this->assertTrue(IpAddressHelper::ipInNetwork('192.168.1.254', '192.168.1.0/24'));

        // IP outside network
        $this->assertFalse(IpAddressHelper::ipInNetwork('192.168.2.1', '192.168.1.0/24'));
        $this->assertFalse(IpAddressHelper::ipInNetwork('10.0.0.1', '192.168.1.0/24'));

        // Edge cases
        $this->assertTrue(IpAddressHelper::ipInNetwork('10.0.0.1', '10.0.0.0/8'));
        $this->assertTrue(IpAddressHelper::ipInNetwork('10.255.255.255', '10.0.0.0/8'));
        $this->assertFalse(IpAddressHelper::ipInNetwork('11.0.0.1', '10.0.0.0/8'));

        // /0 matches everything
        $this->assertTrue(IpAddressHelper::ipInNetwork('1.2.3.4', '0.0.0.0/0'));

        // /32 exact match
        $this->assertTrue(IpAddressHelper::ipInNetwork('192.168.1.100', '192.168.1.100/32'));
        $this->assertFalse(IpAddressHelper::ipInNetwork('192.168.1.101', '192.168.1.100/32'));
    }

    /**
     * Test ipInNetwork with IPv6 addresses
     */
    public function testIpInNetworkWithIpv6(): void
    {
        // IP within network
        $this->assertTrue(IpAddressHelper::ipInNetwork('2001:db8::1', '2001:db8::/64'));
        $this->assertTrue(IpAddressHelper::ipInNetwork('2001:db8::ffff', '2001:db8::/64'));
        $this->assertTrue(IpAddressHelper::ipInNetwork('2001:db8:0:0:1234:5678:9abc:def0', '2001:db8::/32'));

        // IP outside network
        $this->assertFalse(IpAddressHelper::ipInNetwork('2001:db9::1', '2001:db8::/64'));
        $this->assertFalse(IpAddressHelper::ipInNetwork('2001:db8:1::1', '2001:db8::/64'));

        // Edge cases
        $this->assertTrue(IpAddressHelper::ipInNetwork('::1', '::/0')); // /0 matches everything
        $this->assertTrue(IpAddressHelper::ipInNetwork('fe80::1', 'fe80::/10'));

        // /128 exact match
        $this->assertTrue(IpAddressHelper::ipInNetwork('2001:db8::1', '2001:db8::1/128'));
        $this->assertFalse(IpAddressHelper::ipInNetwork('2001:db8::2', '2001:db8::1/128'));
    }

    /**
     * Test ipInNetwork with mismatched IP versions
     */
    public function testIpInNetworkWithMismatchedVersions(): void
    {
        $this->assertFalse(IpAddressHelper::ipInNetwork('192.168.1.1', '2001:db8::/64'));
        $this->assertFalse(IpAddressHelper::ipInNetwork('2001:db8::1', '192.168.1.0/24'));
    }

    /**
     * Test ipInNetwork with invalid input
     */
    public function testIpInNetworkWithInvalidInput(): void
    {
        $this->assertFalse(IpAddressHelper::ipInNetwork('invalid', '192.168.1.0/24'));
        $this->assertFalse(IpAddressHelper::ipInNetwork('192.168.1.1', 'invalid'));
        $this->assertFalse(IpAddressHelper::ipInNetwork('', '192.168.1.0/24'));
    }

    /**
     * Test isValidSubnet with IPv4
     */
    public function testIsValidSubnetWithIpv4(): void
    {
        $this->assertTrue(IpAddressHelper::isValidSubnet('192.168.1.1', 0));
        $this->assertTrue(IpAddressHelper::isValidSubnet('192.168.1.1', 24));
        $this->assertTrue(IpAddressHelper::isValidSubnet('192.168.1.1', 32));

        $this->assertFalse(IpAddressHelper::isValidSubnet('192.168.1.1', -1));
        $this->assertFalse(IpAddressHelper::isValidSubnet('192.168.1.1', 33));
        $this->assertFalse(IpAddressHelper::isValidSubnet('192.168.1.1', 128));
    }

    /**
     * Test isValidSubnet with IPv6
     */
    public function testIsValidSubnetWithIpv6(): void
    {
        $this->assertTrue(IpAddressHelper::isValidSubnet('2001:db8::1', 0));
        $this->assertTrue(IpAddressHelper::isValidSubnet('2001:db8::1', 64));
        $this->assertTrue(IpAddressHelper::isValidSubnet('2001:db8::1', 128));

        $this->assertFalse(IpAddressHelper::isValidSubnet('2001:db8::1', -1));
        $this->assertFalse(IpAddressHelper::isValidSubnet('2001:db8::1', 129));
    }

    /**
     * Test isValidSubnet with invalid IP
     */
    public function testIsValidSubnetWithInvalidIp(): void
    {
        $this->assertFalse(IpAddressHelper::isValidSubnet('invalid', 24));
        $this->assertFalse(IpAddressHelper::isValidSubnet('', 24));
    }
}
