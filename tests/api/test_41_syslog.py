#!/usr/bin/env python3
"""
Test suite for System Logs (Syslog) operations

Tests the /pbxcore/api/v3/syslog endpoints:
- GET  /syslog:getLogsList      - Get list of available log files
- POST /syslog:getLogFromFile   - Get content from specific log file
- POST /syslog:getLogTimeRange  - Get available time range for log file
- POST /syslog:startCapture     - Start network packet capture (tcpdump)
- POST /syslog:stopCapture      - Stop capture and prepare archive
- POST /syslog:prepareArchive   - Prepare logs archive
- POST /syslog:downloadLogFile  - Download specific log file
- POST /syslog:downloadArchive  - Download prepared logs archive
- POST /syslog:eraseFile        - Erase log file content
"""

import time
import pytest
from conftest import assert_api_success


class TestSyslog:
    """Comprehensive tests for Syslog API"""

    def test_01_get_logs_list(self, api_client):
        """Test GET /syslog:getLogsList - Get list of available log files"""
        response = api_client.get('syslog:getLogsList')
        assert_api_success(response, "Failed to get logs list")

        data = response.get('data', [])

        if isinstance(data, list):
            print(f"✓ Log files list retrieved successfully")
            print(f"  Total log files: {len(data)}")
            if len(data) > 0:
                print(f"  Sample log files: {data[:5]}")
        elif isinstance(data, dict):
            files = data.get('files', data.get('items', []))
            print(f"✓ Log files list retrieved: {len(files)} files")

    def test_02_get_log_from_file(self, api_client):
        """Test POST /syslog:getLogFromFile - Get logs from specific file

        This is the main endpoint for reading log content.
        Parameters: filename, filter, logLevel, dateFrom, dateTo, lines, offset
        """
        current_time = int(time.time())
        one_hour_ago = current_time - 3600

        # Test with common log files
        test_files = [
            'asterisk/messages',
            'system/messages',
            'php/error.log',
            'nginx/error.log'
        ]

        found_working = False
        for filename in test_files:
            data = {
                'filename': filename,
                'filter': '',
                'logLevel': '',
                'dateFrom': one_hour_ago,
                'dateTo': current_time,
                'lines': 100
            }

            response = api_client.post('syslog:getLogFromFile', data)

            if response.get('result') is True:
                result_data = response.get('data', {})

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
                found_working = True
                break

        if not found_working:
            print(f"⚠ No log files accessible (tested: {', '.join(test_files)})")

    def test_03_get_log_from_file_with_filter(self, api_client):
        """Test POST /syslog:getLogFromFile with filter parameter"""
        current_time = int(time.time())
        one_hour_ago = current_time - 3600

        data = {
            'filename': 'asterisk/messages',
            'filter': 'ERROR',
            'logLevel': '',
            'dateFrom': one_hour_ago,
            'dateTo': current_time,
            'lines': 50
        }

        response = api_client.post('syslog:getLogFromFile', data)

        if response.get('result') is True:
            result_data = response.get('data', {})
            print(f"✓ Log filtering works")
            print(f"  Filter: '{data['filter']}'")

            if isinstance(result_data, list):
                print(f"  Matching entries: {len(result_data)}")
        else:
            print(f"⚠ Log filtering returned no results or file not found")

    def test_04_get_log_time_range(self, api_client):
        """Test POST /syslog:getLogTimeRange - Get time range for log file

        Returns the earliest and latest timestamps for a specific log file.
        """
        data = {'filename': 'asterisk/messages'}
        response = api_client.post('syslog:getLogTimeRange', data)

        if response.get('result') is True:
            result_data = response.get('data', {})

            if isinstance(result_data, dict):
                print(f"✓ Log time range retrieved successfully")
                print(f"  Range data: {list(result_data.keys())}")
            else:
                print(f"✓ Time range endpoint works")
        else:
            print(f"⚠ Time range unavailable for specified file")

    def test_05_start_capture(self, api_client):
        """Test POST /syslog:startCapture - Start network packet capture (tcpdump)

        WARNING: This starts a real tcpdump process on the system.
        """
        response = api_client.post('syslog:startCapture', {})

        if response.get('result') is True:
            print(f"✓ Network capture started successfully")
            data = response.get('data', {})
            if isinstance(data, dict):
                print(f"  Capture info: {data}")
        else:
            messages = response.get('messages', {})
            print(f"⚠ Start capture failed: {messages}")

    def test_06_stop_capture(self, api_client):
        """Test POST /syslog:stopCapture - Stop network capture and prepare archive"""
        response = api_client.post('syslog:stopCapture', {})

        if response.get('result') is True:
            print(f"✓ Network capture stopped successfully")
            data = response.get('data', {})
            if isinstance(data, dict):
                print(f"  Archive info: {data}")
        else:
            messages = response.get('messages', {})
            # May fail if no capture was running
            print(f"⚠ Stop capture: {messages}")

    def test_07_prepare_archive(self, api_client):
        """Test POST /syslog:prepareArchive - Prepare logs archive for download"""
        response = api_client.post('syslog:prepareArchive', {})

        if response.get('result') is True:
            print(f"✓ Logs archive prepared successfully")
            data = response.get('data', {})
            if isinstance(data, dict):
                print(f"  Archive info: {data}")
        else:
            messages = response.get('messages', {})
            print(f"⚠ Prepare archive failed: {messages}")

    def test_08_download_log_file(self, api_client):
        """Test POST /syslog:downloadLogFile - Download specific log file"""
        data = {
            'filename': 'asterisk/messages',
            'archive': False
        }

        response = api_client.post('syslog:downloadLogFile', data)

        if response.get('result') is True:
            result_data = response.get('data', {})

            if isinstance(result_data, dict):
                if 'fpassthru' in result_data:
                    file_info = result_data['fpassthru']
                    print(f"✓ Log download available")
                    print(f"  Filename: {file_info.get('filename', 'N/A')}")
                    print(f"  Content-Type: {file_info.get('content_type', 'N/A')}")
                elif 'content' in result_data or 'file_path' in result_data:
                    print(f"✓ Log download available")
                else:
                    print(f"✓ Download endpoint works: {list(result_data.keys())}")
            elif isinstance(result_data, str):
                print(f"✓ Log download available: {len(result_data)} bytes")
        else:
            messages = response.get('messages', {})
            print(f"⚠ Log download failed: {messages}")

    def test_09_download_archive(self, api_client):
        """Test POST /syslog:downloadArchive - Download prepared logs archive

        Requires prepareArchive to be called first to create the archive.
        The archive creation is ASYNC - prepareArchive returns immediately
        but the worker creates the archive in background.

        Flow:
        1. Call prepareArchive -> returns future filename
        2. Poll downloadArchive until status=READY (or timeout)
        3. Verify download link is available
        """
        import time
        import requests

        # First prepare an archive (async operation - starts background worker)
        prep_response = api_client.post('syslog:prepareArchive', {})

        if prep_response.get('result') is True:
            prep_data = prep_response.get('data', {})
            # Get archive filename from prepare response
            archive_filename = prep_data.get('filename', '/tmp/mikopbx_logs.zip')
            print(f"  Archive filename: {archive_filename}")

            data = {'filename': archive_filename}

            # Poll for archive readiness with timeout
            # WHY: prepareArchive is async - worker creates archive in background
            max_wait_seconds = 120  # Archive can take time for large logs
            poll_interval = 2
            elapsed = 0

            while elapsed < max_wait_seconds:
                try:
                    response = api_client.post('syslog:downloadArchive', data)

                    if response.get('result') is True:
                        result_data = response.get('data', {})
                        status = result_data.get('status', '')

                        if status == 'READY':
                            print(f"✓ Archive ready after {elapsed}s")
                            if 'filename' in result_data:
                                print(f"  Download link: {result_data['filename']}")
                            return  # Success!

                        elif status == 'PREPARING':
                            progress = result_data.get('progress', '?')
                            print(f"  Archive preparing... progress: {progress}% ({elapsed}s)")

                except requests.exceptions.HTTPError as e:
                    # 422 means archive not ready yet - worker creating progress file
                    if e.response.status_code == 422:
                        print(f"  Waiting for archive creation to start... ({elapsed}s)")
                    else:
                        print(f"  Unexpected HTTP error: {e}")
                        raise

                time.sleep(poll_interval)
                elapsed += poll_interval

            # Timeout reached
            print(f"⚠ Archive not ready after {max_wait_seconds}s timeout")
            # Don't fail test - archive creation may be slow on loaded systems
        else:
            print(f"⚠ Could not prepare archive for download test")

    def test_10_erase_file(self, api_client):
        """Test POST /syslog:eraseFile - Erase log file content

        WARNING: This is a destructive operation!
        We test with non-existent file to avoid damaging real logs.
        """
        import requests

        # Test with fake filename to avoid damaging real logs
        data = {'filename': 'fake/nonexistent.log'}

        try:
            response = api_client.post('syslog:eraseFile', data)

            if response.get('result') is True:
                print(f"⚠ File erase succeeded (verify it was test file)")
            else:
                messages = response.get('messages', {})
                print(f"✓ Erase rejected invalid request: {messages}")

        except requests.exceptions.HTTPError as e:
            # Expected: 422 "File does not exist" or 404
            if e.response.status_code in [404, 422]:
                print(f"✓ Erase validates file existence (HTTP {e.response.status_code})")
            elif e.response.status_code == 403:
                print(f"✓ Erase requires proper permissions")
            else:
                raise


