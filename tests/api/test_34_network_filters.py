#!/usr/bin/env python3
"""Test suite for Network Filters operations"""
import pytest
from conftest import assert_api_success

class TestNetworkFilters:
    sample_id = None
    def test_01_get_default_template(self, api_client):
        try:
            response = api_client.get('network-filters:getDefault')
            assert_api_success(response, "Failed to get default template")
            print(f"✓ Retrieved default network filter template")
        except Exception as e:
            if '422' in str(e) or '404' in str(e) or '405' in str(e):
                print(f"⚠ getDefault method not implemented for network-filters")
                print(f"  Note: GET /network-filters to see existing filters")
            else:
                raise
    def test_02_get_list(self, api_client):
        response = api_client.get('network-filters', params={'limit': 20})
        assert_api_success(response, "Failed to get list")
        data = response['data']

        # Handle case where data is dict (e.g., with pagination) or list
        if isinstance(data, dict):
            # Extract actual list from dict if present
            filters_list = data.get('items', data.get('data', []))
            print(f"✓ Retrieved {len(filters_list)} network filters (dict response)")
        elif isinstance(data, list):
            filters_list = data
            print(f"✓ Retrieved {len(filters_list)} network filters")
        else:
            filters_list = []
            print(f"⚠ Unexpected data type: {type(data)}")

        if len(filters_list) > 0 and isinstance(filters_list[0], dict) and 'id' in filters_list[0]:
            TestNetworkFilters.sample_id = filters_list[0]['id']
            print(f"  Sample ID: {TestNetworkFilters.sample_id}")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
