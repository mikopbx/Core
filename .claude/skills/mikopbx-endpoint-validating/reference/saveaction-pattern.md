# SaveRecordAction 7-Phase Pattern

Comprehensive guide for implementing SaveRecordAction.php in MikoPBX REST API endpoints.

## Overview

`SaveRecordAction` handles create/update/delete operations for API resources. It follows a strict 7-phase pattern to ensure consistency, proper validation, and correct handling of different HTTP methods.

## Why This Pattern?

The 7-phase pattern solves critical problems:

1. **POST vs PATCH Defaults**: Defaults should only apply on creation, not partial updates
2. **Required Field Validation**: Different rules for POST (create), PUT (full update), PATCH (partial)
3. **Idempotency**: Same request produces same result
4. **Error Handling**: Consistent validation and error responses
5. **Maintainability**: Single source of truth in DataStructure

## The 7 Phases

```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\YourResource;

use Phalcon\Http\Message\ServerRequestInterface;
use Phalcon\Http\Message\ResponseInterface;

class SaveRecordAction extends BaseSaveAction
{
    private const string RESOURCE_NAME = 'YourResource';

    public function __invoke(ServerRequestInterface $request): ResponseInterface
    {
        // PHASE 1: Parameter Definition & Defaults
        // PHASE 2: Request Parsing
        // PHASE 3: ID Validation
        // PHASE 4: Load Existing Record
        // PHASE 5: Parameter Sanitization & Defaults
        // PHASE 6: Validation
        // PHASE 7: Business Logic & Persistence
    }
}
```

## Phase 1: Parameter Definition & Defaults

**Purpose**: Load parameter definitions from DataStructure

**Implementation**:
```php
// PHASE 1: Parameter Definition & Defaults
// WHY: DataStructure is the single source of truth for all parameter metadata
$definitions = DataStructure::getParameterDefinitions();
$requestDefs = $definitions['request'];
```

**Why Comments Needed**:
- Explains WHY we use DataStructure (single source of truth)
- Clarifies that definitions drive both documentation and validation

## Phase 2: Request Parsing

**Purpose**: Extract request data and detect HTTP method

**Implementation**:
```php
// PHASE 2: Request Parsing (with method detection)
// WHY: HTTP method determines how we process the request:
//      - POST: Create new record (apply defaults)
//      - PUT: Full update (validate all required fields)
//      - PATCH: Partial update (no defaults, no required validation)
//      - DELETE: Remove record
$requestData = $this->parseRequest($request);
$httpMethod = $request->getMethod();  // GET, POST, PUT, PATCH, DELETE
```

**Why Comments Needed**:
- Explains how different HTTP methods affect processing
- Documents POST/PUT/PATCH/DELETE behavior differences

## Phase 3: ID Validation

**Purpose**: Validate ID format if present

**Implementation**:
```php
// PHASE 3: ID Validation (if present)
// WHY: Early validation prevents loading invalid records
//      - For POST: ID is optional (system can generate)
//      - For PUT/PATCH/DELETE: ID is required to identify record
$id = $requestData['id'] ?? null;

if ($id !== null && !$this->isValidId($id)) {
    return $this->respondWithValidationError(['id' => 'Invalid ID format']);
}
```

**Why Comments Needed**:
- Explains when ID is optional vs required
- Clarifies early validation purpose

## Phase 4: Load Existing Record

**Purpose**: Fetch existing record for update/delete operations

**Implementation**:
```php
// PHASE 4: Load existing record (for PUT/PATCH/DELETE)
// WHY: Update/delete operations need existing record:
//      - To verify record exists (404 if not)
//      - To merge PATCH changes with existing values
//      - To validate business rules (e.g., can't delete if in use)
$existingRecord = null;

if (in_array($httpMethod, ['PUT', 'PATCH', 'DELETE']) && $id) {
    $existingRecord = $this->findRecordById($id);

    if (!$existingRecord) {
        return $this->respondNotFound();
    }
}
```

**Why Comments Needed**:
- Explains why loading is method-specific
- Documents 404 behavior for missing records

## Phase 5: Parameter Sanitization & Defaults

**Purpose**: Sanitize input and apply defaults (POST only)

**This is the MOST CRITICAL phase** - most bugs occur here.

