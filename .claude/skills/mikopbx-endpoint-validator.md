# mikopbx-endpoint-validator

Validate MikoPBX REST API endpoints for OpenAPI schema compliance, parameter consistency, and documentation accuracy.

## When to Use This Skill

Use this skill when:
- Implementing new API endpoints
- Modifying existing endpoints
- Reviewing API code changes
- Before merging API-related pull requests
- User asks "validate my API changes"
- User asks "check if my endpoint is correct"
- After making changes to DataStructure.php files

## What This Skill Does

1. **Validates OpenAPI Schema Compliance**
   - Checks that SaveRecordAction matches DataStructure definitions
   - Verifies request/response schemas are complete
   - Ensures all parameters are documented

2. **Checks Parameter Consistency**
   - Compares DataStructure with SaveRecordAction implementation
   - Verifies validation rules are applied correctly
   - Ensures defaults are handled properly (not applied on PATCH)

3. **Tests Schema Validation Mode**
   - Verifies SCHEMA_VALIDATION_STRICT=1 works correctly
   - Tests that responses match OpenAPI schemas
   - Checks for schema violations

4. **Generates Compliance Report**
   - Lists all issues found
   - Provides severity levels (Critical, Warning, Info)
   - Suggests fixes for common problems

## Usage Instructions

When user asks to validate an API endpoint, follow these steps:

### Step 1: Identify the Endpoint
Ask the user for:
- The API resource name (e.g., Extensions, Providers, IncomingRoutes)
- Or the path to DataStructure.php or SaveRecordAction.php

### Step 2: Locate Required Files
Find these three critical files:

```bash
# Example for Extensions
RESOURCE="Extensions"

# DataStructure.php - Single source of truth
find src/PBXCoreREST/Lib -name "DataStructure.php" | grep -i "$RESOURCE"

# SaveRecordAction.php - Implementation
find src/PBXCoreREST/Lib -name "SaveRecordAction.php" | grep -i "$RESOURCE"

# GetRecordAction.php - Read endpoint
find src/PBXCoreREST/Lib -name "GetRecordAction.php" | grep -i "$RESOURCE"
```

### Step 3: Analyze DataStructure.php

Check that DataStructure.php has proper structure:

```php
class DataStructure
{
    /**
     * Get parameter definitions for OpenAPI documentation
     */
    public static function getParameterDefinitions(): array
    {
        return [
            // REQUEST section - what endpoint accepts
            'request' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'Unique identifier',
                    'required' => false,  // Usually false for POST, required for PUT
                    'example' => 'some-unique-id',
                ],
                'name' => [
                    'type' => 'string',
                    'description' => 'Resource name',
                    'required' => true,
                    'maxLength' => 255,
                    'example' => 'Example Name',
                ],
                'number' => [
                    'type' => 'integer',
                    'description' => 'Extension number',
                    'required' => true,
                    'minimum' => 100,
                    'maximum' => 99999,
                    'example' => 201,
                ],
                'status' => [
                    'type' => 'string',
                    'description' => 'Status flag',
                    'required' => false,
                    'enum' => ['active', 'inactive'],
                    'default' => 'active',
                    'example' => 'active',
                ],
            ],

            // RESPONSE section - what endpoint returns
            'response' => [
                'id' => [
                    'type' => 'string',
                    'description' => 'Unique identifier',
                    'example' => 'some-unique-id',
                ],
                'name' => [
                    'type' => 'string',
                    'description' => 'Resource name',
                    'example' => 'Example Name',
                ],
                'number' => [
                    'type' => 'integer',
                    'description' => 'Extension number',
                    'example' => 201,
                ],
                'status' => [
                    'type' => 'string',
                    'description' => 'Status flag',
                    'example' => 'active',
                ],
                'created_at' => [
                    'type' => 'string',
                    'format' => 'date-time',
                    'description' => 'Creation timestamp',
                    'example' => '2024-01-15T10:30:00Z',
                ],
            ],
        ];
    }

    /**
     * Get list of related schemas for this resource
     */
    public static function getRelatedSchemas(): array
    {
        return ['Employee', 'Sip'];  // Other resources this relates to
    }

    /**
     * Legacy method - should be removed
     * @deprecated Use getParameterDefinitions() instead
     */
    public static function getParametersConfig(): array
    {
        // This should NOT exist in new code
    }
}
```

