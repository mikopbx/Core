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

namespace MikoPBX\Tests\Unit\Common\Models;

require_once 'Globals.php';

use MikoPBX\Common\Models\LanInterfaces;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for LanInterfaces model IPv6 functionality
 */
class LanInterfacesTest extends TestCase
{
    /**
     * Test IPv6 mode validation - valid values
     */
    public function testIpv6ModeValidation_ValidModes(): void
    {
        $model = new LanInterfaces();

        // Test Off mode
        $model->ipv6_mode = '0';
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Mode', ['0']));

        // Test Auto mode
        $model->ipv6_mode = '1';
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Mode', ['1']));

        // Test Manual mode
        $model->ipv6_mode = '2';
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Mode', ['2']));
    }

    /**
     * Test IPv6 mode validation - invalid values
     */
    public function testIpv6ModeValidation_InvalidModes(): void
    {
        $model = new LanInterfaces();

        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Mode', ['3']));
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Mode', ['-1']));
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Mode', ['']));
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Mode', ['auto']));
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Mode', [null]));
    }

    /**
     * Test IPv6 address validation - mode Off
     */
    public function testIpv6AddressValidation_ModeOff(): void
    {
        $model = new LanInterfaces();

        // Empty address is valid when mode is Off
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Address', ['', '0']));

        // Non-empty valid IPv6 is also valid (optional)
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Address', ['2001:db8::1', '0']));
    }

    /**
     * Test IPv6 address validation - mode Auto
     */
    public function testIpv6AddressValidation_ModeAuto(): void
    {
        $model = new LanInterfaces();

        // Empty address is valid when mode is Auto (SLAAC will provide it)
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Address', ['', '1']));

        // Non-empty valid IPv6 is also valid (could be pre-filled)
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Address', ['fe80::1', '1']));
    }

    /**
     * Test IPv6 address validation - mode Manual requires address
     */
    public function testIpv6AddressValidation_ModeManual_Required(): void
    {
        $model = new LanInterfaces();

        // Empty address is INVALID when mode is Manual
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Address', ['', '2']));
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Address', [null, '2']));

        // Valid IPv6 is required
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Address', ['2001:db8::100', '2']));
    }

    /**
     * Test IPv6 address validation - various formats
     */
    public function testIpv6AddressValidation_VariousFormats(): void
    {
        $model = new LanInterfaces();

        // Full IPv6 address
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Address', ['2001:0db8:0000:0000:0000:0000:0000:0001', '2']));

        // Compressed IPv6 (most common)
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Address', ['2001:db8::1', '2']));

        // Loopback
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Address', ['::1', '2']));

        // All zeros (any address)
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Address', ['::', '2']));

        // Link-local
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Address', ['fe80::1', '2']));

        // IPv4-mapped IPv6
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Address', ['::ffff:192.0.2.1', '2']));

        // Invalid - IPv4 address
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Address', ['192.168.1.1', '2']));

        // Invalid - malformed
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Address', ['2001:db8::g', '2']));
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Address', ['not-an-ip', '2']));
    }

    /**
     * Test IPv6 subnet validation - mode Manual requires subnet
     */
    public function testIpv6SubnetValidation_ModeManual_Required(): void
    {
        $model = new LanInterfaces();

        // Empty subnet is INVALID when mode is Manual and address is provided
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Subnet', ['', '2', '2001:db8::1']));

        // Valid subnet is required
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Subnet', ['64', '2', '2001:db8::1']));
    }

    /**
     * Test IPv6 subnet validation - valid ranges
     */
    public function testIpv6SubnetValidation_ValidRanges(): void
    {
        $model = new LanInterfaces();

        // Common IPv6 prefix lengths
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Subnet', ['64', '2', '2001:db8::1']));  // Most common
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Subnet', ['48', '2', '2001:db8::1']));
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Subnet', ['56', '2', '2001:db8::1']));
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Subnet', ['128', '2', '2001:db8::1'])); // Host route
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Subnet', ['1', '2', '2001:db8::1']));   // Minimum
    }

    /**
     * Test IPv6 subnet validation - invalid values
     */
    public function testIpv6SubnetValidation_InvalidValues(): void
    {
        $model = new LanInterfaces();

        // Out of range (IPv6 max is 128)
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Subnet', ['129', '2', '2001:db8::1']));
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Subnet', ['0', '2', '2001:db8::1']));
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Subnet', ['-1', '2', '2001:db8::1']));

        // Non-numeric
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Subnet', ['abc', '2', '2001:db8::1']));
    }

    /**
     * Test IPv6 subnet validation - mode Off allows empty
     */
    public function testIpv6SubnetValidation_ModeOff_Optional(): void
    {
        $model = new LanInterfaces();

        // Empty subnet is valid when mode is Off
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Subnet', ['', '0', '']));
    }

    /**
     * Test IPv6 gateway validation - optional field
     */
    public function testIpv6GatewayValidation_Optional(): void
    {
        $model = new LanInterfaces();

        // Empty is valid (gateway is optional)
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Gateway', ['']));
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Gateway', [null]));
    }

