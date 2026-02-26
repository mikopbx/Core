#!/usr/bin/env python3
"""
Test 72: Attended Transfer via DTMF ##

Tests attended transfer functionality using Asterisk's feature code (##):
- Basic attended transfer: A calls B, A transfers to C via DTMF ##
- Verifies transferred call (B<->C) remains connected after transfer completes
- Reproduces bug: transfer_dial_hangup h extension calling Hangup() cascades
  and destroys the bridge between B and C

Bug scenario:
  When transferor (A) hangs up after attended transfer, the 'h' extension in
  internal-users context fires Goto(transfer_dial_hangup,h,1). The Lua handler
  calls userevent_hangup() which includes app["Hangup"]() — this cascades and
  can destroy the bridge between the remaining parties.

NOTE: These tests run INSIDE the Docker container using PJSUA2.
"""

import pytest
import pytest_asyncio
import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))
sys.path.insert(0, str(Path(__file__).parent / "helpers"))

from conftest import MikoPBXClient, get_extension_secret
from pjsua_helper import PJSUAManager, get_mikopbx_ip
from feature_codes_helper import get_feature_codes
from asterisk_helper import get_active_channels, get_bridged_channel
from ami_helper import AMIEventWatcher

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@pytest_asyncio.fixture
async def mikopbx_ip():
    """Get MikoPBX container IP address"""
    ip = await get_mikopbx_ip()
    logger.info(f"Using MikoPBX IP: {ip}")
    return ip


@pytest_asyncio.fixture
async def pjsua_manager(mikopbx_ip):
    """Create PJSUA manager for tests"""
    manager = PJSUAManager(server_ip=mikopbx_ip)
    await manager.initialize()

    yield manager

    # Cleanup all endpoints after test
    await manager.cleanup_all()


@pytest_asyncio.fixture
async def extension_credentials(api_client):
    """
    Dynamically load SIP secrets for test extensions via REST API.
    """
    extensions = ["201", "202", "203"]
    credentials = {}

    for ext in extensions:
        secret = get_extension_secret(ext, api_client)
        if secret:
            credentials[ext] = secret
            logger.info(f"Loaded credentials for extension {ext}")
        else:
            logger.warning(f"Failed to load credentials for extension {ext}")

    return credentials


def find_channels_for_extension(channels, extension):
    """Find active channels matching an extension number.

    Args:
        channels: List of channel dicts from get_active_channels()
        extension: Extension number string (e.g., '202')

    Returns:
        List of channel dicts where extension appears in channel name
    """
    return [ch for ch in channels if f'/{extension}-' in ch.get('channel', '')]


def verify_bridge_alive(ext_a, ext_b, label=""):
    """Check that two extensions are in active channels (bridged).

    Args:
        ext_a: First extension number
        ext_b: Second extension number
        label: Optional label for log messages

    Returns:
        Tuple (channels_a, channels_b) if both found, None if either missing
    """
    channels = get_active_channels()
    prefix = f"[{label}] " if label else ""

    ch_a = find_channels_for_extension(channels, ext_a)
    ch_b = find_channels_for_extension(channels, ext_b)

    if ch_a and ch_b:
        print(f"  {prefix}{ext_a} channels: {[c['channel'] for c in ch_a]}")
        print(f"  {prefix}{ext_b} channels: {[c['channel'] for c in ch_b]}")
        return ch_a, ch_b
    else:
        if not ch_a:
            print(f"  {prefix}{ext_a}: NO active channels found")
        if not ch_b:
            print(f"  {prefix}{ext_b}: NO active channels found")
        return None