### Step 4: Validate DataStructure Completeness

Check for these requirements:

#### ✅ Must Have:
- [ ] `getParameterDefinitions()` method exists
- [ ] `request` section with all input parameters
- [ ] `response` section with all output parameters
- [ ] `type` for every parameter
- [ ] `description` for every parameter
- [ ] `example` for every parameter
- [ ] `required` flag for request parameters
- [ ] Validation constraints (min/max, pattern, enum) where applicable

#### ❌ Must NOT Have:
- [ ] `getParametersConfig()` method (legacy, deprecated)
- [ ] `ParameterSanitizationExtractor` usage (legacy)
- [ ] Hardcoded validation in SaveRecordAction
- [ ] Missing parameters that exist in model

### Step 5: Validate SaveRecordAction.php

Check that SaveRecordAction follows the 7-phase pattern:

```php
class SaveRecordAction extends BaseSaveAction
{
    private const string RESOURCE_NAME = 'Extensions';

    public function __invoke(ServerRequestInterface $request): ResponseInterface
    {
        // PHASE 1: Parameter Definition & Defaults
        $definitions = DataStructure::getParameterDefinitions();
        $requestDefs = $definitions['request'];

        // PHASE 2: Request Parsing (with method detection)
        $requestData = $this->parseRequest($request);
        $httpMethod = $request->getMethod(); // GET, POST, PUT, PATCH, DELETE

        // PHASE 3: ID Validation (if present)
        $id = $requestData['id'] ?? null;
        if ($id !== null && !$this->isValidId($id)) {
            return $this->respondWithValidationError(['id' => 'Invalid ID format']);
        }

        // PHASE 4: Load existing record (for PUT/PATCH/DELETE)
        $existingRecord = null;
        if (in_array($httpMethod, ['PUT', 'PATCH', 'DELETE']) && $id) {
            $existingRecord = $this->findRecordById($id);
            if (!$existingRecord) {
                return $this->respondNotFound();
            }
        }

        // PHASE 5: Parameter Sanitization & Defaults
        // WHY: Defaults should ONLY be applied on POST, not on PATCH
        // WHY: PATCH is for partial updates, missing fields should remain unchanged
        $sanitized = [];
        foreach ($requestDefs as $param => $def) {
            if (isset($requestData[$param])) {
                // Value provided, sanitize it
                $sanitized[$param] = $this->sanitizeValue(
                    $requestData[$param],
                    $def['type']
                );
            } elseif ($httpMethod === 'POST' && isset($def['default'])) {
                // Only apply default on POST (creating new record)
                $sanitized[$param] = $def['default'];
            }
            // For PATCH/PUT: if value not provided, don't touch existing value
        }

        // PHASE 6: Validation
        $errors = $this->validateParameters($sanitized, $requestDefs, $httpMethod);
        if (!empty($errors)) {
            return $this->respondWithValidationError($errors);
        }

        // PHASE 7: Business Logic & Persistence
        try {
            if ($httpMethod === 'POST') {
                $result = $this->createRecord($sanitized);
            } elseif (in_array($httpMethod, ['PUT', 'PATCH'])) {
                $result = $this->updateRecord($existingRecord, $sanitized);
            } elseif ($httpMethod === 'DELETE') {
                $this->deleteRecord($existingRecord);
                return $this->respondSuccess(['deleted' => true]);
            }

            return $this->respondSuccess($result);
        } catch (\Exception $e) {
            return $this->respondWithError($e->getMessage(), 500);
        }
    }

    /**
     * Validate parameters against definitions
     * WHY: Centralized validation based on DataStructure rules
     */
    private function validateParameters(
        array $data,
        array $definitions,
        string $httpMethod
    ): array {
        $errors = [];

        foreach ($definitions as $param => $def) {
            // Check required fields
            // WHY: Required validation only applies to POST and PUT
            // WHY: PATCH allows partial updates, so required check is skipped
            if (in_array($httpMethod, ['POST', 'PUT'])) {
                if (($def['required'] ?? false) && !isset($data[$param])) {
                    $errors[$param] = "Field '$param' is required";
                    continue;
                }
            }

            // Skip further validation if value not provided (for PATCH)
            if (!isset($data[$param])) {
                continue;
            }

            $value = $data[$param];

            // Type validation
            if (!$this->validateType($value, $def['type'])) {
                $errors[$param] = "Invalid type for '$param', expected {$def['type']}";
                continue;
            }

            // Min/Max validation
            if (isset($def['minimum']) && $value < $def['minimum']) {
                $errors[$param] = "Value for '$param' must be >= {$def['minimum']}";
            }
            if (isset($def['maximum']) && $value > $def['maximum']) {
                $errors[$param] = "Value for '$param' must be <= {$def['maximum']}";
            }

            // Length validation
            if (isset($def['maxLength']) && strlen($value) > $def['maxLength']) {
                $errors[$param] = "Length of '$param' exceeds maximum {$def['maxLength']}";
            }

            // Enum validation
            if (isset($def['enum']) && !in_array($value, $def['enum'], true)) {
                $allowed = implode(', ', $def['enum']);
                $errors[$param] = "Value for '$param' must be one of: $allowed";
            }

            // Pattern validation
            if (isset($def['pattern']) && !preg_match($def['pattern'], $value)) {
                $errors[$param] = "Value for '$param' does not match required pattern";
            }
        }

        return $errors;
    }
}
```

