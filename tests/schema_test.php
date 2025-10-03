<?php
/*
 * Simple test script to verify SchemaValidator and SchemaFormatter
 * Run: docker exec mikopbx_php83 php /offload/rootfs/usr/www/tests/schema_test.php
 */

require_once 'Globals.php';

use MikoPBX\PBXCoreREST\Lib\Common\SchemaValidator;
use MikoPBX\PBXCoreREST\Lib\Common\SchemaFormatter;
use MikoPBX\PBXCoreREST\Lib\CallQueues\DataStructure;

echo "=== OpenAPI Schema Integration Test ===\n\n";

// Test 1: Schema Validator
echo "Test 1: SchemaValidator\n";
echo "------------------------\n";

$testData = [
    'id' => 'QUEUE-ABCD1234',  // Correct format: QUEUE- + 8 alphanumeric characters
    'extension' => '2200555',
    'name' => 'Test Queue',
    'strategy' => 'ringall',
    'announce_position' => true,  // Correct type
    'periodic_announce_frequency' => 60,  // Correct type
    'members' => []
];

$schema = DataStructure::getDetailSchema();
$errors = SchemaValidator::validate($testData, $schema);

if (empty($errors)) {
    echo "✓ Valid data passed validation\n";
} else {
    echo "✗ Validation errors found:\n";
    foreach ($errors as $error) {
        echo "  - $error\n";
    }
}

// Test with invalid data
$invalidData = [
    'id' => 'QUEUE-ABCD1234',  // Valid ID format
    'extension' => '2200555',
    'name' => 'Test Queue',
    'strategy' => 'invalid_strategy',  // Invalid enum value
    'announce_position' => 'yes',  // Wrong type (should be boolean)
    'periodic_announce_frequency' => 'sixty',  // Wrong type (should be integer)
];

$errors = SchemaValidator::validate($invalidData, $schema);
echo "\nTesting invalid data:\n";
if (!empty($errors)) {
    echo "✓ Correctly detected " . count($errors) . " validation errors:\n";
    foreach ($errors as $error) {
        echo "  - $error\n";
    }
} else {
    echo "✗ Failed to detect validation errors\n";
}

// Test 2: Schema Formatter
echo "\n\nTest 2: SchemaFormatter\n";
echo "------------------------\n";

// Data with wrong types from database (strings instead of proper types)
$rawData = [
    'id' => 'QUEUE-ABCD1234',  // Valid ID format
    'extension' => '2200555',
    'name' => 'Test Queue',
    'strategy' => 'ringall',
    'announce_position' => '1',  // String '1' should become boolean true
    'announce_hold_time' => '0',  // String '0' should become boolean false
    'periodic_announce_frequency' => '60',  // String should become integer
    'timeout_to_redirect_to_extension' => '300',  // String should become integer
    'seconds_to_ring_each_member' => 25,  // Integer should become string '25'
    'seconds_for_wrapup' => 10,  // Integer should become string '10'
];

$formatted = SchemaFormatter::format($rawData, $schema);

echo "Testing type conversions:\n";
echo "  announce_position: '" . var_export($rawData['announce_position'], true) . "' → " . var_export($formatted['announce_position'], true);
echo " (" . gettype($formatted['announce_position']) . ")\n";

echo "  announce_hold_time: '" . var_export($rawData['announce_hold_time'], true) . "' → " . var_export($formatted['announce_hold_time'], true);
echo " (" . gettype($formatted['announce_hold_time']) . ")\n";

echo "  periodic_announce_frequency: '" . var_export($rawData['periodic_announce_frequency'], true) . "' → " . var_export($formatted['periodic_announce_frequency'], true);
echo " (" . gettype($formatted['periodic_announce_frequency']) . ")\n";

echo "  seconds_to_ring_each_member: " . var_export($rawData['seconds_to_ring_each_member'], true) . " → '" . var_export($formatted['seconds_to_ring_each_member'], true) . "'";
echo " (" . gettype($formatted['seconds_to_ring_each_member']) . ")\n";

// Verify types are correct
$typesCorrect = true;
$typesCorrect = $typesCorrect && is_bool($formatted['announce_position']) && $formatted['announce_position'] === true;
$typesCorrect = $typesCorrect && is_bool($formatted['announce_hold_time']) && $formatted['announce_hold_time'] === false;
$typesCorrect = $typesCorrect && is_int($formatted['periodic_announce_frequency']) && $formatted['periodic_announce_frequency'] === 60;
$typesCorrect = $typesCorrect && is_string($formatted['seconds_to_ring_each_member']) && $formatted['seconds_to_ring_each_member'] === '25';

if ($typesCorrect) {
    echo "\n✓ All type conversions are correct\n";
} else {
    echo "\n✗ Some type conversions failed\n";
}

// Test 3: Validate formatted data
echo "\n\nTest 3: Validate Formatted Data\n";
echo "--------------------------------\n";

$errors = SchemaValidator::validate($formatted, $schema);
if (empty($errors)) {
    echo "✓ Formatted data is valid against schema\n";
} else {
    echo "✗ Formatted data has validation errors:\n";
    foreach ($errors as $error) {
        echo "  - $error\n";
    }
}

// Test 4: createFromSchema
echo "\n\nTest 4: createFromSchema\n";
echo "----------------------------\n";

// Test creating default structure from schema
$defaultData = DataStructure::createFromSchema('detail');

echo "Testing default data structure generation from schema:\n";
echo "  strategy: '" . var_export($defaultData['strategy'], true) . "' (should be 'ringall' - first enum value)\n";
echo "  announce_position: " . var_export($defaultData['announce_position'], true) . " (should be boolean false)\n";
echo "  periodic_announce_frequency: " . var_export($defaultData['periodic_announce_frequency'], true) . " (should be integer 0)\n";
echo "  members: " . var_export($defaultData['members'], true) . " (should be empty array)\n";

// Verify types are correct
$typesCorrect = true;
$typesCorrect = $typesCorrect && is_string($defaultData['strategy']) && $defaultData['strategy'] === 'ringall';
$typesCorrect = $typesCorrect && is_bool($defaultData['announce_position']) && $defaultData['announce_position'] === false;
$typesCorrect = $typesCorrect && is_int($defaultData['periodic_announce_frequency']) && $defaultData['periodic_announce_frequency'] === 0;
$typesCorrect = $typesCorrect && is_array($defaultData['members']) && empty($defaultData['members']);

if ($typesCorrect) {
    echo "\n✓ All default values have correct types\n";
} else {
    echo "\n✗ Some default values have incorrect types\n";
}

// Test with overrides
$dataWithOverrides = DataStructure::createFromSchema('detail', [
    'id' => 'QUEUE-TEST1234',
    'extension' => '2000',
    'name' => 'Test Queue'
]);

echo "\nTesting schema with overrides:\n";
echo "  id: '" . $dataWithOverrides['id'] . "' (should be 'QUEUE-TEST1234')\n";
echo "  extension: '" . $dataWithOverrides['extension'] . "' (should be '2000')\n";
echo "  name: '" . $dataWithOverrides['name'] . "' (should be 'Test Queue')\n";
echo "  strategy: '" . $dataWithOverrides['strategy'] . "' (should still be default 'ringall')\n";

// Validate the override data against schema
$errors = SchemaValidator::validate($dataWithOverrides, $schema);
if (empty($errors)) {
    echo "\n✓ Override data is valid against schema\n";
} else {
    echo "\n✗ Override data has validation errors:\n";
    foreach ($errors as $error) {
        echo "  - $error\n";
    }
}

echo "\n=== All Tests Completed ===\n";