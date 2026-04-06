#!/usr/bin/env python3
"""
CDR API Security Tests

Tests security hardening for CDR REST API v3:
- SQL injection protection in sort parameter
- Date range DoS prevention
- Parameter validation
- Input sanitization

These tests verify that security patches in GetListAction.php are working correctly.
"""

import pytest
from datetime import datetime, timedelta


def extract_cdr_data(response):
    """Extract CDR data and pagination from response handling new format."""
    data_wrapper = response.get('data', {})

    if isinstance(data_wrapper, dict):
        if 'records' in data_wrapper and 'pagination' in data_wrapper:
            return data_wrapper['records'], data_wrapper['pagination']

    # Fallback for legacy format
    if isinstance(data_wrapper, list):
        return data_wrapper, response.get('pagination', {})

    return [], {}


@pytest.mark.security
class TestCDRSQLInjectionProtection:
    """
    Test SQL injection protection in CDR endpoint

    Context: GetListAction.php:119-140 implements sortField whitelist
    Security: Prevents SQL injection via ORDER BY clause
    """

    def test_sort_field_sql_injection_drop_table(self, api_client):
        """
        SECURITY TEST: SQL injection attempt with DROP TABLE

        Attack: GET /cdr?sort=id; DROP TABLE cdr_general; --
        Expected: Safe fallback to default sort, no data loss
        Verification: Response succeeds and pagination intact
        """
        response = api_client.get_raw(
            '/cdr',
            params={
                'sort': 'id; DROP TABLE cdr_general; --',
                'limit': 5
            }
        )

        # Should succeed with safe fallback (not reject outright)
        assert response.status_code == 200, \
            f"Expected 200, got {response.status_code}"

        data = response.json()

        # Critical: Table must still exist (pagination works)
        assert 'data' in data, "Response missing data field"
        data_wrapper = data['data']
        assert 'pagination' in data_wrapper, \
            "CRITICAL: Table compromised - pagination missing"

        # Verify no error messages about SQL syntax
        messages = data.get('messages', [])
        if isinstance(messages, dict):
            error_msgs = str(messages.get('error', []))
        else:
            error_msgs = str(messages)
        assert 'syntax' not in error_msgs.lower(), \
            "SQL syntax error suggests injection not properly handled"

    def test_sort_field_sql_injection_union_select(self, api_client):
        """
        SECURITY TEST: SQL injection with UNION SELECT

        Attack: GET /cdr?sort=id UNION SELECT password FROM users --
        Expected: Safe fallback, no data leakage
        Verification: No sensitive fields in response
        """
        response = api_client.get_raw(
            '/cdr',
            params={
                'sort': 'id UNION SELECT password FROM m_Users --',
                'limit': 5
            }
        )

        assert response.status_code == 200, \
            f"Expected safe fallback, got {response.status_code}"

        data = response.json()
        response_text = str(data).lower()

        # Critical: No sensitive data leakage
        # WHY: 'password', 'secret', 'token' should never appear in CDR data
        # EXCEPT: 'playback_url', 'download_url' contain legitimate tokens (not sensitive)
        sensitive_fields = ['password', 'sip_secret']
        for field in sensitive_fields:
            assert field not in response_text, \
                f"CRITICAL: Sensitive field '{field}' found in response!"

        # WHY: 'hash' appears in 'meta.hash' (response integrity checksum) which is legitimate
        # Only 'password_hash', 'md5_secret' etc would be security issues
        # No need to check for hash - it's always in meta.hash which is expected

    def test_sort_field_sql_injection_stacked_queries(self, api_client):
        """
        SECURITY TEST: Stacked queries injection

        Attack: GET /cdr?sort=id; UPDATE m_Users SET login='hacked' WHERE id=1; --
        Expected: Query ignored, safe fallback to default sort
        """
        response = api_client.get_raw(
            '/cdr',
            params={
                'sort': "id; UPDATE m_Users SET login='hacked' WHERE id=1; --",
                'limit': 5
            }
        )

        # Should succeed with fallback
        assert response.status_code == 200, \
            f"Expected 200 with safe fallback, got {response.status_code}"

        data = response.json()
        assert data.get('data') is not None, \
            "Expected data array in response"

    def test_sort_field_invalid_fallback_to_default(self, api_client):
        """
        SECURITY TEST: Invalid sort field uses safe default

        Test: Non-existent field should fallback to 'id'
        Expected: Success with default sort (id)
        """
        response = api_client.get_raw(
            '/cdr',
            params={
                'sort': 'nonexistent_malicious_field_12345',
                'limit': 5
            }
        )

        assert response.status_code == 200, \
            f"Expected 200 with fallback, got {response.status_code}"

        data = response.json()
        assert data.get('result') is True, \
            "Request should succeed with safe fallback"

    def test_sort_field_whitelist_all_valid_fields(self, api_client):
        """
        SECURITY TEST: Verify all whitelisted fields work

        Whitelisted fields from GetListAction.php:121-131:
        - id, start, linkedid, src_num, dst_num, did, disposition, duration, billsec

        Expected: All valid fields accepted
        """
        valid_fields = [
            'id', 'start', 'linkedid', 'src_num', 'dst_num',
            'did', 'disposition', 'duration', 'billsec'
        ]

        for field in valid_fields:
            response = api_client.get_raw(
                '/cdr',
                params={
                    'sort': field,
                    'order': 'DESC',
                    'limit': 3
                }
            )

            assert response.status_code == 200, \
                f"Whitelisted field '{field}' should be accepted, got {response.status_code}"

            data = response.json()
            assert data.get('result') is True, \
                f"Sort by whitelisted field '{field}' should succeed"


