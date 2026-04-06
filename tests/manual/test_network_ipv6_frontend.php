<?php
/**
 * Manual Integration Test: Network IPv6 Frontend Support (Phase 3)
 *
 * This test verifies that the REST API correctly handles IPv6 configuration data
 * from the web interface and saves it to the database.
 *
 * Usage:
 *   docker exec -it mikopbx_ipv6-support php /var/www/tests/manual/test_network_ipv6_frontend.php
 *
 * Expected Results:
 *   - GetConfigAction returns IPv6 fields for all interfaces
 *   - SaveConfigAction accepts and validates IPv6 data
 *   - IPv6 configuration persists to database
 *   - IPv6 validation works (mode-based validation, address format, subnet range)
 */

declare(strict_types=1);

require_once 'Globals.php';

use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\PBXCoreREST\Lib\Network\GetConfigAction;
use MikoPBX\PBXCoreREST\Lib\Network\SaveConfigAction;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

// ANSI color codes for output
const COLOR_GREEN = "\033[0;32m";
const COLOR_RED = "\033[0;31m";
const COLOR_BLUE = "\033[0;34m";
const COLOR_YELLOW = "\033[1;33m";
const COLOR_RESET = "\033[0m";

function printHeader(string $text): void
{
    echo "\n" . COLOR_BLUE . "=" . str_repeat("=", 78) . COLOR_RESET . "\n";
    echo COLOR_BLUE . "  $text" . COLOR_RESET . "\n";
    echo COLOR_BLUE . "=" . str_repeat("=", 78) . COLOR_RESET . "\n\n";
}

function printTest(string $testName): void
{
    echo COLOR_YELLOW . "TEST: $testName" . COLOR_RESET . "\n";
}

function printSuccess(string $message): void
{
    echo COLOR_GREEN . "  ✓ $message" . COLOR_RESET . "\n";
}

function printError(string $message): void
{
    echo COLOR_RED . "  ✗ $message" . COLOR_RESET . "\n";
}

function printInfo(string $message): void
{
    echo "  → $message\n";
}

// Test counter
$testsPassed = 0;
$testsFailed = 0;

printHeader("Phase 3: Network IPv6 Frontend Integration Test");

// ============================================================================
// TEST 1: GetConfigAction returns IPv6 fields
// ============================================================================
printTest("1. GetConfigAction returns IPv6 fields for all interfaces");

try {
    $result = GetConfigAction::main();

    if (!$result->success) {
        throw new Exception("GetConfigAction failed: " . json_encode($result->messages));
    }

    if (empty($result->data['interfaces'])) {
        throw new Exception("No interfaces returned");
    }

    $interface = $result->data['interfaces'][0];
    $requiredFields = ['ipv6_mode', 'ipv6addr', 'ipv6_subnet', 'ipv6_gateway'];
    $missingFields = [];

    foreach ($requiredFields as $field) {
        if (!array_key_exists($field, $interface)) {
            $missingFields[] = $field;
        }
    }

    if (!empty($missingFields)) {
        throw new Exception("Missing IPv6 fields: " . implode(', ', $missingFields));
    }

    printSuccess("GetConfigAction returns all IPv6 fields");
    printInfo("Interface ID: {$interface['id']}, IPv6 Mode: {$interface['ipv6_mode']}");
    $testsPassed++;

} catch (Exception $e) {
    printError($e->getMessage());
    $testsFailed++;
}

// ============================================================================
// TEST 2: SaveConfigAction - IPv6 Manual configuration
// ============================================================================
printTest("2. SaveConfigAction accepts IPv6 Manual configuration");

