---
name: mikopbx-api-test-generator
description: Generate comprehensive Python pytest tests for REST API endpoints with schema validation
---

# mikopbx-api-test-generator

Generate comprehensive Python pytest tests for MikoPBX REST API endpoints with full parameter coverage and schema validation.

## When to Use This Skill

Use this skill when you need to:
- Create new pytest tests for REST API endpoints
- Generate test cases covering all parameter combinations
- Add schema validation tests for API responses
- Create edge case and negative tests
- Generate tests for CRUD operations on API resources

## What This Skill Does

1. **Analyzes the endpoint structure** from DataStructure.php files
2. **Generates pytest test file** with:
   - Test fixtures for authentication
   - Positive test cases (valid parameters)
   - Negative test cases (invalid parameters, missing required fields)
   - Edge cases (boundary values, special characters, empty values)
   - Schema validation tests
3. **Includes proper assertions** for:
   - HTTP status codes
   - Response structure
   - Data types
   - Required fields
   - Business logic validation
4. **Adds documentation** with test descriptions and expected behaviors

## Usage Instructions

When the user requests test generation for an API endpoint, follow these steps:

### Step 1: Identify the API Endpoint
Ask the user for:
- The API endpoint path (e.g., `/pbxcore/api/v3/extensions`)
- The HTTP methods to test (GET, POST, PUT, DELETE, PATCH)
- The resource name (e.g., Extensions, Providers, IncomingRoutes)

### Step 2: Locate DataStructure.php
Find the corresponding DataStructure.php file:
```bash
# Example for Extensions
find /Users/nb/PhpstormProjects/mikopbx/Core/src/PBXCoreREST/Lib -name "DataStructure.php" | grep -i "extensions"
```

### Step 3: Analyze Parameter Definitions
Read the DataStructure.php file and extract:
- Required parameters
- Optional parameters
- Data types and validation rules
- Default values
- Enum values
- Pattern constraints (regex)
- Min/max values

### Step 4: Generate Test File
Create a pytest test file with the following structure:

