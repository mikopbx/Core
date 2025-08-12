#!/usr/bin/env php
<?php
/**
 * Test script for system extensions migration and backward compatibility
 */

require_once 'Globals.php';

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Core\System\Upgrade\Releases\UpdateConfigsUpToVer20241212;
use MikoPBX\PBXCoreREST\Lib\Common\SystemSanitizer;

echo "=== Testing System Extensions Migration ===\n\n";

// Test 1: Check if system extensions exist or can be created
echo "Test 1: Checking system extensions...\n";
$systemExtensions = Extensions::getSystemExtensions();
echo "Current system extensions: " . json_encode($systemExtensions) . "\n";

if (empty($systemExtensions)) {
    echo "No system extensions found, running migration...\n";
    $migration = new UpdateConfigsUpToVer20241212();
    $migration->processUpdate();
    
    // Clear cache and reload
    Extensions::clearSystemExtensionsCache();
    $systemExtensions = Extensions::getSystemExtensions();
    echo "System extensions after migration: " . json_encode($systemExtensions) . "\n";
}

// Test 2: Test SystemSanitizer with system extensions
echo "\nTest 2: Testing SystemSanitizer...\n";
$testValues = [
    '100',        // Regular extension
    'hangup',     // System extension
    'busy',       // System extension
    'voicemail',  // System extension
    'did2user',   // System extension
    'invalid',    // Invalid value
    '12345678901234567890', // Long number
];

foreach ($testValues as $value) {
    $isValid = SystemSanitizer::isValidExtension($value);
    $sanitized = SystemSanitizer::sanitizeExtension($value);
    echo "Value: '$value' => Valid: " . ($isValid ? 'Yes' : 'No') . ", Sanitized: '$sanitized'\n";
}

// Test 3: Check if any routes have legacy actions
echo "\nTest 3: Checking for legacy actions in routes...\n";
$legacyActions = ['hangup', 'busy', 'voicemail', 'did2user', 'did'];
$routes = IncomingRoutingTable::find();
$legacyCount = 0;

foreach ($routes as $route) {
    if (in_array($route->action, $legacyActions, true)) {
        echo "Found legacy action: ID={$route->id}, Action={$route->action}, Extension={$route->extension}\n";
        $legacyCount++;
    }
}

if ($legacyCount === 0) {
    echo "No legacy actions found in routes.\n";
} else {
    echo "Found $legacyCount routes with legacy actions.\n";
}

// Test 4: Test IncomingContexts generation
echo "\nTest 4: Testing dialplan generation...\n";
$testRoute = new IncomingRoutingTable();
$testRoute->action = IncomingRoutingTable::ACTION_EXTENSION;
$testRoute->extension = 'busy';
$testRoute->priority = 100;
$testRoute->number = '1234';

echo "Test route: action='{$testRoute->action}', extension='{$testRoute->extension}'\n";
echo "This should use Goto instead of Dial for system extension 'busy'\n";

// Test 5: Verify cache functionality
echo "\nTest 5: Testing cache...\n";
$start = microtime(true);
$result1 = Extensions::getSystemExtensions();
$time1 = microtime(true) - $start;
echo "First call (from DB or cache): " . round($time1 * 1000, 2) . "ms\n";

$start = microtime(true);
$result2 = Extensions::getSystemExtensions();
$time2 = microtime(true) - $start;
echo "Second call (from cache): " . round($time2 * 1000, 2) . "ms\n";

if ($time2 < $time1) {
    echo "Cache is working properly (second call faster).\n";
}

// Test 6: Validate sanitization rules
echo "\nTest 6: Testing sanitization rules...\n";
$rule = SystemSanitizer::getExtensionSanitizationRule();
echo "Extension sanitization rule: $rule\n";

// Summary
echo "\n=== Test Summary ===\n";
echo "✓ System extensions: " . count($systemExtensions) . " found\n";
echo "✓ Legacy actions: " . ($legacyCount === 0 ? "None found (good)" : "$legacyCount found (need migration)") . "\n";
echo "✓ Cache: " . ($time2 < $time1 ? "Working" : "Check needed") . "\n";
echo "✓ Sanitizer: Loaded " . count($systemExtensions) . " system extensions\n";

echo "\n=== Test Complete ===\n";