"""
Complete pytest test template for MikoPBX REST API endpoints

This template provides a comprehensive structure for testing REST API endpoints
with full CRUD coverage, schema validation, and edge case testing.

Usage:
    1. Replace {ResourceName} with actual resource name (e.g., Extensions)
    2. Replace {resource-path} with actual API path (e.g., extensions)
    3. Replace {resource} with singular form (e.g., extension)
    4. Fill in actual payload structures based on DataStructure.php
    5. Add specific field validations based on parameter definitions
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
            # Example:
            # "name": "test_name",
            # "required_field": "value",
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
            # Example: omit "name" if it's required
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
            # Generate payload with wrong type
            # Example: "number_field": "not_a_number"
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
        create_payload = {
            # Valid payload
        }
        create_response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json=create_payload,
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
        create_payload = {
            # Valid payload
        }
        create_response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json=create_payload,
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
        create_payload = {
            # Valid payload
        }
        create_response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json=create_payload,
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
        create_payload = {
            # Valid payload
        }
        create_response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json=create_payload,
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
