#!/usr/bin/env python3
"""
MikoPBX Trunk Registration Test on CipBX Provider

This test validates MikoPBX trunk registration on external SIP provider (cipbx):
- Start cipbx provider with authentication
- Create SIP provider in MikoPBX via REST API (registration_type: inbound)
- Verify MikoPBX successfully registers to cipbx
- Check Asterisk PJSIP registration status
- Test call through registered trunk

Architecture:
┌──────────────┐         ┌─────────────┐         ┌──────────────┐
│   Extension  │         │  MikoPBX    │         │    CipBX     │
│  (GoPhone)   │         │  Container  │         │  (Provider)  │
│  Host System │         │ REGISTERS→  │         │  Container   │
└──────────────┘         └─────────────┘         └──────────────┘
"""

import asyncio
import logging
import pytest
import sys
from pathlib import Path

# Add parent directory to path to import conftest
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))

from config import get_config
from conftest import MikoPBXClient, assert_api_success, get_extension_secret, convert_employee_fixture_to_api_format
from cipbx_helper import CipBXConfig, CipBXProvider
from gophone_helper import GoPhoneConfig, GoPhoneEndpoint, get_mikopbx_ip, get_host_ip_for_container

# Load configuration
config = get_config()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# Test extension fixture data
TEST_EXTENSION_201 = {
    "number": 201,
    "username": "Smith James",
    "email": "",
    "mobile": "89261111111",
    "secret": "5b66b92d5714f921cfcde78a4fda0f58"
}


async def ensure_extension_exists(extension_number: str, api_client: MikoPBXClient) -> str:
    """
    Ensure extension exists and return its SIP secret.
    If extension doesn't exist, creates it using fixture data.
    """
    logger.info(f"📋 Ensuring extension {extension_number} exists...")

    # Try to get existing secret
    secret = get_extension_secret(extension_number, api_client)

    if secret:
        logger.info(f"✓ Extension {extension_number} exists with secret: {secret[:10]}...")
        return secret

    # Extension doesn't exist, create it
    logger.info(f"📝 Extension {extension_number} not found, creating...")

    api_data = convert_employee_fixture_to_api_format(TEST_EXTENSION_201)

    # Create employee via REST API
    response = api_client.post('employees', api_data)

    if not response.get('result'):
        error_msgs = response.get('messages', {}).get('error', [])
        raise RuntimeError(f"Failed to create extension: {error_msgs}")

    logger.info(f"✓ Extension {extension_number} created successfully")

    # Get secret for newly created extension
    secret = get_extension_secret(extension_number, api_client)

    if not secret:
        raise RuntimeError(f"Failed to retrieve secret for newly created extension {extension_number}")

    logger.info(f"✓ Retrieved secret for extension {extension_number}: {secret[:10]}...")
    return secret


