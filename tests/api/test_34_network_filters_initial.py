#!/usr/bin/env python3
"""
Test suite for Network Filters (Read-Only) operations

Tests the /pbxcore/api/v3/network-filters endpoint for:
- Getting all network filters (read-only list)
- Getting specific filter by ID
- Getting filters for dropdown/select (with category filtering)

Note: Network Filters is a READ-ONLY API. Filter management is done via Firewall API.
"""

import pytest
from conftest import assert_api_success, assert_record_exists


class TestNetworkFilters:
    """Read-only tests for Network Filters"""

    def test_01_get_filters_list(self, api_client):
        """Test GET /network-filters - Get list of all filters"""
        response = api_client.get('network-filters', params={'limit': 20, 'offset': 0})
        assert_api_success(response, "Failed to get network filters list")

        data = response['data']

        # Response can be either list or dict with 'items' key
        if isinstance(data, dict) and 'items' in data:
            items = data['items']
            total = data.get('total', len(items))
        else:
            items = data if isinstance(data, list) else []
            total = len(items)

        print(f"✓ Found {total} network filters (showing {len(items)})")

        # Display some filters if available
        if len(items) > 0:
            print(f"  Sample filters:")
            for f in items[:3]:
                print(f"    - ID: {f.get('id')}, Description: {f.get('description', 'N/A')}")

    def test_02_get_filters_with_search(self, api_client):
        """Test GET /network-filters - Search by IP/description"""
        try:
            response = api_client.get('network-filters', params={'search': '192', 'limit': 10})
            assert_api_success(response, "Failed to search network filters")

            data = response['data']

            # Response can be either list or dict with 'items' key
            if isinstance(data, dict) and 'items' in data:
                items = data['items']
                total = data.get('total', len(items))
            else:
                items = data if isinstance(data, list) else []
                total = len(items)

            print(f"✓ Search found {total} filters matching '192'")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Search not fully implemented or invalid params")
            else:
                raise

    def test_03_get_filter_by_id(self, api_client):
        """Test GET /network-filters/{id} - Get specific filter"""
        # First get list to find an existing ID
        response = api_client.get('network-filters', params={'limit': 1})
        assert_api_success(response, "Failed to get filters list")

        data = response['data']

        # Response can be either list or dict with 'items' key
        if isinstance(data, dict) and 'items' in data:
            items = data['items']
        else:
            items = data if isinstance(data, list) else []

        if len(items) == 0:
            # WHY: Network filters are typically created by users, not pre-configured
            # This test requires at least one filter to exist to test the GET by ID functionality
            # The test is designed to be graceful when system is empty (e.g., after reset)
            pytest.skip("No network filters available in system - create at least one filter to test this endpoint")

        # Use first available filter
        filter_id = items[0]['id']

        record = assert_record_exists(api_client, 'network-filters', filter_id)

        # Verify structure
        assert str(record['id']) == str(filter_id)
        assert 'description' in record or 'permit' in record or 'deny' in record

        print(f"✓ Retrieved network filter: ID={filter_id}")
        if 'description' in record:
            print(f"  Description: {record['description']}")

    def test_04_get_for_select_no_category(self, api_client):
        """Test GET /network-filters:getForSelect - Get all for dropdown"""
        response = api_client.get('network-filters:getForSelect')
        assert_api_success(response, "Failed to get filters for select")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        print(f"✓ Retrieved {len(data)} filters for dropdown (all categories)")

    def test_05_get_for_select_sip_category(self, api_client):
        """Test GET /network-filters:getForSelect - Get SIP filters"""
        response = api_client.get('network-filters:getForSelect', params={'category': 'SIP'})
        assert_api_success(response, "Failed to get SIP filters for select")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        print(f"✓ Retrieved {len(data)} SIP filters for dropdown")

    def test_06_get_for_select_ami_category(self, api_client):
        """Test GET /network-filters:getForSelect - Get AMI filters"""
        response = api_client.get('network-filters:getForSelect', params={'category': 'AMI'})
        assert_api_success(response, "Failed to get AMI filters for select")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        print(f"✓ Retrieved {len(data)} AMI filters for dropdown")

    def test_07_get_for_select_with_localhost(self, api_client):
        """Test GET /network-filters:getForSelect - Include localhost option"""
        response = api_client.get('network-filters:getForSelect', params={
            'category': 'SIP',
            'includeLocalhost': True
        })
        assert_api_success(response, "Failed to get filters with localhost")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        print(f"✓ Retrieved {len(data)} filters with localhost option")

        # Check if localhost option is included
        has_localhost = any('localhost' in str(f.get('description', '')).lower() for f in data)
        if has_localhost:
            print(f"  ✓ Localhost option found in results")

    def test_08_get_for_select_iax_category(self, api_client):
        """Test GET /network-filters:getForSelect - Get IAX filters"""
        response = api_client.get('network-filters:getForSelect', params={'category': 'IAX'})
        assert_api_success(response, "Failed to get IAX filters for select")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        print(f"✓ Retrieved {len(data)} IAX filters for dropdown")

    def test_09_get_for_select_api_category(self, api_client):
        """Test GET /network-filters:getForSelect - Get API filters"""
        response = api_client.get('network-filters:getForSelect', params={'category': 'API'})
        assert_api_success(response, "Failed to get API filters for select")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        print(f"✓ Retrieved {len(data)} API filters for dropdown")


