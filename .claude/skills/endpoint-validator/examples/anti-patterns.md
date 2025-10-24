# Anti-Patterns in API Endpoint Implementation

Common mistakes to avoid when implementing REST API endpoints in MikoPBX.

## Overview

This document catalogs real-world anti-patterns found in API endpoint implementations, explains why they're problematic, and shows the correct approach.

## Category 1: Default Value Handling

### ❌ Anti-Pattern 1.1: Defaults Applied on PATCH

**Problem**: Applying default values during PATCH (partial update) operations.

**Why It's Wrong**:
- PATCH is for partial updates - only provided fields should change
- Missing fields should remain unchanged in the database
- Applying defaults overwrites existing values unexpectedly

**Code Example (WRONG)**:
```php
// ❌ BAD: This applies defaults on all methods including PATCH
foreach ($definitions as $param => $def) {
    $value = $requestData[$param] ?? $def['default'] ?? null;
    $sanitized[$param] = $value;
}
```

**Impact**:
- User PATCHes `{"number": "202"}` to change only the number
- System applies `"status": "active"` default
- Overwrites existing `"status": "inactive"` value
- **Data corruption in partial updates**

**Correct Implementation**:
```php
// ✅ GOOD: Defaults only on POST
foreach ($requestDefs as $param => $def) {
    if (isset($requestData[$param])) {
        // Value provided, use it
        $sanitized[$param] = $this->sanitizeValue(
            $requestData[$param],
            $def['type']
        );
    } elseif ($httpMethod === 'POST' && isset($def['default'])) {
        // Only apply default on POST
        $sanitized[$param] = $def['default'];
    }
    // For PATCH: missing fields are not added to $sanitized
}
```

### ❌ Anti-Pattern 1.2: Null Coalescing for Defaults

**Problem**: Using `??` operator without method check.

**Code Example (WRONG)**:
```php
// ❌ BAD: Applies default regardless of HTTP method
$status = $data['status'] ?? 'active';
```

**Why It's Wrong**:
- Works for POST, but breaks PATCH
- No distinction between "not provided" and "explicitly null"

**Correct Implementation**:
```php
// ✅ GOOD: Method-aware default application
if ($httpMethod === 'POST') {
    $status = $data['status'] ?? 'active';
} else {
    // For PATCH/PUT: only use provided value
    if (isset($data['status'])) {
        $status = $data['status'];
    }
}
```

## Category 2: Required Field Validation

### ❌ Anti-Pattern 2.1: Required Validation on PATCH

**Problem**: Checking required fields during PATCH operations.

**Why It's Wrong**:
- PATCH allows partial updates
- User should be able to update just one field
- Required validation prevents legitimate partial updates

**Code Example (WRONG)**:
```php
// ❌ BAD: Validates required on all methods
if ($def['required'] && !isset($data[$param])) {
    $errors[$param] = "Field is required";
}
```

**Impact**:
- User PATCHes `{"callerid": "New Name"}` to update only callerid
- Validation fails: "Field 'number' is required"
- **PATCH becomes impossible** - user must send all required fields

**Correct Implementation**:
```php
// ✅ GOOD: Required validation only on POST and PUT
if (in_array($httpMethod, ['POST', 'PUT'])) {
    if (($def['required'] ?? false) && !isset($data[$param])) {
        $errors[$param] = "Field '$param' is required";
    }
}
// PATCH: Skip required validation entirely
```

### ❌ Anti-Pattern 2.2: Missing Required Validation for PUT

**Problem**: Not validating required fields on PUT (full update).

**Code Example (WRONG)**:
```php
// ❌ BAD: Only validates required on POST
if ($httpMethod === 'POST' && $def['required'] && !isset($data[$param])) {
    $errors[$param] = "Required";
}
```

**Why It's Wrong**:
- PUT is a full replacement operation
- All required fields should be provided
- Missing validation allows incomplete records

**Correct Implementation**:
```php
// ✅ GOOD: Required validation on both POST and PUT
if (in_array($httpMethod, ['POST', 'PUT'])) {
    if (($def['required'] ?? false) && !isset($data[$param])) {
        $errors[$param] = "Field '$param' is required";
    }
}
```

## Category 3: Hardcoded Validation

### ❌ Anti-Pattern 3.1: Validation Rules in SaveRecordAction

**Problem**: Hardcoding validation logic instead of using DataStructure.

