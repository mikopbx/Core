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
 * Manual Integration Test for IPv6 Network Configuration
 *
 * REQUIREMENTS:
 * - Docker container with IPv6 support enabled
 * - Database initialized with LanInterfaces and NetworkStaticRoutes tables
 * - Network class with IPv6 support
 *
 * USAGE:
 *   docker exec -it mikopbx_ipv6-support php /var/www/tests/manual/test_network_ipv6_config.php
 *
 * OR (if file is mapped):
 *   php tests/manual/test_network_ipv6_config.php
 */

require_once 'Globals.php';

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\NetworkStaticRoutes;
use MikoPBX\Core\System\Network;
use MikoPBX\Core\System\Util;

// ANSI color codes for output
const COLOR_GREEN = "\033[32m";
const COLOR_RED = "\033[31m";
const COLOR_YELLOW = "\033[33m";
const COLOR_BLUE = "\033[34m";
const COLOR_RESET = "\033[0m";

class NetworkIpv6IntegrationTest
{
    private int $testsPassed = 0;
    private int $testsFailed = 0;
    private array $errors = [];

    /**
     * Run all tests
     */
    public function runAllTests(): void
    {
        echo COLOR_BLUE . "\n========================================\n" . COLOR_RESET;
        echo COLOR_BLUE . "IPv6 Network Configuration Integration Tests\n" . COLOR_RESET;
        echo COLOR_BLUE . "========================================\n\n" . COLOR_RESET;

        // Test 1: Configure Manual IPv6 on eth0
        $this->test1ConfigureManualIpv6();

        // Test 2: Add IPv6 static route
        $this->test2AddIpv6StaticRoute();

        // Test 3: Verify IPv6 commands generated
        $this->test3VerifyCommandGeneration();

        // Test 4: Test Auto mode (SLAAC)
        $this->test4TestAutoMode();

        // Test 5: Test dual-stack configuration
        $this->test5TestDualStack();

        // Test 6: Switch from Manual to Off mode
        $this->test6SwitchToOffMode();

        // Test 7: Test invalid IPv6 address handling
        $this->test7TestInvalidIpv6();

        // Print summary
        $this->printSummary();
    }

    /**
     * TEST 1: Configure Manual IPv6 on eth0 (2001:db8::100/64)
     */
    private function test1ConfigureManualIpv6(): void
    {
        echo COLOR_YELLOW . "TEST 1: Configure Manual IPv6 on eth0\n" . COLOR_RESET;

        try {
            // Find or create eth0 interface
            $interface = LanInterfaces::findFirst("interface = 'eth0'");

            if (!$interface) {
                throw new Exception("eth0 interface not found in database");
            }

            // Configure IPv6
            $interface->ipv6_mode = '2'; // Manual
            $interface->ipv6addr = '2001:db8::100';
            $interface->ipv6_subnet = '64';
            $interface->ipv6_gateway = '';

            if ($interface->save()) {
                $this->pass("Successfully configured IPv6 Manual mode on eth0");
            } else {
                $messages = [];
                foreach ($interface->getMessages() as $message) {
                    $messages[] = $message->getMessage();
                }
                throw new Exception("Failed to save: " . implode(", ", $messages));
            }

            // Verify data was saved
            $interface = LanInterfaces::findFirst("interface = 'eth0'");
            if ($interface->ipv6_mode === '2' &&
                $interface->ipv6addr === '2001:db8::100' &&
                $interface->ipv6_subnet === '64') {
                $this->pass("IPv6 configuration verified in database");
            } else {
                throw new Exception("IPv6 data mismatch in database");
            }

        } catch (Exception $e) {
            $this->fail("Test 1 failed: " . $e->getMessage());
        }

        echo "\n";
    }

    /**
     * TEST 2: Add IPv6 static route (2001:db8:1::/64 via 2001:db8::1)
     */
    private function test2AddIpv6StaticRoute(): void
    {
        echo COLOR_YELLOW . "TEST 2: Add IPv6 static route\n" . COLOR_RESET;

        try {
            // Create new static route
            $route = new NetworkStaticRoutes();
            $route->network = '2001:db8:1::';
            $route->subnet = '64';
            $route->gateway = '2001:db8::1';
            $route->interface = 'eth0';
            $route->priority = 1;

            if ($route->save()) {
                $this->pass("Successfully created IPv6 static route");
            } else {
                $messages = [];
                foreach ($route->getMessages() as $message) {
                    $messages[] = $message->getMessage();
                }
                throw new Exception("Failed to save route: " . implode(", ", $messages));
            }

            // Verify route was saved
            $savedRoute = NetworkStaticRoutes::findFirst([
                'conditions' => 'network = :network:',
                'bind' => ['network' => '2001:db8:1::']
            ]);

            if ($savedRoute && $savedRoute->subnet === '64') {
                $this->pass("IPv6 static route verified in database");
            } else {
                throw new Exception("IPv6 route not found or data mismatch");
            }

        } catch (Exception $e) {
            $this->fail("Test 2 failed: " . $e->getMessage());
        }

        echo "\n";
    }

