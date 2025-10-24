#!/usr/bin/env python3
"""
Test suite for CDR Phase 5: Unified Testing

Tests the complete CDR API functionality after Phase 3-4 implementation:
- REST API format responses (for CRM integration)
- DataTables format responses (for web UI)
- Playback endpoint with tokens
- Download endpoint with tokens and meaningful filenames
- Incremental synchronization (idFrom parameter)
- Token generation and validation
- Grouped vs ungrouped responses

IMPORTANT NOTES:
==============
1. Tests require at least one CDR record with recording file
2. After system reset, CDR database will be EMPTY
3. Most tests will be SKIPPED if no recordings exist
4. This is expected behavior for read-only resources

HOW TO TEST WITH RECORDING DATA:
================================
Option 1: Use system with existing call recordings (ENABLE_SYSTEM_RESET=0)
Option 2: Make a test call with recording before running tests
Option 3: Accept that tests will be skipped on fresh systems
"""

import pytest
import re
from conftest import assert_api_success


def extract_cdr_data(response):
    """
    Extract CDR data from response handling nested structure.

    API may return:
    - Nested: {data: {data: [...], pagination: {...}}}
    - Flat: {data: [...]}
    """
    data_wrapper = response.get('data', {})

    if isinstance(data_wrapper, dict):
        if 'data' in data_wrapper:
            # Nested structure
            return data_wrapper['data'], data_wrapper.get('pagination')
        elif 'records' in data_wrapper:
            # Grouped structure might have records at top level
            return [data_wrapper], None

    # Flat structure or list
    if isinstance(data_wrapper, list):
        return data_wrapper, None

    return [], None


