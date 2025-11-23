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

namespace MikoPBX\Tests\Unit\Core\System\RootFS;

use PHPUnit\Framework\TestCase;

/**
 * Unit tests for Lua IPv6 security functions in unified-security.lua
 *
 * Tests the IPv6 CIDR matching implementation by executing Lua code via shell.
 * Covers IPv6 detection, address parsing, CIDR matching, caching, and edge cases.
 *
 * @package MikoPBX\Tests\Unit\Core\System\RootFS
 */
class LuaSecurityIpv6Test extends TestCase
{
    /**
     * Path to the unified-security.lua file
     */
    private const LUA_SCRIPT_PATH = '/Users/nb/PhpstormProjects/mikopbx/project-ipv6-support/src/Core/System/RootFS/etc/nginx/mikopbx/lua/unified-security.lua';

    /**
     * Execute Lua code and return output
     *
     * @param string $luaCode Lua code to execute
     * @return array ['success' => bool, 'output' => string]
     */
    private function executeLua(string $luaCode): array
    {
        // Read the Lua script file
        $scriptContent = file_get_contents(self::LUA_SCRIPT_PATH);

        // Extract only the IPv6-related functions (before Redis connection)
        // Stop at "-- Function to connect to Redis" line
        $parts = explode('-- Function to connect to Redis', $scriptContent);
        $functionsOnly = $parts[0];

        // Create complete Lua test script
        $fullScript = $functionsOnly . "\n" . $luaCode;

        // Write to temporary file
        $tempFile = tempnam(sys_get_temp_dir(), 'lua_test_');
        file_put_contents($tempFile, $fullScript);

        // Execute with lua
        $command = sprintf('lua %s 2>&1', escapeshellarg($tempFile));
        exec($command, $output, $returnCode);

        // Clean up
        unlink($tempFile);

        return [
            'success' => $returnCode === 0,
            'output' => implode("\n", $output),
        ];
    }

    /**
     * Test is_ipv6() detection function
     */
    public function testIsIpv6Detection(): void
    {
        $testCases = [
            // IPv6 addresses (should return true)
            ['::1', true],
            ['2001:db8::1', true],
            ['fe80::1', true],
            ['::ffff:192.0.2.1', true],
            ['2001:0db8:0000:0000:0000:0000:0000:0001', true],

            // IPv4 addresses (should return false)
            ['192.168.1.1', false],
            ['127.0.0.1', false],
            ['10.0.0.1', false],
        ];

        foreach ($testCases as [$ip, $expected]) {
            $luaCode = sprintf(
                'local result = is_ipv6("%s"); print(result and "true" or "false")',
                $ip
            );

            $result = $this->executeLua($luaCode);
            $this->assertTrue($result['success'], "Lua execution failed for IP: $ip");

            $actual = trim($result['output']) === 'true';
            $this->assertEquals($expected, $actual, "IPv6 detection failed for: $ip");
        }
    }

    /**
     * Test ipv6_to_bytes() address parsing
     */
    public function testIpv6ToBytesParsing(): void
    {
        $testCases = [
            // Loopback
            '::1' => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],

            // Compressed notation
            '2001:db8::1' => [0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],

            // Full notation
            '2001:0db8:0000:0000:0000:0000:0000:0001' => [0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],

            // IPv4-mapped IPv6
            '::ffff:192.0.2.1' => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xFF, 0xFF, 192, 0, 2, 1],

            // Link-local
            'fe80::1' => [0xfe, 0x80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        ];

