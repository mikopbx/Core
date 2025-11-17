#!/usr/bin/env python3
"""
Pytest configuration for pycalltests tests

This module provides shared fixtures for pycalltests integration tests.
It imports fixtures from the main API test suite for consistency.
"""

import sys
from pathlib import Path

# Add api directory to path for imports
api_tests_dir = Path(__file__).parent.parent / "api"
sys.path.insert(0, str(api_tests_dir))

# Import fixtures by loading the API conftest module explicitly
import importlib.util
spec = importlib.util.spec_from_file_location("api_conftest", api_tests_dir / "conftest.py")
api_conftest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api_conftest)

# Re-export fixtures from API conftest
api_client = api_conftest.api_client

# Re-export MikoPBXClient class for direct import
MikoPBXClient = api_conftest.MikoPBXClient

# Re-export utility functions
assert_api_success = api_conftest.assert_api_success
get_extension_secret = api_conftest.get_extension_secret
convert_employee_fixture_to_api_format = api_conftest.convert_employee_fixture_to_api_format


# CDR baseline fixture - specific to pycalltests tests
import pytest

@pytest.fixture
def cdr_baseline(api_client):
    """
    Provide CDR baseline for filtering records created during test

    The baseline object has two methods:
    - baseline() - Get current max CDR ID
    - get_records(since_id) - Get CDR records created after baseline

    Usage:
        async def test_call(api_client, cdr_baseline):
            baseline_id = cdr_baseline()
            # Make calls...
            cdr_records = cdr_baseline.get_records(baseline_id)

    Returns:
        CdrBaseline object with helper methods
    """
    class CdrBaseline:
        def __init__(self, client):
            self.client = client

        def __call__(self):
            """Get current max CDR ID to use as baseline"""
            try:
                # Get all CDR records and find max ID
                all_records = self.client.get('cdr')
                if all_records.get('result') and all_records.get('data'):
                    records = all_records['data']
                    if records:
                        # CDR records have 'id' field
                        max_id = max(int(r['id']) for r in records if 'id' in r)
                        return max_id
                return 0
            except Exception:
                # If CDR endpoint not available or empty, return 0
                return 0

        def get_records(self, since_id=0):
            """
            Get CDR records created after baseline ID

            Args:
                since_id: Baseline CDR ID (records with ID > since_id are returned)

            Returns:
                List of CDR records created after baseline
            """
            try:
                all_records = self.client.get('cdr')
                if all_records.get('result') and all_records.get('data'):
                    records = all_records['data']
                    # Filter records with ID > since_id
                    return [r for r in records if int(r.get('id', 0)) > since_id]
                return []
            except Exception:
                return []

    return CdrBaseline(api_client)


# Re-export all fixtures so they can be discovered by pytest
__all__ = [
    'api_client',
    'cdr_baseline',
    'MikoPBXClient',
    'assert_api_success',
    'get_extension_secret',
    'convert_employee_fixture_to_api_format'
]