### Step 6: Check for Common Anti-Patterns

Scan the code for these problems:

#### ❌ WRONG: Defaults applied on PATCH
```php
// BAD: Applies defaults on PATCH, overwrites existing values
foreach ($definitions as $param => $def) {
    $value = $requestData[$param] ?? $def['default'] ?? null;
}
```

#### ✅ CORRECT: Defaults only on POST
```php
// GOOD: Defaults only on POST
if ($httpMethod === 'POST' && !isset($requestData[$param]) && isset($def['default'])) {
    $sanitized[$param] = $def['default'];
}
```

#### ❌ WRONG: Hardcoded validation
```php
// BAD: Validation rules not in DataStructure
if (strlen($name) > 255) {
    return $this->respondWithValidationError(['name' => 'Too long']);
}
```

#### ✅ CORRECT: Validation from DataStructure
```php
// GOOD: Uses maxLength from DataStructure
if (isset($def['maxLength']) && strlen($value) > $def['maxLength']) {
    $errors[$param] = "Length exceeds maximum {$def['maxLength']}";
}
```

#### ❌ WRONG: Using ParameterSanitizationExtractor
```php
// BAD: Legacy approach
use ParameterSanitizationExtractor;
$sanitized = ParameterSanitizationExtractor::sanitize($data);
```

#### ✅ CORRECT: Direct sanitization from definitions
```php
// GOOD: Modern approach using DataStructure
$definitions = DataStructure::getParameterDefinitions();
$sanitized = $this->sanitizeFromDefinitions($data, $definitions['request']);
```

### Step 7: Test Schema Validation

Run actual API tests with schema validation enabled:

```bash
# Ensure schema validation is enabled
CONTAINER_ID=$(docker ps --filter "ancestor=mikopbx/mikopbx" --format "{{.ID}}" | head -1)
docker exec $CONTAINER_ID env | grep SCHEMA_VALIDATION_STRICT=1

# If not enabled, warn the user
if [ $? -ne 0 ]; then
    echo "⚠️  Schema validation is not enabled"
    echo "Add to docker-compose.yml: SCHEMA_VALIDATION_STRICT=1"
fi

# Test the endpoint
curl -X POST "https://mikopbx_php83.localhost:8445/pbxcore/api/v3/extensions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "number": 201,
    "name": "Test Extension"
  }' \
  -k -v

# Check response headers for schema validation
# Should see: X-Schema-Validation: passed
```

### Step 8: Generate Compliance Report