    /**
     * TEST 3: Verify IPv6 commands generated by Network class
     */
    private function test3VerifyCommandGeneration(): void
    {
        echo COLOR_YELLOW . "TEST 3: Verify command generation\n" . COLOR_RESET;

        try {
            $network = new Network();

            // Use reflection to access private method
            $reflection = new ReflectionClass(Network::class);
            $method = $reflection->getMethod('configureIpv6Interface');
            $method->setAccessible(true);

            // Test Manual mode command generation
            $commands = $method->invoke(
                $network,
                'eth0',
                '2',
                '2001:db8::100',
                '64',
                '2001:db8::1'
            );

            if (empty($commands)) {
                throw new Exception("No commands generated for Manual mode");
            }

            // Verify address command
            $foundAddressCmd = false;
            $foundGatewayCmd = false;

            foreach ($commands as $cmd) {
                if (strpos($cmd, 'ip -6 addr add') !== false) {
                    $foundAddressCmd = true;
                    if (strpos($cmd, '2001:db8::100/64') === false) {
                        throw new Exception("Address command missing correct IPv6 address");
                    }
                }

                if (strpos($cmd, 'ip -6 route add default via 2001:db8::1') !== false) {
                    $foundGatewayCmd = true;
                }
            }

            if ($foundAddressCmd) {
                $this->pass("IPv6 address command generated correctly");
            } else {
                throw new Exception("IPv6 address command not found");
            }

            if ($foundGatewayCmd) {
                $this->pass("IPv6 gateway command generated correctly");
            } else {
                throw new Exception("IPv6 gateway command not found");
            }

        } catch (Exception $e) {
            $this->fail("Test 3 failed: " . $e->getMessage());
        }

        echo "\n";
    }

    /**
     * TEST 4: Test Auto mode (SLAAC)
     */
    private function test4TestAutoMode(): void
    {
        echo COLOR_YELLOW . "TEST 4: Test IPv6 Auto mode (SLAAC)\n" . COLOR_RESET;

        try {
            $interface = LanInterfaces::findFirst("interface = 'eth0'");

            if (!$interface) {
                throw new Exception("eth0 interface not found");
            }

            // Switch to Auto mode
            $interface->ipv6_mode = '1';
            $interface->ipv6addr = '';
            $interface->ipv6_subnet = '';
            $interface->ipv6_gateway = '';

            if ($interface->save()) {
                $this->pass("Successfully switched to Auto mode");
            } else {
                throw new Exception("Failed to save Auto mode");
            }

            // Verify Auto mode generates no commands (SLAAC is automatic)
            $network = new Network();
            $reflection = new ReflectionClass(Network::class);
            $method = $reflection->getMethod('configureIpv6Interface');
            $method->setAccessible(true);

            $commands = $method->invoke($network, 'eth0', '1', '', '', '');

            if (empty($commands)) {
                $this->pass("Auto mode correctly generates no commands (SLAAC is automatic)");
            } else {
                throw new Exception("Auto mode should not generate commands");
            }

        } catch (Exception $e) {
            $this->fail("Test 4 failed: " . $e->getMessage());
        }

        echo "\n";
    }

    /**
     * TEST 5: Test dual-stack (both IPv4 and IPv6)
     */
    private function test5TestDualStack(): void
    {
        echo COLOR_YELLOW . "TEST 5: Test dual-stack configuration\n" . COLOR_RESET;

        try {
            $interface = LanInterfaces::findFirst("interface = 'eth0'");

            if (!$interface) {
                throw new Exception("eth0 interface not found");
            }

            // Configure both IPv4 and IPv6
            $interface->ipaddr = '192.168.1.100';
            $interface->subnet = '24';
            $interface->gateway = '192.168.1.1';
            $interface->ipv6_mode = '2';
            $interface->ipv6addr = '2001:db8::100';
            $interface->ipv6_subnet = '64';
            $interface->ipv6_gateway = '2001:db8::1';

            if ($interface->save()) {
                $this->pass("Successfully configured dual-stack (IPv4 + IPv6)");
            } else {
                throw new Exception("Failed to save dual-stack configuration");
            }

            // Verify both are saved
            $interface = LanInterfaces::findFirst("interface = 'eth0'");

            if ($interface->ipaddr === '192.168.1.100' &&
                $interface->ipv6addr === '2001:db8::100') {
                $this->pass("Dual-stack configuration verified in database");
            } else {
                throw new Exception("Dual-stack data mismatch");
            }

        } catch (Exception $e) {
            $this->fail("Test 5 failed: " . $e->getMessage());
        }

        echo "\n";
    }

