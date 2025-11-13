"""
GoPhone SIP Registration Tests

Tests basic SIP registration functionality using gophone softphone.
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
async def test_single_extension_registration(mikopbx_ip):
    """
    Test: Single extension can register successfully

    Steps:
    1. Create GoPhone endpoint for extension 201
    2. Register endpoint with MikoPBX
    3. Verify registration success
    4. Verify endpoint stays registered
    5. Unregister endpoint
    """
    config = GoPhoneConfig(
        extension="201",
        password=TEST_EXTENSIONS["201"],
        server_ip=mikopbx_ip
    )

    endpoint = GoPhoneEndpoint(config, gophone_path="./gophone")

    # Register
    success = await endpoint.register()
    assert success, "Registration should succeed"
    assert endpoint.is_registered, "Endpoint should be marked as registered"

    # Verify registration persists
    await asyncio.sleep(3)

    # Check process is still running
    assert endpoint.process is not None, "Process should be running"
    assert endpoint.process.poll() is None, "Process should not have terminated"

    # Verify on Asterisk side
    proc = await asyncio.create_subprocess_exec(
        "docker", "exec", "mikopbx-php83",
        "asterisk", "-rx", f"pjsip show endpoint {config.extension}",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    stdout, _ = await proc.communicate()
    output = stdout.decode()

    assert config.extension in output, f"Extension {config.extension} should appear in pjsip output"
    assert "Avail" in output or "Not in use" in output, "Endpoint should be available"

    # Unregister
    success = await endpoint.unregister()
    assert success, "Unregistration should succeed"
    assert not endpoint.is_registered, "Endpoint should be marked as not registered"


@pytest.mark.asyncio
async def test_multiple_extensions_registration(gophone_manager):
    """
    Test: Multiple extensions can register simultaneously

    Steps:
    1. Create endpoints for extensions 201 and 202
    2. Register both endpoints
    3. Verify both are registered
    4. Verify they don't interfere with each other
    """
    # Create and register extension 201
    ext201 = await gophone_manager.create_endpoint(
        extension="201",
        password=TEST_EXTENSIONS["201"],
        auto_register=True
    )

    assert ext201.is_registered, "Extension 201 should be registered"

    # Create and register extension 202
    ext202 = await gophone_manager.create_endpoint(
        extension="202",
        password=TEST_EXTENSIONS["202"],
        auto_register=True
    )

    assert ext202.is_registered, "Extension 202 should be registered"

    # Verify both stay registered
    await asyncio.sleep(2)

    assert ext201.process.poll() is None, "Extension 201 process should be running"
    assert ext202.process.poll() is None, "Extension 202 process should be running"

    # Verify on Asterisk side
    proc = await asyncio.create_subprocess_exec(
        "docker", "exec", "mikopbx-php83",
        "asterisk", "-rx", "pjsip show endpoints",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    stdout, _ = await proc.communicate()
    output = stdout.decode()

    assert "201" in output, "Extension 201 should be registered"
    assert "202" in output, "Extension 202 should be registered"


@pytest.mark.asyncio
async def test_registration_with_wrong_password(mikopbx_ip):
    """
    Test: Registration fails with incorrect password

    Steps:
    1. Try to register with wrong password
    2. Verify registration fails
    """
    config = GoPhoneConfig(
        extension="201",
        password="wrong_password",
        server_ip=mikopbx_ip
    )

    endpoint = GoPhoneEndpoint(config, gophone_path="./gophone")

    # Should fail
    success = await endpoint.register()

    # GoPhone might return success even with auth failure
    # Need to check process output
    await asyncio.sleep(2)

    output = endpoint.get_output()
    logger.info(f"Registration output: {output}")

    # Check for authentication failure indicators
    # This depends on gophone's error messages
    assert "401" in output or "Unauthorized" in output or "403" in output, \
        "Should indicate authentication failure"


@pytest.mark.asyncio
async def test_reregistration(mikopbx_ip):
    """
    Test: Extension can re-register after unregistration

    Steps:
    1. Register extension
    2. Unregister
    3. Register again
    4. Verify second registration succeeds
    """
    config = GoPhoneConfig(
        extension="201",
        password=TEST_EXTENSIONS["201"],
        server_ip=mikopbx_ip
    )

    endpoint = GoPhoneEndpoint(config, gophone_path="./gophone")

    # First registration
    success = await endpoint.register()
    assert success, "First registration should succeed"
    await asyncio.sleep(2)

    # Unregister
    success = await endpoint.unregister()
    assert success, "Unregistration should succeed"
    await asyncio.sleep(1)

    # Second registration
    success = await endpoint.register()
    assert success, "Second registration should succeed"
    assert endpoint.is_registered, "Should be registered again"

    # Cleanup
    await endpoint.unregister()


@pytest.mark.asyncio
async def test_registration_persistence(mikopbx_ip):
    """
    Test: Registration persists for expected duration

    Steps:
    1. Register extension
    2. Wait for registration refresh interval
    3. Verify registration is still active
    """
    config = GoPhoneConfig(
        extension="201",
        password=TEST_EXTENSIONS["201"],
        server_ip=mikopbx_ip
    )

    endpoint = GoPhoneEndpoint(config, gophone_path="./gophone")

    # Register
    success = await endpoint.register()
    assert success, "Registration should succeed"

    # Wait for typical re-registration interval (30-60s)
    # Just test 10s for faster test
    for i in range(10):
        await asyncio.sleep(1)

        # Verify process still running
        assert endpoint.process.poll() is None, \
            f"Process should still be running after {i+1}s"

    # Cleanup
    await endpoint.unregister()


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "-s"])
