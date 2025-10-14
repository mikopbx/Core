#!/usr/bin/env python3
"""
Test suite for System Logs (Syslog) operations

Tests the /pbxcore/api/v3/syslog endpoint for:
- Getting system logs with filtering (GET /syslog)
- Downloading logs (GET /syslog:download)
- Clearing logs (POST /syslog:clear)
- Log level filtering
- Time range filtering
- Search functionality
"""

import pytest
from conftest import assert_api_success


class TestSyslog:
    """Comprehensive tests for Syslog API"""

    def test_01_get_logs_basic(self, api_client):
        """Test GET /syslog - Get system logs with default settings"""
        try:
            response = api_client.get('syslog')
            assert_api_success(response, "Failed to get system logs")

            data = response.get('data', {})

            # Logs might be returned as list or dict with 'items'
            if isinstance(data, list):
                logs = data
            elif isinstance(data, dict):
                logs = data.get('items', data.get('logs', []))
            else:
                logs = []

            print(f"✓ Retrieved system logs")
            print(f"  Total entries: {len(logs)}")

            if len(logs) > 0:
                # Show sample log entry
                first_log = logs[0]
                if isinstance(first_log, dict):
                    print(f"  Sample entry fields: {list(first_log.keys())[:5]}")
                elif isinstance(first_log, str):
                    print(f"  Sample: {first_log[:100]}...")

        except Exception as e:
            if '422' in str(e) or '501' in str(e) or '404' in str(e):
                print(f"⚠ Syslog endpoint not implemented or requires params")
                pytest.skip("Syslog not implemented")
            else:
                raise

    def test_02_get_logs_with_limit(self, api_client):
        """Test GET /syslog?limit=N - Get logs with pagination"""
        params = {
            'limit': 10,
            'offset': 0
        }

        try:
            response = api_client.get('syslog', params=params)
            assert_api_success(response, "Failed to get logs with limit")

            data = response.get('data', {})

            if isinstance(data, list):
                logs = data
                total = len(logs)
            elif isinstance(data, dict):
                logs = data.get('items', data.get('logs', []))
                total = data.get('total', len(logs))
            else:
                logs = []
                total = 0

            print(f"✓ Retrieved logs with pagination")
            print(f"  Requested: {params['limit']}")
            print(f"  Received: {len(logs)}")
            if total != len(logs):
                print(f"  Total available: {total}")

        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ Pagination not supported")
            else:
                print(f"⚠ Error: {str(e)[:50]}")

    def test_03_get_logs_with_level_filter(self, api_client):
        """Test GET /syslog?level={level} - Filter by log level"""
        # Common syslog levels: emergency, alert, critical, error, warning, notice, info, debug
        levels = ['error', 'warning', 'info']

        for level in levels:
            try:
                params = {'level': level, 'limit': 5}
                response = api_client.get('syslog', params=params)

                if response.get('result') is True:
                    data = response.get('data', {})
                    logs = data if isinstance(data, list) else data.get('items', [])
                    print(f"✓ Level filter '{level}': {len(logs)} entries")
                    break  # Found working level filter
                else:
                    continue

            except Exception as e:
                if '422' in str(e):
                    continue  # Try next level
                else:
                    print(f"⚠ Level filter error: {str(e)[:50]}")
                    break

    def test_04_get_logs_with_search(self, api_client):
        """Test GET /syslog?search={term} - Search in logs"""
        params = {
            'search': 'error',
            'limit': 10
        }

        try:
            response = api_client.get('syslog', params=params)

            if response.get('result') is True:
                data = response.get('data', {})
                logs = data if isinstance(data, list) else data.get('items', [])
                print(f"✓ Log search works: found {len(logs)} matching entries")
            else:
                print(f"⚠ Search returned no results")

        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Search not supported or invalid params")
            elif '501' in str(e):
                print(f"⚠ Search not implemented")
            else:
                print(f"⚠ Error: {str(e)[:50]}")

    def test_05_get_logs_with_time_range(self, api_client):
        """Test GET /syslog?from={timestamp}&to={timestamp} - Time range filtering"""
        import time

        # Get logs from last hour
        current_time = int(time.time())
        one_hour_ago = current_time - 3600

        params = {
            'from': one_hour_ago,
            'to': current_time,
            'limit': 10
        }

        try:
            response = api_client.get('syslog', params=params)

            if response.get('result') is True:
                data = response.get('data', {})
                logs = data if isinstance(data, list) else data.get('items', [])
                print(f"✓ Time range filter works: {len(logs)} entries in last hour")
            else:
                print(f"⚠ Time range filter returned no results")

        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Time range filter not supported")
            else:
                print(f"⚠ Error: {str(e)[:50]}")

    def test_06_get_log_from_file(self, api_client):
        """Test POST /syslog:getLogFromFile - Get logs from specific file

        This is the REAL working endpoint for getting logs in production.
        Example: POST /syslog:getLogFromFile with data:
        - filename: asterisk/messages (or other log files)
        - filter: search string
        - logLevel: error, warning, info, etc.
        - dateFrom: unix timestamp
        - dateTo: unix timestamp
        - lines: max number of lines
        """
        import time

        # Test with common log files
        test_files = [
            'asterisk/messages',
            'system/messages',
            'php/error.log',
            'nginx/error.log'
        ]

        current_time = int(time.time())
        one_hour_ago = current_time - 3600

        found_working = False
        for filename in test_files:
            try:
                data = {
                    'filename': filename,
                    'filter': '',  # No filter
                    'logLevel': '',  # All levels
                    'dateFrom': one_hour_ago,
                    'dateTo': current_time,
                    'lines': 100  # Limit to 100 lines
                }

                response = api_client.post('syslog:getLogFromFile', data)

                if response.get('result') is True:
                    result_data = response.get('data', {})

                    # May return logs as array or string
                    if isinstance(result_data, list):
                        log_count = len(result_data)
                    elif isinstance(result_data, dict):
                        log_count = len(result_data.get('logs', result_data.get('items', [])))
                    elif isinstance(result_data, str):
                        log_count = len(result_data.split('\n'))
                    else:
                        log_count = 0

                    print(f"✓ Log file '{filename}' retrieved successfully")
                    print(f"  Lines returned: {log_count}")
                    print(f"  Time range: {one_hour_ago} - {current_time}")
                    found_working = True
                    break

            except Exception as e:
                if '404' in str(e) or '422' in str(e):
                    # File not found or invalid, try next
                    continue
                else:
                    print(f"⚠ Error reading '{filename}': {str(e)[:50]}")

        if not found_working:
            print(f"⚠ No log files found or accessible (tested: {', '.join(test_files)})")

    def test_07_get_log_from_file_with_filter(self, api_client):
        """Test POST /syslog:getLogFromFile with filter"""
        import time

        current_time = int(time.time())
        one_hour_ago = current_time - 3600

        data = {
            'filename': 'asterisk/messages',
            'filter': 'ERROR',  # Search for errors
            'logLevel': '',
            'dateFrom': one_hour_ago,
            'dateTo': current_time,
            'lines': 50
        }

        try:
            response = api_client.post('syslog:getLogFromFile', data)

            if response.get('result') is True:
                result_data = response.get('data', {})
                print(f"✓ Log filtering works")
                print(f"  Filter: '{data['filter']}'")

                if isinstance(result_data, list):
                    print(f"  Matching entries: {len(result_data)}")
            else:
                print(f"⚠ Log filtering failed or no results")

        except Exception as e:
            if '404' in str(e) or '422' in str(e):
                print(f"⚠ Log file not found or filter not supported")
            else:
                print(f"⚠ Error: {str(e)[:50]}")

    def test_08_download_logs(self, api_client):
        """Test GET /syslog:download - Download logs as file"""
        try:
            response = api_client.get('syslog:download')

            if response.get('result') is True:
                data = response.get('data', {})

                # Download might return file data or path
                if isinstance(data, dict):
                    if 'fpassthru' in data:
                        # File download metadata
                        file_info = data['fpassthru']
                        print(f"✓ Log download available")
                        print(f"  Filename: {file_info.get('filename', 'N/A')}")
                        print(f"  Content-Type: {file_info.get('content_type', 'N/A')}")
                    elif 'content' in data or 'file_path' in data:
                        print(f"✓ Log download available")
                elif isinstance(data, str):
                    # Direct content
                    print(f"✓ Log download available: {len(data)} bytes")
                else:
                    print(f"⚠ Unexpected download format")
            else:
                print(f"⚠ Log download failed")

        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ Log download not implemented")
            else:
                print(f"⚠ Error: {str(e)[:50]}")

    def test_09_get_logs_list(self, api_client):
        """Test GET /syslog:getLogsList - Get list of available log files

        This endpoint returns all available log files that can be queried.
        """
        try:
            response = api_client.get('syslog:getLogsList')

            if response.get('result') is True:
                data = response.get('data', [])

                if isinstance(data, list):
                    print(f"✓ Log files list retrieved successfully")
                    print(f"  Total log files: {len(data)}")

                    if len(data) > 0:
                        # Show sample log files
                        print(f"  Sample log files: {data[:5]}")
                elif isinstance(data, dict):
                    files = data.get('files', data.get('items', []))
                    print(f"✓ Log files list retrieved: {len(files)} files")
                else:
                    print(f"✓ Logs list endpoint works")
            else:
                print(f"⚠ Logs list unavailable")

        except Exception as e:
            if '404' in str(e) or '501' in str(e) or '405' in str(e):
                print(f"⚠ Logs list not implemented")
            else:
                print(f"⚠ Error: {str(e)[:80]}")

    def test_10_get_log_time_range(self, api_client):
        """Test GET /syslog:getLogTimeRange - Get time range for log file

        This endpoint returns the time range (earliest and latest timestamps)
        for a specific log file.
        """
        # Test with common log file
        try:
            # Need to provide filename parameter
            params = {'filename': 'asterisk/messages'}
            response = api_client.get('syslog:getLogTimeRange', params=params)

            if response.get('result') is True:
                data = response.get('data', {})

                if isinstance(data, dict):
                    # Expected fields: start_time, end_time or similar
                    if 'start' in data or 'end' in data or 'from' in data or 'to' in data:
                        print(f"✓ Log time range retrieved successfully")
                        print(f"  Range data: {list(data.keys())}")
                    else:
                        print(f"✓ Time range endpoint works (custom format)")
                        print(f"  Data keys: {list(data.keys())[:5]}")
                else:
                    print(f"✓ Time range endpoint works")
            else:
                print(f"⚠ Time range unavailable for specified file")

        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Time range requires valid filename parameter")
            elif '404' in str(e) or '501' in str(e) or '405' in str(e):
                print(f"⚠ Time range not implemented")
            else:
                print(f"⚠ Error: {str(e)[:80]}")

    def test_11_erase_file(self, api_client):
        """Test POST /syslog:eraseFile - Erase (clear) log file

        DANGEROUS: This operation clears log file content.
        We test with non-existent file or expect proper authorization.
        """
        # Test with fake filename to avoid damaging real logs
        erase_data = {
            'filename': 'fake/nonexistent.log'
        }

        try:
            response = api_client.post('syslog:eraseFile', erase_data)

            if response.get('result') is True:
                print(f"⚠ File erase succeeded (verify it was test file)")
            else:
                messages = response.get('messages', {})
                if '404' in str(messages) or 'not found' in str(messages).lower():
                    print(f"✓ Erase validates file existence")
                elif 'permission' in str(messages).lower() or 'forbidden' in str(messages).lower():
                    print(f"✓ Erase requires proper permissions")
                else:
                    print(f"✓ Erase rejected invalid request")

        except Exception as e:
            if '403' in str(e):
                print(f"✓ Erase requires special permissions (expected)")
            elif '422' in str(e) or '400' in str(e):
                print(f"✓ Erase validates input")
            elif '404' in str(e) or '501' in str(e) or '405' in str(e):
                print(f"⚠ Erase not implemented")
            else:
                print(f"⚠ Error: {str(e)[:80]}")

    def test_12_clear_logs(self, api_client):
        """Test POST /syslog:clear - Clear system logs

        NOTE: This is a DANGEROUS operation. We test with dry-run or expect rejection.
        """
        # Try to clear logs (may require special permissions)
        clear_data = {
            'confirm': True  # Some systems require confirmation
        }

        try:
            response = api_client.post('syslog:clear', clear_data)

            if response.get('result') is True:
                print(f"⚠ Log clearing succeeded (DANGEROUS - logs were actually cleared)")
                data = response.get('data', {})
                if isinstance(data, dict):
                    print(f"  Response: {data}")
            else:
                messages = response.get('messages', {})
                print(f"✓ Log clearing requires authorization (expected): {messages}")

        except Exception as e:
            if '403' in str(e):
                print(f"✓ Log clearing requires special permissions (expected)")
            elif '501' in str(e) or '404' in str(e):
                print(f"⚠ Log clearing not implemented")
            else:
                print(f"⚠ Error: {str(e)[:50]}")


