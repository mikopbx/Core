#!/usr/bin/env python3
"""
Test suite for CDR getStatsByProvider endpoint

Tests the GET /pbxcore/api/v3/cdr:getStatsByProvider endpoint for:
- Aggregated call statistics grouped by provider/trunk
- Direction splitting (incoming vs outgoing)
- Date range filtering (required parameters)
- Optional provider filter
- Date validation (missing dates, invalid format, range > 365 days, inverted range)
- Multi-leg call deduplication (same linkedid counted once)

PREREQUISITES:
=============
Providers are created via REST API (sip-providers endpoint).
CDR data is seeded via direct SQL (CDR records are read-only via API).
Test data uses CDR IDs 900-909 to avoid conflicts with main CDR seed data.

Data is seeded at setup and cleaned up at teardown.
"""

import base64
import pytest
from conftest import assert_api_success
from config import get_config
from helpers.cdr_seeder_remote import CDRSeederRemote

config = get_config()


# ========== CDR Seed SQL Generator ==========

def _build_cdr_seed_sql(provider_a: str, provider_b: str) -> str:
    """Generate CDR seed SQL using actual provider IDs from REST API.

    CDR records are read-only via API (created by Asterisk), so direct SQL
    is the only way to seed test data. Provider IDs are injected dynamically
    from REST API-created providers.

    Args:
        provider_a: Provider A uniqid (from POST /sip-providers response)
        provider_b: Provider B uniqid (from POST /sip-providers response)

    Returns:
        SQL string with 10 CDR records (IDs 900-909)
    """
    return f"""BEGIN TRANSACTION;

-- Incoming ANSWERED via Provider A, call 1
INSERT OR REPLACE INTO cdr_general (
    id, start, endtime, answer, src_num, dst_num, disposition,
    from_account, to_account, recordingfile, billsec, duration, UNIQUEID, linkedid
) VALUES (
    900, '2025-12-05 09:00:00.000', '2025-12-05 09:01:00.000', '2025-12-05 09:00:05.000',
    '79001234567', '201', 'ANSWERED',
    '{provider_a}', '', '', 55, 60,
    'mikopbx-stats-test.900', 'mikopbx-stats-test.900'
);

-- Incoming ANSWERED via Provider A, call 2
INSERT OR REPLACE INTO cdr_general (
    id, start, endtime, answer, src_num, dst_num, disposition,
    from_account, to_account, recordingfile, billsec, duration, UNIQUEID, linkedid
) VALUES (
    901, '2025-12-06 10:00:00.000', '2025-12-06 10:02:05.000', '2025-12-06 10:00:10.000',
    '79002345678', '202', 'ANSWERED',
    '{provider_a}', '', '', 115, 125,
    'mikopbx-stats-test.901', 'mikopbx-stats-test.901'
);

-- Incoming NOANSWER via Provider A, call 3
INSERT OR REPLACE INTO cdr_general (
    id, start, endtime, answer, src_num, dst_num, disposition,
    from_account, to_account, recordingfile, billsec, duration, UNIQUEID, linkedid
) VALUES (
    902, '2025-12-07 11:00:00.000', '2025-12-07 11:00:00.000', '',
    '79003456789', '203', 'NOANSWER',
    '{provider_a}', '', '', 0, 0,
    'mikopbx-stats-test.902', 'mikopbx-stats-test.902'
);

-- Outgoing ANSWERED via Provider A, call 1
INSERT OR REPLACE INTO cdr_general (
    id, start, endtime, answer, src_num, dst_num, disposition,
    from_account, to_account, recordingfile, billsec, duration, UNIQUEID, linkedid
) VALUES (
    903, '2025-12-08 14:00:00.000', '2025-12-08 14:01:30.000', '2025-12-08 14:00:08.000',
    '201', '79009876543', 'ANSWERED',
    '', '{provider_a}', '', 82, 90,
    'mikopbx-stats-test.903', 'mikopbx-stats-test.903'
);

-- Outgoing ANSWERED via Provider A, call 2
INSERT OR REPLACE INTO cdr_general (
    id, start, endtime, answer, src_num, dst_num, disposition,
    from_account, to_account, recordingfile, billsec, duration, UNIQUEID, linkedid
) VALUES (
    904, '2025-12-09 15:00:00.000', '2025-12-09 15:01:50.000', '2025-12-09 15:00:05.000',
    '202', '79008765432', 'ANSWERED',
    '', '{provider_a}', '', 108, 110,
    'mikopbx-stats-test.904', 'mikopbx-stats-test.904'
);

-- Incoming ANSWERED via Provider B
INSERT OR REPLACE INTO cdr_general (
    id, start, endtime, answer, src_num, dst_num, disposition,
    from_account, to_account, recordingfile, billsec, duration, UNIQUEID, linkedid
) VALUES (
    905, '2025-12-10 09:00:00.000', '2025-12-10 09:00:50.000', '2025-12-10 09:00:03.000',
    '79005678901', '204', 'ANSWERED',
    '{provider_b}', '', '', 50, 50,
    'mikopbx-stats-test.905', 'mikopbx-stats-test.905'
);

-- Incoming NOANSWER via Provider B
INSERT OR REPLACE INTO cdr_general (
    id, start, endtime, answer, src_num, dst_num, disposition,
    from_account, to_account, recordingfile, billsec, duration, UNIQUEID, linkedid
) VALUES (
    906, '2025-12-11 10:00:00.000', '2025-12-11 10:00:10.000', '',
    '79006789012', '205', 'NOANSWER',
    '{provider_b}', '', '', 0, 10,
    'mikopbx-stats-test.906', 'mikopbx-stats-test.906'
);

-- Outgoing NOANSWER via Provider B
INSERT OR REPLACE INTO cdr_general (
    id, start, endtime, answer, src_num, dst_num, disposition,
    from_account, to_account, recordingfile, billsec, duration, UNIQUEID, linkedid
) VALUES (
    907, '2025-12-12 16:00:00.000', '2025-12-12 16:00:10.000', '',
    '203', '79007890123', 'NOANSWER',
    '', '{provider_b}', '', 0, 10,
    'mikopbx-stats-test.907', 'mikopbx-stats-test.907'
);

-- Multi-leg call dedup: leg 1 (IVR) — same linkedid as record 909
INSERT OR REPLACE INTO cdr_general (
    id, start, endtime, answer, src_num, dst_num, disposition,
    from_account, to_account, recordingfile, billsec, duration, UNIQUEID, linkedid
) VALUES (
    908, '2025-12-15 09:00:00.000', '2025-12-15 09:00:30.000', '2025-12-15 09:00:02.000',
    '79004567890', '2200100', 'ANSWERED',
    '{provider_a}', '', '', 28, 30,
    'mikopbx-stats-test.908', 'mikopbx-stats-dedup.100'
);

-- Multi-leg call dedup: leg 2 (transferred) — same linkedid, counted as 1 call
INSERT OR REPLACE INTO cdr_general (
    id, start, endtime, answer, src_num, dst_num, disposition,
    from_account, to_account, recordingfile, billsec, duration, UNIQUEID, linkedid
) VALUES (
    909, '2025-12-15 09:00:30.000', '2025-12-15 09:02:00.000', '2025-12-15 09:00:35.000',
    '79004567890', '201', 'ANSWERED',
    '{provider_a}', '', '', 85, 90,
    'mikopbx-stats-test.909', 'mikopbx-stats-dedup.100'
);

COMMIT;"""


