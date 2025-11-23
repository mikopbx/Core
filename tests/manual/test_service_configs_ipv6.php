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
 * Manual Integration Test: Service Configuration IPv6 Support
 *
 * Tests IPv6 configuration generation for:
 * - NginxConf (HTTP/HTTPS listeners)
 * - SIPConf (PJSIP transports)
 * - IptablesConf (firewall rules)
 *
 * Usage:
 *   docker exec -it mikopbx_ipv6-support php /offload/rootfs/usr/www/tests/manual/test_service_configs_ipv6.php
 *
 * Exit Codes:
 *   0 - All tests passed
 *   1 - One or more tests failed
 */

require_once 'Globals.php';

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Core\System\Configs\NginxConf;
use MikoPBX\Core\Asterisk\Configs\SIPConf;
use MikoPBX\Core\System\Configs\IptablesConf;

// ANSI color codes for terminal output
const COLOR_RESET = "\033[0m";
const COLOR_GREEN = "\033[32m";
const COLOR_RED = "\033[31m";
const COLOR_YELLOW = "\033[33m";
const COLOR_BLUE = "\033[34m";

$testResults = [];
$testNumber = 1;

/**
 * Print colored test header
 */
function printHeader(string $message): void
{
    echo COLOR_BLUE . "\n" . str_repeat('=', 80) . "\n";
    echo $message . "\n";
    echo str_repeat('=', 80) . COLOR_RESET . "\n\n";
}

/**
 * Print test name with number
 */
function printTest(int $number, string $name): void
{
    echo COLOR_YELLOW . "TEST {$number}: {$name}" . COLOR_RESET . "\n";
}

/**
 * Print test result
 */
function printResult(bool $passed, string $message): void
{
    $status = $passed ? COLOR_GREEN . '✓ PASS' : COLOR_RED . '✗ FAIL';
    echo "  {$status}" . COLOR_RESET . ": {$message}\n";
}

/**
 * Record test result
 */
function recordResult(int $testNumber, string $testName, bool $passed, string $message): void
{
    global $testResults;
    $testResults[] = [
        'number' => $testNumber,
        'name' => $testName,
        'passed' => $passed,
        'message' => $message
    ];
    printResult($passed, $message);
}

printHeader('MikoPBX Service Configuration IPv6 Integration Tests');

// =============================================================================
// TEST 1: NginxConf generates IPv6 listeners when IPv6 interface exists
// =============================================================================
printTest($testNumber, 'NginxConf generates IPv6 listeners when IPv6 is enabled');

try {
    // Enable IPv6 on first interface
    $interfaces = LanInterfaces::find();
    if (count($interfaces) === 0) {
        recordResult($testNumber, 'NginxConf IPv6 listeners', false, 'No LAN interfaces available - skipped');
    } else {
        $testInterface = $interfaces[0];
        $originalMode = $testInterface->ipv6_mode;

        // Set to Manual mode with IPv6 address
        $testInterface->ipv6_mode = '2';
        $testInterface->ipv6addr = '2001:db8::100';
        $testInterface->ipv6_subnet = '64';
        $testInterface->save();

        // Generate Nginx configuration
        $nginxConf = new NginxConf();
        $nginxConf->generateConf();

        // Check HTTP configuration
        $httpConfPath = '/etc/nginx/mikopbx/conf.d/http-server.conf';
        $httpConfig = file_exists($httpConfPath) ? file_get_contents($httpConfPath) : '';

        // Check HTTPS configuration
        $httpsConfPath = '/etc/nginx/mikopbx/conf.d/https-server.conf';
        $httpsConfig = file_exists($httpsConfPath) ? file_get_contents($httpsConfPath) : '';

        $httpHasIpv6 = strpos($httpConfig, 'listen      [::]:') !== false;
        $httpsHasIpv6 = strpos($httpsConfig, 'listen       [::]:') !== false || !file_exists($httpsConfPath);

        // Restore original mode
        $testInterface->ipv6_mode = $originalMode;
        $testInterface->ipv6addr = '';
        $testInterface->ipv6_subnet = '';
        $testInterface->save();

        if ($httpHasIpv6) {
            recordResult($testNumber, 'NginxConf IPv6 HTTP listener', true, 'HTTP config includes IPv6 listener [::]:port');
        } else {
            recordResult($testNumber, 'NginxConf IPv6 HTTP listener', false, 'HTTP config missing IPv6 listener');
        }

        if ($httpsHasIpv6 || !file_exists($httpsConfPath)) {
            recordResult($testNumber, 'NginxConf IPv6 HTTPS listener', true, 'HTTPS config includes IPv6 listener or SSL not configured');
        } else {
            recordResult($testNumber, 'NginxConf IPv6 HTTPS listener', false, 'HTTPS config missing IPv6 listener');
        }
    }
} catch (Exception $e) {
    recordResult($testNumber, 'NginxConf IPv6 listeners', false, 'Exception: ' . $e->getMessage());
}