@pytest.mark.asyncio
async def test_01_attended_transfer_basic(api_client, pjsua_manager, extension_credentials):
    """
    Test: Attended Transfer via DTMF ## (A->B, A transfers to C)

    Scenario:
    1. Register extensions 201, 202 (auto-answer), 203 (auto-answer)
    2. Extension 201 calls 203 - call establishes
    3. Extension 201 sends DTMF ## to initiate attended transfer
    4. Asterisk plays dialtone, 201 dials 202
    5. Extension 202 auto-answers (consultation call)
    6. Extension 201 hangs up to complete transfer
    7. Verify: 203 <-> 202 bridge stays alive for 15+ seconds
    8. Hangup remaining call

    This reproduces the bug where transfer_dial_hangup's Hangup() call
    cascades and destroys the transferred call's bridge.

    Expected:
    - Transfer completes successfully
    - 203 and 202 remain connected after 201 hangs up
    - Call does NOT drop within 0-5 seconds (the bug symptom)
    """

    print(f"\n{'='*70}")
    print(f"Test: Attended Transfer via DTMF ## (201->203, transfer to 202)")
    print(f"{'='*70}")

    # Verify credentials
    for ext in ["201", "202", "203"]:
        if ext not in extension_credentials:
            pytest.skip(f"Extension {ext} credentials not available")

    try:
        # ================================================================
        # STEP 1: Get Feature Codes
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Get Attended Transfer Feature Code")
        print(f"{'-'*70}")

        codes = get_feature_codes(api_client)
        atxfer_code = codes['attended_transfer']
        print(f"  Attended transfer code: {atxfer_code}")
        print(f"  Transfer digit timeout: {codes['transfer_digit_timeout']}s")
        print(f"  No-answer timeout: {codes['atxfer_no_answer_timeout']}s")

        # ================================================================
        # STEP 2: Register Extensions
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Register Extensions")
        print(f"{'-'*70}")

        # Register 202 and 203 first (auto-answer callees)
        ext202 = await pjsua_manager.create_endpoint(
            extension="202",
            password=extension_credentials["202"],
            auto_register=True,
            auto_answer=True
        )

        ext203 = await pjsua_manager.create_endpoint(
            extension="203",
            password=extension_credentials["203"],
            auto_register=True,
            auto_answer=True
        )

        # Register 201 (the transferor)
        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True,
            auto_answer=False
        )

        print(f"  201 registered (transferor)")
        print(f"  202 registered (transfer target, auto-answer)")
        print(f"  203 registered (original callee, auto-answer)")
        await asyncio.sleep(2)

        # ================================================================
        # STEP 3: Establish Initial Call 201 -> 203
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Establish Call 201 -> 203")
        print(f"{'-'*70}")

        success = await ext201.dial("203")
        assert success, "Failed to establish call 201 -> 203"
        print(f"  Call connected: 201 <-> 203")

        # Let the call settle
        await asyncio.sleep(3)

        # Verify initial bridge
        result = verify_bridge_alive("201", "203", "before transfer")
        assert result is not None, "Initial call 201<->203 not found in active channels"

        # ================================================================
        # STEP 4: Initiate Attended Transfer (DTMF ##)
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: Send DTMF '{atxfer_code}' to Initiate Attended Transfer")
        print(f"{'-'*70}")

        dtmf_sent = await ext201.send_dtmf(atxfer_code)
        assert dtmf_sent, f"Failed to send DTMF '{atxfer_code}'"
        print(f"  DTMF '{atxfer_code}' sent - Asterisk processing feature code...")

        # Wait for Asterisk to recognize the feature code and present dialtone
        await asyncio.sleep(3)
        print(f"  Waiting for dialtone...")

        # ================================================================
        # STEP 5: Dial Transfer Target (202)
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 5: Dial Transfer Target 202")
        print(f"{'-'*70}")

        dtmf_sent = await ext201.send_dtmf("202")
        assert dtmf_sent, "Failed to send DTMF '202'"
        print(f"  DTMF '202' sent - dialing transfer target...")

        # Wait for 202 to auto-answer and consultation call to establish
        await asyncio.sleep(5)
        print(f"  Consultation call should be active (201 <-> 202)")

        # ================================================================
        # STEP 6: Complete Transfer (201 hangs up)
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 6: Complete Transfer - 201 Hangs Up")
        print(f"{'-'*70}")
        print(f"  This triggers the bug path:")
        print(f"    h extension -> Goto(transfer_dial_hangup,h,1)")
        print(f"    -> userevent_hangup() -> app['Hangup']() cascade")

        await ext201.hangup()
        print(f"  201 hung up - transfer should complete")

        # Brief pause for Asterisk to reorganize bridges
        await asyncio.sleep(2)

        # ================================================================
        # STEP 7: Verify Transferred Call Stays Alive
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 7: Verify 203 <-> 202 Bridge Survives")
        print(f"{'-'*70}")

        # Check immediately
        result = verify_bridge_alive("202", "203", "t=0s")
        transfer_alive = result is not None

        if transfer_alive:
            print(f"  Transfer initially alive - checking stability...")
        else:
            print(f"  TRANSFER FAILED - 202<->203 bridge not found immediately")

        # The bug causes call drop within 0-5 seconds after transfer
        # Check at multiple intervals to catch the race condition
        check_intervals = [3, 5, 8, 12, 15]
        for seconds in check_intervals:
            await asyncio.sleep(seconds if seconds == check_intervals[0] else seconds - check_intervals[check_intervals.index(seconds) - 1])
            result = verify_bridge_alive("202", "203", f"t={seconds}s")
            if result is None:
                print(f"  CALL DROPPED at t={seconds}s after transfer!")
                transfer_alive = False
                break
            else:
                print(f"  t={seconds}s: bridge alive")

        # ================================================================
        # STEP 8: Cleanup
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 8: Cleanup")
        print(f"{'-'*70}")

        # Hangup remaining parties
        await ext202.hangup()
        await ext203.hangup()
        await asyncio.sleep(1)

        print(f"  All calls terminated")

        # ================================================================
        # SUMMARY
        # ================================================================
        print(f"\n{'='*70}")
        print(f"TEST RESULT")
        print(f"{'='*70}")

        if transfer_alive:
            print(f"  PASSED: 203 <-> 202 bridge survived 15+ seconds after transfer")
        else:
            print(f"  FAILED: 203 <-> 202 bridge dropped after transfer completion")

        assert transfer_alive, (
            "Attended transfer failed: 203<->202 bridge dropped after 201 hung up. "
            "This indicates the transfer_dial_hangup Hangup() cascade bug."
        )

    except Exception as e:
        print(f"\n  Test failed with error: {e}")
        raise


@pytest.mark.asyncio
async def test_02_attended_transfer_cancel(api_client, pjsua_manager, extension_credentials):
    """
    Test: Attended Transfer Cancel (A->B, A starts transfer, cancels)

    Scenario:
    1. Extension 201 calls 203 - call establishes
    2. Extension 201 sends DTMF ## to initiate attended transfer
    3. Extension 201 sends DTMF *0 to cancel the transfer
    4. Verify: 201 <-> 203 call is restored

    Expected:
    - Original call resumes after transfer cancel
    - No channels are leaked
    """

    print(f"\n{'='*70}")
    print(f"Test: Attended Transfer Cancel (201->203, cancel transfer)")
    print(f"{'='*70}")

    for ext in ["201", "203"]:
        if ext not in extension_credentials:
            pytest.skip(f"Extension {ext} credentials not available")

    try:
        codes = get_feature_codes(api_client)
        atxfer_code = codes['attended_transfer']
        abort_code = codes['transfer_abort']

        print(f"  Attended transfer: {atxfer_code}")
        print(f"  Transfer abort: {abort_code}")

        # ================================================================
        # Register Extensions
        # ================================================================
        ext203 = await pjsua_manager.create_endpoint(
            extension="203",
            password=extension_credentials["203"],
            auto_register=True,
            auto_answer=True
        )

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True,
            auto_answer=False
        )

        await asyncio.sleep(2)

        # ================================================================
        # Establish Call 201 -> 203
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"Establish Call 201 -> 203")
        print(f"{'-'*70}")

        success = await ext201.dial("203")
        assert success, "Failed to establish call 201 -> 203"
        print(f"  Call connected: 201 <-> 203")
        await asyncio.sleep(3)

        # ================================================================
        # Initiate and Cancel Transfer
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"Initiate Transfer (DTMF '{atxfer_code}') then Cancel ('{abort_code}')")
        print(f"{'-'*70}")

        dtmf_sent = await ext201.send_dtmf(atxfer_code)
        assert dtmf_sent, "Failed to send attended transfer DTMF"
        print(f"  Transfer initiated...")

        await asyncio.sleep(2)

        # Cancel the transfer
        dtmf_sent = await ext201.send_dtmf(abort_code)
        assert dtmf_sent, "Failed to send transfer abort DTMF"
        print(f"  Transfer cancelled with '{abort_code}'")

        await asyncio.sleep(3)

        # ================================================================
        # Verify Original Call Restored
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"Verify Original Call Restored")
        print(f"{'-'*70}")

        result = verify_bridge_alive("201", "203", "after cancel")
        call_restored = result is not None

        if call_restored:
            print(f"  Original call 201<->203 restored after transfer cancel")
        else:
            print(f"  WARNING: Original call not found after cancel")

        # ================================================================
        # Cleanup
        # ================================================================
        await ext201.hangup()
        await ext203.hangup()
        await asyncio.sleep(1)

        print(f"\n{'='*70}")
        if call_restored:
            print(f"  PASSED: Original call restored after transfer cancel")
        else:
            print(f"  FAILED: Original call not restored")
        print(f"{'='*70}")

        assert call_restored, "Original call should be restored after transfer cancel"

    except Exception as e:
        print(f"\n  Test failed with error: {e}")
        raise


