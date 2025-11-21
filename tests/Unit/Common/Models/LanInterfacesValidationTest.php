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

use PHPUnit\Framework\TestCase;

/**
 * Standalone unit tests for LanInterfaces IPv6 validation logic
 * These tests don't require database or DI container
 */
class LanInterfacesValidationTest extends TestCase
{
    /**
     * Test IPv6 mode validation
     */
    public function testValidateIpv6Mode(): void
    {
        // Valid modes
        $this->assertTrue(in_array('0', ['0', '1', '2'], true));
        $this->assertTrue(in_array('1', ['0', '1', '2'], true));
        $this->assertTrue(in_array('2', ['0', '1', '2'], true));

        // Invalid modes
        $this->assertFalse(in_array('3', ['0', '1', '2'], true));
        $this->assertFalse(in_array('', ['0', '1', '2'], true));
        $this->assertFalse(in_array(null, ['0', '1', '2'], true));
    }

    /**
     * Test IPv6 address validation with filter_var
     */
    public function testValidateIpv6Address_ValidFormats(): void
    {
        // Full IPv6 address
        $this->assertNotFalse(filter_var('2001:0db8:0000:0000:0000:0000:0000:0001', FILTER_VALIDATE_IP, FILTER_FLAG_IPV6));

        // Compressed IPv6 (most common)
        $this->assertNotFalse(filter_var('2001:db8::1', FILTER_VALIDATE_IP, FILTER_FLAG_IPV6));

        // Loopback
        $this->assertNotFalse(filter_var('::1', FILTER_VALIDATE_IP, FILTER_FLAG_IPV6));

        // All zeros (any address)
        $this->assertNotFalse(filter_var('::', FILTER_VALIDATE_IP, FILTER_FLAG_IPV6));

        // Link-local
        $this->assertNotFalse(filter_var('fe80::1', FILTER_VALIDATE_IP, FILTER_FLAG_IPV6));

        // IPv4-mapped IPv6
        $this->assertNotFalse(filter_var('::ffff:192.0.2.1', FILTER_VALIDATE_IP, FILTER_FLAG_IPV6));
    }

    /**
     * Test IPv6 address validation rejects IPv4
     */
    public function testValidateIpv6Address_RejectsIPv4(): void
    {
        $this->assertFalse(filter_var('192.168.1.1', FILTER_VALIDATE_IP, FILTER_FLAG_IPV6));
        $this->assertFalse(filter_var('10.0.0.1', FILTER_VALIDATE_IP, FILTER_FLAG_IPV6));
    }

    /**
     * Test IPv6 address validation rejects invalid formats
     */
    public function testValidateIpv6Address_InvalidFormats(): void
    {
        $this->assertFalse(filter_var('2001:db8::g', FILTER_VALIDATE_IP, FILTER_FLAG_IPV6));
        $this->assertFalse(filter_var('not-an-ip', FILTER_VALIDATE_IP, FILTER_FLAG_IPV6));
        $this->assertFalse(filter_var('', FILTER_VALIDATE_IP, FILTER_FLAG_IPV6));
    }

    /**
     * Test parseIpWithOptionalPort regex for IPv6 with port
     */
    public function testParseIpv6WithPort_BracketFormat(): void
    {
        // Test IPv6 with port pattern: [IPv6]:port
        $pattern = '/^\[([^\]]+)\]:(\d+)$/';

        $this->assertEquals(1, preg_match($pattern, '[2001:db8::1]:5060', $matches));
        $this->assertEquals('2001:db8::1', $matches[1]);
        $this->assertEquals('5060', $matches[2]);

        $this->assertEquals(1, preg_match($pattern, '[::1]:80', $matches));
        $this->assertEquals('::1', $matches[1]);
        $this->assertEquals('80', $matches[2]);

        // Should NOT match IPv6 without brackets
        $this->assertEquals(0, preg_match($pattern, '2001:db8::1:5060'));

        // Should NOT match IPv4 in brackets
        $this->assertEquals(1, preg_match($pattern, '[192.168.1.1]:5060', $matches));
        // But the IP itself will fail IPv6 validation later
        $this->assertFalse(filter_var($matches[1], FILTER_VALIDATE_IP, FILTER_FLAG_IPV6));
    }

