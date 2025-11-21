#!/usr/bin/env php
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

/**
 * Manual Integration Test: Lua Security IPv6 Support
 *
 * Tests IPv6 support in Lua security scripts via actual HTTP requests.
 * This test validates that the Lua unified-security.lua script correctly
 * handles IPv6 client addresses and CIDR whitelisting.
 *
 * Usage (from host):
 *   docker exec -it mikopbx_ipv6-support php /offload/rootfs/usr/www/tests/manual/test_lua_security_ipv6.php
 *
 * Prerequisites:
 *   - Docker container running (mikopbx_ipv6-support)
 *   - Redis running in container
 *   - Nginx with Lua modules loaded
 *
 * Exit codes:
 *   0 - All tests passed
 *   1 - One or more tests failed
 */

require_once 'Globals.php';

use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Core\System\Util;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

// Color codes for terminal output
const COLOR_GREEN = "\033[0;32m";
const COLOR_RED = "\033[0;31m";
const COLOR_BLUE = "\033[0;34m";
const COLOR_YELLOW = "\033[1;33m";
const COLOR_RESET = "\033[0m";

/**
 * Print colored test header
 */
function printHeader(string $message): void
{
    echo "\n" . COLOR_BLUE . str_repeat("=", 80) . COLOR_RESET . "\n";
    echo COLOR_BLUE . $message . COLOR_RESET . "\n";
    echo COLOR_BLUE . str_repeat("=", 80) . COLOR_RESET . "\n";
}

/**
 * Print colored test name
 */
function printTest(string $testName): void
{
    echo "\n" . COLOR_YELLOW . "TEST: " . $testName . COLOR_RESET . "\n";
}

/**
 * Print test result
 */
function printResult(bool $passed, string $message = ''): void
{
    if ($passed) {
        echo COLOR_GREEN . "✓ PASSED" . COLOR_RESET;
    } else {
        echo COLOR_RED . "✗ FAILED" . COLOR_RESET;
    }

    if ($message) {
        echo " - $message";
    }

    echo "\n";
}

/**
 * Execute CURL request to test HTTP filtering
 *
 * @param string $url Request URL
 * @param array $headers Additional headers
 * @return array ['status' => int, 'body' => string, 'headers' => array]
 */
function executeHttpRequest(string $url, array $headers = []): array
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_NOBODY, false);

    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    $response = curl_exec($ch);
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);

    curl_close($ch);

    $responseHeaders = substr($response, 0, $headerSize);
    $body = substr($response, $headerSize);

    return [
        'status' => $statusCode,
        'body' => $body,
        'headers' => $responseHeaders,
    ];
}

/**
 * Add IPv6 network to whitelist in Redis
 *
 * @param string $ipv6Cidr IPv6 CIDR notation (e.g., "2001:db8::/64")
 * @return bool Success
 */
function addIpv6ToWhitelist(string $ipv6Cidr): bool
{
    try {
        // Create NetworkFilters record
        $filter = new NetworkFilters();
        $filter->permit = $ipv6Cidr;
        $filter->deny = '';
        $filter->newer_block_ip = '1';  // Whitelist (never blocked)
        $filter->local_network = '0';
        $filter->description = 'Test IPv6 whitelist';

        $result = $filter->save();

        if (!$result) {
            echo "Failed to save NetworkFilters: " . implode(", ", $filter->getMessages()) . "\n";
            return false;
        }

        // Trigger firewall reload to update Redis
        Util::reloadFirewall();

        // Wait for Redis update
        sleep(1);

        return true;
    } catch (\Exception $e) {
        echo "Exception adding IPv6 to whitelist: " . $e->getMessage() . "\n";
        return false;
    }
}

/**
 * Remove all test whitelists
 */
function cleanupWhitelist(): void
{
    try {
        $filters = NetworkFilters::find("description = 'Test IPv6 whitelist'");
        foreach ($filters as $filter) {
            $filter->delete();
        }

        Util::reloadFirewall();
        sleep(1);
    } catch (\Exception $e) {
        echo "Exception cleaning up whitelist: " . $e->getMessage() . "\n";
    }
}

/**
 * Check if nginx error log contains Lua errors
 *
 * @return array ['has_errors' => bool, 'errors' => array]
 */
