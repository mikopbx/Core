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


if __name__ == "__main__":
    pytest.main([__file__, '-v', '-s'])