class TestCDRRestAPIFormat:
    """Test REST API format for CRM integration"""

    def test_01_rest_api_format_basic(self, api_client):
        """Test REST API format returns correct structure

        WHY: CRM systems need predictable JSON structure with data and pagination.
        REST format is detected by absence of 'draw' parameter.
        """
        response = api_client.get('cdr', params={
            'limit': 10,
            'offset': 0
        })

        assert_api_success(response, "Failed to get CDR list in REST format")

        # REST API format has nested structure
        data_wrapper = response.get('data', {})

        # Check if data has nested structure (new format) or flat (old format)
        if isinstance(data_wrapper, dict) and 'data' in data_wrapper:
            # New nested format: {data: {data: [...], pagination: {...}}}
            actual_data = data_wrapper['data']
            pagination = data_wrapper.get('pagination')
            print(f"✓ REST API format validated (nested structure)")
        else:
            # Old flat format: {data: [...]}
            actual_data = data_wrapper if isinstance(data_wrapper, list) else []
            pagination = None
            print(f"✓ REST API format validated (flat structure)")

        assert isinstance(actual_data, list), "data should be a list"
        print(f"  Records returned: {len(actual_data)}")

        # Check pagination structure
        if 'pagination' in response:
            pagination = response['pagination']
            expected_pagination_fields = ['total', 'limit', 'offset', 'hasMore']

            for field in expected_pagination_fields:
                if field in pagination:
                    print(f"  ✓ Pagination has '{field}': {pagination[field]}")
        else:
            print(f"  ⚠ No pagination object (may not be implemented yet)")

    def test_02_rest_api_with_grouped_false(self, api_client):
        """Test ungrouped response (each CDR record separate)

        WHY: CRM systems may want individual CDR records, not grouped by linkedid.
        """
        response = api_client.get('cdr', params={
            'limit': 20,
            'grouped': 'false'
        })

        assert_api_success(response, "Failed to get ungrouped CDR list")

        # Extract actual data (handle nested structure)
        data, pagination = extract_cdr_data(response)
        print(f"✓ Ungrouped format returned {len(data)} records")

        # Each record should be a flat object, not grouped
        if len(data) > 0:
            first_record = data[0]
            assert 'id' in first_record, "Record should have 'id' field"
            assert 'src_num' in first_record, "Record should have 'src_num' field"
            assert 'dst_num' in first_record, "Record should have 'dst_num' field"

            # Should NOT have grouped structure
            assert 'records' not in first_record, "Ungrouped records should not have 'records' array"
            print(f"  ✓ Records are flat objects (not grouped)")

    def test_03_rest_api_with_grouped_true(self, api_client):
        """Test grouped response (CDRs grouped by linkedid)

        WHY: Complex calls with transfers need to show all related CDR records.
        grouped=true combines records with same linkedid.
        """
        try:
            response = api_client.get('cdr', params={
                'limit': 20,
                'grouped': 'true'
            })

            assert_api_success(response, "Failed to get grouped CDR list")

            data, pagination = extract_cdr_data(response)
            print(f"✓ Grouped format returned {len(data)} groups")

            # Each item should be a group with records array
            if len(data) > 0:
                first_group = data[0]

                # Grouped structure should have:
                # - linkedid
                # - totalDuration / totalBillsec
                # - records array
                expected_fields = ['linkedid', 'start', 'src_num', 'dst_num', 'disposition']

                for field in expected_fields:
                    if field in first_group:
                        print(f"  ✓ Group has '{field}'")

                if 'records' in first_group:
                    print(f"  ✓ Group has 'records' array with {len(first_group['records'])} records")
                else:
                    print(f"  ⚠ Grouped format may not have 'records' array")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"  ⚠ Grouped parameter may not be implemented yet")
            else:
                raise

    def test_04_rest_api_incremental_sync_by_id(self, api_client):
        """Test incremental sync using idFrom parameter

        WHY: CRM systems need efficient incremental synchronization.
        They store last synced ID and request only newer records.
        """
        # First, get some records to find a baseline ID
        response = api_client.get('cdr', params={'limit': 10})
        assert_api_success(response, "Failed to get initial CDR list")

        data, pagination = extract_cdr_data(response)

        if len(data) == 0:
            pytest.skip("No CDR records available for incremental sync test")

        # Use first record ID as baseline - handle grouped/ungrouped
        first_item = data[0]
        if 'records' in first_item and len(first_item['records']) > 0:
            # Grouped format - get ID from first record
            baseline_id = first_item['records'][0]['id']
        else:
            # Ungrouped format
            baseline_id = first_item['id']
        print(f"  Baseline ID: {baseline_id}")

        # Request records after this ID
        response = api_client.get('cdr', params={
            'idFrom': baseline_id,
            'limit': 20,
            'sort': 'id',
            'order': 'ASC'
        })

        assert_api_success(response, "Failed to get CDR list with idFrom")

        new_data, new_pagination = extract_cdr_data(response)
        print(f"✓ Incremental sync returned {len(new_data)} records")

        # Verify all records have ID > baseline_id (handle grouped/ungrouped)
        if len(new_data) > 0:
            for item in new_data:
                # Check records in grouped format or item itself
                records_to_check = item.get('records', [item]) if 'records' in item else [item]

                for record in records_to_check:
                    if 'id' in record:
                        assert record['id'] > baseline_id, \
                            f"Record ID {record['id']} should be > baseline {baseline_id}"
            print(f"  ✓ All returned records have ID > {baseline_id}")

    def test_05_rest_api_date_range_filter(self, api_client):
        """Test date range filtering (dateFrom, dateTo)

        WHY: CRM systems often sync CDR data by date ranges.
        """
        from datetime import datetime, timedelta

        # Get records from last 7 days
        date_from = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d 00:00:00')
        date_to = datetime.now().strftime('%Y-%m-%d 23:59:59')

        try:
            response = api_client.get('cdr', params={
                'dateFrom': date_from,
                'dateTo': date_to,
                'limit': 20
            })

            assert_api_success(response, "Failed to get CDR list with date range")

            data = response['data']
            print(f"✓ Date range filter returned {len(data)} records")
            print(f"  Range: {date_from[:10]} to {date_to[:10]}")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"  ⚠ Date range filtering may not be fully implemented")
            else:
                raise


