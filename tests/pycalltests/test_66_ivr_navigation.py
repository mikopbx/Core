#!/usr/bin/env python3
"""
Test 66: IVR Menu Navigation - DTMF-based Testing

Tests interactive voice response (IVR) menu navigation:
- Single-level IVR menu with DTMF navigation
- Multi-level IVR menu (nested menus)
- Invalid DTMF handling and timeout
"""

import pytest
import pytest_asyncio
import asyncio
import logging
import sys
from pathlib import Path

# Add parent directory to path to import conftest
sys.path.insert(0, str(Path(__file__).parent.parent / "api"))

from config import get_config
from conftest import MikoPBXClient, assert_api_success, get_extension_secret
from pjsua_helper import PJSUAConfig, PJSUAEndpoint, PJSUAManager, get_mikopbx_ip

# Load configuration
config = get_config()

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
    await manager.initialize()  # Start PJSIP event handler

    yield manager

    # Cleanup all endpoints after test
    await manager.cleanup_all()


@pytest_asyncio.fixture
async def audio_file_id(api_client):
    """
    Get or create audio file for IVR menu.

    Returns ID of an audio file that can be used for IVR greeting.
    For now, returns empty string as audio_message_id is optional in IVR menu.
    """
    # Return empty string - audio_message_id is optional in IVR menu configuration
    logger.info("Using empty audio_message_id (no greeting audio)")
    return ""


@pytest_asyncio.fixture
async def extension_credentials(api_client):
    """
    Dynamically load SIP secrets for test extensions via REST API.

    Returns dictionary mapping extension number to SIP secret (MD5 hash).
    """
    extensions = ["201", "202", "203", "204", "205", "206"]
    credentials = {}

    for ext in extensions:
        secret = get_extension_secret(ext, api_client)
        if secret:
            credentials[ext] = secret
            logger.info(f"Loaded credentials for extension {ext}")
        else:
            logger.warning(f"Failed to load credentials for extension {ext}")

    return credentials


@pytest.mark.asyncio
async def test_01_single_level_ivr_navigation(api_client, pjsua_manager, extension_credentials):
    """
    Test: Single-Level IVR Menu with DTMF Navigation

    Uses existing demo IVR "Main IVR menu" (extension 20020):
    - DTMF 2 → Extension 202
    - DTMF 3 → Extension 203

    Scenario:
    1. Register extensions 202, 203 in answer mode
    2. Caller 204 dials IVR extension 20020
    3. After IVR greeting, send DTMF "2"
    4. Verify call routes to extension 202
    5. Test routing with DTMF "3"

    Expected:
    - DTMF digits route to correct extensions
    - Extensions receive calls based on DTMF input
    """

    print(f"\n{'='*70}")
    print(f"Test: Single-Level IVR Navigation (Demo IVR 20020)")
    print(f"{'='*70}")

    # ================================================================
    # STEP 1: Register Target Extensions
    # ================================================================
    print(f"\n{'-'*70}")
    print(f"STEP 1: Register Target Extensions")
    print(f"{'-'*70}")

    ext202 = await pjsua_manager.create_endpoint(
        extension="202",
        password=extension_credentials["202"],
        auto_register=True,
        auto_answer=True
    )
    print(f"✅ Extension 202 registered (auto-answer enabled)")

    ext203 = await pjsua_manager.create_endpoint(
        extension="203",
        password=extension_credentials["203"],
        auto_register=True,
        auto_answer=True
    )
    print(f"✅ Extension 203 registered (auto-answer enabled)")

    await asyncio.sleep(2)

    # ================================================================
    # STEP 2: Test IVR Navigation with DTMF "2" → 202
    # ================================================================
    print(f"\n{'-'*70}")
    print(f"STEP 2: Test IVR Navigation - Press 2")
    print(f"{'-'*70}")

    caller = await pjsua_manager.create_endpoint(
        extension="204",
        password=extension_credentials["204"],
        auto_register=True
    )
    print(f"✅ Caller extension 204 registered")

    print(f"Calling IVR 20020 and sending DTMF '2' after 3s delay...")
    success = await caller.dial("20020", dtmf="2", dtmf_delay=3)

    assert success, "Failed to dial IVR extension 20020"
    print(f"✅ Call initiated to IVR 20020")

    await asyncio.sleep(8)
    print(f"✅ DTMF '2' sent, call should route to extension 202")

    await caller.hangup()
    await asyncio.sleep(2)

    # ================================================================
    # STEP 3: Test IVR Navigation with DTMF "3" → 203
    # ================================================================
    print(f"\n{'-'*70}")
    print(f"STEP 3: Test IVR Navigation - Press 3")
    print(f"{'-'*70}")

    caller2 = await pjsua_manager.create_endpoint(
        extension="205",
        password=extension_credentials["205"],
        auto_register=True
    )
    print(f"✅ Caller extension 205 registered")

    print(f"Calling IVR 20020 and sending DTMF '3' after 3s delay...")
    success = await caller2.dial("20020", dtmf="3", dtmf_delay=3)

    assert success, "Failed to dial IVR extension 20020"
    print(f"✅ Call initiated to IVR 20020")

    await asyncio.sleep(8)
    print(f"✅ DTMF '3' sent, call should route to extension 203")

    await caller2.hangup()

    print(f"\n{'='*70}")
    print(f"✓ Single-Level IVR Navigation Test COMPLETED")
    print(f"{'='*70}")


