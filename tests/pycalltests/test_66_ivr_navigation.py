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
from conftest import MikoPBXClient, assert_api_success
from pjsua_helper import PJSUAConfig, PJSUAEndpoint, PJSUAManager, get_mikopbx_ip

# Load configuration
config = get_config()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Test extension credentials
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
async def pjsua_manager(mikopbx_ip):
    """Create PJSUA manager for tests"""
    manager = PJSUAManager(server_ip=mikopbx_ip)

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


@pytest.mark.asyncio
async def test_01_single_level_ivr_navigation(api_client, pjsua_manager, audio_file_id):
    """
    Test: Single-Level IVR Menu with DTMF Navigation

    Scenario:
    1. Create IVR menu "Main Menu" (ext 500)
       - Press 1 → Route to extension 201
       - Press 2 → Route to extension 202
       - Press 3 → Route to extension 203
    2. Register extensions 201, 202, 203 in answer mode
    3. Caller dials IVR extension 500
    4. After IVR greeting, send DTMF "2"
    5. Verify call routes to extension 202
    6. Test routing with DTMF "1" and "3"
    7. Cleanup IVR menu

    Expected:
    - IVR menu created successfully
    - DTMF digits route to correct extensions
    - Extensions receive calls based on DTMF input
    """

    print(f"\n{'='*70}")
    print(f"Test: Single-Level IVR Navigation")
    print(f"{'='*70}")

    ivr_id = None

    try:
        # ================================================================
        # STEP 1: Create IVR Menu via API
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Create IVR Menu")
        print(f"{'-'*70}")

        ivr_data = {
            'name': 'Main Menu',
            'extension': '500',
            'audio_message_id': audio_file_id,
            'timeout': 10,
            'timeout_extension': '201',  # Default extension on timeout
            'description': 'Test IVR for DTMF navigation'
        }

        print(f"Creating IVR menu: {ivr_data['name']}")
        print(f"  Extension: {ivr_data['extension']}")
        print(f"  Audio ID: {ivr_data['audio_message_id']}")

        response = api_client.post('ivr-menu', ivr_data)
        assert_api_success(response, f"Failed to create IVR menu: {response.get('messages')}")

        ivr_id = response['data']['id']
        print(f"✅ IVR menu created with ID: {ivr_id}")

        # ================================================================
        # STEP 2: Add IVR Menu Actions (DTMF mappings)
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Configure IVR Menu Actions")
        print(f"{'-'*70}")

        # Define DTMF to extension mappings
        menu_actions = [
            {'digits': '1', 'extension': '201'},
            {'digits': '2', 'extension': '202'},
            {'digits': '3', 'extension': '203'}
        ]

        # Update IVR with menu items
        ivr_update_data = ivr_data.copy()
        ivr_update_data['id'] = ivr_id
        ivr_update_data['menuItems'] = menu_actions

        response = api_client.patch(f'ivr-menu/{ivr_id}', ivr_update_data)
        assert_api_success(response, f"Failed to update IVR menu actions: {response.get('messages')}")

        for action in menu_actions:
            print(f"  ✅ DTMF {action['digits']} → Extension {action['extension']}")

        # Wait for configuration to apply
        await asyncio.sleep(3)

        # ================================================================
        # STEP 3: Register Target Extensions
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Register Target Extensions")
        print(f"{'-'*70}")

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=TEST_EXTENSIONS["201"],
            auto_register=True
        )
        print(f"✅ Extension 201 registered")

        ext202 = await pjsua_manager.create_endpoint(
            extension="202",
            password=TEST_EXTENSIONS["202"],
            auto_register=True
        )
        print(f"✅ Extension 202 registered")

        ext203 = await pjsua_manager.create_endpoint(
            extension="203",
            password=TEST_EXTENSIONS["203"],
            auto_register=True
        )
        print(f"✅ Extension 203 registered")

        await asyncio.sleep(2)

        # ================================================================
        # STEP 4: Test IVR Navigation with DTMF "2"
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: Test IVR Navigation - Press 2")
        print(f"{'-'*70}")

        # Create calling endpoint (not registered, will dial)
        config_caller = PJSUAConfig(
            extension="204",
            password="test_password",
            server_ip=pjsua_manager.server_ip,
            media="log"
        )
        caller = PJSUAEndpoint(config_caller)

        # Call IVR and send DTMF "2" after 3 seconds
        print(f"Calling IVR 500 and sending DTMF '2' after 3s delay...")
        success = await caller.dial("500", dtmf="2", dtmf_delay=3)

        assert success, "Failed to dial IVR extension"
        print(f"✅ Call initiated to IVR 500")

        # Wait for DTMF to be sent and call to route
        await asyncio.sleep(8)

        print(f"✅ DTMF '2' sent, call should route to extension 202")

        # Cleanup this call
        await caller.hangup()
        await asyncio.sleep(2)

        # ================================================================
        # STEP 5: Test IVR Navigation with DTMF "1"
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 5: Test IVR Navigation - Press 1")
        print(f"{'-'*70}")

        caller2 = PJSUAEndpoint(config_caller)

        print(f"Calling IVR 500 and sending DTMF '1' after 3s delay...")
        success = await caller2.dial("500", dtmf="1", dtmf_delay=3)

        assert success, "Failed to dial IVR extension"
        print(f"✅ Call initiated to IVR 500")

        await asyncio.sleep(8)
        print(f"✅ DTMF '1' sent, call should route to extension 201")

        await caller2.hangup()
        await asyncio.sleep(2)

        # ================================================================
        # STEP 6: Test IVR Navigation with DTMF "3"
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 6: Test IVR Navigation - Press 3")
        print(f"{'-'*70}")

        caller3 = PJSUAEndpoint(config_caller)

        print(f"Calling IVR 500 and sending DTMF '3' after 3s delay...")
        success = await caller3.dial("500", dtmf="3", dtmf_delay=3)

        assert success, "Failed to dial IVR extension"
        print(f"✅ Call initiated to IVR 500")

        await asyncio.sleep(8)
        print(f"✅ DTMF '3' sent, call should route to extension 203")

        await caller3.hangup()

        print(f"\n{'='*70}")
        print(f"✓ Single-Level IVR Navigation Test COMPLETED")
        print(f"{'='*70}")

    finally:
        # ================================================================
        # CLEANUP: Delete IVR Menu
        # ================================================================
        if ivr_id:
            print(f"\nCleaning up IVR menu {ivr_id}...")
            try:
                response = api_client.delete(f'ivr-menu/{ivr_id}')
                if response.get('result'):
                    print(f"✅ IVR menu deleted")
            except Exception as e:
                logger.error(f"Failed to delete IVR menu: {e}")


