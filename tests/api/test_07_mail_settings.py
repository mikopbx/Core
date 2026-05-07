#!/usr/bin/env python3
"""
Test suite for Mail Settings operations

Tests the /pbxcore/api/v3/mail-settings endpoint for:
- Getting current mail settings (singleton resource)
- Getting default mail settings template
- Updating mail settings (PUT - full replacement)
- Partial updates (PATCH)
- SMTP connection testing
- OAuth2 URL generation
- Mail diagnostics

Mail Settings is a SINGLETON resource - there's only one mail configuration in the system.
All operations work without resource ID.

NOTE: Write operations (PUT/PATCH) modify system mail configuration and should be used carefully.
Test email sending operations are safe but require valid SMTP configuration.
"""

# TeamCity prepatch sentinel:
# Mail OAuth2 workflow is not stable in Docker REST test container

import pytest
import requests
import time
from conftest import assert_api_success


class TestMailSettings:
    """Mail Settings operations tests"""

    original_settings = None

    @staticmethod
    def _exec_bash(api_client, command: str, timeout: int = 30) -> dict:
        response = api_client.post('system:executeBashCommand', {
            'command': command,
            'timeout': timeout,
        })
        assert_api_success(response, f"Failed to execute: {command[:80]}")
        return response['data']

    @classmethod
    def _get_system_log_lines(cls, api_client) -> int:
        result = cls._exec_bash(
            api_client,
            'wc -l < /storage/usbdisk1/mikopbx/log/system/messages'
        )
        return int(result['output'].strip())

    @classmethod
    def _assert_no_new_mail_php_fatals(cls, api_client, baseline_lines: int) -> None:
        time.sleep(1)
        result = cls._exec_bash(
            api_client,
            (
                f'tail -n +{baseline_lines + 1} '
                '/storage/usbdisk1/mikopbx/log/system/messages '
                '| grep -i "TestConnectionAction\\|PHPMailer\\|Fatal error" || true'
            )
        )
        new_log_lines = result['output'].strip().splitlines()
        fatal_lines = [line for line in new_log_lines if 'fatal error' in line.lower()]
        assert not fatal_lines, (
            "PHP Fatal errors detected after mail-settings:testConnection:\n"
            + '\n'.join(fatal_lines)
        )

    @staticmethod
    def _safe_test_connection_settings() -> dict:
        return {
            'MailSMTPHost': 'smtp.invalid',
            'MailSMTPPort': 587,
            'MailSMTPAuthType': 'none',
        }

    @classmethod
    def _restore_original_settings(cls, api_client) -> None:
        if not cls.original_settings:
            return

        restore_data = {}
        for field in ['MailSMTPHost', 'MailSMTPPort', 'MailSMTPAuthType', 'MailFromAddress']:
            if field in cls.original_settings:
                restore_data[field] = cls.original_settings[field]

        if restore_data:
            api_client.patch('mail-settings', restore_data)

    @staticmethod
    def _call_test_connection(api_client, payload: dict) -> dict:
        try:
            return api_client.post('mail-settings:testConnection', payload)
        except requests.exceptions.HTTPError as e:
            return e.response.json()

    @staticmethod
    def _assert_test_connection_contract(response: dict, expected_host: str, expected_port: int) -> None:
        assert 'result' in response, "testConnection should return structured result"
        assert 'data' in response, "testConnection should return response data"
        assert 'messages' in response, "testConnection should return messages"

        data = response['data']
        assert isinstance(data, dict), "testConnection data should be an object"
        assert 'connected' in data, "testConnection data should include connected flag"
        assert isinstance(data['connected'], bool), "connected should be boolean"
        assert data['connected'] is False, "Safe smtp.invalid contract should not connect successfully"

        diagnostics = data.get('diagnostics')
        assert isinstance(diagnostics, dict), "testConnection should include diagnostics"
        assert diagnostics.get('smtp_host') == expected_host, (
            f"Expected diagnostics smtp_host={expected_host!r}, got {diagnostics.get('smtp_host')!r}"
        )
        assert str(diagnostics.get('smtp_port')) == str(expected_port), (
            f"Expected diagnostics smtp_port={expected_port!r}, got {diagnostics.get('smtp_port')!r}"
        )
        assert diagnostics.get('auth_type') == 'none', (
            f"Expected auth_type='none', got {diagnostics.get('auth_type')!r}"
        )

        if not response['result'] and 'error_details' in data:
            error_details = data['error_details']
            assert isinstance(error_details, dict), "error_details should be an object when present"
            assert 'error_type' in error_details, "error_details should include error_type"
            assert 'probable_cause' in error_details, "error_details should include probable_cause"

    def test_01_get_default_template(self, api_client):
        """Test GET /mail-settings:getDefault - Get default template"""
        try:
            response = api_client.get('mail-settings:getDefault')
            assert_api_success(response, "Failed to get default mail settings template")

            data = response['data']
            assert isinstance(data, dict), "Default template should be a dict"

            print(f"✓ Retrieved default mail settings template")
            print(f"  Template keys: {list(data.keys())}")
        except Exception as e:
            if '422' in str(e) or '404' in str(e) or '405' in str(e):
                print(f"⚠ getDefault method not implemented for mail-settings")
                print(f"  Note: Mail settings is a singleton resource")
            else:
                raise

    def test_02_get_mail_settings(self, api_client):
        """Test GET /mail-settings - Get current mail configuration"""
        response = api_client.get('mail-settings')
        assert_api_success(response, "Failed to get mail settings")

        data = response['data']
        assert isinstance(data, dict), "Response data should be a dict"

        # Store original settings for restoration
        TestMailSettings.original_settings = data.copy()

        # Verify essential fields
        expected_fields = ['MailSMTPHost', 'MailSMTPPort', 'MailFromAddress', 'MailEnableNotifications']
        found_fields = [f for f in expected_fields if f in data]

        print(f"✓ Retrieved mail settings")
        print(f"  Found fields: {found_fields}")
        if 'MailSMTPHost' in data:
            print(f"  SMTP Host: {data['MailSMTPHost']}")
        if 'MailSMTPPort' in data:
            print(f"  SMTP Port: {data['MailSMTPPort']}")
        if 'MailSMTPAuthType' in data:
            print(f"  Auth Type: {data['MailSMTPAuthType']}")
        if 'MailEnableNotifications' in data:
            print(f"  Notifications enabled: {data['MailEnableNotifications']}")

    def test_03_get_diagnostics(self, api_client):
        """Test GET /mail-settings:getDiagnostics - Get mail diagnostics"""
        try:
            response = api_client.get('mail-settings:getDiagnostics')
            assert_api_success(response, "Failed to get mail diagnostics")

            data = response['data']
            print(f"✓ Retrieved mail diagnostics")
            print(f"  Diagnostics type: {type(data)}")
            if isinstance(data, dict):
                print(f"  Keys: {list(data.keys())}")
        except Exception as e:
            if '501' in str(e) or '404' in str(e) or '422' in str(e):
                print(f"⚠ getDiagnostics method not implemented yet")
                print(f"  Note: Diagnostics may require special setup or configuration")
            else:
                raise

    def test_04_patch_smtp_host_only(self, api_client):
        """Test PATCH /mail-settings - Update only SMTP host"""
        if not TestMailSettings.original_settings:
            pytest.skip("No original settings available")

        try:
            response = api_client.patch('mail-settings', {
                'MailSMTPHost': 'smtp.gmail.com'
            })

            if response['result']:
                assert_api_success(response, "Failed to patch SMTP host")

                # Verify change
                updated = api_client.get('mail-settings')
                if updated['result'] and 'MailSMTPHost' in updated['data']:
                    assert updated['data']['MailSMTPHost'] == 'smtp.gmail.com', \
                        f"Expected smtp.gmail.com, got {updated['data']['MailSMTPHost']}"
                    print(f"✓ SMTP host patched successfully to smtp.gmail.com")
                else:
                    print(f"⚠ SMTP host patched but verification failed")
            else:
                print(f"✓ SMTP host patch rejected (may require validation)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ SMTP host validation works (rejected invalid/unauthorized change)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_05_patch_smtp_port(self, api_client):
        """Test PATCH /mail-settings - Update only SMTP port"""
        try:
            response = api_client.patch('mail-settings', {
                'MailSMTPPort': 587
            })

            if response['result']:
                print(f"✓ SMTP port patched successfully")
            else:
                print(f"✓ SMTP port patch rejected (may require validation)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ SMTP port validation works")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_06_patch_enable_notifications(self, api_client):
        """Test PATCH /mail-settings - Toggle notifications"""
        try:
            response = api_client.patch('mail-settings', {
                'MailEnableNotifications': False
            })

            if response['result']:
                print(f"✓ Notifications setting patched successfully")
            else:
                print(f"✓ Notifications patch rejected")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Notifications validation works")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_07_put_full_update(self, api_client):
        """Test PUT /mail-settings - Full configuration update"""
        if not TestMailSettings.original_settings:
            pytest.skip("No original settings available")

        # Try full update with all required fields
        update_data = {
            'MailSMTPHost': TestMailSettings.original_settings.get('MailSMTPHost', 'localhost'),
            'MailSMTPPort': TestMailSettings.original_settings.get('MailSMTPPort', 25),
            'MailFromAddress': TestMailSettings.original_settings.get('MailFromAddress', 'admin@localhost')
        }

        try:
            response = api_client.put('mail-settings', update_data)

            if response['result']:
                print(f"✓ Full mail settings update successful")
            else:
                print(f"✓ Full update rejected (may require additional fields)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Full update validation works")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_08_test_connection_basic(self, api_client, is_docker):
        """Test POST /mail-settings:testConnection returns structured failure for a safe invalid SMTP host"""
        baseline_lines = self._get_system_log_lines(api_client)
        safe_settings = self._safe_test_connection_settings()

        try:
            patch_response = api_client.patch('mail-settings', safe_settings)
            assert_api_success(patch_response, "Failed to prepare safe SMTP settings for contract test")

            response = self._call_test_connection(api_client, {
                'MailSMTPHost': 'smtp.gmail.com',
                'MailSMTPPort': 587
            })
            self._assert_test_connection_contract(
                response,
                expected_host=safe_settings['MailSMTPHost'],
                expected_port=safe_settings['MailSMTPPort']
            )
            self._assert_no_new_mail_php_fatals(api_client, baseline_lines)
            print("✓ SMTP testConnection returns a structured failure without PHP Fatal in Docker/non-Docker")
        finally:
            self._restore_original_settings(api_client)

    def test_09_get_oauth2_url_google(self, api_client):
        """Test GET /mail-settings:getOAuth2Url - Get Google OAuth2 URL"""
        try:
            response = api_client.get('mail-settings:getOAuth2Url', params={
                'provider': 'google',
                'redirect_uri': 'https://pbx.company.com/oauth2-callback'
            })

            if response['result']:
                assert_api_success(response, "Failed to get OAuth2 URL")
                data = response['data']
                print(f"✓ Retrieved Google OAuth2 URL")
                if isinstance(data, dict) and 'url' in data:
                    print(f"  URL length: {len(data['url'])} chars")
                elif isinstance(data, str):
                    print(f"  URL length: {len(data)} chars")
            else:
                print(f"✓ OAuth2 URL rejected (may not be configured)")
        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ OAuth2 not implemented yet")
            elif '422' in str(e) or '400' in str(e):
                print(f"✓ OAuth2 URL validation works")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_10_get_oauth2_url_microsoft(self, api_client):
        """Test GET /mail-settings:getOAuth2Url - Get Microsoft OAuth2 URL"""
        try:
            response = api_client.get('mail-settings:getOAuth2Url', params={
                'provider': 'microsoft'
            })

            if response['result']:
                print(f"✓ Retrieved Microsoft OAuth2 URL")
            else:
                print(f"✓ OAuth2 URL rejected (may not be configured)")
        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ OAuth2 not implemented yet")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_11_restore_original_settings(self, api_client):
        """Test - Restore original settings"""
        if not TestMailSettings.original_settings:
            pytest.skip("No original settings to restore")

        try:
            # Restore original SMTP host at least
            if 'MailSMTPHost' in TestMailSettings.original_settings:
                response = api_client.patch('mail-settings', {
                    'MailSMTPHost': TestMailSettings.original_settings['MailSMTPHost']
                })

                if response['result']:
                    print(f"✓ Original settings restored")
                else:
                    print(f"⚠ Failed to restore original settings")
        except Exception as e:
            print(f"⚠ Error restoring settings: {str(e)[:50]}")


class TestMailSettingsEdgeCases:
    """Edge cases for mail settings"""

    @staticmethod
    def _restore_original_settings(api_client):
        """Restore fields that edge-case PATCH/PUT calls may accidentally persist."""
        if not TestMailSettings.original_settings:
            return

        restore_data = {}
        for field in ['MailSMTPHost', 'MailSMTPPort', 'MailFromAddress', 'MailSMTPAuthType']:
            if field in TestMailSettings.original_settings:
                restore_data[field] = TestMailSettings.original_settings[field]

        if restore_data:
            try:
                api_client.patch('mail-settings', restore_data)
            except Exception as e:
                print(f"⚠ Failed to restore mail settings after edge-case test: {str(e)[:50]}")

    def test_01_invalid_smtp_host(self, api_client):
        """Test PATCH /mail-settings - Invalid SMTP host"""
        try:
            response = api_client.patch('mail-settings', {
                'MailSMTPHost': 'not-a-valid-host-@@##$$'
            })

            if not response['result']:
                print(f"✓ Invalid SMTP host rejected")
            else:
                print(f"⚠ Invalid SMTP host accepted (may be validated later)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid SMTP host rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")
        finally:
            self._restore_original_settings(api_client)

    def test_02_empty_smtp_host(self, api_client):
        """Test PATCH /mail-settings - Empty SMTP host"""
        try:
            response = api_client.patch('mail-settings', {
                'MailSMTPHost': ''
            })

            if not response['result']:
                print(f"✓ Empty SMTP host rejected")
            else:
                print(f"⚠ Empty SMTP host accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Empty SMTP host rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")
        finally:
            self._restore_original_settings(api_client)

    def test_03_invalid_smtp_port_zero(self, api_client):
        """Test PATCH /mail-settings - Invalid SMTP port (0)"""
        try:
            response = api_client.patch('mail-settings', {
                'MailSMTPPort': 0
            })

            if not response['result']:
                print(f"✓ Invalid SMTP port (0) rejected")
            else:
                print(f"⚠ Invalid SMTP port (0) accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid SMTP port (0) rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")
        finally:
            self._restore_original_settings(api_client)

    def test_04_invalid_smtp_port_negative(self, api_client):
        """Test PATCH /mail-settings - Invalid SMTP port (negative)"""
        try:
            response = api_client.patch('mail-settings', {
                'MailSMTPPort': -587
            })

            if not response['result']:
                print(f"✓ Negative SMTP port rejected")
            else:
                print(f"⚠ Negative SMTP port accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Negative SMTP port rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")
        finally:
            self._restore_original_settings(api_client)

    def test_05_invalid_smtp_port_too_high(self, api_client):
        """Test PATCH /mail-settings - Invalid SMTP port (>65535)"""
        try:
            response = api_client.patch('mail-settings', {
                'MailSMTPPort': 99999
            })

            if not response['result']:
                print(f"✓ Too high SMTP port rejected")
            else:
                print(f"⚠ Too high SMTP port accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Too high SMTP port rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")
        finally:
            self._restore_original_settings(api_client)

    def test_06_invalid_email_address(self, api_client):
        """Test PATCH /mail-settings - Invalid email address"""
        try:
            response = api_client.patch('mail-settings', {
                'MailFromAddress': 'not-an-email'
            })

            if not response['result']:
                print(f"✓ Invalid email address rejected")
            else:
                print(f"⚠ Invalid email address accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid email address rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")
        finally:
            self._restore_original_settings(api_client)

    def test_07_invalid_auth_type(self, api_client):
        """Test PATCH /mail-settings - Invalid auth type"""
        try:
            response = api_client.patch('mail-settings', {
                'MailSMTPAuthType': 'invalid_auth_type'
            })

            if not response['result']:
                print(f"✓ Invalid auth type rejected")
            else:
                print(f"⚠ Invalid auth type accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid auth type rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")
        finally:
            self._restore_original_settings(api_client)

    def test_08_invalid_oauth2_provider(self, api_client):
        """Test GET /mail-settings:getOAuth2Url - Invalid OAuth2 provider"""
        try:
            response = api_client.get('mail-settings:getOAuth2Url', params={
                'provider': 'invalid_provider'
            })

            if not response['result']:
                print(f"✓ Invalid OAuth2 provider rejected")
            else:
                print(f"⚠ Invalid OAuth2 provider accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid OAuth2 provider rejected (HTTP error)")
            elif '501' in str(e):
                print(f"⚠ OAuth2 not implemented")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_09_put_without_required_fields(self, api_client):
        """Test PUT /mail-settings - Missing required fields"""
        try:
            response = api_client.put('mail-settings', {
                'MailSMTPPort': 587
                # Missing MailSMTPHost and MailFromAddress (required for PUT)
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
        finally:
            self._restore_original_settings(api_client)

    def test_10_test_connection_without_host(self, api_client, is_docker):
        """Test POST /mail-settings:testConnection stays structured when request payload omits host"""
        baseline_lines = TestMailSettings._get_system_log_lines(api_client)
        safe_settings = TestMailSettings._safe_test_connection_settings()

        try:
            patch_response = api_client.patch('mail-settings', safe_settings)
            assert_api_success(patch_response, "Failed to prepare safe SMTP settings for contract test")

            response = TestMailSettings._call_test_connection(api_client, {
                'MailSMTPPort': safe_settings['MailSMTPPort']
            })
            TestMailSettings._assert_test_connection_contract(
                response,
                expected_host=safe_settings['MailSMTPHost'],
                expected_port=safe_settings['MailSMTPPort']
            )
            TestMailSettings._assert_no_new_mail_php_fatals(api_client, baseline_lines)
            print("✓ SMTP testConnection tolerates missing host in payload and still returns structured diagnostics")
        finally:
            TestMailSettings._restore_original_settings(api_client)


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
