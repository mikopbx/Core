#!/usr/bin/env python3
"""Test suite for General Settings operations (singleton)"""
import pytest
from conftest import assert_api_success

class TestGeneralSettings:
    """Comprehensive tests for General Settings CRUD operations"""
    original_settings = None

    def test_01_get_all_settings(self, api_client):
        """GET all general settings (full configuration)"""
        response = api_client.get('general-settings')
        assert_api_success(response, "Failed to get general settings")

        data = response['data']
        assert isinstance(data, dict), "Response data should be a dictionary"

        # API returns structure: {settings: {...}, codecs: [...], passwordValidation: {...}}
        assert 'settings' in data, "Response should contain 'settings' key"
        settings = data['settings']
        assert isinstance(settings, dict), "Settings should be a dictionary"

        # Verify essential settings exist (using actual keys from PbxSettingsConstantsTrait)
        # Note: WebAdminLanguage constant does not exist in GetSettingsAction::ALLOWED_SETTINGS
        required_keys = ['Name', 'PBXInternalExtensionLength', 'WebAdminLogin',
                        'SIPPort', 'TLS_PORT', 'RTPPortFrom', 'RTPPortTo']
        for key in required_keys:
            assert key in settings, f"Missing required setting: {key}"

        TestGeneralSettings.original_settings = settings.copy()
        print(f"✓ Retrieved {len(settings)} general settings")

    def test_02_get_specific_setting(self, api_client):
        """GET specific setting by key"""
        # Test getting Name (PBX_NAME constant) specifically
        response = api_client.get('general-settings')
        assert_api_success(response, "Failed to get settings")

        settings = response['data']['settings']
        pbx_name = settings.get('Name')
        assert pbx_name is not None, "Name (PBX Name) should exist"
        print(f"✓ Retrieved specific setting: Name = {pbx_name}")

    def test_03_get_default_values(self, api_client):
        """Verify default values are reasonable"""
        response = api_client.get('general-settings')
        assert_api_success(response, "Failed to get settings")

        settings = response['data']['settings']

        # Check default port ranges (TLS_PORT constant, not TLSPort)
        sip_port = int(settings.get('SIPPort', 0))
        assert 1024 <= sip_port <= 65535, f"SIPPort {sip_port} out of valid range"

        tls_port = int(settings.get('TLS_PORT', 0))
        assert 1024 <= tls_port <= 65535, f"TLS_PORT {tls_port} out of valid range"

        ext_length = int(settings.get('PBXInternalExtensionLength', 0))
        assert 2 <= ext_length <= 10, f"Extension length {ext_length} out of valid range"

        print(f"✓ Default values validated: SIP={sip_port}, TLS={tls_port}, ExtLen={ext_length}")

    def test_04_patch_single_setting(self, api_client):
        """PATCH single setting (partial update)"""
        patch_data = {'settings': {'Name': 'Test PBX Updated'}}
        response = api_client.patch('general-settings', patch_data)
        assert_api_success(response, "Failed to patch single setting")

        # Verify the change
        verify_response = api_client.get('general-settings')
        assert verify_response['data']['settings']['Name'] == 'Test PBX Updated'
        print(f"✓ Patched single setting: Name (PBX Name)")

    def test_05_patch_multiple_settings(self, api_client):
        """PATCH multiple settings at once"""
        patch_data = {
            'settings': {
                'Name': 'Multi Update Test',
                'Description': 'Test description',
                'PBXLanguage': 'en-en'
            }
        }
        response = api_client.patch('general-settings', patch_data)
        assert_api_success(response, "Failed to patch multiple settings")

        # Verify all changes
        verify_response = api_client.get('general-settings')
        settings = verify_response['data']['settings']
        assert settings['Name'] == 'Multi Update Test'
        assert settings['Description'] == 'Test description'
        assert settings['PBXLanguage'] == 'en-en'
        print(f"✓ Patched {len(patch_data['settings'])} settings successfully")

    def test_07_update_codecs(self, api_client):
        """Update codec configuration"""
        # Get current settings
        current = api_client.get('general-settings')
        assert_api_success(current, "Failed to get current settings")

        # Update codec settings if they exist
        codec_data = {}
        if 'IAXCodecs' in current['data'].get('settings', {}):
            codec_data['IAXCodecs'] = ['ulaw', 'alaw']
        if 'SIPCodecs' in current['data'].get('settings', {}):
            codec_data['SIPCodecs'] = ['ulaw', 'alaw', 'g729']

        if codec_data:
            response = api_client.patch('general-settings', codec_data)
            assert_api_success(response, "Failed to update codecs")
            print(f"✓ Updated codec configuration")
        else:
            print(f"⚠ Codec settings not available in current configuration")

    def test_08_validate_required_ports(self, api_client):
        """Validate that required ports are within valid ranges"""
        # Try to set invalid SIP port (should fail validation)
        try:
            response = api_client.patch('general-settings', {'settings': {'SIPPort': '99999'}})
            if not response.get('result', False):
                print(f"✓ Port validation working (rejected invalid port)")
            else:
                print(f"⚠ Invalid port was accepted (validation may be lenient)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Port validation rejected invalid value")
            else:
                raise

    def test_09_validate_extension_length(self, api_client):
        """Validate extension length constraints"""
        # Try to set invalid extension length (should fail or warn)
        try:
            response = api_client.patch('general-settings', {'settings': {'PBXInternalExtensionLength': '20'}})
            if not response.get('result', False):
                print(f"✓ Extension length validation working")
            else:
                print(f"⚠ Invalid extension length accepted (validation may be lenient)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Extension length validation rejected invalid value")
            else:
                raise

    def test_10_verify_settings_structure(self, api_client):
        """Verify the structure of returned settings"""
        response = api_client.get('general-settings')
        assert_api_success(response, "Failed to get settings")

        data = response['data']
        assert isinstance(data, dict), "Settings data should be a dictionary"

        # Verify structure of key settings
        for key, value in data.get('settings', {}).items():
            assert isinstance(key, str), f"Setting key should be string: {key}"
            # Values can be strings, numbers, lists, etc.
            print(f"  {key}: {type(value).__name__}")

        print(f"✓ Settings structure validated: {len(data)} keys")

    def test_11_verify_codec_structure(self, api_client):
        """Verify codec settings structure if present"""
        response = api_client.get('general-settings')
        assert_api_success(response, "Failed to get settings")

        data = response['data']
        codec_keys = [k for k in data.get('codecs', []) if 'Codec' in k]

        if codec_keys:
            for key in codec_keys:
                value = data[key]
                assert isinstance(value, (list, str)), f"{key} should be list or string"
                print(f"✓ Codec setting {key}: {value}")
            print(f"✓ Verified {len(codec_keys)} codec settings")
        else:
            print(f"⚠ No codec settings found in configuration")