Create a detailed report:

```
📋 API Endpoint Validation Report
==================================

🎯 Endpoint: /pbxcore/api/v3/extensions
📁 Resource: Extensions

📂 Files Analyzed:
   ✅ DataStructure.php: src/PBXCoreREST/Lib/Extensions/DataStructure.php
   ✅ SaveRecordAction.php: src/PBXCoreREST/Lib/Extensions/SaveRecordAction.php
   ✅ GetRecordAction.php: src/PBXCoreREST/Lib/Extensions/GetRecordAction.php

---

## 🔍 DataStructure Analysis

### ✅ Structure Compliance
   ✅ Has getParameterDefinitions() method
   ✅ Has 'request' section with 15 parameters
   ✅ Has 'response' section with 18 parameters
   ✅ Has getRelatedSchemas() method
   ❌ Still has legacy getParametersConfig() method (should be removed)

### ✅ Request Parameters (15 total)
   ✅ All have 'type' defined
   ✅ All have 'description' defined
   ✅ All have 'example' defined
   ✅ All have 'required' flag defined
   ⚠️  3 parameters missing validation constraints:
      - 'user_username': should have 'pattern' for username format
      - 'email': should have 'format' => 'email'
      - 'mobile_number': should have 'pattern' for phone format

### ✅ Response Parameters (18 total)
   ✅ All have 'type' defined
   ✅ All have 'description' defined
   ✅ All have 'example' defined
   ⚠️  Missing timestamp fields: created_at, updated_at

### 📊 Validation Constraints Coverage
   ✅ Enum constraints: 3 parameters
   ✅ Min/Max constraints: 5 parameters
   ✅ Pattern constraints: 4 parameters
   ✅ Length constraints: 8 parameters
   ⚠️  Consider adding constraints to: user_username, email, mobile_number

---

## 🔍 SaveRecordAction Analysis

### ✅ Structure Compliance
   ✅ Follows 7-phase processing pattern
   ✅ Uses DataStructure::getParameterDefinitions()
   ✅ Detects HTTP method (POST/PUT/PATCH/DELETE)
   ✅ Loads existing record for PUT/PATCH/DELETE
   ❌ CRITICAL: Applies defaults on PATCH (line 87)

### ❌ CRITICAL ISSUES

1. **Defaults Applied on PATCH (Line 87)**
   ```php
   // WRONG: This applies defaults on PATCH
   $value = $requestData[$param] ?? $def['default'] ?? null;
   ```

   **Impact**: Partial updates (PATCH) will overwrite existing values with defaults

   **Fix**:
   ```php
   // Correct approach
   if ($httpMethod === 'POST' && !isset($requestData[$param]) && isset($def['default'])) {
       $sanitized[$param] = $def['default'];
   }
   ```

2. **Missing Required Validation for PUT (Line 145)**
   Required fields are only checked on POST, but PUT should also validate required fields

   **Fix**: Change validation condition
   ```php
   if (in_array($httpMethod, ['POST', 'PUT']) && ($def['required'] ?? false) && !isset($data[$param])) {
       $errors[$param] = "Field '$param' is required";
   }
   ```

### ⚠️  WARNINGS

1. **Hardcoded validation for 'number' field (Line 203)**
   Validation rules should come from DataStructure, not hardcoded

2. **No sanitization for XSS in 'name' field**
   Consider adding HTML entity encoding

3. **No logging of validation failures**
   Consider logging validation errors for debugging

---

## 🔍 Schema Validation Test Results

### Test Environment
   ✅ SCHEMA_VALIDATION_STRICT=1 enabled
   ✅ Container running and services ready
   ✅ Authentication successful

### Test Results

#### POST /extensions (Create)
   ✅ Status: 200 OK
   ✅ Schema validation: PASSED
   ✅ Response matches DataStructure['response']
   ✅ All required fields present in response

#### PATCH /extensions/123 (Partial Update)
   ❌ Status: 200 OK
   ❌ Schema validation: PASSED
   ❌ **BUG DETECTED**: Default values were applied, overwriting existing data

   **Example**:
   - Sent: {"number": 202}
   - Expected: Only 'number' updated, other fields unchanged
   - Actual: 'status' changed from 'inactive' to 'active' (default applied)

#### PUT /extensions/123 (Full Update)
   ✅ Status: 200 OK
   ⚠️  Schema validation: PASSED (but should validate required fields)

#### DELETE /extensions/123
   ✅ Status: 200 OK
   ✅ Schema validation: PASSED

---

## 📊 Overall Compliance Score

**Total Score: 72/100** ⚠️  Needs Improvement

- DataStructure: 85/100 ✅ Good
- SaveRecordAction: 55/100 ❌ Critical Issues
- Schema Validation: 75/100 ⚠️  Warnings

---

## ✅ Recommendations (Priority Order)

### 🔴 CRITICAL (Must Fix)
1. **Fix PATCH default application bug**
   - File: SaveRecordAction.php:87
   - Impact: Data corruption on partial updates
   - Effort: 15 minutes

2. **Add required field validation for PUT**
   - File: SaveRecordAction.php:145
   - Impact: Invalid data can be saved
   - Effort: 10 minutes

### 🟡 HIGH PRIORITY (Should Fix)
3. **Remove legacy getParametersConfig() method**
   - File: DataStructure.php:198
   - Impact: Code consistency
   - Effort: 5 minutes

4. **Add missing validation constraints**
   - File: DataStructure.php
   - Parameters: user_username, email, mobile_number
   - Impact: Better input validation
   - Effort: 15 minutes

### 🟢 MEDIUM PRIORITY (Nice to Have)
5. **Add timestamp fields to response**
   - File: DataStructure.php response section
   - Fields: created_at, updated_at
   - Impact: Better API usability
   - Effort: 10 minutes

6. **Remove hardcoded validations**
   - File: SaveRecordAction.php:203
   - Impact: Maintainability
   - Effort: 10 minutes

---

## 🧪 Suggested Tests to Add

Add these pytest tests to improve coverage:

```python
def test_patch_does_not_apply_defaults():
    """
    CRITICAL TEST: Verify PATCH doesn't apply defaults

    This is a regression test for the bug found in validation
    """
    # Create extension with non-default status
    create_response = requests.post(
        f"{BASE_URL}/pbxcore/api/v3/extensions",
        json={"number": 201, "name": "Test", "status": "inactive"},
        headers=headers,
        verify=False
    )
    ext_id = create_response.json()["data"]["id"]

    # PATCH only the number
    patch_response = requests.patch(
        f"{BASE_URL}/pbxcore/api/v3/extensions/{ext_id}",
        json={"number": 202},
        headers=headers,
        verify=False
    )

    # Status should STILL be 'inactive', not reverted to default 'active'
    assert patch_response.json()["data"]["status"] == "inactive", \
        "PATCH incorrectly applied default value to existing field"
