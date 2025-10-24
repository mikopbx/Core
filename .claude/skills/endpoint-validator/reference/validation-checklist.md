# Endpoint Validation Checklist

Complete checklist for validating REST API endpoints in MikoPBX.

## Pre-Validation

- [ ] Identify the API resource name (e.g., Extensions, Providers)
- [ ] Locate DataStructure.php file
- [ ] Locate SaveRecordAction.php file
- [ ] Locate GetRecordAction.php file (if applicable)
- [ ] Determine API path (e.g., /pbxcore/api/v3/extensions)

## DataStructure.php Validation

### Structure
- [ ] Has `getParameterDefinitions()` method
- [ ] Has `request` section
- [ ] Has `response` section
- [ ] Has `getRelatedSchemas()` method (optional but recommended)
- [ ] Does NOT have legacy `getParametersConfig()` method

### Request Parameters
- [ ] All parameters have `type` defined
- [ ] All parameters have `description` defined
- [ ] All parameters have `example` defined
- [ ] All parameters have `required` flag defined
- [ ] Descriptions are specific, not generic
- [ ] Examples are realistic, not placeholder values
- [ ] Validation constraints defined where applicable:
  - [ ] `minimum`/`maximum` for numeric types
  - [ ] `minLength`/`maxLength` for strings
  - [ ] `pattern` for format validation
  - [ ] `enum` for fixed value lists
  - [ ] `format` for special types (email, date, etc.)

### Response Parameters
- [ ] All response fields have `type` defined
- [ ] All response fields have `description` defined
- [ ] All response fields have `example` defined
- [ ] Response includes `id` field
- [ ] Response includes timestamp fields (`created_at`, `updated_at`) if applicable
- [ ] Response matches what GetRecordAction actually returns

### Parameter Alignment
- [ ] Request parameters match model properties
- [ ] Response parameters match model properties
- [ ] Foreign keys documented in `getRelatedSchemas()`
- [ ] No parameters in response that aren't in request (except read-only like timestamps)

## SaveRecordAction.php Validation

### Structure
- [ ] Extends `BaseSaveAction`
- [ ] Has `RESOURCE_NAME` constant defined
- [ ] Follows 7-phase pattern

### Phase 1: Parameter Definition
- [ ] Loads DataStructure definitions
- [ ] Uses `getParameterDefinitions()` method
- [ ] Extracts `request` section
- [ ] Has WHY comment explaining DataStructure usage

### Phase 2: Request Parsing
- [ ] Parses request body
- [ ] Detects HTTP method (`POST`, `PUT`, `PATCH`, `DELETE`)
- [ ] Has WHY comment explaining method-specific behavior

### Phase 3: ID Validation
- [ ] Validates ID format if present
- [ ] Returns early with 400 if ID invalid
- [ ] Has WHY comment explaining early validation

### Phase 4: Load Existing Record
- [ ] Loads existing record for `PUT`/`PATCH`/`DELETE`
- [ ] Returns 404 if record not found
- [ ] Skips loading for `POST`
- [ ] Has WHY comment explaining when loading is needed

### Phase 5: Parameter Sanitization & Defaults
- [ ] Sanitizes all provided values
- [ ] Applies defaults ONLY on POST
- [ ] Does NOT apply defaults on PATCH
- [ ] Does NOT apply defaults on PUT
- [ ] Has WHY comments explaining default logic
- [ ] Has WHY comment about PATCH preserving existing values

### Phase 6: Validation
- [ ] Validates required fields on POST
- [ ] Validates required fields on PUT
- [ ] Does NOT validate required fields on PATCH
- [ ] Validates type constraints
- [ ] Validates min/max constraints
- [ ] Validates length constraints
- [ ] Validates enum constraints
- [ ] Validates pattern constraints
- [ ] Returns 400 with specific field errors
- [ ] Has WHY comments explaining validation rules

### Phase 7: Business Logic & Persistence
- [ ] Creates record on POST
- [ ] Updates record on PUT/PATCH
- [ ] Deletes record on DELETE
- [ ] Returns correct status code:
  - [ ] 201 for POST
  - [ ] 200 for PUT/PATCH/DELETE
  - [ ] 400 for validation errors
  - [ ] 404 for not found
  - [ ] 500 for server errors
- [ ] Catches exceptions properly
- [ ] Logs errors before responding
- [ ] Has WHY comments explaining operations

