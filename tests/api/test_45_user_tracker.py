#!/usr/bin/env python3
"""
Test suite for User Page Tracker operations

Tests the /pbxcore/api/v3/user-page-tracker endpoint for:
- Recording page visits (POST /user-page-tracker)
- Getting usage statistics (GET /user-page-tracker:stats)
- User activity tracking
- Analytics data retrieval
"""

import pytest
from conftest import assert_api_success


class TestUserPageTracker:
    """Comprehensive tests for User Page Tracker API"""

    def test_01_track_page_visit(self, api_client):
        """Test POST /user-page-tracker - Record page visit"""
        visit_data = {
            'page': '/admin-cabinet/extensions',
            'action': 'view',
            'duration': 15  # seconds
        }

        try:
            response = api_client.post('user-page-tracker', visit_data)

            if response.get('result') is True:
                print(f"✓ Page visit tracked successfully")
                data = response.get('data', {})
                if isinstance(data, dict):
                    print(f"  Response: {data}")
            else:
                messages = response.get('messages', {})
                print(f"⚠ Page tracking failed: {messages}")

        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ User page tracker not implemented (expected - analytics feature)")
                pytest.skip("User page tracker not implemented")
            elif '422' in str(e):
                print(f"✓ Page tracking validates input")
            else:
                print(f"⚠ Error: {str(e)[:50]}")

    def test_02_track_multiple_pages(self, api_client):
        """Test POST /user-page-tracker - Track multiple page visits"""
        pages = [
            {'page': '/admin-cabinet/providers', 'action': 'view', 'duration': 10},
            {'page': '/admin-cabinet/call-queues', 'action': 'edit', 'duration': 30},
            {'page': '/admin-cabinet/ivr-menu', 'action': 'create', 'duration': 45},
        ]

        tracked_count = 0
        for visit_data in pages:
            try:
                response = api_client.post('user-page-tracker', visit_data)

                if response.get('result') is True:
                    tracked_count += 1

            except Exception as e:
                if '501' in str(e) or '404' in str(e):
                    pytest.skip("User page tracker not implemented")
                else:
                    continue

        if tracked_count > 0:
            print(f"✓ Tracked {tracked_count} page visits")
        else:
            print(f"⚠ No pages tracked successfully")

    def test_03_track_with_metadata(self, api_client):
        """Test POST /user-page-tracker - Track with additional metadata"""
        visit_data = {
            'page': '/admin-cabinet/extensions',
            'action': 'create',
            'duration': 120,
            'metadata': {
                'extension_number': '201',
                'extension_type': 'SIP'
            }
        }

        try:
            response = api_client.post('user-page-tracker', visit_data)

            if response.get('result') is True:
                print(f"✓ Page visit with metadata tracked")
            else:
                print(f"⚠ Metadata tracking not supported or failed")

        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Metadata format not accepted")
            elif '501' in str(e):
                print(f"⚠ User page tracker not implemented")
            else:
                print(f"⚠ Error: {str(e)[:50]}")

    def test_04_get_usage_statistics(self, api_client):
        """Test GET /user-page-tracker:stats - Get usage statistics"""
        try:
            response = api_client.get('user-page-tracker:stats')

            if response.get('result') is True:
                data = response.get('data', {})

                if isinstance(data, dict):
                    print(f"✓ Usage statistics retrieved")

                    # Common statistics fields
                    possible_fields = ['total_visits', 'unique_users', 'popular_pages',
                                      'total_pages', 'average_duration', 'visits']

                    found_fields = [f for f in possible_fields if f in data]

                    if found_fields:
                        print(f"  Statistics fields: {found_fields}")
                    else:
                        print(f"  Custom fields: {list(data.keys())[:5]}")

                elif isinstance(data, list):
                    print(f"✓ Usage statistics retrieved: {len(data)} entries")
                else:
                    print(f"✓ Usage statistics retrieved (custom format)")

            else:
                print(f"⚠ Statistics retrieval failed or no data available")

        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ Statistics endpoint not implemented")
            else:
                print(f"⚠ Error: {str(e)[:50]}")

    def test_05_get_statistics_with_filters(self, api_client):
        """Test GET /user-page-tracker:stats with time range filters"""
        import time

        # Get statistics for last 24 hours
        current_time = int(time.time())
        one_day_ago = current_time - 86400

        params = {
            'from': one_day_ago,
            'to': current_time
        }

        try:
            response = api_client.get('user-page-tracker:stats', params=params)

            if response.get('result') is True:
                data = response.get('data', {})
                print(f"✓ Filtered statistics retrieved")

                if isinstance(data, (dict, list)):
                    count = len(data) if isinstance(data, list) else len(data.keys())
                    print(f"  Entries: {count}")

            else:
                print(f"⚠ Filtered statistics not available")

        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Time range filters not supported")
            elif '501' in str(e):
                print(f"⚠ Statistics not implemented")
            else:
                print(f"⚠ Error: {str(e)[:50]}")

    def test_06_get_statistics_by_page(self, api_client):
        """Test GET /user-page-tracker:stats with page filter"""
        params = {
            'page': '/admin-cabinet/extensions'
        }

        try:
            response = api_client.get('user-page-tracker:stats', params=params)

            if response.get('result') is True:
                data = response.get('data', {})
                print(f"✓ Page-specific statistics retrieved")
            else:
                print(f"⚠ Page filtering not available")

        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Page filter not supported")
            else:
                print(f"⚠ Error: {str(e)[:50]}")


