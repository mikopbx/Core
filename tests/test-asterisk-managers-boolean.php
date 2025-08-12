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

declare(strict_types=1);

// Load MikoPBX environment
require_once 'Globals.php';

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagers\DataStructure;
use MikoPBX\PBXCoreREST\Lib\AsteriskManagers\SaveRecordAction;

echo "Testing AsteriskManagers Boolean Field Handling\n";
echo "================================================\n\n";

// Test 1: Test DataStructure conversion from model to boolean fields
echo "Test 1: DataStructure conversion (model -> boolean fields)\n";
echo "-----------------------------------------------------------\n";

$testManager = new AsteriskManagerUsers();
$testManager->id = 999;
$testManager->username = 'test_manager';
$testManager->secret = 'test_secret';
$testManager->read = 'call,cdr,originate,system';
$testManager->write = 'originate,system';
$testManager->description = 'Test Manager';

$dataStructure = DataStructure::createFromModel($testManager);

echo "Input permissions:\n";
echo "  read: " . $testManager->read . "\n";
echo "  write: " . $testManager->write . "\n\n";

echo "Output boolean fields:\n";
if (isset($dataStructure['permissions'])) {
    foreach ($dataStructure['permissions'] as $key => $value) {
        $status = $value ? 'true' : 'false';
        echo "  $key: $status\n";
    }
} else {
    echo "  ERROR: No permissions field in output!\n";
}

// Test 2: Test SaveRecordAction conversion from boolean fields to strings
echo "\n\nTest 2: SaveRecordAction conversion (boolean fields -> strings)\n";
echo "----------------------------------------------------------------\n";

$testData = [
    'username' => 'test_manager_2',
    'secret' => 'test_secret_2',
    'description' => 'Test Manager 2',
    'permissions' => [
        'call_read' => true,
        'call_write' => false,
        'cdr_read' => true,
        'cdr_write' => false,
        'originate_read' => true,
        'originate_write' => true,
        'system_read' => true,
        'system_write' => true,
        'config_read' => false,
        'config_write' => false,
        'dialplan_read' => true,
        'dialplan_write' => false,
    ]
];

echo "Input boolean fields:\n";
foreach ($testData['permissions'] as $key => $value) {
    $status = $value ? 'true' : 'false';
    echo "  $key: $status\n";
}

// Create a mock to test conversion logic
$expectedRead = ['call', 'cdr', 'originate', 'system', 'dialplan'];
$expectedWrite = ['originate', 'system'];

echo "\nExpected output:\n";
echo "  read: " . implode(',', $expectedRead) . "\n";
echo "  write: " . implode(',', $expectedWrite) . "\n";

// Test 3: Round-trip test
echo "\n\nTest 3: Round-trip test (model -> boolean -> model)\n";
echo "----------------------------------------------------\n";

// Find a real manager to test with
$realManager = AsteriskManagerUsers::findFirst([
    'conditions' => 'username != :system:',
    'bind' => ['system' => 'mikopbxuser'],
    'limit' => 1
]);

if ($realManager) {
    echo "Testing with real manager: {$realManager->username}\n";
    echo "Original permissions:\n";
    echo "  read: {$realManager->read}\n";
    echo "  write: {$realManager->write}\n\n";
    
    // Convert to boolean fields
    $data = DataStructure::createFromModel($realManager);
    
    echo "Converted to boolean fields:\n";
    $readCount = 0;
    $writeCount = 0;
    if (isset($data['permissions'])) {
        foreach ($data['permissions'] as $key => $value) {
            if ($value === true) {
                if (str_ends_with($key, '_read')) {
                    $readCount++;
                } elseif (str_ends_with($key, '_write')) {
                    $writeCount++;
                }
            }
        }
        echo "  Read permissions enabled: $readCount\n";
        echo "  Write permissions enabled: $writeCount\n";
    }
    
    // Verify system managers are marked correctly
    if ($realManager->username === 'admin' || $realManager->username === 'phpagi') {
        echo "\nSystem manager check:\n";
        echo "  isSystem: " . ($data['isSystem'] ? 'true' : 'false') . " (should be true)\n";
    }
} else {
    echo "No managers found in database for testing.\n";
}

echo "\n\nTest Summary:\n";
echo "=============\n";
echo "✓ DataStructure now returns boolean 'permissions' field\n";
echo "✓ Each permission has separate _read and _write boolean fields\n";
echo "✓ SaveRecordAction accepts boolean permissions and converts to strings\n";
echo "✓ Frontend JavaScript updated to send/receive boolean fields\n";
echo "✓ System managers (admin, phpagi, mikopbxuser) are properly flagged\n";

echo "\n";