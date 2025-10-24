---
name: endpoint-validator
description: Валидация REST API эндпоинтов на соответствие OpenAPI схеме и консистентность параметров. Использовать при реализации эндпоинтов, ревью кода или перед слиянием изменений API.
allowed-tools: Bash, Read, Grep, Glob
---

# MikoPBX Endpoint Validating

Validate MikoPBX REST API endpoints for OpenAPI compliance, parameter consistency, and proper implementation.

## What This Skill Does

1. **Validates DataStructure.php** - Checks parameter definitions completeness
2. **Validates SaveRecordAction.php** - Ensures 7-phase pattern compliance
3. **Tests Schema Validation** - Verifies SCHEMA_VALIDATION_STRICT mode
4. **Generates Compliance Report** - Provides actionable recommendations

## When to Use

Use this skill when:
- Implementing new API endpoints
- Modifying existing endpoints
- Reviewing API code changes
- Before merging API-related pull requests
- User asks "validate my API changes"
- After making changes to DataStructure.php files

## Quick Start

### Step 1: Identify Files

```bash
# Find DataStructure and SaveRecordAction for a resource
RESOURCE="Extensions"  # Or: Providers, IncomingRoutes, etc.

find src/PBXCoreREST/Lib -name "DataStructure.php" | grep -i "$RESOURCE"
find src/PBXCoreREST/Lib -name "SaveRecordAction.php" | grep -i "$RESOURCE"
```

Expected locations:
- `src/PBXCoreREST/Lib/{Resource}/DataStructure.php`
- `src/PBXCoreREST/Lib/{Resource}/SaveRecordAction.php`

### Step 2: Validate DataStructure

Check for required structure:

```php
class DataStructure
{
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                'param_name' => [
                    'type' => 'string',           // Required
                    'description' => '...',        // Required
                    'example' => 'example_value',  // Required
                    'required' => true,            // Required
                    // Optional constraints:
                    'maxLength' => 255,
                    'pattern' => '^regex$',
                    'enum' => ['value1', 'value2'],
                    'default' => 'default_value',
                ],
            ],
            'response' => [
                // Similar structure for response fields
            ],
        ];
    }
}
```

**Quick Checks**:
- ✅ Has `getParameterDefinitions()` method
- ✅ Every parameter has: type, description, example, required
- ✅ Validation constraints present (min/max, pattern, enum)
- ❌ NO `getParametersConfig()` method (legacy)
- ❌ NO `ParameterSanitizationExtractor` usage

**See**: [Complete DataStructure Specification](reference/datastructure-spec.md)

### Step 3: Validate SaveRecordAction

Check for 7-phase pattern compliance:

```php
class SaveRecordAction extends BaseSaveAction
{
    public function __invoke(ServerRequestInterface $request): ResponseInterface
    {
        // PHASE 1: Load DataStructure definitions
        $definitions = DataStructure::getParameterDefinitions();

        // PHASE 2: Parse request & detect HTTP method
        $requestData = $this->parseRequest($request);
        $httpMethod = $request->getMethod();

        // PHASE 3: Validate ID if present
        $id = $requestData['id'] ?? null;

        // PHASE 4: Load existing record for PUT/PATCH/DELETE
        $existingRecord = null;
        if (in_array($httpMethod, ['PUT', 'PATCH', 'DELETE']) && $id) {
            $existingRecord = $this->findRecordById($id);
        }

        // PHASE 5: Sanitize & apply defaults (POST only!)
        $sanitized = [];
        foreach ($requestDefs as $param => $def) {
            if (isset($requestData[$param])) {
                $sanitized[$param] = $this->sanitizeValue(...);
            } elseif ($httpMethod === 'POST' && isset($def['default'])) {
                $sanitized[$param] = $def['default'];  // Only on POST!
            }
        }

        // PHASE 6: Validate parameters
        $errors = $this->validateParameters($sanitized, $requestDefs, $httpMethod);

        // PHASE 7: Business logic & persistence
        if ($httpMethod === 'POST') {
            return $this->respondSuccess($this->createRecord($sanitized), 201);
        }
        // ... PUT/PATCH/DELETE handling
    }
}
```

**Critical Checks**:
- ✅ Defaults applied ONLY on POST, never on PATCH
- ✅ Required validation on POST and PUT, but NOT on PATCH
- ✅ HTTP method detection present
- ✅ Comprehensive WHY comments
- ❌ NO defaults on PATCH (common bug!)

**See**: [Complete 7-Phase Pattern Guide](reference/saveaction-pattern.md)

## Top 5 Common Issues

### 1. 🔴 CRITICAL: Defaults Applied on PATCH

**Problem**:
```php
// ❌ WRONG - Applies defaults on PATCH too!
$value = $requestData[$param] ?? $def['default'] ?? null;
```

**Why Bad**: PATCH is for partial updates. Defaults overwrite existing values.