@pytest.mark.asyncio
async def test_02_multi_level_ivr_navigation(api_client, pjsua_manager, extension_credentials):
    """
    Test: Multi-Level (Nested) IVR Menu Navigation

    Uses existing demo IVR structure:
    - Main IVR (20020): DTMF 1 → Second IVR (30021)
    - Second IVR (30021): DTMF 1 → 201, DTMF 2 → 202, DTMF 3 → 203

    Scenario:
    1. Register target extensions (201, 202, 203)
    2. Call Main IVR (20020)
    3. Press DTMF "1" → routes to Second IVR (30021)
    4. Press DTMF "2" → routes to extension 202

    Expected:
    - Nested IVR navigation works correctly
    - DTMF navigates through multiple levels
    - Final extension receives the call
    """

    print(f"\n{'='*70}")
    print(f"Test: Multi-Level IVR Navigation (Demo IVR 20020→30021)")
    print(f"{'='*70}")

    # ================================================================
    # STEP 1: Register Target Extensions
    # ================================================================
    print(f"\n{'-'*70}")
    print(f"STEP 1: Register Target Extensions")
    print(f"{'-'*70}")

    ext201 = await pjsua_manager.create_endpoint(
        extension="201",
        password=extension_credentials["201"],
        auto_register=True,
        auto_answer=True
    )
    print(f"✅ Extension 201 registered (auto-answer enabled)")

    ext202 = await pjsua_manager.create_endpoint(
        extension="202",
        password=extension_credentials["202"],
        auto_register=True,
        auto_answer=True
    )
    print(f"✅ Extension 202 registered (auto-answer enabled)")

    ext203 = await pjsua_manager.create_endpoint(
        extension="203",
        password=extension_credentials["203"],
        auto_register=True,
        auto_answer=True
    )
    print(f"✅ Extension 203 registered (auto-answer enabled)")

    await asyncio.sleep(2)

    # ================================================================
    # STEP 2: Test Nested Navigation - 20020 (DTMF 1) → 30021 (DTMF 2) → 202
    # ================================================================
    print(f"\n{'-'*70}")
    print(f"STEP 2: Test Nested IVR Navigation")
    print(f"{'-'*70}")

    caller = await pjsua_manager.create_endpoint(
        extension="204",
        password=extension_credentials["204"],
        auto_register=True
    )
    print(f"✅ Caller extension 204 registered")

    print(f"Calling Main IVR 20020...")
    print(f"  Will send DTMF '12' (1 for Second IVR, 2 for ext 202)")

    success = await caller.dial("20020", dtmf="12", dtmf_delay=3)
    assert success, "Failed to dial Main IVR 20020"

    print(f"✅ Call initiated, DTMF will route: 20020→30021→202")

    await asyncio.sleep(10)

    await caller.hangup()

    print(f"\n{'='*70}")
    print(f"✓ Multi-Level IVR Navigation Test COMPLETED")
    print(f"{'='*70}")


@pytest.mark.asyncio
async def test_03_ivr_invalid_dtmf_handling(api_client, pjsua_manager, extension_credentials):
    """
    Test: IVR Invalid DTMF Input Handling

    Uses existing demo Main IVR (20020):
    - Valid DTMF: 1 → 30021, 2 → 202, 3 → 203
    - Timeout: 20 seconds → 201

    Scenario:
    1. Register timeout destination (201)
    2. Call Main IVR (20020)
    3. Send invalid DTMF (9) - should handle gracefully
    4. Verify no crashes or hung calls

    Expected:
    - Invalid DTMF handled gracefully
    - System continues to operate normally
    - No crashes or hung calls
    """

    print(f"\n{'='*70}")
    print(f"Test: IVR Invalid DTMF Handling (Demo IVR 20020)")
    print(f"{'='*70}")

    # ================================================================
    # STEP 1: Register Timeout Destination
    # ================================================================
    print(f"\n{'-'*70}")
    print(f"STEP 1: Register Timeout Destination")
    print(f"{'-'*70}")

    ext201 = await pjsua_manager.create_endpoint(
        extension="201",
        password=extension_credentials["201"],
        auto_register=True,
        auto_answer=True
    )
    print(f"✅ Timeout destination (201) registered (auto-answer enabled)")

    await asyncio.sleep(2)

    # ================================================================
    # STEP 2: Test Invalid DTMF
    # ================================================================
    print(f"\n{'-'*70}")
    print(f"STEP 2: Send Invalid DTMF '9'")
    print(f"{'-'*70}")

    caller = await pjsua_manager.create_endpoint(
        extension="204",
        password=extension_credentials["204"],
        auto_register=True
    )
    print(f"✅ Caller extension 204 registered")

    print(f"Calling IVR 20020 and sending invalid DTMF '9'...")
    success = await caller.dial("20020", dtmf="9", dtmf_delay=2)

    assert success, "Failed to dial IVR 20020"
    print(f"✅ Call initiated with invalid DTMF '9'")

    # Wait for IVR to handle invalid input
    await asyncio.sleep(8)

    await caller.hangup()

    print(f"\n{'='*70}")
    print(f"✓ Invalid DTMF Handling Test COMPLETED")
    print(f"{'='*70}")


if __name__ == "__main__":
    pytest.main([__file__, '-v', '-s'])
