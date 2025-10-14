#!/usr/bin/env python3
"""Test suite for Call Queues operations"""
import pytest
from conftest import assert_api_success

class TestCallQueues:
    sample_id = None
    def test_01_get_default_template(self, api_client):
        response = api_client.get('call-queues:getDefault')
        assert_api_success(response, "Failed to get default template")
        print(f"✓ Retrieved default call queue template")
    def test_02_get_list(self, api_client):
        response = api_client.get('call-queues', params={'limit': 20})
        assert_api_success(response, "Failed to get list")
        data = response['data']
        print(f"✓ Retrieved {len(data)} call queues")
        if len(data) > 0 and 'id' in data[0]:
            TestCallQueues.sample_id = data[0]['id']
    def test_03_get_by_id(self, api_client):
        if not TestCallQueues.sample_id:
            pytest.skip("No sample ID")
        response = api_client.get(f'call-queues/{TestCallQueues.sample_id}')
        assert_api_success(response, "Failed to get record")
        print(f"✓ Retrieved call queue: {TestCallQueues.sample_id}")
    def test_04_search(self, api_client):
        response = api_client.get('call-queues', params={'search': 'queue', 'limit': 10})
        assert_api_success(response, "Failed to search")
        print(f"✓ Search works")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
