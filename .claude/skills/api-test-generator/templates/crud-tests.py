"""
CRUD Test Patterns for MikoPBX REST API

This file provides reusable patterns for testing Create, Read, Update, and Delete operations.
Use these patterns as building blocks for comprehensive API tests.
"""
import pytest
import requests

BASE_URL = "https://mikopbx_php83.localhost:8445"


# ============================================================================
# CREATE (POST) Test Patterns
# ============================================================================

def test_create_with_all_fields(api_path, valid_payload, headers):
    """
    Pattern: Create resource with all fields (required + optional)

    Use when: Testing that all documented fields can be set on creation
    """
    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=valid_payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "id" in data["data"]

    # Verify all fields are returned correctly
    for key, value in valid_payload.items():
        assert data["data"][key] == value


def test_create_with_only_required_fields(api_path, required_payload, headers):
    """
    Pattern: Create resource with only required fields

    Use when: Verifying that optional fields have proper defaults
    """
    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=required_payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 200
    data = response.json()

    # Verify required fields are set
    for key in required_payload:
        assert key in data["data"]

    # Verify optional fields have defaults (not null unless explicitly allowed)
    # Add checks for expected default values


def test_create_with_enum_values(api_path, headers):
    """
    Pattern: Create with all valid enum values

    Use when: Testing enum field accepts all documented values
    """
    enum_field = "status"
    valid_values = ["active", "inactive", "pending"]

    for value in valid_values:
        payload = {
            "required_field": "value",
            enum_field: value
        }

        response = requests.post(
            f"{BASE_URL}{api_path}",
            json=payload,
            headers=headers,
            verify=False
        )

        assert response.status_code == 200, f"Failed for {enum_field}={value}"
        assert response.json()["data"][enum_field] == value


def test_create_with_invalid_enum(api_path, headers):
    """
    Pattern: Create with invalid enum value

    Use when: Verifying enum validation works
    """
    payload = {
        "required_field": "value",
        "enum_field": "invalid_value"
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 400


# ============================================================================
# READ (GET) Test Patterns
# ============================================================================

def test_get_all_with_pagination(api_path, headers):
    """
    Pattern: Get all resources with pagination

    Use when: API supports pagination parameters
    """
    # Test default pagination
    response = requests.get(
        f"{BASE_URL}{api_path}",
        headers=headers,
        verify=False
    )

    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)

    # Test with limit
    response = requests.get(
        f"{BASE_URL}{api_path}?limit=5",
        headers=headers,
        verify=False
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) <= 5


def test_get_with_filtering(api_path, filter_field, filter_value, headers):
    """
    Pattern: Get resources with filtering

    Use when: API supports filtering by specific fields
    """
    response = requests.get(
        f"{BASE_URL}{api_path}?{filter_field}={filter_value}",
        headers=headers,
        verify=False
    )

    assert response.status_code == 200
    data = response.json()

    # Verify all returned items match filter
    for item in data["data"]:
        assert item[filter_field] == filter_value


def test_get_by_id_returns_correct_resource(api_path, headers):
    """
    Pattern: Get by ID returns the exact resource

    Use when: Testing GET /{id} endpoint
    """
    # Create a resource
    create_payload = {"name": "test_resource"}
    create_response = requests.post(
        f"{BASE_URL}{api_path}",
        json=create_payload,
        headers=headers,
        verify=False
    )
    resource_id = create_response.json()["data"]["id"]

    # Get it by ID
    response = requests.get(
        f"{BASE_URL}{api_path}/{resource_id}",
        headers=headers,
        verify=False
    )

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["id"] == resource_id
    assert data["data"]["name"] == "test_resource"


# ============================================================================
# UPDATE (PUT/PATCH) Test Patterns
# ============================================================================