function checkNginxErrorLog(): array
{
    $logFile = '/storage/usbdisk1/mikopbx/log/nginx/error.log';

    if (!file_exists($logFile)) {
        return ['has_errors' => false, 'errors' => []];
    }

    // Read last 100 lines
    $command = sprintf('tail -n 100 %s | grep -i "lua\|error" || true', escapeshellarg($logFile));
    exec($command, $output);

    $luaErrors = [];
    foreach ($output as $line) {
        if (stripos($line, 'lua') !== false || stripos($line, 'error') !== false) {
            $luaErrors[] = $line;
        }
    }

    return [
        'has_errors' => !empty($luaErrors),
        'errors' => $luaErrors,
    ];
}

// =============================================================================
// MAIN TEST EXECUTION
// =============================================================================

printHeader("Lua Security IPv6 Integration Tests");

$failedTests = 0;
$passedTests = 0;

// Cleanup before tests
cleanupWhitelist();

// -----------------------------------------------------------------------------
// TEST 1: Verify Lua script loads without syntax errors
// -----------------------------------------------------------------------------
printTest("Lua script loads without syntax errors");

$result = checkNginxErrorLog();
$passed = !$result['has_errors'];

if (!$passed && !empty($result['errors'])) {
    echo "Nginx error log contains Lua errors:\n";
    foreach ($result['errors'] as $error) {
        echo "  - $error\n";
    }
}

printResult($passed, "Lua scripts loaded without errors");
$passed ? $passedTests++ : $failedTests++;

// -----------------------------------------------------------------------------
// TEST 2: HTTP request from IPv4 address works
// -----------------------------------------------------------------------------
printTest("HTTP request from IPv4 address works");

$response = executeHttpRequest('http://127.0.0.1/pbxcore/api/system/ping');
$passed = $response['status'] === 200;

printResult($passed, "IPv4 localhost request status: {$response['status']}");
$passed ? $passedTests++ : $failedTests++;

// -----------------------------------------------------------------------------
// TEST 3: Add IPv6 network to whitelist
// -----------------------------------------------------------------------------
printTest("Add IPv6 /64 network to whitelist");

$ipv6Network = '2001:db8::/64';
$passed = addIpv6ToWhitelist($ipv6Network);

printResult($passed, "IPv6 network $ipv6Network added to whitelist");
$passed ? $passedTests++ : $failedTests++;

// -----------------------------------------------------------------------------
// TEST 4: Verify whitelist was added to database
// -----------------------------------------------------------------------------
printTest("Verify IPv6 whitelist in database");

$filter = NetworkFilters::findFirst("permit = '2001:db8::/64'");
$passed = $filter !== null;

if ($passed) {
    echo "  Found in database: permit={$filter->permit}, newer_block_ip={$filter->newer_block_ip}\n";
}

printResult($passed, "IPv6 whitelist exists in database");
$passed ? $passedTests++ : $failedTests++;

// -----------------------------------------------------------------------------
// TEST 5: Check Redis whitelist data
// -----------------------------------------------------------------------------
printTest("Verify IPv6 whitelist in Redis");

try {
    $redis = new \Redis();
    $redis->connect('127.0.0.1', 6379);
    $redis->select(1);  // MikoPBX uses database 1

    $whitelistKey = '_PH_REDIS_CLIENT:firewall:whitelist';
    $members = $redis->sMembers($whitelistKey);

    $passed = in_array('2001:db8::/64', $members, true);

    if ($passed) {
        echo "  IPv6 whitelist in Redis: " . implode(", ", array_filter($members, function($m) {
            return strpos($m, ':') !== false;
        })) . "\n";
    } else {
        echo "  Whitelist members: " . implode(", ", $members) . "\n";
    }

    printResult($passed, "IPv6 CIDR found in Redis whitelist");
    $passed ? $passedTests++ : $failedTests++;

    $redis->close();
} catch (\Exception $e) {
    echo "Redis error: " . $e->getMessage() . "\n";
    printResult(false, "Redis connection failed");
    $failedTests++;
}

// -----------------------------------------------------------------------------
// TEST 6: Test Lua CIDR matching with simulated IPv6 request
// -----------------------------------------------------------------------------
printTest("Test Lua IPv6 CIDR matching (simulation)");

// Since we can't easily send HTTP request with IPv6 source in Docker,
// we'll test the Lua functions directly via command line
$luaTestScript = <<<'LUA'
-- Load unified-security.lua functions
dofile('/etc/nginx/mikopbx/lua/unified-security.lua')

-- Test IPv6 CIDR matching
local test_ip = "2001:db8::100"
local test_network = "2001:db8::/64"

local result = ip_in_network(test_ip, test_network)
print(result and "MATCH" or "NO_MATCH")
LUA;

