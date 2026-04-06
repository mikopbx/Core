#!/usr/bin/env python3
"""Test suite for IVR Menu operations"""
import pytest
from conftest import assert_api_success

class TestIvrMenu:
    def test_01_get_default_template(self, api_client):
        response = api_client.get('ivr-menu:getDefault')
        assert_api_success(response, "Failed to get default template")
        print(f"✓ Retrieved default IVR menu template")
    def test_02_get_list(self, api_client):
        response = api_client.get('ivr-menu', params={'limit': 20})
        assert_api_success(response, "Failed to get list")
        data = response['data']
        print(f"✓ Retrieved {len(data)} IVR menus")
    def test_03_get_by_id(self, api_client, sample_ivr_menu):
        response = api_client.get(f'ivr-menu/{sample_ivr_menu}')
        assert_api_success(response, "Failed to get record")
        print(f"✓ Retrieved IVR menu: {sample_ivr_menu}")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