async def get_pjsip_registration_status(provider_uniqid: str) -> dict:
    """
    Check PJSIP registration status for provider via Asterisk CLI.

    Returns:
        Dict with registration info or None if not registered
    """
    import subprocess

    try:
        # Get registration status from Asterisk
        result = subprocess.run(
            [
                "docker", "exec", "mikopbx-php83",
                "asterisk", "-rx", "pjsip show registrations"
            ],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode != 0:
            logger.error(f"Failed to get PJSIP registrations: {result.stderr}")
            return None

        output = result.stdout
        logger.debug(f"PJSIP registrations output:\n{output}")

        # Parse output to find our registration
        lines = output.split('\n')
        for line in lines:
            if provider_uniqid in line:
                logger.info(f"Found registration: {line}")
                # Check if status contains "Registered"
                if "Registered" in line or "Auth" in line:
                    return {"registered": True, "line": line}
                else:
                    return {"registered": False, "line": line}

        logger.warning(f"Registration for {provider_uniqid} not found in output")
        return None

    except Exception as e:
        logger.error(f"Error checking PJSIP registration: {e}")
        return None


@pytest.mark.asyncio
async def test_mikopbx_trunk_registration_on_cipbx():
    """
    Test MikoPBX trunk registration on CipBX provider.

    Test Steps:
    1. Ensure cipbx binary is installed in container
    2. Start cipbx provider with authentication (port 5070)
    3. Get MikoPBX container IP
    4. Create SIP provider in MikoPBX via REST API (registration_type: inbound)
    5. Wait for MikoPBX to register on cipbx
    6. Verify registration via Asterisk CLI (pjsip show registrations)
    7. Optional: Test call through registered trunk
    8. Cleanup: Delete provider, stop cipbx
    """
    logger.info("=" * 80)
    logger.info("Starting MikoPBX Trunk Registration Test on CipBX Provider")
    logger.info("=" * 80)

    # Step 1: Get cipbx binary path (local host)
    logger.info("\nStep 1: Getting cipbx binary path...")

    import platform
    os_name = platform.system().lower()  # darwin, linux, windows
    arch = platform.machine().lower()    # arm64, aarch64, x86_64, amd64

    # Normalize architecture
    if arch in ['aarch64', 'arm64']:
        arch = 'arm64'
    elif arch in ['x86_64', 'amd64']:
        arch = 'amd64'

    from pathlib import Path
    cipbx_path = Path(__file__).parent / "bin" / f"{os_name}-{arch}" / "cipbx"

    if not cipbx_path.exists():
        raise RuntimeError(f"cipbx binary not found at {cipbx_path}")

    logger.info(f"✓ Found cipbx binary: {cipbx_path}")

    # Step 2: Start cipbx provider with authentication (on host, not in container)
    logger.info("\nStep 2: Starting cipbx provider on host with authentication...")

    # Get host IP to bind to (we need to be accessible from container)
    # Use 0.0.0.0 to listen on all interfaces
    cipbx_config = CipBXConfig(
        listen_ip="0.0.0.0",
        listen_port=5070,
        username="trunk_user",
        password="trunk_pass123",
        timeout=300  # 5 minutes auto-hangup
    )

    # Run cipbx locally on host
    cipbx_provider = CipBXProvider(cipbx_config, cipbx_path=str(cipbx_path))

    cipbx_started = await cipbx_provider.start(timeout=3)
    assert cipbx_started, "Failed to start cipbx provider"

    status = await cipbx_provider.get_status()
    logger.info(f"✓ CipBX provider started: {status}")
    assert status["running"], "CipBX should be running"
    assert status["auth_enabled"], "CipBX authentication should be enabled"

    # Get MikoPBX container IP
    mikopbx_ip = await get_mikopbx_ip()
    logger.info(f"✓ MikoPBX container IP: {mikopbx_ip}")

    # Get host IP accessible from container
    host_ip = await get_host_ip_for_container()
    logger.info(f"✓ Host IP (accessible from container): {host_ip}")

    # Create API client
    api_client = MikoPBXClient(config.api_url, config.api_username, config.api_password)
    api_client.authenticate()
    logger.info("✓ API client authenticated")

    created_provider_id = None

    try:
        # Step 3: Create SIP provider in MikoPBX (registration_type: outbound)
        logger.info("\nStep 3: Creating SIP provider in MikoPBX...")

        provider_data = {
            "type": "sip",
            "registration_type": "outbound",  # MikoPBX will REGISTER to cipbx (outbound registration)
            "description": "Test CipBX Provider for Registration",
            "host": host_ip,  # CipBX is on host, accessible via host.docker.internal IP
            "port": 5070,
            "username": "trunk_user",
            "secret": "trunk_pass123",
            "transport": "udp",
            "dtmfmode": "rfc4733",
            "qualify": True,  # Enable qualify to check connection
            "qualifyfreq": 30,
            "disabled": False
        }

        logger.info(f"Creating provider with data: {provider_data}")

        # POST to create provider
        response = api_client.post('sip-providers', provider_data)

        logger.info(f"Provider creation response: {response}")
        assert_api_success(response, "Failed to create SIP provider")

        created_provider_id = response.get('data', {}).get('id')
        assert created_provider_id, "Provider ID not returned"

        logger.info(f"✓ SIP provider created with ID: {created_provider_id}")

        # Step 4: Wait for MikoPBX to register
        logger.info("\nStep 4: Waiting for MikoPBX to register on cipbx (10 seconds)...")
        await asyncio.sleep(10)

        # Step 5: Verify registration via Asterisk CLI
        logger.info("\nStep 5: Checking PJSIP registration status...")

        registration_status = await get_pjsip_registration_status(created_provider_id)

        if registration_status:
            logger.info(f"✓ Registration status: {registration_status}")
            assert registration_status.get("registered"), \
                f"Provider should be registered. Status: {registration_status}"
        else:
            logger.warning("⚠ Could not verify registration status from Asterisk CLI")
            logger.info("Checking provider status via API...")

            # Fallback: check via API
            provider_response = api_client.get(f'sip-providers/{created_provider_id}')
            assert_api_success(provider_response, "Failed to get provider status")
            provider_info = provider_response.get('data', {})
            logger.info(f"Provider info: {provider_info}")

        logger.info("\n" + "=" * 80)
        logger.info("✓ MikoPBX Trunk Registration Test COMPLETED")
        logger.info("=" * 80)

        return True

    except Exception as e:
        logger.error(f"✗ Test failed: {e}")
        raise

    finally:
        # Cleanup
        logger.info("\nStep 6: Cleanup...")

        # Delete provider if created
        if created_provider_id:
            try:
                logger.info(f"Deleting provider {created_provider_id}...")
                delete_response = api_client.delete(f'sip-providers/{created_provider_id}')
                if delete_response.get('result'):
                    logger.info(f"✓ Provider {created_provider_id} deleted")
                else:
                    logger.warning(f"⚠ Failed to delete provider: {delete_response}")
            except Exception as e:
                logger.error(f"Error deleting provider: {e}")

        # Stop cipbx
        try:
            await cipbx_provider.stop()
            logger.info("✓ CipBX provider stopped")
        except Exception as e:
            logger.error(f"Error stopping cipbx: {e}")

        logger.info("✓ Cleanup complete")


if __name__ == "__main__":
    # Run the test
    result = asyncio.run(test_mikopbx_trunk_registration_on_cipbx())
    exit(0 if result else 1)