$testNumber++;

// =============================================================================
// TEST 2: SIPConf generates IPv6 transports when IPv6 interface exists
// =============================================================================
printTest($testNumber, 'SIPConf generates IPv6 PJSIP transports when IPv6 is enabled');

try {
    $interfaces = LanInterfaces::find();
    if (count($interfaces) === 0) {
        recordResult($testNumber, 'SIPConf IPv6 transports', false, 'No LAN interfaces available - skipped');
    } else {
        $testInterface = $interfaces[0];
        $originalMode = $testInterface->ipv6_mode;

        // Enable IPv6 Auto mode
        $testInterface->ipv6_mode = '1';
        $testInterface->save();

        // Generate PJSIP configuration
        $sipConf = new SIPConf();
        $sipConf->generateConfig();

        // Read generated pjsip.conf
        $pjsipConfPath = '/etc/asterisk/pjsip.conf';
        $pjsipConfig = file_exists($pjsipConfPath) ? file_get_contents($pjsipConfPath) : '';

        // Check for IPv6 transports
        $hasUdpIpv6 = strpos($pjsipConfig, '[transport-udp-ipv6]') !== false;
        $hasTcpIpv6 = strpos($pjsipConfig, '[transport-tcp-ipv6]') !== false;
        $hasTlsIpv6 = strpos($pjsipConfig, '[transport-tls-ipv6]') !== false || strpos($pjsipConfig, '[transport-tls]') === false;
        $hasBindIpv6 = strpos($pjsipConfig, 'bind=[::]:') !== false;

        // Restore original mode
        $testInterface->ipv6_mode = $originalMode;
        $testInterface->save();

        if ($hasUdpIpv6) {
            recordResult($testNumber, 'SIPConf UDP IPv6 transport', true, 'PJSIP config includes [transport-udp-ipv6]');
        } else {
            recordResult($testNumber, 'SIPConf UDP IPv6 transport', false, 'PJSIP config missing UDP IPv6 transport');
        }

        if ($hasTcpIpv6) {
            recordResult($testNumber, 'SIPConf TCP IPv6 transport', true, 'PJSIP config includes [transport-tcp-ipv6]');
        } else {
            recordResult($testNumber, 'SIPConf TCP IPv6 transport', false, 'PJSIP config missing TCP IPv6 transport');
        }

        if ($hasTlsIpv6) {
            recordResult($testNumber, 'SIPConf TLS IPv6 transport', true, 'PJSIP config includes TLS IPv6 transport or TLS not configured');
        } else {
            recordResult($testNumber, 'SIPConf TLS IPv6 transport', false, 'PJSIP config missing TLS IPv6 transport');
        }

        if ($hasBindIpv6) {
            recordResult($testNumber, 'SIPConf IPv6 bind address', true, 'PJSIP config includes bind=[::]:port');
        } else {
            recordResult($testNumber, 'SIPConf IPv6 bind address', false, 'PJSIP config missing IPv6 bind address');
        }
    }
} catch (Exception $e) {
    recordResult($testNumber, 'SIPConf IPv6 transports', false, 'Exception: ' . $e->getMessage());
}

$testNumber++;

// =============================================================================
// TEST 3: IptablesConf generates ip6tables rules for IPv6 subnets
// =============================================================================
printTest($testNumber, 'IptablesConf generates ip6tables rules for IPv6 addresses');

