#!/usr/bin/env python3
"""
Test suite for provider deletion → extensions.conf cleanup.

Reproduces the bug: deleting a SIP provider leaves its incoming context
in extensions.conf. The stale context only disappears after an unrelated
change (e.g., adding an employee or another provider) triggers a full
dialplan regeneration.

Root cause: WorkerModelsEvents read the database for dependent module
settings BEFORE the DELETE transaction was committed. The deferred
settings refresh fix (reading DB only after the 5-second timeout)
ensures the provider is already deleted when extensions.conf is
regenerated.

This test creates a provider with an incoming route, forces a dialplan
regeneration to confirm the context appears, deletes the provider, and
asserts the incoming context is removed from extensions.conf without
any additional model changes.
"""
import re
import time

import pytest
from conftest import assert_api_success, execute_asterisk_command


# Maximum time to poll before giving up.
# WorkerModelsEvents.timeout = 5s + config generation + dialplan reload ≈ 15s.
# We poll for up to 45s to account for slow containers.
MAX_POLL_SECONDS = 45

# Poll interval.
POLL_INTERVAL = 3


def read_extensions_conf(api_client) -> str:
    """
    Read /etc/asterisk/extensions.conf from the container.

    Uses system:executeBashCommand to cat the file content.
    """
    response = api_client.post('system:executeBashCommand', {
        'command': 'cat /etc/asterisk/extensions.conf'
    })
    if not response.get('result'):
        raise RuntimeError(
            f"Failed to read extensions.conf: {response.get('messages')}"
        )
    return response.get('data', {}).get('output', '')


def force_dialplan_regeneration(api_client) -> None:
    """
    Force extensions.conf regeneration and Asterisk dialplan reload.

    Calls PHP to invoke ExtensionsConf::reload() directly, which
    regenerates extensions.conf from the current database state and
    reloads the Asterisk dialplan.
    """
    cmd = (
        "cd /usr/www/src && "
        "php -r \""
        "require_once 'Globals.php'; "
        "\\MikoPBX\\Core\\Asterisk\\Configs\\ExtensionsConf::reload();"
        "\""
    )
    response = api_client.post('system:executeBashCommand', {'command': cmd})
    if not response.get('result'):
        raise RuntimeError(
            f"Failed to regenerate dialplan: {response.get('messages')}"
        )


def context_exists_in_file(api_client, context_name: str) -> bool:
    """
    Check if a context section header exists in extensions.conf.

    Looks for the literal string '[<context_name>]' in the file.
    """
    content = read_extensions_conf(api_client)
    return f'[{context_name}]' in content


def context_exists_in_asterisk(api_client, context_name: str) -> bool:
    """
    Check if Asterisk has a context loaded in its dialplan memory.

    Uses 'dialplan show <context>' and checks output.
    Asterisk returns 'There is no existence of...' when context not found.
    """
    output = execute_asterisk_command(api_client, f'dialplan show {context_name}')
    if 'no existence' in output.lower() or 'no such context' in output.lower():
        return False
    return context_name in output


def wait_for_context_in_file(api_client, context_name: str,
                             should_exist: bool,
                             timeout: int = MAX_POLL_SECONDS) -> bool:
    """
    Poll extensions.conf until context appears or disappears.

    Args:
        api_client: API client
        context_name: Asterisk context name (e.g., 'SIP-XXXX-incoming')
        should_exist: True = wait until context appears, False = wait until gone
        timeout: Maximum seconds to wait

    Returns:
        True if the expected state was reached, False if timed out.
    """
    deadline = time.time() + timeout
    while time.time() < deadline:
        exists = context_exists_in_file(api_client, context_name)
        if exists == should_exist:
            return True
        time.sleep(POLL_INTERVAL)
    return False


def list_contexts(content: str) -> list[str]:
    """Extract all context names from extensions.conf content."""
    return re.findall(r'^\[([^\]]+)\]', content, re.MULTILINE)