**Implementation**:
```php
// PHASE 5: Parameter Sanitization & Defaults
// WHY: Defaults should ONLY be applied on POST, not on PATCH
//      - POST: Creating new record, defaults fill missing fields
//      - PATCH: Partial update, missing fields should remain unchanged
//      - PUT: Full update, all fields must be provided
$sanitized = [];

foreach ($requestDefs as $param => $def) {
    if (isset($requestData[$param])) {
        // WHY: Value provided in request, sanitize it
        $sanitized[$param] = $this->sanitizeValue(
            $requestData[$param],
            $def['type']
        );
    } elseif ($httpMethod === 'POST' && isset($def['default'])) {
        // WHY: Only apply default on POST (creating new record)
        // WHY: PATCH is for partial updates, missing fields stay as-is
        $sanitized[$param] = $def['default'];
    }
    // WHY: For PATCH/PUT with missing value, don't add to $sanitized
    //      This preserves existing value in database
}
```

**Critical Rules**:
1. ✅ **DO** apply defaults on POST when field not provided
2. ❌ **DON'T** apply defaults on PATCH - ever
3. ❌ **DON'T** apply defaults on PUT - all fields must be explicit

**Common Bug**:
```php
// ❌ WRONG - This applies defaults on PATCH too!
$value = $requestData[$param] ?? $def['default'] ?? null;

// ✅ CORRECT - Defaults only on POST
if ($httpMethod === 'POST' && !isset($requestData[$param]) && isset($def['default'])) {
    $sanitized[$param] = $def['default'];
}
```

## Phase 6: Validation

**Purpose**: Validate parameters against DataStructure rules

**Implementation**:
```php
// PHASE 6: Validation
// WHY: Validate against DataStructure rules before persistence
//      - POST: All required fields must be present
//      - PUT: All required fields must be present
//      - PATCH: No required validation (partial update)
$errors = $this->validateParameters($sanitized, $requestDefs, $httpMethod);

if (!empty($errors)) {
    return $this->respondWithValidationError($errors);
}
```

**Validation Method**:
```php
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
        // WHY: Required validation only applies to POST and PUT
        // WHY: PATCH allows partial updates, so required check is skipped
        if (in_array($httpMethod, ['POST', 'PUT'])) {
            if (($def['required'] ?? false) && !isset($data[$param])) {
                $errors[$param] = "Field '$param' is required";
                continue;
            }
        }

        // WHY: Skip further validation if value not provided (for PATCH)
        if (!isset($data[$param])) {
            continue;
        }

        $value = $data[$param];

        // Type validation
        if (!$this->validateType($value, $def['type'])) {
            $errors[$param] = "Invalid type for '$param', expected {$def['type']}";
            continue;
        }

        // WHY: Min/Max validation for numeric types
        if (isset($def['minimum']) && $value < $def['minimum']) {
            $errors[$param] = "Value for '$param' must be >= {$def['minimum']}";
        }
        if (isset($def['maximum']) && $value > $def['maximum']) {
            $errors[$param] = "Value for '$param' must be <= {$def['maximum']}";
        }

        // WHY: Length validation for string types
        if (isset($def['maxLength']) && strlen($value) > $def['maxLength']) {
            $errors[$param] = "Length of '$param' exceeds maximum {$def['maxLength']}";
        }

        // WHY: Enum validation ensures value is from allowed list
        if (isset($def['enum']) && !in_array($value, $def['enum'], true)) {
            $allowed = implode(', ', $def['enum']);
            $errors[$param] = "Value for '$param' must be one of: $allowed";
        }

        // WHY: Pattern validation for format requirements
        if (isset($def['pattern']) && !preg_match("/{$def['pattern']}/", $value)) {
            $errors[$param] = "Value for '$param' does not match required pattern";
        }
    }

    return $errors;
}
```

**Validation Rules by Method**:
- **POST**: Check all `required: true` fields
- **PUT**: Check all `required: true` fields (full replacement)
- **PATCH**: Skip required validation (partial update)

## Phase 7: Business Logic & Persistence

**Purpose**: Execute operation and save to database

