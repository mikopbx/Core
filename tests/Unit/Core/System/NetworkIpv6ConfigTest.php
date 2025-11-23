<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Core\System\Network;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;

/**
 * Unit tests for IPv6 network configuration functionality in Network class
 */
class NetworkIpv6ConfigTest extends TestCase
{
    private Network $network;
    private ReflectionMethod $configureIpv6Method;

    protected function setUp(): void
    {
        parent::setUp();
        $this->network = new Network();

        // Make private method accessible for testing
        $reflection = new ReflectionClass(Network::class);
        $this->configureIpv6Method = $reflection->getMethod('configureIpv6Interface');
        $this->configureIpv6Method->setAccessible(true);
    }

    /**
     * Test IPv6 Mode 0 (Off) - should flush IPv6 addresses
     */
    public function testIpv6ModeOffFlushesAddresses(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'eth0',
            '0', // Mode: Off
            '',
            '',
            ''
        );

        $this->assertIsArray($commands);
        $this->assertCount(1, $commands);
        $this->assertStringContainsString('ip -6 addr flush dev eth0', $commands[0]);
    }

    /**
     * Test IPv6 Mode 1 (Auto/SLAAC) - should return empty commands (kernel handles SLAAC)
     */
    public function testIpv6ModeAutoReturnsEmptyCommands(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'eth0',
            '1', // Mode: Auto
            '',
            '',
            ''
        );

        $this->assertIsArray($commands);
        $this->assertEmpty($commands, 'Auto mode should not generate commands - SLAAC is automatic');
    }

    /**
     * Test IPv6 Mode 2 (Manual) - valid full address format
     */
    public function testIpv6ModeManualWithFullAddress(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'eth0',
            '2', // Mode: Manual
            '2001:0db8:0000:0000:0000:0000:0000:0001',
            '64',
            ''
        );

        $this->assertIsArray($commands);
        $this->assertCount(1, $commands);
        $this->assertStringContainsString('ip -6 addr add', $commands[0]);
        $this->assertStringContainsString('2001:0db8:0000:0000:0000:0000:0000:0001/64', $commands[0]);
        $this->assertStringContainsString('dev eth0', $commands[0]);
    }

    /**
     * Test IPv6 Mode 2 (Manual) - compressed address format
     */
    public function testIpv6ModeManualWithCompressedAddress(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'eth0',
            '2',
            '2001:db8::1',
            '64',
            ''
        );

        $this->assertIsArray($commands);
        $this->assertGreaterThan(0, count($commands));
        $this->assertStringContainsString('2001:db8::1/64', $commands[0]);
    }

    /**
     * Test IPv6 Mode 2 (Manual) - with gateway
     */
    public function testIpv6ModeManualWithGateway(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'eth0',
            '2',
            '2001:db8::100',
            '64',
            '2001:db8::1'
        );

        $this->assertIsArray($commands);
        $this->assertCount(3, $commands);

        // First command: add address
        $this->assertStringContainsString('ip -6 addr add', $commands[0]);
        $this->assertStringContainsString('2001:db8::100/64', $commands[0]);

        // Second command: delete old default route
        $this->assertStringContainsString('ip -6 route del default dev eth0', $commands[1]);

        // Third command: add new default route
        $this->assertStringContainsString('ip -6 route add default via 2001:db8::1', $commands[2]);
        $this->assertStringContainsString('dev eth0', $commands[2]);
    }

    /**
     * Test IPv6 Mode 2 (Manual) - link-local address
     */
    public function testIpv6ModeManualWithLinkLocalAddress(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'eth0',
            '2',
            'fe80::1',
            '64',
            ''
        );

        $this->assertIsArray($commands);
        $this->assertGreaterThan(0, count($commands));
        $this->assertStringContainsString('fe80::1/64', $commands[0]);
    }

    /**
     * Test IPv6 Mode 2 (Manual) - /128 subnet (single host)
     */
    public function testIpv6ModeManualWithHost128Subnet(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'eth0',
            '2',
            '2001:db8::100',
            '128',
            ''
        );

        $this->assertIsArray($commands);
        $this->assertGreaterThan(0, count($commands));
        $this->assertStringContainsString('/128', $commands[0]);
    }

    /**
     * Test IPv6 Mode 2 (Manual) - missing required address
     */
    public function testIpv6ModeManualWithMissingAddressReturnsEmpty(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'eth0',
            '2',
            '', // Missing address
            '64',
            ''
        );

        $this->assertIsArray($commands);
        $this->assertEmpty($commands, 'Manual mode requires address');
    }

    /**
     * Test IPv6 Mode 2 (Manual) - missing required subnet
     */
    public function testIpv6ModeManualWithMissingSubnetReturnsEmpty(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'eth0',
            '2',
            '2001:db8::100',
            '', // Missing subnet
            ''
        );

        $this->assertIsArray($commands);
        $this->assertEmpty($commands, 'Manual mode requires subnet');
    }

    /**
     * Test IPv6 Mode 2 (Manual) - invalid IPv4 address instead of IPv6
     */
    public function testIpv6ModeManualWithInvalidIpv4AddressReturnsEmpty(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'eth0',
            '2',
            '192.168.1.100', // IPv4 address - invalid for IPv6 mode
            '64',
            ''
        );

        $this->assertIsArray($commands);
        $this->assertEmpty($commands, 'IPv6 mode should reject IPv4 addresses');
    }

    /**
     * Test IPv6 Mode 2 (Manual) - invalid subnet range (>128)
     */
    public function testIpv6ModeManualWithInvalidSubnetRangeReturnsEmpty(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'eth0',
            '2',
            '2001:db8::100',
            '129', // Invalid: IPv6 max is 128
            ''
        );

        $this->assertIsArray($commands);
        $this->assertEmpty($commands, 'Subnet must be 1-128 for IPv6');
    }

    /**
     * Test IPv6 Mode 2 (Manual) - invalid gateway format
     */
    public function testIpv6ModeManualWithInvalidGatewayFormat(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'eth0',
            '2',
            '2001:db8::100',
            '64',
            '192.168.1.1' // IPv4 gateway - invalid
        );

        $this->assertIsArray($commands);
        // Should contain address command but not gateway commands
        $this->assertCount(1, $commands, 'Invalid gateway should be skipped');
        $this->assertStringContainsString('ip -6 addr add', $commands[0]);
        $this->assertStringNotContainsString('route', $commands[0]);
    }

    /**
     * Test IPv6 Mode 2 (Manual) - VLAN interface
     */
    public function testIpv6ModeManualWithVlanInterface(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'vlan100',
            '2',
            '2001:db8::100',
            '64',
            '2001:db8::1'
        );

        $this->assertIsArray($commands);
        $this->assertGreaterThan(0, count($commands));
        $this->assertStringContainsString('dev vlan100', $commands[0]);
    }

    /**
     * Test unknown IPv6 mode
     */
    public function testIpv6UnknownModeReturnsEmpty(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'eth0',
            '99', // Invalid mode
            '2001:db8::100',
            '64',
            ''
        );

        $this->assertIsArray($commands);
        $this->assertEmpty($commands, 'Unknown mode should not generate commands');
    }

    /**
     * Test IPv6-mapped IPv4 address
     */
    public function testIpv6ModeManualWithIpv4MappedAddress(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'eth0',
            '2',
            '::ffff:192.0.2.1',
            '128',
            ''
        );

        $this->assertIsArray($commands);
        $this->assertGreaterThan(0, count($commands));
        $this->assertStringContainsString('::ffff:192.0.2.1/128', $commands[0]);
    }

    /**
     * Test IPv6 loopback address
     */
    public function testIpv6ModeManualWithLoopbackAddress(): void
    {
        $commands = $this->configureIpv6Method->invoke(
            $this->network,
            'lo',
            '2',
            '::1',
            '128',
            ''
        );

        $this->assertIsArray($commands);
        $this->assertGreaterThan(0, count($commands));
        $this->assertStringContainsString('::1/128', $commands[0]);
    }
}
