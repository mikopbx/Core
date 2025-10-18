#!/usr/bin/env python3
"""Test suite for IAX Providers operations"""
import pytest
from conftest import assert_api_success

class TestIaxProviders:
    def test_01_get_default_template(self, api_client):
        response = api_client.get('iax-providers:getDefault')
        assert_api_success(response, "Failed to get default template")
        print(f"✓ Retrieved default IAX provider template")
    def test_02_get_list(self, api_client):
        response = api_client.get('iax-providers', params={'limit': 20})
        assert_api_success(response, "Failed to get list")
        data = response['data']
        print(f"✓ Retrieved {len(data)} IAX providers")
    def test_03_get_by_id(self, api_client, sample_iax_provider):
        response = api_client.get(f'iax-providers/{sample_iax_provider}')
        assert_api_success(response, "Failed to get record")
        print(f"✓ Retrieved IAX provider: {sample_iax_provider}")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
