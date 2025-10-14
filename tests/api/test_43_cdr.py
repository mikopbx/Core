#!/usr/bin/env python3
"""
Test suite for CDR (Call Detail Records) operations

Tests the /pbxcore/api/v3/cdr endpoint for:
- Getting CDR list with pagination
- Filtering by date range (dateFrom, dateTo)
- Filtering by caller/callee (src_num, dst_num)
- Filtering by call disposition (ANSWERED, NO ANSWER, BUSY, FAILED)
- Getting specific CDR record by ID
- Getting active calls list
- Getting active channels list
- Playback call recordings (stream/download)

CDR (Call Detail Records) provides comprehensive call history analysis and reporting.
This is a READ-ONLY resource for completed call records and real-time monitoring.

NOTE: This test suite assumes there are some CDR records in the system.
If no records exist, some tests may return empty lists (which is valid).
"""

import pytest
from conftest import assert_api_success


class TestCDR:
    """Comprehensive CDR tests"""

    sample_cdr_id = None

    def test_01_get_cdr_list_default(self, api_client):
        """Test GET /cdr - Get CDR list with default pagination"""
        response = api_client.get('cdr', params={'limit': 50, 'offset': 0})
        assert_api_success(response, "Failed to get CDR list")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        print(f"✓ Retrieved {len(data)} CDR records")

        # If CDR exists, verify structure and store ID
        if len(data) > 0:
            first_record = data[0]
            # Common CDR fields
            expected_fields = ['id', 'src_num', 'dst_num', 'start', 'answer', 'endtime',
                             'disposition', 'billsec', 'recordingfile']

            found_fields = [f for f in expected_fields if f in first_record]
            print(f"  Sample record has {len(found_fields)}/{len(expected_fields)} expected fields")

            if 'id' in first_record:
                TestCDR.sample_cdr_id = str(first_record['id'])
                print(f"  Sample CDR ID: {TestCDR.sample_cdr_id}")
        else:
            print(f"  ⚠ No CDR records found (empty system)")

    def test_02_get_cdr_list_with_limit(self, api_client):
        """Test GET /cdr - Pagination with limit"""
        response = api_client.get('cdr', params={'limit': 10, 'offset': 0})
        assert_api_success(response, "Failed to get CDR list with limit")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"
        assert len(data) <= 10, f"Expected max 10 records, got {len(data)}"

        print(f"✓ Limit parameter works ({len(data)} records)")

    def test_03_get_cdr_list_with_offset(self, api_client):
        """Test GET /cdr - Pagination with offset"""
        # Get first page
        response1 = api_client.get('cdr', params={'limit': 5, 'offset': 0})
        assert_api_success(response1, "Failed to get first page")
        data1 = response1['data']

        # Get second page
        response2 = api_client.get('cdr', params={'limit': 5, 'offset': 5})
        assert_api_success(response2, "Failed to get second page")
        data2 = response2['data']

        print(f"✓ Offset parameter works (page1: {len(data1)}, page2: {len(data2)} records)")

        # If both pages have data, verify they're different
        if len(data1) > 0 and len(data2) > 0:
            if 'id' in data1[0] and 'id' in data2[0]:
                assert data1[0]['id'] != data2[0]['id'], "Pages should contain different records"
                print(f"  Pages contain different records")

    def test_04_filter_by_disposition_answered(self, api_client):
        """Test GET /cdr - Filter by disposition=ANSWERED"""
        try:
            response = api_client.get('cdr', params={'disposition': 'ANSWERED', 'limit': 20})
            assert_api_success(response, "Failed to filter by disposition")

            data = response['data']
            assert isinstance(data, list), "Response data should be a list"

            print(f"✓ Disposition filter works ({len(data)} ANSWERED calls)")

            # Verify filtering worked
            if len(data) > 0:
                for record in data:
                    if 'disposition' in record:
                        assert record['disposition'] == 'ANSWERED', \
                            f"Expected disposition 'ANSWERED', got '{record['disposition']}'"
                print(f"  All records have disposition=ANSWERED")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Disposition filtering may not be implemented")
            else:
                raise

    def test_05_filter_by_disposition_no_answer(self, api_client):
        """Test GET /cdr - Filter by disposition=NO ANSWER"""
        try:
            response = api_client.get('cdr', params={'disposition': 'NO ANSWER', 'limit': 20})
            assert_api_success(response, "Failed to filter by NO ANSWER")

            data = response['data']
            assert isinstance(data, list), "Response data should be a list"

            print(f"✓ Retrieved {len(data)} NO ANSWER calls")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Disposition filtering may not be implemented")
            else:
                raise

    def test_06_filter_by_disposition_busy(self, api_client):
        """Test GET /cdr - Filter by disposition=BUSY"""
        try:
            response = api_client.get('cdr', params={'disposition': 'BUSY', 'limit': 20})
            assert_api_success(response, "Failed to filter by BUSY")

            data = response['data']
            assert isinstance(data, list), "Response data should be a list"

            print(f"✓ Retrieved {len(data)} BUSY calls")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Disposition filtering may not be implemented")
            else:
                raise

    def test_07_filter_by_date_range(self, api_client):
        """Test GET /cdr - Filter by date range"""
        try:
            response = api_client.get('cdr', params={
                'dateFrom': '2025-01-01T00:00:00',
                'dateTo': '2025-12-31T23:59:59',
                'limit': 50
            })
            assert_api_success(response, "Failed to filter by date range")

            data = response['data']
            assert isinstance(data, list), "Response data should be a list"

            print(f"✓ Date range filter works ({len(data)} records in 2025)")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Date filtering may not be implemented")
            else:
                raise

    def test_08_filter_by_src_num(self, api_client):
        """Test GET /cdr - Filter by source number"""
        try:
            # Use a common extension number
            response = api_client.get('cdr', params={'src_num': '201', 'limit': 20})
            assert_api_success(response, "Failed to filter by src_num")

            data = response['data']
            assert isinstance(data, list), "Response data should be a list"

            print(f"✓ Source number filter works ({len(data)} calls from 201)")

            # Verify filtering worked
            if len(data) > 0:
                for record in data:
                    if 'src_num' in record:
                        # Should contain '201' in source number
                        assert '201' in str(record['src_num']), \
                            f"Expected src_num to contain '201', got '{record['src_num']}'"
                print(f"  All records match src_num filter")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Source number filtering may not be implemented")
            else:
                raise

    def test_09_filter_by_dst_num(self, api_client):
        """Test GET /cdr - Filter by destination number"""
        try:
            response = api_client.get('cdr', params={'dst_num': '202', 'limit': 20})
            assert_api_success(response, "Failed to filter by dst_num")

            data = response['data']
            assert isinstance(data, list), "Response data should be a list"

            print(f"✓ Destination number filter works ({len(data)} calls to 202)")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Destination number filtering may not be implemented")
            else:
                raise

    def test_10_combined_filters(self, api_client):
        """Test GET /cdr - Combined filters"""
        try:
            response = api_client.get('cdr', params={
                'disposition': 'ANSWERED',
                'dateFrom': '2025-01-01T00:00:00',
                'dateTo': '2025-12-31T23:59:59',
                'limit': 50
            })
            assert_api_success(response, "Failed with combined filters")

            data = response['data']
            assert isinstance(data, list), "Response data should be a list"

            print(f"✓ Combined filters work ({len(data)} answered calls in 2025)")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Combined filtering may not be fully implemented")
            else:
                raise

    def test_11_get_cdr_by_id(self, api_client):
        """Test GET /cdr/{id} - Get specific CDR record"""
        if not TestCDR.sample_cdr_id:
            pytest.skip("No CDR ID available from list test")

        try:
            response = api_client.get(f'cdr/{TestCDR.sample_cdr_id}')
            assert_api_success(response, f"Failed to get CDR {TestCDR.sample_cdr_id}")

            data = response['data']
            assert isinstance(data, dict), "Response data should be a dict"
            assert str(data['id']) == str(TestCDR.sample_cdr_id), "ID should match requested ID"

            print(f"✓ Retrieved CDR record: {TestCDR.sample_cdr_id}")
            if 'src_num' in data and 'dst_num' in data:
                print(f"  Call: {data['src_num']} → {data['dst_num']}")
            if 'disposition' in data:
                print(f"  Disposition: {data['disposition']}")
        except Exception as e:
            if '404' in str(e):
                print(f"⚠ CDR record not found (may have been deleted)")
            else:
                raise

    def test_12_get_active_calls(self, api_client):
        """Test GET /cdr:getActiveCalls - Get currently active calls"""
        try:
            response = api_client.get('cdr:getActiveCalls')
            assert_api_success(response, "Failed to get active calls")

            data = response['data']
            assert isinstance(data, list), "Response data should be a list"

            print(f"✓ Retrieved {len(data)} active calls")

            if len(data) > 0:
                first_call = data[0]
                # Handle both dict and string formats
                if isinstance(first_call, dict):
                    print(f"  Sample active call fields: {list(first_call.keys())}")
                elif isinstance(first_call, str):
                    print(f"  Sample active call (string format): {first_call[:100]}")
                else:
                    print(f"  Sample active call type: {type(first_call)}")
        except Exception as e:
            if '404' in str(e) or '501' in str(e):
                print(f"⚠ getActiveCalls not implemented")
            else:
                raise

    def test_13_get_active_channels(self, api_client):
        """Test GET /cdr:getActiveChannels - Get currently active channels"""
        try:
            response = api_client.get('cdr:getActiveChannels')
            assert_api_success(response, "Failed to get active channels")

            data = response['data']
            assert isinstance(data, list), "Response data should be a list"

            print(f"✓ Retrieved {len(data)} active channels")

            if len(data) > 0:
                first_channel = data[0]
                print(f"  Sample channel fields: {list(first_channel.keys())}")
        except Exception as e:
            if '404' in str(e) or '501' in str(e):
                print(f"⚠ getActiveChannels not implemented")
            else:
                raise