def test_put_replaces_all_fields(api_path, headers):
    """
    Pattern: PUT replaces entire resource

    Use when: Testing that PUT is a full replacement, not merge
    """
    # Create resource with multiple fields
    create_payload = {
        "field1": "value1",
        "field2": "value2",
        "field3": "value3"
    }
    create_response = requests.post(
        f"{BASE_URL}{api_path}",
        json=create_payload,
        headers=headers,
        verify=False
    )
    resource_id = create_response.json()["data"]["id"]

    # PUT with only field1
    put_payload = {
        "field1": "new_value1"
    }
    response = requests.put(
        f"{BASE_URL}{api_path}/{resource_id}",
        json=put_payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 200
    data = response.json()

    # field1 should be updated
    assert data["data"]["field1"] == "new_value1"
    # field2 and field3 should be reset to defaults (not preserved)


def test_patch_updates_only_specified_fields(api_path, headers):
    """
    Pattern: PATCH updates only specified fields

    Use when: Testing that PATCH is a partial update, not replacement
    """
    # Create resource with multiple fields
    create_payload = {
        "field1": "value1",
        "field2": "value2",
        "field3": "value3"
    }
    create_response = requests.post(
        f"{BASE_URL}{api_path}",
        json=create_payload,
        headers=headers,
        verify=False
    )
    resource_id = create_response.json()["data"]["id"]
    original_data = create_response.json()["data"]

    # PATCH with only field1
    patch_payload = {
        "field1": "new_value1"
    }
    response = requests.patch(
        f"{BASE_URL}{api_path}/{resource_id}",
        json=patch_payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 200
    data = response.json()

    # field1 should be updated
    assert data["data"]["field1"] == "new_value1"
    # field2 and field3 should be unchanged
    assert data["data"]["field2"] == original_data["field2"]
    assert data["data"]["field3"] == original_data["field3"]


def test_update_with_no_changes(api_path, headers):
    """
    Pattern: Update with same values (idempotency test)

    Use when: Verifying that updates are idempotent
    """
    # Create resource
    create_payload = {"field": "value"}
    create_response = requests.post(
        f"{BASE_URL}{api_path}",
        json=create_payload,
        headers=headers,
        verify=False
    )
    resource_id = create_response.json()["data"]["id"]

    # Update with same values
    response = requests.patch(
        f"{BASE_URL}{api_path}/{resource_id}",
        json=create_payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 200
    data = response.json()
    assert data["data"]["field"] == "value"


# ============================================================================
# DELETE Test Patterns
# ============================================================================

def test_delete_is_permanent(api_path, headers):
    """
    Pattern: Verify delete is permanent

    Use when: Testing that DELETE actually removes resource
    """
    # Create resource
    create_payload = {"name": "to_delete"}
    create_response = requests.post(
        f"{BASE_URL}{api_path}",
        json=create_payload,
        headers=headers,
        verify=False
    )
    resource_id = create_response.json()["data"]["id"]

    # Delete it
    delete_response = requests.delete(
        f"{BASE_URL}{api_path}/{resource_id}",
        headers=headers,
        verify=False
    )
    assert delete_response.status_code in [200, 204]

    # Verify it's gone
    get_response = requests.get(
        f"{BASE_URL}{api_path}/{resource_id}",
        headers=headers,
        verify=False
    )
    assert get_response.status_code == 404

    # Verify it's not in list
    list_response = requests.get(
        f"{BASE_URL}{api_path}",
        headers=headers,
        verify=False
    )
    ids = [item["id"] for item in list_response.json()["data"]]
    assert resource_id not in ids


def test_delete_is_idempotent(api_path, headers):
    """
    Pattern: Verify DELETE is idempotent (deleting twice doesn't error)

    Use when: Testing that multiple deletes of same resource return 404
    """
    # Create resource
    create_payload = {"name": "to_delete"}
    create_response = requests.post(
        f"{BASE_URL}{api_path}",
        json=create_payload,
        headers=headers,
        verify=False
    )
    resource_id = create_response.json()["data"]["id"]

    # Delete it first time
    response1 = requests.delete(
        f"{BASE_URL}{api_path}/{resource_id}",
        headers=headers,
        verify=False
    )
    assert response1.status_code in [200, 204]

    # Delete it second time
    response2 = requests.delete(
        f"{BASE_URL}{api_path}/{resource_id}",
        headers=headers,
        verify=False
    )
    assert response2.status_code == 404


# ============================================================================
# Cascade and Reference Tests
# ============================================================================

def test_delete_with_foreign_key_constraint(parent_path, child_path, headers):
    """
    Pattern: Test that deleting parent with children fails or cascades

    Use when: Testing foreign key relationships
    """
    # Create parent
    parent_payload = {"name": "parent"}
    parent_response = requests.post(
        f"{BASE_URL}{parent_path}",
        json=parent_payload,
        headers=headers,
        verify=False
    )
    parent_id = parent_response.json()["data"]["id"]

    # Create child referencing parent
    child_payload = {"parent_id": parent_id, "name": "child"}
    requests.post(
        f"{BASE_URL}{child_path}",
        json=child_payload,
        headers=headers,
        verify=False
    )

    # Try to delete parent
    delete_response = requests.delete(
        f"{BASE_URL}{parent_path}/{parent_id}",
        headers=headers,
        verify=False
    )

    # Should either:
    # 1. Return 400/409 (cannot delete parent with children)
    # 2. Return 200/204 and cascade delete children
    # Check which behavior is expected for this endpoint
    assert delete_response.status_code in [200, 204, 400, 409]
