#!/usr/bin/env python3
"""Test suite for Incoming Routes operations"""
import pytest
from conftest import assert_api_success

class TestIncomingRoutes:
    def test_01_get_default_template(self, api_client):
        response = api_client.get('incoming-routes:getDefault')
        assert_api_success(response, "Failed to get default template")
        print(f"✓ Retrieved default incoming route template")
    def test_02_get_list(self, api_client):
        response = api_client.get('incoming-routes', params={'limit': 20})
        assert_api_success(response, "Failed to get list")
        data = response['data']
        print(f"✓ Retrieved {len(data)} incoming routes")
    def test_03_get_by_id(self, api_client, sample_incoming_route):
        response = api_client.get(f'incoming-routes/{sample_incoming_route}')
        assert_api_success(response, "Failed to get record")
        print(f"✓ Retrieved incoming route: {sample_incoming_route}")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
