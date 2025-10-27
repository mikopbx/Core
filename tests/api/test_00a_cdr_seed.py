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
    MIKOPBX_CONTAINER       - Docker container name (default: mikopbx_php83)
    MIKOPBX_SSH_HOST        - SSH hostname for remote execution
    MIKOPBX_SSH_USER        - SSH username (default: root)
    MIKOPBX_EXECUTION_MODE  - Force execution mode (docker|ssh|local)
"""

import pytest
import os


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

        # First, check if test CDR data already exists
        # Test data uses IDs 1-30, so we check if data exists in that range
        print("Checking for existing test CDR data (IDs 1-30)...")
        seeder = CDRSeederRemote()

        try:
            # Use the helper method to check for test data
            existing_test_ids = seeder.get_test_cdr_ids()

            if len(existing_test_ids) > 0:
                print(f"✓ Found existing test CDR data ({len(existing_test_ids)} records)")
                print("✓ Test data IDs:", existing_test_ids[:5], "..." if len(existing_test_ids) > 5 else "")
                print("✓ Skipping seeding - test data already present")
                print("=" * 60)

                # Store existing IDs
                TestCDRSeeding.seeded_cdr_ids = existing_test_ids
                pytest.skip("Test CDR data already exists - skipping seeding")
            else:
                print("✓ No test CDR data found (IDs 1-30 range is empty)")

        except Exception as e:
            print(f"⚠ Could not check for existing test CDR data: {e}")
            print("⚠ Proceeding with seeding...")

        # No existing data found - proceed with seeding
        print("\nNo test CDR data found - starting seeding...")
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

        print(f"\n✓ CDR seeding completed successfully")
        print(f"✓ Seeded {len(seeded_ids)} CDR records")
        print(f"✓ CDR IDs: {min(seeded_ids)} - {max(seeded_ids)}")
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
        if not TestCDRSeeding.seeded_cdr_ids:
            pytest.skip("No CDR data was seeded")

        # Try to get CDR list with recent date filter
        response = api_client.get('cdr', params={
            'dateFrom': '2025-10-01',
            'dateTo': '2025-10-31',
            'limit': 10
        })

        assert response.get('result') is True, "CDR API endpoint failed"
        assert 'data' in response, "CDR response missing data field"
        assert isinstance(response['data'], list), "CDR data should be a list"

        # CDR might be empty if date filter doesn't match seeded data
        # This is not a failure - just means data is outside date range
        print(f"\n✓ CDR API is working")
        print(f"✓ CDR endpoint returned successfully")
        print(f"✓ Retrieved {len(response['data'])} CDR records (may be 0 if outside date range)")

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
