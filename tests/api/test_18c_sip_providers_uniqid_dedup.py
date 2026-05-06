#!/usr/bin/env python3
"""
Test SIP providers — defensive dedup of duplicate uniqid in pjsip.conf

Regression coverage for issue mikopbx/Core#1045:
when two m_Sip rows share one uniqid, the generated pjsip.conf used to
contain duplicate `[name](aor)`/`[name](endpoint)` sections. Asterisk 22
res_sorcery_config rejects the WHOLE file on a duplicate object, taking
down all extensions ("No matching endpoint found").

This test simulates the broken state via direct SQL (the REST API path
prevents collisions through Phalcon's UniquenessValidator), triggers a
config regeneration and verifies that:

  1. The generated pjsip.conf contains the colliding `(provider-aor-base)`
     section only once.
  2. system messages log contains a "Duplicate SIP provider uniqid" warning
     identifying the offending m_Sip.id.
  3. The system stays usable — the surviving provider's auth section is
     still present (regression smoke).

Cleanup restores unique uniqids and deletes both providers.
"""

import pytest

from conftest import (
    assert_api_success,
    execute_asterisk_command,
    read_file_from_container,
    wait_for_worker_idle,
)


class TestSIPProvidersUniqidDedup:
    """Defensive dedup against duplicate provider uniqids (#1045)."""

    provider_a_id = None
    provider_b_id = None
    sip_a_db_id = None
    sip_b_db_id = None
    original_b_uniqid = None

    @staticmethod
    def _create_provider(api_client, description, host, username, secret):
        response = api_client.post(
            'sip-providers',
            {
                'type': 'SIP',
                'description': description,
                'host': host,
                'username': username,
                'secret': secret,
                'port': 5060,
                'transport': 'udp',
                'registration_type': 'outbound',
            },
        )
        assert_api_success(response, f'Failed to create provider {description}')
        return response['data']['id']

    @staticmethod
    def _query_sip_id(api_client, uniqid):
        sql_response = api_client.post(
            'system:executeSqlRequest',
            {
                'query': f"SELECT id FROM m_Sip WHERE uniqid = '{uniqid}'",
                'database': 'main',
            },
        )
        assert_api_success(sql_response, f'Failed to read m_Sip.id for {uniqid}')
        rows = sql_response['data']['rows']
        assert rows, f'm_Sip row not found for uniqid={uniqid}'
        return int(rows[0]['id'])

    @staticmethod
    def _bash(api_client, command):
        response = api_client.post('system:executeBashCommand', {'command': command})
        assert_api_success(response, f'Bash command failed: {command}')
        return response['data'].get('output', '')

    @pytest.mark.dependency()
    def test_01_create_two_providers(self, api_client):
        """Create two distinct providers via REST API (unique uniqids)."""
        cls = TestSIPProvidersUniqidDedup
        cls.provider_a_id = self._create_provider(
            api_client,
            description='Dedup test provider A',
            host='dedup-a.example.test',
            username='dedup_a',
            secret='DedupSecretA123',
        )
        cls.provider_b_id = self._create_provider(
            api_client,
            description='Dedup test provider B',
            host='dedup-b.example.test',
            username='dedup_b',
            secret='DedupSecretB123',
        )
        assert cls.provider_a_id != cls.provider_b_id, \
            'API must return distinct uniqids for two fresh providers'
        # POST /sip-providers returns id == uniqid; we save it under an
        # explicit name so the cleanup SQL UPDATE that restores uniqueness
        # is self-documenting even if the API contract changes.
        cls.original_b_uniqid = cls.provider_b_id

        cls.sip_a_db_id = self._query_sip_id(api_client, cls.provider_a_id)
        cls.sip_b_db_id = self._query_sip_id(api_client, cls.provider_b_id)
        assert cls.sip_a_db_id < cls.sip_b_db_id, \
            'Second provider must have a larger m_Sip.id than the first'

    @pytest.mark.dependency(depends=[
        'TestSIPProvidersUniqidDedup::test_01_create_two_providers'])
    def test_02_force_duplicate_uniqid_via_direct_sql(self, api_client):
        """Rewrite m_Sip.uniqid of provider B to match provider A.

        Direct sqlite3 UPDATE bypasses the ORM UniquenessValidator and
        reproduces the broken state from issue #1045.
        """
        cls = TestSIPProvidersUniqidDedup
        sql = (
            f"UPDATE m_Sip SET uniqid='{cls.provider_a_id}' "
            f"WHERE id={cls.sip_b_db_id};"
        )
        self._bash(api_client, f"sqlite3 /cf/conf/mikopbx.db \"{sql}\"")

        # Flush model cache (DB 4) so subsequent regeneration reads from disk.
        self._bash(api_client, 'redis-cli -n 4 FLUSHDB')

        verify = api_client.post(
            'system:executeSqlRequest',
            {
                'query': f"SELECT COUNT(*) AS cnt FROM m_Sip WHERE uniqid='{cls.provider_a_id}'",
                'database': 'main',
            },
        )
        assert_api_success(verify, 'verification SELECT failed')
        assert int(verify['data']['rows'][0]['cnt']) == 2, \
            'Test setup did not produce two m_Sip rows with duplicate uniqid'

    @pytest.mark.dependency(depends=[
        'TestSIPProvidersUniqidDedup::test_02_force_duplicate_uniqid_via_direct_sql'])
    def test_03_trigger_regeneration_and_wait(self, api_client):
        """PATCH provider A (no-op description) — triggers pjsip.conf regen."""
        cls = TestSIPProvidersUniqidDedup
        response = api_client.patch(
            f'sip-providers/{cls.provider_a_id}',
            {'description': 'Dedup test provider A (touched)'},
        )
        assert_api_success(response, 'PATCH on provider A failed')

        # Background workers regenerate pjsip.conf and reload PJSIP.
        # Polls beanstalkd queue until WorkerModelsEvents drains — the canonical
        # wait pattern in this suite, far more reliable than a flat sleep.
        wait_for_worker_idle(api_client)

    @pytest.mark.dependency(depends=[
        'TestSIPProvidersUniqidDedup::test_03_trigger_regeneration_and_wait'])
    def test_04_pjsip_conf_has_no_duplicate_section(self, api_client):
        """pjsip.conf must contain the AOR section for the colliding uniqid only once."""
        cls = TestSIPProvidersUniqidDedup
        config = read_file_from_container(api_client, '/etc/asterisk/pjsip.conf')
        marker = f'[{cls.provider_a_id}](provider-aor-base)'
        occurrences = config.count(marker)
        assert occurrences == 1, (
            f'Expected exactly one "{marker}" section, found {occurrences}.\n'
            f'Duplicate would have crashed res_sorcery_config and broken every endpoint.'
        )

        # Smoke: surviving provider's auth section must still be there.
        auth_marker = f'[{cls.provider_a_id}-AUTH]'
        assert auth_marker in config, \
            f'Surviving provider lost its auth section ({auth_marker})'

    @pytest.mark.dependency(depends=[
        'TestSIPProvidersUniqidDedup::test_03_trigger_regeneration_and_wait'])
    def test_05_warning_logged_for_duplicate(self, api_client):
        """system messages log carries a structured warning for the dropped row."""
        cls = TestSIPProvidersUniqidDedup
        # Last 1000 lines is enough — regeneration is recent.
        log = self._bash(
            api_client,
            'tail -n 1000 /storage/usbdisk1/mikopbx/log/system/messages 2>/dev/null || true',
        )
        needle = f'Duplicate SIP provider uniqid "{cls.provider_a_id}"'
        assert needle in log, (
            f'Expected log warning {needle!r} in /storage/.../system/messages, '
            f'tail did not contain it. Log (truncated):\n{log[-2000:]}'
        )
        # Winner id must be the smaller m_Sip.id.
        kept_marker = f'kept m_Sip.id={cls.sip_a_db_id}'
        assert kept_marker in log, \
            f'Log does not name the surviving row ({kept_marker}); flow integrity broken'

    @pytest.mark.dependency(depends=[
        'TestSIPProvidersUniqidDedup::test_03_trigger_regeneration_and_wait'])
    def test_06_asterisk_loaded_pjsip_endpoints(self, api_client):
        """`pjsip show endpoints` must list the surviving provider — proves the file parsed."""
        cls = TestSIPProvidersUniqidDedup
        output = execute_asterisk_command(api_client, 'pjsip show endpoints')
        assert cls.provider_a_id in output, (
            f'Surviving provider {cls.provider_a_id} not in `pjsip show endpoints` — '
            f'pjsip.conf likely failed to parse, defeating the dedup.'
        )

    def test_99_cleanup(self, api_client):
        """Restore unique uniqid for provider B and delete both providers."""
        cls = TestSIPProvidersUniqidDedup

        if cls.sip_b_db_id and cls.original_b_uniqid:
            sql = (
                f"UPDATE m_Sip SET uniqid='{cls.original_b_uniqid}' "
                f"WHERE id={cls.sip_b_db_id};"
            )
            self._bash(api_client, f"sqlite3 /cf/conf/mikopbx.db \"{sql}\"")
            self._bash(api_client, 'redis-cli -n 4 FLUSHDB')

        for pid in (cls.provider_a_id, cls.provider_b_id):
            if not pid:
                continue
            try:
                api_client.delete(f'sip-providers/{pid}')
            except Exception:
                # Best-effort cleanup — surface in logs but do not fail the run.
                pass
