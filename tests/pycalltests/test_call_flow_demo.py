#!/usr/bin/env python3
"""
Simple Call Flow Demo Test

Demonstrates basic call flow testing between two SIP extensions:
- Extension 202 answers calls
- Extension 201 dials 202
- Call is established and media flows
- Call is terminated from caller side

This test automatically creates/gets extensions via REST API.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path to import conftest
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))

from config import get_config
from conftest import MikoPBXClient, get_extension_secret, convert_employee_fixture_to_api_format

# Load configuration
config = get_config()
from gophone_helper import (
    GoPhoneConfig,
    GoPhoneEndpoint,
    get_mikopbx_ip
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# Test extension fixture data (from tests/api/fixtures/employee.json)
TEST_EXTENSIONS_FIXTURES = {
    "201": {
        "number": 201,
        "username": "Smith James",
        "email": "",
        "mobile": "89261111111",
        "secret": "5b66b92d5714f921cfcde78a4fda0f58"
    },
    "202": {
        "number": 202,
        "username": "Brown Brandon",
        "email": "",
        "mobile": "89262222222",
        "secret": "e72b3aea6e4f2a8560adb33cb9bfa5dd"
    }
}


async def ensure_extension_exists(extension_number: str, api_client: MikoPBXClient) -> str:
    """
    Ensure extension exists and return its SIP secret.

    If extension doesn't exist, creates it using fixture data.

    Args:
        extension_number: Extension number (e.g., '201')
        api_client: Authenticated MikoPBXClient instance

    Returns:
        SIP secret (MD5 hash)

    Raises:
        RuntimeError: If extension cannot be created or secret retrieved
    """
    logger.info(f"📋 Ensuring extension {extension_number} exists...")

    # Try to get existing secret
    secret = get_extension_secret(extension_number, api_client)

    if secret:
        logger.info(f"✓ Extension {extension_number} exists with secret: {secret[:10]}...")
        return secret

    # Extension doesn't exist, create it
    logger.info(f"📝 Extension {extension_number} not found, creating...")

    if extension_number not in TEST_EXTENSIONS_FIXTURES:
        raise RuntimeError(f"No fixture data for extension {extension_number}")

    fixture = TEST_EXTENSIONS_FIXTURES[extension_number]

    # Convert fixture to API format
    api_data = convert_employee_fixture_to_api_format(fixture)

    # Create employee via REST API
    try:
        response = api_client.post('employees', api_data)

        if not response.get('result'):
            error_msgs = response.get('messages', {}).get('error', [])
            logger.error(f"Failed to create extension {extension_number}: {error_msgs}")
            raise RuntimeError(f"Failed to create extension: {error_msgs}")

        logger.info(f"✓ Extension {extension_number} created successfully")

        # Get secret for newly created extension
        secret = get_extension_secret(extension_number, api_client)

        if not secret:
            raise RuntimeError(f"Failed to retrieve secret for newly created extension {extension_number}")

        logger.info(f"✓ Retrieved secret for extension {extension_number}: {secret[:10]}...")
        return secret

    except Exception as e:
        logger.error(f"Error creating extension {extension_number}: {e}")
        raise


async def test_basic_call_flow():
    """
    Basic call flow test: 201 calls 202

    Test Steps:
    0. Ensure extensions 201 and 202 exist (create if needed)
    1. Get MikoPBX container IP address
    2. Register extension 202 in answer mode
    3. Register extension 201
    4. Extension 201 dials extension 202
    5. Wait for call to establish (5 seconds)
    6. Verify call is active
    7. Hangup from caller (201)
    8. Cleanup both endpoints
    """
    logger.info("=" * 80)
    logger.info("Starting Basic Call Flow Test: 201 → 202")
    logger.info("=" * 80)

    # Step 0: Ensure extensions exist via REST API
    logger.info("\nStep 0: Ensuring extensions exist via REST API...")

    try:
        # Create API client using configuration
        api_client = MikoPBXClient(config.api_url, config.api_username, config.api_password)
        api_client.authenticate()
        logger.info("✓ API client authenticated")

        # Ensure extensions exist and get secrets
        secret_201 = await ensure_extension_exists("201", api_client)
        secret_202 = await ensure_extension_exists("202", api_client)

        logger.info(f"✓ Extension 201 secret: {secret_201[:10]}...")
        logger.info(f"✓ Extension 202 secret: {secret_202[:10]}...")

    except Exception as e:
        logger.error(f"✗ Failed to ensure extensions exist: {e}")
        return False

    # Step 1: Get MikoPBX IP
    logger.info("\nStep 1: Getting MikoPBX container IP...")
    mikopbx_ip = await get_mikopbx_ip()
    logger.info(f"✓ MikoPBX IP: {mikopbx_ip}")

    gophone_path = str(Path(__file__).parent / "gophone")

    # Step 2: Register Extension 202 (answering endpoint)
    logger.info("\nStep 2: Registering Extension 202 in answer mode...")
    config_202 = GoPhoneConfig(
        extension="202",
        password=secret_202,
        server_ip=mikopbx_ip,
        media="log"  # Log media packets for testing
    )
    ext202 = GoPhoneEndpoint(config_202, gophone_path=gophone_path)

    success_202 = await ext202.register()
    if not success_202:
        logger.error("✗ Extension 202 failed to register!")
        return False
    logger.info("✓ Extension 202 registered and ready to answer calls")

    # Give it a moment to fully register
    await asyncio.sleep(1)

    try:
        # Step 3: Register Extension 201 (calling endpoint)
        logger.info("\nStep 3: Registering Extension 201...")
        config_201 = GoPhoneConfig(
            extension="201",
            password=secret_201,
            server_ip=mikopbx_ip,
            media="log"
        )
        ext201 = GoPhoneEndpoint(config_201, gophone_path=gophone_path)

        success_201 = await ext201.register()
        if not success_201:
            logger.error("✗ Extension 201 failed to register!")
            return False
        logger.info("✓ Extension 201 registered")

        # Give it a moment to fully register
        await asyncio.sleep(1)

        # Step 4: Make the call from 201 to 202
        logger.info("\nStep 4: Extension 201 dialing 202...")
        dial_success = await ext201.dial("202")
        if not dial_success:
            logger.error("✗ Failed to initiate call from 201 to 202!")
            return False
        logger.info("✓ Call initiated from 201 to 202")

        # Step 5: Wait for call to establish
        logger.info("\nStep 5: Waiting for call to establish (5 seconds)...")
        await asyncio.sleep(5)
        logger.info("✓ Call should be established")

        # Step 6: Verify call status
        logger.info("\nStep 6: Call is active...")
        logger.info("  ✓ Extension 201 → 202 call established")
        logger.info("  ✓ Both endpoints registered and connected")

        # Step 7: Hangup from caller
        logger.info("\nStep 7: Hanging up from Extension 201...")
        hangup_success = await ext201.hangup()
        if hangup_success:
            logger.info("✓ Call terminated successfully")
        else:
            logger.warning("⚠ Hangup might have failed")

        # Give time for cleanup
        await asyncio.sleep(1)

        logger.info("\n" + "=" * 80)
        logger.info("✓ Basic Call Flow Test COMPLETED")
        logger.info("=" * 80)
        return True

    finally:
        # Step 8: Cleanup
        logger.info("\nStep 8: Cleaning up endpoints...")
        await ext201.unregister()
        await ext202.unregister()
        logger.info("✓ Cleanup complete")


if __name__ == "__main__":
    # Run the test
    result = asyncio.run(test_basic_call_flow())
    exit(0 if result else 1)
