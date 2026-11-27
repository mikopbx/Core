#!/usr/bin/env python3
"""
CDR period filter bounds (dateFrom / dateTo) and server time metadata.

cdr_general.start is the PBX wall-clock time with milliseconds ("2026-11-27 23:59:59.977").
The filter must include the whole last day, read values in PBX local time and reject
values with a timezone, which cannot be mapped onto the stored time.

A temporary record is written straight into cdr.db (CDR records cannot be created via the API)
on a day far from the seed data, and removed afterwards.
"""

import re

import pytest
from config import get_config
from conftest import assert_api_success

CDR_DB = get_config().cdr_database_path
DAY = '2020-02-29'
LINKEDID = 'mikopbx-test-cdr-date-range'


def exec_bash(api_client, command: str, timeout: int = 30) -> dict:
    """Execute a shell command on the PBX and return the response data."""
    response = api_client.post('system:executeBashCommand', {'command': command, 'timeout': timeout})
    assert_api_success(response, f"Failed to execute: {command[:80]}")
    return response['data']


def sql(api_client, statement: str) -> dict:
    # The PBX writes CDRs concurrently: wait for its lock instead of failing
    return exec_bash(api_client, f'sqlite3 -cmd ".timeout 5000" {CDR_DB} "{statement}"')


def total(api_client, **params) -> int:
    response = api_client.get('cdr', params={**params, 'linkedid': LINKEDID, 'grouped': 'false', 'limit': 10})
    assert_api_success(response, f"Failed to get CDR list for {params}")
    return response['data']['pagination']['total']


@pytest.fixture(scope='module')
def last_second_record(api_client):
    """A call that started in the last second of DAY, with milliseconds."""
    sql(api_client, f"DELETE FROM cdr_general WHERE linkedid = '{LINKEDID}'")
    result = sql(
        api_client,
        "INSERT INTO cdr_general (start, endtime, src_num, dst_num, linkedid, UNIQUEID, disposition, duration, billsec)"
        f" VALUES ('{DAY} 23:59:59.500', '{DAY} 23:59:59.900', '201', '202', '{LINKEDID}',"
        f" '{LINKEDID}.1', 'NOANSWER', 0, 0)",
    )
    assert result['exitCode'] == 0, f"Cannot insert the test CDR record: {result.get('output')}"
    yield
    sql(api_client, f"DELETE FROM cdr_general WHERE linkedid = '{LINKEDID}'")


class TestCdrDateRange:

    def test_01_date_includes_last_second_of_day(self, api_client, last_second_record):
        # linkedid search ignores dates in the UI, the API applies both
        assert total(api_client, dateFrom=DAY, dateTo=DAY) == 1
        print("✓ dateTo=YYYY-MM-DD includes a call at 23:59:59.500")

    def test_02_time_includes_whole_second(self, api_client, last_second_record):
        assert total(api_client, dateFrom=f'{DAY} 23:59:59', dateTo=f'{DAY} 23:59:59') == 1
        assert total(api_client, dateFrom=f'{DAY}T23:59:59', dateTo=f'{DAY}T23:59:59') == 1
        assert total(api_client, dateFrom=DAY, dateTo=f'{DAY} 23:59:58') == 0
        print("✓ dateTo with a time includes that whole second")

    def test_03_next_day_excludes_record(self, api_client, last_second_record):
        assert total(api_client, dateFrom='2020-03-01', dateTo='2020-03-01') == 0
        print("✓ The next day does not include the record")

    @pytest.mark.parametrize('value', ['2020-02-29T23:59:59Z', '2020-02-29T23:59:59+03:00', '2020/02/29'])
    def test_04_rejects_timezone_and_other_formats(self, api_client, value):
        try:
            response = api_client.get('cdr', params={'dateFrom': value, 'dateTo': DAY, 'limit': 1})
        except Exception as e:
            assert '422' in str(e), f"Expected 422 for {value}, got: {str(e)[:120]}"
            return
        assert response['result'] is False, f"{value} must be rejected"
        assert response.get('httpCode') == 422, f"Expected 422 for {value}, got {response.get('httpCode')}"

    def test_05_metadata_has_server_time(self, api_client):
        response = api_client.get('cdr:getMetadata', params={'limit': 100})
        assert_api_success(response, "Failed to get CDR metadata")
        meta = response['data'].get('_meta')
        assert meta, "getMetadata must return _meta"
        assert re.fullmatch(r'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}', meta['server_now']), meta
        assert isinstance(meta['server_timezone_offset'], int)

        settings = api_client.get('time-settings')
        assert_api_success(settings, "Failed to get time settings")
        assert meta['server_timezone'] == settings['data']['PBXTimezone'], \
            f"_meta timezone {meta['server_timezone']} differs from PBX setting {settings['data']['PBXTimezone']}"
        print(f"✓ _meta: {meta}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