        foreach ($testCases as $ip => $expectedBytes) {
            $luaCode = sprintf(
                'local bytes = ipv6_to_bytes("%s"); if bytes then for i=1,16 do print(bytes[i]) end else print("nil") end',
                $ip
            );

            $result = $this->executeLua($luaCode);
            $this->assertTrue($result['success'], "Lua execution failed for IP: $ip");

            $lines = explode("\n", trim($result['output']));
            $actualBytes = array_map('intval', $lines);

            $this->assertEquals($expectedBytes, $actualBytes, "Byte parsing failed for: $ip");
        }
    }

    /**
     * Test IPv6 CIDR matching for /64 networks
     */
    public function testIpv6CidrMatching64(): void
    {
        $network = '2001:db8::/64';

        $testCases = [
            // Should match (same /64)
            ['2001:db8::1', true],
            ['2001:db8::100', true],
            ['2001:db8::ffff:ffff:ffff:ffff', true],
            ['2001:db8:0:0:1:2:3:4', true],

            // Should NOT match (different /64)
            ['2001:db8:1::1', false],
            ['2001:db9::1', false],
            ['2002:db8::1', false],
            ['::1', false],
        ];

        foreach ($testCases as [$ip, $expected]) {
            $luaCode = sprintf(
                'local result = ipv6_in_network("%s", "%s"); print(result and "true" or "false")',
                $ip,
                $network
            );

            $result = $this->executeLua($luaCode);
            $this->assertTrue($result['success'], "Lua execution failed for IP: $ip");

            $actual = trim($result['output']) === 'true';
            $this->assertEquals($expected, $actual, "CIDR /64 matching failed for: $ip in $network");
        }
    }

    /**
     * Test IPv6 CIDR matching for /128 (single host)
     */
    public function testIpv6CidrMatching128(): void
    {
        $network = '2001:db8::100/128';

        $testCases = [
            // Should match (exact host)
            ['2001:db8::100', true],

            // Should NOT match (different hosts)
            ['2001:db8::101', false],
            ['2001:db8::1', false],
            ['::1', false],
        ];

        foreach ($testCases as [$ip, $expected]) {
            $luaCode = sprintf(
                'local result = ipv6_in_network("%s", "%s"); print(result and "true" or "false")',
                $ip,
                $network
            );

            $result = $this->executeLua($luaCode);
            $this->assertTrue($result['success'], "Lua execution failed for IP: $ip");

            $actual = trim($result['output']) === 'true';
            $this->assertEquals($expected, $actual, "CIDR /128 matching failed for: $ip in $network");
        }
    }

    /**
     * Test IPv6 CIDR matching for /0 (all addresses)
     */
    public function testIpv6CidrMatchingZero(): void
    {
        $network = '::/0';

        $testCases = [
            // All IPv6 addresses should match
            ['::1', true],
            ['2001:db8::1', true],
            ['fe80::1', true],
            ['::ffff:192.0.2.1', true],
        ];

        foreach ($testCases as [$ip, $expected]) {
            $luaCode = sprintf(
                'local result = ipv6_in_network("%s", "%s"); print(result and "true" or "false")',
                $ip,
                $network
            );

            $result = $this->executeLua($luaCode);
            $this->assertTrue($result['success'], "Lua execution failed for IP: $ip");

            $actual = trim($result['output']) === 'true';
            $this->assertEquals($expected, $actual, "CIDR /0 matching failed for: $ip in $network");
        }
    }

    /**
     * Test IPv6 CIDR matching for /48 (site prefix)
     */
    public function testIpv6CidrMatching48(): void
    {
        $network = '2001:db8::/48';

        $testCases = [
            // Should match (same /48)
            ['2001:db8::1', true],
            ['2001:db8:0:100::1', true],
            ['2001:db8:0:ffff::1', true],

            // Should NOT match (different /48)
            ['2001:db8:1:100::1', false],
            ['2001:db9::1', false],
        ];

        foreach ($testCases as [$ip, $expected]) {
            $luaCode = sprintf(
                'local result = ipv6_in_network("%s", "%s"); print(result and "true" or "false")',
                $ip,
                $network
            );

            $result = $this->executeLua($luaCode);
            $this->assertTrue($result['success'], "Lua execution failed for IP: $ip");

            $actual = trim($result['output']) === 'true';
            $this->assertEquals($expected, $actual, "CIDR /48 matching failed for: $ip in $network");
        }
    }

    /**
     * Test ip_in_network() dual-stack routing
     */
    public function testIpInNetworkDualStack(): void
    {
        $testCases = [
            // IPv4 CIDR
            ['192.168.1.100', '192.168.1.0/24', true],
            ['192.168.1.100', '192.168.2.0/24', false],

            // IPv6 CIDR
            ['2001:db8::100', '2001:db8::/64', true],
            ['2001:db8::100', '2001:db9::/64', false],

            // Version mismatch (should NOT match)
            ['192.168.1.100', '2001:db8::/64', false],
            ['2001:db8::100', '192.168.1.0/24', false],

            // Exact match (no CIDR)
            ['192.168.1.100', '192.168.1.100', true],
            ['2001:db8::100', '2001:db8::100', true],
            ['192.168.1.100', '192.168.1.101', false],
        ];

        foreach ($testCases as [$ip, $network, $expected]) {
            $luaCode = sprintf(
                'local result = ip_in_network("%s", "%s"); print(result and "true" or "false")',
                $ip,
                $network
            );

            $result = $this->executeLua($luaCode);
            $this->assertTrue($result['success'], "Lua execution failed for IP: $ip, network: $network");

            $actual = trim($result['output']) === 'true';
            $this->assertEquals($expected, $actual, "Dual-stack matching failed for: $ip in $network");
        }
    }

    /**
     * Test IPv6 address variations (compressed, full, link-local)
     */
    public function testIpv6AddressVariations(): void
    {
        $testCases = [
            // Same address in different notations should match
            ['2001:db8::1', '2001:db8::/64', true],
            ['2001:0db8:0000:0000:0000:0000:0000:0001', '2001:db8::/64', true],

            // Link-local addresses
            ['fe80::1', 'fe80::/10', true],
            ['fe80::1', 'fe80::/64', true],

            // IPv4-mapped IPv6
            ['::ffff:192.0.2.1', '::ffff:192.0.2.0/120', true],
        ];

        foreach ($testCases as [$ip, $network, $expected]) {
            $luaCode = sprintf(
                'local result = ipv6_in_network("%s", "%s"); print(result and "true" or "false")',
                $ip,
                $network
            );

            $result = $this->executeLua($luaCode);
            $this->assertTrue($result['success'], "Lua execution failed for IP: $ip");

            $actual = trim($result['output']) === 'true';
            $this->assertEquals($expected, $actual, "Address variation matching failed for: $ip in $network");
        }
    }

    /**
     * Test invalid IPv6 formats (should return false)
     */
    public function testInvalidIpv6Formats(): void
    {
        $testCases = [
            // Invalid CIDR prefix
            ['2001:db8::1', '2001:db8::/129'],  // >128
            ['2001:db8::1', '2001:db8::/-1'],   // negative

            // Malformed addresses
            ['2001:db8:::', '2001:db8::/64'],   // triple colon
            ['gggg::1', '2001:db8::/64'],       // invalid hex
        ];

        foreach ($testCases as [$ip, $network]) {
            $luaCode = sprintf(
                'local result = ipv6_in_network("%s", "%s"); print(result and "true" or "false")',
                $ip,
                $network
            );

            $result = $this->executeLua($luaCode);
            $this->assertTrue($result['success'], "Lua execution failed for IP: $ip");

            $actual = trim($result['output']) === 'true';
            $this->assertFalse($actual, "Invalid format should return false for: $ip in $network");
        }
    }

    /**
     * Test CIDR caching mechanism
     *
     * Verifies that parsed CIDR networks are cached for performance.
     * Second lookup should use cached data.
     */
    public function testCidrCaching(): void
    {
        $luaCode = <<<'LUA'
-- First call - cache miss, should parse and cache
local result1 = ip_in_network("2001:db8::100", "2001:db8::/64")
print("result1: " .. (result1 and "true" or "false"))

-- Check cache was populated
local cache_entry = cidr_cache["2001:db8::/64"]
if cache_entry then
    print("cache_populated: true")
    print("is_ipv6: " .. (cache_entry.is_ipv6 and "true" or "false"))
    print("prefix_len: " .. cache_entry.prefix_len)
else
    print("cache_populated: false")
end

-- Second call - cache hit, should use cached data
local result2 = ip_in_network("2001:db8::200", "2001:db8::/64")
print("result2: " .. (result2 and "true" or "false"))
LUA;

        $result = $this->executeLua($luaCode);
        $this->assertTrue($result['success'], "Lua execution failed for caching test");

        $output = $result['output'];
        $this->assertStringContainsString('result1: true', $output);
        $this->assertStringContainsString('cache_populated: true', $output);
        $this->assertStringContainsString('is_ipv6: true', $output);
        $this->assertStringContainsString('prefix_len: 64', $output);
        $this->assertStringContainsString('result2: true', $output);
    }

    /**
     * Test edge cases and boundary conditions
     */
    public function testEdgeCases(): void
    {
        $testCases = [
            // All zeros
            ['::', '::/128', true],
            ['::', '::/0', true],

            // Boundary of /64
            ['2001:db8::ffff:ffff:ffff:ffff', '2001:db8::/64', true],
            ['2001:db8:0:1::', '2001:db8::/64', false],

            // /32 prefix (typical ISP allocation)
            ['2001:db8:1:2::1', '2001:db8::/32', true],
            ['2001:db9::1', '2001:db8::/32', false],
        ];

        foreach ($testCases as [$ip, $network, $expected]) {
            $luaCode = sprintf(
                'local result = ipv6_in_network("%s", "%s"); print(result and "true" or "false")',
                $ip,
                $network
            );

            $result = $this->executeLua($luaCode);
            $this->assertTrue($result['success'], "Lua execution failed for IP: $ip");

            $actual = trim($result['output']) === 'true';
            $this->assertEquals($expected, $actual, "Edge case matching failed for: $ip in $network");
        }
    }
}