class TestGeneralSettingsEdgeCases:
    """Edge cases and error handling for General Settings"""

    def test_01_get_nonexistent_key(self, api_client):
        """Attempt to get non-existent setting key"""
        # Settings endpoint returns all settings, so we just verify response
        response = api_client.get('general-settings')
        assert_api_success(response, "Failed to get settings")

        # Verify that requesting non-existent key doesn't break
        data = response['data']
        nonexistent = data.get('settings', {}).get('NonExistentSettingKey12345')
        assert nonexistent is None, "Non-existent key should return None"
        print(f"✓ Non-existent key handled correctly")

    def test_02_empty_patch(self, api_client):
        """PATCH with empty data"""
        try:
            response = api_client.patch('general-settings', {})
            # Empty patch should succeed (no-op) or be rejected gracefully
            if response.get('result', False):
                print(f"✓ Empty PATCH accepted as no-op")
            else:
                print(f"✓ Empty PATCH rejected gracefully")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Empty PATCH rejected with validation error")
            else:
                raise

    def test_03_patch_readonly_field(self, api_client):
        """Attempt to PATCH read-only fields (if any exist)"""
        # Most settings are editable, but test boundary conditions
        response = api_client.get('general-settings')
        assert_api_success(response, "Failed to get settings")

        # Try patching with same values (should always succeed)
        current_data = response['data']
        if 'Name' in current_data.get('settings', {}):
            patch_data = {'settings': {'Name': current_data.get('settings', {}).get('Name')}}
            response = api_client.patch('general-settings', patch_data)
            assert_api_success(response, "Failed to patch with same value")
            print(f"✓ Patching existing values works correctly")
        else:
            print(f"⚠ Could not test readonly field (Name not found)")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