$tempFile = tempnam(sys_get_temp_dir(), 'lua_test_');
file_put_contents($tempFile, $luaTestScript);

$command = sprintf('lua %s 2>&1', escapeshellarg($tempFile));
exec($command, $output, $returnCode);
unlink($tempFile);

$passed = $returnCode === 0 && trim($output[0] ?? '') === 'MATCH';

if (!$passed) {
    echo "  Lua output: " . implode("\n  ", $output) . "\n";
}

printResult($passed, "IPv6 2001:db8::100 matches 2001:db8::/64");
$passed ? $passedTests++ : $failedTests++;

// -----------------------------------------------------------------------------
// TEST 7: Test version mismatch (IPv4 vs IPv6 CIDR)
// -----------------------------------------------------------------------------
printTest("Test IP version mismatch detection");

$luaTestScript = <<<'LUA'
dofile('/etc/nginx/mikopbx/lua/unified-security.lua')

-- IPv4 address should NOT match IPv6 CIDR
local result1 = ip_in_network("192.168.1.100", "2001:db8::/64")
print(result1 and "MATCH" or "NO_MATCH")

-- IPv6 address should NOT match IPv4 CIDR
local result2 = ip_in_network("2001:db8::100", "192.168.1.0/24")
print(result2 and "MATCH" or "NO_MATCH")
LUA;

$tempFile = tempnam(sys_get_temp_dir(), 'lua_test_');
file_put_contents($tempFile, $luaTestScript);

$command = sprintf('lua %s 2>&1', escapeshellarg($tempFile));
exec($command, $output, $returnCode);
unlink($tempFile);

$passed = $returnCode === 0 &&
          trim($output[0] ?? '') === 'NO_MATCH' &&
          trim($output[1] ?? '') === 'NO_MATCH';

if (!$passed) {
    echo "  Lua output: " . implode("\n  ", $output) . "\n";
}

printResult($passed, "Version mismatch correctly rejected");
$passed ? $passedTests++ : $failedTests++;

// -----------------------------------------------------------------------------
// TEST 8: Test CIDR caching performance
// -----------------------------------------------------------------------------
printTest("Test CIDR caching mechanism");

$luaTestScript = <<<'LUA'
dofile('/etc/nginx/mikopbx/lua/unified-security.lua')

-- First call - cache miss
local start = os.clock()
for i = 1, 100 do
    ip_in_network("2001:db8::100", "2001:db8::/64")
end
local elapsed = os.clock() - start

-- Cache should be populated
if cidr_cache["2001:db8::/64"] then
    print("CACHED")
    print(string.format("100 lookups: %.6f seconds", elapsed))
else
    print("NOT_CACHED")
end
LUA;

$tempFile = tempnam(sys_get_temp_dir(), 'lua_test_');
file_put_contents($tempFile, $luaTestScript);

$command = sprintf('lua %s 2>&1', escapeshellarg($tempFile));
exec($command, $output, $returnCode);
unlink($tempFile);

$passed = $returnCode === 0 && trim($output[0] ?? '') === 'CACHED';

if ($passed && isset($output[1])) {
    echo "  Performance: {$output[1]}\n";
}

printResult($passed, "CIDR cache working correctly");
$passed ? $passedTests++ : $failedTests++;

// -----------------------------------------------------------------------------
// TEST 9: Check for Lua errors after tests
// -----------------------------------------------------------------------------
printTest("Check nginx error log after tests");

$result = checkNginxErrorLog();
$passed = !$result['has_errors'];

if (!$passed && !empty($result['errors'])) {
    echo "New Lua errors detected:\n";
    foreach (array_slice($result['errors'], -5) as $error) {
        echo "  - $error\n";
    }
}

printResult($passed, "No new Lua errors detected");
$passed ? $passedTests++ : $failedTests++;

// Cleanup after tests
cleanupWhitelist();

// =============================================================================
// SUMMARY
// =============================================================================

printHeader("Test Summary");

$totalTests = $passedTests + $failedTests;
$successRate = $totalTests > 0 ? round(($passedTests / $totalTests) * 100, 1) : 0;

echo sprintf(
    "Total: %d | " . COLOR_GREEN . "Passed: %d" . COLOR_RESET . " | " . COLOR_RED . "Failed: %d" . COLOR_RESET . " | Success Rate: %.1f%%\n\n",
    $totalTests,
    $passedTests,
    $failedTests,
    $successRate
);

// Exit with appropriate code
exit($failedTests > 0 ? 1 : 0);