class TestProviderDeletionDialplanCleanup:
    """
    Verifies that deleting a SIP provider removes its incoming context
    from extensions.conf without requiring any additional model changes.

    Test flow:
    1. Create a SIP provider + incoming route
    2. Force dialplan regeneration to establish baseline
    3. Verify the incoming context exists in extensions.conf
    4. Delete the provider (cascade-deletes incoming route and SIP record)
    5. Wait for automatic dialplan regeneration by WorkerModelsEvents
    6. Verify the incoming context is REMOVED from extensions.conf
    7. Verify the context is also removed from Asterisk's dialplan memory
    """

    PROVIDER_DESCRIPTION = 'Dialplan Cleanup Test Provider'
    PROVIDER_HOST = 'dialplan-cleanup-test.example.com'

    def test_01_create_provider_and_incoming_route(self, api_client):
        """
        Step 1: Create a SIP provider and an incoming route.

        The incoming route is what triggers generation of a
        [<provider-id>-incoming] context in extensions.conf.
        """
        # Create SIP provider
        sip_data = {
            'description': self.PROVIDER_DESCRIPTION,
            'host': self.PROVIDER_HOST,
            'username': 'dialplan_cleanup_test',
            'secret': 'TestCleanup12345',
            'registration_type': 'outbound',
            'port': 5060,
            'dtmfmode': 'auto',
            'qualify': False,
            'qualifyfreq': 60,
        }

        response = api_client.post('sip-providers', sip_data)
        assert_api_success(response, "Failed to create SIP provider")

        provider_id = response['data']['id']
        assert provider_id.startswith('SIP-'), (
            f"Unexpected provider ID format: {provider_id}"
        )

        self.__class__._provider_id = provider_id
        self.__class__._incoming_context = f'{provider_id}-incoming'

        print(f"\n  Created provider: {provider_id}")
        print(f"  Expected incoming context: {self._incoming_context}")

        # Create incoming route for this provider
        route_data = {
            'rulename': 'Dialplan Cleanup Test Route',
            'provider': provider_id,
            'number': '',
            'extension': '201',
            'timeout': 14,
        }

        response = api_client.post('incoming-routes', route_data)
        assert_api_success(response, "Failed to create incoming route")

        route_id = response['data']['id']
        self.__class__._route_id = route_id

        print(f"  Created incoming route: {route_id}")

    def test_02_force_regeneration_and_verify_context_exists(self, api_client):
        """
        Step 2: Force a dialplan regeneration and verify the incoming
        context appears in extensions.conf.

        We force the regeneration rather than waiting for the worker,
        because the worker timing after container restart can be
        unpredictable. The focus of this test is the DELETION behavior.
        """
        provider_id = getattr(self.__class__, '_provider_id', None)
        assert provider_id, "Provider ID not set (test_01 must run first)"

        context_name = self._incoming_context

        # Wait a moment for DB writes to be committed
        time.sleep(2)

        # Force regeneration
        print(f"\n  Forcing dialplan regeneration...")
        force_dialplan_regeneration(api_client)
        time.sleep(1)

        # Verify context exists
        exists = context_exists_in_file(api_client, context_name)

        if not exists:
            content = read_extensions_conf(api_client)
            contexts = list_contexts(content)
            print(f"\n  Context [{context_name}] not found after forced regeneration!")
            print(f"  All contexts ({len(contexts)}):")
            for ctx in contexts:
                if 'incoming' in ctx.lower():
                    print(f"    [{ctx}]  ← incoming context")
                elif 'SIP' in ctx:
                    print(f"    [{ctx}]  ← SIP context")

        assert exists, (
            f"Context [{context_name}] not found in extensions.conf "
            f"after forced dialplan regeneration.\n"
            f"  Provider {provider_id} with incoming route should produce "
            f"this context."
        )

        print(f"  OK: Context [{context_name}] found in extensions.conf")

        # Also verify in Asterisk dialplan
        loaded = context_exists_in_asterisk(api_client, context_name)
        print(f"  Asterisk dialplan loaded: {loaded}")
        assert loaded, (
            f"Context [{context_name}] exists in extensions.conf but "
            f"Asterisk didn't load it after dialplan reload."
        )

    def test_03_delete_provider(self, api_client):
        """
        Step 3: Delete the SIP provider.

        This triggers:
        - Cascade deletion of Sip record (triggers ReloadPJSIPAction + ReloadDialplanAction)
        - Cascade deletion of IncomingRoutingTable (triggers ReloadDialplanAction)

        After deletion, WorkerModelsEvents should regenerate
        extensions.conf WITHOUT the deleted provider's incoming context.
        """
        provider_id = getattr(self.__class__, '_provider_id', None)
        assert provider_id, "Provider ID not set (test_01 must run first)"

        print(f"\n  Deleting provider: {provider_id}")

        response = api_client.delete(f'sip-providers/{provider_id}')
        assert_api_success(response, f"Failed to delete SIP provider {provider_id}")

        print(f"  Provider deleted successfully")

        # Verify provider is gone from API
        try:
            check = api_client.get(f'sip-providers/{provider_id}')
            if check.get('result') is True:
                pytest.fail(
                    f"Provider {provider_id} still exists after DELETE"
                )
        except Exception:
            pass  # Expected: 404

        print(f"  Verified: provider no longer accessible via API")

    def test_04_verify_incoming_context_removed_from_file(self, api_client):
        """
        Step 4: Verify the incoming context is removed from extensions.conf.

        THIS IS THE CRITICAL ASSERTION.

        The bug: after deleting the provider, WorkerModelsEvents triggers
        ReloadDialplanAction. However, if getNewSettingsForDependentModules()
        ran BEFORE the DELETE transaction committed, SIPConf::getSettings()
        still sees the provider in the database, and the context persists.

        The fix: defer getNewSettingsForDependentModules() until AFTER the
        5-second timeout, ensuring the transaction is committed.

        We DO NOT trigger any additional model changes — the automatic
        worker reload must handle this on its own.
        """
        provider_id = getattr(self.__class__, '_provider_id', None)
        assert provider_id, "Provider ID not set (test_01 must run first)"

        context_name = self._incoming_context
        print(f"\n  Waiting for context [{context_name}] to be removed "
              f"from extensions.conf (automatic reload)...")
        print(f"  Polling every {POLL_INTERVAL}s for up to {MAX_POLL_SECONDS}s...")

        removed = wait_for_context_in_file(
            api_client, context_name, should_exist=False
        )

        if not removed:
            content = read_extensions_conf(api_client)
            if f'[{context_name}]' in content:
                start = content.index(f'[{context_name}]')
                end = content.find('\n[', start + 1)
                if end == -1:
                    end = min(start + 500, len(content))
                stale_block = content[start:end]

                print(f"\n  STALE CONTEXT FOUND IN extensions.conf:")
                print(f"  ---")
                for line in stale_block.split('\n')[:20]:
                    print(f"    {line}")
                print(f"  ---")

        assert removed, (
            f"PROVIDER DELETION DIALPLAN BUG DETECTED!\n"
            f"  Context [{context_name}] still exists in extensions.conf "
            f"after provider {provider_id} was deleted.\n"
            f"  WorkerModelsEvents did NOT clean up the incoming context "
            f"during automatic dialplan regeneration.\n"
            f"  This means the worker read stale DB state (provider still "
            f"visible) when regenerating the config."
        )

        print(f"  OK: Context [{context_name}] removed from extensions.conf")

    def test_05_verify_context_removed_from_asterisk(self, api_client):
        """
        Step 5: Verify the context is also removed from Asterisk's
        in-memory dialplan.
        """
        provider_id = getattr(self.__class__, '_provider_id', None)
        assert provider_id, "Provider ID not set (test_01 must run first)"

        context_name = self._incoming_context

        # Give Asterisk a moment after test_04 confirmed file is clean
        time.sleep(2)

        loaded = context_exists_in_asterisk(api_client, context_name)
        print(f"\n  Context [{context_name}] in Asterisk dialplan: {loaded}")

        assert not loaded, (
            f"Context [{context_name}] still loaded in Asterisk's dialplan "
            f"after provider deletion and extensions.conf cleanup.\n"
            f"  'dialplan reload' may not have been executed."
        )

        print(f"  OK: Context [{context_name}] removed from Asterisk dialplan")

    def test_06_verify_no_orphaned_incoming_routes_in_dialplan(self, api_client):
        """
        Step 6: Verify no references to the deleted provider remain
        in extensions.conf anywhere (not just as a standalone context).

        Checks that the provider ID doesn't appear in any context name
        or as an include reference.
        """
        provider_id = getattr(self.__class__, '_provider_id', None)
        assert provider_id, "Provider ID not set (test_01 must run first)"

        content = read_extensions_conf(api_client)
        if provider_id in content:
            # Find lines containing the provider ID
            lines_with_ref = []
            for i, line in enumerate(content.split('\n'), 1):
                if provider_id in line:
                    lines_with_ref.append(f"  line {i}: {line.strip()}")

            refs = '\n'.join(lines_with_ref[:10])
            pytest.fail(
                f"Provider {provider_id} still referenced in extensions.conf:\n"
                f"{refs}"
            )

        print(f"\n  OK: No references to {provider_id} in extensions.conf")

    def test_07_cleanup(self, api_client):
        """
        Step 7: Safety cleanup in case earlier tests failed.
        """
        provider_id = getattr(self.__class__, '_provider_id', None)
        route_id = getattr(self.__class__, '_route_id', None)

        if route_id:
            try:
                api_client.delete(f'incoming-routes/{route_id}')
                print(f"\n  Cleaned up route: {route_id}")
            except Exception:
                pass

        if provider_id:
            try:
                api_client.delete(f'sip-providers/{provider_id}')
                print(f"\n  Cleaned up provider: {provider_id}")
            except Exception:
                print(f"\n  Provider already deleted: {provider_id}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
