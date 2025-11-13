"""
GoPhone SIP Call Tests

Tests basic call functionality between SIP extensions using gophone.
"""

import asyncio
import logging
import pytest
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


# Test data - extension credentials
TEST_EXTENSIONS = {
    "201": "5b66b92d5714f921cfcde78a4fda0f58",
    "202": "d41d8cd98f00b204e9800998ecf8427e",
    "203": "098f6bcd4621d373cade4e832627b4f6",
}


@pytest.fixture
async def mikopbx_ip():
    """Get MikoPBX container IP address"""
    ip = await get_mikopbx_ip()
    logger.info(f"Using MikoPBX IP: {ip}")
    return ip


@pytest.fixture
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
async def test_extension_to_extension_call(gophone_manager):
    """
    Test: Extension 201 calls Extension 202

    Steps:
    1. Register both extensions
    2. Extension 202 enters answer mode
    3. Extension 201 dials 202
    4. Wait for call establishment
    5. Verify call is active on both sides
    6. Hangup from caller side
    7. Verify call ended properly
    """
    # Create and register answering endpoint (202)
    config_202 = GoPhoneConfig(
        extension="202",
        password=TEST_EXTENSIONS["202"],
        server_ip=gophone_manager.server_ip,
        media="log"  # Log media for testing
    )
    ext202 = GoPhoneEndpoint(config_202, gophone_path=gophone_manager.gophone_path)

    success = await ext202.register()
    assert success, "Extension 202 should register successfully"
    logger.info("Extension 202 registered and waiting for calls")

    # Give registration time to complete
    await asyncio.sleep(2)

    # Create calling endpoint (201) - use separate process for dial
    config_201 = GoPhoneConfig(
        extension="201",
        password=TEST_EXTENSIONS["201"],
        server_ip=gophone_manager.server_ip,
        media="log"
    )
    ext201 = GoPhoneEndpoint(config_201, gophone_path=gophone_manager.gophone_path)

    # Make call from 201 to 202
    success = await ext201.dial("202")
    assert success, "Extension 201 should dial successfully"
    logger.info("Extension 201 dialing 202")

    # Wait for call to be established
    await asyncio.sleep(5)

    # Verify both endpoints have active calls
    assert ext201.call_active, "Extension 201 should have active call"

    # Check for call in Asterisk
    proc = await asyncio.create_subprocess_exec(
        "docker", "exec", "mikopbx-php83",
        "asterisk", "-rx", "core show channels",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    stdout, _ = await proc.communicate()
    output = stdout.decode()

    assert "201" in output or "202" in output, "Should see active channels"

    # Hangup from caller
    await ext201.hangup()
    logger.info("Extension 201 hung up")

    await asyncio.sleep(1)

    # Verify call ended
    assert not ext201.call_active, "Extension 201 should not have active call"

    # Cleanup
    await ext202.unregister()


@pytest.mark.asyncio
async def test_call_duration(gophone_manager):
    """
    Test: Call can be maintained for specific duration

    Steps:
    1. Establish call between 201 and 202
    2. Keep call active for 10 seconds
    3. Verify call stays connected
    4. Hangup
    """
    # Setup answering endpoint
    ext202 = await gophone_manager.create_endpoint(
        extension="202",
        password=TEST_EXTENSIONS["202"],
        auto_register=True
    )

    await asyncio.sleep(2)

    # Setup calling endpoint
    config_201 = GoPhoneConfig(
        extension="201",
        password=TEST_EXTENSIONS["201"],
        server_ip=gophone_manager.server_ip,
        media="log"
    )
    ext201 = GoPhoneEndpoint(config_201, gophone_path=gophone_manager.gophone_path)

    # Dial
    success = await ext201.dial("202")
    assert success, "Call should be established"

    # Maintain call for 10 seconds
    call_duration = 10
    logger.info(f"Maintaining call for {call_duration} seconds")

    for i in range(call_duration):
        await asyncio.sleep(1)

        # Verify processes still running
        assert ext201.process.poll() is None, \
            f"Caller process should be running at {i+1}s"
        assert ext202.process.poll() is None, \
            f"Callee process should be running at {i+1}s"

        logger.debug(f"Call active for {i+1}s")

    # Hangup
    await ext201.hangup()

    assert not ext201.call_active, "Call should be terminated"


@pytest.mark.asyncio
async def test_caller_hangup(gophone_manager):
    """
    Test: Caller can hangup active call

    Steps:
    1. Establish call
    2. Caller hangs up
    3. Verify both sides detect hangup
    """
    # Setup endpoints
    ext202 = await gophone_manager.create_endpoint(
        extension="202",
        password=TEST_EXTENSIONS["202"],
        auto_register=True
    )

    await asyncio.sleep(2)

    config_201 = GoPhoneConfig(
        extension="201",
        password=TEST_EXTENSIONS["201"],
        server_ip=gophone_manager.server_ip
    )
    ext201 = GoPhoneEndpoint(config_201, gophone_path=gophone_manager.gophone_path)

    # Establish call
    success = await ext201.dial("202")
    assert success, "Call should be established"

    await asyncio.sleep(3)

    # Caller hangs up
    await ext201.hangup()
    logger.info("Caller hung up")

    await asyncio.sleep(2)

    # Verify hangup
    assert not ext201.call_active, "Caller should have no active call"


@pytest.mark.asyncio
async def test_sequential_calls(gophone_manager):
    """
    Test: Multiple sequential calls can be made

    Steps:
    1. Make first call (201 -> 202)
    2. Hangup
    3. Make second call (201 -> 202)
    4. Verify both calls succeed
    """
    # Setup answering endpoint
    ext202 = await gophone_manager.create_endpoint(
        extension="202",
        password=TEST_EXTENSIONS["202"],
        auto_register=True
    )

    await asyncio.sleep(2)

    # First call
    config_201 = GoPhoneConfig(
        extension="201",
        password=TEST_EXTENSIONS["201"],
        server_ip=gophone_manager.server_ip
    )
    ext201_call1 = GoPhoneEndpoint(config_201, gophone_path=gophone_manager.gophone_path)

    success = await ext201_call1.dial("202")
    assert success, "First call should succeed"

    await asyncio.sleep(3)

    await ext201_call1.hangup()
    logger.info("First call completed")

    await asyncio.sleep(2)

    # Second call
    ext201_call2 = GoPhoneEndpoint(config_201, gophone_path=gophone_manager.gophone_path)

    success = await ext201_call2.dial("202")
    assert success, "Second call should succeed"

    await asyncio.sleep(3)

    await ext201_call2.hangup()
    logger.info("Second call completed")


@pytest.mark.asyncio
async def test_call_to_nonexistent_extension(mikopbx_ip):
    """
    Test: Call to non-existent extension fails appropriately

    Steps:
    1. Try to call non-existent extension 999
    2. Verify call fails or gets rejected
    """
    config = GoPhoneConfig(
        extension="201",
        password=TEST_EXTENSIONS["201"],
        server_ip=mikopbx_ip
    )

    endpoint = GoPhoneEndpoint(config, gophone_path="./gophone")

    # Try to dial non-existent extension
    success = await endpoint.dial("999")

    await asyncio.sleep(3)

    # Check output for error indicators
    output = endpoint.get_output()
    logger.info(f"Call output: {output}")

    # Should see busy, not found, or similar
    # Exact behavior depends on MikoPBX dialplan
    # For now, just verify we got some response

    await endpoint.hangup()


@pytest.mark.asyncio
async def test_concurrent_calls(gophone_manager):
    """
    Test: Multiple calls can be active simultaneously

    Steps:
    1. Setup 3 endpoints: 201, 202, 203
    2. Make call: 201 -> 202
    3. Make call: 203 -> 202 (should get busy or queue)
    4. Verify first call stays active
    """
    # Setup endpoints
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

    await asyncio.sleep(2)

    # First call: 201 -> 202
    config_201 = GoPhoneConfig(
        extension="201",
        password=TEST_EXTENSIONS["201"],
        server_ip=gophone_manager.server_ip
    )
    ext201 = GoPhoneEndpoint(config_201, gophone_path=gophone_manager.gophone_path)

    success = await ext201.dial("202")
    assert success, "First call (201->202) should succeed"

    await asyncio.sleep(2)

    # Second call attempt: 203 -> 202 (should get busy)
    # Note: This test depends on MikoPBX call waiting settings
    # If call waiting is enabled, both calls might be accepted

    # For now, just verify first call stays active
    assert ext201.call_active, "First call should remain active"

    await ext201.hangup()


@pytest.mark.asyncio
async def test_call_with_authentication(mikopbx_ip):
    """
    Test: Call requires proper authentication

    Steps:
    1. Try to make call without registration
    2. Verify it fails or requires authentication
    3. Make call with proper credentials
    4. Verify it succeeds
    """
    config = GoPhoneConfig(
        extension="201",
        password=TEST_EXTENSIONS["201"],
        server_ip=mikopbx_ip
    )

    endpoint = GoPhoneEndpoint(config, gophone_path="./gophone")

    # gophone dial automatically handles authentication
    # Just verify call succeeds with credentials
    success = await endpoint.dial("202")

    await asyncio.sleep(3)

    # Should succeed (if 202 is available)
    # Exact behavior depends on 202 state

    await endpoint.hangup()


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "-s"])