@pytest.mark.asyncio
async def test_03_attended_transfer_no_answer(api_client, pjsua_manager, extension_credentials):
    """
    Test: Attended Transfer with No Answer from Target

    Scenario:
    1. Extension 201 calls 203 - call establishes
    2. Extension 201 sends DTMF ## and dials 202 (NOT auto-answer)
    3. Extension 202 does not answer
    4. Extension 201 hangs up the consultation attempt
    5. Verify: 201 <-> 203 original call is restored

    Expected:
    - When transfer target doesn't answer and transferor cancels,
      original call resumes
    """

    print(f"\n{'='*70}")
    print(f"Test: Attended Transfer No Answer (201->203, transfer to 202 no answer)")
    print(f"{'='*70}")

    for ext in ["201", "202", "203"]:
        if ext not in extension_credentials:
            pytest.skip(f"Extension {ext} credentials not available")

    try:
        codes = get_feature_codes(api_client)
        atxfer_code = codes['attended_transfer']
        abort_code = codes['transfer_abort']

        # ================================================================
        # Register Extensions (202 WITHOUT auto-answer)
        # ================================================================
        ext203 = await pjsua_manager.create_endpoint(
            extension="203",
            password=extension_credentials["203"],
            auto_register=True,
            auto_answer=True
        )

        ext202 = await pjsua_manager.create_endpoint(
            extension="202",
            password=extension_credentials["202"],
            auto_register=True,
            auto_answer=False  # Will NOT answer
        )

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True,
            auto_answer=False
        )

        await asyncio.sleep(2)

        # ================================================================
        # Establish Initial Call
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"Establish Call 201 -> 203")
        print(f"{'-'*70}")

        success = await ext201.dial("203")
        assert success, "Failed to establish call 201 -> 203"
        print(f"  Call connected: 201 <-> 203")
        await asyncio.sleep(3)

        # ================================================================
        # Initiate Transfer to 202 (no answer)
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"Initiate Transfer to 202 (will not answer)")
        print(f"{'-'*70}")

        dtmf_sent = await ext201.send_dtmf(atxfer_code)
        assert dtmf_sent, "Failed to send attended transfer DTMF"
        await asyncio.sleep(3)

        dtmf_sent = await ext201.send_dtmf("202")
        assert dtmf_sent, "Failed to dial transfer target"
        print(f"  Ringing 202 (no answer)...")

        # Wait a bit while 202 rings
        await asyncio.sleep(5)

        # Cancel the transfer (abort)
        print(f"  Aborting transfer with '{abort_code}'...")
        dtmf_sent = await ext201.send_dtmf(abort_code)
        assert dtmf_sent, "Failed to send transfer abort DTMF"

        await asyncio.sleep(3)

        # ================================================================
        # Verify Original Call Restored
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"Verify Original Call Restored After Failed Transfer")
        print(f"{'-'*70}")

        result = verify_bridge_alive("201", "203", "after no-answer abort")
        call_restored = result is not None

        if call_restored:
            print(f"  Original call 201<->203 restored")
        else:
            print(f"  WARNING: Original call not found")

        # ================================================================
        # Cleanup
        # ================================================================
        await ext201.hangup()
        await ext202.hangup()
        await ext203.hangup()
        await asyncio.sleep(1)

        print(f"\n{'='*70}")
        if call_restored:
            print(f"  PASSED: Call restored after failed attended transfer")
        else:
            print(f"  FAILED: Original call lost after failed transfer")
        print(f"{'='*70}")

        assert call_restored, "Original call should be restored after transfer target no-answer"

    except Exception as e:
        print(f"\n  Test failed with error: {e}")
        raise