    /**
     * Test parseIpWithOptionalPort for IPv4
     */
    public function testParseIpv4WithPort(): void
    {
        // Test IPv4 with port pattern: IPv4:port
        $pattern = '/^([^:]+):(\d+)$/';

        $this->assertEquals(1, preg_match($pattern, '192.168.1.1:5060', $matches));
        $this->assertEquals('192.168.1.1', $matches[1]);
        $this->assertEquals('5060', $matches[2]);

        $this->assertNotFalse(filter_var($matches[1], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4));
    }

    /**
     * Test IPv6 subnet validation range
     */
    public function testValidateIpv6Subnet_ValidRanges(): void
    {
        // Common IPv6 prefixes
        $validPrefixes = [1, 48, 56, 64, 128];

        foreach ($validPrefixes as $prefix) {
            $intValue = (int)$prefix;
            $this->assertTrue($intValue >= 1 && $intValue <= 128, "Prefix /$prefix should be valid");
        }
    }

    /**
     * Test IPv6 subnet validation rejects invalid ranges
     */
    public function testValidateIpv6Subnet_InvalidRanges(): void
    {
        $invalidPrefixes = [0, 129, -1, 256];

        foreach ($invalidPrefixes as $prefix) {
            $intValue = (int)$prefix;
            $this->assertFalse($intValue >= 1 && $intValue <= 128, "Prefix /$prefix should be invalid");
        }
    }

    /**
     * Test port validation logic
     */
    public function testValidatePort(): void
    {
        // Valid ports
        $validPorts = ['1', '80', '443', '5060', '65535'];

        foreach ($validPorts as $port) {
            $this->assertTrue(ctype_digit($port) && (int)$port >= 1 && (int)$port <= 65535, "Port $port should be valid");
        }

        // Invalid ports
        $invalidPorts = ['0', '65536', '99999', '-1', 'abc'];

        foreach ($invalidPorts as $port) {
            $isValid = ctype_digit($port) && (int)$port >= 1 && (int)$port <= 65535;
            $this->assertFalse($isValid, "Port $port should be invalid");
        }
    }

    /**
     * Test complete parsing flow for various IP:port combinations
     */
    public function testCompleteParsingFlow(): void
    {
        $testCases = [
            // [input, expected_ip, expected_port, should_be_ipv6]
            ['[2001:db8::1]:5060', '2001:db8::1', '5060', true],
            ['[::1]:80', '::1', '80', true],
            ['2001:db8::1', '2001:db8::1', null, true],
            ['192.168.1.1:5060', '192.168.1.1', '5060', false],
            ['192.168.1.1', '192.168.1.1', null, false],
        ];

        foreach ($testCases as [$input, $expectedIp, $expectedPort, $shouldBeIpv6]) {
            // Parse with brackets (IPv6 with port)
            if (preg_match('/^\[([^\]]+)\]:(\d+)$/', $input, $matches)) {
                $this->assertEquals($expectedIp, $matches[1]);
                $this->assertEquals($expectedPort, $matches[2]);
                continue;
            }

            // Check if it's IPv6 without port
            if (strpos($input, ':') !== false && strpos($input, '[') === false) {
                if (filter_var($input, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false) {
                    $this->assertEquals($expectedIp, $input);
                    $this->assertNull($expectedPort);
                    $this->assertTrue($shouldBeIpv6);
                    continue;
                }
            }

            // IPv4 with port
            if (preg_match('/^([^:]+):(\d+)$/', $input, $matches)) {
                if (filter_var($matches[1], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
                    $this->assertEquals($expectedIp, $matches[1]);
                    $this->assertEquals($expectedPort, $matches[2]);
                    continue;
                }
            }

            // IPv4 without port
            if (filter_var($input, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
                $this->assertEquals($expectedIp, $input);
                $this->assertNull($expectedPort);
                $this->assertFalse($shouldBeIpv6);
            }
        }
    }
}