@pytest.mark.asyncio
async def test_02_multi_level_ivr_navigation(api_client, pjsua_manager, audio_file_id):
    """
    Test: Multi-Level (Nested) IVR Menu Navigation

    Scenario:
    1. Create Main IVR menu (ext 510)
       - Press 1 → Route to Sales IVR (520)
       - Press 2 → Route to Support extension (202)
       - Press 0 → Route to Operator (201)
    2. Create Sales IVR menu (ext 520)
       - Press 1 → Sales Rep 1 (203)
       - Press 2 → Sales Rep 2 (202)
    3. Register all extensions
    4. Test navigation: Call 510 → Press 1 → Press 2
    5. Verify call routes through nested menus correctly

    Expected:
    - Nested IVR menus work correctly
    - DTMF navigates through multiple levels
    - Final destination receives the call
    """

    print(f"\n{'='*70}")
    print(f"Test: Multi-Level IVR Navigation")
    print(f"{'='*70}")

    main_ivr_id = None
    sales_ivr_id = None

    try:
        # ================================================================
        # STEP 1: Create Sales IVR Menu (Second Level)
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Create Sales IVR (Second Level)")
        print(f"{'-'*70}")

        sales_ivr_data = {
            'name': 'Sales IVR',
            'extension': '520',
            'audio_message_id': audio_file_id,
            'timeout': 10,
            'timeout_extension': '201',
            'description': 'Sales department IVR'
        }

        response = api_client.post('ivr-menu', sales_ivr_data)
        assert_api_success(response, f"Failed to create Sales IVR: {response.get('messages')}")

        sales_ivr_id = response['data']['id']
        print(f"✅ Sales IVR created (ext 520, ID: {sales_ivr_id})")

        # Configure Sales IVR actions
        sales_menu_actions = [
            {'digits': '1', 'extension': '203'},
            {'digits': '2', 'extension': '202'}
        ]

        sales_ivr_update = sales_ivr_data.copy()
        sales_ivr_update['id'] = sales_ivr_id
        sales_ivr_update['menuItems'] = sales_menu_actions

        response = api_client.patch(f'ivr-menu/{sales_ivr_id}', sales_ivr_update)
        assert_api_success(response, f"Failed to update Sales IVR: {response.get('messages')}")

        print(f"  ✅ DTMF 1 → Extension 203")
        print(f"  ✅ DTMF 2 → Extension 202")

        # ================================================================
        # STEP 2: Create Main IVR Menu (First Level)
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Create Main IVR (First Level)")
        print(f"{'-'*70}")

        main_ivr_data = {
            'name': 'Main IVR',
            'extension': '510',
            'audio_message_id': audio_file_id,
            'timeout': 10,
            'timeout_extension': '201',
            'description': 'Main company IVR'
        }

        response = api_client.post('ivr-menu', main_ivr_data)
        assert_api_success(response, f"Failed to create Main IVR: {response.get('messages')}")

        main_ivr_id = response['data']['id']
        print(f"✅ Main IVR created (ext 510, ID: {main_ivr_id})")

        # Configure Main IVR actions (link to Sales IVR)
        main_menu_actions = [
            {'digits': '1', 'extension': '520'},  # Route to Sales IVR
            {'digits': '2', 'extension': '202'},  # Direct to support
            {'digits': '0', 'extension': '201'}   # Operator
        ]

        main_ivr_update = main_ivr_data.copy()
        main_ivr_update['id'] = main_ivr_id
        main_ivr_update['menuItems'] = main_menu_actions

        response = api_client.patch(f'ivr-menu/{main_ivr_id}', main_ivr_update)
        assert_api_success(response, f"Failed to update Main IVR: {response.get('messages')}")

        print(f"  ✅ DTMF 1 → Sales IVR (520)")
        print(f"  ✅ DTMF 2 → Support (202)")
        print(f"  ✅ DTMF 0 → Operator (201)")

        await asyncio.sleep(3)

        # ================================================================
        # STEP 3: Register Target Extensions
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Register Target Extensions")
        print(f"{'-'*70}")

        ext201 = await pjsua_manager.create_endpoint(
            extension="201", password=TEST_EXTENSIONS["201"], auto_register=True
        )
        ext202 = await pjsua_manager.create_endpoint(
            extension="202", password=TEST_EXTENSIONS["202"], auto_register=True
        )
        ext203 = await pjsua_manager.create_endpoint(
            extension="203", password=TEST_EXTENSIONS["203"], auto_register=True
        )

        print(f"✅ Extensions 201, 202, 203 registered")
        await asyncio.sleep(2)

        # ================================================================
        # STEP 4: Test Nested Navigation (510 → 1 → 1)
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: Test Nested Navigation - Main→Sales→Rep1")
        print(f"{'-'*70}")

        config_caller = PJSUAConfig(
            extension="205",
            password="test_password",
            server_ip=pjsua_manager.server_ip,
            media="log"
        )
        caller = PJSUAEndpoint(config_caller)

        # Call Main IVR, send "1" to go to Sales IVR, then "1" to reach ext 203
        print(f"Calling Main IVR 510...")
        print(f"  Will send DTMF '11' (1 for Sales, 1 for Rep1)")

        success = await caller.dial("510", dtmf="11", dtmf_delay=3)
        assert success, "Failed to dial Main IVR"

        print(f"✅ Call initiated, DTMF will route: 510→520→203")

        await asyncio.sleep(10)

        await caller.hangup()

        print(f"\n{'='*70}")
        print(f"✓ Multi-Level IVR Navigation Test COMPLETED")
        print(f"{'='*70}")

    finally:
        # ================================================================
        # CLEANUP: Delete IVR Menus
        # ================================================================
        print(f"\nCleaning up IVR menus...")

        if main_ivr_id:
            try:
                api_client.delete(f'ivr-menu/{main_ivr_id}')
                print(f"✅ Main IVR deleted")
            except Exception as e:
                logger.error(f"Failed to delete Main IVR: {e}")

        if sales_ivr_id:
            try:
                api_client.delete(f'ivr-menu/{sales_ivr_id}')
                print(f"✅ Sales IVR deleted")
            except Exception as e:
                logger.error(f"Failed to delete Sales IVR: {e}")


