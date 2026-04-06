"""
Edge Case Test Patterns for MikoPBX REST API

This file provides patterns for testing boundary conditions, special characters,
and unusual input that might break the API.
"""
import pytest
import requests

BASE_URL = "https://mikopbx-php83.localhost:8445"


# ============================================================================
# String Field Edge Cases
# ============================================================================

def test_xss_prevention(api_path, string_field, headers):
    """
    Pattern: Test XSS attack prevention

    Use when: Testing that HTML/JavaScript is properly escaped
    """
    xss_payloads = [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert('xss')>",
        "javascript:alert('xss')",
        "<svg/onload=alert('xss')>",
        "';alert(String.fromCharCode(88,83,83))//",
    ]

    for xss_payload in xss_payloads:
        payload = {
            string_field: xss_payload,
            # Other required fields
        }

        response = requests.post(
            f"{BASE_URL}{api_path}",
            json=payload,
            headers=headers,
            verify=False
        )

        assert response.status_code == 200
        data = response.json()

        # Verify the exact string is stored (not executed or stripped)
        assert data["data"][string_field] == xss_payload, f"XSS payload not properly stored: {xss_payload}"


def test_sql_injection_prevention(api_path, string_field, headers):
    """
    Pattern: Test SQL injection prevention

    Use when: Verifying that SQL is properly escaped
    """
    sql_payloads = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT NULL, NULL--",
        "1' AND '1'='1",
    ]

    for sql_payload in sql_payloads:
        payload = {
            string_field: sql_payload,
            # Other required fields
        }

        response = requests.post(
            f"{BASE_URL}{api_path}",
            json=payload,
            headers=headers,
            verify=False
        )

        # Should either accept and escape, or reject
        assert response.status_code in [200, 400]

        if response.status_code == 200:
            # Verify exact string stored
            data = response.json()
            assert data["data"][string_field] == sql_payload