**Implementation**:
```php
// PHASE 7: Business Logic & Persistence
// WHY: After validation passes, execute the requested operation
try {
    if ($httpMethod === 'POST') {
        // WHY: Creating new record with validated + sanitized data
        $result = $this->createRecord($sanitized);
        return $this->respondSuccess($result, 201);  // 201 Created

    } elseif (in_array($httpMethod, ['PUT', 'PATCH'])) {
        // WHY: Updating existing record
        //      - PUT: Replace all fields with $sanitized
        //      - PATCH: Merge $sanitized with existing values
        $result = $this->updateRecord($existingRecord, $sanitized, $httpMethod);
        return $this->respondSuccess($result, 200);  // 200 OK

    } elseif ($httpMethod === 'DELETE') {
        // WHY: Remove record from database
        $this->deleteRecord($existingRecord);
        return $this->respondSuccess(['deleted' => true], 200);
    }

} catch (\Exception $e) {
    // WHY: Log and return server error for unexpected failures
    $this->logger->error("SaveRecordAction failed: " . $e->getMessage());
    return $this->respondWithError($e->getMessage(), 500);
}
```

**Response Status Codes**:
- `201 Created` - POST successful
- `200 OK` - PUT/PATCH/DELETE successful
- `400 Bad Request` - Validation failed
- `404 Not Found` - Record doesn't exist (PUT/PATCH/DELETE)
- `500 Internal Server Error` - Unexpected failure

## Complete Working Example

```php
<?php
namespace MikoPBX\PBXCoreREST\Lib\Extensions;

use MikoPBX\PBXCoreREST\Lib\BaseSaveAction;
use Phalcon\Http\Message\ServerRequestInterface;
use Phalcon\Http\Message\ResponseInterface;

class SaveRecordAction extends BaseSaveAction
{
    private const string RESOURCE_NAME = 'Extensions';

    public function __invoke(ServerRequestInterface $request): ResponseInterface
    {
        // PHASE 1: Parameter Definition & Defaults
        // WHY: DataStructure is single source of truth
        $definitions = DataStructure::getParameterDefinitions();
        $requestDefs = $definitions['request'];

        // PHASE 2: Request Parsing (with method detection)
        // WHY: Method determines processing logic (POST/PUT/PATCH/DELETE)
        $requestData = $this->parseRequest($request);
        $httpMethod = $request->getMethod();

        // PHASE 3: ID Validation (if present)
        // WHY: Validate ID early before DB lookup
        $id = $requestData['id'] ?? null;
        if ($id !== null && !$this->isValidId($id)) {
            return $this->respondWithValidationError(['id' => 'Invalid ID format']);
        }

        // PHASE 4: Load existing record (for PUT/PATCH/DELETE)
        // WHY: Need existing record for updates/deletes
        $existingRecord = null;
        if (in_array($httpMethod, ['PUT', 'PATCH', 'DELETE']) && $id) {
            $existingRecord = $this->findRecordById($id);
            if (!$existingRecord) {
                return $this->respondNotFound();
            }
        }

        // PHASE 5: Parameter Sanitization & Defaults
        // WHY: Apply defaults ONLY on POST, never on PATCH
        $sanitized = [];
        foreach ($requestDefs as $param => $def) {
            if (isset($requestData[$param])) {
                $sanitized[$param] = $this->sanitizeValue(
                    $requestData[$param],
                    $def['type']
                );
            } elseif ($httpMethod === 'POST' && isset($def['default'])) {
                $sanitized[$param] = $def['default'];
            }
        }

        // PHASE 6: Validation
        // WHY: Validate before persistence
        $errors = $this->validateParameters($sanitized, $requestDefs, $httpMethod);
        if (!empty($errors)) {
            return $this->respondWithValidationError($errors);
        }

        // PHASE 7: Business Logic & Persistence
        try {
            if ($httpMethod === 'POST') {
                $result = $this->createRecord($sanitized);
                return $this->respondSuccess($result, 201);
            } elseif (in_array($httpMethod, ['PUT', 'PATCH'])) {
                $result = $this->updateRecord($existingRecord, $sanitized, $httpMethod);
                return $this->respondSuccess($result, 200);
            } elseif ($httpMethod === 'DELETE') {
                $this->deleteRecord($existingRecord);
                return $this->respondSuccess(['deleted' => true], 200);
            }
        } catch (\Exception $e) {
            return $this->respondWithError($e->getMessage(), 500);
        }

        return $this->respondWithError('Invalid HTTP method', 405);
    }

    private function validateParameters(
        array $data,
        array $definitions,
        string $httpMethod
    ): array {
        $errors = [];

        foreach ($definitions as $param => $def) {
            // Required validation (POST and PUT only)
            if (in_array($httpMethod, ['POST', 'PUT'])) {
                if (($def['required'] ?? false) && !isset($data[$param])) {
                    $errors[$param] = "Field '$param' is required";
                    continue;
                }
            }

            if (!isset($data[$param])) {
                continue;
            }

            $value = $data[$param];

            // Type validation
            if (!$this->validateType($value, $def['type'])) {
                $errors[$param] = "Invalid type, expected {$def['type']}";
                continue;
            }

            // Constraint validations
            if (isset($def['minimum']) && $value < $def['minimum']) {
                $errors[$param] = "Must be >= {$def['minimum']}";
            }
            if (isset($def['maximum']) && $value > $def['maximum']) {
                $errors[$param] = "Must be <= {$def['maximum']}";
            }
            if (isset($def['maxLength']) && strlen($value) > $def['maxLength']) {
                $errors[$param] = "Length exceeds {$def['maxLength']}";
            }
            if (isset($def['enum']) && !in_array($value, $def['enum'], true)) {
                $errors[$param] = "Must be one of: " . implode(', ', $def['enum']);
            }
            if (isset($def['pattern']) && !preg_match("/{$def['pattern']}/", $value)) {
                $errors[$param] = "Does not match required pattern";
            }
        }

        return $errors;
    }
}
```