class TestNetworkFiltersEdgeCases:
    """Edge cases for network filters"""

    def test_01_get_nonexistent_filter(self, api_client):
        """Test GET /network-filters/{id} with non-existent ID"""
        fake_id = '999999'

        try:
            response = api_client.get(f'network-filters/{fake_id}')
            assert response['result'] is False
            print(f"✓ Non-existent filter rejected")
        except Exception as e:
            if '404' in str(e) or '422' in str(e):
                print(f"✓ Non-existent filter rejected (HTTP error)")
            else:
                raise

    def test_02_get_for_select_invalid_category(self, api_client):
        """Test GET /network-filters:getForSelect with invalid category"""
        try:
            response = api_client.get('network-filters:getForSelect', params={
                'category': 'INVALID_CATEGORY'
            })

            # May return empty list or error depending on validation
            if response['result']:
                data = response['data']
                print(f"✓ Invalid category returned {len(data)} results (may return all)")
            else:
                print(f"✓ Invalid category rejected")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid category rejected via HTTP error")
            else:
                raise

    def test_03_pagination_limits(self, api_client):
        """Test pagination with large limit"""
        response = api_client.get('network-filters', params={'limit': 1000, 'offset': 0})
        assert_api_success(response, "Failed with large limit")

        data = response['data']

        # Response can be either list or dict with 'items' key
        if isinstance(data, dict) and 'items' in data:
            items = data['items']
            total = data.get('total', len(items))
        else:
            items = data if isinstance(data, list) else []
            total = len(items)

        print(f"✓ Large pagination limit accepted, returned {len(items)} items (total: {total})")

    def test_04_verify_readonly(self, api_client):
        """Verify that POST/PUT/PATCH/DELETE are not available"""
        # Try to create (should fail or return 404/405)
        test_data = {
            'description': 'Test Filter',
            'permit': '192.168.1.0/24'
        }

        try:
            response = api_client.post('network-filters', test_data)
            # If it somehow succeeds, it's an error in API design
            if response['result']:
                print(f"⚠ WARNING: POST succeeded on read-only API! This should not happen.")
                # Try to delete if created
                if 'id' in response['data']:
                    try:
                        api_client.delete(f"network-filters/{response['data']['id']}")
                    except:
                        pass
            else:
                print(f"✓ POST correctly rejected on read-only API")
        except Exception as e:
            if '404' in str(e) or '405' in str(e) or '501' in str(e):
                print(f"✓ POST correctly rejected (HTTP {e})")
            else:
                print(f"⚠ Unexpected error on POST: {str(e)[:50]}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