### Anti-Pattern Checks
- [ ] Does NOT use `ParameterSanitizationExtractor`
- [ ] Does NOT have hardcoded validation rules
- [ ] Does NOT apply defaults with simple `??` operator
- [ ] Does NOT validate required on PATCH
- [ ] Does NOT skip required validation on PUT

## GetRecordAction.php Validation

- [ ] Returns fields matching DataStructure['response']
- [ ] Returns 404 if record not found
- [ ] Handles list endpoints with pagination
- [ ] Handles filter parameters correctly

## Testing Validation

### Environment
- [ ] SCHEMA_VALIDATION_STRICT=1 enabled in docker-compose
- [ ] Container is running
- [ ] Can authenticate and get token

### POST Tests
- [ ] POST with all required fields succeeds (201)
- [ ] POST with missing required field fails (400)
- [ ] POST with invalid type fails (400)
- [ ] POST with value exceeding max fails (400)
- [ ] POST with invalid enum value fails (400)
- [ ] POST with invalid pattern fails (400)
- [ ] POST applies defaults correctly
- [ ] Response matches DataStructure['response']
- [ ] Schema validation passes

### PUT Tests
- [ ] PUT with all required fields succeeds (200)
- [ ] PUT with missing required field fails (400)
- [ ] PUT on non-existent resource fails (404)
- [ ] PUT replaces all fields correctly
- [ ] Response matches DataStructure['response']
- [ ] Schema validation passes

### PATCH Tests (Critical!)
- [ ] PATCH with partial data succeeds (200)
- [ ] PATCH does NOT apply defaults
- [ ] PATCH does NOT validate required fields
- [ ] PATCH only updates provided fields
- [ ] PATCH on non-existent resource fails (404)
- [ ] Response matches DataStructure['response']
- [ ] Schema validation passes

### DELETE Tests
- [ ] DELETE existing resource succeeds (200 or 204)
- [ ] DELETE non-existent resource fails (404)
- [ ] DELETE returns proper confirmation

### Regression Tests
- [ ] Test that verifies PATCH doesn't apply defaults exists
- [ ] Test that verifies PATCH preserves existing values exists
- [ ] Test that verifies required validation on PUT exists

## OpenAPI Compliance

- [ ] Fetch OpenAPI spec successfully
- [ ] Endpoint exists in spec
- [ ] Request schema matches DataStructure['request']
- [ ] Response schema matches DataStructure['response']
- [ ] All parameters documented
- [ ] Required fields marked correctly
- [ ] Examples are present
- [ ] No discrepancies between code and spec

## Documentation

- [ ] API endpoint documented in user manual
- [ ] Examples provided
- [ ] Error responses documented
- [ ] Rate limiting noted (if applicable)

## Performance

- [ ] No N+1 queries in list endpoints
- [ ] Proper indexing on frequently queried fields
- [ ] Pagination implemented for list endpoints

## Security

- [ ] Authentication required
- [ ] Authorization checks implemented
- [ ] No SQL injection vulnerabilities
- [ ] XSS protection in place
- [ ] CSRF protection enabled
- [ ] Input sanitization performed
- [ ] Sensitive data not logged

## Final Checks

- [ ] All WHY comments present and meaningful
- [ ] Code follows MikoPBX coding standards
- [ ] PHPStan analysis passes
- [ ] No deprecated methods used
- [ ] Proper error handling throughout
- [ ] Logging in appropriate places

## Scoring

Calculate compliance score:
- **DataStructure**: Count checks passed / total checks × 100
- **SaveRecordAction**: Count checks passed / total checks × 100
- **Testing**: Count tests passed / total tests × 100
- **Overall**: Average of the three scores

**Target Score**: ≥ 90/100

## Priority Levels

### 🔴 Critical (Must Fix Before Merge)
- Defaults applied on PATCH
- Required validation on PATCH
- Missing required validation on PUT
- Using deprecated methods
- Hardcoded validation
- Wrong status codes

### 🟡 High Priority (Should Fix)
- Missing validation constraints
- Missing WHY comments
- Missing test cases
- Generic error messages
- No logging

### 🟢 Medium Priority (Nice to Have)
- Missing documentation
- Missing timestamp fields
- Performance optimizations

## See Also

- [DataStructure Specification](datastructure-spec.md) - Parameter definition guide
- [SaveRecordAction Pattern](saveaction-pattern.md) - Implementation guide
- [Anti-Patterns](../examples/anti-patterns.md) - What to avoid
- [Report Template](../templates/report-template.md) - Compliance report format