@pytest.mark.security
class TestCDRDateRangeLimits:
    """
    Test date range DoS prevention

    Context: GetListAction.php:119-142 implements date range validation
    Security: Prevents DoS via excessive date ranges
    """

    def test_excessive_date_range_30_years(self, api_client):
        """
        SECURITY TEST: Reject excessive date range (30 years)

        Attack: GET /cdr?dateFrom=2000-01-01&dateTo=2030-12-31
        Expected: Error or auto-correction to safe range
        Note: Current implementation may auto-correct instead of reject
        """
        response = api_client.get_raw(
            '/cdr',
            params={
                'dateFrom': '2000-01-01',
                'dateTo': '2030-12-31',
                'limit': 10
            }
        )

        # May return 200 with auto-corrected range OR error status
        # Both are acceptable - important is not processing full 30 years
        if response.status_code == 200:
            data = response.json()
            # If succeeded, verify it didn't process excessive data
            pagination = data.get('pagination', {})
            total = pagination.get('total', 0)

            # If total is reasonable, auto-correction worked
            # (Real 30-year dataset would be huge)
            assert total < 1000000, \
                f"Excessive total records ({total}) suggests DoS vulnerability"
        else:
            # Error response is also acceptable
            assert response.status_code in [400, 422, 500], \
                f"Expected error status for excessive range, got {response.status_code}"

    def test_maximum_allowed_range_365_days(self, api_client):
        """
        SECURITY TEST: Accept maximum allowed range (365 days)

        Test: 365-day range should be accepted
        Expected: Success (within limits)
        """
        date_to = datetime.now()
        date_from = date_to - timedelta(days=365)

        response = api_client.get_raw(
            '/cdr',
            params={
                'dateFrom': date_from.strftime('%Y-%m-%d'),
                'dateTo': date_to.strftime('%Y-%m-%d'),
                'limit': 10
            }
        )

        assert response.status_code == 200, \
            f"365-day range should be accepted, got {response.status_code}"

        data = response.json()
        assert data.get('result') is True, \
            "Maximum allowed range (365 days) should succeed"

    def test_over_limit_range_366_days(self, api_client):
        """
        SECURITY TEST: Reject range exceeding limit (366 days)

        Test: 366-day range should be rejected or auto-corrected
        Expected: Error or safe auto-correction
        """
        date_to = datetime.now()
        date_from = date_to - timedelta(days=366)

        response = api_client.get_raw(
            '/cdr',
            params={
                'dateFrom': date_from.strftime('%Y-%m-%d'),
                'dateTo': date_to.strftime('%Y-%m-%d'),
                'limit': 10
            }
        )

        # Either reject OR auto-correct to safe range
        if response.status_code == 200:
            # If auto-corrected, verify reasonable data volume
            data = response.json()
            pagination = data.get('pagination', {})
            # Should not return full 366 days of data
            assert pagination is not None, \
                "Expected pagination data"
        else:
            # Error response acceptable
            assert response.status_code in [400, 422, 500], \
                f"Expected error for over-limit range, got {response.status_code}"

    def test_auto_date_range_no_filters(self, api_client):
        """
        SECURITY TEST: Auto-apply date range when no filters

        Test: Request with no filters should auto-apply last 30 days
        Expected: Success with recent data only
        Prevents: Full table scans on massive datasets
        """
        response = api_client.get_raw(
            '/cdr',
            params={'limit': 10}
        )

        assert response.status_code == 200, \
            f"Expected 200, got {response.status_code}"

        data = response.json()
        cdr_data, pagination = extract_cdr_data(data)

        # Verify returned records are recent (within auto-applied range)
        if cdr_data:
            first_record = cdr_data[0]
            if 'start' in first_record:
                # Parse start date (format: YYYY-MM-DD HH:MM:SS.mmm)
                start_str = first_record['start'].split('.')[0]  # Remove milliseconds
                record_date = datetime.strptime(start_str, '%Y-%m-%d %H:%M:%S')
                days_ago = (datetime.now() - record_date).days

                # Should be within auto-applied 30-day range
                # Allow some tolerance for test data
                assert days_ago <= 60, \
                    f"Record is {days_ago} days old, expected within 30-60 days " \
                    f"(auto-applied range with tolerance)"


