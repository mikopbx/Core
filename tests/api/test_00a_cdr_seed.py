#!/usr/bin/env python3
"""
CDR Database Seeding Test

This test runs EARLY in the test suite (test_00a_*) to populate CDR test data.
It populates the CDR database with test data since CDR records are read-only via API.

Test Execution Order:
1. test_00_setup_clean_system.py (optional factory reset, requires ENABLE_SYSTEM_RESET=1)
2. test_00a_cdr_seed.py (THIS FILE - populates CDR data)
3. test_01_auth.py, test_02_*, etc. (regular API tests)
4. test_43_cdr*.py (CDR-specific tests that use seeded data)

NOTE: File naming uses '00a' to ensure execution AFTER test_00 but BEFORE test_01.
This prevents database locks from CDR seeding interfering with other tests.

WHY: CDR records are only created by actual phone calls through Asterisk.
To test CDR API endpoints without making real calls, we pre-populate the database
with realistic anonymized test data.

SMART SEEDING BEHAVIOR:
- Checks for existing CDR data via API before seeding
- If CDR data exists (production server), SKIPS seeding to avoid conflicts
- If no CDR data exists (test environment), performs seeding
- This allows running tests safely on both test and production servers

What this does (when no data exists):
1. Loads 30 anonymized CDR records from fixtures/cdr_seed_data.sql
2. Inserts into SQLite CDR database (/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db)
3. Creates minimal MP3 files for 15 records with recordings
4. Verifies seeding was successful

Data characteristics:
- 18 ANSWERED calls (15 with recordings, 3 without)
- 8 NOANSWER calls
- 4 failed calls (BUSY, CANCEL, CHANUNAVAIL)
- Anonymized phone numbers (79XXXXXXXXX for mobile, 201-299 for extensions)
- Recent dates (October 2025)
- Realistic call durations

Environment Variables:
    ENABLE_CDR_SEED=1       - Enable seeding (default: 1)
    ENABLE_CDR_CLEANUP=1    - Cleanup after tests (default: 1)
    MIKOPBX_CONTAINER       - Docker container name (default: mikopbx-php83)
    MIKOPBX_SSH_HOST        - SSH hostname for remote execution
    MIKOPBX_SSH_USER        - SSH username (default: root)
    MIKOPBX_EXECUTION_MODE  - Force execution mode (docker|ssh|local)
"""

import pytest
import os


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


