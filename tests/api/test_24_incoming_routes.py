#!/usr/bin/env python3
"""Test suite for Incoming Routes operations"""
import pytest
from conftest import assert_api_success

class TestIncomingRoutes:
    sample_id = None
    def test_01_get_default_template(self, api_client):
        response = api_client.get('incoming-routes:getDefault')
        assert_api_success(response, "Failed to get default template")
        print(f"✓ Retrieved default incoming route template")
    def test_02_get_list(self, api_client):
        response = api_client.get('incoming-routes', params={'limit': 20})
        assert_api_success(response, "Failed to get list")
        data = response['data']
        print(f"✓ Retrieved {len(data)} incoming routes")
        if len(data) > 0 and 'id' in data[0]:
            TestIncomingRoutes.sample_id = data[0]['id']
    def test_03_get_by_id(self, api_client):
        if not TestIncomingRoutes.sample_id:
            pytest.skip("No sample ID")
        response = api_client.get(f'incoming-routes/{TestIncomingRoutes.sample_id}')
        assert_api_success(response, "Failed to get record")
        print(f"✓ Retrieved incoming route: {TestIncomingRoutes.sample_id}")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
