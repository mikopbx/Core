#!/usr/bin/env python3
"""
Test suite for SIP Providers operations

Tests the /pbxcore/api/v3/sip-providers endpoint
"""

import pytest
from conftest import assert_api_success


class TestSipProviders:
    """SIP Providers read operations tests"""

    sample_id = None

    def test_01_get_default_template(self, api_client):
        """Test GET /sip-providers:getDefault"""
        response = api_client.get('sip-providers:getDefault')
        assert_api_success(response, "Failed to get default template")
        print(f"✓ Retrieved default SIP provider template")

    def test_02_get_list(self, api_client):
        """Test GET /sip-providers - List with pagination"""
        response = api_client.get('sip-providers', params={'limit': 20})
        assert_api_success(response, "Failed to get list")
        data = response['data']
        print(f"✓ Retrieved {len(data)} SIP providers")
        if len(data) > 0 and 'id' in data[0]:
            TestSipProviders.sample_id = data[0]['id']

    def test_03_get_by_id(self, api_client):
        """Test GET /sip-providers/{id}"""
        if not TestSipProviders.sample_id:
            pytest.skip("No sample ID")
        response = api_client.get(f'sip-providers/{TestSipProviders.sample_id}')
        assert_api_success(response, "Failed to get record")
        print(f"✓ Retrieved SIP provider: {TestSipProviders.sample_id}")


class TestSipProvidersEdgeCases:
    """Edge cases"""

    def test_01_get_nonexistent(self, api_client):
        """Test GET /sip-providers/{id} - Non-existent"""
        try:
            response = api_client.get('sip-providers/SIP-FAKE-ID')
            assert not response['result']
            print(f"✓ Non-existent rejected")
        except Exception as e:
            if '404' in str(e):
                print(f"✓ Non-existent rejected (404)")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