```

---

## 📝 Action Items

- [ ] Fix PATCH defaults bug in SaveRecordAction.php:87
- [ ] Add PUT required validation in SaveRecordAction.php:145
- [ ] Remove getParametersConfig() from DataStructure.php
- [ ] Add validation constraints for user_username, email, mobile_number
- [ ] Add timestamp fields to response schema
- [ ] Remove hardcoded validation from SaveRecordAction.php:203
- [ ] Add regression test for PATCH defaults bug
- [ ] Add test for PUT required field validation
- [ ] Run full test suite after fixes
- [ ] Update API documentation with new constraints

---

✅ Report generated: 2024-01-15 14:30:00
```

## Validation Checklist

Use this checklist for every endpoint validation:

### DataStructure.php
- [ ] Has `getParameterDefinitions()` method
- [ ] Has `request` section with all input parameters
- [ ] Has `response` section with all output parameters
- [ ] All parameters have `type`
- [ ] All parameters have `description`
- [ ] All parameters have `example`
- [ ] Request parameters have `required` flag
- [ ] Validation constraints defined (min/max, pattern, enum)
- [ ] No legacy `getParametersConfig()` method
- [ ] No `ParameterSanitizationExtractor` usage

### SaveRecordAction.php
- [ ] Follows 7-phase pattern
- [ ] Uses `DataStructure::getParameterDefinitions()`
- [ ] Detects HTTP method
- [ ] Loads existing record for PUT/PATCH/DELETE
- [ ] Defaults ONLY applied on POST
- [ ] Required validation on POST and PUT
- [ ] NO required validation on PATCH
- [ ] All validation from DataStructure, not hardcoded
- [ ] Proper error messages
- [ ] Comprehensive WHY comments

