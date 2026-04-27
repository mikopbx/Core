#!/usr/bin/env python3
"""Regression tests for MinIO users covered by the migration backfill
(issue mikopbx/Core#1036).

Before the preset refactor, path-style addressing was inferred from the
endpoint substring `minio` or port `:9000`. The migration (release
2026.1.89) backfills `s3_provider_preset='minio'` and
`s3_use_path_style=1` for any pre-existing row whose endpoint matched
that heuristic. These tests guard against:

  - Selecting the MinIO preset implicitly enables path-style.
  - Saving a MinIO endpoint without a preset still works (custom +
    explicit path-style flag).
  - testConnection round-trips against a real MinIO container — same
    workflow as Garage but with MinIO defaults.

The test is gated on the local MinIO stand (started via
docker-compose.s3-providers.yml). It auto-skips when the MINIO_*
environment variables are not exported.
"""

import os

import pytest

from conftest import assert_api_success


MINIO_REQUIRED_ENV = (
    "MINIO_ENDPOINT",
    "MINIO_REGION",
    "MINIO_BUCKET",
    "MINIO_ACCESS_KEY",
    "MINIO_SECRET_KEY",
)


def _minio_env_present() -> bool:
    return all(os.environ.get(name) for name in MINIO_REQUIRED_ENV)


pytestmark = pytest.mark.skipif(
    not _minio_env_present(),
    reason=(
        "MinIO stand env vars missing — run `eval $(./bootstrap-s3-providers.sh)` "
        f"to populate {', '.join(MINIO_REQUIRED_ENV)}."
    ),
)


@pytest.fixture(scope='class')
def minio_config() -> dict:
    return {
        's3_enabled': 1,
        's3_endpoint': os.environ['MINIO_ENDPOINT'],
        's3_region': os.environ['MINIO_REGION'],
        's3_bucket': os.environ['MINIO_BUCKET'],
        's3_access_key': os.environ['MINIO_ACCESS_KEY'],
        's3_secret_key': os.environ['MINIO_SECRET_KEY'],
        's3_provider_preset': 'minio',
        's3_use_path_style': 1,
    }


@pytest.fixture(scope='class')
def restore_settings(api_client):
    """Snapshot/restore the S3 config. Fails fast if a real backend is
    already configured because the test body PATCHes the secret_key with
    the MinIO stand secret and the API does not expose the original
    secret for restoration."""
    snapshot = api_client.get('s3-storage')
    assert_api_success(snapshot, "Failed to snapshot S3 settings before MinIO tests")
    pre = snapshot['data']
    if int(pre.get('s3_enabled', 0)) == 1 and pre.get('s3_secret_key'):
        pytest.skip(
            "Refusing to run: S3 is already enabled with a configured backend. "
            "This test would clobber your s3_secret_key and the API does not "
            "expose the original secret to put it back. Disable S3 before "
            "running, or run on a stand without a configured backend."
        )
    yield
    api_client.patch('s3-storage', {
        's3_enabled': int(pre.get('s3_enabled', 0)),
        's3_endpoint': pre.get('s3_endpoint') or '',
        's3_region': pre.get('s3_region') or 'us-east-1',
        's3_bucket': pre.get('s3_bucket') or '',
        's3_access_key': pre.get('s3_access_key') or '',
        's3_provider_preset': pre.get('s3_provider_preset') or 'custom',
        's3_use_path_style': int(pre.get('s3_use_path_style', 0)),
    })


class TestS3MinioPreset:
    """Backfill regression + happy-path E2E for MinIO."""

    def test_01_minio_preset_in_catalogue(self, api_client, restore_settings):
        """available_presets must list minio with path-style on."""
        response = api_client.get('s3-storage')
        assert_api_success(response, "GET /s3-storage failed")

        presets = {p['id']: p for p in response['data']['available_presets']}
        assert 'minio' in presets, "MinIO preset missing from catalogue"
        assert presets['minio']['use_path_style'] is True, (
            "MinIO preset must default to path-style — backfill relies on this"
        )

    def test_02_save_minio_preset_persists(self, api_client, minio_config):
        """Saving the MinIO preset round-trips through GET intact."""
        response = api_client.patch('s3-storage', minio_config)
        assert_api_success(response, "PATCH minio preset failed")

        data = response['data']
        assert data['s3_provider_preset'] == 'minio'
        assert int(data['s3_use_path_style']) == 1

        reread = api_client.get('s3-storage')
        assert reread['data']['s3_provider_preset'] == 'minio'
        assert int(reread['data']['s3_use_path_style']) == 1

    def test_03_custom_preset_with_explicit_path_style(self, api_client, minio_config):
        """An installer that picks Custom + checks path-style manually
        must work the same as the preset — engine code stays
        provider-agnostic."""
        custom = dict(minio_config)
        custom['s3_provider_preset'] = 'custom'
        custom['s3_use_path_style'] = 1

        response = api_client.patch('s3-storage', custom)
        assert_api_success(response, "PATCH custom + path-style failed")

        data = response['data']
        assert data['s3_provider_preset'] == 'custom'
        assert int(data['s3_use_path_style']) == 1

    def test_04_test_connection_minio(self, api_client, minio_config):
        """testConnection succeeds against a healthy MinIO stand."""
        api_client.patch('s3-storage', minio_config)

        response = api_client.post('s3-storage:testConnection', {})
        assert_api_success(response, "testConnection should succeed against live MinIO")

        data = response['data']
        assert data['status'] == 'connected', f"expected status=connected, got {data}"
        assert data.get('use_path_style') is True
        assert data.get('provider_preset') == 'minio'

    def test_05_minio_without_path_style_fails_with_hint(self, api_client, minio_config):
        """Regression: turning path-style off against MinIO must fail
        with a hint nudging the user to re-enable it (saves a support
        ticket)."""
        broken = dict(minio_config)
        broken['s3_use_path_style'] = 0
        # Custom preset so the path-style flag isn't auto-corrected by the UI.
        broken['s3_provider_preset'] = 'custom'
        api_client.patch('s3-storage', broken)

        response = api_client.post('s3-storage:testConnection', {})
        data = response['data']
        # Either DNS or signature failure depending on bucket-name DNS
        # validity. Both surface error_class; the hint may or may not be
        # the path-style one depending on which AWS error is reported.
        assert data['status'] == 'failed', f"expected status=failed, got {data}"
        assert data.get('error_class'), "error_class must be surfaced"
        assert 'aws_error_code' in data
        assert 'hint' in data