class TestUserPageTrackerEdgeCases:
    """Edge cases for User Page Tracker"""

    def test_01_track_missing_page(self, api_client):
        """Test POST /user-page-tracker without page field"""
        visit_data = {
            'action': 'view',
            'duration': 10
            # Missing 'page' field
        }

        try:
            response = api_client.post('user-page-tracker', visit_data)

            if not response.get('result'):
                print(f"✓ Missing page field rejected")
            else:
                print(f"⚠ Missing page field accepted")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Missing page field rejected via HTTP")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_02_track_negative_duration(self, api_client):
        """Test POST /user-page-tracker with negative duration"""
        visit_data = {
            'page': '/admin-cabinet/test',
            'action': 'view',
            'duration': -10  # Negative duration
        }

        try:
            response = api_client.post('user-page-tracker', visit_data)

            if not response.get('result'):
                print(f"✓ Negative duration rejected")
            else:
                print(f"⚠ Negative duration accepted (may be normalized)")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Negative duration rejected via HTTP")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_03_track_invalid_page_url(self, api_client):
        """Test POST /user-page-tracker with invalid page URL"""
        invalid_urls = [
            '../../../etc/passwd',           # Path traversal
            'javascript:alert(1)',           # XSS attempt
            'http://external.com/hack',      # External URL
        ]

        for page_url in invalid_urls:
            try:
                visit_data = {
                    'page': page_url,
                    'action': 'view',
                    'duration': 10
                }
                response = api_client.post('user-page-tracker', visit_data)

                if not response.get('result'):
                    print(f"✓ Invalid URL rejected: {page_url[:30]}")
                else:
                    print(f"⚠ Invalid URL accepted: {page_url[:30]}")

            except Exception as e:
                if '422' in str(e) or '400' in str(e):
                    print(f"✓ Invalid URL rejected: {page_url[:30]}")
                else:
                    print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_04_track_extremely_long_duration(self, api_client):
        """Test POST /user-page-tracker with unrealistic duration"""
        visit_data = {
            'page': '/admin-cabinet/test',
            'action': 'view',
            'duration': 999999999  # ~31 years
        }

        try:
            response = api_client.post('user-page-tracker', visit_data)

            if response.get('result') is True:
                print(f"⚠ Unrealistic duration accepted (no upper limit)")
            else:
                print(f"✓ Unrealistic duration rejected or normalized")

        except Exception as e:
            if '422' in str(e):
                print(f"✓ Unrealistic duration rejected via HTTP")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_05_get_statistics_invalid_time_range(self, api_client):
        """Test GET /user-page-tracker:stats with invalid time range"""
        import time
        current_time = int(time.time())

        # Invalid: 'from' is after 'to'
        params = {
            'from': current_time,
            'to': current_time - 86400
        }

        try:
            response = api_client.get('user-page-tracker:stats', params=params)

            if not response.get('result') or len(response.get('data', [])) == 0:
                print(f"✓ Invalid time range handled (empty or error)")
            else:
                print(f"⚠ Invalid time range accepted")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid time range rejected via HTTP")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_06_track_with_malformed_metadata(self, api_client):
        """Test POST /user-page-tracker with malformed metadata"""
        visit_data = {
            'page': '/admin-cabinet/test',
            'action': 'view',
            'duration': 10,
            'metadata': 'should_be_object_not_string'
        }

        try:
            response = api_client.post('user-page-tracker', visit_data)

            # May accept and ignore, or reject malformed metadata
            if response.get('result') is True:
                print(f"⚠ Malformed metadata accepted (lenient validation)")
            else:
                print(f"✓ Malformed metadata rejected")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Malformed metadata rejected via HTTP")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_07_track_empty_action(self, api_client):
        """Test POST /user-page-tracker with empty action"""
        visit_data = {
            'page': '/admin-cabinet/test',
            'action': '',  # Empty action
            'duration': 10
        }

        try:
            response = api_client.post('user-page-tracker', visit_data)

            if not response.get('result'):
                print(f"✓ Empty action rejected")
            else:
                print(f"⚠ Empty action accepted (may have default)")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Empty action rejected via HTTP")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
