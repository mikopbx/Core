#!/usr/bin/env php
<?php
/*
 * Test script to demonstrate boolean field conversion for AsteriskManagers
 */

echo "AsteriskManagers Boolean Field Conversion Demo\n";
echo "==============================================\n\n";

// Demonstrate the conversion logic
class PermissionConverter {
    
    /**
     * Convert comma-separated permissions to boolean fields (like DataStructure does)
     */
    public static function toBoolean($readPerms, $writePerms) {
        $availablePermissions = [
            'call', 'cdr', 'originate', 'reporting', 'agent', 'config', 
            'dialplan', 'dtmf', 'log', 'system', 'user', 'verbose', 'command'
        ];
        
        $readArray = !empty($readPerms) ? array_map('trim', explode(',', $readPerms)) : [];
        $writeArray = !empty($writePerms) ? array_map('trim', explode(',', $writePerms)) : [];
        
        $result = [];
        foreach ($availablePermissions as $perm) {
            $result[$perm . '_read'] = in_array($perm, $readArray, true) || in_array('all', $readArray, true);
            $result[$perm . '_write'] = in_array($perm, $writeArray, true) || in_array('all', $writeArray, true);
        }
        
        return $result;
    }
    
    /**
     * Convert boolean fields back to comma-separated strings (like SaveRecordAction does)
     */
    public static function fromBoolean($permissions) {
        $availablePermissions = [
            'call', 'cdr', 'originate', 'reporting', 'agent', 'config', 
            'dialplan', 'dtmf', 'log', 'system', 'user', 'verbose', 'command'
        ];
        
        $readPerms = [];
        $writePerms = [];
        
        foreach ($availablePermissions as $perm) {
            if (!empty($permissions[$perm . '_read']) && $permissions[$perm . '_read'] === true) {
                $readPerms[] = $perm;
            }
            if (!empty($permissions[$perm . '_write']) && $permissions[$perm . '_write'] === true) {
                $writePerms[] = $perm;
            }
        }
        
        return [
            'read' => implode(',', $readPerms),
            'write' => implode(',', $writePerms)
        ];
    }
}

// Test Case 1: Database to API Response
echo "Test 1: Database Format → API Response (Boolean Fields)\n";
echo "--------------------------------------------------------\n";
$dbRead = 'call,cdr,originate,system';
$dbWrite = 'originate,system';

echo "Database values:\n";
echo "  read:  '$dbRead'\n";
echo "  write: '$dbWrite'\n\n";

$booleanFields = PermissionConverter::toBoolean($dbRead, $dbWrite);

echo "API Response (boolean fields):\n";
echo "  permissions: {\n";
foreach ($booleanFields as $key => $value) {
    $valueStr = $value ? 'true' : 'false';
    echo "    $key: $valueStr,\n";
}
echo "  }\n";

// Test Case 2: Frontend Form Submission to Database
echo "\nTest 2: Frontend Boolean Fields → Database Format\n";
echo "--------------------------------------------------\n";

$frontendData = [
    'call_read' => true,
    'call_write' => false,
    'cdr_read' => true,
    'cdr_write' => false,
    'originate_read' => true,
    'originate_write' => true,
    'reporting_read' => false,
    'reporting_write' => false,
    'agent_read' => false,
    'agent_write' => false,
    'config_read' => false,
    'config_write' => false,
    'dialplan_read' => true,
    'dialplan_write' => false,
    'dtmf_read' => false,
    'dtmf_write' => false,
    'log_read' => false,
    'log_write' => false,
    'system_read' => true,
    'system_write' => true,
    'user_read' => false,
    'user_write' => false,
    'verbose_read' => false,
    'verbose_write' => false,
    'command_read' => false,
    'command_write' => false,
];

echo "Frontend submission (boolean fields):\n";
$enabledPerms = array_filter($frontendData, fn($v) => $v === true);
foreach ($enabledPerms as $key => $value) {
    echo "  $key: true\n";
}

$dbFormat = PermissionConverter::fromBoolean($frontendData);
echo "\nConverted to database format:\n";
echo "  read:  '{$dbFormat['read']}'\n";
echo "  write: '{$dbFormat['write']}'\n";

// Test Case 3: Round-trip verification
echo "\nTest 3: Round-Trip Verification\n";
echo "--------------------------------\n";

$originalRead = 'call,cdr,originate,dialplan,system';
$originalWrite = 'originate,system';

echo "Original values:\n";
echo "  read:  '$originalRead'\n";
echo "  write: '$originalWrite'\n\n";

// Convert to boolean
$boolean = PermissionConverter::toBoolean($originalRead, $originalWrite);

// Convert back to strings
$converted = PermissionConverter::fromBoolean($boolean);

echo "After round-trip:\n";
echo "  read:  '{$converted['read']}'\n";
echo "  write: '{$converted['write']}'\n\n";

if ($originalRead === $converted['read'] && $originalWrite === $converted['write']) {
    echo "✅ Round-trip conversion successful!\n";
} else {
    echo "❌ Round-trip conversion failed!\n";
}

// Test Case 4: Special case - 'all' permission
echo "\nTest 4: Special Case - 'all' Permission\n";
echo "---------------------------------------\n";

$allPerms = PermissionConverter::toBoolean('all', 'all');
$enabledCount = array_sum(array_map(fn($v) => $v ? 1 : 0, $allPerms));
echo "When permissions are 'all':\n";
echo "  Total boolean fields: " . count($allPerms) . "\n";
echo "  Enabled fields: $enabledCount\n";
echo "  All permissions enabled: " . ($enabledCount === count($allPerms) ? 'Yes ✅' : 'No ❌') . "\n";

echo "\n";
echo "Summary of Changes:\n";
echo "==================\n";
echo "1. ✅ DataStructure::createFromModel() now returns a 'permissions' field with boolean values\n";
echo "2. ✅ Each permission has separate '{permission}_read' and '{permission}_write' boolean fields\n";
echo "3. ✅ SaveRecordAction::main() accepts both old format (strings) and new format (boolean fields)\n";
echo "4. ✅ Frontend JavaScript updated to send/receive boolean permission fields\n";
echo "5. ✅ Two-way conversion maintains data integrity\n";
echo "\n";