```python
"""
Tests for {ResourceName} API endpoint
Generated for: /pbxcore/api/v3/{resource-path}
"""
import pytest
import requests
from typing import Dict, Any

# Base configuration
BASE_URL = "https://mikopbx_php83.localhost:8445"
API_PATH = "/pbxcore/api/v3/{resource-path}"


@pytest.fixture
def auth_token():
    """Get authentication token for API requests"""
    login_url = f"{BASE_URL}/pbxcore/api/v3/auth/login"
    response = requests.post(
        login_url,
        json={"login": "admin", "password": "123456789MikoPBX#1"},
        verify=False
    )
    assert response.status_code == 200
    return response.json()["data"]["access_token"]


@pytest.fixture
def headers(auth_token):
    """Standard headers with authentication"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestCreate{ResourceName}:
    """Test POST endpoint for creating {resource}"""

    def test_create_with_valid_data(self, headers):
        """
        Test creating a {resource} with all valid required parameters

        Expected: 200 OK with created resource data
        """
        payload = {
            # Generate valid payload based on DataStructure
        }

        response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json=payload,
            headers=headers,
            verify=False
        )

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()

        # Validate response structure
        assert "data" in data
        assert "id" in data["data"]

        # Validate returned values match input
        for key, value in payload.items():
            assert data["data"][key] == value, f"Mismatch for {key}"

    def test_create_missing_required_field(self, headers):
        """
        Test creating a {resource} without required field

        Expected: 400 Bad Request with validation error
        """
        payload = {
            # Payload missing required field
        }

        response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json=payload,
            headers=headers,
            verify=False
        )

        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "messages" in data

    def test_create_with_invalid_type(self, headers):
        """
        Test creating a {resource} with invalid data type

        Expected: 400 Bad Request with type validation error
        """
        payload = {
            # Generate payload with wrong type (e.g., string instead of integer)
        }

        response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json=payload,
            headers=headers,
            verify=False
        )

        assert response.status_code == 400


class TestGet{ResourceName}:
    """Test GET endpoint for retrieving {resource}"""

    def test_get_all(self, headers):
        """
        Test retrieving all {resources}

        Expected: 200 OK with array of resources
        """
        response = requests.get(
            f"{BASE_URL}{API_PATH}",
            headers=headers,
            verify=False
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_get_by_id(self, headers):
        """
        Test retrieving a specific {resource} by ID

        Expected: 200 OK with resource data
        """
        # First create a resource to get
        create_response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json={/* valid payload */},
            headers=headers,
            verify=False
        )
        resource_id = create_response.json()["data"]["id"]

        # Now get it
        response = requests.get(
            f"{BASE_URL}{API_PATH}/{resource_id}",
            headers=headers,
            verify=False
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["id"] == resource_id

    def test_get_nonexistent(self, headers):
        """
        Test retrieving a non-existent {resource}

        Expected: 404 Not Found
        """
        response = requests.get(
            f"{BASE_URL}{API_PATH}/nonexistent-id",
            headers=headers,
            verify=False
        )

        assert response.status_code == 404


class TestUpdate{ResourceName}:
    """Test PUT/PATCH endpoints for updating {resource}"""

    def test_update_with_valid_data(self, headers):
        """
        Test updating a {resource} with valid data

        Expected: 200 OK with updated resource data
        """
        # Create resource first
        create_response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json={/* valid payload */},
            headers=headers,
            verify=False
        )
        resource_id = create_response.json()["data"]["id"]

        # Update it
        update_payload = {
            # Fields to update
        }

        response = requests.put(
            f"{BASE_URL}{API_PATH}/{resource_id}",
            json=update_payload,
            headers=headers,
            verify=False
        )

        assert response.status_code == 200
        data = response.json()

        # Verify updates were applied
        for key, value in update_payload.items():
            assert data["data"][key] == value

    def test_patch_partial_update(self, headers):
        """
        Test partial update (PATCH) of a {resource}

        Expected: 200 OK with only specified fields updated
        """
        # Create resource first
        create_response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json={/* valid payload */},
            headers=headers,
            verify=False
        )
        resource_id = create_response.json()["data"]["id"]
        original_data = create_response.json()["data"]

        # Patch it (update only one field)
        patch_payload = {
            "field_to_update": "new_value"
        }

        response = requests.patch(
            f"{BASE_URL}{API_PATH}/{resource_id}",
            json=patch_payload,
            headers=headers,
            verify=False
        )

        assert response.status_code == 200
        data = response.json()

        # Verify only patched field changed
        assert data["data"]["field_to_update"] == "new_value"
        # Verify other fields unchanged
        for key in original_data:
            if key not in patch_payload:
                assert data["data"][key] == original_data[key]


class TestDelete{ResourceName}:
    """Test DELETE endpoint for removing {resource}"""

    def test_delete_existing(self, headers):
        """
        Test deleting an existing {resource}

        Expected: 200 OK or 204 No Content
        """
        # Create resource first
        create_response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json={/* valid payload */},
            headers=headers,
            verify=False
        )
        resource_id = create_response.json()["data"]["id"]

        # Delete it
        response = requests.delete(
            f"{BASE_URL}{API_PATH}/{resource_id}",
            headers=headers,
            verify=False
        )

        assert response.status_code in [200, 204]

        # Verify it's gone
        get_response = requests.get(
            f"{BASE_URL}{API_PATH}/{resource_id}",
            headers=headers,
            verify=False
        )
        assert get_response.status_code == 404

    def test_delete_nonexistent(self, headers):
        """
        Test deleting a non-existent {resource}

        Expected: 404 Not Found
        """
        response = requests.delete(
            f"{BASE_URL}{API_PATH}/nonexistent-id",
            headers=headers,
            verify=False
        )

        assert response.status_code == 404


class TestSchemaValidation{ResourceName}:
    """Test response schema validation when SCHEMA_VALIDATION_STRICT=1"""

    def test_response_matches_openapi_schema(self, headers):
        """
        Test that API response matches OpenAPI schema definition

        Requires: SCHEMA_VALIDATION_STRICT=1 in container
        Expected: Response includes schema validation metadata
        """
        response = requests.get(
            f"{BASE_URL}{API_PATH}",
            headers=headers,
            verify=False
        )

        assert response.status_code == 200
        data = response.json()

        # Verify response structure matches OpenAPI schema
        # This is automatically validated by MikoPBX when SCHEMA_VALIDATION_STRICT=1
        assert "data" in data

        # Additional manual checks for critical fields
        # Add specific schema validations based on DataStructure.php


class TestEdgeCases{ResourceName}:
    """Test edge cases and boundary conditions"""

    def test_special_characters_in_fields(self, headers):
        """
        Test handling of special characters in string fields

        Expected: Proper escaping and storage of special characters
        """
        special_chars = "Test <script>alert('xss')</script> & \"quotes\" 'apostrophes' \\ backslash"
        payload = {
            "string_field": special_chars,
            # Other required fields
        }

        response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json=payload,
            headers=headers,
            verify=False
        )

        assert response.status_code == 200
        # Verify proper escaping
        data = response.json()
        assert data["data"]["string_field"] == special_chars

    def test_empty_string_values(self, headers):
        """
        Test handling of empty strings in optional fields

        Expected: Empty strings accepted for optional fields
        """
        payload = {
            "optional_field": "",
            # Required fields with valid values
        }

        response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json=payload,
            headers=headers,
            verify=False
        )

        # Should succeed if field is optional
        assert response.status_code == 200

    def test_boundary_values(self, headers):
        """
        Test min/max boundary values for numeric fields

        Expected: Values within range accepted, outside rejected
        """
        # Test min value
        min_payload = {
            "numeric_field": 0,  # or whatever min is
            # Other fields
        }

        response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json=min_payload,
            headers=headers,
            verify=False
        )
        assert response.status_code == 200

        # Test max value
        max_payload = {
            "numeric_field": 999999,  # or whatever max is
            # Other fields
        }

        response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json=max_payload,
            headers=headers,
            verify=False
        )
        assert response.status_code == 200

        # Test beyond max
        over_max_payload = {
            "numeric_field": 9999999,  # beyond max
            # Other fields
        }

        response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json=over_max_payload,
            headers=headers,
            verify=False
        )
        assert response.status_code == 400
```