**Code Example (WRONG)**:
```php
// ❌ BAD: Hardcoded validation
if (strlen($name) > 255) {
    return $this->respondWithValidationError([
        'name' => 'Name too long'
    ]);
}

if (!preg_match('/^\d{2,8}$/', $number)) {
    return $this->respondWithValidationError([
        'number' => 'Invalid number format'
    ]);
}
```

**Why It's Wrong**:
- Violates DRY principle
- Validation not in OpenAPI spec
- Hard to maintain when rules change
- Not visible to API consumers

**Correct Implementation**:
```php
// ✅ GOOD: Validation from DataStructure
// In DataStructure.php:
'request' => [
    'name' => [
        'type' => 'string',
        'maxLength' => 255,
    ],
    'number' => [
        'type' => 'string',
        'pattern' => '^\d{2,8}$',
    ],
]

// In SaveRecordAction.php:
$errors = $this->validateParameters($sanitized, $requestDefs, $httpMethod);
// validateParameters() uses DataStructure constraints
```

### ❌ Anti-Pattern 3.2: Business Logic Validation in DataStructure

**Problem**: Mixing data validation with business logic.

**Code Example (WRONG)**:
```php
// ❌ BAD: Business logic in validation
if ($def['param'] === 'number') {
    // Check if number already exists in database
    $existing = $this->checkNumberExists($value);
    if ($existing) {
        $errors[] = "Number already exists";
    }
}
```

**Why It's Wrong**:
- Validation should be stateless
- Database checks belong in business logic (Phase 7)
- Can't document in OpenAPI spec

**Correct Implementation**:
```php
// ✅ GOOD: Separate data validation from business rules
// Phase 6: Data validation only (format, type, range)
$errors = $this->validateParameters($sanitized, $requestDefs, $httpMethod);
if (!empty($errors)) {
    return $this->respondWithValidationError($errors);
}

// Phase 7: Business logic validation
try {
    if ($this->checkNumberExists($sanitized['number'])) {
        return $this->respondWithValidationError([
            'number' => 'Extension number already exists'
        ]);
    }
    // ... continue with save
}
```

## Category 4: Legacy Patterns

### ❌ Anti-Pattern 4.1: Using ParameterSanitizationExtractor

**Problem**: Using deprecated `ParameterSanitizationExtractor` class.

**Code Example (WRONG)**:
```php
// ❌ BAD: Legacy approach
use MikoPBX\PBXCoreREST\Lib\ParameterSanitizationExtractor;

$sanitized = ParameterSanitizationExtractor::sanitize(
    $requestData,
    $definitions
);
```

**Why It's Wrong**:
- Deprecated class
- Doesn't support method-aware processing
- Can't handle POST/PATCH differences correctly
- Not compatible with schema validation

**Correct Implementation**:
```php
// ✅ GOOD: Modern approach with method awareness
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
```

### ❌ Anti-Pattern 4.2: Using getParametersConfig()

**Problem**: Using legacy `getParametersConfig()` method in DataStructure.

**Code Example (WRONG)**:
```php
// ❌ BAD: Legacy method
class DataStructure
{
    public static function getParametersConfig(): array
    {
        return [
            'number' => 'required|numeric',
            'name' => 'required|string|max:255',
        ];
    }
}
```

**Why It's Wrong**:
- Deprecated method
- Not compatible with OpenAPI generation
- String-based validation rules are hard to parse
- Doesn't support all OpenAPI features

**Correct Implementation**:
```php
// ✅ GOOD: Modern getParameterDefinitions()
class DataStructure
{
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                'number' => [
                    'type' => 'integer',
                    'description' => 'Extension number',
                    'required' => true,
                    'example' => 201,
                ],
                'name' => [
                    'type' => 'string',
                    'description' => 'Extension name',
                    'required' => true,
                    'maxLength' => 255,
                    'example' => 'John Doe',
                ],
            ],
            'response' => [
                // Response fields
            ],
        ];
    }
}
```

## Category 5: Error Handling

### ❌ Anti-Pattern 5.1: Generic Error Messages

**Problem**: Non-specific error messages that don't help users.

**Code Example (WRONG)**:
```php
// ❌ BAD: Generic message
return $this->respondWithValidationError([
    'error' => 'Invalid input'
]);
```

**Why It's Wrong**:
- User doesn't know what's wrong
- Hard to debug
- Poor API usability

**Correct Implementation**:
```php
// ✅ GOOD: Specific field-level errors
return $this->respondWithValidationError([
    'number' => 'Extension number must be between 100 and 99999',
    'email' => 'Invalid email format',
]);
```