def _execute_sql(seeder: CDRSeederRemote, sql: str, db_path: str) -> bool:
    """Execute SQL on station using CDRSeederRemote infrastructure.

    Uses base64 encoding to safely pass SQL with quotes through all
    execution modes (docker, api, ssh, local).
    """
    encoded = base64.b64encode(sql.encode()).decode()
    command = f"echo '{encoded}' | base64 -d | sqlite3 {db_path}"
    result = seeder._execute_command(command)
    if result.returncode != 0:
        print(f"SQL execution error: {result.stderr}")
        return False
    return True


# ========== Fixtures ==========

@pytest.fixture(scope='module')
def provider_ids(api_client):
    """Create test SIP providers via REST API, return their IDs, cleanup after module.

    Providers are created through the standard REST API to ensure proper
    database records (m_Providers, m_Extensions, m_Sip) are created.
    """
    print("\n--- Creating test providers via REST API ---")

    provider_a_data = {
        'description': 'Test Provider A (CDR stats)',
        'host': 'test-stats-provider-a.example.com',
        'username': 'test_stats_a',
        'secret': 'TestStats12345A',
        'registration_type': 'outbound',
        'port': 5060,
    }
    resp_a = api_client.post('sip-providers', provider_a_data)
    assert_api_success(resp_a, "Failed to create test Provider A")
    provider_a = resp_a['data']['id']

    provider_b_data = {
        'description': 'Test Provider B (CDR stats)',
        'host': 'test-stats-provider-b.example.com',
        'username': 'test_stats_b',
        'secret': 'TestStats12345B',
        'registration_type': 'outbound',
        'port': 5060,
    }
    resp_b = api_client.post('sip-providers', provider_b_data)
    assert_api_success(resp_b, "Failed to create test Provider B")
    provider_b = resp_b['data']['id']

    print(f"  Provider A: {provider_a}")
    print(f"  Provider B: {provider_b}")
    print("--- Test providers created ---")

    yield {'a': provider_a, 'b': provider_b}

    # Cleanup: delete providers via REST API
    print("\n--- Deleting test providers ---")
    api_client.delete(f'sip-providers/{provider_a}')
    api_client.delete(f'sip-providers/{provider_b}')
    print("--- Test providers deleted ---")


