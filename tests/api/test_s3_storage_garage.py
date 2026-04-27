#!/usr/bin/env python3
"""End-to-end test for the Garage S3 provider preset.

Scope (issue mikopbx/Core#1036):
  - Saving the `garage` preset via PATCH propagates path-style=1 and
    surfaces it on the next GET.
  - The available_presets catalogue exposes the Garage entry to the UI.
  - testConnection succeeds against a real Garage container.
  - testConnection failure surfaces error_class / aws_error_code / hint
    in the response (so the UI can give actionable diagnostics).

The test is **gated** on the local Garage stand. It auto-skips when the
stand is not running so CI without docker doesn't fail. To run it:

    cd tests/api
    docker compose -f docker-compose.s3-providers.yml up -d
    eval "$(./bootstrap-s3-providers.sh)"     # exports GARAGE_*
    docker network connect mikopbx-test-storage mikopbx-php83 || true
    pytest test_s3_storage_garage.py -v

The fixture restores the original S3 settings after the class so the
developer's manual configuration is not clobbered.
"""

import os

import pytest

from conftest import assert_api_success


GARAGE_REQUIRED_ENV = (
    "GARAGE_ENDPOINT",
    "GARAGE_REGION",
    "GARAGE_BUCKET",
    "GARAGE_ACCESS_KEY",
    "GARAGE_SECRET_KEY",
)


def _garage_env_present() -> bool:
    return all(os.environ.get(name) for name in GARAGE_REQUIRED_ENV)


pytestmark = pytest.mark.skipif(
    not _garage_env_present(),
    reason=(
        "Garage stand env vars missing — run `eval $(./bootstrap-s3-providers.sh)` "
        f"to populate {', '.join(GARAGE_REQUIRED_ENV)}."
    ),
)


@pytest.fixture(scope='class')
def garage_config() -> dict:
    return {
        's3_enabled': 1,
        's3_endpoint': os.environ['GARAGE_ENDPOINT'],
        's3_region': os.environ['GARAGE_REGION'],
        's3_bucket': os.environ['GARAGE_BUCKET'],
        's3_access_key': os.environ['GARAGE_ACCESS_KEY'],
        's3_secret_key': os.environ['GARAGE_SECRET_KEY'],
        's3_provider_preset': 'garage',
        's3_use_path_style': 1,
    }


@pytest.fixture(scope='class')
def restore_settings(api_client):
    """Snapshot S3 settings before the class and restore them after.

    Fails fast if S3 is already enabled with a configured backend — the
    test body PATCHes the developer's secret_key with the Garage stand
    secret, and the API returns the secret_key masked, so we cannot put
    the original secret back on teardown. Better to refuse to run than
    silently corrupt a working configuration.
    """
    snapshot = api_client.get('s3-storage')
    assert_api_success(snapshot, "Failed to snapshot S3 settings before Garage tests")
    pre = snapshot['data']
    if int(pre.get('s3_enabled', 0)) == 1 and pre.get('s3_secret_key'):
        pytest.skip(
            "Refusing to run: S3 is already enabled with a configured backend. "
            "This test would clobber your s3_secret_key and the API does not "
            "expose the original secret to put it back. Disable S3 before "
            "running, or run on a stand without a configured backend."
        )
    yield
    # Restore non-secret fields and the enable flag. The secret has not
    # been changed for already-disabled installs (s3_enabled was 0) so
    # nothing to put back.
    api_client.patch('s3-storage', {
        's3_enabled': int(pre.get('s3_enabled', 0)),
        's3_endpoint': pre.get('s3_endpoint') or '',
        's3_region': pre.get('s3_region') or 'us-east-1',
        's3_bucket': pre.get('s3_bucket') or '',
        's3_access_key': pre.get('s3_access_key') or '',
        's3_provider_preset': pre.get('s3_provider_preset') or 'custom',
        's3_use_path_style': int(pre.get('s3_use_path_style', 0)),
    })