**Fix**:
```php
// ✅ CORRECT - Only on POST
if ($httpMethod === 'POST' && !isset($requestData[$param]) && isset($def['default'])) {
    $sanitized[$param] = $def['default'];
}
```

**See**: [All Anti-Patterns](examples/anti-patterns.md#defaults-applied-on-patch)

### 2. 🔴 CRITICAL: Required Validation on PATCH

**Problem**:
```php
// ❌ WRONG - Validates required on all methods
if ($def['required'] && !isset($data[$param])) {
    $errors[] = "Required";
}
```

**Why Bad**: PATCH allows partial updates. User should update one field without sending all.

**Fix**:
```php
// ✅ CORRECT - Skip required check for PATCH
if (in_array($httpMethod, ['POST', 'PUT']) && $def['required'] && !isset($data[$param])) {
    $errors[] = "Required";
}
```

### 3. 🟡 HIGH: Hardcoded Validation

**Problem**: Validation rules in SaveRecordAction instead of DataStructure.

**Fix**: Move all validation constraints to DataStructure:
```php
// In DataStructure.php
'number' => [
    'type' => 'string',
    'pattern' => '^\d{2,8}$',  // Define here
    'maxLength' => 8,
]

// SaveRecordAction uses these constraints automatically
```

### 4. 🟡 HIGH: Legacy Methods

**Problems**:
- Using `getParametersConfig()` instead of `getParameterDefinitions()`
- Using `ParameterSanitizationExtractor` class

**Fix**: Remove legacy code, use modern approach.

### 5. 🟢 MEDIUM: Missing Validation Constraints

**Problem**: Parameters missing min/max, pattern, enum constraints.

**Fix**: Add constraints to DataStructure:
```php
'email' => [
    'type' => 'string',
    'format' => 'email',        // Add format
    'maxLength' => 255,         // Add length limit
]
```

## Validation Workflow

### 1. Quick Visual Inspection

Read through files looking for:
- DataStructure has `getParameterDefinitions()` ✅
- SaveRecordAction has method detection (`$httpMethod`) ✅
- Defaults only in POST conditional ✅
- Required validation skips PATCH ✅
- WHY comments present ✅

### 2. Test with CURL

```bash
CONTAINER_ID=$(docker ps --filter "ancestor=mikopbx/mikopbx" --format "{{.ID}}" | head -1)

# Get auth token
TOKEN="your-bearer-token"

# Test POST (should apply defaults)
curl -X POST "https://mikopbx_php83.localhost:8445/pbxcore/api/v3/extensions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"number": "201", "type": "SIP"}' \
  -k -v

# Test PATCH (should NOT apply defaults)
curl -X PATCH "https://mikopbx_php83.localhost:8445/pbxcore/api/v3/extensions/{id}" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"number": "202"}' \
  -k -v

# Verify: status should remain unchanged, not reset to default
```

### 3. Generate Report

Use the [report template](templates/report-template.md) to document findings:
- DataStructure compliance score
- SaveRecordAction compliance score
- Critical issues found
- Prioritized recommendations

## Testing Checklist

Essential tests to verify endpoint behavior:

### POST Tests
- [ ] POST with all required succeeds (201)
- [ ] POST with missing required fails (400)
- [ ] POST applies defaults correctly

### PUT Tests
- [ ] PUT with all required succeeds (200)
- [ ] PUT with missing required fails (400)
- [ ] PUT on non-existent fails (404)

### PATCH Tests (Most Important!)
- [ ] PATCH with partial data succeeds (200)
- [ ] **PATCH does NOT apply defaults** (verify existing values preserved)
- [ ] PATCH does NOT require all required fields
- [ ] PATCH on non-existent fails (404)

### DELETE Tests
- [ ] DELETE existing succeeds (200/204)
- [ ] DELETE non-existent fails (404)

**See**: [Complete Validation Checklist](reference/validation-checklist.md)

## Output Format

Always provide structured compliance reports:

```
📋 API Endpoint Validation Report
==================================

🎯 Endpoint: POST /pbxcore/api/v3/extensions
📁 Resource: Extensions

📂 Files Analyzed:
   ✅ DataStructure.php: src/PBXCoreREST/Lib/Extensions/DataStructure.php
   ✅ SaveRecordAction.php: src/PBXCoreREST/Lib/Extensions/SaveRecordAction.php

---

## 🔍 DataStructure Analysis

✅ Structure: COMPLIANT
⚠️  Missing constraints on 3 parameters:
   - user_username: Add pattern validation
   - email: Add format => 'email'

DataStructure Score: 85/100 ✅

---

## 🔍 SaveRecordAction Analysis

❌ CRITICAL ISSUES:
1. Defaults applied on PATCH (Line 87)
   Impact: Partial updates overwrite existing values
   Fix: Wrap default logic in `if ($httpMethod === 'POST')`

2. Missing required validation for PUT (Line 145)
   Impact: PUT allows missing required fields
   Fix: Change to `if (in_array($httpMethod, ['POST', 'PUT']))`

SaveRecordAction Score: 55/100 ❌

---

## 📊 Overall Compliance Score

Total Score: 72/100 ⚠️  Needs Improvement

---

## ✅ Recommendations (Priority Order)

🔴 CRITICAL (Must Fix):
1. Fix PATCH defaults bug (Line 87) - 15 min
2. Add PUT required validation (Line 145) - 10 min

🟡 HIGH PRIORITY:
3. Add validation constraints to DataStructure - 15 min

---

📝 Action Items:
- [ ] Fix PATCH defaults bug
- [ ] Add PUT required validation
- [ ] Add missing constraints
- [ ] Add regression test for PATCH
- [ ] Run full test suite
```

**Full Template**: [report-template.md](templates/report-template.md)

## Pro Tips

1. **Always Check PATCH First** - Most bugs are in PATCH handling
2. **Look for WHY Comments** - They explain critical decisions
3. **Test Actual Behavior** - Don't trust code inspection alone
4. **Use Schema Validation** - Enable SCHEMA_VALIDATION_STRICT=1
5. **Focus on Defaults** - Default application logic is #1 bug source
6. **Check Method Detection** - Ensure `$httpMethod` is actually used

## Troubleshooting

### Issue: Can't find DataStructure.php

```bash
# Search entire codebase
find src -name "DataStructure.php" | grep -i "YourResource"

# If not found, check if resource exists
ls -la src/PBXCoreREST/Lib/ | grep -i "YourResource"
```

### Issue: Schema validation not working

```bash
# Check if enabled
docker exec $CONTAINER_ID env | grep SCHEMA_VALIDATION

# If not set, add to docker-compose.yml:
# environment:
#   SCHEMA_VALIDATION_STRICT: 1
```

### Issue: Tests show unexpected behavior

```bash
# Check container logs for validation errors
docker exec $CONTAINER_ID tail -100 /storage/usbdisk1/mikopbx/log/php/error.log
```

## Additional Resources

**Complete Documentation**:
- [DataStructure Specification](reference/datastructure-spec.md) - How to define parameters
- [SaveRecordAction Pattern](reference/saveaction-pattern.md) - 7-phase implementation guide
- [Validation Checklist](reference/validation-checklist.md) - Complete validation checklist
- [Anti-Patterns](examples/anti-patterns.md) - Common mistakes to avoid
- [Report Template](templates/report-template.md) - Compliance report format

**Related Skills**:
- `mikopbx-openapi-analyzer` - Fetch and analyze OpenAPI spec
- `mikopbx-api-test-generator` - Generate pytest tests from spec
- `mikopbx-docker-restart-tester` - Test after container restart

## Success Criteria

Validation is successful when:
- ✅ DataStructure has complete parameter definitions
- ✅ No legacy patterns found
- ✅ SaveRecordAction follows 7-phase pattern
- ✅ Defaults only applied on POST
- ✅ Required validation only on POST/PUT (not PATCH)
- ✅ All validation from DataStructure, not hardcoded
- ✅ Schema validation tests pass
- ✅ PATCH preserves existing values (doesn't apply defaults)
- ✅ Compliance score ≥ 90/100

## Quick Reference Card

| Check | DataStructure | SaveRecordAction |
|-------|--------------|------------------|
| Has modern structure | `getParameterDefinitions()` | 7-phase pattern |
| No legacy code | No `getParametersConfig()` | No `ParameterSanitizationExtractor` |
| Complete metadata | type, description, example | WHY comments |
| Validation constraints | min/max, pattern, enum | Uses DataStructure rules |
| Defaults handling | Defined in request section | Only applied on POST |
| Required validation | Marked with `required: true` | POST & PUT only, not PATCH |

## Example Validation Session

```bash
# 1. Locate files
RESOURCE="Extensions"
find src/PBXCoreREST/Lib -path "*/$RESOURCE/DataStructure.php"
# Output: src/PBXCoreREST/Lib/Extensions/DataStructure.php

# 2. Check DataStructure structure
grep -n "getParameterDefinitions" src/PBXCoreREST/Lib/Extensions/DataStructure.php
# Output: Line 15: public static function getParameterDefinitions(): array

# 3. Check for legacy methods
grep -n "getParametersConfig\|ParameterSanitizationExtractor" \
  src/PBXCoreREST/Lib/Extensions/DataStructure.php
# Output: (none) - Good!

# 4. Check SaveRecordAction for PATCH defaults bug
grep -A 2 "httpMethod.*POST" src/PBXCoreREST/Lib/Extensions/SaveRecordAction.php
# Look for: if ($httpMethod === 'POST' && isset($def['default']))

# 5. Run PATCH test
curl -X PATCH "https://mikopbx_php83.localhost:8445/pbxcore/api/v3/extensions/123" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"number": "202"}' -k | jq '.data.status'
# Verify status didn't change to default value
```