@pytest.fixture(scope='module', autouse=True)
def seed_provider_cdr_data(provider_ids):
    """Seed CDR data after providers are created, clean up after module.

    CDR records are read-only via REST API (only Asterisk creates them),
    so direct SQL seeding is the only option for test data.
    Uses CDRSeederRemote for cross-environment execution (docker/api/ssh/local).
    """
    seeder = CDRSeederRemote()
    cdr_db = config.cdr_database_path

    print("\n--- Seeding CDR stats-by-provider test data ---")

    # Clean any leftover data first
    cleanup_sql = "DELETE FROM cdr_general WHERE id BETWEEN 900 AND 919;"
    _execute_sql(seeder, cleanup_sql, cdr_db)

    # Seed CDR data with actual provider IDs from REST API
    sql = _build_cdr_seed_sql(provider_ids['a'], provider_ids['b'])
    success = _execute_sql(seeder, sql, cdr_db)
    if not success:
        pytest.skip("Failed to seed CDR stats-by-provider test data")

    print("  CDR records seeded (IDs 900-909)")
    print("--- CDR stats-by-provider test data seeded successfully ---")

    yield

    # Cleanup CDR data
    print("\n--- Cleaning up CDR stats-by-provider test data ---")
    _execute_sql(seeder, cleanup_sql, cdr_db)
    print("--- CDR cleanup complete ---")


# ========== Tests ==========

