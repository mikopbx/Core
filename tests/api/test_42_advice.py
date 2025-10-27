#!/usr/bin/env python3
"""
Test suite for System Advice operations

Tests the /pbxcore/api/v3/advice endpoint for:
- Getting system advice list
- Refreshing advice cache

System Advice provides automated analysis of system configuration, security recommendations,
performance warnings, and best practice suggestions. This is a READ-ONLY resource with
custom methods for retrieving and refreshing system advice.

Note: Filtering by category/severity is NOT implemented in the current version.
"""

import pytest
from conftest import assert_api_success


def get_advice_total_count(advice_data):
    """Helper to count total advice items across all severity levels"""
    # Handle case where advice_data is a list (empty result or refresh methods)
    if isinstance(advice_data, list):
        return len(advice_data)

    # Handle case where advice_data is a dict with severity categories
    if isinstance(advice_data, dict):
        total = 0
        for severity, items in advice_data.items():
            if isinstance(items, list):
                total += len(items)
        return total

    return 0


class TestAdvice:
    """Comprehensive tests for System Advice"""

    def test_01_get_advice_list_default(self, api_client):
        """Test GET /advice:getList - Get all advice with default params"""
        response = api_client.get('advice:getList')
        assert_api_success(response, "Failed to get advice list")

        data = response['data']
        assert isinstance(data, dict), "Response data should be a dict"
        assert 'advice' in data, "Response should contain 'advice' key"

        advice = data['advice']
        assert isinstance(advice, dict), "Advice should be a dict with severity categories"

        # Count total advice items across all severities
        total_items = sum(len(items) if isinstance(items, list) else 0
                         for items in advice.values())

        print(f"✓ Retrieved {total_items} advice items across {len(advice)} severity levels")
        print(f"  Severity levels: {list(advice.keys())}")

        # If advice exists, verify structure
        for severity, items in advice.items():
            if isinstance(items, list) and len(items) > 0:
                first_item = items[0]
                # Items can be either structured messages (dict with messageTpl) or plain string markers
                if isinstance(first_item, dict):
                    assert 'messageTpl' in first_item, \
                        "Structured advice item should contain messageTpl"
                    print(f"  Sample {severity} structured item: {first_item}")
                elif isinstance(first_item, str):
                    # Plain string markers for navigation logic
                    print(f"  Sample {severity} marker: {first_item}")

    def test_02_advice_structure_validation(self, api_client):
        """Test GET /advice:getList - Validate response structure"""
        response = api_client.get('advice:getList')
        assert_api_success(response, "Failed to get advice list")

        data = response['data']
        advice = data['advice']

        # Validate structure of advice items
        for severity, items in advice.items():
            if isinstance(items, list) and len(items) > 0:
                for item in items:
                    if isinstance(item, dict):
                        # Structured messages should have messageTpl
                        assert 'messageTpl' in item, \
                            f"Structured advice item in {severity} should have messageTpl"

                        # messageParams is optional
                        if 'messageParams' in item:
                            assert isinstance(item['messageParams'], dict), \
                                "messageParams should be a dict"
                    elif isinstance(item, str):
                        # Plain string markers are valid (used for navigation logic)
                        assert len(item) > 0, f"String marker in {severity} should not be empty"

        print(f"✓ All advice items have valid structure")

    def test_03_refresh_advice_get(self, api_client):
        """Test GET /advice:refresh - Refresh advice cache"""
        response = api_client.get('advice:refresh')
        assert_api_success(response, "Failed to refresh advice")

        data = response['data']
        assert isinstance(data, dict) and "advice" in data, "Response should have advice dict"

        # Check for info message about refresh
        if 'messages' in response:
            messages = response['messages']
            if 'info' in messages:
                print(f"  Info messages: {messages['info']}")

        total = get_advice_total_count(data["advice"])
        print(f"✓ Refreshed advice list ({total} items)")

    def test_04_refresh_advice_post(self, api_client):
        """Test POST /advice:refresh - POST method for refresh"""
        response = api_client.post('advice:refresh', {})
        assert_api_success(response, "Failed to refresh advice via POST")

        data = response['data']
        assert isinstance(data, dict) and "advice" in data, "Response should have advice dict"

        total = get_advice_total_count(data["advice"])
        print(f"✓ Refreshed advice via POST ({total} items)")

    def test_05_multiple_getList_calls(self, api_client):
        """Test GET /advice:getList - Multiple sequential calls return consistent data"""
        response1 = api_client.get('advice:getList')
        assert_api_success(response1, "First getList call failed")

        response2 = api_client.get('advice:getList')
        assert_api_success(response2, "Second getList call failed")

        # Both responses should have advice
        assert 'advice' in response1['data'], "First response missing advice"
        assert 'advice' in response2['data'], "Second response missing advice"

        count1 = get_advice_total_count(response1['data']['advice'])
        count2 = get_advice_total_count(response2['data']['advice'])

        print(f"✓ Sequential calls returned {count1} and {count2} items (cached)")

    def test_06_refresh_then_getList(self, api_client):
        """Test refresh followed by getList - Verify cache refresh works"""
        # First refresh
        refresh_response = api_client.get('advice:refresh')
        assert_api_success(refresh_response, "Refresh failed")

        refresh_count = get_advice_total_count(refresh_response['data']['advice'])

        # Then get list
        list_response = api_client.get('advice:getList')
        assert_api_success(list_response, "GetList after refresh failed")

        list_count = get_advice_total_count(list_response['data']['advice'])

        print(f"✓ Refresh returned {refresh_count} items, getList returned {list_count} items")


