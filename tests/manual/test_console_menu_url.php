#!/usr/bin/env php
<?php
/**
 * Manual test script for console menu Web Interface URL display
 * Tests different scenarios: IPv4, IPv6, standard port, custom port
 */

require_once 'Globals.php';

use MikoPBX\Core\Utilities\IpAddressHelper;
use MikoPBX\Common\Models\PbxSettings;

echo "=== Console Menu Web Interface URL Test ===\n\n";

// Test scenarios
$testCases = [
    [
        'name' => 'IPv4 with standard port (443)',
        'ip' => '192.168.1.100',
        'port' => '443',
        'expected' => 'https://192.168.1.100'
    ],
    [
        'name' => 'IPv4 with custom port (8449)',
        'ip' => '192.168.1.100',
        'port' => '8449',
        'expected' => 'https://192.168.1.100:8449'
    ],
    [
        'name' => 'IPv6 with standard port (443)',
        'ip' => '2001:db8::1',
        'port' => '443',
        'expected' => 'https://[2001:db8::1]'
    ],
    [
        'name' => 'IPv6 with custom port (8449)',
        'ip' => '2001:db8::1',
        'port' => '8449',
        'expected' => 'https://[2001:db8::1]:8449'
    ],
    [
        'name' => 'IPv6 compressed with custom port',
        'ip' => '::1',
        'port' => '8443',
        'expected' => 'https://[::1]:8443'
    ],
];

$passed = 0;
$failed = 0;

foreach ($testCases as $test) {
    echo "Test: {$test['name']}\n";
    echo "  IP: {$test['ip']}\n";
    echo "  Port: {$test['port']}\n";

    // Simulate the logic from ConsoleMenu.php
    $webUrl = 'https://';

    // Handle IPv6 addresses - wrap in brackets
    if (IpAddressHelper::isIpv6($test['ip'])) {
        $webUrl .= '[' . $test['ip'] . ']';
    } else {
        $webUrl .= $test['ip'];
    }

    // Add port only if it's not standard (443)
    if ($test['port'] !== '443') {
        $webUrl .= ':' . $test['port'];
    }

    echo "  Generated: $webUrl\n";
    echo "  Expected:  {$test['expected']}\n";

    if ($webUrl === $test['expected']) {
        echo "  ✓ PASSED\n\n";
        $passed++;
    } else {
        echo "  ✗ FAILED\n\n";
        $failed++;
    }
}

echo "===========================================\n";
echo "Results: $passed passed, $failed failed\n";

// Test with current system settings
echo "\n=== Current System Configuration ===\n";
$currentPort = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PORT);
echo "Current HTTPS Port: $currentPort\n";

if ($currentPort !== '443') {
    echo "Custom port detected - port will be displayed in console menu\n";
} else {
    echo "Standard port - port will NOT be displayed in console menu\n";
}

exit($failed > 0 ? 1 : 0);