    /**
     * Test IPv6 gateway validation - valid formats
     */
    public function testIpv6GatewayValidation_ValidFormats(): void
    {
        $model = new LanInterfaces();

        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Gateway', ['2001:db8::1']));
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Gateway', ['fe80::1']));
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Gateway', ['::1']));
    }

    /**
     * Test IPv6 gateway validation - invalid formats
     */
    public function testIpv6GatewayValidation_InvalidFormats(): void
    {
        $model = new LanInterfaces();

        // IPv4 address (not IPv6)
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Gateway', ['192.168.1.1']));

        // Malformed
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Gateway', ['not-a-gateway']));
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpv6Gateway', ['2001:db8::g']));
    }

    /**
     * Test extipaddr with IPv6 addresses and ports
     */
    public function testExtipaddrValidation_IPv6WithPort(): void
    {
        $model = new LanInterfaces();

        // IPv6 with port (RFC 3986 format)
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpWithOptionalPort', ['[2001:db8::1]:5060']));
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpWithOptionalPort', ['[::1]:80']));
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpWithOptionalPort', ['[fe80::1]:443']));

        // IPv6 without port
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpWithOptionalPort', ['2001:db8::1']));
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpWithOptionalPort', ['::1']));

        // IPv4 with port (should still work)
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpWithOptionalPort', ['192.168.1.1:5060']));

        // IPv4 without port
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpWithOptionalPort', ['192.168.1.1']));
    }

    /**
     * Test extipaddr with invalid port combinations
     */
    public function testExtipaddrValidation_InvalidPortCombinations(): void
    {
        $model = new LanInterfaces();

        // Invalid port numbers
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpWithOptionalPort', ['[2001:db8::1]:0']));
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpWithOptionalPort', ['[2001:db8::1]:65536']));
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpWithOptionalPort', ['192.168.1.1:99999']));

        // Invalid formats
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpWithOptionalPort', ['2001:db8::1:5060'])); // Missing brackets
        $this->assertFalse($this->callPrivateMethod($model, 'validateIpWithOptionalPort', ['[192.168.1.1]:5060'])); // IPv4 in brackets
    }

    /**
     * Test parseIpWithOptionalPort helper method
     */
    public function testParseIpWithOptionalPort_IPv6Formats(): void
    {
        $model = new LanInterfaces();

        // IPv6 with port
        $result = $this->callPrivateMethod($model, 'parseIpWithOptionalPort', ['[2001:db8::1]:5060']);
        $this->assertEquals(['2001:db8::1', '5060'], $result);

        // IPv6 without port
        $result = $this->callPrivateMethod($model, 'parseIpWithOptionalPort', ['2001:db8::1']);
        $this->assertEquals(['2001:db8::1', null], $result);

        // IPv4 with port
        $result = $this->callPrivateMethod($model, 'parseIpWithOptionalPort', ['192.168.1.1:5060']);
        $this->assertEquals(['192.168.1.1', '5060'], $result);

        // IPv4 without port
        $result = $this->callPrivateMethod($model, 'parseIpWithOptionalPort', ['192.168.1.1']);
        $this->assertEquals(['192.168.1.1', null], $result);

        // Invalid formats
        $this->assertFalse($this->callPrivateMethod($model, 'parseIpWithOptionalPort', ['not-an-ip']));
        $this->assertFalse($this->callPrivateMethod($model, 'parseIpWithOptionalPort', ['2001:db8::1:not-a-port']));
    }

    /**
     * Test dual-stack scenario - both IPv4 and IPv6 configured
     */
    public function testDualStackConfiguration(): void
    {
        $model = new LanInterfaces();

        // Set IPv4 configuration
        $model->ipaddr = '192.168.1.100';
        $model->subnet = '24';
        $model->gateway = '192.168.1.1';

        // Set IPv6 configuration
        $model->ipv6_mode = '2'; // Manual
        $model->ipv6addr = '2001:db8::100';
        $model->ipv6_subnet = '64';
        $model->ipv6_gateway = '2001:db8::1';

        // Both should be valid
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpField', [$model->ipaddr]));
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Address', [$model->ipv6addr, $model->ipv6_mode]));
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Subnet', [$model->ipv6_subnet, $model->ipv6_mode, $model->ipv6addr]));
        $this->assertTrue($this->callPrivateMethod($model, 'validateIpv6Gateway', [$model->ipv6_gateway]));
    }

    /**
     * Helper method to call private methods for testing
     *
     * @param object $object Instance to call method on
     * @param string $method Method name
     * @param array $args Method arguments
     * @return mixed Method return value
     */
    private function callPrivateMethod(object $object, string $method, array $args = []): mixed
    {
        $reflection = new \ReflectionClass($object);
        $method = $reflection->getMethod($method);
        $method->setAccessible(true);
        return $method->invokeArgs($object, $args);
    }
}
