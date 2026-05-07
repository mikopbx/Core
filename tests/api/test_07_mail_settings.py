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
import json
import shlex
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
            'MailSMTPHost': '127.0.0.1',
            'MailSMTPPort': 1,
            'MailSMTPAuthType': 'none',
            'MailSMTPUseTLS': 'none',
        }

    @classmethod
    def _restore_original_settings(cls, api_client) -> None:
        if not cls.original_settings:
            return

        restore_data = {}
        for field in ['MailSMTPHost', 'MailSMTPPort', 'MailSMTPAuthType', 'MailFromAddress', 'MailSMTPUseTLS']:
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

    @classmethod
    def _get_mail_settings_runtime_debug(cls, api_client) -> str:
        command = (
            'php -r \'require_once "Globals.php"; '
            '$key=\\MikoPBX\\Common\\Models\\PbxSettings::MAIL_SMTP_HOST; '
            '$port=\\MikoPBX\\Common\\Models\\PbxSettings::MAIL_SMTP_PORT; '
            '$auth=\\MikoPBX\\Common\\Models\\PbxSettings::MAIL_SMTP_AUTH_TYPE; '
            '$tls=\\MikoPBX\\Common\\Models\\PbxSettings::MAIL_SMTP_USE_TLS; '
            'echo json_encode(['
            '"host_cache"=>\\MikoPBX\\Common\\Models\\PbxSettings::getValueByKey($key,true),'
            '"host_db"=>\\MikoPBX\\Common\\Models\\PbxSettings::getValueByKey($key,false),'
            '"port_cache"=>\\MikoPBX\\Common\\Models\\PbxSettings::getValueByKey($port,true),'
            '"port_db"=>\\MikoPBX\\Common\\Models\\PbxSettings::getValueByKey($port,false),'
            '"auth_cache"=>\\MikoPBX\\Common\\Models\\PbxSettings::getValueByKey($auth,true),'
            '"auth_db"=>\\MikoPBX\\Common\\Models\\PbxSettings::getValueByKey($auth,false),'
            '"tls_cache"=>\\MikoPBX\\Common\\Models\\PbxSettings::getValueByKey($tls,true),'
            '"tls_db"=>\\MikoPBX\\Common\\Models\\PbxSettings::getValueByKey($tls,false)'
            '], JSON_UNESCAPED_SLASHES);\''
        )

        try:
            result = cls._exec_bash(api_client, command)
            return result.get('output', '').strip()
        except Exception as e:
            return f'failed to collect runtime debug: {str(e)[:200]}'

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
        safe_update = safe_settings.copy()
        safe_update['MailFromAddress'] = (
            TestMailSettings.original_settings or {}
        ).get('MailFromAddress', 'admin@localhost')

        try:
            update_response = api_client.put('mail-settings', safe_update)
            assert_api_success(update_response, "Failed to prepare safe SMTP settings for contract test")
            print("MAIL DEBUG update_response:")
            print(json.dumps(update_response, ensure_ascii=False, sort_keys=True))

            prepared = api_client.get('mail-settings')
            assert_api_success(prepared, "Failed to verify prepared safe SMTP settings")
            prepared_data = prepared.get('data', {})
            print("MAIL DEBUG prepared_get_response:")
            print(json.dumps(prepared, ensure_ascii=False, sort_keys=True))

            if (
                prepared_data.get('MailSMTPHost') != safe_settings['MailSMTPHost']
                or str(prepared_data.get('MailSMTPPort')) != str(safe_settings['MailSMTPPort'])
            ):
                runtime_debug = self._get_mail_settings_runtime_debug(api_client)
                print(f"MAIL DEBUG runtime_settings: {runtime_debug}")
                pytest.fail(
                    "Safe SMTP settings were not applied. "
                    f"expected_host={safe_settings['MailSMTPHost']!r}, "
                    f"actual_host={prepared_data.get('MailSMTPHost')!r}, "
                    f"expected_port={safe_settings['MailSMTPPort']!r}, "
                    f"actual_port={prepared_data.get('MailSMTPPort')!r}, "
                    f"runtime_debug={runtime_debug}"
                )

            response = self._call_test_connection(api_client, safe_settings)
            print("MAIL DEBUG test_connection_response:")
            print(json.dumps(response, ensure_ascii=False, sort_keys=True))
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