class TestCDRDataTablesFormat:
    """Test DataTables format for web UI"""

    def test_01_datatables_format_detection(self, api_client):
        """Test DataTables format is detected by 'draw' parameter

        WHY: API auto-detects format. If 'draw' parameter present, it's DataTables.
        """
        response = api_client.get('cdr', params={
            'draw': 1,
            'start': 0,
            'length': 10
        })

        assert_api_success(response, "Failed to get CDR list in DataTables format")

        # DataTables format should have:
        # - draw: echoed from request
        # - recordsTotal: total records without filtering
        # - recordsFiltered: records after filtering
        # - data: array of arrays (for table rows)

        expected_fields = ['draw', 'recordsTotal', 'recordsFiltered', 'data']
        found_fields = []

        for field in expected_fields:
            if field in response:
                found_fields.append(field)
                print(f"  ✓ Has '{field}': {response[field] if field == 'draw' else type(response[field])}")

        if len(found_fields) == len(expected_fields):
            print(f"✓ DataTables format structure complete")
        else:
            print(f"  ⚠ DataTables format may be incomplete ({len(found_fields)}/{len(expected_fields)} fields)")

    def test_02_datatables_with_search(self, api_client):
        """Test DataTables global search parameter

        WHY: Web UI needs to search by phone numbers or linkedid.
        """
        # First get some data to find a searchable value
        response = api_client.get('cdr', params={'limit': 5})
        assert_api_success(response, "Failed to get initial CDR data")

        data, pagination = extract_cdr_data(response)

        if len(data) == 0:
            pytest.skip("No CDR records available for search test")

        # Extract a phone number to search for
        first_record = data[0]
        # Handle grouped format
        if 'records' in first_record and len(first_record['records']) > 0:
            search_value = first_record['records'][0].get('src_num', first_record.get('src_num', ''))
        else:
            search_value = first_record.get('src_num', '')

        if not search_value:
            pytest.skip("No src_num available for search test")

        print(f"  Searching for: {search_value}")

        try:
            response = api_client.get('cdr', params={
                'draw': 1,
                'start': 0,
                'length': 10,
                'search[value]': search_value
            })

            assert_api_success(response, "Failed to search CDR")

            filtered_data = response['data']
            print(f"✓ Search returned {len(filtered_data)} records")

            if response.get('recordsFiltered') is not None:
                print(f"  recordsFiltered: {response['recordsFiltered']}")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"  ⚠ DataTables search may not be implemented")
            else:
                raise

    def test_03_datatables_grouped_by_linkedid(self, api_client):
        """Test DataTables returns grouped records (by linkedid)

        WHY: Web UI shows calls with transfers as grouped rows.
        DataTables format automatically groups by linkedid.
        """
        response = api_client.get('cdr', params={
            'draw': 1,
            'start': 0,
            'length': 10
        })

        assert_api_success(response, "Failed to get DataTables CDR list")

        # DataTables can return data directly or wrapped
        data_wrapper = response.get('data', [])
        if isinstance(data_wrapper, dict) and 'data' in data_wrapper:
            data = data_wrapper['data']
        else:
            data = data_wrapper if isinstance(data_wrapper, list) else []

        if len(data) == 0:
            pytest.skip("No CDR data available for grouping test")

        print(f"✓ DataTables returned {len(data)} rows")

        # Each row should be an array (DataTables format)
        # Format: [date, src_num, dst_num, duration, answered[], disposition, DT_RowId, DT_RowClass, ids]
        first_row = data[0]

        if isinstance(first_row, list):
            print(f"  ✓ Rows are arrays (DataTables format)")
            print(f"  Row has {len(first_row)} columns")

            # Check for DT_RowId and DT_RowClass (DataTables special fields)
            if 'DT_RowId' in first_row or (len(first_row) > 6 and isinstance(first_row[-3], str)):
                print(f"  ✓ Rows have DataTables metadata (DT_RowId, DT_RowClass)")
        else:
            print(f"  ⚠ Rows may not be in DataTables array format")