### ❌ Anti-Pattern 5.2: Swallowing Exceptions

**Problem**: Catching exceptions without logging.

**Code Example (WRONG)**:
```php
// ❌ BAD: Silent failure
try {
    $result = $this->createRecord($data);
} catch (\Exception $e) {
    return $this->respondWithError('Failed', 500);
}
```

**Why It's Wrong**:
- No debugging information
- Can't trace issues in production
- Masks real problems

**Correct Implementation**:
```php
// ✅ GOOD: Log before responding
try {
    $result = $this->createRecord($data);
} catch (\Exception $e) {
    $this->logger->error("Failed to create extension: " . $e->getMessage(), [
        'data' => $data,
        'trace' => $e->getTraceAsString(),
    ]);
    return $this->respondWithError($e->getMessage(), 500);
}
```

## Category 6: Response Formatting

### ❌ Anti-Pattern 6.1: Inconsistent Status Codes

**Problem**: Using wrong HTTP status codes.

**Code Examples (WRONG)**:
```php
// ❌ BAD: 200 for resource creation
if ($httpMethod === 'POST') {
    $result = $this->createRecord($data);
    return $this->respondSuccess($result, 200);  // Should be 201
}

// ❌ BAD: 200 when resource not found
if (!$existingRecord) {
    return $this->respondSuccess(['error' => 'Not found'], 200);  // Should be 404
}
```

**Correct Implementation**:
```php
// ✅ GOOD: Proper status codes
if ($httpMethod === 'POST') {
    $result = $this->createRecord($data);
    return $this->respondSuccess($result, 201);  // 201 Created
}

if (!$existingRecord) {
    return $this->respondNotFound();  // 404 Not Found
}
```

**Correct Status Code Usage**:
- `200 OK` - Successful GET, PUT, PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE (no body)
- `400 Bad Request` - Validation error
- `404 Not Found` - Resource doesn't exist
- `500 Internal Server Error` - Server exception

### ❌ Anti-Pattern 6.2: Missing Response Schema Compliance

**Problem**: Response doesn't match DataStructure['response'].

**Code Example (WRONG)**:
```php
// ❌ BAD: Returns different structure than DataStructure
return $this->respondSuccess([
    'extension_id' => $record->id,  // DataStructure says 'id'
    'ext_number' => $record->number,  // DataStructure says 'number'
]);
```

**Why It's Wrong**:
- Breaks OpenAPI schema validation
- Confuses API consumers
- Inconsistent with documentation

**Correct Implementation**:
```php
// ✅ GOOD: Match DataStructure['response'] exactly
$responseDefs = DataStructure::getParameterDefinitions()['response'];

$response = [];
foreach ($responseDefs as $field => $def) {
    if (isset($record->$field)) {
        $response[$field] = $record->$field;
    }
}

return $this->respondSuccess($response);
```

## Quick Reference: Do's and Don'ts

### Defaults
- ✅ DO apply defaults on POST
- ❌ DON'T apply defaults on PATCH
- ❌ DON'T apply defaults on PUT

### Required Validation
- ✅ DO validate required on POST
- ✅ DO validate required on PUT
- ❌ DON'T validate required on PATCH

### Validation Rules
- ✅ DO define rules in DataStructure
- ❌ DON'T hardcode validation in SaveRecordAction
- ✅ DO use constraint attributes (min, max, pattern, enum)

### Error Handling
- ✅ DO provide specific field-level errors
- ✅ DO log exceptions before responding
- ✅ DO use correct HTTP status codes
- ❌ DON'T use generic error messages

### Legacy Code
- ❌ DON'T use ParameterSanitizationExtractor
- ❌ DON'T use getParametersConfig()
- ✅ DO use getParameterDefinitions()
- ✅ DO follow 7-phase pattern

## Testing Anti-Patterns

When validating endpoints, look for these red flags:

1. **PATCH test with partial data fails** → Required validation on PATCH
2. **PATCH changes unrelated fields** → Defaults applied on PATCH
3. **Validation errors not specific** → Generic error messages
4. **Different status codes than expected** → Inconsistent status code usage
5. **Response doesn't match OpenAPI** → Schema compliance issue

## See Also

- [SaveRecordAction Pattern](../reference/saveaction-pattern.md) - Correct implementation
- [DataStructure Specification](../reference/datastructure-spec.md) - Proper schema definition
- [Validation Checklist](../reference/validation-checklist.md) - Complete validation list
