---
name: api-test-generator
description: Генерация полных Python pytest тестов для REST API эндпоинтов с валидацией схемы. Использовать при создании тестов для новых эндпоинтов, добавлении покрытия для CRUD операций или валидации соответствия API с OpenAPI схемами.
allowed-tools: Bash, Read, Grep, Glob
---

# MikoPBX API Test Generating

Generate comprehensive Python pytest tests for MikoPBX REST API endpoints with full parameter coverage, schema validation, and edge case testing.

## What This Skill Does

Analyzes DataStructure.php files and generates complete pytest test suites including:
- ✅ CRUD operation tests (Create, Read, Update, Delete)
- ✅ Positive and negative test cases
- ✅ Parameter validation tests
- ✅ Edge cases and boundary conditions
- ✅ Schema validation tests
- ✅ Proper fixtures and authentication
- ✅ Detailed assertions with error messages

## When to Use This Skill

Use this skill when you need to:
- Create pytest tests for new REST API endpoints
- Add comprehensive test coverage for existing endpoints
- Generate tests covering all parameter combinations
- Add schema validation tests for API responses
- Create edge case and negative tests
- Ensure API compliance with OpenAPI specification

## Quick Start

### Basic Usage

When the user requests test generation:

1. **Identify the endpoint**
   - API path (e.g., `/pbxcore/api/v3/extensions`)
   - HTTP methods (GET, POST, PUT, DELETE, PATCH)
   - Resource name (e.g., Extensions)

2. **Locate DataStructure.php**
   ```bash
   find /Users/nb/PhpstormProjects/mikopbx/Core/src/PBXCoreREST/Lib -name "DataStructure.php" | grep -i "{resource}"
   ```

3. **Analyze parameter definitions**
   Extract from `DataStructure.php`:
   - Required vs optional parameters
   - Data types and validation rules
   - Default values
   - Enum values
   - Pattern constraints (regex)
   - Min/max values

4. **Generate test file**
   Use the complete template from [test-template.py](templates/test-template.py)

5. **Customize for endpoint**
   - Replace `{ResourceName}` placeholders
   - Fill in actual payload structures
   - Add specific field validations
   - Include enum and pattern validations

## Test Structure

### File Organization

```python
tests/api/
├── test_{resource}_api.py        # Main test file
└── conftest.py                   # Shared fixtures
```

### Test Class Structure

Each test file should have these test classes:

```python
class TestCreate{ResourceName}:
    """Test POST endpoint for creating resources"""
    - test_create_with_valid_data()
    - test_create_missing_required_field()
    - test_create_with_invalid_type()

class TestGet{ResourceName}:
    """Test GET endpoint for retrieving resources"""
    - test_get_all()
    - test_get_by_id()
    - test_get_nonexistent()

class TestUpdate{ResourceName}:
    """Test PUT/PATCH endpoints for updating resources"""
    - test_update_with_valid_data()
    - test_patch_partial_update()

class TestDelete{ResourceName}:
    """Test DELETE endpoint for removing resources"""
    - test_delete_existing()
    - test_delete_nonexistent()

class TestSchemaValidation{ResourceName}:
    """Test response schema validation"""
    - test_response_matches_openapi_schema()

class TestEdgeCases{ResourceName}:
    """Test edge cases and boundary conditions"""
    - test_special_characters_in_fields()
    - test_empty_string_values()
    - test_boundary_values()
```

### Standard Fixtures

```python
@pytest.fixture
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/pbxcore/api/v3/auth/login",
        json={"login": "admin", "password": "123456789MikoPBX#1"},
        verify=False
    )
    return response.json()["data"]["access_token"]

@pytest.fixture
def headers(auth_token):
    """Standard headers with authentication"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
```

## Common Test Patterns

### 1. Create with Valid Data

