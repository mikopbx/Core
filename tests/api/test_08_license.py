#!/usr/bin/env python3
"""Test suite for License operations"""
import base64
import shlex

import pytest
import requests
from conftest import assert_api_success, MikoPBXClient

class TestLicense:
    def test_01_get_license_info(self, api_client):
        try:
            response = api_client.get('license')
            assert_api_success(response, "Failed to get license info")
            print(f"✓ Retrieved license information")
        except Exception as e:
            if '422' in str(e) or '404' in str(e):
                print(f"⚠ License endpoint not fully implemented")
                print(f"  Note: May require license activation or specific configuration")
            else:
                raise
    def test_02_check_license(self, api_client):
        try:
            response = api_client.get('license:check')
            if response['result']:
                print(f"✓ License check works")
        except Exception as e:
            if '501' in str(e) or '404' in str(e):
                print(f"⚠ Method not implemented")


class TestLicenseResetKeyPermissions:
    """
    license:resetKey erases the license key (issue #1173).

    API-key grants are per resource and read/write only: the permission checker strips the
    `:method` suffix and treats GET as read. While resetKey was served over GET, a key granted
    only {"/api/v3/license": "read"} could wipe the license. It must be POST-only, so the same
    checker requires write.
    """

    @staticmethod
    def _license_key(api_client) -> str:
        response = api_client.post('system:executeSqlRequest', {
            'query': "SELECT value FROM m_PbxSettings WHERE key = 'PBXLicense'",
        })
        assert_api_success(response, "Failed to read PBXLicense")
        rows = response['data']['rows']
        return rows[0]['value'] if rows else ''

    @staticmethod
    def _restore_license_key(api_client, value: str):
        """Put the key back the way the settings model saves it (only needed on a vulnerable build)."""
        encoded = base64.b64encode(value.encode()).decode()
        php = ('require_once "/usr/www/src/Core/Config/Globals.php"; $m = []; '
               f'\\MikoPBX\\Common\\Models\\PbxSettings::setValueByKey("PBXLicense", base64_decode("{encoded}"), $m);')
        api_client.post('system:executeBashCommand', {'command': f"php -r {shlex.quote(php)}"})

    def test_01_read_only_key_cannot_reset_license_key(self, api_client):
        before = self._license_key(api_client)
        if not before:
            pytest.skip("No license key on this PBX, nothing to protect")

        generated = api_client.post('api-keys:generateKey', {})
        assert_api_success(generated, "Failed to generate API key")
        token = generated['data'].get('key') or generated['data'].get('api_key')
        created = api_client.post('api-keys', {
            'key': token,
            'description': 'resetKey read-only test key',
            'full_permissions': False,
            'allowed_paths': {'/api/v3/license': 'read'},
        })
        assert_api_success(created, "Failed to create read-only API key")
        key_id = created['data']['id']

        readonly_client = MikoPBXClient(base_url=api_client.base_url, auth_token=token)
        try:
            get_status = readonly_client.get_raw('license:resetKey', skip_auth_retry=True).status_code
            with pytest.raises(requests.exceptions.HTTPError) as denied:
                readonly_client.post('license:resetKey', {})
            after = self._license_key(api_client)
        finally:
            if self._license_key(api_client) != before:
                self._restore_license_key(api_client, before)
            api_client.delete(f'api-keys/{key_id}')

        assert get_status == 405, f"GET license:resetKey must be refused with 405, got {get_status}"
        assert denied.value.response.status_code in (401, 403), \
            f"Read-only key must not POST license:resetKey, got {denied.value.response.status_code}"
        unchanged = after == before
        assert unchanged, "PBXLicense changed after resetKey calls with a read-only key"
        restored = self._license_key(api_client) == before
        assert restored, "PBXLicense was not restored"
        print("✓ Read-only key cannot reset the license key (GET 405, POST denied)")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