@pytest.mark.asyncio
async def test_04_attended_transfer_via_trunk(api_client, pjsua_manager, extension_credentials):
    """
    Test: Attended Transfer of Outbound Trunk Call via DTMF ##

    Bug reproduction scenario:
    1. Create SIP provider (PJSUA2 as trunk endpoint, auto-answer)
    2. Create outbound route: 9XXXXXXX → provider
    3. Extension 201 calls 91234567 → routes through trunk → provider answers
    4. 201 initiates attended transfer to 202 (DTMF ##)
    5. 202 auto-answers (consultation call)
    6. 201 hangs up to complete transfer
    7. Expected: Provider <-> 202 bridge stays connected 15+ seconds
    8. Bug: Provider <-> 202 drops within 0-5 seconds

    The outgoing context has the same h extension → transfer_dial_hangup →
    userevent_hangup() → Hangup() cascade as internal-users. This exercises
    the bug path through a trunk call without incoming route complexity.
    """

    print(f"\n{'='*70}")
    print(f"Test: Attended Transfer via SIP Trunk (201->Provider, transfer to 202)")
    print(f"{'='*70}")

    for ext in ["201", "202"]:
        if ext not in extension_credentials:
            pytest.skip(f"Extension {ext} credentials not available")

    provider_id = None
    route_id = None
    # Unique username per test run to avoid stale AOR contacts (max_contacts=1)
    import uuid
    trunk_username = f"trk_xfer_{uuid.uuid4().hex[:8]}"

    try:
        # ================================================================
        # STEP 1: Get Feature Codes
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Get Attended Transfer Feature Code")
        print(f"{'-'*70}")

        codes = get_feature_codes(api_client)
        atxfer_code = codes['attended_transfer']
        print(f"  Attended transfer code: {atxfer_code}")

        # ================================================================
        # STEP 2: Create Inbound SIP Provider
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Create Inbound SIP Provider")
        print(f"{'-'*70}")

        provider_data = {
            "type": "sip",
            "registration_type": "inbound",
            "description": "Test Provider for Attended Transfer",
            "host": "dynamic",
            "username": trunk_username,
            "secret": f"{trunk_username}_pass",
            "transport": "udp",
            "dtmfmode": "rfc4733",
            "qualify": False
        }

        response = api_client.post("sip-providers", provider_data)
        assert response.get("result") is True, f"Failed to create SIP provider: {response.get('messages')}"
        provider_id = response["data"]["id"]
        print(f"  Created inbound SIP provider (ID: {provider_id})")

        # ================================================================
        # STEP 3: Create Outbound Route
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Create Outbound Route (9XXXXXXX -> Provider)")
        print(f"{'-'*70}")

        route_data = {
            "rulename": "Transfer Test Outbound",
            "providerid": provider_id,
            "numberbeginswith": "9",
            "restnumbers": 7,
            "trimfrombegin": 1,
            "prepend": "",
            "note": "Test attended transfer via trunk"
        }

        response = api_client.post("outbound-routes", route_data)
        assert response.get("result") is True, f"Failed to create outbound route: {response.get('messages')}"
        route_id = response["data"]["id"]
        print(f"  Created outbound route (ID: {route_id})")
        print(f"  Pattern: 9 + 7 digits -> Provider {provider_id}")

        # Wait for Asterisk to apply configuration: both dialplan route AND PJSIP endpoint
        # The outbound route appears as ExecIf(REGEX...Gosub(SIP-TRUNK-XXX-outgoing,...))
        # The PJSIP endpoint appears in 'pjsip show endpoints' output
        print(f"  Waiting for Asterisk config reload (dialplan + PJSIP)...")
        from asterisk_helper import exec_asterisk_cli
        dialplan_ready = False
        pjsip_ready = False
        for wait_sec in range(60):
            await asyncio.sleep(1)
            try:
                if not dialplan_ready:
                    dp = exec_asterisk_cli('dialplan show outgoing')
                    if 'SIP-TRUNK' in dp and 'REGEX' in dp:
                        dialplan_ready = True
                        print(f"  Dialplan route ready after {wait_sec + 1}s")
                if not pjsip_ready:
                    ep = exec_asterisk_cli('pjsip show endpoints')
                    if provider_id in ep:
                        pjsip_ready = True
                        print(f"  PJSIP endpoint ready after {wait_sec + 1}s")
                if dialplan_ready and pjsip_ready:
                    break
            except Exception:
                pass
            if wait_sec % 10 == 9:
                print(f"  Still waiting... ({wait_sec + 1}s) dp={dialplan_ready} pjsip={pjsip_ready}")
        else:
            dp = exec_asterisk_cli('dialplan show outgoing')
            ep = exec_asterisk_cli('pjsip show endpoints')
            print(f"  Dialplan ({dialplan_ready}):\n{dp[:300]}")
            print(f"  PJSIP ({pjsip_ready}):\n{ep[:300]}")
            pytest.fail(f"Config not ready after 60s: dialplan={dialplan_ready} pjsip={pjsip_ready}")

        # Extra settle time — a second config reload may still be finishing
        await asyncio.sleep(3)

        # ================================================================
        # STEP 4: Register Extensions and Provider Trunk
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: Register Extensions and Provider Trunk")
        print(f"{'-'*70}")

        # Register 202 first (transfer target, auto-answer)
        ext202 = await pjsua_manager.create_endpoint(
            extension="202",
            password=extension_credentials["202"],
            auto_register=True,
            auto_answer=True
        )
        print(f"  202 registered (transfer target, auto-answer)")

        # Register 201 (the caller/transferor)
        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True,
            auto_answer=False
        )
        print(f"  201 registered (caller/transferor)")

        # Register PJSUA2 as provider trunk (auto-answer incoming)
        provider_ep = await pjsua_manager.create_endpoint(
            extension=trunk_username,
            password=f"{trunk_username}_pass",
            auto_register=True,
            auto_answer=True
        )
        print(f"  Provider trunk registered ({trunk_username}, auto-answer)")

        await asyncio.sleep(2)

        # ================================================================
        # STEP 5: 201 Calls 91234567 (routes through provider)
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 5: 201 Calls 91234567 (routes through provider trunk)")
        print(f"{'-'*70}")

        call_success = await ext201.dial("91234567")
        assert call_success, "Call from 201 to 91234567 failed (provider didn't answer)"
        print(f"  201 connected to provider via outbound route")

        # Let the call settle
        await asyncio.sleep(3)

        # Verify initial call is up - dump all channels for debugging
        raw_channels = exec_asterisk_cli('core show channels concise')
        print(f"  Raw channels:\n{raw_channels}")
        channels = get_active_channels()
        ch_201 = find_channels_for_extension(channels, "201")
        print(f"  Parsed channels: {[(c['channel'], c['state'], c['application']) for c in channels]}")
        assert ch_201, "201 channel not found after dial"
        # The trunk side channel may be PJSIP/SIP-TRUNK-XXX or a bridged peer
        # Just verify 201 is in the provider's outgoing context
        assert any('SIP-TRUNK' in c.get('context', '') for c in ch_201), (
            f"201 not in SIP-TRUNK context: {ch_201}"
        )

        # ================================================================
        # STEP 6: 201 Sends DTMF ## to Initiate Attended Transfer
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 6: 201 Sends DTMF '{atxfer_code}' to Initiate Attended Transfer")
        print(f"{'-'*70}")

        dtmf_sent = await ext201.send_dtmf(atxfer_code)
        assert dtmf_sent, f"Failed to send DTMF '{atxfer_code}' from 201"
        print(f"  DTMF '{atxfer_code}' sent - Asterisk processing feature code...")

        # Wait for Asterisk to recognize the feature code and present dialtone
        await asyncio.sleep(3)

        # ================================================================
        # STEP 7: 201 Dials Transfer Target 202
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 7: 201 Dials Transfer Target 202")
        print(f"{'-'*70}")

        dtmf_sent = await ext201.send_dtmf("202")
        assert dtmf_sent, "Failed to send DTMF '202' from 201"
        print(f"  DTMF '202' sent - dialing transfer target...")

        # Wait for 202 to auto-answer and consultation call to establish
        await asyncio.sleep(5)
        print(f"  Consultation call should be active (201 <-> 202)")

        # ================================================================
        # STEP 8: Complete Transfer - 201 Hangs Up
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 8: Complete Transfer - 201 Hangs Up")
        print(f"{'-'*70}")
        print(f"  This triggers the bug path:")
        print(f"    h extension in outgoing -> Goto(transfer_dial_hangup,h,1)")
        print(f"    -> userevent_hangup() -> app['Hangup']() cascade")

        await ext201.hangup()
        print(f"  201 hung up - transfer should complete")

        # Brief pause for Asterisk to reorganize bridges
        await asyncio.sleep(2)

        # ================================================================
        # STEP 9: Verify Transferred Call (Provider <-> 202) Stays Alive
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 9: Verify Provider <-> 202 Bridge Survives")
        print(f"{'-'*70}")

        # Check immediately - look for 202 bridged with any non-201 channel
        def check_trunk_bridge(label=""):
            """Check that 202 and provider are both in active channels after transfer."""
            channels = get_active_channels()
            prefix = f"[{label}] " if label else ""
            ch_202 = find_channels_for_extension(channels, "202")
            # After transfer, 201 should be gone; any other channel is the trunk
            ch_other = [ch for ch in channels if '/202-' not in ch.get('channel', '')
                        and '/201-' not in ch.get('channel', '')]
            if ch_202 and ch_other:
                print(f"  {prefix}202 channels: {[c['channel'] for c in ch_202]}")
                print(f"  {prefix}other channels: {[c['channel'] for c in ch_other]}")
                return True
            if not ch_202:
                print(f"  {prefix}202: NO active channels found")
            if not ch_other:
                print(f"  {prefix}No trunk/other channels found")
            print(f"  {prefix}All channels: {[(c['channel'], c['state']) for c in channels]}")
            return False

        transfer_alive = check_trunk_bridge("t=0s")

        if transfer_alive:
            print(f"  Transfer initially alive - checking stability...")
        else:
            channels = get_active_channels()
            print(f"  TRANSFER FAILED - bridge not found immediately!")
            print(f"  Active channels: {[c['channel'] for c in channels]}")

        # The bug causes call drop within 0-5 seconds after transfer
        if transfer_alive:
            check_intervals = [3, 5, 8, 12, 15]
            for seconds in check_intervals:
                wait_time = seconds if seconds == check_intervals[0] else seconds - check_intervals[check_intervals.index(seconds) - 1]
                await asyncio.sleep(wait_time)
                if not check_trunk_bridge(f"t={seconds}s"):
                    print(f"  CALL DROPPED at t={seconds}s after transfer!")
                    channels = get_active_channels()
                    print(f"  Remaining channels: {[c['channel'] for c in channels]}")
                    transfer_alive = False
                    break
                else:
                    print(f"  t={seconds}s: bridge alive")

        # ================================================================
        # STEP 10: Cleanup
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 10: Cleanup")
        print(f"{'-'*70}")

        await provider_ep.hangup()
        await ext202.hangup()
        await asyncio.sleep(1)
        print(f"  All calls terminated")

        # ================================================================
        # SUMMARY
        # ================================================================
        print(f"\n{'='*70}")
        print(f"TEST RESULT")
        print(f"{'='*70}")

        if transfer_alive:
            print(f"  PASSED: Provider <-> 202 bridge survived 15+ seconds after transfer")
        else:
            print(f"  FAILED: Provider <-> 202 bridge dropped after transfer completion")
            print(f"  This confirms the attended transfer call drop bug via SIP trunk")

        assert transfer_alive, (
            "Attended transfer via trunk failed: Provider<->202 bridge dropped after "
            "201 hung up. This indicates the transfer_dial_hangup Hangup() cascade "
            "and/or StopMixMonitor race condition bug."
        )

    except Exception as e:
        print(f"\n  Test failed with error: {e}")
        raise

    finally:
        print(f"\nCleaning up test resources...")
        if route_id:
            try:
                api_client.delete(f"outbound-routes/{route_id}")
                print(f"  Deleted outbound route {route_id}")
            except Exception as e:
                print(f"  Warning: Failed to delete route: {e}")
        if provider_id:
            try:
                api_client.delete(f"sip-providers/{provider_id}")
                print(f"  Deleted provider {provider_id}")
            except Exception as e:
                print(f"  Warning: Failed to delete provider: {e}")


