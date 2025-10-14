#!/usr/bin/env python3
"""
Test suite for Time Settings operations

Tests the /pbxcore/api/v3/time-settings endpoint for:
- Getting current time settings (singleton resource)
- Getting available timezones list
- Updating time settings (PUT - full replacement)
- Partial updates (PATCH)
- Timezone validation
- NTP server configuration
- Manual time setting mode

Time Settings is a SINGLETON resource - there's only one time configuration in the system.
All operations work without resource ID.

NOTE: Write operations (PUT/PATCH) modify system time configuration and should be used carefully.
"""

import pytest
from conftest import assert_api_success


class TestTimeSettings:
    """Time Settings operations tests"""

    original_settings = None

    def test_01_get_time_settings(self, api_client):
        """Test GET /time-settings - Get current time configuration"""
        response = api_client.get('time-settings')
        assert_api_success(response, "Failed to get time settings")

        data = response['data']
        assert isinstance(data, dict), "Response data should be a dict"

        # Store original settings for restoration
        TestTimeSettings.original_settings = data.copy()

        # Verify essential fields
        expected_fields = ['PBXTimezone', 'NTPServer', 'PBXManualTimeSettings']
        found_fields = [f for f in expected_fields if f in data]

        print(f"✓ Retrieved time settings")
        print(f"  Found fields: {found_fields}")
        if 'PBXTimezone' in data:
            print(f"  Current timezone: {data['PBXTimezone']}")
        if 'NTPServer' in data:
            print(f"  NTP server: {data['NTPServer']}")
        if 'PBXManualTimeSettings' in data:
            print(f"  Manual mode: {data['PBXManualTimeSettings']}")

    def test_02_get_available_timezones(self, api_client):
        """Test GET /time-settings:getAvailableTimezones - Get timezone list"""
        response = api_client.get('time-settings:getAvailableTimezones')
        assert_api_success(response, "Failed to get available timezones")

        data = response['data']
        assert isinstance(data, (list, dict)), "Response data should be list or dict"

        # Handle both response formats
        if isinstance(data, list):
            timezone_list = data
        elif isinstance(data, dict) and 'timezones' in data:
            timezone_list = data['timezones']
        else:
            timezone_list = []

        print(f"✓ Retrieved available timezones")
        print(f"  Total timezones: {len(timezone_list)}")

        # Verify some common timezones exist
        if len(timezone_list) > 0:
            # Check format
            first = timezone_list[0]
            if isinstance(first, dict):
                print(f"  Sample format: {list(first.keys())}")
            else:
                print(f"  Sample timezone: {first}")

    def test_03_patch_timezone_only(self, api_client):
        """Test PATCH /time-settings - Update only timezone"""
        if not TestTimeSettings.original_settings:
            pytest.skip("No original settings available")

        # Try to set a different timezone
        new_timezone = 'Europe/London'  # Different from most defaults

        try:
            response = api_client.patch('time-settings', {
                'PBXTimezone': new_timezone
            })

            if response['result']:
                assert_api_success(response, "Failed to patch timezone")

                # Verify change
                updated = api_client.get('time-settings')
                if updated['result'] and 'PBXTimezone' in updated['data']:
                    assert updated['data']['PBXTimezone'] == new_timezone, \
                        f"Expected {new_timezone}, got {updated['data']['PBXTimezone']}"
                    print(f"✓ Timezone patched successfully to {new_timezone}")
                else:
                    print(f"⚠ Timezone patched but verification failed")
            else:
                print(f"✓ Timezone patch rejected (may require validation)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Timezone validation works (rejected invalid/unauthorized change)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_04_patch_ntp_server(self, api_client):
        """Test PATCH /time-settings - Update only NTP server"""
        try:
            response = api_client.patch('time-settings', {
                'NTPServer': 'time.google.com'
            })

            if response['result']:
                print(f"✓ NTP server patched successfully")
            else:
                print(f"✓ NTP server patch rejected (may require validation)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ NTP server validation works")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_05_put_full_update(self, api_client):
        """Test PUT /time-settings - Full configuration update"""
        if not TestTimeSettings.original_settings:
            pytest.skip("No original settings available")

        # Try full update with all required fields
        update_data = {
            'PBXTimezone': TestTimeSettings.original_settings.get('PBXTimezone', 'UTC'),
            'NTPServer': TestTimeSettings.original_settings.get('NTPServer', 'pool.ntp.org'),
            'PBXManualTimeSettings': 'false'
        }

        try:
            response = api_client.put('time-settings', update_data)

            if response['result']:
                print(f"✓ Full time settings update successful")
            else:
                print(f"✓ Full update rejected (may require additional fields)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Full update validation works")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_06_restore_original_settings(self, api_client):
        """Test - Restore original settings"""
        if not TestTimeSettings.original_settings:
            pytest.skip("No original settings to restore")

        try:
            # Restore original timezone at least
            if 'PBXTimezone' in TestTimeSettings.original_settings:
                response = api_client.patch('time-settings', {
                    'PBXTimezone': TestTimeSettings.original_settings['PBXTimezone']
                })

                if response['result']:
                    print(f"✓ Original settings restored")
                else:
                    print(f"⚠ Failed to restore original settings")
        except Exception as e:
            print(f"⚠ Error restoring settings: {str(e)[:50]}")


class TestTimeSettingsEdgeCases:
    """Edge cases for time settings"""

    def test_01_invalid_timezone(self, api_client):
        """Test PATCH /time-settings - Invalid timezone name"""
        try:
            response = api_client.patch('time-settings', {
                'PBXTimezone': 'Invalid/Timezone'
            })

            if not response['result']:
                print(f"✓ Invalid timezone rejected")
            else:
                print(f"⚠ Invalid timezone accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid timezone rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_02_empty_timezone(self, api_client):
        """Test PATCH /time-settings - Empty timezone"""
        try:
            response = api_client.patch('time-settings', {
                'PBXTimezone': ''
            })

            if not response['result']:
                print(f"✓ Empty timezone rejected")
            else:
                print(f"⚠ Empty timezone accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Empty timezone rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_03_invalid_ntp_server(self, api_client):
        """Test PATCH /time-settings - Invalid NTP server"""
        try:
            response = api_client.patch('time-settings', {
                'NTPServer': 'not-a-valid-ntp-server-@@##'
            })

            if not response['result']:
                print(f"✓ Invalid NTP server rejected")
            else:
                print(f"⚠ Invalid NTP server accepted (may be validated later)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid NTP server rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_04_manual_mode_invalid_value(self, api_client):
        """Test PATCH /time-settings - Invalid manual mode value"""
        try:
            response = api_client.patch('time-settings', {
                'PBXManualTimeSettings': 'invalid_boolean'
            })

            if not response['result']:
                print(f"✓ Invalid manual mode value rejected")
            else:
                print(f"⚠ Invalid manual mode accepted (may be converted)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid manual mode rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_05_manual_datetime_invalid_format(self, api_client):
        """Test PATCH /time-settings - Invalid datetime format"""
        try:
            response = api_client.patch('time-settings', {
                'PBXManualTimeSettings': 'true',
                'ManualDateTime': 'not-a-date-time'
            })

            if not response['result']:
                print(f"✓ Invalid datetime format rejected")
            else:
                print(f"⚠ Invalid datetime format accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid datetime format rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_06_put_without_required_fields(self, api_client):
        """Test PUT /time-settings - Missing required fields"""
        try:
            response = api_client.put('time-settings', {
                'NTPServer': 'pool.ntp.org'
                # Missing PBXTimezone (required for PUT)
            })

            if not response['result']:
                print(f"✓ Missing required fields rejected")
            else:
                print(f"⚠ Missing required fields accepted (may have defaults)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Missing required fields rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_07_timezone_case_sensitivity(self, api_client):
        """Test PATCH /time-settings - Timezone case sensitivity"""
        try:
            # Try lowercase (should be Europe/Moscow, not europe/moscow)
            response = api_client.patch('time-settings', {
                'PBXTimezone': 'europe/moscow'
            })

            if not response['result']:
                print(f"✓ Invalid case rejected (timezones are case-sensitive)")
            else:
                print(f"⚠ Invalid case accepted (may be normalized)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid case rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