```python
def test_create_with_valid_data(self, headers):
    """Test creating a resource with all valid required parameters"""
    payload = {
        # Based on DataStructure.php
    }

    response = requests.post(
        f"{BASE_URL}{API_PATH}",
        json=payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "data" in data
    assert "id" in data["data"]

    # Validate returned values match input
    for key, value in payload.items():
        assert data["data"][key] == value
```

### 2. Validation Tests

```python
def test_create_missing_required_field(self, headers):
    """Test validation when required field is missing"""
    payload = {
        # Missing required field
    }

    response = requests.post(
        f"{BASE_URL}{API_PATH}",
        json=payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 400
    assert "messages" in response.json()
```

### 3. Edge Cases

```python
def test_special_characters_in_fields(self, headers):
    """Test handling of special characters"""
    special_chars = "Test <script>alert('xss')</script> & \"quotes\""
    payload = {
        "string_field": special_chars,
    }

    response = requests.post(...)
    assert response.status_code == 200
    assert response.json()["data"]["string_field"] == special_chars
```

## DataStructure Analysis

When analyzing DataStructure.php, extract these key elements:

### Parameter Structure

```php
public static function getParameterDefinitions(): array
{
    return [
        'request' => [
            'POST' => [
                'parameter_name' => [
                    'type' => 'string',              // Extract type
                    'description' => 'Description',  // Extract description
                    'example' => 'value',            // Use for test data
                    'required' => true,              // Required vs optional
                    'default' => 'default_value',    // Default value
                    'enum' => ['val1', 'val2'],      // Valid enum values
                    'pattern' => '^[a-z]+$',         // Regex pattern
                    'minLength' => 1,                // Min length
                    'maxLength' => 100,              // Max length
                ],
            ],
        ],
    ];
}
```

### Use This Data To

1. **Generate valid payloads** - Use `example` and `default` values
2. **Test required fields** - Create tests omitting each required field
3. **Test data types** - Create tests with wrong types
4. **Test enums** - Create tests for each enum value and invalid values
5. **Test patterns** - Create tests for valid/invalid patterns
6. **Test boundaries** - Create tests for min/max values

## Test Documentation Template

Add to the top of each test file:

```python
"""
Tests for {ResourceName} API endpoint

API Endpoint: /pbxcore/api/v3/{resource-path}
DataStructure: src/PBXCoreREST/Lib/{ResourceName}/DataStructure.php

Test Coverage:
- CRUD operations (Create, Read, Update, Delete)
- Required vs optional parameters
- Data type validations
- Enum value validations
- Pattern validations (regex)
- Boundary conditions (min/max values)
- Special characters and edge cases
- Schema validation (when SCHEMA_VALIDATION_STRICT=1)

Requirements:
- pytest
- requests
- Docker container running with MikoPBX

Run tests:
    pytest tests/api/test_{resource_name}.py -v

Run with schema validation:
    # Ensure SCHEMA_VALIDATION_STRICT=1 is set in container
    pytest tests/api/test_{resource_name}.py -v
"""
```

## Output Format

Always generate:

1. ✅ **Complete pytest file** - Runnable without modifications
2. ✅ **Documentation block** - Clear description at the top
3. ✅ **All test classes** - CRUD, schema validation, edge cases
4. ✅ **Proper fixtures** - Authentication and headers
5. ✅ **Clear assertions** - With descriptive error messages
6. ✅ **Comments** - Explaining complex validations

## Running Tests

### Basic Execution

```bash
# Run all API tests
pytest tests/api/ -v

# Run specific endpoint tests
pytest tests/api/test_extensions_api.py -v

# Run specific test class
pytest tests/api/test_extensions_api.py::TestCreateExtensions -v

# Run specific test
pytest tests/api/test_extensions_api.py::TestCreateExtensions::test_create_with_valid_data -v
```

### With Schema Validation

```bash
# Enable schema validation in container
docker exec mikopbx_container sh -c 'export SCHEMA_VALIDATION_STRICT=1'

# Run tests
pytest tests/api/test_extensions_api.py -v
```

