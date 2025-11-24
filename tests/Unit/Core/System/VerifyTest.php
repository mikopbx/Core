<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Core\System\Verify;
use MikoPBX\Tests\Unit\AbstractUnitTest;

/**
 * Unit tests for Verify class with IPv6 support
 */
class VerifyTest extends AbstractUnitTest
{
    /**
     * Test isIpAddress with valid IPv4 addresses (backward compatibility)
     */
    public function testIsIpAddressWithValidIpv4(): void
    {
        $this->assertTrue(Verify::isIpAddress('192.168.1.1'));
        $this->assertTrue(Verify::isIpAddress('10.0.0.1'));
        $this->assertTrue(Verify::isIpAddress('127.0.0.1'));
        $this->assertTrue(Verify::isIpAddress('0.0.0.0'));
        $this->assertTrue(Verify::isIpAddress('255.255.255.255'));
    }

    /**
     * Test isIpAddress with valid IPv6 addresses (new functionality)
     */
    public function testIsIpAddressWithValidIpv6(): void
    {
        $this->assertTrue(Verify::isIpAddress('2001:db8::1'));
        $this->assertTrue(Verify::isIpAddress('::1'));
        $this->assertTrue(Verify::isIpAddress('fe80::1'));
        $this->assertTrue(Verify::isIpAddress('::'));
        $this->assertTrue(Verify::isIpAddress('2001:0db8:0000:0000:0000:0000:0000:0001'));
        $this->assertTrue(Verify::isIpAddress('::ffff:192.0.2.1')); // IPv4-mapped IPv6
    }

    /**
     * Test isIpAddress with invalid addresses
     */
    public function testIsIpAddressWithInvalidAddresses(): void
    {
        $this->assertFalse(Verify::isIpAddress(''));
        $this->assertFalse(Verify::isIpAddress('invalid'));
        $this->assertFalse(Verify::isIpAddress('256.256.256.256'));
        $this->assertFalse(Verify::isIpAddress('192.168.1'));
        $this->assertFalse(Verify::isIpAddress('192.168.1.1.1'));
        $this->assertFalse(Verify::isIpAddress('gggg::1'));
        $this->assertFalse(Verify::isIpAddress('2001:db8::gggg'));
    }

    /**
     * Test isIpAddress with IPv4-only flag
     */
    public function testIsIpAddressWithIpv4OnlyFlag(): void
    {
        // Valid IPv4 should pass
        $this->assertTrue(Verify::isIpAddress('192.168.1.1', FILTER_FLAG_IPV4));
        $this->assertTrue(Verify::isIpAddress('10.0.0.1', FILTER_FLAG_IPV4));

        // IPv6 should fail with IPv4-only flag
        $this->assertFalse(Verify::isIpAddress('2001:db8::1', FILTER_FLAG_IPV4));
        $this->assertFalse(Verify::isIpAddress('::1', FILTER_FLAG_IPV4));
    }

    /**
     * Test isIpAddress with IPv6-only flag
     */
    public function testIsIpAddressWithIpv6OnlyFlag(): void
    {
        // Valid IPv6 should pass
        $this->assertTrue(Verify::isIpAddress('2001:db8::1', FILTER_FLAG_IPV6));
        $this->assertTrue(Verify::isIpAddress('::1', FILTER_FLAG_IPV6));

        // IPv4 should fail with IPv6-only flag
        $this->assertFalse(Verify::isIpAddress('192.168.1.1', FILTER_FLAG_IPV6));
        $this->assertFalse(Verify::isIpAddress('10.0.0.1', FILTER_FLAG_IPV6));
    }

    /**
     * Test isIpAddress with dual-stack flag (default behavior)
     */
    public function testIsIpAddressWithDualStackFlag(): void
    {
        // Both IPv4 and IPv6 should pass
        $this->assertTrue(Verify::isIpAddress('192.168.1.1', FILTER_FLAG_IPV4 | FILTER_FLAG_IPV6));
        $this->assertTrue(Verify::isIpAddress('2001:db8::1', FILTER_FLAG_IPV4 | FILTER_FLAG_IPV6));
    }

    /**
     * Test backward compatibility - default behavior should accept both IPv4 and IPv6
     */
    public function testBackwardCompatibilityDefaultAcceptsBoth(): void
    {
        // Default behavior (no flags) should accept both IPv4 and IPv6
        $this->assertTrue(Verify::isIpAddress('192.168.1.1'));
        $this->assertTrue(Verify::isIpAddress('2001:db8::1'));
    }

    /**
     * Test edge cases
     */
    public function testEdgeCases(): void
    {
        // Localhost addresses
        $this->assertTrue(Verify::isIpAddress('127.0.0.1'));
        $this->assertTrue(Verify::isIpAddress('::1'));

        // Broadcast and any addresses
        $this->assertTrue(Verify::isIpAddress('255.255.255.255'));
        $this->assertTrue(Verify::isIpAddress('0.0.0.0'));
        $this->assertTrue(Verify::isIpAddress('::'));

        // Link-local addresses
        $this->assertTrue(Verify::isIpAddress('169.254.1.1'));
        $this->assertTrue(Verify::isIpAddress('fe80::1'));
    }
}