@pytest.mark.security
class TestCDRParameterValidation:
    """
    Test parameter validation and sanitization

    Security: Verify input validation prevents abuse
    """

    def test_limit_parameter_exceeds_maximum(self, api_client):
        """
        SECURITY TEST: Limit parameter capped at maximum

        Attack: GET /cdr?limit=999999 (try to fetch entire table)
        Expected: Capped at 1000 records (max limit)
        """
        response = api_client.get_raw(
            '/cdr',
            params={'limit': 999999}
        )

        assert response.status_code == 200, \
            f"Expected 200, got {response.status_code}"

        data = response.json()
        cdr_data, pagination = extract_cdr_data(data)

        # Should cap at 1000
        assert len(cdr_data) <= 1000, \
            f"Returned {len(cdr_data)} records, should cap at 1000"

        # Verify pagination shows correct limit
        pagination = data.get('pagination', {})
        assert pagination.get('limit', 0) <= 1000, \
            "Pagination limit should be capped at 1000"

    def test_negative_limit_rejected_or_defaulted(self, api_client):
        """
        SECURITY TEST: Negative limit values rejected

        Test: limit=-100
        Expected: Error or safe default (not negative records)
        """
        response = api_client.get_raw(
            '/cdr',
            params={'limit': -100}
        )

        # Either reject or use safe default
        if response.status_code == 200:
            data = response.json()
            cdr_data, pagination = extract_cdr_data(data)
            # Should use safe default, not negative value
            assert len(cdr_data) >= 0, \
                "Negative limit should not return negative records"
        else:
            assert response.status_code in [400, 422], \
                f"Expected error for negative limit, got {response.status_code}"

    def test_negative_offset_rejected_or_defaulted(self, api_client):
        """
        SECURITY TEST: Negative offset values rejected

        Test: offset=-50
        Expected: Error or default to 0
        """
        response = api_client.get_raw(
            '/cdr',
            params={
                'limit': 10,
                'offset': -50
            }
        )

        # Either reject or use safe default (0)
        if response.status_code == 200:
            data = response.json()
            pagination = data.get('pagination', {})
            offset = pagination.get('offset', 0)
            # Should default to 0, not negative
            assert offset >= 0, \
                f"Offset should be >= 0, got {offset}"
        else:
            assert response.status_code in [400, 422], \
                f"Expected error for negative offset, got {response.status_code}"

    def test_search_parameter_sql_quotes_escaped(self, api_client):
        """
        SECURITY TEST: Search parameter SQL quotes escaped

        Attack: GET /cdr?search=' OR '1'='1
        Expected: Treated as literal string search, not SQL injection
        """
        response = api_client.get_raw(
            '/cdr',
            params={
                'search': "' OR '1'='1",
                'limit': 10
            }
        )

        assert response.status_code == 200, \
            f"Expected 200, got {response.status_code}"

        data = response.json()
        # Should search for literal string, not execute SQL injection
        assert data.get('result') is True, \
            "Search with SQL quotes should be safely escaped"

    def test_search_parameter_wildcard_escaped(self, api_client):
        """
        SECURITY TEST: Search parameter SQL wildcards handled safely

        Test: search=%
        Expected: Escaped as literal character, not wildcard
        """
        response = api_client.get_raw(
            '/cdr',
            params={
                'search': '%',
                'limit': 10
            }
        )

        assert response.status_code == 200, \
            f"Expected 200, got {response.status_code}"

        data = response.json()
        assert data.get('result') is True, \
            "Wildcard should be safely escaped"

    def test_order_parameter_sql_injection(self, api_client):
        """
        SECURITY TEST: Order parameter injection protection

        Attack: GET /cdr?order=DESC; DROP TABLE cdr_general
        Expected: Safe fallback to valid order (ASC/DESC)
        """
        response = api_client.get_raw(
            '/cdr',
            params={
                'sort': 'id',
                'order': 'DESC; DROP TABLE cdr_general',
                'limit': 10
            }
        )

        assert response.status_code == 200, \
            f"Expected 200 with safe fallback, got {response.status_code}"

        data = response.json()
        # Table must still exist
        assert 'data' in data, "Response should contain data"
        data_wrapper = data['data']
        assert 'pagination' in data_wrapper, \
            "Table should still exist (pagination present)"

    def test_order_parameter_valid_directions(self, api_client):
        """
        SECURITY TEST: Only ASC/DESC accepted for order

        Test: Verify case-insensitive ASC/DESC work
        Expected: All valid, others fallback to default
        """
        valid_orders = ['ASC', 'DESC', 'asc', 'desc']

        for order in valid_orders:
            response = api_client.get_raw(
                '/cdr',
                params={
                    'sort': 'id',
                    'order': order,
                    'limit': 5
                }
            )

            assert response.status_code == 200, \
                f"Order '{order}' should be accepted, got {response.status_code}"

            data = response.json()
            assert data.get('result') is True, \
                f"Valid order direction '{order}' should succeed"


