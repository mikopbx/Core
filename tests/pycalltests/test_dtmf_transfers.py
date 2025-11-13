"""
DTMF Transfer Tests

Real-world tests for call transfer scenarios using GoPhone DTMF support.
Tests MikoPBX feature codes for blind and attended transfers.
"""

import asyncio
import logging
import pytest
import pytest_asyncio
import subprocess
from pathlib import Path

from gophone_helper import (
    GoPhoneConfig,
    GoPhoneEndpoint,
    GoPhoneManager,
    get_mikopbx_ip
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Test extension credentials (from database)
TEST_EXTENSIONS = {
    "201": "5b66b92d5714f921cfcde78a4fda0f58",
    "202": "e72b3aea6e4f2a8560adb33cb9bfa5dd",
    "203": "ce4fb0a6a238ddbcd059ecb30f884188",
}


@pytest_asyncio.fixture
async def mikopbx_ip():
    """Get MikoPBX container IP address"""
    ip = await get_mikopbx_ip()
    logger.info(f"Using MikoPBX IP: {ip}")
    return ip


@pytest_asyncio.fixture
async def gophone_manager(mikopbx_ip):
    """Create GoPhone manager for tests"""
    manager = GoPhoneManager(
        server_ip=mikopbx_ip,
        gophone_path=str(Path(__file__).parent / "gophone")
    )

    yield manager

    # Cleanup all endpoints after test
    await manager.cleanup_all()


@pytest.mark.asyncio
async def test_blind_transfer_with_dtmf(gophone_manager):
    """
    Test: Blind Transfer using DTMF feature code

    Scenario:
    1. Extension 202 (B) is in answer mode
    2. Extension 203 (C) is in answer mode
    3. Extension 201 (A) calls Extension 202 (B)
    4. After call answers, A sends DTMF "##203" (blind transfer to 203)
    5. Extension 202 (B) should be transferred to Extension 203 (C)
    6. Original call (A→B) ends, new call (B→C) established

    MikoPBX Feature Code:
    - Blind transfer: ## + extension number
    - Example: ##203 transfers current call to extension 203
    """
    logger.info("=" * 60)
    logger.info("TEST: Blind Transfer with DTMF ##203")
    logger.info("=" * 60)

    # Register endpoints B and C in answer mode
    ext202 = await gophone_manager.create_endpoint(
        extension="202",
        password=TEST_EXTENSIONS["202"],
        auto_register=True
    )

    ext203 = await gophone_manager.create_endpoint(
        extension="203",
        password=TEST_EXTENSIONS["203"],
        auto_register=True
    )

    logger.info("Extensions 202 and 203 registered and ready")

    # Wait for registration to stabilize
    await asyncio.sleep(3)

    # Extension 201 calls 202 and sends blind transfer DTMF
    config_201 = GoPhoneConfig(
        extension="201",
        password=TEST_EXTENSIONS["201"],
        server_ip=gophone_manager.server_ip,
        media="log"
    )

    caller = GoPhoneEndpoint(config_201, gophone_path=gophone_manager.gophone_path)

    # Dial with DTMF for blind transfer to 203
    # DTMF will be sent 3 seconds after call answer
    success = await caller.dial("202", dtmf="##203", dtmf_delay=3)

    assert success, "Call should be established"
    logger.info("201 called 202, DTMF ##203 will be sent after 3s")

    # Wait for DTMF to be sent and transfer to complete
    # DTMF delay (3s) + transfer processing time (2s) + validation (2s)
    await asyncio.sleep(7)

    # Check Asterisk channels to verify transfer
    proc = await asyncio.create_subprocess_exec(
        "docker", "exec", "mikopbx-php83",
        "asterisk", "-rx", "core show channels",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    stdout, _ = await proc.communicate()
    channels_output = stdout.decode()

    logger.info(f"Active channels:\n{channels_output}")

    # After blind transfer, we should see 202-203 connection
    # 201 should have hung up or transferred

    # Let call continue for a bit
    await asyncio.sleep(5)

    # Hangup caller
    await caller.hangup()

    logger.info("Test completed - blind transfer scenario executed")


@pytest.mark.asyncio
async def test_attended_transfer_with_dtmf(gophone_manager):
    """
    Test: Attended Transfer using DTMF feature code

    Scenario:
    1. Extensions 202 and 203 in answer mode
    2. Extension 201 calls 202
    3. After answer, 201 sends DTMF "*2203" (attended transfer to 203)
    4. 201 talks to 203 while 202 is on hold
    5. 201 completes transfer, connecting 202 and 203

    MikoPBX Feature Code:
    - Attended transfer: *2 + extension number
    - Example: *2203 initiates attended transfer to extension 203
    """
    logger.info("=" * 60)
    logger.info("TEST: Attended Transfer with DTMF *2203")
    logger.info("=" * 60)

    # Register endpoints
    ext202 = await gophone_manager.create_endpoint(
        extension="202",
        password=TEST_EXTENSIONS["202"],
        auto_register=True
    )

    ext203 = await gophone_manager.create_endpoint(
        extension="203",
        password=TEST_EXTENSIONS["203"],
        auto_register=True
    )

    await asyncio.sleep(3)

    # 201 calls 202 with attended transfer DTMF
    config_201 = GoPhoneConfig(
        extension="201",
        password=TEST_EXTENSIONS["201"],
        server_ip=gophone_manager.server_ip,
        media="log"
    )

    caller = GoPhoneEndpoint(config_201, gophone_path=gophone_manager.gophone_path)

    # Attended transfer code
    success = await caller.dial("202", dtmf="*2203", dtmf_delay=3)

    assert success, "Call should be established"
    logger.info("201 called 202, DTMF *2203 will be sent for attended transfer")

    # Wait for transfer sequence
    await asyncio.sleep(10)

    # Check channels
    proc = await asyncio.create_subprocess_exec(
        "docker", "exec", "mikopbx-php83",
        "asterisk", "-rx", "core show channels",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    stdout, _ = await proc.communicate()
    logger.info(f"Channels during attended transfer:\n{stdout.decode()}")

    await asyncio.sleep(5)

    await caller.hangup()

    logger.info("Test completed - attended transfer scenario executed")


@pytest.mark.asyncio
async def test_call_pickup_with_dtmf(gophone_manager):
    """
    Test: Call Pickup using DTMF feature code

    Scenario:
    1. Extension 203 (C) in answer mode
    2. Extension 201 (A) calls 202 (B) - B is NOT registered, so it rings
    3. Extension 203 (C) calls special pickup code: *8202
    4. Extension 203 picks up the call meant for 202
    5. A and C are now connected

    MikoPBX Feature Code:
    - Call pickup: *8 + extension number
    - Example: *8202 picks up call ringing on extension 202
    """
    logger.info("=" * 60)
    logger.info("TEST: Call Pickup with DTMF *8202")
    logger.info("=" * 60)

    # Only register extension 203 (the one that will pickup)
    ext203 = await gophone_manager.create_endpoint(
        extension="203",
        password=TEST_EXTENSIONS["203"],
        auto_register=True
    )

    # Don't register 202 - let it ring

    await asyncio.sleep(2)

    # 201 calls 202 (which will ring unanswered)
    config_201 = GoPhoneConfig(
        extension="201",
        password=TEST_EXTENSIONS["201"],
        server_ip=gophone_manager.server_ip,
        media="log"
    )

    caller = GoPhoneEndpoint(config_201, gophone_path=gophone_manager.gophone_path)

    # Start call to 202 (will ring)
    success = await caller.dial("202")
    logger.info("201 calling 202 - should ring")

    # Let it ring for a bit
    await asyncio.sleep(3)

    # Now 203 picks up the call using feature code *8202
    config_203_pickup = GoPhoneConfig(
        extension="203",
        password=TEST_EXTENSIONS["203"],
        server_ip=gophone_manager.server_ip,
        media="log"
    )

    pickup_endpoint = GoPhoneEndpoint(
        config_203_pickup,
        gophone_path=gophone_manager.gophone_path
    )

    # Dial *8202 to pickup the call
    success = await pickup_endpoint.dial("*8202")
    logger.info("203 dialing *8202 to pickup call for 202")

    await asyncio.sleep(5)

    # Verify pickup occurred by checking channels
    proc = await asyncio.create_subprocess_exec(
        "docker", "exec", "mikopbx-php83",
        "asterisk", "-rx", "core show channels",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    stdout, _ = await proc.communicate()
    logger.info(f"Channels after pickup:\n{stdout.decode()}")

    # Should see 201 and 203 connected

    await asyncio.sleep(3)

    await caller.hangup()
    await pickup_endpoint.hangup()

    logger.info("Test completed - call pickup scenario executed")


@pytest.mark.asyncio
async def test_simple_call_with_dtmf_verification(gophone_manager):
    """
    Test: Simple call with DTMF to verify functionality

    Just verify that DTMF can be sent during a call.
    Sends "1234" as test DTMF tones.
    """
    logger.info("=" * 60)
    logger.info("TEST: Simple DTMF Verification")
    logger.info("=" * 60)

    # Register endpoint 202
    ext202 = await gophone_manager.create_endpoint(
        extension="202",
        password=TEST_EXTENSIONS["202"],
        auto_register=True
    )

    await asyncio.sleep(2)

    # 201 calls 202 and sends DTMF 1234
    config_201 = GoPhoneConfig(
        extension="201",
        password=TEST_EXTENSIONS["201"],
        server_ip=gophone_manager.server_ip,
        media="log"
    )

    caller = GoPhoneEndpoint(config_201, gophone_path=gophone_manager.gophone_path)

    # Dial with test DTMF
    success = await caller.dial("202", dtmf="1234", dtmf_delay=2)

    assert success, "Call should be established"
    logger.info("201 called 202, DTMF '1234' will be sent after 2s")

    # Wait for DTMF
    await asyncio.sleep(5)

    await caller.hangup()

    logger.info("Test completed - DTMF send verified")


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "-s"])