### Step 5: Fill in Test Data
Based on the DataStructure.php analysis:
- Replace `{ResourceName}` with actual resource name
- Replace `{resource-path}` with actual API path
- Fill in actual payload structures
- Add specific field validations
- Include enum values where applicable
- Add pattern validations (regex) where defined

### Step 6: Add Test Documentation
At the top of the file, add:
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
    docker exec mikopbx_container env | grep SCHEMA_VALIDATION_STRICT
    pytest tests/api/test_{resource_name}.py -v
"""
```

### Step 7: Output Test File Location
Tell the user:
- Where the test file was created
- How to run the tests
- How to enable schema validation mode
- Any prerequisites or setup needed

## Important Notes

1. **Always analyze DataStructure.php first** - Don't guess parameter structures
2. **Include schema validation tests** - These only work when SCHEMA_VALIDATION_STRICT=1
3. **Test both success and failure cases** - Negative tests are critical
4. **Use fixtures for auth** - Avoid code duplication
5. **Clean up after tests** - Delete created resources in teardown if needed
6. **Document expected behavior** - Each test should clearly state what it validates

## Example Invocation

User: "Generate pytest tests for the Extensions API endpoint"

Your response should:
1. Find `/src/PBXCoreREST/Lib/Extensions/DataStructure.php`
2. Analyze parameter definitions
3. Generate comprehensive test file
4. Save to `tests/api/test_extensions_api.py`
5. Provide run instructions

## Special Considerations for MikoPBX

- **Authentication**: All tests need Bearer token from `/auth/login`
- **HTTPS**: Use `verify=False` for self-signed certificates
- **Base URL**: Default is `https://mikopbx_php83.localhost:8445`
- **Schema validation**: Only active when `SCHEMA_VALIDATION_STRICT=1` in container
- **Container restart**: Changes to PHP code require container restart
- **Test isolation**: Each test should be independent and idempotent

## Output Format

Always generate:
1. Complete, runnable pytest file
2. Documentation block at the top
3. All CRUD test classes
4. Schema validation tests
5. Edge case tests
6. Clear assertions with descriptive error messages
7. Comments explaining complex validations
