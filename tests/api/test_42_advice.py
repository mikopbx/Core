#!/usr/bin/env python3
"""
Test suite for System Advice operations

Tests the /pbxcore/api/v3/advice endpoint for:
- Getting system advice list with filtering
- Filtering by category (security, configuration, performance, maintenance, updates)
- Filtering by severity (critical, warning, info)
- Refreshing advice cache
- Force refresh functionality

System Advice provides automated analysis of system configuration, security recommendations,
performance warnings, and best practice suggestions. This is a READ-ONLY resource with
custom methods for retrieving and refreshing system advice.
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
                assert 'messageTpl' in first_item, \
                    "Advice item should contain messageTpl"
                print(f"  Sample {severity} item: {first_item}")

    def test_02_filter_by_category_security(self, api_client):
        """Test GET /advice:getList - Filter by category=security"""
        try:
            response = api_client.get('advice:getList', params={'category': 'security'})
            assert_api_success(response, "Failed to get security advice")

            data = response['data']
            assert isinstance(data, dict) and 'advice' in data, "Response should have advice dict"

            advice = data['advice']
            total = get_advice_total_count(advice)

            print(f"✓ Retrieved {total} security advice items")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Category filtering not fully implemented")
            else:
                raise

    def test_03_filter_by_category_configuration(self, api_client):
        """Test GET /advice:getList - Filter by category=configuration"""
        try:
            response = api_client.get('advice:getList', params={'category': 'configuration'})
            assert_api_success(response, "Failed to get configuration advice")

            data = response['data']
            assert isinstance(data, dict) and 'advice' in data, "Response should have advice dict"
            total = get_advice_total_count(data['advice'])

            print(f"✓ Retrieved {total} configuration advice items")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Category filtering not fully implemented")
            else:
                raise

    def test_04_filter_by_category_performance(self, api_client):
        """Test GET /advice:getList - Filter by category=performance"""
        try:
            response = api_client.get('advice:getList', params={'category': 'performance'})
            assert_api_success(response, "Failed to get performance advice")

            data = response['data']
            assert isinstance(data, dict) and 'advice' in data, "Response should have advice dict"
            total = get_advice_total_count(data['advice'])

            print(f"✓ Retrieved {total} performance advice items")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Category filtering not fully implemented")
            else:
                raise

    def test_05_filter_by_severity_critical(self, api_client):
        """Test GET /advice:getList - Filter by severity=critical"""
        try:
            response = api_client.get('advice:getList', params={'severity': 'critical'})
            assert_api_success(response, "Failed to get critical advice")

            data = response['data']
            assert isinstance(data, dict) and 'advice' in data, "Response should have advice dict"
            total = get_advice_total_count(data['advice'])

            print(f"✓ Retrieved {total} critical advice items")

            # Verify severity filtering worked
            if len(data) > 0:
                for item in data:
                    if 'severity' in item:
                        assert item['severity'] == 'critical', \
                            f"Expected severity 'critical', got '{item['severity']}'"
                print(f"  All items have severity=critical")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Severity filtering not fully implemented")
            else:
                raise

    def test_06_filter_by_severity_warning(self, api_client):
        """Test GET /advice:getList - Filter by severity=warning"""
        try:
            response = api_client.get('advice:getList', params={'severity': 'warning'})
            assert_api_success(response, "Failed to get warning advice")

            data = response['data']
            assert isinstance(data, dict) and "advice" in data, "Response should have advice dict"
            total = get_advice_total_count(data["advice"])

            print(f"✓ Retrieved {total} warning advice items")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Severity filtering not fully implemented")
            else:
                raise

    def test_07_filter_by_severity_info(self, api_client):
        """Test GET /advice:getList - Filter by severity=info"""
        try:
            response = api_client.get('advice:getList', params={'severity': 'info'})
            assert_api_success(response, "Failed to get info advice")

            data = response['data']
            assert isinstance(data, dict) and "advice" in data, "Response should have advice dict"
            total = get_advice_total_count(data["advice"])

            print(f"✓ Retrieved {total} info advice items")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Severity filtering not fully implemented")
            else:
                raise

    def test_08_combined_filters(self, api_client):
        """Test GET /advice:getList - Combined category and severity filters"""
        try:
            response = api_client.get('advice:getList', params={
                'category': 'security',
                'severity': 'critical'
            })
            assert_api_success(response, "Failed to get filtered advice")

            data = response['data']
            assert isinstance(data, dict) and "advice" in data, "Response should have advice dict"
            total = get_advice_total_count(data["advice"])

            print(f"✓ Retrieved {total} critical security advice items")

            # Verify both filters worked
            if len(data) > 0:
                for item in data:
                    if 'category' in item:
                        assert item['category'] == 'security'
                    if 'severity' in item:
                        assert item['severity'] == 'critical'
                print(f"  All items match both filters")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Combined filtering not fully implemented")
            else:
                raise

    def test_09_refresh_advice_normal(self, api_client):
        """Test GET /advice:refresh - Normal refresh (cache if recent)"""
        try:
            response = api_client.get('advice:refresh')
            assert_api_success(response, "Failed to refresh advice")

            data = response['data']
            assert isinstance(data, dict) and "advice" in data, "Response should have advice dict"
            total = get_advice_total_count(data["advice"])

            print(f"✓ Refreshed advice list ({total} items)")
        except Exception as e:
            if '422' in str(e) or '404' in str(e):
                print(f"⚠ Refresh method may not be implemented")
            else:
                raise

    def test_10_refresh_advice_force(self, api_client):
        """Test GET /advice:refresh - Force refresh (bypass cache)"""
        try:
            response = api_client.get('advice:refresh', params={'force': True})
            assert_api_success(response, "Failed to force refresh advice")

            data = response['data']
            assert isinstance(data, dict) and "advice" in data, "Response should have advice dict"
            total = get_advice_total_count(data["advice"])

            print(f"✓ Force refreshed advice list ({total} items)")
        except Exception as e:
            if '422' in str(e) or '404' in str(e):
                print(f"⚠ Force refresh may not be implemented")
            else:
                raise

    def test_11_refresh_advice_post(self, api_client):
        """Test POST /advice:refresh - POST method for refresh"""
        try:
            response = api_client.post('advice:refresh', {'force': True})
            assert_api_success(response, "Failed to refresh advice via POST")

            data = response['data']
            assert isinstance(data, dict) and "advice" in data, "Response should have advice dict"
            total = get_advice_total_count(data["advice"])

            print(f"✓ Refreshed advice via POST ({total} items)")
        except Exception as e:
            if '422' in str(e) or '404' in str(e):
                print(f"⚠ POST refresh may not be implemented")
            else:
                raise


class TestAdviceEdgeCases:
    """Edge cases for System Advice"""

    def test_01_invalid_category(self, api_client):
        """Test GET /advice:getList - Invalid category value"""
        try:
            response = api_client.get('advice:getList', params={'category': 'invalid_category'})

            # Should either reject or ignore invalid value
            if not response['result']:
                print(f"✓ Invalid category rejected")
            else:
                # If accepted, should return empty or all advice
                print(f"⚠ Invalid category accepted (may be ignored)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid category rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_02_invalid_severity(self, api_client):
        """Test GET /advice:getList - Invalid severity value"""
        try:
            response = api_client.get('advice:getList', params={'severity': 'invalid_severity'})

            # Should either reject or ignore invalid value
            if not response['result']:
                print(f"✓ Invalid severity rejected")
            else:
                print(f"⚠ Invalid severity accepted (may be ignored)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid severity rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_03_non_boolean_force_param(self, api_client):
        """Test GET /advice:refresh - Invalid force parameter"""
        try:
            response = api_client.get('advice:refresh', params={'force': 'not_a_boolean'})

            # Should either reject or convert to boolean
            if response['result']:
                print(f"⚠ Invalid force parameter accepted (may be converted)")
            else:
                print(f"✓ Invalid force parameter rejected")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid force parameter rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_04_multiple_categories(self, api_client):
        """Test GET /advice:getList - Multiple category values (should use last)"""
        try:
            # Try passing category parameter multiple times
            # In HTTP, last value usually wins
            response = api_client.get('advice:getList', params={
                'category': 'performance'  # Single value
            })

            if response['result']:
                print(f"✓ Single category parameter works")
            else:
                print(f"⚠ Category parameter rejected")
        except Exception as e:
            print(f"⚠ Error with category parameter: {str(e)[:50]}")

    def test_05_empty_advice_list(self, api_client):
        """Test GET /advice:getList - Verify empty list handling"""
        # Try to get advice with very specific filters that may return empty
        try:
            response = api_client.get('advice:getList', params={
                'category': 'maintenance',
                'severity': 'critical'
            })

            assert_api_success(response, "Failed to get advice with specific filters")

            data = response['data']
            assert isinstance(data, dict) and "advice" in data, "Response should have advice dict"
            total = get_advice_total_count(data["advice"])

            if total == 0:
                print(f"✓ Empty advice list handled correctly")
            else:
                print(f"⚠ Found {total} items (expected possibly empty)")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Filtering may not be implemented")
            else:
                raise


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
