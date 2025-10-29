#!/usr/bin/env python3
"""
Test SIP Providers manualattributes base64 encoding/decoding

This test verifies that manualattributes field is properly:
1. Encoded to base64 when saving via API
2. Decoded from base64 when reading via API
3. Stored as base64 in the database

Related bug fix: manualattributes was stored as plain text instead of base64
"""

import base64
import pytest
import sqlite3
from conftest import assert_api_success


class TestSIPProvidersManualAttributes:
    """Test suite for SIP providers manualattributes base64 encoding"""

    created_provider_id = None

    def test_01_create_provider_with_manualattributes(self, api_client):
        """Test creating SIP provider with manualattributes - should encode to base64"""
        test_data = {
            "type": "SIP",
            "description": "Test Provider for manualattributes",
            "host": "sip.test.com",
            "username": "testuser",
            "secret": "TestSecret123",
            "port": 5060,
            "transport": "udp",
            "registration_type": "outbound",
            "manualattributes": "[endpoint]\nset_var=TEST_VAR=TEST_VALUE\nset_var=ANOTHER_VAR=ANOTHER_VALUE"
        }

        # Create provider
        response = api_client.post("sip-providers", test_data)
        assert_api_success(response, "Failed to create provider")

        provider_id = response['data']['id']
        TestSIPProvidersManualAttributes.created_provider_id = provider_id

        # Verify manualattributes in response (should be decoded)
        assert response['data']['manualattributes'] == test_data['manualattributes']
        print(f"✓ Created provider {provider_id} with manualattributes")

    def test_02_read_provider_manualattributes_decoded(self, api_client):
        """Test reading provider - manualattributes should be decoded from base64"""
        provider_id = TestSIPProvidersManualAttributes.created_provider_id

        response = api_client.get(f"sip-providers/{provider_id}")
        assert_api_success(response, "Failed to get provider")

        # Verify manualattributes is properly decoded
        expected = "[endpoint]\nset_var=TEST_VAR=TEST_VALUE\nset_var=ANOTHER_VAR=ANOTHER_VALUE"
        assert response['data']['manualattributes'] == expected, \
            f"manualattributes not properly decoded: {response['data']['manualattributes']}"
        print(f"✓ manualattributes correctly decoded from base64")

    def test_03_database_stores_base64(self, api_client):
        """Test that database stores manualattributes as base64, not plain text"""
        provider_id = TestSIPProvidersManualAttributes.created_provider_id

        # Get provider uniqid from API
        response = api_client.get(f"sip-providers/{provider_id}")
        uniqid = response['data']['id']

        # Connect to database and check raw value
        conn = sqlite3.connect('/cf/conf/mikopbx.db')
        cursor = conn.cursor()

        cursor.execute("SELECT manualattributes FROM m_Sip WHERE uniqid = ?", (uniqid,))
        row = cursor.fetchone()
        conn.close()

        assert row is not None, f"Provider {uniqid} not found in database"

        db_value = row[0]

        # Verify it's valid base64
        try:
            decoded = base64.b64decode(db_value).decode('utf-8')
            expected = "[endpoint]\nset_var=TEST_VAR=TEST_VALUE\nset_var=ANOTHER_VAR=ANOTHER_VALUE"
            assert decoded == expected, f"Decoded value doesn't match: {decoded}"
            print(f"✓ Database value is valid base64")
        except Exception as e:
            pytest.fail(f"Database value is not valid base64: {db_value}, error: {e}")

        # Verify it's NOT plain text (would contain '[endpoint]' if not encoded)
        assert '[endpoint]' not in db_value, \
            "Database contains plain text instead of base64!"
        print(f"✓ Database does not contain plain text")

    def test_04_update_provider_manualattributes(self, api_client):
        """Test updating manualattributes via PATCH - should re-encode to base64"""
        provider_id = TestSIPProvidersManualAttributes.created_provider_id

        new_attributes = "[endpoint]\nset_var=UPDATED_VAR=UPDATED_VALUE"

        response = api_client.patch(f"sip-providers/{provider_id}", {
            "manualattributes": new_attributes
        })

        assert_api_success(response, "Failed to update provider")

        # Verify updated value in response
        assert response['data']['manualattributes'] == new_attributes
        print(f"✓ Updated manualattributes via PATCH")

    def test_05_database_updated_value_is_base64(self, api_client):
        """Test that updated manualattributes is also base64 encoded in database"""
        provider_id = TestSIPProvidersManualAttributes.created_provider_id

        # Get provider uniqid from API
        response = api_client.get(f"sip-providers/{provider_id}")
        uniqid = response['data']['id']

        # Check database
        conn = sqlite3.connect('/cf/conf/mikopbx.db')
        cursor = conn.cursor()

        cursor.execute("SELECT manualattributes FROM m_Sip WHERE uniqid = ?", (uniqid,))
        row = cursor.fetchone()
        conn.close()

        db_value = row[0]

        # Verify it's valid base64
        try:
            decoded = base64.b64decode(db_value).decode('utf-8')
            expected = "[endpoint]\nset_var=UPDATED_VAR=UPDATED_VALUE"
            assert decoded == expected
            print(f"✓ Updated value is base64 encoded in database")
        except Exception as e:
            pytest.fail(f"Updated value is not valid base64: {e}")

    def test_06_cleanup_test_provider(self, api_client):
        """Clean up test provider"""
        provider_id = TestSIPProvidersManualAttributes.created_provider_id

        response = api_client.delete(f"sip-providers/{provider_id}")
        assert_api_success(response, "Failed to delete provider")
        print(f"✓ Deleted test provider {provider_id}")