class TestGetStatsByProvider:
    """Tests for GET /cdr:getStatsByProvider endpoint"""

    def test_01_basic_request_all_providers(self, api_client):
        """Test basic request returning stats for all providers.

        Verifies response structure: array of objects with
        provider, providerName, direction, totalCalls, answeredCalls,
        totalDuration, totalBillsec.
        """
        response = api_client.get('cdr:getStatsByProvider', params={
            'dateFrom': '2025-12-01',
            'dateTo': '2025-12-31'
        })
        assert_api_success(response, "Failed to get stats by provider")

        data = response.get('data', [])
        assert isinstance(data, list), "Response data should be a list"
        assert len(data) > 0, "Expected at least one provider stats entry"

        # Verify structure of each entry
        required_fields = ['provider', 'providerName', 'direction',
                           'totalCalls', 'answeredCalls', 'totalDuration', 'totalBillsec']
        for entry in data:
            for field in required_fields:
                assert field in entry, f"Missing field '{field}' in stats entry: {entry}"

        # Verify types
        for entry in data:
            assert isinstance(entry['totalCalls'], int), "totalCalls should be int"
            assert isinstance(entry['answeredCalls'], int), "answeredCalls should be int"
            assert isinstance(entry['totalDuration'], int), "totalDuration should be int"
            assert isinstance(entry['totalBillsec'], int), "totalBillsec should be int"
            assert entry['direction'] in ('incoming', 'outgoing'), \
                f"direction should be 'incoming' or 'outgoing', got '{entry['direction']}'"

        print(f"✓ Got {len(data)} stats entries")
        for entry in data:
            print(f"  {entry['provider']} ({entry['providerName']}) "
                  f"{entry['direction']}: {entry['totalCalls']} calls "
                  f"({entry['answeredCalls']} answered)")

    def test_02_provider_a_incoming_stats(self, api_client, provider_ids):
        """Test Provider A incoming stats with deduplication.

        Provider A has 4 incoming linkedids (900, 901, 902, and dedup group 908+909).
        Records 908 and 909 share linkedid 'mikopbx-stats-dedup.100' and should be
        counted as 1 call. So totalCalls should be 4, answeredCalls should be 3.
        """
        response = api_client.get('cdr:getStatsByProvider', params={
            'dateFrom': '2025-12-01',
            'dateTo': '2025-12-31'
        })
        assert_api_success(response, "Failed to get stats")

        data = response.get('data', [])
        provider_a_in = [e for e in data
                         if e['provider'] == provider_ids['a'] and e['direction'] == 'incoming']

        assert len(provider_a_in) == 1, \
            f"Expected 1 entry for Provider A incoming, got {len(provider_a_in)}"

        stats = provider_a_in[0]
        assert stats['totalCalls'] == 4, \
            f"Expected 4 incoming calls (3 individual + 1 dedup group), got {stats['totalCalls']}"
        assert stats['answeredCalls'] == 3, \
            f"Expected 3 answered incoming calls, got {stats['answeredCalls']}"
        assert stats['totalDuration'] > 0, "Expected non-zero totalDuration"
        assert stats['totalBillsec'] > 0, "Expected non-zero totalBillsec"

        print(f"✓ Provider A incoming: {stats['totalCalls']} calls, "
              f"{stats['answeredCalls']} answered, "
              f"duration={stats['totalDuration']}s, billsec={stats['totalBillsec']}s")

    def test_03_provider_a_outgoing_stats(self, api_client, provider_ids):
        """Test Provider A outgoing stats."""
        response = api_client.get('cdr:getStatsByProvider', params={
            'dateFrom': '2025-12-01',
            'dateTo': '2025-12-31'
        })
        assert_api_success(response, "Failed to get stats")

        data = response.get('data', [])
        provider_a_out = [e for e in data
                          if e['provider'] == provider_ids['a'] and e['direction'] == 'outgoing']

        assert len(provider_a_out) == 1, \
            f"Expected 1 entry for Provider A outgoing, got {len(provider_a_out)}"

        stats = provider_a_out[0]
        assert stats['totalCalls'] == 2, \
            f"Expected 2 outgoing calls, got {stats['totalCalls']}"
        assert stats['answeredCalls'] == 2, \
            f"Expected 2 answered outgoing calls, got {stats['answeredCalls']}"

        print(f"✓ Provider A outgoing: {stats['totalCalls']} calls, "
              f"{stats['answeredCalls']} answered")

    def test_04_provider_b_stats(self, api_client, provider_ids):
        """Test Provider B incoming and outgoing stats."""
        response = api_client.get('cdr:getStatsByProvider', params={
            'dateFrom': '2025-12-01',
            'dateTo': '2025-12-31'
        })
        assert_api_success(response, "Failed to get stats")

        data = response.get('data', [])

        # Provider B incoming: 2 calls (1 answered)
        provider_b_in = [e for e in data
                         if e['provider'] == provider_ids['b'] and e['direction'] == 'incoming']
        assert len(provider_b_in) == 1, \
            f"Expected 1 entry for Provider B incoming, got {len(provider_b_in)}"
        assert provider_b_in[0]['totalCalls'] == 2
        assert provider_b_in[0]['answeredCalls'] == 1

        # Provider B outgoing: 1 call (0 answered)
        provider_b_out = [e for e in data
                          if e['provider'] == provider_ids['b'] and e['direction'] == 'outgoing']
        assert len(provider_b_out) == 1, \
            f"Expected 1 entry for Provider B outgoing, got {len(provider_b_out)}"
        assert provider_b_out[0]['totalCalls'] == 1
        assert provider_b_out[0]['answeredCalls'] == 0

        print(f"✓ Provider B incoming: {provider_b_in[0]['totalCalls']} calls "
              f"({provider_b_in[0]['answeredCalls']} answered)")
        print(f"✓ Provider B outgoing: {provider_b_out[0]['totalCalls']} calls "
              f"({provider_b_out[0]['answeredCalls']} answered)")

    def test_05_filter_by_specific_provider(self, api_client, provider_ids):
        """Test filtering by specific provider ID."""
        response = api_client.get('cdr:getStatsByProvider', params={
            'dateFrom': '2025-12-01',
            'dateTo': '2025-12-31',
            'provider': provider_ids['b']
        })
        assert_api_success(response, "Failed to get stats with provider filter")

        data = response.get('data', [])
        assert len(data) > 0, "Expected data for filtered provider"

        # All entries should be for Provider B only
        for entry in data:
            assert entry['provider'] == provider_ids['b'], \
                f"Expected only Provider B, got '{entry['provider']}'"

        print(f"✓ Provider filter works: {len(data)} entries for {provider_ids['b']}")

    def test_06_filter_excludes_other_providers(self, api_client, provider_ids):
        """Test that provider filter excludes other providers."""
        response = api_client.get('cdr:getStatsByProvider', params={
            'dateFrom': '2025-12-01',
            'dateTo': '2025-12-31',
            'provider': provider_ids['a']
        })
        assert_api_success(response, "Failed to get stats")

        data = response.get('data', [])
        returned_providers = {entry['provider'] for entry in data}

        assert provider_ids['b'] not in returned_providers, \
            "Provider B should not appear when filtering by Provider A"

        print(f"✓ Filter correctly excludes other providers")

    def test_07_empty_date_range(self, api_client, provider_ids):
        """Test date range with no matching records returns empty data."""
        response = api_client.get('cdr:getStatsByProvider', params={
            'dateFrom': '2020-01-01',
            'dateTo': '2020-01-31'
        })
        assert_api_success(response, "Failed with empty date range")

        data = response.get('data', [])
        assert isinstance(data, list), "Response should be a list"
        # Filter only test providers (other data might exist)
        test_data = [e for e in data
                     if e['provider'] in (provider_ids['a'], provider_ids['b'])]
        assert len(test_data) == 0, "Expected no test provider data for 2020 date range"

        print(f"✓ Empty date range returns no test provider data")

    def test_08_nonexistent_provider(self, api_client):
        """Test filtering by non-existent provider returns empty data."""
        response = api_client.get('cdr:getStatsByProvider', params={
            'dateFrom': '2025-12-01',
            'dateTo': '2025-12-31',
            'provider': 'SIP-TRUNK-does-not-exist'
        })
        assert_api_success(response, "Failed with non-existent provider")

        data = response.get('data', [])
        assert len(data) == 0, f"Expected empty data for non-existent provider, got {len(data)}"

        print(f"✓ Non-existent provider returns empty data")