### Testing
- [ ] SCHEMA_VALIDATION_STRICT=1 enabled
- [ ] POST with valid data succeeds
- [ ] POST with missing required fails (400)
- [ ] POST with invalid type fails (400)
- [ ] PUT with valid data succeeds
- [ ] PUT with missing required fails (400)
- [ ] PATCH with partial data succeeds
- [ ] PATCH does NOT apply defaults
- [ ] PATCH does NOT validate required fields
- [ ] DELETE existing record succeeds
- [ ] DELETE non-existent fails (404)
- [ ] Schema validation passes for all methods

## Common Issues and Fixes

### Issue: Defaults Applied on PATCH
**Symptom**: Partial updates overwrite existing values with defaults

**Diagnosis**:
```php
// Look for this pattern
$value = $requestData[$param] ?? $def['default'] ?? null;
```

**Fix**:
```php
if ($httpMethod === 'POST' && !isset($requestData[$param]) && isset($def['default'])) {
    $sanitized[$param] = $def['default'];
}
```

### Issue: Required Validation on PATCH
**Symptom**: PATCH fails when required fields not provided

**Diagnosis**:
```php
// Look for this pattern (missing method check)
if ($def['required'] && !isset($data[$param])) {
    $errors[$param] = "Required";
}
```

**Fix**:
```php
if (in_array($httpMethod, ['POST', 'PUT']) && $def['required'] && !isset($data[$param])) {
    $errors[$param] = "Required";
}
```

### Issue: Hardcoded Validation
**Symptom**: Validation rules not in DataStructure

**Diagnosis**: Look for validation logic in SaveRecordAction

**Fix**: Move all validation rules to DataStructure getParameterDefinitions()

### Issue: Missing Validation Constraints
**Symptom**: Invalid data accepted by API

**Diagnosis**: Check DataStructure for missing constraints

**Fix**: Add appropriate constraints:
- `minimum`/`maximum` for numbers
- `minLength`/`maxLength` for strings
- `pattern` for format validation
- `enum` for fixed values
- `format` for special types (email, date, etc.)

## Integration with Other Skills

### Works with mikopbx-api-test-generator:
1. Validator finds issues
2. Test generator creates tests to verify fixes

### Works with mikopbx-docker-restart-tester:
1. Validator runs after code changes
2. Restart tester ensures changes are active
3. Validator re-runs to confirm fixes

## Pro Tips

1. **Always validate PATCH behavior** - Most bugs are in PATCH handling
2. **Check DataStructure first** - It's the single source of truth
3. **Look for legacy patterns** - getParametersConfig, ParameterSanitizationExtractor
4. **Test with schema validation on** - SCHEMA_VALIDATION_STRICT=1
5. **Read the WHY comments** - They explain critical design decisions
6. **Don't trust passing tests** - Check if tests actually cover edge cases

## Output Format

Always provide:
1. Detailed compliance report (see template above)
2. Specific line numbers for issues
3. Code snippets showing problems
4. Code snippets showing fixes
5. Severity levels (Critical/High/Medium/Low)
6. Estimated effort for each fix
7. Prioritized action items
8. Suggested tests to add
9. Overall compliance score

## Success Criteria

Consider validation successful when:
- ✅ DataStructure has complete parameter definitions
- ✅ No legacy patterns found
- ✅ SaveRecordAction follows 7-phase pattern
- ✅ Defaults only applied on POST
- ✅ Required validation only on POST/PUT
- ✅ All validation from DataStructure
- ✅ Schema validation tests pass
- ✅ PATCH doesn't apply defaults
- ✅ Compliance score >= 90/100