@pytest.mark.asyncio
async def test_05_attended_transfer_cti_race(api_client, pjsua_manager, extension_credentials):
    """
    Test: Attended Transfer with CTI AMI Race Condition (Internal Call)

    Reproduces the production bug where an external CTI module (cti_amid_client)
    sends AMI Hangup on the transferor's channel within milliseconds of the
    AttendedTransfer event. This races with Asterisk's bridge reorganization
    and causes the transferred call to drop.

    Scenario:
    1. Start AMI watcher that simulates cti_amid_client
    2. Extension 201 calls 203 (auto-answer)
    3. 201 sends DTMF ## to initiate attended transfer
    4. 201 dials 202 (auto-answer, consultation call)
    5. 201 hangs up to complete the transfer
    6. AMI watcher detects AttendedTransfer and immediately sends Hangup on 201
    7. This races with bridge reorganization (203<->202)

    Expected BEFORE fix: Bridge 203<->202 drops within 0-5 seconds (bug confirmed)
    Expected AFTER fix: Bridge 203<->202 survives 15+ seconds (bug fixed)
    """

    print(f"\n{'='*70}")
    print(f"Test: CTI Race Condition — Internal Attended Transfer")
    print(f"  Simulates cti_amid_client sending Hangup during bridge swap")
    print(f"{'='*70}")

    for ext in ["201", "202", "203"]:
        if ext not in extension_credentials:
            pytest.skip(f"Extension {ext} credentials not available")

    ami_watcher = AMIEventWatcher()

    try:
        # ================================================================
        # STEP 1: Start AMI Watcher + Get Feature Codes
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Start AMI Watcher and Get Feature Codes")
        print(f"{'-'*70}")

        await ami_watcher.start()
        print(f"  AMI watcher connected (simulating cti_amid_client)")

        codes = get_feature_codes(api_client)
        atxfer_code = codes['attended_transfer']
        print(f"  Attended transfer code: {atxfer_code}")

        # ================================================================
        # STEP 2: Register Extensions
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Register Extensions")
        print(f"{'-'*70}")

        ext202 = await pjsua_manager.create_endpoint(
            extension="202",
            password=extension_credentials["202"],
            auto_register=True,
            auto_answer=True
        )

        ext203 = await pjsua_manager.create_endpoint(
            extension="203",
            password=extension_credentials["203"],
            auto_register=True,
            auto_answer=True
        )

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True,
            auto_answer=False
        )

        print(f"  201 registered (transferor)")
        print(f"  202 registered (transfer target, auto-answer)")
        print(f"  203 registered (original callee, auto-answer)")
        await asyncio.sleep(2)

        # ================================================================
        # STEP 3: Establish Initial Call 201 -> 203
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Establish Call 201 -> 203")
        print(f"{'-'*70}")

        success = await ext201.dial("203")
        assert success, "Failed to establish call 201 -> 203"
        print(f"  Call connected: 201 <-> 203")
        await asyncio.sleep(3)

        result = verify_bridge_alive("201", "203", "before transfer")
        assert result is not None, "Initial call 201<->203 not found"

        # ================================================================
        # STEP 4-6: Transfer with AMI Watcher Active
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: Attended Transfer with CTI Race Simulation")
        print(f"{'-'*70}")
        print(f"  AMI watcher will send Hangup on 201 when AttendedTransfer fires")

        async with ami_watcher.hangup_on_attended_transfer() as ctx:
            # Initiate transfer
            dtmf_sent = await ext201.send_dtmf(atxfer_code)
            assert dtmf_sent, "Failed to send DTMF for attended transfer"
            print(f"  DTMF '{atxfer_code}' sent...")
            await asyncio.sleep(3)

            # Dial transfer target
            dtmf_sent = await ext201.send_dtmf("202")
            assert dtmf_sent, "Failed to dial transfer target 202"
            print(f"  DTMF '202' sent — dialing transfer target...")
            await asyncio.sleep(5)

            # Complete transfer — 201 hangs up
            print(f"  201 hanging up to complete transfer...")
            await ext201.hangup()
            print(f"  201 hung up — transfer completing, AMI watcher armed")

            # Wait for the AttendedTransfer event and Hangup to fire
            await asyncio.sleep(3)

        # ================================================================
        # STEP 5: Report AMI Watcher Results
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 5: AMI Watcher Results")
        print(f"{'-'*70}")

        if ctx.hangup_sent:
            print(f"  Hangup SENT on channel: {ctx.hangup_channel}")
            print(f"  Race delay: {ctx.race_delay_ms:.1f}ms after AttendedTransfer")
            print(f"  Transfer Result: {ctx.transfer_event.get('Result')}")
        else:
            print(f"  WARNING: AMI watcher did NOT detect AttendedTransfer event")
            print(f"  This may mean the transfer didn't complete via feature code")

        # ================================================================
        # STEP 6: Verify Bridge Survival
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 6: Verify 203 <-> 202 Bridge Survival")
        print(f"{'-'*70}")

        result = verify_bridge_alive("202", "203", "t=0s")
        transfer_alive = result is not None

        if transfer_alive:
            print(f"  Transfer initially alive — checking stability...")
            check_intervals = [3, 5, 8, 12, 15]
            for seconds in check_intervals:
                wait_time = seconds if seconds == check_intervals[0] else seconds - check_intervals[check_intervals.index(seconds) - 1]
                await asyncio.sleep(wait_time)
                result = verify_bridge_alive("202", "203", f"t={seconds}s")
                if result is None:
                    print(f"  CALL DROPPED at t={seconds}s after transfer!")
                    transfer_alive = False
                    break
                else:
                    print(f"  t={seconds}s: bridge alive")
        else:
            print(f"  Bridge NOT found immediately after transfer")

        # ================================================================
        # Cleanup
        # ================================================================
        await ext202.hangup()
        await ext203.hangup()
        await asyncio.sleep(1)

        # ================================================================
        # SUMMARY
        # ================================================================
        print(f"\n{'='*70}")
        print(f"TEST RESULT — CTI Race Condition (Internal)")
        print(f"{'='*70}")

        if ctx.hangup_sent:
            print(f"  AMI Hangup: sent {ctx.race_delay_ms:.1f}ms after AttendedTransfer")

        if transfer_alive:
            print(f"  PASSED: 203 <-> 202 bridge survived 15+ seconds")
            print(f"  (Bug is FIXED — CTI race no longer kills the bridge)")
        else:
            print(f"  FAILED: 203 <-> 202 bridge dropped after transfer")
            if ctx.hangup_sent:
                print(f"  (Bug REPRODUCED — CTI AMI Hangup caused bridge collapse)")
            else:
                print(f"  (Bridge dropped even without CTI Hangup)")

        assert transfer_alive, (
            "Attended transfer with CTI race condition failed: 203<->202 bridge dropped. "
            f"AMI Hangup sent: {ctx.hangup_sent}, "
            f"delay: {ctx.race_delay_ms:.1f}ms. "
            "This confirms the cti_amid_client race condition bug."
        )

    except Exception as e:
        print(f"\n  Test failed with error: {e}")
        raise

    finally:
        await ami_watcher.stop()