class TestGetStatsByProviderValidation:
    """Validation and edge case tests for getStatsByProvider"""

    def test_01_missing_date_from(self, api_client):
        """Test missing dateFrom returns 422 error."""
        response = api_client.get_raw('cdr:getStatsByProvider', params={
            'dateTo': '2025-12-31'
        })
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        assert data.get('result') is False, "Expected failure for missing dateFrom"
        errors = data.get('messages', {}).get('error', [])
        assert any('dateFrom' in e or 'required' in e.lower() for e in errors), \
            f"Expected error mentioning dateFrom/required, got: {errors}"

        print(f"✓ Missing dateFrom correctly rejected with 422")

    def test_02_missing_date_to(self, api_client):
        """Test missing dateTo returns 422 error."""
        response = api_client.get_raw('cdr:getStatsByProvider', params={
            'dateFrom': '2025-12-01'
        })
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        assert data.get('result') is False, "Expected failure for missing dateTo"

        print(f"✓ Missing dateTo correctly rejected with 422")

    def test_03_missing_both_dates(self, api_client):
        """Test missing both dates returns 422 error."""
        response = api_client.get_raw('cdr:getStatsByProvider')
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        assert data.get('result') is False, "Expected failure for missing both dates"

        print(f"✓ Missing both dates correctly rejected with 422")

    def test_04_date_range_exceeds_365_days(self, api_client):
        """Test date range > 365 days returns 422 error."""
        response = api_client.get_raw('cdr:getStatsByProvider', params={
            'dateFrom': '2024-01-01',
            'dateTo': '2025-12-31'
        })
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        assert data.get('result') is False, "Expected failure for range > 365 days"
        errors = data.get('messages', {}).get('error', [])
        assert any('365' in e for e in errors), \
            f"Expected error mentioning 365 days, got: {errors}"

        print(f"✓ Date range > 365 days correctly rejected with 422")

    def test_05_inverted_date_range(self, api_client):
        """Test dateFrom > dateTo returns 422 error."""
        response = api_client.get_raw('cdr:getStatsByProvider', params={
            'dateFrom': '2025-12-31',
            'dateTo': '2025-01-01'
        })
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        assert data.get('result') is False, "Expected failure for inverted date range"
        errors = data.get('messages', {}).get('error', [])
        assert any('before' in e.lower() for e in errors), \
            f"Expected error mentioning 'before', got: {errors}"

        print(f"✓ Inverted date range correctly rejected with 422")

    def test_06_invalid_date_format(self, api_client):
        """Test invalid date format returns 422 error."""
        response = api_client.get_raw('cdr:getStatsByProvider', params={
            'dateFrom': 'not-a-date',
            'dateTo': '2025-12-31'
        })
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        assert data.get('result') is False, "Expected failure for invalid date"
        errors = data.get('messages', {}).get('error', [])
        assert any('format' in e.lower() or 'invalid' in e.lower() for e in errors), \
            f"Expected error mentioning format/invalid, got: {errors}"

        print(f"✓ Invalid date format correctly rejected with 422")

    def test_07_date_only_format_accepted(self, api_client):
        """Test that YYYY-MM-DD format (without time) is accepted."""
        response = api_client.get('cdr:getStatsByProvider', params={
            'dateFrom': '2025-12-01',
            'dateTo': '2025-12-31'
        })
        assert_api_success(response, "Date-only format should be accepted")

        print(f"✓ Date-only format (YYYY-MM-DD) accepted")

    def test_08_datetime_format_accepted(self, api_client):
        """Test that YYYY-MM-DD HH:MM:SS format is accepted."""
        response = api_client.get('cdr:getStatsByProvider', params={
            'dateFrom': '2025-12-01 00:00:00',
            'dateTo': '2025-12-31 23:59:59'
        })
        assert_api_success(response, "Datetime format should be accepted")

        print(f"✓ Datetime format (YYYY-MM-DD HH:MM:SS) accepted")

    def test_09_exactly_365_days_accepted(self, api_client):
        """Test that exactly 365 days range is accepted."""
        response = api_client.get('cdr:getStatsByProvider', params={
            'dateFrom': '2025-01-01',
            'dateTo': '2025-12-31'
        })
        assert_api_success(response, "365-day range should be accepted")

        print(f"✓ Exactly 365-day range accepted")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
