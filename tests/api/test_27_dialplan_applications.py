#!/usr/bin/env python3
"""Test suite for Dialplan Applications operations"""
import pytest
from conftest import assert_api_success

class TestDialplanApplications:
    sample_id = None
    def test_01_get_default_template(self, api_client):
        response = api_client.get('dialplan-applications:getDefault')
        assert_api_success(response, "Failed to get default template")
        print(f"✓ Retrieved default dialplan application template")
    def test_02_get_list(self, api_client):
        response = api_client.get('dialplan-applications', params={'limit': 20})
        assert_api_success(response, "Failed to get list")
        data = response['data']
        print(f"✓ Retrieved {len(data)} dialplan applications")
        if len(data) > 0 and 'id' in data[0]:
            TestDialplanApplications.sample_id = data[0]['id']
    def test_03_get_by_id(self, api_client):
        if not TestDialplanApplications.sample_id:
            pytest.skip("No sample ID")
        response = api_client.get(f'dialplan-applications/{TestDialplanApplications.sample_id}')
        assert_api_success(response, "Failed to get record")
        print(f"✓ Retrieved dialplan application: {TestDialplanApplications.sample_id}")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