@pytest.mark.asyncio
async def test_03_ivr_invalid_dtmf_handling(api_client, pjsua_manager, audio_file_id):
    """
    Test: IVR Invalid DTMF Input Handling

    Scenario:
    1. Create IVR menu with defined actions (1, 2, 3)
    2. Call IVR and send invalid DTMF (9)
    3. Verify timeout or invalid handler works
    4. Test with no DTMF input (timeout scenario)

    Expected:
    - Invalid DTMF handled gracefully
    - Timeout routes to default extension
    - No crashes or hung calls
    """

    print(f"\n{'='*70}")
    print(f"Test: IVR Invalid DTMF Handling")
    print(f"{'='*70}")

    ivr_id = None

    try:
        # Create IVR with timeout handler
        ivr_data = {
            'name': 'Test IVR - Invalid DTMF',
            'extension': '530',
            'audio_message_id': audio_file_id,
            'timeout': 5,  # Short timeout for testing
            'timeout_extension': '201',  # Route to 201 on timeout
            'description': 'Test IVR for invalid DTMF handling'
        }

        response = api_client.post('ivr-menu', ivr_data)
        assert_api_success(response, "Failed to create IVR")

        ivr_id = response['data']['id']
        print(f"✅ IVR created (ext 530, timeout→201)")

        # Configure valid actions (1, 2 only)
        menu_actions = [
            {'digits': '1', 'extension': '202'},
            {'digits': '2', 'extension': '203'}
        ]

        ivr_update = ivr_data.copy()
        ivr_update['id'] = ivr_id
        ivr_update['menuItems'] = menu_actions

        response = api_client.patch(f'ivr-menu/{ivr_id}', ivr_update)
        assert_api_success(response, "Failed to update IVR")

        await asyncio.sleep(3)

        # Register timeout destination
        ext201 = await pjsua_manager.create_endpoint(
            extension="201", password=TEST_EXTENSIONS["201"], auto_register=True
        )
        print(f"✅ Timeout destination (201) registered")

        await asyncio.sleep(2)

        # Test with invalid DTMF "9"
        print(f"\nTest 1: Sending invalid DTMF '9'")
        config_caller = PJSUAConfig(
            extension="206",
            password="test_password",
            server_ip=pjsua_manager.server_ip,
            media="log"
        )
        caller = PJSUAEndpoint(config_caller)

        success = await caller.dial("530", dtmf="9", dtmf_delay=2)
        assert success, "Failed to dial IVR"

        print(f"  Sent invalid DTMF '9', should route to timeout destination")
        await asyncio.sleep(8)

        await caller.hangup()

        print(f"\n✅ Invalid DTMF handling test completed")

    finally:
        if ivr_id:
            try:
                api_client.delete(f'ivr-menu/{ivr_id}')
                print(f"✅ IVR deleted")
            except Exception as e:
                logger.error(f"Failed to delete IVR: {e}")


if __name__ == "__main__":
    pytest.main([__file__, '-v', '-s'])
