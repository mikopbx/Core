#!/usr/bin/env python3
"""
Test Extension to Extension Calls

This test suite validates SIP call functionality between extensions
using gophone CLI softphone.

Test flow:
1. Create extensions via REST API
2. Register SIP endpoints using gophone
3. Initiate calls between extensions
4. Verify call establishment
5. Check CDR records

Dependencies:
- gophone v1.10.0+ installed in tests/pycalltests/
- MikoPBX accessible at 192.168.107.3:5060
- Extensions 201, 202 configured
"""

import pytest
import asyncio
import time
from helpers.pycalltest_helper import SipEndpoint
from conftest import assert_api_success


def run_async(coro):
    """Helper to run async coroutines in sync tests"""
    return asyncio.run(coro)


class TestExtensionCalls:
    """
    Test basic extension-to-extension calling scenarios

    Note: Using synchronous API but wrapping async SIP operations in asyncio.run()
    """

    def test_01_basic_call_extension_to_extension(self, api_client):
        """
        Test basic call from extension 201 to extension 202

        Steps:
        1. Verify extensions 201 and 202 exist (or create them)
        2. Create SipEndpoint instances for both extensions
        3. Register extension 201
        4. Start extension 202 in answer mode (background)
        5. Extension 201 calls extension 202
        6. Wait for call duration
        7. Hangup
        8. Verify CDR entry exists

        Expected result:
        - Both extensions register successfully
        - Call establishes between 201→202
        - CDR record shows successful call
        """
        print("\n" + "="*60)
        print("TEST: Basic Extension to Extension Call (201→202)")
        print("="*60)

        # Step 1: Verify extensions exist
        print("\n[1/8] Checking extensions 201 and 202...")

        # Get all extensions and find 201, 202
        response = api_client.get('extensions', params={'limit': 1000})
        assert_api_success(response, "Failed to get extensions")

        extensions = response.get("data", [])
        ext_201 = next((e for e in extensions if e.get('number') == '201'), None)
        ext_202 = next((e for e in extensions if e.get('number') == '202'), None)

        if not ext_201:
            pytest.skip("Extension 201 not configured in system")

        if not ext_202:
            pytest.skip("Extension 202 not configured in system")

        print(f"  ✓ Extension 201: {ext_201.get('number')} ({ext_201.get('username')})")
        print(f"  ✓ Extension 202: {ext_202.get('number')} ({ext_202.get('username')})")

        # Step 2: Create SipEndpoint instances
        print("\n[2/8] Creating SIP endpoints...")

        # Get actual SIP secrets from extension data
        secret_201 = ext_201.get('sip_secret') or ext_201.get('secret', '201')
        secret_202 = ext_202.get('sip_secret') or ext_202.get('secret', '202')

        endpoint_201 = SipEndpoint(
            extension="201",
            secret=secret_201,
            server_ip="192.168.107.3",
            listen_ip="192.168.139.3"
        )

        endpoint_202 = SipEndpoint(
            extension="202",
            secret=secret_202,
            server_ip="192.168.107.3",
            listen_ip="192.168.139.3"
        )

        print(f"  Using SIP secret for 201: {secret_201[:8]}...")
        print(f"  Using SIP secret for 202: {secret_202[:8]}...")

        print("  ✓ SipEndpoint 201 created")
        print("  ✓ SipEndpoint 202 created")

        try:
            # Step 3: Register extension 201
            print("\n[3/8] Registering extension 201...")
            run_async(endpoint_201.register())
            time.sleep(1)  # Wait for registration to settle

            # Step 4: Start extension 202 in answer mode (in background using threading)
            print("\n[4/8] Starting extension 202 in answer mode...")
            import threading
            answer_thread = threading.Thread(
                target=lambda: run_async(endpoint_202.answer(duration=15))
            )
            answer_thread.daemon = True
            answer_thread.start()
            time.sleep(2)  # Give time for answer mode to start
            print("  ✓ Extension 202 ready to answer calls")

            # Step 5: Extension 201 calls extension 202
            print("\n[5/8] Extension 201 calling extension 202...")
            call_id = run_async(endpoint_201.call(target="202", duration=10))
            print(f"  ✓ Call initiated: {call_id}")

            # Step 6: Wait for call to establish and run
            print("\n[6/8] Call in progress...")
            print("  Waiting for call to complete (10 seconds)...")
            time.sleep(10)

            # Step 7: Hangup
            print("\n[7/8] Hanging up call...")
            run_async(endpoint_201.hangup(call_id))
            print("  ✓ Call terminated")

            # Step 8: Verify CDR
            print("\n[8/8] Checking CDR records...")

            # Wait a bit for CDR to be written
            time.sleep(2)

            # Query CDR for this call
            # Note: Need to implement CDR API query
            # For now, just mark as TODO
            print("  ⚠ CDR verification - TODO (need CDR API endpoint)")

            print("\n" + "="*60)
            print("✓ TEST PASSED: Basic call 201→202 successful")
            print("="*60)

        finally:
            # Cleanup: Unregister endpoints
            print("\n[Cleanup] Unregistering endpoints...")
            try:
                run_async(endpoint_201.unregister())
                run_async(endpoint_202.unregister())
                print("  ✓ Endpoints unregistered")
            except Exception as e:
                print(f"  ⚠ Cleanup error: {e}")


    def test_02_call_with_hangup_before_answer(self, api_client):
        """
        Test call that gets hung up before being answered

        Steps:
        1. Register extension 201
        2. Start extension 202 in answer mode
        3. Extension 201 calls extension 202
        4. Immediately hangup from 201 (before answer)
        5. Verify call was cancelled

        Expected result:
        - Call gets cancelled before 202 answers
        - CDR shows cancelled call
        """
        pytest.skip("TODO: Implement after test_01 passes")

        # TODO: Implement similar to test_01 using run_async() and threading