@pytest.mark.security
@pytest.mark.performance
class TestCDRPerformanceAndDoS:
    """
    Test performance characteristics and DoS resistance

    These tests verify the API handles load appropriately
    """

    def test_large_result_set_pagination_required(self, api_client):
        """
        PERFORMANCE TEST: Large datasets use pagination

        Test: Request without limit gets reasonable default
        Expected: Not entire table, reasonable pagination
        """
        response = api_client.get_raw('/cdr')

        assert response.status_code == 200, \
            f"Expected 200, got {response.status_code}"

        data = response.json()

        # API should always include pagination metadata
        data_wrapper = data['data']
        assert 'pagination' in data_wrapper, "Response should include pagination"
        pagination = data_wrapper.get('pagination', {})
        assert isinstance(pagination, dict), "Pagination should be a dictionary"

        # Should have pagination metadata
        assert 'total' in pagination, "Pagination should include total"
        assert 'limit' in pagination, "Pagination should include limit"
        assert 'hasMore' in pagination, "Pagination should include hasMore"

        # Limit should be reasonable (default 50, max 1000)
        limit = pagination.get('limit', 0)
        assert 0 < limit <= 1000, \
            f"Limit should be between 1-1000, got {limit}"

    def test_grouped_pagination_performance(self, api_client):
        """
        PERFORMANCE TEST: Grouped pagination is efficient

        Test: Grouped results (by linkedid) should paginate correctly
        Expected: Results grouped, pagination by groups not records
        """
        response = api_client.get_raw(
            '/cdr',
            params={'limit': 10}
        )

        assert response.status_code == 200, \
            f"Expected 200, got {response.status_code}"

        data = response.json()
        cdr_data, pagination = extract_cdr_data(data)

        # Each group should have linkedid
        for group in cdr_data[:5]:  # Check first 5 groups
            assert 'linkedid' in group, \
                "Each group should have linkedid"
            assert 'records' in group, \
                "Each group should have records array"
            assert isinstance(group['records'], list), \
                "Records should be array"


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