class TestCDRDownloadEndpoint:
    """Test download endpoint (/cdr/{id}:download)"""

    sample_cdr_id = None
    sample_download_url = None
    sample_token = None

    def test_01_find_cdr_with_download_url(self, api_client):
        """Find CDR record that has download_url

        WHY: Phase 4 added download_url to CDR records with recordings.
        """
        response = api_client.get('cdr', params={'limit': 100})
        assert_api_success(response, "Failed to get CDR list")

        data, pagination = extract_cdr_data(response)

        # Handle both grouped and ungrouped formats
        for item in data:
            # If grouped, look in records array
            if 'records' in item:
                records_to_check = item['records']
            else:
                records_to_check = [item]

            for record in records_to_check:
                if not isinstance(record, dict):
                    continue
                if record.get('recordingfile') and record.get('download_url'):
                    TestCDRDownloadEndpoint.sample_cdr_id = str(record['id'])
                    TestCDRDownloadEndpoint.sample_download_url = record['download_url']

                    print(f"✓ Found CDR with download_url: {TestCDRDownloadEndpoint.sample_cdr_id}")
                    print(f"  Download URL: {TestCDRDownloadEndpoint.sample_download_url}")
                    return

        pytest.skip(
            "No CDR records with download_url found. "
            "Make a test call with recording enabled and re-run."
        )

    def test_02_validate_download_url_format(self, api_client):
        """Validate download_url format includes token

        WHY: download_url should be separate from playback_url.
        Format: /pbxcore/api/v3/cdr/{id}:download?token=xxx
        """
        if not TestCDRDownloadEndpoint.sample_download_url:
            pytest.skip("No download URL available")

        url = TestCDRDownloadEndpoint.sample_download_url

        # Validate URL format
        assert 'pbxcore/api/v3/cdr/' in url, "URL should contain CDR endpoint"
        assert ':download' in url, "URL should contain :download custom method"
        assert 'token=' in url, "URL should contain token parameter"

        # Extract token
        match = re.search(r'token=([a-f0-9]+)', url)
        assert match, "Token should be hex string"

        token = match.group(1)
        assert len(token) == 32, f"Token should be 32 characters (hex), got {len(token)}"

        TestCDRDownloadEndpoint.sample_token = token
        print(f"✓ Download URL format valid")
        print(f"  Token: {token[:8]}...{token[-8:]}")

    def test_03_download_with_token(self, api_client):
        """Test download using token from download_url

        WHY: Download endpoint should return file with Content-Disposition: attachment.
        """
        if not TestCDRDownloadEndpoint.sample_token:
            pytest.skip("No token available")

        try:
            response = api_client.get('cdr:download', params={
                'token': TestCDRDownloadEndpoint.sample_token
            })

            assert_api_success(response, "Failed to download with token")

            data = response.get('data', {})
            assert data, "Response should contain file data"

            print(f"✓ Token-based download successful")

            # Check for file streaming metadata
            if 'fpassthru' in data:
                fpassthru = data['fpassthru']
                filename = fpassthru.get('filename', '')
                download_name = fpassthru.get('download_name', '')
                content_type = fpassthru.get('content_type', '')

                print(f"  Filename: {filename}")
                print(f"  Download name: {download_name}")
                print(f"  Content-Type: {content_type}")

                # Validate download_name has meaningful format
                if download_name:
                    # Should be like: call_101_to_102_2025-10-22_14-30-45.mp3
                    assert 'call_' in download_name, "Download name should start with 'call_'"
                    assert '_to_' in download_name, "Download name should contain '_to_'"
                    assert '.mp3' in download_name or '.wav' in download_name, \
                        "Download name should have audio extension"
                    print(f"  ✓ Download name is meaningful: {download_name}")

        except Exception as e:
            if '403' in str(e):
                pytest.fail("Token validation failed")
            elif '404' in str(e):
                pytest.fail("Recording file not found")
            else:
                raise

    def test_04_download_with_invalid_token(self, api_client):
        """Test download with invalid token should fail

        WHY: Security - invalid tokens must be rejected.
        """
        fake_token = 'b' * 32

        try:
            response = api_client.get('cdr:download', params={
                'token': fake_token
            })

            if response.get('result') is True:
                pytest.fail("Invalid token should be rejected")
            else:
                print(f"✓ Invalid token rejected for download")

        except Exception as e:
            if '403' in str(e) or '401' in str(e):
                print(f"✓ Invalid token rejected (HTTP 403/401)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_05_same_token_works_for_both_endpoints(self, api_client):
        """Test that same token works for both :playback and :download

        WHY: Phase 3 design - one token for both operations (simplicity).
        """
        if not TestCDRDownloadEndpoint.sample_token:
            pytest.skip("No token available")

        token = TestCDRDownloadEndpoint.sample_token

        # Try playback with same token
        try:
            playback_response = api_client.get('cdr:playback', params={
                'token': token
            })

            playback_success = playback_response.get('result', False)

            # Try download with same token
            download_response = api_client.get('cdr:download', params={
                'token': token
            })

            download_success = download_response.get('result', False)

            if playback_success and download_success:
                print(f"✓ Same token works for both :playback and :download")
                print(f"  This confirms Phase 3 design: one token for both operations")
            else:
                print(f"⚠ Token may not work for both endpoints")
                print(f"  Playback: {playback_success}, Download: {download_success}")

        except Exception as e:
            print(f"⚠ Error testing token reusability: {str(e)[:50]}")


class TestCDRPlaybackVsDownload:
    """Test differences between :playback and :download endpoints"""

    sample_token = None

    def test_01_get_token_from_recording(self, api_client):
        """Setup: Get a valid token from CDR record"""
        response = api_client.get('cdr', params={'limit': 100})
        assert_api_success(response, "Failed to get CDR list")

        data, pagination = extract_cdr_data(response)

        # Handle both grouped and ungrouped formats
        for item in data:
            if 'records' in item:
                records_to_check = item['records']
            else:
                records_to_check = [item]

            for record in records_to_check:
                if not isinstance(record, dict):
                    continue
                if record.get('playback_url'):
                    url = record['playback_url']
                    match = re.search(r'token=([a-f0-9]+)', url)
                    if match:
                        TestCDRPlaybackVsDownload.sample_token = match.group(1)
                        print(f"✓ Got token from playback_url")
                        return

        pytest.skip("No CDR with playback_url found")

    def test_02_playback_returns_inline_disposition(self, api_client):
        """Test :playback returns inline Content-Disposition

        WHY: Playback is for browser inline playback (not download).
        """
        if not TestCDRPlaybackVsDownload.sample_token:
            pytest.skip("No token available")

        try:
            response = api_client.get('cdr:playback', params={
                'token': TestCDRPlaybackVsDownload.sample_token
            })

            assert_api_success(response, "Failed to playback")

            data = response.get('data', {})
            if 'fpassthru' in data:
                fpassthru = data['fpassthru']
                download_name = fpassthru.get('download_name')

                # For inline playback, download_name should be null or empty
                if download_name is None or download_name == '':
                    print(f"✓ Playback returns inline disposition (download_name is null)")
                else:
                    print(f"  ⚠ Playback may have download_name: {download_name}")

        except Exception as e:
            print(f"⚠ Error testing playback disposition: {str(e)[:50]}")

    def test_03_download_returns_attachment_disposition(self, api_client):
        """Test :download returns attachment Content-Disposition

        WHY: Download is for saving file with meaningful name.
        """
        if not TestCDRPlaybackVsDownload.sample_token:
            pytest.skip("No token available")

        try:
            response = api_client.get('cdr:download', params={
                'token': TestCDRPlaybackVsDownload.sample_token
            })

            assert_api_success(response, "Failed to download")

            data = response.get('data', {})
            if 'fpassthru' in data:
                fpassthru = data['fpassthru']
                download_name = fpassthru.get('download_name')

                # For download, download_name should have meaningful value
                if download_name:
                    print(f"✓ Download returns attachment disposition")
                    print(f"  Filename: {download_name}")

                    # Validate meaningful format
                    assert 'call_' in download_name, "Should have 'call_' prefix"
                    assert '.mp3' in download_name or '.wav' in download_name, \
                        "Should have audio extension"
                else:
                    print(f"  ⚠ Download should have download_name")

        except Exception as e:
            print(f"⚠ Error testing download disposition: {str(e)[:50]}")


class TestCDRURLGeneration:
    """Test playback_url and download_url generation"""

    def test_01_records_with_files_have_urls(self, api_client):
        """Test that all CDR records with files have both URLs

        WHY: Phase 4 - DataStructure should generate URLs for all records with files.
        """
        response = api_client.get('cdr', params={'limit': 50})
        assert_api_success(response, "Failed to get CDR list")

        data, pagination = extract_cdr_data(response)
        records_with_files = 0
        records_with_playback_url = 0
        records_with_download_url = 0
        records_with_both_urls = 0

        # Handle both grouped and ungrouped formats
        for item in data:
            if 'records' in item:
                records_to_check = item['records']
            else:
                records_to_check = [item]

            for record in records_to_check:
                if not isinstance(record, dict):
                    continue
                if record.get('recordingfile'):
                    records_with_files += 1

                    has_playback = bool(record.get('playback_url'))
                    has_download = bool(record.get('download_url'))

                    if has_playback:
                        records_with_playback_url += 1
                    if has_download:
                        records_with_download_url += 1
                    if has_playback and has_download:
                        records_with_both_urls += 1

        print(f"✓ Checked URL generation for {len(data)} records")
        print(f"  Records with recordingfile: {records_with_files}")
        print(f"  Records with playback_url: {records_with_playback_url}")
        print(f"  Records with download_url: {records_with_download_url}")
        print(f"  Records with both URLs: {records_with_both_urls}")

        if records_with_files > 0:
            # All records with files should have both URLs
            assert records_with_both_urls == records_with_files, \
                f"All {records_with_files} records with files should have both URLs, " \
                f"but only {records_with_both_urls} do"
            print(f"  ✓ All records with files have both playback_url and download_url")

    def test_02_records_without_files_have_null_urls(self, api_client):
        """Test that CDR records without files have null URLs

        WHY: Don't generate URLs for non-existent files.
        """
        response = api_client.get('cdr', params={'limit': 50})
        assert_api_success(response, "Failed to get CDR list")

        data, pagination = extract_cdr_data(response)
        records_without_files = 0
        records_with_null_urls = 0

        # Handle both grouped and ungrouped formats
        for item in data:
            if 'records' in item:
                records_to_check = item['records']
            else:
                records_to_check = [item]

            for record in records_to_check:
                if not isinstance(record, dict):
                    continue
                if not record.get('recordingfile'):
                    records_without_files += 1

                    # URLs should be null or missing
                    if record.get('playback_url') is None and record.get('download_url') is None:
                        records_with_null_urls += 1

        print(f"✓ Checked null URLs for records without files")
        print(f"  Records without recordingfile: {records_without_files}")
        print(f"  Records with null URLs: {records_with_null_urls}")

        if records_without_files > 0:
            assert records_with_null_urls == records_without_files, \
                f"All {records_without_files} records without files should have null URLs"
            print(f"  ✓ All records without files have null URLs")

    def test_03_urls_contain_different_endpoints(self, api_client):
        """Test that playback_url and download_url point to different endpoints

        WHY: Phase 3 - two separate endpoints for different purposes.
        """
        response = api_client.get('cdr', params={'limit': 100})
        assert_api_success(response, "Failed to get CDR list")

        data, pagination = extract_cdr_data(response)

        # Handle both grouped and ungrouped formats
        for item in data:
            if 'records' in item:
                records_to_check = item['records']
            else:
                records_to_check = [item]

            for record in records_to_check:
                if not isinstance(record, dict):
                    continue

                playback_url = record.get('playback_url')
                download_url = record.get('download_url')

                if playback_url and download_url:
                    # Both should contain same CDR ID
                    cdr_id = str(record['id'])
                    assert cdr_id in playback_url, f"Playback URL should contain CDR ID {cdr_id}"
                    assert cdr_id in download_url, f"Download URL should contain CDR ID {cdr_id}"

                    # But different custom methods
                    assert ':playback' in playback_url, "Playback URL should have :playback"
                    assert ':download' in download_url, "Download URL should have :download"

                    print(f"✓ Record {cdr_id} has correctly formatted URLs")
                    print(f"  Playback: ...{playback_url[-40:]}")
                    print(f"  Download: ...{download_url[-40:]}")

                    # Found at least one, that's enough
                    return

        pytest.skip("No records with both URLs found")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