try {
    $iptablesConf = new IptablesConf();

    // Use reflection to test private method getFirewallRule()
    $reflection = new ReflectionClass($iptablesConf);
    $method = $reflection->getMethod('getFirewallRule');
    $method->setAccessible(true);

    // Test IPv6 address
    $ruleIpv6 = $method->invoke($iptablesConf, '2001:db8::100', 'tcp', '-m multiport --dport 5060,5061', 'ACCEPT');

    // Test IPv4 address for comparison
    $ruleIpv4 = $method->invoke($iptablesConf, '192.168.1.100', 'tcp', '-m multiport --dport 5060,5061', 'ACCEPT');

    $ipv6UsesIp6tables = strpos($ruleIpv6, 'ip6tables') !== false;
    $ipv4UsesIptables = strpos($ruleIpv4, 'iptables -A INPUT') !== false;
    $ipv6IncludesSource = strpos($ruleIpv6, '-s 2001:db8::100') !== false;
    $ipv6IncludesProtocol = strpos($ruleIpv6, '-p tcp') !== false;
    $ipv6IncludesPorts = strpos($ruleIpv6, '-m multiport --dport 5060,5061') !== false;

    if ($ipv6UsesIp6tables && !strpos($ruleIpv6, 'iptables -A INPUT')) {
        recordResult($testNumber, 'IptablesConf ip6tables command', true, 'IPv6 rule uses ip6tables (not iptables)');
    } else {
        recordResult($testNumber, 'IptablesConf ip6tables command', false, 'IPv6 rule does not use ip6tables: ' . $ruleIpv6);
    }

    if ($ipv4UsesIptables && !strpos($ruleIpv4, 'ip6tables')) {
        recordResult($testNumber, 'IptablesConf iptables command', true, 'IPv4 rule uses iptables (not ip6tables)');
    } else {
        recordResult($testNumber, 'IptablesConf iptables command', false, 'IPv4 rule does not use iptables: ' . $ruleIpv4);
    }

    if ($ipv6IncludesSource) {
        recordResult($testNumber, 'IptablesConf IPv6 source address', true, 'IPv6 rule includes source -s 2001:db8::100');
    } else {
        recordResult($testNumber, 'IptablesConf IPv6 source address', false, 'IPv6 rule missing source address');
    }

    if ($ipv6IncludesProtocol && $ipv6IncludesPorts) {
        recordResult($testNumber, 'IptablesConf IPv6 rule parameters', true, 'IPv6 rule includes protocol and ports');
    } else {
        recordResult($testNumber, 'IptablesConf IPv6 rule parameters', false, 'IPv6 rule missing protocol or ports');
    }
} catch (Exception $e) {
    recordResult($testNumber, 'IptablesConf ip6tables rules', false, 'Exception: ' . $e->getMessage());
}

$testNumber++;

// =============================================================================
// TEST 4: Services generate IPv4-only config when IPv6 is disabled
// =============================================================================
printTest($testNumber, 'Services generate IPv4-only config when IPv6 is disabled');

try {
    $interfaces = LanInterfaces::find();
    $originalModes = [];

    // Disable IPv6 on all interfaces
    foreach ($interfaces as $interface) {
        $originalModes[$interface->id] = $interface->ipv6_mode;
        $interface->ipv6_mode = '0'; // Off
        $interface->save();
    }

    // Generate Nginx configuration
    $nginxConf = new NginxConf();
    $nginxConf->generateConf();

    // Check HTTP configuration
    $httpConfPath = '/etc/nginx/mikopbx/conf.d/http-server.conf';
    $httpConfig = file_exists($httpConfPath) ? file_get_contents($httpConfPath) : '';

    $httpNoIpv6 = strpos($httpConfig, 'listen      [::]:') === false;

    // Restore original modes
    foreach ($interfaces as $interface) {
        $interface->ipv6_mode = $originalModes[$interface->id];
        $interface->save();
    }

    if ($httpNoIpv6) {
        recordResult($testNumber, 'NginxConf IPv4-only mode', true, 'HTTP config does NOT include IPv6 listener when disabled');
    } else {
        recordResult($testNumber, 'NginxConf IPv4-only mode', false, 'HTTP config includes IPv6 listener when it should be disabled');
    }
} catch (Exception $e) {
    recordResult($testNumber, 'Services IPv4-only mode', false, 'Exception: ' . $e->getMessage());
}