try {
    // Get first interface ID
    $firstInterface = LanInterfaces::findFirst();
    if (!$firstInterface) {
        throw new Exception("No interface found in database");
    }

    $interfaceId = $firstInterface->id;

    // Prepare data with IPv6 Manual configuration
    $testData = [
        "ipv6_mode_{$interfaceId}" => '2',  // Manual
        "ipv6addr_{$interfaceId}" => '2001:db8::100',
        "ipv6_subnet_{$interfaceId}" => '64',
        "ipv6_gateway_{$interfaceId}" => '2001:db8::1',
        "internet_interface" => (string)$interfaceId,
        "usenat" => false
    ];

    $result = SaveConfigAction::main($testData);

    if (!$result->success) {
        throw new Exception("SaveConfigAction failed: " . json_encode($result->messages));
    }

    // Verify data saved to database
    $savedInterface = LanInterfaces::findFirstById($interfaceId);
    if ($savedInterface->ipv6_mode !== '2') {
        throw new Exception("IPv6 mode not saved correctly. Expected '2', got '{$savedInterface->ipv6_mode}'");
    }
    if ($savedInterface->ipv6addr !== '2001:db8::100') {
        throw new Exception("IPv6 address not saved correctly");
    }
    if ($savedInterface->ipv6_subnet !== '64') {
        throw new Exception("IPv6 subnet not saved correctly");
    }
    if ($savedInterface->ipv6_gateway !== '2001:db8::1') {
        throw new Exception("IPv6 gateway not saved correctly");
    }

    printSuccess("IPv6 Manual configuration saved successfully");
    printInfo("Interface {$interfaceId}: 2001:db8::100/64 via 2001:db8::1");
    $testsPassed++;

} catch (Exception $e) {
    printError($e->getMessage());
    $testsFailed++;
}

// ============================================================================
// TEST 3: SaveConfigAction - IPv6 validation (invalid address)
// ============================================================================
printTest("3. SaveConfigAction rejects invalid IPv6 address");

try {
    $firstInterface = LanInterfaces::findFirst();
    $interfaceId = $firstInterface->id;

    // Prepare data with INVALID IPv6 address (IPv4 format)
    $testData = [
        "ipv6_mode_{$interfaceId}" => '2',  // Manual
        "ipv6addr_{$interfaceId}" => '192.168.1.100',  // Invalid: IPv4 in IPv6 field
        "ipv6_subnet_{$interfaceId}" => '64',
        "internet_interface" => (string)$interfaceId,
        "usenat" => false
    ];

    $result = SaveConfigAction::main($testData);

    // Should fail validation
    if ($result->success) {
        throw new Exception("SaveConfigAction should have rejected invalid IPv6 address");
    }

    if (empty($result->messages['error'])) {
        throw new Exception("No validation error message returned");
    }

    $errorMessages = $result->messages['error'];
    if (!in_array('nw_ValidateIPv6AddressInvalid', $errorMessages, true)) {
        throw new Exception("Expected validation error 'nw_ValidateIPv6AddressInvalid', got: " . json_encode($errorMessages));
    }

    printSuccess("Invalid IPv6 address correctly rejected");
    printInfo("Validation error: " . $errorMessages[0]);
    $testsPassed++;

} catch (Exception $e) {
    printError($e->getMessage());
    $testsFailed++;
}

// ============================================================================
// TEST 4: SaveConfigAction - IPv6 validation (invalid subnet)
// ============================================================================
printTest("4. SaveConfigAction rejects invalid IPv6 subnet");

try {
    $firstInterface = LanInterfaces::findFirst();
    $interfaceId = $firstInterface->id;

    // Prepare data with INVALID IPv6 subnet (>128)
    $testData = [
        "ipv6_mode_{$interfaceId}" => '2',  // Manual
        "ipv6addr_{$interfaceId}" => '2001:db8::100',
        "ipv6_subnet_{$interfaceId}" => '129',  // Invalid: >128
        "internet_interface" => (string)$interfaceId,
        "usenat" => false
    ];

    $result = SaveConfigAction::main($testData);

    // Should fail validation
    if ($result->success) {
        throw new Exception("SaveConfigAction should have rejected invalid IPv6 subnet");
    }

    if (empty($result->messages['error'])) {
        throw new Exception("No validation error message returned");
    }

    $errorMessages = $result->messages['error'];
    if (!in_array('nw_ValidateIPv6SubnetInvalid', $errorMessages, true)) {
        throw new Exception("Expected validation error 'nw_ValidateIPv6SubnetInvalid', got: " . json_encode($errorMessages));
    }

    printSuccess("Invalid IPv6 subnet correctly rejected");
    printInfo("Validation error: " . $errorMessages[0]);
    $testsPassed++;

} catch (Exception $e) {
    printError($e->getMessage());
    $testsFailed++;
}

// ============================================================================
// TEST 5: SaveConfigAction - IPv6 Auto mode (SLAAC)
// ============================================================================
printTest("5. SaveConfigAction accepts IPv6 Auto mode (SLAAC)");