    /**
     * TEST 6: Switch from Manual to Off mode
     */
    private function test6SwitchToOffMode(): void
    {
        echo COLOR_YELLOW . "TEST 6: Switch from Manual to Off mode\n" . COLOR_RESET;

        try {
            $interface = LanInterfaces::findFirst("interface = 'eth0'");

            if (!$interface) {
                throw new Exception("eth0 interface not found");
            }

            // Switch to Off mode
            $interface->ipv6_mode = '0';
            $interface->ipv6addr = '';
            $interface->ipv6_subnet = '';
            $interface->ipv6_gateway = '';

            if ($interface->save()) {
                $this->pass("Successfully switched to Off mode");
            } else {
                throw new Exception("Failed to save Off mode");
            }

            // Verify Off mode generates flush command
            $network = new Network();
            $reflection = new ReflectionClass(Network::class);
            $method = $reflection->getMethod('configureIpv6Interface');
            $method->setAccessible(true);

            $commands = $method->invoke($network, 'eth0', '0', '', '', '');

            if (count($commands) === 1 && strpos($commands[0], 'ip -6 addr flush') !== false) {
                $this->pass("Off mode correctly generates flush command");
            } else {
                throw new Exception("Off mode should generate flush command");
            }

        } catch (Exception $e) {
            $this->fail("Test 6 failed: " . $e->getMessage());
        }

        echo "\n";
    }

    /**
     * TEST 7: Test invalid IPv6 address handling
     */
    private function test7TestInvalidIpv6(): void
    {
        echo COLOR_YELLOW . "TEST 7: Test invalid IPv6 address handling\n" . COLOR_RESET;

        try {
            $interface = LanInterfaces::findFirst("interface = 'eth0'");

            if (!$interface) {
                throw new Exception("eth0 interface not found");
            }

            // Try to set invalid IPv4 address as IPv6
            $interface->ipv6_mode = '2';
            $interface->ipv6addr = '192.168.1.100'; // Invalid: IPv4
            $interface->ipv6_subnet = '64';
            $interface->ipv6_gateway = '';

            // This should fail validation
            if (!$interface->save()) {
                $this->pass("Validation correctly rejected IPv4 address in IPv6 field");
            } else {
                throw new Exception("Validation should have rejected IPv4 address");
            }

            // Try invalid subnet
            $interface->ipv6addr = '2001:db8::100';
            $interface->ipv6_subnet = '129'; // Invalid: max is 128

            if (!$interface->save()) {
                $this->pass("Validation correctly rejected invalid subnet /129");
            } else {
                throw new Exception("Validation should have rejected subnet /129");
            }

        } catch (Exception $e) {
            $this->fail("Test 7 failed: " . $e->getMessage());
        }

        echo "\n";
    }

    /**
     * Mark test as passed
     */
    private function pass(string $message): void
    {
        $this->testsPassed++;
        echo COLOR_GREEN . "  ✓ " . $message . COLOR_RESET . "\n";
    }

    /**
     * Mark test as failed
     */
    private function fail(string $message): void
    {
        $this->testsFailed++;
        $this->errors[] = $message;
        echo COLOR_RED . "  ✗ " . $message . COLOR_RESET . "\n";
    }

    /**
     * Print test summary
     */
    private function printSummary(): void
    {
        echo COLOR_BLUE . "\n========================================\n" . COLOR_RESET;
        echo COLOR_BLUE . "Test Summary\n" . COLOR_RESET;
        echo COLOR_BLUE . "========================================\n" . COLOR_RESET;

        echo COLOR_GREEN . "Passed: " . $this->testsPassed . COLOR_RESET . "\n";
        echo COLOR_RED . "Failed: " . $this->testsFailed . COLOR_RESET . "\n";

        if ($this->testsFailed > 0) {
            echo COLOR_RED . "\nErrors:\n" . COLOR_RESET;
            foreach ($this->errors as $error) {
                echo COLOR_RED . "  - " . $error . COLOR_RESET . "\n";
            }
        }

        echo "\n";

        if ($this->testsFailed === 0) {
            echo COLOR_GREEN . "All tests passed! ✓\n" . COLOR_RESET;
            exit(0);
        } else {
            echo COLOR_RED . "Some tests failed! ✗\n" . COLOR_RESET;
            exit(1);
        }
    }
}

// Run tests
$tester = new NetworkIpv6IntegrationTest();
$tester->runAllTests();