class TestCDRSeeding:
    """CDR database seeding - runs once before all CDR tests"""

    # Class variable to store seeded CDR IDs for other tests
    seeded_cdr_ids = []

    @pytest.mark.order(1)  # Ensure this runs FIRST
    def test_01_seed_cdr_database(self):
        """
        Seed CDR database with test data

        This test populates the CDR database with 30 test records.
        Other CDR tests depend on this data being available.

        Smart behavior:
        - Checks if test CDR data (IDs 1-30) already exists in database
        - If test data exists, skips seeding to avoid duplication
        - If no test data exists, performs seeding
        - Uses direct database check (non-invasive, works on any server)

        Execution:
        - Runs once at the start of test session
        - Creates 30 CDR records with IDs 1-30 (if needed)
        - Creates 15 MP3 recording files (if needed)
        - Stores CDR IDs in class variable for other tests
        """
        from helpers.cdr_seeder_remote import CDRSeederRemote

        # Check if seeding is disabled
        if os.getenv('ENABLE_CDR_SEED', '1') != '1':
            pytest.skip("CDR seeding disabled (ENABLE_CDR_SEED=0)")

        print("\n" + "=" * 60)
        print("CDR Database Seeding Check")
        print("=" * 60)

        # Check if test CDR data already exists (both database AND files)
        # Test data uses IDs 1-30, and we expect 15 MP3 recording files
        print("Checking for existing test CDR data...")
        seeder = CDRSeederRemote()

        need_seeding = False
        skip_reason = None

        try:
            # Step 1: Check database for CDR records
            print("  1. Checking database for test CDR records (IDs 1-30)...")
            existing_test_ids = seeder.get_test_cdr_ids()

            if len(existing_test_ids) > 0:
                print(f"     ✓ Found {len(existing_test_ids)} CDR records in database")
                print(f"     ✓ CDR IDs: {existing_test_ids[:5]}{'...' if len(existing_test_ids) > 5 else ''}")

                # Step 2: Check for recording files (MP3 or WebM)
                print("  2. Checking for recording files (MP3/WebM)...")
                files_all_exist, files_found_count, format_found = seeder.verify_recording_files_exist()

                if files_all_exist:
                    print(f"     ✓ Found all {files_found_count} expected recording files")
                    print(f"     ✓ Format detected: {format_found.upper()}")
                    print("     ✓ Test data is complete - skipping seeding")

                    # Store existing IDs BEFORE skipping (critical for test_02)
                    TestCDRSeeding.seeded_cdr_ids = existing_test_ids

                    print("=" * 60)
                    pytest.skip(f"Test CDR data already exists (DB + {format_found.upper()} files) - skipping seeding")
                else:
                    # Database has records but recording files are missing/incomplete
                    print(f"     ⚠ Only found {files_found_count}/15 recording files (incomplete)")
                    if format_found != 'none':
                        print(f"     ⚠ Format detected: {format_found.upper()}")
                    print("     ⚠ Database has stale records without corresponding files")
                    print("     → Forcing re-seeding to restore complete test data")
                    need_seeding = True
            else:
                print("     ✓ No test CDR data found (IDs 1-30 range is empty)")
                need_seeding = True

        except Exception as e:
            print(f"  ⚠ Could not check for existing test CDR data: {e}")
            print("  ⚠ Proceeding with seeding...")
            need_seeding = True

        # Proceed with seeding if needed
        if need_seeding:
            print("\nStarting CDR seeding...")
            print("=" * 60)

            # Execute seeding (seeder already initialized above)
            success = seeder.seed()

            if not success:
                pytest.fail("❌ CDR seeding failed - CDR tests will not have test data")

            # Get list of seeded IDs
            seeded_ids = seeder.get_test_cdr_ids()

            # Store in class variable for access by other tests
            TestCDRSeeding.seeded_cdr_ids = seeded_ids

            # Verify seeding
            assert len(seeded_ids) > 0, "No CDR records were seeded"

            # Verify recording files were created (soft check - warning only)
            files_all_exist, files_found_count, format_found = seeder.verify_recording_files_exist()

            print(f"\n✓ CDR seeding completed successfully")
            print(f"✓ Seeded {len(seeded_ids)} CDR records")
            print(f"✓ CDR IDs: {min(seeded_ids)} - {max(seeded_ids)}")

            if files_all_exist:
                print(f"✓ Created {files_found_count} recording files ({format_found.upper()})")
            else:
                print(f"⚠ Only {files_found_count}/15 recording files created")
                if format_found != 'none':
                    print(f"⚠ Format: {format_found.upper()}")
                print(f"⚠ Some CDR tests requiring recordings may be skipped")

            print("=" * 60)

    @pytest.mark.order(2)
    def test_02_verify_cdr_data_available(self, api_client):
        """
        Verify CDR data is accessible via API

        Quick smoke test to ensure:
        - CDR API endpoint is working
        - Seeded data is retrievable
        - Database is not locked
        """
        # WHY: In CI/CD test_01 might be skipped but seeded_cdr_ids might not be set
        # Fallback: check database directly if class variable is empty
        if not TestCDRSeeding.seeded_cdr_ids:
            from helpers.cdr_seeder_remote import CDRSeederRemote
            print("\nℹ️  Class variable empty, checking database directly...")
            seeder = CDRSeederRemote()
            TestCDRSeeding.seeded_cdr_ids = seeder.get_test_cdr_ids()

            if not TestCDRSeeding.seeded_cdr_ids:
                pytest.skip("No CDR data was seeded")

            print(f"✓ Found {len(TestCDRSeeding.seeded_cdr_ids)} CDR records in database")

        # Try to get CDR list with recent date filter
        response = api_client.get('cdr', params={
            'dateFrom': '2025-10-01',
            'dateTo': '2025-10-31',
            'limit': 10
        })

        assert response.get('result') is True, "CDR API endpoint failed"
        assert 'data' in response, "CDR response missing data field"

        # Extract data using new format helper
        data, pagination = extract_cdr_data(response)
        assert isinstance(data, list), "CDR data should be a list"

        # Verify we actually got seeded data back
        if len(data) == 0:
            # Debug output to understand why data is empty
            print("\n" + "=" * 60)
            print("DEBUG: CDR API returned empty data")
            print("=" * 60)
            print(f"Response result: {response.get('result')}")
            print(f"Response keys: {list(response.keys())}")
            print(f"Data wrapper type: {type(response.get('data'))}")
            if isinstance(response.get('data'), dict):
                print(f"Data wrapper keys: {list(response.get('data').keys())}")
                print(f"Records in data: {response.get('data').get('records', 'N/A')}")
                print(f"Pagination in data: {response.get('data').get('pagination', 'N/A')}")
            else:
                print(f"Data content: {response.get('data')}")
            print(f"Seeded IDs: {TestCDRSeeding.seeded_cdr_ids}")
            print("=" * 60)

        assert len(data) > 0, f"Expected seeded CDR data, but got empty list. Seeded IDs: {TestCDRSeeding.seeded_cdr_ids}"

        print(f"\n✓ CDR API is working")
        print(f"✓ CDR endpoint returned successfully")
        print(f"✓ Retrieved {len(data)} CDR record groups")

        # Check pagination is present
        if pagination:
            print(f"✓ Pagination present: total={pagination.get('total')}, limit={pagination.get('limit')}")

        # Verify at least we can call the endpoint without database lock
        print(f"✓ No database lock detected - seeding completed successfully")


@pytest.fixture(scope='session')
def cdr_test_ids():
    """
    Fixture to provide seeded CDR IDs to other tests

    Usage in tests:
        def test_get_cdr_by_id(api_client, cdr_test_ids):
            if not cdr_test_ids:
                pytest.skip("No test CDR data available")

            cdr_id = cdr_test_ids[0]
            response = api_client.get(f'cdr/{cdr_id}')

    Returns:
        list[int]: List of CDR IDs (1-30) if seeding successful, empty list otherwise
    """
    return TestCDRSeeding.seeded_cdr_ids


def pytest_sessionfinish(session, exitstatus):
    """
    Cleanup CDR test data after all tests complete

    This hook is called after the entire test session finishes.
    It removes the seeded test data from the CDR database.
    """
    if os.getenv('ENABLE_CDR_CLEANUP', '1') != '1':
        print("\n⚠️ CDR cleanup disabled (ENABLE_CDR_CLEANUP=0)")
        return

    from helpers.cdr_seeder_remote import CDRSeederRemote

    print("\n" + "=" * 60)
    print("Cleaning up CDR test data...")
    print("=" * 60)

    seeder = CDRSeederRemote()
    seeder.cleanup()

    print("=" * 60)


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
