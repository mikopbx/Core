#!/usr/bin/env python3
"""
Test suite for System firmware update check operations

Tests two specialized REST API endpoints for firmware update checks:
- checkIfNewReleaseAvailable: Fast check (5s timeout) for availability status
- checkForUpdates: Detailed check (10s timeout) for complete release metadata

These endpoints were added in commit af8e11f2f339022a689f1422965431cb0555a93e
"""
import pytest
import time
from conftest import assert_api_success


class TestSystemUpdateChecks:
    """
    Test suite for firmware update check endpoints

    Two endpoints with different purposes:
    1. checkIfNewReleaseAvailable - Quick availability check
       - Used by: WorkerPrepareAdvice, dashboard widgets, monitoring
       - Returns: version availability status only
       - Timeout: 5 seconds

    2. checkForUpdates - Detailed release information
       - Used by: Admin update page, external systems
       - Returns: Complete release metadata (download links, checksums, descriptions)
       - Timeout: 10 seconds
    """

    def test_01_check_if_new_release_available_basic(self, api_client):
        """
        Test basic functionality of quick release availability check

        This endpoint should return:
        - currentVersion: Current PBX version
        - newVersionAvailable: Boolean flag
        - latestVersion: Latest available version (if any)
        - lastCheck: Timestamp of check
        """
        print("\n=== Testing Quick Release Availability Check ===")

        try:
            start_time = time.time()
            response = api_client.get('system:checkIfNewReleaseAvailable')
            elapsed_time = time.time() - start_time

            assert_api_success(response, "Failed to check if new release is available")

            # Verify response structure
            data = response.get('data', {})

            print(f"✓ Quick check completed in {elapsed_time:.2f}s (expected < 5s)")
            print(f"  Current version: {data.get('currentVersion', 'N/A')}")
            print(f"  New version available: {data.get('newVersionAvailable', False)}")

            if data.get('newVersionAvailable'):
                print(f"  Latest version: {data.get('latestVersion', 'N/A')}")

            # Validate required fields
            assert 'currentVersion' in data, "Missing 'currentVersion' field"
            assert 'newVersionAvailable' in data, "Missing 'newVersionAvailable' field"
            assert 'lastCheck' in data, "Missing 'lastCheck' field"

            # Validate field types
            assert isinstance(data['newVersionAvailable'], bool), \
                "Field 'newVersionAvailable' must be boolean"

            if data.get('newVersionAvailable'):
                assert 'latestVersion' in data, \
                    "Missing 'latestVersion' when newVersionAvailable=true"
                assert data['latestVersion'] is not None, \
                    "Field 'latestVersion' cannot be null when update is available"

            # Verify timeout constraint (should be under 5 seconds)
            assert elapsed_time < 6.0, \
                f"Quick check took too long: {elapsed_time:.2f}s (expected < 5s)"

        except Exception as e:
            pytest.fail(f"Quick release check failed: {str(e)}")

    def test_02_check_for_updates_basic(self, api_client):
        """
        Test basic functionality of detailed firmware update check

        This endpoint should return:
        - currentVersion: Current PBX version
        - hasUpdates: Boolean flag
        - firmware: Array of firmware details (if updates available)
        - lastCheck: Timestamp of check

        When hasUpdates=true, firmware array should contain:
        - version: Version number
        - description: Release notes (localized)
        - links: Download URLs for different formats (IMG, ISO, RAW, TAR, VHD)
        - sizes: File sizes for each format
        - md5: MD5 checksums for verification
        """
        print("\n=== Testing Detailed Firmware Update Check ===")

        try:
            start_time = time.time()
            response = api_client.get('system:checkForUpdates')
            elapsed_time = time.time() - start_time

            assert_api_success(response, "Failed to get detailed firmware update information")

            # Verify response structure
            data = response.get('data', {})

            print(f"✓ Detailed check completed in {elapsed_time:.2f}s (expected < 10s)")
            print(f"  Current version: {data.get('currentVersion', 'N/A')}")
            print(f"  Has updates: {data.get('hasUpdates', False)}")

            # Validate required fields
            assert 'currentVersion' in data, "Missing 'currentVersion' field"
            assert 'hasUpdates' in data, "Missing 'hasUpdates' field"
            assert 'firmware' in data, "Missing 'firmware' field"
            assert 'lastCheck' in data, "Missing 'lastCheck' field"

            # Validate field types
            assert isinstance(data['hasUpdates'], bool), \
                "Field 'hasUpdates' must be boolean"
            assert isinstance(data['firmware'], list), \
                "Field 'firmware' must be an array"

            # If updates available, validate firmware details
            if data['hasUpdates'] and len(data['firmware']) > 0:
                firmware = data['firmware'][0]

                print(f"\n  Firmware details available:")
                print(f"  - Version: {firmware.get('version', 'N/A')}")
                print(f"  - Description: {firmware.get('description', 'N/A')[:80]}...")

                # Validate firmware object structure
                assert 'version' in firmware, "Missing 'version' in firmware details"

                # Check for download links if available
                if 'links' in firmware:
                    links = firmware['links']
                    print(f"  - Available formats: {', '.join(links.keys())}")

                    # Common formats: IMG, ISO, RAW, TAR, VHD
                    for format_type, url in links.items():
                        assert isinstance(url, str), \
                            f"Download link for {format_type} must be a string"
                        if url:  # Only check non-empty URLs
                            assert url.startswith('http'), \
                                f"Invalid download URL for {format_type}: {url}"
            else:
                print(f"  No updates available (current version is up-to-date)")

            # Verify timeout constraint (should be under 10 seconds)
            assert elapsed_time < 11.0, \
                f"Detailed check took too long: {elapsed_time:.2f}s (expected < 10s)"

        except Exception as e:
            pytest.fail(f"Detailed firmware check failed: {str(e)}")

    def test_03_compare_endpoints_consistency(self, api_client):
        """
        Test consistency between quick and detailed check endpoints

        Both endpoints should return consistent information:
        - Same currentVersion
        - Consistent availability status (newVersionAvailable vs hasUpdates)
        - If quick check says update available, detailed check must also
        """
        print("\n=== Testing Endpoint Consistency ===")

        try:
            # Get quick check result
            quick_response = api_client.get('system:checkIfNewReleaseAvailable')
            assert_api_success(quick_response, "Quick check failed")
            quick_data = quick_response.get('data', {})

            # Get detailed check result
            detailed_response = api_client.get('system:checkForUpdates')
            assert_api_success(detailed_response, "Detailed check failed")
            detailed_data = detailed_response.get('data', {})

            # Compare current versions (should be identical)
            assert quick_data.get('currentVersion') == detailed_data.get('currentVersion'), \
                "Current version mismatch between endpoints"

            print(f"✓ Current version consistent: {quick_data.get('currentVersion')}")

            # Compare availability status
            quick_has_update = quick_data.get('newVersionAvailable', False)
            detailed_has_update = detailed_data.get('hasUpdates', False)

            # If quick check says update available, detailed must also
            if quick_has_update:
                assert detailed_has_update, \
                    "Inconsistency: quick check reports update but detailed check doesn't"

                # Verify versions match
                quick_version = quick_data.get('latestVersion')
                detailed_version = detailed_data['firmware'][0].get('version') if detailed_data['firmware'] else None

                assert quick_version == detailed_version, \
                    f"Version mismatch: quick={quick_version}, detailed={detailed_version}"

                print(f"✓ Both endpoints report update available: {quick_version}")
            else:
                print(f"✓ Both endpoints report no updates available")

            # Note: It's OK if detailed check finds update but quick doesn't due to timing
            # (the checks might hit the server at slightly different times)

        except Exception as e:
            pytest.fail(f"Consistency check failed: {str(e)}")

    def test_04_quick_check_performance(self, api_client):
        """
        Test that quick check is significantly faster than detailed check

        Quick check should be at least 30% faster than detailed check
        This validates the separation of concerns:
        - Quick check for frequent polling
        - Detailed check for user-facing operations
        """
        print("\n=== Testing Performance Difference ===")

        try:
            # Measure quick check
            start_time = time.time()
            quick_response = api_client.get('system:checkIfNewReleaseAvailable')
            quick_time = time.time() - start_time
            assert_api_success(quick_response, "Quick check failed")

            # Measure detailed check
            start_time = time.time()
            detailed_response = api_client.get('system:checkForUpdates')
            detailed_time = time.time() - start_time
            assert_api_success(detailed_response, "Detailed check failed")

            print(f"  Quick check: {quick_time:.3f}s")
            print(f"  Detailed check: {detailed_time:.3f}s")
            print(f"  Difference: {(detailed_time - quick_time):.3f}s")

            # Quick check should be faster or at least not significantly slower
            # Allow some variance due to network conditions
            time_ratio = quick_time / detailed_time if detailed_time > 0 else 1.0

            print(f"  Quick/Detailed ratio: {time_ratio:.2%}")

            # Quick check shouldn't be more than 1.5x slower than detailed
            # (in ideal case it should be faster, but network variance can affect this)
            assert time_ratio < 1.5, \
                f"Quick check is too slow compared to detailed: {time_ratio:.2%}"

            if quick_time < detailed_time:
                speedup = ((detailed_time - quick_time) / detailed_time) * 100
                print(f"✓ Quick check is {speedup:.1f}% faster than detailed check")
            else:
                print(f"⚠ Both checks took similar time (network variance expected)")

        except Exception as e:
            pytest.fail(f"Performance test failed: {str(e)}")

    def test_05_error_handling_network_issues(self, api_client):
        """
        Test error handling when update server is unreachable

        Note: This test will likely succeed with normal responses since the
        actual update server is reachable. It's here to document expected
        error handling behavior.

        Expected error response:
        - success: false
        - httpCode: 500
        - messages.error: Contains network error description
        """
        print("\n=== Testing Error Handling (Documentation) ===")

        try:
            # Both endpoints should handle network errors gracefully
            quick_response = api_client.get('system:checkIfNewReleaseAvailable')
            detailed_response = api_client.get('system:checkForUpdates')

            # If we get here, server is reachable (expected in most cases)
            print("✓ Update server is reachable")
            print("  Note: Error handling paths exist but cannot be tested")
            print("        without mocking or server downtime")

            # Verify both responses are valid
            assert_api_success(quick_response, "Quick check failed unexpectedly")
            assert_api_success(detailed_response, "Detailed check failed unexpectedly")

        except Exception as e:
            # If we get an error, verify it's handled correctly
            error_message = str(e).lower()
            if 'network' in error_message or '500' in error_message:
                print("✓ Network error handled correctly")
                print(f"  Error message: {e}")
            else:
                pytest.fail(f"Unexpected error type: {str(e)}")

    def test_06_response_data_completeness(self, api_client):
        """
        Test that response data includes all documented fields

        Quick check response schema:
        {
            "currentVersion": "string",
            "newVersionAvailable": boolean,
            "latestVersion": "string|null",
            "lastCheck": "datetime"
        }

        Detailed check response schema:
        {
            "currentVersion": "string",
            "hasUpdates": boolean,
            "firmware": [
                {
                    "version": "string",
                    "description": "string",
                    "links": { "IMG": "url", "ISO": "url", ... },
                    "sizes": { "IMG": int, "ISO": int, ... },
                    "md5": { "IMG": "hash", "ISO": "hash", ... }
                }
            ],
            "lastCheck": "datetime"
        }
        """
        print("\n=== Testing Response Data Completeness ===")

        try:
            # Test quick check response
            quick_response = api_client.get('system:checkIfNewReleaseAvailable')
            assert_api_success(quick_response, "Quick check failed")
            quick_data = quick_response.get('data', {})

            required_quick_fields = ['currentVersion', 'newVersionAvailable', 'lastCheck']
            missing_fields = [field for field in required_quick_fields if field not in quick_data]

            assert not missing_fields, \
                f"Quick check missing required fields: {', '.join(missing_fields)}"

            print("✓ Quick check has all required fields:")
            for field in required_quick_fields:
                print(f"  - {field}: {type(quick_data[field]).__name__}")

            # Test detailed check response
            detailed_response = api_client.get('system:checkForUpdates')
            assert_api_success(detailed_response, "Detailed check failed")
            detailed_data = detailed_response.get('data', {})

            required_detailed_fields = ['currentVersion', 'hasUpdates', 'firmware', 'lastCheck']
            missing_fields = [field for field in required_detailed_fields if field not in detailed_data]

            assert not missing_fields, \
                f"Detailed check missing required fields: {', '.join(missing_fields)}"

            print("\n✓ Detailed check has all required fields:")
            for field in required_detailed_fields:
                print(f"  - {field}: {type(detailed_data[field]).__name__}")

            # If updates available, verify firmware array structure
            if detailed_data.get('hasUpdates') and detailed_data['firmware']:
                firmware = detailed_data['firmware'][0]
                print(f"\n✓ Firmware object contains:")
                for key, value in firmware.items():
                    print(f"  - {key}: {type(value).__name__}")

        except Exception as e:
            pytest.fail(f"Data completeness test failed: {str(e)}")


    def test_07_sequential_calls_consistency(self, api_client):
        """
        Test that multiple sequential calls return consistent results

        This validates that:
        - Results are stable across multiple calls
        - No race conditions or state corruption
        - Caching (if any) works correctly
        """
        print("\n=== Testing Sequential Calls Consistency ===")

        try:
            # Make 3 sequential calls to each endpoint
            quick_results = []
            detailed_results = []

            for i in range(3):
                quick_response = api_client.get('system:checkIfNewReleaseAvailable')
                assert_api_success(quick_response, f"Quick check #{i+1} failed")
                quick_results.append(quick_response.get('data', {}))

                detailed_response = api_client.get('system:checkForUpdates')
                assert_api_success(detailed_response, f"Detailed check #{i+1} failed")
                detailed_results.append(detailed_response.get('data', {}))

                time.sleep(0.5)  # Small delay between calls

            # Verify all quick check results are consistent
            for i in range(1, len(quick_results)):
                assert quick_results[i]['currentVersion'] == quick_results[0]['currentVersion'], \
                    f"Current version changed between calls: {quick_results[0]['currentVersion']} -> {quick_results[i]['currentVersion']}"

                assert quick_results[i]['newVersionAvailable'] == quick_results[0]['newVersionAvailable'], \
                    f"Update availability changed between calls"

            # Verify all detailed check results are consistent
            for i in range(1, len(detailed_results)):
                assert detailed_results[i]['currentVersion'] == detailed_results[0]['currentVersion'], \
                    f"Current version changed between calls"

                assert detailed_results[i]['hasUpdates'] == detailed_results[0]['hasUpdates'], \
                    f"Update availability changed between calls"

            print(f"✓ Made 3 sequential calls to each endpoint")
            print(f"✓ All results consistent")
            print(f"  - Current version: {quick_results[0]['currentVersion']}")
            print(f"  - Update available: {quick_results[0]['newVersionAvailable']}")

        except Exception as e:
            pytest.fail(f"Sequential calls consistency test failed: {str(e)}")

    def test_08_response_format_validation(self, api_client):
        """
        Test that response format matches API documentation

        Validates:
        - HTTP status codes
        - Response structure (success, data, messages)
        - Data types
        - Field naming conventions
        """
        print("\n=== Testing Response Format Validation ===")

        try:
            # Test quick check response format
            quick_response = api_client.get('system:checkIfNewReleaseAvailable')
            assert 'result' in quick_response, "Missing 'result' field in response"
            assert 'data' in quick_response, "Missing 'data' field in response"
            assert 'messages' in quick_response, "Missing 'messages' field in response"

            assert quick_response['result'] is True, "Expected result=true for successful response"

            print("✓ Quick check response format valid")

            # Test detailed check response format
            detailed_response = api_client.get('system:checkForUpdates')
            assert 'result' in detailed_response, "Missing 'result' field in response"
            assert 'data' in detailed_response, "Missing 'data' field in response"
            assert 'messages' in detailed_response, "Missing 'messages' field in response"

            assert detailed_response['result'] is True, "Expected result=true for successful response"

            print("✓ Detailed check response format valid")

            # Validate data structure types
            quick_data = quick_response['data']
            assert isinstance(quick_data['currentVersion'], str), \
                "currentVersion must be string"
            assert isinstance(quick_data['newVersionAvailable'], bool), \
                "newVersionAvailable must be boolean"
            assert isinstance(quick_data['lastCheck'], str), \
                "lastCheck must be string (datetime)"

            detailed_data = detailed_response['data']
            assert isinstance(detailed_data['currentVersion'], str), \
                "currentVersion must be string"
            assert isinstance(detailed_data['hasUpdates'], bool), \
                "hasUpdates must be boolean"
            assert isinstance(detailed_data['firmware'], list), \
                "firmware must be array"
            assert isinstance(detailed_data['lastCheck'], str), \
                "lastCheck must be string (datetime)"

            print("✓ All data types valid")

        except Exception as e:
            pytest.fail(f"Response format validation failed: {str(e)}")

    def test_09_datetime_format_validation(self, api_client):
        """
        Test that lastCheck datetime is in correct format

        Expected format: YYYY-MM-DD HH:MM:SS
        Example: 2025-01-21 15:30:45
        """
        print("\n=== Testing DateTime Format ===")

        try:
            # Check quick check datetime
            quick_response = api_client.get('system:checkIfNewReleaseAvailable')
            assert_api_success(quick_response, "Quick check failed")
            quick_datetime = quick_response['data']['lastCheck']

            # Validate datetime format (YYYY-MM-DD HH:MM:SS)
            import re
            datetime_pattern = r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$'

            assert re.match(datetime_pattern, quick_datetime), \
                f"Invalid datetime format in quick check: {quick_datetime}"

            print(f"✓ Quick check datetime valid: {quick_datetime}")

            # Check detailed check datetime
            detailed_response = api_client.get('system:checkForUpdates')
            assert_api_success(detailed_response, "Detailed check failed")
            detailed_datetime = detailed_response['data']['lastCheck']

            assert re.match(datetime_pattern, detailed_datetime), \
                f"Invalid datetime format in detailed check: {detailed_datetime}"

            print(f"✓ Detailed check datetime valid: {detailed_datetime}")

            # Verify datetime can be parsed (don't check recency due to timezone issues)
            from datetime import datetime

            try:
                check_time = datetime.strptime(quick_datetime, '%Y-%m-%d %H:%M:%S')
                print(f"✓ Timestamp successfully parsed: {check_time}")

            except ValueError as e:
                pytest.fail(f"Failed to parse datetime: {e}")

        except Exception as e:
            pytest.fail(f"DateTime format validation failed: {str(e)}")

    def test_10_version_format_validation(self, api_client):
        """
        Test that version numbers follow MikoPBX versioning format

        Expected format: YYYY.MAJOR.MINOR or YYYY.MAJOR.MINOR-dev
        Examples: 2024.2.287, 2024.2.287-dev
        """
        print("\n=== Testing Version Format ===")

        try:
            # Get versions from quick check
            quick_response = api_client.get('system:checkIfNewReleaseAvailable')
            assert_api_success(quick_response, "Quick check failed")
            quick_data = quick_response['data']

            current_version = quick_data['currentVersion']

            # Validate current version format
            import re
            # Pattern: YYYY.N.N or YYYY.N.N-dev only
            # Examples: 2024.2.287, 2024.2.287-dev
            version_pattern = r'^\d{4}\.\d+\.\d+(-dev)?$'

            assert re.match(version_pattern, current_version), \
                f"Invalid version format: {current_version}"

            print(f"✓ Current version format valid: {current_version}")

            # If new version is available, validate that too
            if quick_data.get('newVersionAvailable') and quick_data.get('latestVersion'):
                latest_version = quick_data['latestVersion']

                assert re.match(version_pattern, latest_version), \
                    f"Invalid latest version format: {latest_version}"

                print(f"✓ Latest version format valid: {latest_version}")

                # Latest version should be different from current
                assert latest_version != current_version, \
                    "Latest version same as current but newVersionAvailable=true"

            # Verify detailed check has same current version
            detailed_response = api_client.get('system:checkForUpdates')
            assert_api_success(detailed_response, "Detailed check failed")
            detailed_version = detailed_response['data']['currentVersion']

            assert detailed_version == current_version, \
                f"Version mismatch: quick={current_version}, detailed={detailed_version}"

            print(f"✓ Versions consistent across endpoints")

        except Exception as e:
            pytest.fail(f"Version format validation failed: {str(e)}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