try {
    $firstInterface = LanInterfaces::findFirst();
    $interfaceId = $firstInterface->id;

    // Prepare data with IPv6 Auto mode (SLAAC/DHCPv6)
    $testData = [
        "ipv6_mode_{$interfaceId}" => '1',  // Auto
        "ipv6addr_{$interfaceId}" => '',    // Empty for Auto mode
        "ipv6_subnet_{$interfaceId}" => '',
        "ipv6_gateway_{$interfaceId}" => '',
        "internet_interface" => (string)$interfaceId,
        "usenat" => false
    ];

    $result = SaveConfigAction::main($testData);

    if (!$result->success) {
        throw new Exception("SaveConfigAction failed: " . json_encode($result->messages));
    }

    // Verify data saved to database
    $savedInterface = LanInterfaces::findFirstById($interfaceId);
    if ($savedInterface->ipv6_mode !== '1') {
        throw new Exception("IPv6 mode not saved correctly. Expected '1', got '{$savedInterface->ipv6_mode}'");
    }

    printSuccess("IPv6 Auto mode (SLAAC) configured successfully");
    printInfo("Interface {$interfaceId}: IPv6 Auto (SLAAC/DHCPv6)");
    $testsPassed++;

} catch (Exception $e) {
    printError($e->getMessage());
    $testsFailed++;
}

// ============================================================================
// TEST 6: SaveConfigAction - IPv6 Off mode
// ============================================================================
printTest("6. SaveConfigAction accepts IPv6 Off mode");

try {
    $firstInterface = LanInterfaces::findFirst();
    $interfaceId = $firstInterface->id;

    // Prepare data with IPv6 Off mode
    $testData = [
        "ipv6_mode_{$interfaceId}" => '0',  // Off
        "ipv6addr_{$interfaceId}" => '',
        "ipv6_subnet_{$interfaceId}" => '',
        "ipv6_gateway_{$interfaceId}" => '',
        "internet_interface" => (string)$interfaceId,
        "usenat" => false
    ];

    $result = SaveConfigAction::main($testData);

    if (!$result->success) {
        throw new Exception("SaveConfigAction failed: " . json_encode($result->messages));
    }

    // Verify data saved to database
    $savedInterface = LanInterfaces::findFirstById($interfaceId);
    if ($savedInterface->ipv6_mode !== '0') {
        throw new Exception("IPv6 mode not saved correctly. Expected '0', got '{$savedInterface->ipv6_mode}'");
    }

    printSuccess("IPv6 Off mode configured successfully");
    printInfo("Interface {$interfaceId}: IPv6 disabled");
    $testsPassed++;

} catch (Exception $e) {
    printError($e->getMessage());
    $testsFailed++;
}

// ============================================================================
// TEST 7: Verify template includes IPv6 fields
// ============================================================================
printTest("7. GetConfigAction template includes IPv6 fields");

try {
    $result = GetConfigAction::main();

    if (!$result->success) {
        throw new Exception("GetConfigAction failed");
    }

    if (empty($result->data['template'])) {
        throw new Exception("No template returned");
    }

    $template = $result->data['template'];
    $requiredFields = ['ipv6_mode', 'ipv6addr', 'ipv6_subnet', 'ipv6_gateway'];
    $missingFields = [];

    foreach ($requiredFields as $field) {
        if (!array_key_exists($field, $template)) {
            $missingFields[] = $field;
        }
    }

    if (!empty($missingFields)) {
        throw new Exception("Missing IPv6 fields in template: " . implode(', ', $missingFields));
    }

    printSuccess("Template includes all IPv6 fields");
    printInfo("Template IPv6 mode default: {$template['ipv6_mode']}");
    $testsPassed++;

} catch (Exception $e) {
    printError($e->getMessage());
    $testsFailed++;
}

// ============================================================================
// TEST SUMMARY
// ============================================================================
printHeader("Test Summary");

$totalTests = $testsPassed + $testsFailed;
echo "Total Tests: $totalTests\n";
echo COLOR_GREEN . "Passed: $testsPassed" . COLOR_RESET . "\n";

if ($testsFailed > 0) {
    echo COLOR_RED . "Failed: $testsFailed" . COLOR_RESET . "\n";
    echo "\n" . COLOR_RED . "❌ SOME TESTS FAILED" . COLOR_RESET . "\n\n";
    exit(1);
} else {
    echo "\n" . COLOR_GREEN . "✓ ALL TESTS PASSED" . COLOR_RESET . "\n\n";
    exit(0);
}