$testNumber++;

// =============================================================================
// TEST 5: Dual-stack configuration works (both IPv4 and IPv6 rules coexist)
// =============================================================================
printTest($testNumber, 'Dual-stack configuration generates both IPv4 and IPv6 rules');

try {
    $interfaces = LanInterfaces::find();
    if (count($interfaces) === 0) {
        recordResult($testNumber, 'Dual-stack configuration', false, 'No LAN interfaces available - skipped');
    } else {
        $testInterface = $interfaces[0];
        $originalMode = $testInterface->ipv6_mode;
        $originalIpv4 = $testInterface->ipaddr;

        // Set dual-stack: IPv4 + IPv6 Manual
        $testInterface->ipaddr = '192.168.1.100';
        $testInterface->subnet = '24';
        $testInterface->ipv6_mode = '2';
        $testInterface->ipv6addr = '2001:db8::100';
        $testInterface->ipv6_subnet = '64';
        $testInterface->save();

        // Generate Nginx configuration
        $nginxConf = new NginxConf();
        $nginxConf->generateConf();

        // Check HTTP configuration
        $httpConfPath = '/etc/nginx/mikopbx/conf.d/http-server.conf';
        $httpConfig = file_exists($httpConfPath) ? file_get_contents($httpConfPath) : '';

        // Count listeners
        $ipv4ListenerCount = substr_count($httpConfig, 'listen      ');
        $ipv6ListenerCount = substr_count($httpConfig, 'listen      [::]:');

        // Restore original settings
        $testInterface->ipv6_mode = $originalMode;
        $testInterface->ipaddr = $originalIpv4;
        $testInterface->ipv6addr = '';
        $testInterface->ipv6_subnet = '';
        $testInterface->save();

        if ($ipv4ListenerCount > 0) {
            recordResult($testNumber, 'Dual-stack IPv4 listener', true, "HTTP config includes IPv4 listener ({$ipv4ListenerCount} found)");
        } else {
            recordResult($testNumber, 'Dual-stack IPv4 listener', false, 'HTTP config missing IPv4 listener');
        }

        if ($ipv6ListenerCount > 0) {
            recordResult($testNumber, 'Dual-stack IPv6 listener', true, "HTTP config includes IPv6 listener ({$ipv6ListenerCount} found)");
        } else {
            recordResult($testNumber, 'Dual-stack IPv6 listener', false, 'HTTP config missing IPv6 listener');
        }

        if ($ipv4ListenerCount > 0 && $ipv6ListenerCount > 0) {
            recordResult($testNumber, 'Dual-stack coexistence', true, 'Both IPv4 and IPv6 listeners present in HTTP config');
        } else {
            recordResult($testNumber, 'Dual-stack coexistence', false, 'Dual-stack configuration incomplete');
        }
    }
} catch (Exception $e) {
    recordResult($testNumber, 'Dual-stack configuration', false, 'Exception: ' . $e->getMessage());
}

// =============================================================================
// Print Summary
// =============================================================================
printHeader('Test Summary');

$totalTests = count($testResults);
$passedTests = count(array_filter($testResults, fn($r) => $r['passed']));
$failedTests = $totalTests - $passedTests;

echo "Total Tests: {$totalTests}\n";
echo COLOR_GREEN . "Passed: {$passedTests}" . COLOR_RESET . "\n";
echo COLOR_RED . "Failed: {$failedTests}" . COLOR_RESET . "\n\n";

if ($failedTests > 0) {
    echo COLOR_RED . "Failed Tests:\n" . COLOR_RESET;
    foreach ($testResults as $result) {
        if (!$result['passed']) {
            echo "  - TEST {$result['number']}: {$result['name']} - {$result['message']}\n";
        }
    }
    echo "\n";
}

// Exit with appropriate code
exit($failedTests > 0 ? 1 : 0);