def test_unicode_characters(api_path, string_field, headers):
    """
    Pattern: Test Unicode character handling

    Use when: Verifying international character support
    """
    unicode_strings = [
        "Привет мир",  # Russian
        "你好世界",  # Chinese
        "مرحبا بالعالم",  # Arabic
        "🚀🌟💻",  # Emojis
        "Ñoño",  # Spanish accents
        "日本語テスト",  # Japanese
    ]

    for unicode_str in unicode_strings:
        payload = {
            string_field: unicode_str,
            # Other required fields
        }

        response = requests.post(
            f"{BASE_URL}{api_path}",
            json=payload,
            headers=headers,
            verify=False
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"][string_field] == unicode_str, f"Unicode not preserved: {unicode_str}"


def test_very_long_string(api_path, string_field, max_length, headers):
    """
    Pattern: Test maximum string length enforcement

    Use when: Verifying string length limits
    """
    # Test at max length
    max_string = "a" * max_length
    payload = {
        string_field: max_string,
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 200

    # Test over max length
    over_max_string = "a" * (max_length + 1)
    payload[string_field] = over_max_string

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=payload,
        headers=headers,
        verify=False
    )

    # Should reject
    assert response.status_code == 400


def test_special_characters(api_path, string_field, headers):
    """
    Pattern: Test special character handling

    Use when: Verifying that quotes, backslashes, etc. are handled
    """
    special_chars_tests = [
        "Test \"double quotes\"",
        "Test 'single quotes'",
        "Test \\ backslash",
        "Test / forward slash",
        "Test & ampersand",
        "Test < less than",
        "Test > greater than",
        "Test\nNewline",
        "Test\tTab",
        "Test\\r\\nCarriage return",
    ]

    for test_string in special_chars_tests:
        payload = {
            string_field: test_string,
            # Other required fields
        }

        response = requests.post(
            f"{BASE_URL}{api_path}",
            json=payload,
            headers=headers,
            verify=False
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"][string_field] == test_string


def test_empty_string_vs_null(api_path, optional_field, headers):
    """
    Pattern: Test empty string vs null handling

    Use when: Verifying distinction between empty string and null
    """
    # Test empty string
    empty_payload = {
        optional_field: "",
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=empty_payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 200
    data = response.json()
    assert data["data"][optional_field] == ""

    # Test null (omitted field)
    null_payload = {
        # optional_field omitted
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=null_payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 200
    data = response.json()
    # Should have default value or null
    assert optional_field in data["data"]


# ============================================================================
# Numeric Field Edge Cases
# ============================================================================

def test_numeric_boundary_values(api_path, numeric_field, min_val, max_val, headers):
    """
    Pattern: Test numeric boundary values

    Use when: Verifying min/max constraints
    """
    # Test minimum value
    min_payload = {
        numeric_field: min_val,
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=min_payload,
        headers=headers,
        verify=False
    )
    assert response.status_code == 200

    # Test maximum value
    max_payload = {
        numeric_field: max_val,
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=max_payload,
        headers=headers,
        verify=False
    )
    assert response.status_code == 200

    # Test below minimum
    below_min_payload = {
        numeric_field: min_val - 1,
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=below_min_payload,
        headers=headers,
        verify=False
    )
    assert response.status_code == 400

    # Test above maximum
    above_max_payload = {
        numeric_field: max_val + 1,
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=above_max_payload,
        headers=headers,
        verify=False
    )
    assert response.status_code == 400


def test_numeric_type_validation(api_path, integer_field, headers):
    """
    Pattern: Test numeric type validation

    Use when: Verifying that integer fields reject floats and strings
    """
    # Test string instead of integer
    string_payload = {
        integer_field: "not_a_number",
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=string_payload,
        headers=headers,
        verify=False
    )
    assert response.status_code == 400

    # Test float instead of integer
    float_payload = {
        integer_field: 123.45,
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=float_payload,
        headers=headers,
        verify=False
    )
    # Should either accept and truncate, or reject
    assert response.status_code in [200, 400]


def test_negative_numbers(api_path, numeric_field, headers):
    """
    Pattern: Test negative number handling

    Use when: Verifying negative numbers are rejected for unsigned fields
    """
    negative_payload = {
        numeric_field: -1,
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=negative_payload,
        headers=headers,
        verify=False
    )

    # Should reject if field is unsigned
    # Accept if field allows negative
    assert response.status_code in [200, 400]


def test_zero_value(api_path, numeric_field, headers):
    """
    Pattern: Test zero value handling

    Use when: Verifying zero is valid/invalid for specific fields
    """
    zero_payload = {
        numeric_field: 0,
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=zero_payload,
        headers=headers,
        verify=False
    )

    # Should accept or reject based on field definition
    assert response.status_code in [200, 400]


# ============================================================================
# Boolean Field Edge Cases
# ============================================================================

def test_boolean_string_coercion(api_path, boolean_field, headers):
    """
    Pattern: Test boolean string coercion

    Use when: Verifying "true"/"false" strings are handled
    """
    # Test string "true"
    true_string_payload = {
        boolean_field: "true",
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=true_string_payload,
        headers=headers,
        verify=False
    )

    # Should either coerce to boolean or reject
    assert response.status_code in [200, 400]

    # Test integer 1/0
    one_payload = {
        boolean_field: 1,
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=one_payload,
        headers=headers,
        verify=False
    )

    # Should either coerce to boolean or reject
    assert response.status_code in [200, 400]


# ============================================================================
# Pattern/Regex Field Edge Cases
# ============================================================================

def test_pattern_validation(api_path, pattern_field, valid_pattern, invalid_pattern, headers):
    """
    Pattern: Test regex pattern validation

    Use when: Field has regex constraint (e.g., email, phone number)
    """
    # Test valid pattern
    valid_payload = {
        pattern_field: valid_pattern,
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=valid_payload,
        headers=headers,
        verify=False
    )
    assert response.status_code == 200

    # Test invalid pattern
    invalid_payload = {
        pattern_field: invalid_pattern,
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=invalid_payload,
        headers=headers,
        verify=False
    )
    assert response.status_code == 400


# ============================================================================
# Concurrent Access Edge Cases
# ============================================================================

def test_concurrent_updates(api_path, headers):
    """
    Pattern: Test concurrent update handling

    Use when: Testing optimistic locking or last-write-wins
    """
    # Create resource
    create_payload = {"field": "initial"}
    create_response = requests.post(
        f"{BASE_URL}{api_path}",
        json=create_payload,
        headers=headers,
        verify=False
    )
    resource_id = create_response.json()["data"]["id"]

    # Update 1
    update1_payload = {"field": "update1"}
    response1 = requests.patch(
        f"{BASE_URL}{api_path}/{resource_id}",
        json=update1_payload,
        headers=headers,
        verify=False
    )

    # Update 2 (concurrent)
    update2_payload = {"field": "update2"}
    response2 = requests.patch(
        f"{BASE_URL}{api_path}/{resource_id}",
        json=update2_payload,
        headers=headers,
        verify=False
    )

    # Both should succeed (last write wins)
    assert response1.status_code == 200
    assert response2.status_code == 200

    # Final value should be from update2
    get_response = requests.get(
        f"{BASE_URL}{api_path}/{resource_id}",
        headers=headers,
        verify=False
    )
    assert get_response.json()["data"]["field"] == "update2"


# ============================================================================
# Null and Missing Field Edge Cases
# ============================================================================

def test_null_in_required_field(api_path, required_field, headers):
    """
    Pattern: Test null in required field

    Use when: Verifying required fields reject null
    """
    null_payload = {
        required_field: None,
        # Other required fields
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=null_payload,
        headers=headers,
        verify=False
    )

    assert response.status_code == 400


def test_extra_fields_ignored(api_path, headers):
    """
    Pattern: Test that extra unknown fields are ignored

    Use when: Verifying API ignores unexpected fields
    """
    payload = {
        "valid_field": "value",
        "unknown_field": "should_be_ignored",
        "another_unknown": 123,
    }

    response = requests.post(
        f"{BASE_URL}{api_path}",
        json=payload,
        headers=headers,
        verify=False
    )

    # Should succeed and ignore unknown fields
    assert response.status_code == 200
    data = response.json()

    # Unknown fields should not be in response
    assert "unknown_field" not in data["data"]
    assert "another_unknown" not in data["data"]