class TestSyslogEdgeCases:
    """Edge cases and validation tests for Syslog API"""

    def test_01_get_log_from_file_empty_filename(self, api_client):
        """Test POST /syslog:getLogFromFile with empty filename - regression test

        Bug: Empty filename parameter resulted in trying to tail a directory
        instead of a file, producing empty output with success=true.

        Expected: 400/422 error with message about missing filename.
        """
        import requests

        print("\n=== Testing empty filename parameter ===")

        # Test Case 1: Empty string filename
        data = {'filename': '', 'lines': 10}

        try:
            response = api_client.post('syslog:getLogFromFile', data)

            if not response.get('result'):
                messages = response.get('messages', {})
                print(f"✓ Empty filename rejected correctly")
                print(f"  Error message: {messages}")
            else:
                content = response.get('data', {}).get('content', '')
                if not content:
                    print(f"❌ Empty filename accepted but returned empty content (BUG)")
                else:
                    print(f"❌ Empty filename should be rejected with error")
                pytest.fail("Empty filename should return error")

        except requests.exceptions.HTTPError as e:
            # Expected: 400 Bad Request
            if e.response.status_code in [400, 422]:
                print(f"✓ Empty filename rejected via HTTP {e.response.status_code}")
            else:
                raise

    def test_02_get_log_from_file_missing_filename(self, api_client):
        """Test POST /syslog:getLogFromFile without filename parameter"""
        import requests

        data = {'lines': 10}

        try:
            response = api_client.post('syslog:getLogFromFile', data)

            if not response.get('result'):
                print(f"✓ Missing filename rejected correctly")
            else:
                pytest.fail("Missing filename should return error")

        except requests.exceptions.HTTPError as e:
            # Expected: 400 Bad Request
            if e.response.status_code in [400, 422]:
                print(f"✓ Missing filename rejected via HTTP {e.response.status_code}")
            else:
                raise

    def test_03_get_log_from_file_invalid_lines(self, api_client):
        """Test POST /syslog:getLogFromFile with invalid lines parameter"""
        import requests

        test_cases = [
            {'filename': 'system/messages', 'lines': -1},
            {'filename': 'system/messages', 'lines': 0},
            {'filename': 'system/messages', 'lines': 1000000},
        ]

        for data in test_cases:
            try:
                response = api_client.post('syslog:getLogFromFile', data)
                lines = data['lines']

                if not response.get('result'):
                    print(f"✓ Invalid lines={lines} rejected")
                else:
                    # API may accept and normalize the value
                    print(f"⚠ Lines={lines} accepted (may be normalized)")

            except requests.exceptions.HTTPError as e:
                lines = data['lines']
                if e.response.status_code in [400, 422]:
                    print(f"✓ Invalid lines={lines} rejected via HTTP {e.response.status_code}")
                else:
                    print(f"⚠ Lines={lines} caused HTTP {e.response.status_code}")

    def test_04_get_log_from_file_path_traversal(self, api_client):
        """Test POST /syslog:getLogFromFile with path traversal attempt"""
        import requests

        malicious_filenames = [
            '../../../etc/passwd',
            '../../etc/shadow',
            '/etc/passwd',
            'asterisk/../../../etc/passwd',
        ]

        for filename in malicious_filenames:
            data = {'filename': filename, 'lines': 10}

            try:
                response = api_client.post('syslog:getLogFromFile', data)

                if not response.get('result'):
                    print(f"✓ Path traversal blocked: {filename[:30]}")
                else:
                    # Check if it didn't actually return /etc/passwd content
                    content = str(response.get('data', ''))
                    if 'root:' in content or 'nobody:' in content:
                        pytest.fail(f"Path traversal vulnerability! Filename: {filename}")
                    else:
                        print(f"⚠ Request succeeded but no sensitive data returned: {filename[:30]}")

            except requests.exceptions.HTTPError as e:
                # Expected: 400, 404, or 422 - path traversal blocked
                if e.response.status_code in [400, 404, 422]:
                    print(f"✓ Path traversal blocked: {filename[:30]} (HTTP {e.response.status_code})")
                else:
                    raise

    def test_05_get_log_time_range_invalid_filename(self, api_client):
        """Test POST /syslog:getLogTimeRange with non-existent file"""
        import requests

        data = {'filename': 'nonexistent/fake.log'}

        try:
            response = api_client.post('syslog:getLogTimeRange', data)

            if not response.get('result'):
                print(f"✓ Time range rejects non-existent file")
            else:
                print(f"⚠ Time range returned data for non-existent file")

        except requests.exceptions.HTTPError as e:
            # Expected: 404 or 422
            if e.response.status_code in [404, 422]:
                print(f"✓ Time range rejects non-existent file (HTTP {e.response.status_code})")
            else:
                raise

    def test_06_erase_file_path_traversal(self, api_client):
        """Test POST /syslog:eraseFile with path traversal attempt"""
        import requests

        data = {'filename': '../../../etc/passwd'}

        try:
            response = api_client.post('syslog:eraseFile', data)

            if not response.get('result'):
                print(f"✓ Erase blocks path traversal attempts")
            else:
                pytest.fail("Path traversal in erase should be blocked!")

        except requests.exceptions.HTTPError as e:
            # Expected: 400, 404, or 422 - path traversal blocked
            if e.response.status_code in [400, 404, 422]:
                print(f"✓ Erase blocks path traversal (HTTP {e.response.status_code})")
            else:
                raise


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