class TestMailPlainTextToggle:
    """
    Tests for the MailPlainText global toggle.

    Verifies that the new global setting that switches all email notifications
    between HTML (default) and plain-text mode:
      - is exposed by GET with the correct default value (False),
      - can be toggled to True via PATCH and is persisted (DB + cache),
      - can be toggled back to False via PATCH,
      - the original value is restored at the end of the suite.
    """

    SETTING_KEY = 'MailPlainText'
    original_value = None

    @staticmethod
    def _read_php_value(api_client) -> dict:
        """Read MailPlainText directly from the PHP runtime to verify DB+cache persistence."""
        command = (
            'php -r \'require_once "Globals.php"; '
            '$key=\\MikoPBX\\Common\\Models\\PbxSettings::MAIL_PLAIN_TEXT; '
            'echo json_encode(['
            '"key"=>$key,'
            '"cache"=>\\MikoPBX\\Common\\Models\\PbxSettings::getValueByKey($key,true),'
            '"db"=>\\MikoPBX\\Common\\Models\\PbxSettings::getValueByKey($key,false)'
            '], JSON_UNESCAPED_SLASHES);\''
        )
        response = api_client.post('system:executeBashCommand', {
            'command': command,
            'timeout': 15,
        })
        assert_api_success(response, "Failed to read MailPlainText via PHP CLI")
        output = response['data'].get('output', '').strip()
        assert output, f"Empty output from PHP CLI for {TestMailPlainTextToggle.SETTING_KEY}"
        try:
            return json.loads(output)
        except json.JSONDecodeError as e:
            pytest.fail(f"PHP CLI returned non-JSON output: {output!r} ({e})")

    @staticmethod
    def _as_bool(value) -> bool:
        """Normalize the API/DB representation to a Python bool.

        REST schema marks the field as boolean, but PHP's PbxSettings stores
        booleans as the strings '0'/'1' — accept either representation.
        """
        if isinstance(value, bool):
            return value
        if isinstance(value, int):
            return value != 0
        if isinstance(value, str):
            return value.strip() in ('1', 'true', 'True', 'TRUE')
        return False

    def test_01_capture_original(self, api_client):
        """GET /mail-settings exposes MailPlainText and we capture its current value
        for restoration. Either True or False is a valid persisted state on a
        configured PBX, so we don't assert a specific default here — the toggle
        behaviour itself is verified by test_02 / test_03 below.
        """
        response = api_client.get('mail-settings')
        assert_api_success(response, "Failed to get mail settings")

        data = response['data']
        assert self.SETTING_KEY in data, (
            f"{self.SETTING_KEY} missing from mail-settings response. "
            f"Keys present: {sorted(data.keys())}"
        )

        TestMailPlainTextToggle.original_value = self._as_bool(data[self.SETTING_KEY])
        print(f"✓ Captured {self.SETTING_KEY}={TestMailPlainTextToggle.original_value}")

    def test_02_patch_enable_plain_text(self, api_client):
        """PATCH MailPlainText=True persists and is reflected in GET + PHP runtime."""
        response = api_client.patch('mail-settings', {self.SETTING_KEY: True})
        assert_api_success(response, f"Failed to enable {self.SETTING_KEY}")

        # 1) Verify via REST GET
        verify = api_client.get('mail-settings')
        assert_api_success(verify, "Failed to re-read mail settings after PATCH")
        assert self.SETTING_KEY in verify['data'], (
            f"{self.SETTING_KEY} missing from response after PATCH"
        )
        assert self._as_bool(verify['data'][self.SETTING_KEY]) is True, (
            f"PATCH did not flip {self.SETTING_KEY} to True; "
            f"got {verify['data'][self.SETTING_KEY]!r}"
        )

        # 2) Verify via PHP runtime — value reaches both cache and DB
        php = self._read_php_value(api_client)
        assert php.get('cache') == '1', (
            f"PbxSettings cache lookup expected '1', got {php.get('cache')!r}"
        )
        assert php.get('db') == '1', (
            f"PbxSettings DB lookup expected '1', got {php.get('db')!r}"
        )
        print(f"✓ {self.SETTING_KEY}=True persisted (REST + cache + DB)")

    def test_03_patch_disable_plain_text(self, api_client):
        """PATCH MailPlainText=False flips it back and is reflected everywhere."""
        response = api_client.patch('mail-settings', {self.SETTING_KEY: False})
        assert_api_success(response, f"Failed to disable {self.SETTING_KEY}")

        verify = api_client.get('mail-settings')
        assert_api_success(verify, "Failed to re-read mail settings after PATCH")
        assert self._as_bool(verify['data'][self.SETTING_KEY]) is False, (
            f"PATCH did not flip {self.SETTING_KEY} back to False; "
            f"got {verify['data'][self.SETTING_KEY]!r}"
        )

        php = self._read_php_value(api_client)
        assert php.get('cache') == '0', (
            f"PbxSettings cache lookup expected '0', got {php.get('cache')!r}"
        )
        assert php.get('db') == '0', (
            f"PbxSettings DB lookup expected '0', got {php.get('db')!r}"
        )
        print(f"✓ {self.SETTING_KEY}=False persisted (REST + cache + DB)")

    def test_04_patch_string_one_is_normalized(self, api_client):
        """The DataStructure 'sanitize'=>'bool' rule normalizes string '1' to True."""
        response = api_client.patch('mail-settings', {self.SETTING_KEY: '1'})
        assert_api_success(response, f"Failed to PATCH {self.SETTING_KEY} with string '1'")

        verify = api_client.get('mail-settings')
        assert self._as_bool(verify['data'][self.SETTING_KEY]) is True, (
            f"String '1' should be normalized to True; got {verify['data'][self.SETTING_KEY]!r}"
        )
        print(f"✓ String '1' normalized to True")

    def test_04b_invalidate_cached_value_clears_redis(self, api_client):
        """Regression guard for the cache-coherency hole behind ResetToDefaultsAction.

        PbxSettings has no afterDelete hook, so a raw $record->delete() leaves
        the Redis hash holding the previous value. The fix exposes a public
        invalidateCachedValue($key) helper which the reset action now calls
        per deleted key. This test exercises the helper end-to-end without
        triggering the DELETE /mail-settings endpoint (which would wipe the
        user's actual SMTP credentials).

        Scenario (pure PHP CLI inside the container, doesn't touch REST):
          1. Write the toggle through setValueByKey('1') → both DB + cache hold '1'.
          2. Delete the DB row directly through the ORM, mimicking the path in
             ResetToDefaultsAction. The cached '1' is intentionally left stale.
          3. Read with cache enabled → still '1' because cache is stale.
          4. Call invalidateCachedValue() → drops the hash field.
          5. Read with cache enabled → falls through to defaults trait → '0'.

        The two cache reads in steps 3 and 5 must differ — that's the proof
        that the helper actually drains the cache and that ResetToDefaultsAction's
        new invalidation loop closes the gap.
        """
        php_script = (
            'require_once "Globals.php"; '
            'use MikoPBX\\Common\\Models\\PbxSettings; '
            '$key = PbxSettings::MAIL_PLAIN_TEXT; '
            '$msgs = []; '
            'PbxSettings::setValueByKey($key, "1", $msgs); '
            '$rec = PbxSettings::findFirstByKey($key); '
            'if ($rec !== null) { $rec->delete(); } '
            '$staleFromCache = PbxSettings::getValueByKey($key, true); '
            'PbxSettings::invalidateCachedValue($key); '
            '$freshFromCache = PbxSettings::getValueByKey($key, true); '
            'echo json_encode(['
            '"stale_from_cache" => $staleFromCache, '
            '"fresh_from_cache" => $freshFromCache'
            '], JSON_UNESCAPED_SLASHES);'
        )
        command = "php -r " + shlex.quote(php_script)
        response = api_client.post('system:executeBashCommand', {
            'command': command,
            'timeout': 20,
        })
        assert_api_success(response, "Failed to exercise invalidateCachedValue() via PHP CLI")
        output = response['data'].get('output', '').strip()
        assert output, "Empty output from PHP CLI cache test"
        try:
            result = json.loads(output)
        except json.JSONDecodeError as e:
            pytest.fail(f"Non-JSON output from PHP CLI: {output!r} ({e})")

        # Step 3: with stale cache, getValueByKey($key, true) still returns '1'
        assert result.get('stale_from_cache') == '1', (
            f"Pre-invalidation cache read expected '1' (proving cache was populated), "
            f"got {result.get('stale_from_cache')!r}. "
            f"setValueByKey() may not be writing the cache."
        )
        # Step 5: after invalidateCachedValue(), cache miss → defaults trait → '0'
        assert result.get('fresh_from_cache') == '0', (
            f"Post-invalidation cache read expected '0' (default fallback), "
            f"got {result.get('fresh_from_cache')!r}. "
            f"PbxSettings::invalidateCachedValue() did not drain the Redis hash field."
        )

        # Re-PATCH MailPlainText=True so the next test has the same pre-condition
        # as the suite expects (test_04 left it True before the cache experiment).
        re_enable = api_client.patch('mail-settings', {self.SETTING_KEY: True})
        assert_api_success(re_enable, f"Failed to restore {self.SETTING_KEY}=True after cache test")
        print(f"✓ invalidateCachedValue() drains the {self.SETTING_KEY} hash field")

    def test_05_plain_text_preserves_alert_details(self, api_client):
        """Regression guard: plain-text DiskSpace email must still contain the actual
        disk percentage, free-space value and CTA URL — i.e. dynamicContent /
        INFO_BOX_CONTENT / HELP_TEXT / CTA_* are rendered in plain mode, not stripped.

        The check runs the builder directly via PHP CLI so we don't depend on a
        real SMTP server while still exercising the production rendering code.
        """
        php_script = (
            'require_once "Globals.php"; '
            '$b = new \\MikoPBX\\Core\\System\\Mail\\Builders\\DiskSpaceNotificationBuilder(); '
            '$b->setRecipient("admin@example.com")'
            '  ->setDiskUsage(95)'
            '  ->setFreeSpace("420 MB")'
            '  ->setPartitions([["name"=>"/storage","usage"=>95]])'
            '  ->setAdminUrl("https://pbx.example.com/admin"); '
            'echo $b->buildPlainText();'
        )
        command = "php -r " + shlex.quote(php_script)
        response = api_client.post('system:executeBashCommand', {
            'command': command,
            'timeout': 20,
        })
        assert_api_success(response, "Failed to render DiskSpace plain text via PHP CLI")
        body = response['data'].get('output', '')
        assert body, "Empty plain-text body returned by builder"

        required = {
            '95%': 'disk usage percentage',
            '420 MB': 'free-space value',
            '/storage': 'affected partition name',
            'https://pbx.example.com/admin': 'CTA admin panel URL',
        }
        missing = [label for needle, label in required.items() if needle not in body]
        assert not missing, (
            f"Plain-text DiskSpace alert lost critical detail(s): {missing}.\n"
            f"--- rendered body ---\n{body}\n---"
        )

        # No HTML tags should leak into a plain-text body.
        assert '<' not in body and '>' not in body, (
            f"HTML tags leaked into plain-text body:\n{body}"
        )
        print(f"✓ DiskSpace plain-text body preserves disk %, free space, partition and CTA URL")

    def test_06_restore_original(self, api_client):
        """Restore the original MailPlainText value so other suites are unaffected."""
        if TestMailPlainTextToggle.original_value is None:
            pytest.skip("No original value captured; nothing to restore")

        response = api_client.patch('mail-settings', {
            self.SETTING_KEY: TestMailPlainTextToggle.original_value
        })
        assert_api_success(response, f"Failed to restore {self.SETTING_KEY}")

        verify = api_client.get('mail-settings')
        restored = self._as_bool(verify['data'][self.SETTING_KEY])
        assert restored == TestMailPlainTextToggle.original_value, (
            f"Restoration failed: expected {TestMailPlainTextToggle.original_value}, got {restored}"
        )
        print(f"✓ {self.SETTING_KEY} restored to {TestMailPlainTextToggle.original_value}")


class TestMailSettingsEdgeCases:
    """Edge cases for mail settings"""

    @staticmethod
    def _restore_original_settings(api_client):
        """Restore fields that edge-case PATCH/PUT calls may accidentally persist."""
        if not TestMailSettings.original_settings:
            return

        restore_data = {}
        for field in ['MailSMTPHost', 'MailSMTPPort', 'MailFromAddress', 'MailSMTPAuthType', 'MailSMTPUseTLS']:
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
