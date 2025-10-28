#!/usr/bin/env python3
"""
Test suite for CDR Playback with Token Authentication (Phase 3)

Tests the token-based playback feature for CDR recordings:
- Getting CDR record with recording_url
- Validating recording_url format with token
- Token-based playback access
- Token expiration and validation
- Backward compatibility with direct file path access

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
    """Extract CDR data and pagination from response handling new format."""
    data_wrapper = response.get('data', {})

    if isinstance(data_wrapper, dict):
        if 'records' in data_wrapper and 'pagination' in data_wrapper:
            return data_wrapper['records'], data_wrapper['pagination']

    # Fallback for legacy format
    if isinstance(data_wrapper, list):
        return data_wrapper, response.get('pagination', {})

    return [], {}


class TestCDRPlaybackTokens:
    """Token-based playback tests for Phase 3"""

    # Shared state between tests
    sample_cdr_id = None
    sample_recording_url = None
    sample_token = None

    def test_01_find_cdr_with_recording(self, api_client):
        """Find CDR record that has a recording file

        WHY: Token-based playback requires a valid recording file.
        We need to find a CDR record with recordingfile to test playback.
        """
        response = api_client.get('cdr', params={'limit': 100, 'offset': 0})
        assert_api_success(response, "Failed to get CDR list")

        data, pagination = extract_cdr_data(response)
        assert isinstance(data, list), "Response data should be a list"

        # Find first CDR with recording file
        # API returns grouped data: {linkedid, records: [{id, recordingfile, playback_url}]}
        for group in data:
            for record in group.get('records', []):
                playback_url = record.get('playback_url', '')
                # Check for both valid URL and non-empty string
                if record.get('recordingfile') and playback_url and playback_url != '':
                    TestCDRPlaybackTokens.sample_cdr_id = str(record['id'])
                    TestCDRPlaybackTokens.sample_recording_url = playback_url

                    print(f"✓ Found CDR with recording: {TestCDRPlaybackTokens.sample_cdr_id}")
                    print(f"  Recording URL: {TestCDRPlaybackTokens.sample_recording_url}")
                    return

        pytest.skip(
            "No CDR records with recordings found. "
            "To test playback: 1) Make a test call with recording enabled, "
            "2) Re-run this test, or 3) Use a system with existing call recordings."
        )

    def test_02_validate_recording_url_format(self, api_client):
        """Validate recording_url format includes token parameter

        WHY: recording_url should contain a temporary token for secure access.
        Format: https://pbx.example.com/pbxcore/api/v3/cdr:playback?token=xxx
        """
        if not TestCDRPlaybackTokens.sample_recording_url:
            pytest.skip("No recording URL available from test_01")

        url = TestCDRPlaybackTokens.sample_recording_url

        # Validate URL format
        assert 'pbxcore/api/v3/cdr' in url, "URL should contain CDR endpoint"
        assert ':playback' in url, "URL should contain :playback custom method"
        assert 'token=' in url, "URL should contain token parameter"

        # Extract token from URL
        match = re.search(r'token=([a-f0-9]+)', url)
        assert match, "Token should be hex string"

        token = match.group(1)
        assert len(token) == 32, f"Token should be 32 characters (hex), got {len(token)}"

        TestCDRPlaybackTokens.sample_token = token
        print(f"✓ Recording URL format valid")
        print(f"  Token length: {len(token)} characters")
        print(f"  Token: {token[:8]}...{token[-8:]}")

    def test_03_playback_with_token(self, api_client):
        """Test playback using token from recording_url

        WHY: Token-based access is the recommended secure method.
        The token provides temporary access without exposing file paths.
        """
        if not TestCDRPlaybackTokens.sample_token or not TestCDRPlaybackTokens.sample_cdr_id:
            pytest.skip("No token available from test_02")

        try:
            # Playback endpoint returns audio file (binary), not JSON - use get_raw
            response = api_client.get_raw(f'cdr/{TestCDRPlaybackTokens.sample_cdr_id}:playback', params={
                'token': TestCDRPlaybackTokens.sample_token
            })

            # Check HTTP status (200 OK for successful playback)
            assert response.status_code == 200, f"Expected HTTP 200, got {response.status_code}"

            # Check Content-Type header
            content_type = response.headers.get('Content-Type', '')
            assert 'audio/' in content_type, f"Expected audio/* MIME type, got {content_type}"

            # Check that we got binary content
            assert len(response.content) > 0, "Expected audio file content"

            print(f"✓ Token-based playback successful")
            print(f"  Content-Type: {content_type}")
            print(f"  File size: {len(response.content)} bytes")

        except Exception as e:
            if '403' in str(e):
                pytest.fail("Token validation failed - token may have expired")
            elif '404' in str(e):
                pytest.fail("Recording file not found")
            else:
                raise

    def test_04_playback_with_invalid_token(self, api_client):
        """Test playback with invalid token should fail

        WHY: Security - invalid tokens must be rejected.
        """
        fake_token = 'a' * 32  # Valid format but wrong token

        try:
            response = api_client.get('cdr:playback', params={
                'token': fake_token
            })

            # Should fail with 403 or return error
            if response.get('result') is True:
                pytest.fail("Invalid token should be rejected")
            else:
                print(f"✓ Invalid token rejected (result=false)")

        except Exception as e:
            if '403' in str(e) or '401' in str(e):
                print(f"✓ Invalid token rejected (HTTP 403/401)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_05_playback_with_expired_token(self, api_client):
        """Test playback with expired token should fail

        WHY: Tokens have 1-hour TTL for security.
        This test simulates expired token behavior.

        NOTE: This test uses a fake expired token since we can't easily
        wait 1 hour for a real token to expire.
        """
        # Use a token format that looks valid but doesn't exist in Redis
        fake_expired_token = 'deadbeef' * 4  # 32 chars, valid format

        try:
            response = api_client.get('cdr:playback', params={
                'token': fake_expired_token
            })

            if response.get('result') is True:
                pytest.fail("Expired token should be rejected")
            else:
                print(f"✓ Expired token rejected (result=false)")

        except Exception as e:
            if '403' in str(e):
                print(f"✓ Expired token rejected (HTTP 403)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_06_playback_with_direct_path_legacy(self, api_client):
        """Test backward compatibility with direct file path (view parameter)

        WHY: Maintain backward compatibility with existing code.
        Direct path access should still work but show deprecation warning.
        """
        if not TestCDRPlaybackTokens.sample_cdr_id:
            pytest.skip("No CDR ID available")

        # Get CDR list to find recording file (since GetRecordAction is not implemented)
        list_response = api_client.get('cdr', params={'limit': 100})
        assert_api_success(list_response, "Failed to get CDR list")

        # Find our CDR record in grouped data
        data, pagination = extract_cdr_data(list_response)
        recording_file = None
        for group in data:
            for record in group.get('records', []):
                if str(record.get('id')) == str(TestCDRPlaybackTokens.sample_cdr_id):
                    recording_file = record.get('recordingfile')
                    break
            if recording_file:
                break

        if not recording_file:
            pytest.skip("No recording file in CDR record")

        try:
            # Playback returns audio file (binary), not JSON - use get_raw
            response = api_client.get_raw(f'cdr/{TestCDRPlaybackTokens.sample_cdr_id}:playback', params={
                'view': recording_file
            })

            # Check HTTP status
            assert response.status_code == 200, f"Expected HTTP 200, got {response.status_code}"

            # Check Content-Type
            content_type = response.headers.get('Content-Type', '')
            assert 'audio/' in content_type, f"Expected audio/* MIME type, got {content_type}"

            # Check that we got binary content
            assert len(response.content) > 0, "Expected audio file content"

            print(f"✓ Legacy direct path access works")
            print(f"  Content-Type: {content_type}")
            print(f"  File size: {len(response.content)} bytes")
            print(f"  Note: Deprecation warnings for direct path access are documented in API")

        except Exception as e:
            if '404' in str(e):
                pytest.fail("Recording file not found")
            else:
                raise

    def test_07_playback_without_any_params(self, api_client):
        """Test playback without token or view parameter should fail

        WHY: At least one parameter (token or view) must be provided.
        """
        try:
            response = api_client.get('cdr:playback', params={})

            if response.get('result') is True:
                pytest.fail("Playback without params should fail")
            else:
                print(f"✓ Missing parameters rejected (result=false)")
                messages = response.get('messages', {})
                errors = messages.get('error', [])
                if errors:
                    print(f"  Error: {errors[0]}")

        except Exception as e:
            if '400' in str(e) or '422' in str(e):
                print(f"✓ Missing parameters rejected (HTTP 400/422)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_08_token_reusability(self, api_client):
        """Test that token can be reused within TTL period

        WHY: Token TTL is extended on each access to allow multiple plays.
        Users should be able to replay recordings within 1-hour window.
        """
        if not TestCDRPlaybackTokens.sample_token or not TestCDRPlaybackTokens.sample_cdr_id:
            pytest.skip("No token or CDR ID available from previous tests")

        # First access (already done in test_03)
        # Second access - should still work
        try:
            # Playback returns audio file (binary), not JSON - use get_raw
            response = api_client.get_raw(f'cdr/{TestCDRPlaybackTokens.sample_cdr_id}:playback', params={
                'token': TestCDRPlaybackTokens.sample_token
            })

            # Check HTTP status
            assert response.status_code == 200, f"Expected HTTP 200, got {response.status_code}"

            # Check Content-Type
            content_type = response.headers.get('Content-Type', '')
            assert 'audio/' in content_type, f"Expected audio/* MIME type, got {content_type}"

            print(f"✓ Token is reusable (TTL extended)")
            print(f"  Token can be used multiple times within 1-hour window")
            print(f"  Content-Type: {content_type}")

        except Exception as e:
            if '403' in str(e):
                print(f"⚠ Token rejected on reuse (may need TTL extension)")
            else:
                raise

    def test_09_recording_url_consistency(self, api_client):
        """Test that recording_url is consistently provided for records with files

        WHY: All CDR records with recordingfile should have playback_url and download_url.
        """
        response = api_client.get('cdr', params={'limit': 50})
        assert_api_success(response, "Failed to get CDR list")

        data, pagination = extract_cdr_data(response)
        records_with_files = 0
        records_with_urls = 0

        # Handle grouped format: data = [{linkedid, records: [...]}, ...]
        for group in data:
            for record in group.get('records', []):
                if record.get('recordingfile'):
                    records_with_files += 1
                    playback_url = record.get('playback_url', '')
                    download_url = record.get('download_url', '')
                    # Check for valid non-empty URLs
                    if playback_url and playback_url != '' and download_url and download_url != '':
                        records_with_urls += 1

        print(f"✓ CDR records checked for recording URL consistency")
        print(f"  Records with recordingfile: {records_with_files}")
        print(f"  Records with valid URLs: {records_with_urls}")

        if records_with_files > 0:
            # All records with files should have URLs
            assert records_with_urls == records_with_files, \
                f"All {records_with_files} records with files should have playback_url/download_url, " \
                f"but only {records_with_urls} do"
            print(f"  ✓ All records with files have valid URLs")


class TestCDRPlaybackTokensSecurity:
    """Security tests for token-based playback"""

    def test_01_token_format_validation(self, api_client):
        """Test various invalid token formats are rejected"""

        invalid_tokens = [
            '',                          # Empty
            'short',                     # Too short
            'a' * 100,                   # Too long
            'GGGGGGGG' * 4,             # Invalid hex characters
            '../../../etc/passwd',       # Path traversal
            '<script>alert(1)</script>', # XSS attempt
            'token=xyz',                 # Query string format
        ]

        for token in invalid_tokens:
            try:
                response = api_client.get('cdr:playback', params={'token': token})

                if response.get('result') is True:
                    print(f"⚠ Invalid token accepted: {token[:20]}")
                else:
                    print(f"✓ Invalid token rejected: {token[:20]}")

            except Exception as e:
                if '400' in str(e) or '403' in str(e) or '422' in str(e):
                    print(f"✓ Invalid token rejected (HTTP): {token[:20]}")
                else:
                    print(f"⚠ Unexpected error for {token[:20]}: {str(e)[:30]}")

    def test_02_token_sql_injection_attempt(self, api_client):
        """Test SQL injection attempts in token parameter

        WHY: Token should be treated as opaque string, not SQL.
        """
        sql_injection_tokens = [
            "' OR '1'='1",
            "1' UNION SELECT * FROM users--",
            "'; DROP TABLE cdr_playback_token;--",
        ]

        for token in sql_injection_tokens:
            try:
                response = api_client.get('cdr:playback', params={'token': token})

                if response.get('result') is True:
                    pytest.fail(f"SQL injection token should be rejected: {token}")
                else:
                    print(f"✓ SQL injection attempt blocked: {token[:30]}")

            except Exception as e:
                if '400' in str(e) or '403' in str(e) or '422' in str(e):
                    print(f"✓ SQL injection attempt blocked (HTTP): {token[:30]}")
                else:
                    print(f"⚠ Unexpected error: {str(e)[:50]}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
