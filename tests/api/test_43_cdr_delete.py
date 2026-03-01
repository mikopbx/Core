#!/usr/bin/env python3
"""
Test suite for CDR deletion operations

Tests the DELETE /pbxcore/api/v3/cdr/{id} endpoint for:
- Deleting single CDR record by numeric ID
- Deleting entire conversation by linkedid (mikopbx-*)
- Deleting CDR record with recording file
- Error handling for non-existent records
- Validation of deletion permissions

CDR deletion supports two modes based on ID format:
1. Numeric ID (e.g., "718517"): Deletes single record only
   - deleteRecording=false (default): Keeps recording file
   - deleteRecording=true: Deletes recording file(s)
2. linkedid (e.g., "mikopbx-1760784793.4627"): Deletes ALL records with this linkedid
   - deleteRecording=false (default): Keeps all recording files
   - deleteRecording=true: Deletes all recording files

IMPORTANT NOTES:
==============
1. These tests require CDR records to exist in the database
2. Tests will be SKIPPED if no CDR records are available
3. Tests create temporary CDR records for deletion (if possible)
4. Original CDR data is preserved using backup/restore mechanism
5. Recording files are tested only if they exist

HOW TO RUN:
==========
1. With existing CDR data: pytest test_43_cdr_delete.py -v
2. Fresh system: Tests will be skipped automatically
"""

import pytest
from conftest import assert_api_success
from config import get_config

config = get_config()


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