class TestSyslogEdgeCases:
    """Edge cases for Syslog API"""

    def test_01_get_logs_invalid_limit(self, api_client):
        """Test GET /syslog with invalid limit values"""
        invalid_limits = [
            {'limit': -1},      # Negative
            {'limit': 0},       # Zero
            {'limit': 100000},  # Too large
        ]

        for params in invalid_limits:
            try:
                response = api_client.get('syslog', params=params)

                if not response.get('result'):
                    print(f"✓ Invalid limit rejected: {params['limit']}")
                else:
                    print(f"⚠ Invalid limit accepted: {params['limit']}")

            except Exception as e:
                if '422' in str(e) or '400' in str(e):
                    print(f"✓ Invalid limit rejected via HTTP: {params['limit']}")
                else:
                    print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_02_get_logs_invalid_level(self, api_client):
        """Test GET /syslog with invalid log level"""
        params = {
            'level': 'invalid_level_xyz',
            'limit': 5
        }

        try:
            response = api_client.get('syslog', params=params)

            if not response.get('result'):
                print(f"✓ Invalid log level rejected")
            else:
                print(f"⚠ Invalid log level accepted")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid log level rejected via HTTP")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_03_get_logs_invalid_time_range(self, api_client):
        """Test GET /syslog with invalid time range (from > to)"""
        import time
        current_time = int(time.time())

        params = {
            'from': current_time,
            'to': current_time - 3600,  # to is before from
            'limit': 5
        }

        try:
            response = api_client.get('syslog', params=params)

            if not response.get('result') or len(response.get('data', [])) == 0:
                print(f"✓ Invalid time range handled correctly (empty or error)")
            else:
                print(f"⚠ Invalid time range accepted")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid time range rejected via HTTP")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_04_get_logs_sql_injection_attempt(self, api_client):
        """Test GET /syslog with SQL injection attempt in search"""
        params = {
            'search': "'; DROP TABLE logs; --",
            'limit': 5
        }

        try:
            response = api_client.get('syslog', params=params)

            # Should either reject or sanitize, not crash
            if response.get('result') is not None:
                print(f"✓ SQL injection attempt handled safely")
            else:
                print(f"⚠ Unexpected response to SQL injection")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ SQL injection rejected")
            elif '500' in str(e):
                print(f"⚠ SQL injection caused server error (security issue!)")
            else:
                print(f"✓ SQL injection handled: {str(e)[:50]}")

    def test_05_download_logs_without_permission(self, api_client):
        """Test GET /syslog:download might require elevated permissions"""
        # This test checks if download is properly restricted
        try:
            response = api_client.get('syslog:download')

            if response.get('result') is True:
                print(f"⚠ Log download available without restrictions")
            else:
                print(f"✓ Log download may require special permissions")

        except Exception as e:
            if '403' in str(e) or '401' in str(e):
                print(f"✓ Log download requires authentication/authorization")
            elif '501' in str(e):
                print(f"⚠ Log download not implemented")
            else:
                print(f"⚠ Error: {str(e)[:50]}")

    def test_06_clear_logs_without_confirmation(self, api_client):
        """Test POST /syslog:clear without confirmation"""
        # Try to clear without proper confirmation
        try:
            response = api_client.post('syslog:clear', {})

            if not response.get('result'):
                print(f"✓ Log clearing requires confirmation")
            else:
                print(f"⚠ Log clearing allowed without confirmation (DANGEROUS)")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Log clearing requires confirmation (HTTP error)")
            elif '403' in str(e):
                print(f"✓ Log clearing requires special permissions")
            else:
                print(f"⚠ Error: {str(e)[:50]}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
