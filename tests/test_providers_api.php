#!/usr/bin/env php
<?php
/*
 * Test script for Providers REST API v2
 */

require_once 'Globals.php';

use MikoPBX\PBXCoreREST\Lib\ProvidersManagementProcessor;

echo "\n=== Testing Providers REST API v2 ===\n\n";

// Test 1: GetList
echo "Test 1: GetList action\n";
$request = [
    'action' => 'getList',
    'data' => ['includeDisabled' => 'true']
];
$result = ProvidersManagementProcessor::callBack($request);
echo "Result: " . ($result->success ? "SUCCESS" : "FAILED") . "\n";
if (!$result->success) {
    echo "Error: " . json_encode($result->messages) . "\n";
} else {
    echo "Found " . count($result->data) . " providers\n";
    foreach ($result->data as $provider) {
        echo "  - {$provider['type']}: {$provider['name']} (disabled: " . ($provider['disabled'] ? 'yes' : 'no') . ")\n";
    }
}
echo "\n";

// Test 2: GetRecord for new SIP provider
echo "Test 2: GetRecord for new SIP provider\n";
$request = [
    'action' => 'getRecord',
    'data' => [
        'id' => 'new',
        'type' => 'SIP'
    ]
];
$result = ProvidersManagementProcessor::callBack($request);
echo "Result: " . ($result->success ? "SUCCESS" : "FAILED") . "\n";
if (!$result->success) {
    echo "Error: " . json_encode($result->messages) . "\n";
} else {
    echo "New SIP provider structure created:\n";
    echo "  - uniqid: {$result->data['uniqid']}\n";
    echo "  - type: {$result->data['type']}\n";
    echo "  - default port: {$result->data['port']}\n";
    echo "  - default transport: {$result->data['transport']}\n";
}
echo "\n";

// Test 3: GetRecord for new IAX provider
echo "Test 3: GetRecord for new IAX provider\n";
$request = [
    'action' => 'getRecord',
    'data' => [
        'id' => 'new',
        'type' => 'IAX'
    ]
];
$result = ProvidersManagementProcessor::callBack($request);
echo "Result: " . ($result->success ? "SUCCESS" : "FAILED") . "\n";
if (!$result->success) {
    echo "Error: " . json_encode($result->messages) . "\n";
} else {
    echo "New IAX provider structure created:\n";
    echo "  - uniqid: {$result->data['uniqid']}\n";
    echo "  - type: {$result->data['type']}\n";
    echo "  - qualify: " . ($result->data['qualify'] ? 'enabled' : 'disabled') . "\n";
}
echo "\n";

// Test 4: GetRecord for existing provider (if any exist)
echo "Test 4: GetRecord for existing provider\n";
$listRequest = [
    'action' => 'getList',
    'data' => []
];
$listResult = ProvidersManagementProcessor::callBack($listRequest);
if ($listResult->success && count($listResult->data) > 0) {
    $firstProvider = $listResult->data[0];
    $request = [
        'action' => 'getRecord',
        'data' => [
            'id' => $firstProvider['id']
        ]
    ];
    $result = ProvidersManagementProcessor::callBack($request);
    echo "Result: " . ($result->success ? "SUCCESS" : "FAILED") . "\n";
    if (!$result->success) {
        echo "Error: " . json_encode($result->messages) . "\n";
    } else {
        echo "Provider details:\n";
        echo "  - ID: {$result->data['id']}\n";
        echo "  - Type: {$result->data['type']}\n";
        echo "  - Note: {$result->data['note']}\n";
        if ($result->data['type'] === 'SIP') {
            echo "  - Host: {$result->data['host']}\n";
            echo "  - Username: {$result->data['username']}\n";
            echo "  - Port: {$result->data['port']}\n";
            echo "  - Transport: {$result->data['transport']}\n";
        } else {
            echo "  - Host: {$result->data['host']}\n";
            echo "  - Username: {$result->data['username']}\n";
        }
    }
} else {
    echo "No existing providers found to test\n";
}
echo "\n";

// Test 5: SaveRecord - Create test provider
echo "Test 5: SaveRecord - Create test SIP provider\n";
$testData = [
    'type' => 'SIP',
    'note' => 'Test Provider API v2',
    'disabled' => false,
    'username' => 'testuser',
    'secret' => 'testpass123',
    'host' => 'test.provider.com',
    'port' => 5060,
    'transport' => 'UDP',
    'qualify' => true,
    'qualifyfreq' => 60,
    'registration_type' => 'outbound',
    'description' => 'Test Provider Description',
    'extension' => ''
];

$request = [
    'action' => 'saveRecord',
    'data' => $testData
];
$result = ProvidersManagementProcessor::callBack($request);
echo "Result: " . ($result->success ? "SUCCESS" : "FAILED") . "\n";
if (!$result->success) {
    echo "Error: " . json_encode($result->messages) . "\n";
    $testProviderId = null;
} else {
    $testProviderId = $result->data['id'];
    echo "Test provider created:\n";
    echo "  - ID: {$result->data['id']}\n";
    echo "  - UniqID: {$result->data['uniqid']}\n";
    echo "  - Type: {$result->data['type']}\n";
    echo "  - Host: {$result->data['host']}\n";
}
echo "\n";

// Test 6: Update provider
if ($testProviderId) {
    echo "Test 6: SaveRecord - Update test provider\n";
    $updateData = array_merge($testData, [
        'id' => $testProviderId,
        'note' => 'Updated Test Provider',
        'host' => 'updated.provider.com',
        'port' => 5061
    ]);
    
    $request = [
        'action' => 'saveRecord',
        'data' => $updateData
    ];
    $result = ProvidersManagementProcessor::callBack($request);
    echo "Result: " . ($result->success ? "SUCCESS" : "FAILED") . "\n";
    if (!$result->success) {
        echo "Error: " . json_encode($result->messages) . "\n";
    } else {
        echo "Provider updated:\n";
        echo "  - Note: {$result->data['note']}\n";
        echo "  - Host: {$result->data['host']}\n";
        echo "  - Port: {$result->data['port']}\n";
    }
    echo "\n";
}

// Test 7: Delete provider
if ($testProviderId) {
    echo "Test 7: DeleteRecord - Delete test provider\n";
    $request = [
        'action' => 'deleteRecord',
        'data' => [
            'id' => $testProviderId
        ]
    ];
    $result = ProvidersManagementProcessor::callBack($request);
    echo "Result: " . ($result->success ? "SUCCESS" : "FAILED") . "\n";
    if (!$result->success) {
        echo "Error: " . json_encode($result->messages) . "\n";
    } else {
        echo "Provider deleted successfully\n";
        echo "Messages: " . json_encode($result->messages) . "\n";
    }
    echo "\n";
}

// Test 8: Get provider statuses
echo "Test 8: GetStatuses action\n";
$request = [
    'action' => 'getStatuses',
    'data' => []
];
$result = ProvidersManagementProcessor::callBack($request);
echo "Result: " . ($result->success ? "SUCCESS" : "FAILED") . "\n";
if (!$result->success) {
    echo "Error: " . json_encode($result->messages) . "\n";
} else {
    echo "Provider statuses retrieved\n";
    if (!empty($result->data)) {
        foreach ($result->data as $uniqid => $status) {
            echo "  - $uniqid: " . json_encode($status) . "\n";
        }
    }
}

echo "\n=== All tests completed ===\n";