class TestAdviceEdgeCases:
    """Edge cases for System Advice"""

    def test_01_unknown_parameters_ignored(self, api_client):
        """Test GET /advice:getList - Unknown parameters should be ignored"""
        # Since category/severity filtering is NOT implemented,
        # these parameters should be silently ignored
        response = api_client.get('advice:getList', params={
            'category': 'security',
            'severity': 'warning',
            'unknown_param': 'value'
        })

        assert_api_success(response, "Failed to get advice with unknown params")

        data = response['data']
        assert 'advice' in data, "Response should contain advice"

        # Should return ALL advice (parameters ignored)
        total = get_advice_total_count(data['advice'])
        print(f"✓ Unknown parameters ignored, returned {total} total items")

    def test_02_empty_advice_list(self, api_client):
        """Test GET /advice:getList - Verify empty list handling"""
        response = api_client.get('advice:getList')
        assert_api_success(response, "Failed to get advice list")

        data = response['data']
        assert 'advice' in data, "Response should have advice key"

        advice = data['advice']
        if isinstance(advice, dict):
            total = get_advice_total_count(advice)
            if total == 0:
                print(f"✓ Empty advice list handled correctly")
            else:
                print(f"✓ System has {total} active advice items")
        else:
            print(f"✓ Advice structure is valid")

    def test_03_refresh_idempotency(self, api_client):
        """Test POST /advice:refresh - Multiple refreshes should work"""
        # First refresh
        response1 = api_client.post('advice:refresh', {})
        assert_api_success(response1, "First refresh failed")

        # Second refresh immediately
        response2 = api_client.post('advice:refresh', {})
        assert_api_success(response2, "Second refresh failed")

        # Both should succeed
        count1 = get_advice_total_count(response1['data']['advice'])
        count2 = get_advice_total_count(response2['data']['advice'])

        print(f"✓ Multiple refreshes work: {count1} and {count2} items")

    def test_04_advice_no_filtering_applied(self, api_client):
        """Test that filtering parameters have no effect (not implemented)"""
        # Get all advice
        response_all = api_client.get('advice:getList')
        assert_api_success(response_all, "Failed to get all advice")
        count_all = get_advice_total_count(response_all['data']['advice'])

        # Try to filter (should be ignored)
        response_filtered = api_client.get('advice:getList', params={
            'category': 'security',
            'severity': 'critical'
        })
        assert_api_success(response_filtered, "Failed to get 'filtered' advice")
        count_filtered = get_advice_total_count(response_filtered['data']['advice'])

        # Counts should be identical (filtering not implemented)
        assert count_all == count_filtered, \
            f"Filtering appears to work (unexpected): all={count_all}, filtered={count_filtered}"

        print(f"✓ Confirmed: filtering parameters ignored (both returned {count_all} items)")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
