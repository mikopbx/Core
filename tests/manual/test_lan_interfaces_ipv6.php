#!/usr/bin/env php
<?php
/*
 * Manual test script for LanInterfaces IPv6 functionality
 * Run inside container: php /www/tests/manual/test_lan_interfaces_ipv6.php
 */

require_once 'Globals.php';

use MikoPBX\Common\Models\LanInterfaces;

echo "=== LanInterfaces IPv6 Testing Script ===\n\n";

// Test 1: Check database schema
echo "TEST 1: Checking database schema for IPv6 columns...\n";
try {
    $db = \Phalcon\Di\Di::getDefault()->getShared('db');
    $result = $db->fetchAll("PRAGMA table_info(m_LanInterfaces);", \Phalcon\Db\Enum::FETCH_ASSOC);

    $ipv6Columns = array_filter($result, function($col) {
        return strpos($col['name'], 'ipv6') === 0;
    });

    if (count($ipv6Columns) === 4) {
        echo "✓ All 4 IPv6 columns found:\n";
        foreach ($ipv6Columns as $col) {
            echo "  - {$col['name']} ({$col['type']})\n";
        }
    } else {
        echo "✗ Expected 4 IPv6 columns, found " . count($ipv6Columns) . "\n";
        foreach ($ipv6Columns as $col) {
            echo "  - {$col['name']}\n";
        }
    }
} catch (\Exception $e) {
    echo "✗ Database error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 2: Read existing interface
echo "TEST 2: Reading existing LAN interface...\n";
try {
    $interface = LanInterfaces::findFirst();

    if ($interface) {
        echo "✓ Found interface: {$interface->name} ({$interface->interface})\n";
        echo "  IPv4: {$interface->ipaddr}/{$interface->subnet}\n";
        echo "  IPv6 mode: {$interface->ipv6_mode}\n";
        echo "  IPv6 address: {$interface->ipv6addr}\n";
        echo "  IPv6 subnet: {$interface->ipv6_subnet}\n";
        echo "  IPv6 gateway: {$interface->ipv6_gateway}\n";
    } else {
        echo "✗ No interfaces found in database\n";
    }
} catch (\Exception $e) {
    echo "✗ Error reading interface: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 3: Update with IPv6 configuration (Manual mode)
echo "TEST 3: Testing IPv6 Manual configuration...\n";
try {
    $interface = LanInterfaces::findFirst();

    if ($interface) {
        // Save original values
        $originalMode = $interface->ipv6_mode;
        $originalAddr = $interface->ipv6addr;
        $originalSubnet = $interface->ipv6_subnet;
        $originalGateway = $interface->ipv6_gateway;

        // Set IPv6 Manual configuration
        $interface->ipv6_mode = '2'; // Manual
        $interface->ipv6addr = '2001:db8::100';
        $interface->ipv6_subnet = '64';
        $interface->ipv6_gateway = '2001:db8::1';

        if ($interface->save()) {
            echo "✓ Successfully saved IPv6 configuration\n";

            // Read back to verify
            $interface->refresh();
            if ($interface->ipv6_mode === '2' &&
                $interface->ipv6addr === '2001:db8::100' &&
                $interface->ipv6_subnet === '64' &&
                $interface->ipv6_gateway === '2001:db8::1') {
                echo "✓ IPv6 configuration verified in database\n";
            } else {
                echo "✗ IPv6 configuration mismatch after save\n";
            }

            // Restore original values
            $interface->ipv6_mode = $originalMode;
            $interface->ipv6addr = $originalAddr;
            $interface->ipv6_subnet = $originalSubnet;
            $interface->ipv6_gateway = $originalGateway;
            $interface->save();
            echo "✓ Restored original values\n";
        } else {
            echo "✗ Failed to save IPv6 configuration:\n";
            foreach ($interface->getMessages() as $message) {
                echo "  - " . $message . "\n";
            }
        }
    } else {
        echo "✗ No interface to test\n";
    }
} catch (\Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 4: Validation - reject invalid IPv6 address
echo "TEST 4: Testing validation - invalid IPv6 address...\n";
try {
    $interface = LanInterfaces::findFirst();

    if ($interface) {
        $interface->ipv6_mode = '2'; // Manual
        $interface->ipv6addr = '192.168.1.1'; // IPv4, should fail
        $interface->ipv6_subnet = '64';

        if (!$interface->save()) {
            echo "✓ Correctly rejected IPv4 address in ipv6addr field\n";
            $messages = $interface->getMessages();
            if (count($messages) > 0) {
                echo "  Error: " . $messages[0] . "\n";
            }
        } else {
            echo "✗ Should have rejected IPv4 address\n";
        }

        // Reset
        $interface->refresh();
    }
} catch (\Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 5: Validation - Manual mode requires address
echo "TEST 5: Testing validation - Manual mode requires address...\n";
try {
    $interface = LanInterfaces::findFirst();

    if ($interface) {
        $interface->ipv6_mode = '2'; // Manual
        $interface->ipv6addr = ''; // Empty, should fail
        $interface->ipv6_subnet = '64';

        if (!$interface->save()) {
            echo "✓ Correctly rejected empty address in Manual mode\n";
            $messages = $interface->getMessages();
            if (count($messages) > 0) {
                echo "  Error: " . $messages[0] . "\n";
            }
        } else {
            echo "✗ Should have required address in Manual mode\n";
        }

        // Reset
        $interface->refresh();
    }
} catch (\Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 6: Validation - invalid subnet range
echo "TEST 6: Testing validation - invalid subnet range...\n";
try {
    $interface = LanInterfaces::findFirst();

    if ($interface) {
        $interface->ipv6_mode = '2'; // Manual
        $interface->ipv6addr = '2001:db8::100';
        $interface->ipv6_subnet = '129'; // Out of range (max 128)

        if (!$interface->save()) {
            echo "✓ Correctly rejected subnet /129 (out of range)\n";
            $messages = $interface->getMessages();
            if (count($messages) > 0) {
                echo "  Error: " . $messages[0] . "\n";
            }
        } else {
            echo "✗ Should have rejected /129 subnet\n";
        }

        // Reset
        $interface->refresh();
    }
} catch (\Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 7: Validation - Off mode allows empty fields
echo "TEST 7: Testing validation - Off mode allows empty fields...\n";
try {
    $interface = LanInterfaces::findFirst();

    if ($interface) {
        $interface->ipv6_mode = '0'; // Off
        $interface->ipv6addr = '';
        $interface->ipv6_subnet = '';
        $interface->ipv6_gateway = '';

        if ($interface->save()) {
            echo "✓ Correctly accepted empty IPv6 fields in Off mode\n";
        } else {
            echo "✗ Should have accepted empty fields in Off mode:\n";
            foreach ($interface->getMessages() as $message) {
                echo "  - " . $message . "\n";
            }
        }
    }
} catch (\Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 8: Dual-stack configuration
echo "TEST 8: Testing dual-stack (IPv4 + IPv6)...\n";
try {
    $interface = LanInterfaces::findFirst();

    if ($interface) {
        // Save originals
        $originals = [
            'ipaddr' => $interface->ipaddr,
            'subnet' => $interface->subnet,
            'gateway' => $interface->gateway,
            'ipv6_mode' => $interface->ipv6_mode,
            'ipv6addr' => $interface->ipv6addr,
            'ipv6_subnet' => $interface->ipv6_subnet,
            'ipv6_gateway' => $interface->ipv6_gateway,
        ];

        // Set dual-stack
        $interface->ipaddr = '192.168.1.100';
        $interface->subnet = '24';
        $interface->gateway = '192.168.1.1';
        $interface->ipv6_mode = '2'; // Manual
        $interface->ipv6addr = '2001:db8::100';
        $interface->ipv6_subnet = '64';
        $interface->ipv6_gateway = '2001:db8::1';

        if ($interface->save()) {
            echo "✓ Successfully saved dual-stack configuration\n";

            $interface->refresh();
            echo "  IPv4: {$interface->ipaddr}/{$interface->subnet} via {$interface->gateway}\n";
            echo "  IPv6: {$interface->ipv6addr}/{$interface->ipv6_subnet} via {$interface->ipv6_gateway}\n";

            // Restore originals
            foreach ($originals as $key => $value) {
                $interface->$key = $value;
            }
            $interface->save();
            echo "✓ Restored original configuration\n";
        } else {
            echo "✗ Failed to save dual-stack configuration:\n";
            foreach ($interface->getMessages() as $message) {
                echo "  - " . $message . "\n";
            }
        }
    }
} catch (\Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 9: extipaddr with IPv6+port
echo "TEST 9: Testing extipaddr with IPv6+port...\n";
try {
    $interface = LanInterfaces::findFirst();

    if ($interface) {
        $originalExtip = $interface->extipaddr;

        // Test IPv6 with port in brackets
        $interface->extipaddr = '[2001:db8::1]:5060';

        if ($interface->save()) {
            echo "✓ Successfully saved extipaddr with IPv6+port: {$interface->extipaddr}\n";

            // Restore
            $interface->extipaddr = $originalExtip;
            $interface->save();
        } else {
            echo "✗ Failed to save extipaddr with IPv6+port:\n";
            foreach ($interface->getMessages() as $message) {
                echo "  - " . $message . "\n";
            }
        }
    }
} catch (\Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

echo "\n";

echo "=== Testing Complete ===\n";