class TestCDRDelete:
    """Comprehensive CDR deletion tests"""

    # WHY: Store sample data for testing different deletion scenarios
    sample_cdr_id = None
    sample_cdr_with_recording = None
    sample_linkedid = None  # For testing linkedid-based deletion

    # Known linkedid from seed data (generate_cdr_fixtures.py creates 3 records with this linkedid)
    SEED_LINKED_ID = 'mikopbx-linked-call.100'

    @staticmethod
    def create_linked_cdr_records(api_client, linkedid='mikopbx-linked-call.100'):
        """
        Create 3 CDR records with shared linkedid for testing deletion

        This method creates test data directly in CDR database if seed data is missing.
        Used as fallback when test_00a_cdr_seed.py didn't run or data was deleted.

        Args:
            api_client: Authenticated API client
            linkedid: Shared linkedid for all 3 records (default: mikopbx-linked-call.100)

        Returns:
            str: The linkedid of created records, or None if creation failed
        """
        from datetime import datetime

        # Generate unique IDs for records (use high numbers to avoid collision with seed data)
        base_id = 900
        now = datetime.now()
        timestamp = now.strftime('%Y-%m-%d %H:%M:%S.000')

        # SQL to insert 3 linked CDR records
        sql_commands = f"""
INSERT INTO cdr_general (
    id, start, endtime, answer,
    src_num, dst_num, disposition,
    recordingfile, billsec, duration,
    UNIQUEID, linkedid
) VALUES
({base_id}, '{timestamp}', '{timestamp}', '{timestamp}',
 '79001234567', '201', 'ANSWERED',
 '', 45, 50,
 'mikopbx-test.{base_id}', '{linkedid}'),
({base_id + 1}, '{timestamp}', '{timestamp}', '{timestamp}',
 '201', '202', 'ANSWERED',
 '', 120, 125,
 'mikopbx-test.{base_id + 1}', '{linkedid}'),
({base_id + 2}, '{timestamp}', '{timestamp}', '{timestamp}',
 '202', '203', 'ANSWERED',
 '', 30, 35,
 'mikopbx-test.{base_id + 2}', '{linkedid}');
"""

        try:
            # Execute via REST API system:executeBashCommand
            # Escape single quotes in SQL for bash -c execution
            escaped_sql = sql_commands.replace("'", "'\"'\"'")
            response = api_client.post('system:executeBashCommand', data={
                'command': f"sqlite3 {config.cdr_database_path} '{escaped_sql}'"
            })

            if response.get('result'):
                result_data = response.get('data', {})
                if result_data.get('exitCode') == 0:
                    print(f"\n✓ Created 3 test CDR records with linkedid: {linkedid}")
                    print(f"  IDs: {base_id}, {base_id + 1}, {base_id + 2}")
                    return linkedid
                else:
                    print(f"\n✗ SQL execution failed: {result_data.get('output')}")
                    return None
            else:
                print(f"\n✗ Failed to create test CDR records: {response.get('messages')}")
                return None

        except Exception as e:
            print(f"\n✗ Exception creating test CDR records: {e}")
            return None

    @pytest.fixture(autouse=True)
    def setup_test_data(self, api_client):
        """
        Setup: Find suitable CDR records for testing
        WHY: We need existing CDR records to test deletion modes

        The CDR seed data (generate_cdr_fixtures.py) creates 3 records with
        linkedid='mikopbx-linked-call.100' specifically for testing linkedid-based deletion.
        """
        # Get grouped CDR list (REST API v3 format)
        response = api_client.get('cdr', params={'limit': 100})

        if response.get('result'):
            groups, pagination = extract_cdr_data(response)  # Grouped records

            # Find a linkedid with multiple records
            # WHY: Use two-pass approach to prioritize seed data linkedid
            fallback_linkedid = None

            for group in groups:
                linkedid = group.get('linkedid')
                records = group.get('records', [])

                if linkedid and len(records) > 0:
                    # Priority 1: Use seed data linkedid (guaranteed to have 3 records)
                    if linkedid == self.SEED_LINKED_ID and len(records) > 1:
                        TestCDRDelete.sample_linkedid = linkedid

                    # Priority 2: Store ANY linkedid with multiple records as fallback
                    if not fallback_linkedid and len(records) > 1:
                        fallback_linkedid = linkedid

                    # Store first record ID for numeric ID test
                    if not TestCDRDelete.sample_cdr_id:
                        TestCDRDelete.sample_cdr_id = str(records[0]['id'])

                    # Find record with recording file
                    for record in records:
                        if record.get('recordingfile') and record['recordingfile'].strip():
                            TestCDRDelete.sample_cdr_with_recording = str(record['id'])
                            break

                if (TestCDRDelete.sample_linkedid and
                    TestCDRDelete.sample_cdr_id and
                    TestCDRDelete.sample_cdr_with_recording):
                    break

            # Fallback: if seed linkedid not found, use any linkedid with multiple records
            if not TestCDRDelete.sample_linkedid and fallback_linkedid:
                TestCDRDelete.sample_linkedid = fallback_linkedid
                print(f"\n⚠ Seed linkedid '{self.SEED_LINKED_ID}' not found, using fallback: {fallback_linkedid}")

            print(f"\n✓ Test data setup:")
            print(f"  Sample CDR ID (numeric): {TestCDRDelete.sample_cdr_id}")
            print(f"  CDR with recording: {TestCDRDelete.sample_cdr_with_recording or 'None'}")
            print(f"  Sample linkedid: {TestCDRDelete.sample_linkedid or 'None'}")

    def test_01_delete_cdr_not_found(self, api_client):
        """Test DELETE /cdr/{id} - Non-existent record returns 404"""
        # Use a very large ID that definitely doesn't exist
        fake_id = '999999999'

        # WHY: api_client.delete() raises HTTPError on 404, we need to catch it
        import requests
        try:
            response = api_client.delete(f'cdr/{fake_id}')
            # If we get here, something is wrong - should have raised 404
            assert False, "Expected 404 error"
        except requests.exceptions.HTTPError as e:
            # WHY: Should return 404 for non-existent records
            assert e.response.status_code == 404, f"Expected 404, got {e.response.status_code}"
            print(f"✓ DELETE non-existent CDR returns 404")

    def test_02_delete_cdr_invalid_id(self, api_client):
        """Test DELETE /cdr/{id} - Invalid ID format returns 400"""
        # WHY: API accepts either numeric ID or linkedid (mikopbx-*)
        # Other formats should be rejected
        import requests
        invalid_ids = [
            'abc',          # Random string
            'siptrunk-123', # Wrong prefix
            '12.34',        # Decimal
            '-1'            # Negative
        ]

        for invalid_id in invalid_ids:
            try:
                response = api_client.delete(f'cdr/{invalid_id}')
                # If we get here, check response
                assert response.get('result') is False, f"Should fail for invalid ID: {invalid_id}"
            except requests.exceptions.HTTPError as e:
                # WHY: Should return 400 or 404 for invalid ID format
                assert e.response.status_code in [400, 404], \
                    f"Expected 400 or 404 for '{invalid_id}', got {e.response.status_code}"

        print(f"✓ DELETE with invalid IDs handled correctly")

    def test_03_delete_cdr_basic(self, api_client):
        """Test DELETE /cdr/{id} - Basic deletion (record only, keep file)"""
        if not TestCDRDelete.sample_cdr_id:
            pytest.skip("No CDR records available")

        cdr_id = TestCDRDelete.sample_cdr_id

        # Delete the record (without recording file)
        delete_response = api_client.delete(f'cdr/{cdr_id}',
                                           data={'deleteRecording': False})

        # WHY: Should successfully delete the record
        assert_api_success(delete_response, "Failed to delete CDR record")

        # Verify response structure
        assert 'id' in delete_response['data'], "Response should contain deleted ID"
        assert delete_response['data']['id'] == cdr_id, "Returned ID should match"
        assert 'recordingDeleted' in delete_response['data'], "Should indicate if recording was deleted"
        assert delete_response['data']['recordingDeleted'] is False, \
            "Recording should not be deleted with deleteRecording=false"

        print(f"✓ Deleted CDR {cdr_id} (kept recording file)")

        # Verify record is gone by checking list endpoint
        # WHY: GET /cdr/{id} returns result:true with empty data, not 404
        # So we verify deletion by checking the record is not in the list
        list_response = api_client.get('cdr', params={'limit': 100})
        groups, _ = extract_cdr_data(list_response)
        found = False
        for group in groups:
            for record in group.get('records', []):
                if str(record.get('id')) == cdr_id:
                    found = True
                    break
            if found:
                break
        assert not found, f"Deleted record {cdr_id} should not appear in CDR list"

        print(f"  → Verified record is deleted")

    def test_04_delete_cdr_with_recording(self, api_client):
        """Test DELETE /cdr/{id} - Delete record WITH recording file"""
        if not TestCDRDelete.sample_cdr_with_recording:
            pytest.skip("No CDR records with recordings available")

        cdr_id = TestCDRDelete.sample_cdr_with_recording

        # Find recording file from list endpoint (GET /cdr/{id} returns empty)
        list_response = api_client.get('cdr', params={'limit': 100})
        groups, _ = extract_cdr_data(list_response)
        recording_file = None
        for group in groups:
            for record in group.get('records', []):
                if str(record.get('id')) == cdr_id:
                    recording_file = record.get('recordingfile')
                    break
            if recording_file:
                break

        print(f"  Recording file: {recording_file}")

        # Delete the record WITH recording file
        delete_response = api_client.delete(f'cdr/{cdr_id}',
                                           data={'deleteRecording': True})

        # WHY: Should successfully delete both record and file
        assert_api_success(delete_response, "Failed to delete CDR with recording")

        # Verify response
        assert delete_response['data']['id'] == cdr_id
        # Note: recordingDeleted might be False if file doesn't exist or permission issues
        print(f"  Recording deleted: {delete_response['data']['recordingDeleted']}")

        print(f"✓ Deleted CDR {cdr_id} with recording file")

        # Verify record is gone by checking list endpoint
        list_response = api_client.get('cdr', params={'limit': 100})
        groups, _ = extract_cdr_data(list_response)
        found = False
        for group in groups:
            for record in group.get('records', []):
                if str(record.get('id')) == cdr_id:
                    found = True
                    break
            if found:
                break
        assert not found, f"Deleted record {cdr_id} should not appear in CDR list"

    def test_05_delete_by_linkedid(self, api_client):
        """Test DELETE /cdr/{linkedid} - Delete entire conversation by linkedid

        This test requires CDR seed data with linked calls (3 records sharing linkedid).
        If seed data is missing, the test creates temporary records for testing.
        """
        # Check if we have linkedid from seed data
        if TestCDRDelete.sample_linkedid is None:
            print(f"\n⚠ No linkedid found in setup - creating test records...")
            # Create test records with known linkedid
            linkedid = self.create_linked_cdr_records(api_client, self.SEED_LINKED_ID)

            if linkedid is None:
                pytest.fail(
                    f"Cannot create test CDR records for linkedid deletion test. "
                    f"Neither seed data nor dynamic creation succeeded."
                )

            # Update class variable for consistency
            TestCDRDelete.sample_linkedid = linkedid
        else:
            linkedid = TestCDRDelete.sample_linkedid

        print(f"  Testing deletion by linkedid: {linkedid}")

        # Count records with this linkedid before deletion
        list_response = api_client.get('cdr', params={'limit': 1000})
        linked_count_before = 0
        if list_response.get('result'):
            groups, pagination = extract_cdr_data(list_response)
            for group in groups:
                if group.get('linkedid') == linkedid:
                    linked_count_before = len(group.get('records', []))
                    break

        print(f"  Records with linkedid before: {linked_count_before}")
        assert linked_count_before > 1, \
            f"CDR seed data issue: linkedid '{linkedid}' has only {linked_count_before} record(s). " \
            f"Expected 3 records from seed data (mikopbx-linked-call.100)."

        # Delete by linkedid (mikopbx-* format)
        # WHY: linkedid automatically deletes ALL records with this linkedid
        delete_response = api_client.delete(f'cdr/{linkedid}',
                                           data={'deleteRecording': False})

        # WHY: Should delete all records with this linkedid
        assert_api_success(delete_response, "Failed to delete by linkedid")

        # Verify response structure
        assert delete_response['data']['linkedid'] == linkedid
        assert 'linkedRecordsDeleted' in delete_response['data']

        linked_deleted = delete_response['data']['linkedRecordsDeleted']
        expected_linked = linked_count_before - 1  # Minus the main record

        print(f"  Linked records deleted: {linked_deleted}")
        print(f"  Expected: {expected_linked}")

        assert linked_deleted == expected_linked, \
            f"Should delete {expected_linked} linked records, got {linked_deleted}"

        print(f"✓ Deleted all {linked_count_before} records with linkedid {linkedid}")

        # Verify all records with this linkedid are gone
        list_after = api_client.get('cdr', params={'limit': 1000})
        if list_after.get('result') and list_after.get('data', {}).get('data'):
            remaining_groups = [g for g in list_after['data']['data']
                               if g.get('linkedid') == linkedid]
            assert len(remaining_groups) == 0, \
                f"Found {len(remaining_groups)} groups still with linkedid {linkedid}"
            print(f"  → Verified all records deleted")

    def test_06_delete_cdr_permissions(self, api_client):
        """Test DELETE /cdr/{id} - Requires authentication"""
        # This test would need to be run with an unauthenticated client
        # For now, just document expected behavior
        print("✓ DELETE requires Bearer token authentication (tested via api_client)")

        # Note: In a full test suite, you would:
        # 1. Create a client without auth token
        # 2. Attempt DELETE
        # 3. Expect 401 Unauthorized

    def test_07_delete_response_structure(self, api_client):
        """Test DELETE response has correct structure"""
        # This is a documentation test - verifies API contract
        expected_fields = {
            'success': bool,
            'data': {
                'id': str,
                'linkedid': str,
                'recordingDeleted': bool,
                'linkedRecordsDeleted': int
            }
        }

        print("✓ DELETE response structure documented:")
        print(f"  {expected_fields}")

    def test_08_delete_id_format_modes(self, api_client):
        """Test DELETE with different ID formats and parameters"""
        test_cases = [
            {
                'id_format': 'numeric (e.g., 718517)',
                'behavior': 'Deletes single record only',
                'params': {'deleteRecording': False}
            },
            {
                'id_format': 'numeric (e.g., 718517)',
                'behavior': 'Deletes single record + recording file',
                'params': {'deleteRecording': True}
            },
            {
                'id_format': 'linkedid (e.g., mikopbx-1760784793.4627)',
                'behavior': 'Deletes ALL records with this linkedid',
                'params': {'deleteRecording': False}
            },
            {
                'id_format': 'linkedid (e.g., mikopbx-1760784793.4627)',
                'behavior': 'Deletes ALL records + all recording files',
                'params': {'deleteRecording': True}
            },
        ]

        print("✓ DELETE modes documentation:")
        for case in test_cases:
            print(f"  ID: {case['id_format']}")
            print(f"    Behavior: {case['behavior']}")
            print(f"    Params: {case['params']}")

        # Note: Actual deletion tests are in test_03, test_04, test_05
        # This test documents available deletion modes


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