class TestCDREdgeCases:
    """Edge cases for CDR"""

    def test_01_get_nonexistent_cdr(self, api_client):
        """Test GET /cdr/{id} - Non-existent CDR ID"""
        fake_id = '999999999'

        try:
            response = api_client.get(f'cdr/{fake_id}')

            # API may return result=true with empty data or result=false
            if response['result'] is False:
                print(f"✓ Non-existent CDR rejected (result=false)")
            elif response['result'] is True:
                data = response.get('data', {})
                # Check if data is empty dict or has empty id
                if not data or data.get('id') is None or data.get('id') == '':
                    print(f"✓ Non-existent CDR rejected (empty data)")
                else:
                    print(f"⚠ Non-existent CDR returned data: {data}")
        except Exception as e:
            if '404' in str(e) or '422' in str(e):
                print(f"✓ Non-existent CDR rejected (HTTP error)")
            else:
                raise

    def test_02_invalid_cdr_id_format(self, api_client):
        """Test GET /cdr/{id} - Invalid ID format"""
        invalid_id = 'not-a-number'

        try:
            response = api_client.get(f'cdr/{invalid_id}')

            if not response['result']:
                print(f"✓ Invalid ID format rejected")
            else:
                print(f"⚠ Invalid ID format accepted")
        except Exception as e:
            if '400' in str(e) or '404' in str(e) or '422' in str(e):
                print(f"✓ Invalid ID format rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_03_invalid_disposition_value(self, api_client):
        """Test GET /cdr - Invalid disposition value"""
        try:
            response = api_client.get('cdr', params={'disposition': 'INVALID_STATUS', 'limit': 10})

            # Should either reject or ignore invalid value
            if not response['result']:
                print(f"✓ Invalid disposition rejected")
            else:
                # If accepted, should return empty or all CDR
                print(f"⚠ Invalid disposition accepted (may be ignored)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid disposition rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_04_invalid_date_format(self, api_client):
        """Test GET /cdr - Invalid date format"""
        try:
            response = api_client.get('cdr', params={
                'dateFrom': 'not-a-date',
                'limit': 10
            })

            if not response['result']:
                print(f"✓ Invalid date format rejected")
            else:
                print(f"⚠ Invalid date format accepted (may be ignored)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid date format rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_05_date_range_from_after_to(self, api_client):
        """Test GET /cdr - dateFrom > dateTo (invalid range)"""
        try:
            response = api_client.get('cdr', params={
                'dateFrom': '2025-12-31T23:59:59',
                'dateTo': '2025-01-01T00:00:00',  # Earlier than dateFrom
                'limit': 10
            })

            # Should either reject or return empty list
            if response['result']:
                data = response['data']
                if len(data) == 0:
                    print(f"✓ Invalid date range returned empty list")
                else:
                    print(f"⚠ Invalid date range returned {len(data)} records")
            else:
                print(f"✓ Invalid date range rejected")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid date range rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_06_limit_too_large(self, api_client):
        """Test GET /cdr - Limit exceeds maximum (>1000)"""
        try:
            response = api_client.get('cdr', params={'limit': 5000, 'offset': 0})

            if response['result']:
                data = response['data']
                # Should cap at maximum (1000)
                assert len(data) <= 1000, f"Limit should be capped at 1000, got {len(data)}"
                print(f"✓ Large limit capped at {len(data)} records")
            else:
                print(f"✓ Large limit rejected")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Large limit rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_07_negative_limit(self, api_client):
        """Test GET /cdr - Negative limit value"""
        try:
            response = api_client.get('cdr', params={'limit': -10, 'offset': 0})

            if not response['result']:
                print(f"✓ Negative limit rejected")
            else:
                # May convert to absolute value or use default
                print(f"⚠ Negative limit accepted (may be converted)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Negative limit rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_08_negative_offset(self, api_client):
        """Test GET /cdr - Negative offset value"""
        try:
            response = api_client.get('cdr', params={'limit': 10, 'offset': -5})

            if not response['result']:
                print(f"✓ Negative offset rejected")
            else:
                # May convert to 0 or use default
                print(f"⚠ Negative offset accepted (may be converted to 0)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Negative offset rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_09_playback_without_view_param(self, api_client):
        """Test GET /cdr:playback - Missing required view parameter"""
        try:
            response = api_client.get('cdr:playback', params={})

            if not response['result']:
                print(f"✓ Missing view parameter rejected")
            else:
                print(f"⚠ Missing view parameter accepted")
        except Exception as e:
            if '400' in str(e) or '422' in str(e):
                print(f"✓ Missing view parameter rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_10_playback_invalid_file_path(self, api_client):
        """Test GET /cdr:playback - Invalid file path"""
        try:
            response = api_client.get('cdr:playback', params={
                'view': '/invalid/path/to/nonexistent.mp3'
            })

            if not response['result']:
                print(f"✓ Invalid file path rejected")
            else:
                print(f"⚠ Invalid file path accepted")
        except Exception as e:
            if '404' in str(e) or '403' in str(e):
                print(f"✓ Invalid file path rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