@pytest.mark.asyncio
async def test_06_attended_transfer_trunk_cti_race(api_client, pjsua_manager, extension_credentials):
    """
    Test: Attended Transfer of Trunk Call with CTI AMI Race Condition

    Exact reproduction of the user-reported bug scenario:
    1. Incoming/outgoing trunk call to 201
    2. 201 attended-transfers to 202
    3. cti_amid_client sends Hangup on 201 within 15ms of AttendedTransfer
    4. Bridge between trunk and 202 collapses

    Uses PJSUA2 registered as SIP provider trunk (inbound registration).

    Expected BEFORE fix: Provider<->202 bridge drops within 0-5 seconds
    Expected AFTER fix: Provider<->202 bridge survives 15+ seconds
    """

    print(f"\n{'='*70}")
    print(f"Test: CTI Race Condition — Trunk Attended Transfer")
    print(f"  Exact reproduction of user-reported bug scenario")
    print(f"{'='*70}")

    for ext in ["201", "202"]:
        if ext not in extension_credentials:
            pytest.skip(f"Extension {ext} credentials not available")

    provider_id = None
    route_id = None
    import uuid
    trunk_username = f"trk_cti_{uuid.uuid4().hex[:8]}"

    ami_watcher = AMIEventWatcher()

    try:
        # ================================================================
        # STEP 1: Get Feature Codes + Start AMI Watcher
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Setup")
        print(f"{'-'*70}")

        codes = get_feature_codes(api_client)
        atxfer_code = codes['attended_transfer']
        print(f"  Attended transfer code: {atxfer_code}")

        await ami_watcher.start()
        print(f"  AMI watcher connected (simulating cti_amid_client)")

        # ================================================================
        # STEP 2: Create Inbound SIP Provider
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Create Inbound SIP Provider")
        print(f"{'-'*70}")

        provider_data = {
            "type": "sip",
            "registration_type": "inbound",
            "description": "CTI Race Test Provider",
            "host": "dynamic",
            "username": trunk_username,
            "secret": f"{trunk_username}_pass",
            "transport": "udp",
            "dtmfmode": "rfc4733",
            "qualify": False
        }

        response = api_client.post("sip-providers", provider_data)
        assert response.get("result") is True, f"Failed to create SIP provider: {response.get('messages')}"
        provider_id = response["data"]["id"]
        print(f"  Created inbound SIP provider (ID: {provider_id})")

        # ================================================================
        # STEP 3: Create Outbound Route
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Create Outbound Route (8XXXXXXX -> Provider)")
        print(f"{'-'*70}")

        route_data = {
            "rulename": "CTI Race Test Outbound",
            "providerid": provider_id,
            "numberbeginswith": "8",
            "restnumbers": 7,
            "trimfrombegin": 1,
            "prepend": "",
            "note": "Test CTI race condition via trunk"
        }

        response = api_client.post("outbound-routes", route_data)
        assert response.get("result") is True, f"Failed to create outbound route: {response.get('messages')}"
        route_id = response["data"]["id"]
        print(f"  Created outbound route (ID: {route_id})")

        # Wait for Asterisk config reload
        print(f"  Waiting for Asterisk config reload...")
        from asterisk_helper import exec_asterisk_cli
        dialplan_ready = False
        pjsip_ready = False
        for wait_sec in range(60):
            await asyncio.sleep(1)
            try:
                if not dialplan_ready:
                    dp = exec_asterisk_cli('dialplan show outgoing')
                    if 'SIP-TRUNK' in dp and 'REGEX' in dp:
                        dialplan_ready = True
                        print(f"  Dialplan route ready after {wait_sec + 1}s")
                if not pjsip_ready:
                    ep = exec_asterisk_cli('pjsip show endpoints')
                    if provider_id in ep:
                        pjsip_ready = True
                        print(f"  PJSIP endpoint ready after {wait_sec + 1}s")
                if dialplan_ready and pjsip_ready:
                    break
            except Exception:
                pass
            if wait_sec % 10 == 9:
                print(f"  Still waiting... ({wait_sec + 1}s) dp={dialplan_ready} pjsip={pjsip_ready}")
        else:
            pytest.fail(f"Config not ready after 60s: dialplan={dialplan_ready} pjsip={pjsip_ready}")

        await asyncio.sleep(3)

        # ================================================================
        # STEP 4: Register Extensions and Provider Trunk
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: Register Extensions and Provider Trunk")
        print(f"{'-'*70}")

        ext202 = await pjsua_manager.create_endpoint(
            extension="202",
            password=extension_credentials["202"],
            auto_register=True,
            auto_answer=True
        )
        print(f"  202 registered (transfer target, auto-answer)")

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True,
            auto_answer=False
        )
        print(f"  201 registered (caller/transferor)")

        provider_ep = await pjsua_manager.create_endpoint(
            extension=trunk_username,
            password=f"{trunk_username}_pass",
            auto_register=True,
            auto_answer=True
        )
        print(f"  Provider trunk registered ({trunk_username}, auto-answer)")

        await asyncio.sleep(2)

        # ================================================================
        # STEP 5: 201 Calls Through Trunk
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 5: 201 Calls 81234567 (routes through provider trunk)")
        print(f"{'-'*70}")

        call_success = await ext201.dial("81234567")
        assert call_success, "Call from 201 to 81234567 failed"
        print(f"  201 connected to provider via outbound route")
        await asyncio.sleep(3)

        # Verify initial call
        raw_channels = exec_asterisk_cli('core show channels concise')
        print(f"  Raw channels:\n{raw_channels}")
        channels = get_active_channels()
        ch_201 = find_channels_for_extension(channels, "201")
        assert ch_201, "201 channel not found after dial"

        # ================================================================
        # STEP 6-8: Transfer with AMI Watcher Active
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 6: Attended Transfer with CTI Race Simulation")
        print(f"{'-'*70}")
        print(f"  AMI watcher will send Hangup on 201 when AttendedTransfer fires")

        async with ami_watcher.hangup_on_attended_transfer() as ctx:
            # Initiate transfer
            dtmf_sent = await ext201.send_dtmf(atxfer_code)
            assert dtmf_sent, "Failed to send DTMF for attended transfer"
            print(f"  DTMF '{atxfer_code}' sent...")
            await asyncio.sleep(3)

            # Dial transfer target
            dtmf_sent = await ext201.send_dtmf("202")
            assert dtmf_sent, "Failed to dial transfer target 202"
            print(f"  DTMF '202' sent — dialing transfer target...")
            await asyncio.sleep(5)

            # Complete transfer
            print(f"  201 hanging up to complete transfer...")
            await ext201.hangup()
            print(f"  201 hung up — transfer completing, AMI watcher armed")

            # Wait for events to fire
            await asyncio.sleep(3)

        # ================================================================
        # STEP 7: Report AMI Watcher Results
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 7: AMI Watcher Results")
        print(f"{'-'*70}")

        if ctx.hangup_sent:
            print(f"  Hangup SENT on channel: {ctx.hangup_channel}")
            print(f"  Race delay: {ctx.race_delay_ms:.1f}ms after AttendedTransfer")
        else:
            print(f"  WARNING: AMI watcher did NOT detect AttendedTransfer event")

        # ================================================================
        # STEP 8: Verify Bridge Survival
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 8: Verify Provider <-> 202 Bridge Survival")
        print(f"{'-'*70}")

        def check_trunk_bridge(label=""):
            """Check that 202 and provider are both in active channels."""
            channels = get_active_channels()
            prefix = f"[{label}] " if label else ""
            ch_202 = find_channels_for_extension(channels, "202")
            ch_other = [ch for ch in channels if '/202-' not in ch.get('channel', '')
                        and '/201-' not in ch.get('channel', '')]
            if ch_202 and ch_other:
                print(f"  {prefix}202 channels: {[c['channel'] for c in ch_202]}")
                print(f"  {prefix}other channels: {[c['channel'] for c in ch_other]}")
                return True
            if not ch_202:
                print(f"  {prefix}202: NO active channels found")
            if not ch_other:
                print(f"  {prefix}No trunk/other channels found")
            print(f"  {prefix}All channels: {[(c['channel'], c['state']) for c in channels]}")
            return False

        transfer_alive = check_trunk_bridge("t=0s")

        if transfer_alive:
            print(f"  Transfer initially alive — checking stability...")
            check_intervals = [3, 5, 8, 12, 15]
            for seconds in check_intervals:
                wait_time = seconds if seconds == check_intervals[0] else seconds - check_intervals[check_intervals.index(seconds) - 1]
                await asyncio.sleep(wait_time)
                if not check_trunk_bridge(f"t={seconds}s"):
                    print(f"  CALL DROPPED at t={seconds}s after transfer!")
                    transfer_alive = False
                    break
                else:
                    print(f"  t={seconds}s: bridge alive")
        else:
            print(f"  Bridge NOT found immediately after transfer")

        # ================================================================
        # Cleanup
        # ================================================================
        await provider_ep.hangup()
        await ext202.hangup()
        await asyncio.sleep(1)

        # ================================================================
        # SUMMARY
        # ================================================================
        print(f"\n{'='*70}")
        print(f"TEST RESULT — CTI Race Condition (Trunk)")
        print(f"{'='*70}")

        if ctx.hangup_sent:
            print(f"  AMI Hangup: sent {ctx.race_delay_ms:.1f}ms after AttendedTransfer")

        if transfer_alive:
            print(f"  PASSED: Provider <-> 202 bridge survived 15+ seconds")
            print(f"  (Bug is FIXED — CTI race no longer kills trunk bridge)")
        else:
            print(f"  FAILED: Provider <-> 202 bridge dropped after transfer")
            if ctx.hangup_sent:
                print(f"  (Bug REPRODUCED — exact match of user-reported scenario)")
            else:
                print(f"  (Bridge dropped even without CTI Hangup)")

        assert transfer_alive, (
            "Attended transfer via trunk with CTI race failed: Provider<->202 bridge dropped. "
            f"AMI Hangup sent: {ctx.hangup_sent}, "
            f"delay: {ctx.race_delay_ms:.1f}ms. "
            "This confirms the user-reported attended transfer call drop bug."
        )

    except Exception as e:
        print(f"\n  Test failed with error: {e}")
        raise

    finally:
        await ami_watcher.stop()
        print(f"\nCleaning up test resources...")
        if route_id:
            try:
                api_client.delete(f"outbound-routes/{route_id}")
                print(f"  Deleted outbound route {route_id}")
            except Exception as e:
                print(f"  Warning: Failed to delete route: {e}")
        if provider_id:
            try:
                api_client.delete(f"sip-providers/{provider_id}")
                print(f"  Deleted provider {provider_id}")
            except Exception as e:
                print(f"  Warning: Failed to delete provider: {e}")


if __name__ == "__main__":
    pytest.main([__file__, '-v', '-s'])