## Testing the Pattern

### Test Case 1: POST with Defaults
```bash
curl -X POST "/pbxcore/api/v3/extensions" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "201",
    "type": "SIP"
  }'

# Expected: Status=inactive (default applied)
```

### Test Case 2: PATCH without Defaults
```bash
# First create with status=active
curl -X POST "/pbxcore/api/v3/extensions" \
  -d '{"number": "201", "type": "SIP", "status": "active"}'

# Then PATCH only number
curl -X PATCH "/pbxcore/api/v3/extensions/{id}" \
  -d '{"number": "202"}'

# Expected: Status still "active" (default NOT applied)
```

### Test Case 3: PUT with Required
```bash
curl -X PUT "/pbxcore/api/v3/extensions/{id}" \
  -d '{"number": "202"}'  # Missing required 'type'

# Expected: 400 Bad Request (type is required)
```

## Common Mistakes

### 1. Defaults on PATCH
```php
// ❌ WRONG
$value = $requestData[$param] ?? $def['default'] ?? null;

// ✅ CORRECT
if ($httpMethod === 'POST' && !isset($requestData[$param])) {
    $value = $def['default'] ?? null;
}
```

### 2. Missing Method Detection
```php
// ❌ WRONG - Assumes always POST
$sanitized[$param] = $def['default'];

// ✅ CORRECT - Check method first
if ($httpMethod === 'POST' && isset($def['default'])) {
    $sanitized[$param] = $def['default'];
}
```

### 3. Required on PATCH
```php
// ❌ WRONG - Validates required on PATCH
if ($def['required'] && !isset($data[$param])) {
    $errors[] = "Required";
}

// ✅ CORRECT - Skip required for PATCH
if (in_array($httpMethod, ['POST', 'PUT']) && $def['required'] && !isset($data[$param])) {
    $errors[] = "Required";
}
```

## Best Practices

1. **Always Add WHY Comments**: Explain reasoning, not just what
2. **Method-Specific Logic**: Different rules for POST/PUT/PATCH
3. **Fail Fast**: Validate early (Phase 3, 6)
4. **Use DataStructure**: Never hardcode validation rules
5. **Proper Status Codes**: 201 for create, 200 for update, 404 for not found
6. **Comprehensive Tests**: Test all methods, especially PATCH defaults

## See Also

- [DataStructure Specification](datastructure-spec.md) - Parameter definition guide
- [Anti-Patterns](../examples/anti-patterns.md) - What to avoid
- [Validation Checklist](validation-checklist.md) - Complete checklist