class TestS3GaragePreset:
    """E2E tests against a real single-node Garage container."""

    def test_01_get_exposes_available_presets(self, api_client, restore_settings):
        """The catalogue is part of the GET response so the UI can render
        the dropdown without a second round-trip. All 10 preset ids must
        be present, and the path-style flag must be on for the
        self-hosted set (MinIO/Garage/Ceph) and off for the SaaS set."""
        response = api_client.get('s3-storage')
        assert_api_success(response, "GET /s3-storage failed")

        data = response['data']
        assert 'available_presets' in data, "available_presets missing from GET response"

        expected_ids = {
            'aws', 'minio', 'garage', 'ceph', 'wasabi', 'digitalocean',
            'yandex', 'vkcloud', 'selectel', 'custom',
        }
        actual_ids = {p['id'] for p in data['available_presets']}
        assert actual_ids == expected_ids, (
            f"available_presets id set mismatch: missing={expected_ids - actual_ids}, "
            f"extra={actual_ids - expected_ids}"
        )

        # Self-hosted backends require path-style. SaaS providers do not.
        path_style_on = {p['id'] for p in data['available_presets'] if p['use_path_style']}
        assert path_style_on == {'minio', 'garage', 'ceph'}, (
            f"Path-style must be on exactly for MinIO/Garage/Ceph, got {path_style_on}"
        )

        # Each preset must carry endpoint placeholder, region default, docs path
        # and a translation hint key — used by the UI dropdown.
        for preset in data['available_presets']:
            for field in ('label_key', 'region_default', 'use_path_style', 'docs_path', 'hint_key'):
                assert field in preset, f"Preset {preset['id']} missing field {field}"

        # Spot-check garage defaults — region must match the Garage cluster default.
        garage_preset = next(p for p in data['available_presets'] if p['id'] == 'garage')
        assert garage_preset['region_default'] == 'garage'
        assert garage_preset['docs_path'].endswith('garage.md')

    def test_02_save_garage_preset_persists_path_style(self, api_client, garage_config):
        """Saving the preset must propagate s3_use_path_style=1 — this is
        the behaviour change that fixes Garage/Ceph/MinIO connectivity."""
        response = api_client.patch('s3-storage', garage_config)
        assert_api_success(response, "PATCH garage preset failed")

        data = response['data']
        assert data['s3_provider_preset'] == 'garage', "preset should round-trip"
        assert int(data['s3_use_path_style']) == 1, (
            "use_path_style must be 1 after saving the garage preset"
        )

        reread = api_client.get('s3-storage')
        assert_api_success(reread, "GET after PATCH failed")
        assert int(reread['data']['s3_use_path_style']) == 1
        assert reread['data']['s3_provider_preset'] == 'garage'

    def test_03_test_connection_succeeds(self, api_client, garage_config):
        """testConnection against a healthy Garage stand returns success
        and reports the path-style + preset that produced it."""
        api_client.patch('s3-storage', garage_config)

        response = api_client.post('s3-storage:testConnection', {})
        assert_api_success(response, "testConnection should succeed against live Garage")

        data = response['data']
        assert data['status'] == 'connected', f"expected status=connected, got {data}"
        assert data.get('use_path_style') is True
        assert data.get('provider_preset') == 'garage'

    def test_03b_patch_preserves_unspecified_preset(self, api_client, garage_config):
        """PATCH semantics: omitting a field leaves it untouched. After
        applying garage_config we PATCH a single unrelated field and
        verify s3_provider_preset and s3_use_path_style are unchanged."""
        api_client.patch('s3-storage', garage_config)

        response = api_client.patch('s3-storage', {'s3_region': 'garage-eu'})
        assert_api_success(response, "PATCH single field failed")

        data = response['data']
        assert data['s3_provider_preset'] == 'garage', (
            "PATCH must not zero the preset when it is omitted from the payload"
        )
        assert int(data['s3_use_path_style']) == 1, (
            "PATCH must not zero the path-style flag when it is omitted"
        )
        assert data['s3_region'] == 'garage-eu'

    def test_03c_invalid_preset_id_normalises_to_custom(self, api_client, garage_config):
        """Sending a preset id outside S3ProviderPresets registry must
        fall back to 'custom' instead of being stored verbatim."""
        bogus = dict(garage_config)
        bogus['s3_provider_preset'] = 'never-heard-of-it'
        response = api_client.patch('s3-storage', bogus)
        assert_api_success(response, "PATCH with bogus preset failed")

        assert response['data']['s3_provider_preset'] == 'custom', (
            "Unknown preset ids must be normalised to 'custom' by the backend"
        )

    def test_04_test_connection_failure_surfaces_diagnostics(self, api_client, garage_config):
        """Pointing at an unreachable endpoint must surface error_class,
        aws_error_code, and (for non-AWS endpoints) the path-style hint."""
        broken = dict(garage_config)
        # Use an unreachable port — connection refused, not DNS.
        broken['s3_endpoint'] = 'http://127.0.0.1:1'
        api_client.patch('s3-storage', broken)

        response = api_client.post('s3-storage:testConnection', {})
        # Connection failure is success=false but http=200 — same shape
        # the action returned before. Check the data block instead.
        data = response['data']
        assert data['status'] == 'failed', f"expected status=failed, got {data}"
        assert data.get('error_class'), "error_class must be surfaced for diagnostics"
        # Older versions returned only a generic message — assert the
        # new actionable fields are now present (even if null).
        assert 'aws_error_code' in data
        assert 'hint' in data
        assert 'http_status' in data
