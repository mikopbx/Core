#!/usr/bin/env python3
"""
Test suite for automatic Response Schema Validation

Tests that all API responses match their declared OpenAPI schemas.
Uses ResponseSchemaValidator in strict mode to catch violations.

USAGE:
    # Run with strict validation (recommended for CI/CD)
    SCHEMA_VALIDATION_STRICT=1 python3 -m pytest test_schema_validation.py -v

    # Or without strict mode (just logs violations)
    python3 -m pytest test_schema_validation.py -v

When SCHEMA_VALIDATION_STRICT=1 is set, the backend will throw exceptions
on any schema violations, causing tests to fail immediately.
"""

import pytest
import requests
import os
from conftest import assert_api_success


class TestResponseSchemaValidation:
    """Tests for automatic schema validation

    NOTE: These tests validate that API responses match their OpenAPI schemas.
    Set SCHEMA_VALIDATION_STRICT=1 environment variable to enable strict mode.
    """

    @pytest.fixture(scope="class", autouse=True)
    def check_strict_mode(self):
        """Check if strict mode is enabled"""
        strict_mode = os.getenv('SCHEMA_VALIDATION_STRICT', '0')
        if strict_mode in ['1', 'true', 'yes', 'on']:
            print("\n✓ Schema validation STRICT MODE enabled")
            print("  Any schema violations will cause test failures")
        else:
            print("\n⚠ Schema validation in LOGGING MODE")
            print("  Violations will be logged but tests will pass")
            print("  Set SCHEMA_VALIDATION_STRICT=1 for strict validation")

        yield

    def test_asterisk_managers_schema(self, api_client):
        """Test that AsteriskManagers responses match schema"""
        # Get list - should validate against list schema
        response = api_client.get('asterisk-managers', params={'limit': 5})
        assert_api_success(response, "List response should match schema")
        print(f"✓ List response validated: {len(response['data'])} items")

        # Get single record - should validate against detail schema
        if response['data']:
            first_id = response['data'][0]['id']
            detail_response = api_client.get(f'asterisk-managers/{first_id}')
            assert_api_success(detail_response, "Detail response should match schema")
            print(f"✓ Detail response validated for ID {first_id}")

    def test_asterisk_rest_users_schema(self, api_client):
        """Test that AsteriskRestUsers responses match schema"""
        # Get list
        response = api_client.get('asterisk-rest-users', params={'limit': 5})
        assert_api_success(response, "List response should match schema")
        print(f"✓ List response validated: {len(response.get('data', {}).get('items', []))} items")

    def test_extensions_schema(self, api_client):
        """Test that Extensions responses match schema"""
        # Get list
        response = api_client.get('extensions', params={'limit': 5})
        assert_api_success(response, "List response should match schema")

        data = response.get('data', {})
        items = data.get('items', []) if isinstance(data, dict) else data
        print(f"✓ List response validated: {len(items)} items")

    def test_providers_schema(self, api_client):
        """Test that Providers responses match schema"""
        # Get list
        response = api_client.get('providers', params={'limit': 5})
        assert_api_success(response, "List response should match schema")

        data = response.get('data', [])
        print(f"✓ List response validated: {len(data)} items")


class TestSchemaViolationDetection:
    """Test that schema violations are properly detected"""

    def test_schema_violation_causes_failure_in_strict_mode(self, api_client):
        """
        This test documents expected behavior when schema violations occur.

        In strict mode, schema violations should cause the API to return an error.
        In normal mode, violations are only logged.

        NOTE: This test will pass only if there are NO schema violations.
        If it fails, check system logs for details about the violation.
        """
        # Enable strict mode
        try:
            api_client.post('system:setSchemaValidationStrictMode', {'enabled': True})
        except:
            pytest.skip("Schema validation endpoint not available")

        # Make a request that should have valid schema
        try:
            response = api_client.get('asterisk-managers', params={'limit': 1})

            # If we get here without exception, schema is valid
            assert response['result'] is True, "Request should succeed with valid schema"
            print("✓ No schema violations detected")

        except requests.exceptions.HTTPError as e:
            # If we get HTTP error, it might be due to schema violation
            if e.response.status_code == 500:
                print(f"❌ Schema violation detected! Check logs for details.")
                print(f"   Error: {e}")
                # In strict mode, this is expected behavior for violations
                pytest.fail("Schema violation detected - check system logs")
            else:
                raise
        finally:
            # Disable strict mode
            try:
                api_client.post('system:setSchemaValidationStrictMode', {'enabled': False})
            except:
                pass


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