### Test Markers

```bash
# Run only CRUD tests
pytest tests/api/ -m crud -v

# Skip slow tests
pytest tests/api/ -m "not slow" -v

# Run smoke tests
pytest tests/api/ -m smoke -v
```

## Important Notes

### MikoPBX-Specific Considerations

- **Authentication**: All tests need Bearer token from `/auth/login`
- **HTTPS**: Use `verify=False` for self-signed certificates
- **Base URL**: Default is `https://mikopbx-php83.localhost:8445`
- **Schema validation**: Only active when `SCHEMA_VALIDATION_STRICT=1` in container
- **Container restart**: Changes to PHP code require container restart
- **Test isolation**: Each test should be independent and idempotent

### Best Practices

1. ✅ **Analyze DataStructure first** - Don't guess parameter structures
2. ✅ **Include schema validation tests** - Only work with SCHEMA_VALIDATION_STRICT=1
3. ✅ **Test success and failure cases** - Negative tests are critical
4. ✅ **Use fixtures for auth** - Avoid code duplication
5. ✅ **Clean up after tests** - Delete created resources in teardown
6. ✅ **Document expected behavior** - Each test should state what it validates
7. ✅ **Use descriptive test names** - Clear indication of what's being tested
8. ✅ **One assertion per test** - Or group related assertions

## Additional Resources

### Templates

Complete test templates for copy-paste usage:

- **[test-template.py](templates/test-template.py)** - Complete pytest template with all test classes
- **[crud-tests.py](templates/crud-tests.py)** - Reusable CRUD operation patterns
- **[edge-cases.py](templates/edge-cases.py)** - Edge case and boundary test patterns

### Reference Documentation

- **[pytest-patterns.md](reference/pytest-patterns.md)** - Pytest patterns, fixtures, and best practices

### Quick Reference

**Test a new endpoint in 5 steps:**

1. Find DataStructure.php
2. Copy [test-template.py](templates/test-template.py)
3. Replace `{ResourceName}` and `{resource-path}`
4. Fill in payloads based on DataStructure
5. Run `pytest tests/api/test_{resource}_api.py -v`

**Need specific patterns?**

- CRUD patterns → [crud-tests.py](templates/crud-tests.py)
- Edge cases → [edge-cases.py](templates/edge-cases.py)
- Pytest best practices → [pytest-patterns.md](reference/pytest-patterns.md)

## Example Invocation

**User**: "Generate pytest tests for the Extensions API endpoint"

**Your response should:**

1. Find `/src/PBXCoreREST/Lib/Extensions/DataStructure.php`
2. Read and analyze parameter definitions
3. Use [test-template.py](templates/test-template.py) as base
4. Generate comprehensive test file with:
   - Valid test data from DataStructure
   - All CRUD operations
   - Edge cases for special characters, boundaries
   - Schema validation tests
5. Save to `tests/api/test_extensions_api.py`
6. Provide run instructions

## Troubleshooting

### Common Issues

**Issue**: Test fails with "Unauthorized"
**Solution**: Check that `auth_token` fixture is working and token is valid

**Issue**: Schema validation tests don't run
**Solution**: Ensure `SCHEMA_VALIDATION_STRICT=1` is set in container

**Issue**: Tests are flaky
**Solution**: Ensure test isolation - each test should create its own resources

**Issue**: Container not accessible
**Solution**: Check container is running: `docker ps | grep mikopbx`

**Issue**: SSL certificate errors
**Solution**: Ensure `verify=False` is set in requests

### Debug Commands

```bash
# Check container is running
docker ps | grep mikopbx

# Check environment variable
docker exec mikopbx_container env | grep SCHEMA_VALIDATION_STRICT

# View API logs
docker exec mikopbx_container tail -f /storage/usbdisk1/mikopbx/log/php/error.log

# Test API manually
curl -k https://mikopbx-php83.localhost:8445/pbxcore/api/v3/system/ping
```
