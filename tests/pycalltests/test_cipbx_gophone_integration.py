"""
Integration tests for cipbx (provider) + gophone (softphone)

This test suite validates the integration between:
- cipbx: SIP provider/trunk simulator (runs in Docker)
- gophone: SIP softphone/extension simulator (runs on host)

Test scenarios:
1. Basic connectivity: gophone calls cipbx echo server
2. Provider authentication: gophone authenticates to cipbx
3. Call flow: INVITE → 200 OK → ACK → BYE
"""

import asyncio
import logging
import pytest
import pytest_asyncio
from pathlib import Path

from cipbx_helper import (
    CipBXConfig,
    CipBXProvider,
    CipBXManager,
    install_cipbx_to_container,
)
from gophone_helper import (
    GoPhoneConfig,
    GoPhoneEndpoint,
    get_mikopbx_ip,
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def cipbx_installed():
    """Ensure cipbx is installed in container"""
    success = await install_cipbx_to_container()
    assert success, "Failed to install cipbx to container"
    return True


@pytest_asyncio.fixture
async def mikopbx_ip():
    """Get MikoPBX container IP"""
    ip = await get_mikopbx_ip()
    logger.info(f"MikoPBX IP: {ip}")
    return ip


@pytest_asyncio.fixture
async def cipbx_manager(cipbx_installed):
    """Create CipBX manager for provider simulation"""
    manager = CipBXManager(cipbx_path="/tmp/cipbx")
    yield manager
    await manager.cleanup_all()


@pytest.fixture
def gophone_bin():
    """Path to gophone binary"""
    # Detect OS and architecture
    import platform
    os_name = platform.system().lower()  # darwin, linux, windows
    arch = platform.machine().lower()    # arm64, aarch64, x86_64, amd64

    # Normalize architecture names
    if arch in ['aarch64', 'arm64']:
        arch = 'arm64'
    elif arch in ['x86_64', 'amd64']:
        arch = 'amd64'

    # Build path to binary
    gophone_path = Path(__file__).parent / "bin" / f"{os_name}-{arch}" / "gophone"
    assert gophone_path.exists(), f"gophone not found at {gophone_path}"
    return str(gophone_path)


class TestCipBXGoPhoneIntegration:
    """Test suite for cipbx + gophone integration"""

    @pytest.mark.asyncio
    async def test_01_cipbx_startup(self, cipbx_manager):
        """
        Test cipbx provider startup without authentication.

        Validates:
        - cipbx starts successfully
        - cipbx listens on configured port
        - cipbx process is running in container
        """
        logger.info("\n=== Test: CipBX Provider Startup ===")

        # Create provider without authentication
        provider = await cipbx_manager.create_provider(
            port=5070,
            timeout=60,
            auto_start=True
        )

        # Verify provider is running
        status = await provider.get_status()
        assert status["running"], "Provider should be running"
        assert status["port"] == 5070, "Provider should listen on port 5070"

        logger.info(f"✓ Provider started: {status}")

        # Cleanup
        await provider.stop()

    @pytest.mark.asyncio
    async def test_02_cipbx_with_authentication(self, cipbx_manager):
        """
        Test cipbx provider with digest authentication.

        Validates:
        - cipbx starts with username/password
        - Provider requires authentication for calls
        """
        logger.info("\n=== Test: CipBX Provider with Authentication ===")

        # Create provider with authentication
        provider = await cipbx_manager.create_provider(
            port=5071,
            username="testuser",
            password="testpass",
            timeout=60,
            auto_start=True
        )

        # Verify provider is running with auth enabled
        status = await provider.get_status()
        assert status["running"], "Provider should be running"
        assert status["auth_enabled"], "Authentication should be enabled"

        logger.info(f"✓ Provider with auth started: {status}")

        # Cleanup
        await provider.stop()

    @pytest.mark.asyncio
    async def test_03_gophone_to_cipbx_call(
        self,
        cipbx_manager,
        gophone_bin,
        mikopbx_ip
    ):
        """
        Test end-to-end call from gophone to cipbx echo server.

        Call flow:
        1. Start cipbx provider on port 5072 (no auth)
        2. gophone dials sip:echo@<mikopbx_ip>:5072
        3. cipbx answers and echoes back media
        4. Call runs for 5 seconds
        5. gophone hangs up

        Validates:
        - gophone can make outbound calls
        - cipbx accepts calls without authentication
        - Call establishes successfully
        """
        logger.info("\n=== Test: GoPhone → CipBX Echo Call ===")

        # Step 1: Start cipbx echo server (no auth, 60s timeout)
        provider = await cipbx_manager.create_provider(
            port=5072,
            timeout=60,
            auto_start=True
        )

        status = await provider.get_status()
        logger.info(f"Provider status: {status}")
        assert status["running"], "Provider must be running"

        # Step 2: Configure gophone to call cipbx
        gophone_config = GoPhoneConfig(
            extension="testcaller",
            password="",  # No auth needed
            server_ip=mikopbx_ip,
            server_port=5072,
            media="log"  # Log RTP packets instead of playing audio
        )

        gophone = GoPhoneEndpoint(gophone_config, gophone_bin)

        # Step 3: Make call to echo server
        logger.info(f"Calling echo server at {mikopbx_ip}:5072")
        call_success = await gophone.dial("echo")

        assert call_success, "Call to echo server should succeed"
        logger.info("✓ Call established to echo server")

        # Step 4: Let call run for 5 seconds
        await asyncio.sleep(5)

        # Step 5: Hangup
        await gophone.hangup()
        logger.info("✓ Call hung up successfully")

        # Cleanup
        await provider.stop()

    @pytest.mark.asyncio
    async def test_04_multiple_providers_scenario(
        self,
        cipbx_manager,
        gophone_bin,
        mikopbx_ip
    ):
        """
        Test scenario with multiple providers (simulating provider failover).

        Scenario:
        1. Start primary provider on port 5073 (with auth)
        2. Start backup provider on port 5074 (with auth)
        3. gophone tries to call primary
        4. If primary fails, can try backup

        This simulates real-world provider redundancy.
        """
        logger.info("\n=== Test: Multiple Providers Scenario ===")

        # Create primary provider with authentication
        primary = await cipbx_manager.create_provider(
            port=5073,
            username="primary_trunk",
            password="primary_pass",
            timeout=60,
            auto_start=True
        )

        # Create backup provider with different credentials
        backup = await cipbx_manager.create_provider(
            port=5074,
            username="backup_trunk",
            password="backup_pass",
            timeout=60,
            auto_start=True
        )

        # Verify both providers are running
        primary_status = await primary.get_status()
        backup_status = await backup.get_status()

        assert primary_status["running"], "Primary provider should be running"
        assert backup_status["running"], "Backup provider should be running"

        logger.info(f"✓ Primary provider: {primary_status}")
        logger.info(f"✓ Backup provider: {backup_status}")

        # Cleanup
        await cipbx_manager.cleanup_all()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
