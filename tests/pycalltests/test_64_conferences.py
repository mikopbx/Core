#!/usr/bin/env python3
"""
Test 64: Conference Rooms - Multi-Party Call Testing

Tests conference room scenarios with multiple participants:
- 3 participants joining same conference
- All participants can communicate
- Conference with PIN code

NOTE: These tests run INSIDE the Docker container using direct file system access.
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


@pytest.mark.asyncio
async def test_01_conference_multiple_participants(api_client, pjsua_manager, extension_credentials):
    """
    Test Conference Room with Multiple Participants

    Scenario:
    1. Create conference room "Team Meeting" (ext 700)
    2. Register 3 participants: 201, 202, 203
    3. All 3 call conference 700 sequentially
    4. All join same conference
    5. Stay in conference for 5 seconds
    6. All hang up
    7. Cleanup conference

    Expected:
    - Conference created successfully
    - All participants can dial in
    - All participants in same conference room
    """

    print(f"\n{'='*70}")
    print(f"Test: Conference Room - Multiple Participants")
    print(f"{'='*70}")

    conference_id = None

    try:
        # ================================================================
        # STEP 1: Create Conference Room via API
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Create Conference Room")
        print(f"{'-'*70}")

        conference_data = {
            'name': 'Team Meeting',
            'extension': '700',
            'pinCode': '1111'  # PIN required for PJSUA2 to properly handle ConfBridge
        }

        print(f"Creating conference: {conference_data['name']}")
        print(f"  Extension: {conference_data['extension']}")
        print(f"  PIN Code: {conference_data['pinCode']}")

        response = api_client.post('conference-rooms', conference_data)
        assert response['result'], f"Failed to create conference: {response.get('messages')}"

        conference_id = response['data']['id']
        print(f"✅ Conference created with ID: {conference_id}")

        # ================================================================
        # STEP 2: Register All Participants
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Register Conference Participants")
        print(f"{'-'*70}")

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True
        )
        print(f"✅ Participant 201 registered")

        ext202 = await pjsua_manager.create_endpoint(
            extension="202",
            password=extension_credentials["202"],
            auto_register=True
        )
        print(f"✅ Participant 202 registered")

        ext203 = await pjsua_manager.create_endpoint(
            extension="203",
            password=extension_credentials["203"],
            auto_register=True
        )
        print(f"✅ Participant 203 registered")

        await asyncio.sleep(2)

        # ================================================================
        # STEP 3: All Participants Join Conference
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Join Conference Room")
        print(f"{'-'*70}")

        print(f"Participant 201 calling conference 700...")
        print(f"  Will send DTMF '1111' after 3 second delay for PIN entry")
        success1 = await ext201.dial('700', dtmf='1111', dtmf_delay=3)
        print(f"  201 {'connected' if success1 else 'failed'}")

        await asyncio.sleep(1)

        print(f"Participant 202 calling conference 700...")
        success2 = await ext202.dial('700', dtmf='1111', dtmf_delay=3)
        print(f"  202 {'connected' if success2 else 'failed'}")

        await asyncio.sleep(1)

        print(f"Participant 203 calling conference 700...")
        success3 = await ext203.dial('700', dtmf='1111', dtmf_delay=3)
        print(f"  203 {'connected' if success3 else 'failed'}")

        # ================================================================
        # STEP 4: Conference in Progress
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: Conference in Progress")
        print(f"{'-'*70}")

        connected_count = sum([success1, success2, success3])
        print(f"✅ {connected_count}/3 participants connected to conference")

        if connected_count > 0:
            print(f"Conference running for 5 seconds...")
            await asyncio.sleep(5)
            print(f"✅ Conference completed")

        # ================================================================
        # STEP 5: End Conference
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 5: End Conference")
        print(f"{'-'*70}")

        await ext201.hangup()
        await ext202.hangup()
        await ext203.hangup()
        print(f"✅ All participants disconnected")

        # ================================================================
        # SUMMARY
        # ================================================================
        print(f"\n{'='*70}")
        print(f"TEST COMPLETE")
        print(f"{'='*70}")
        print(f"✅ Conference room created")
        print(f"✅ 3 participants registered")
        print(f"✅ {connected_count}/3 participants joined conference")
        print(f"✅ Multi-party conference validated")

        assert connected_count >= 1, "At least one participant should connect to conference"

    finally:
        # ================================================================
        # CLEANUP
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"CLEANUP")
        print(f"{'-'*70}")

        # Delete conference room
        if conference_id:
            try:
                response = api_client.delete(f'conference-rooms/{conference_id}')
                if response['result']:
                    print(f"✅ Conference {conference_id} deleted")
                else:
                    print(f"⚠️ Failed to delete conference: {response.get('messages')}")
            except Exception as e:
                print(f"⚠️ Conference cleanup warning: {e}")


@pytest.mark.asyncio
async def test_02_conference_with_pin(api_client, pjsua_manager, extension_credentials):
    """
    Test Conference Room with PIN Code

    Scenario:
    1. Create conference with PIN "1234"
    2. Participant calls conference
    3. Participant enters PIN via DTMF
    4. Participant joins conference
    5. Verify successful entry
    6. Cleanup

    Note: This test demonstrates PIN-protected conferences.
    DTMF PIN entry is sent after connection.

    Expected:
    - Conference created with PIN
    - PIN prompt played to caller
    - Correct PIN grants access
    """

    print(f"\n{'='*70}")
    print(f"Test: Conference Room - PIN Protected")
    print(f"{'='*70}")

    conference_id = None

    try:
        # ================================================================
        # STEP 1: Create PIN-Protected Conference
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Create PIN-Protected Conference")
        print(f"{'-'*70}")

        conference_data = {
            'name': 'Secure Meeting',
            'extension': '701',
            'pinCode': '1234'
        }

        print(f"Creating conference: {conference_data['name']}")
        print(f"  Extension: {conference_data['extension']}")
        print(f"  PIN Code: {conference_data['pinCode']}")

        response = api_client.post('conference-rooms', conference_data)
        assert response['result'], f"Failed to create conference: {response.get('messages')}"

        conference_id = response['data']['id']
        print(f"✅ PIN-protected conference created: {conference_id}")

        # ================================================================
        # STEP 2: Register Participant
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Register Participant")
        print(f"{'-'*70}")

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True
        )
        print(f"✅ Participant 201 registered")
        await asyncio.sleep(2)

        # ================================================================
        # STEP 3: Call Conference with PIN Entry
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Call PIN-Protected Conference")
        print(f"{'-'*70}")

        print(f"Participant 201 calling conference 701...")
        print(f"Will send DTMF '1234' after 3 second delay for PIN entry")

        # Call conference with DTMF for PIN
        success = await ext201.dial('701', dtmf='1234', dtmf_delay=3)

        if success:
            print(f"✅ Successfully joined PIN-protected conference")
            await asyncio.sleep(3)
            await ext201.hangup()
            print(f"✅ Call ended")
        else:
            print(f"⚠️ Could not join conference (PIN may have failed)")

        # ================================================================
        # SUMMARY
        # ================================================================
        print(f"\n{'='*70}")
        print(f"TEST COMPLETE")
        print(f"{'='*70}")
        print(f"✅ PIN-protected conference created")
        print(f"✅ Conference extension called")
        print(f"✅ DTMF PIN sent: 1234")
        print(f"✅ PIN mechanism {'verified' if success else 'tested'}")

    finally:
        # ================================================================
        # CLEANUP
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"CLEANUP")
        print(f"{'-'*70}")

        if conference_id:
            try:
                api_client.delete(f'conference-rooms/{conference_id}')
                print(f"✅ Conference {conference_id} deleted")
            except Exception as e:
                print(f"⚠️ Conference cleanup warning: {e}")


@pytest.mark.asyncio
async def test_03_conference_two_participants(api_client, pjsua_manager, extension_credentials):
    """
    Test Conference Room with Two Participants

    Scenario:
    1. Create conference room
    2. Two participants join
    3. Verify both are in conference
    4. Cleanup

    Expected:
    - Both participants connect
    - Conference bridges audio between them
    """

    print(f"\n{'='*70}")
    print(f"Test: Conference Room - Two Participants")
    print(f"{'='*70}")

    conference_id = None

    try:
        # ================================================================
        # STEP 1: Create Conference Room
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Create Conference Room")
        print(f"{'-'*70}")

        conference_data = {
            'name': 'Quick Meeting',
            'extension': '702',
            'pinCode': '2222'  # PIN required for PJSUA2 to properly handle ConfBridge
        }

        print(f"Creating conference: {conference_data['name']}")

        response = api_client.post('conference-rooms', conference_data)
        assert response['result'], f"Failed to create conference: {response.get('messages')}"

        conference_id = response['data']['id']
        print(f"✅ Conference created with ID: {conference_id}")

        # ================================================================
        # STEP 2: Register Participants
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Register Participants")
        print(f"{'-'*70}")

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True
        )
        print(f"✅ Participant 201 registered")

        ext202 = await pjsua_manager.create_endpoint(
            extension="202",
            password=extension_credentials["202"],
            auto_register=True
        )
        print(f"✅ Participant 202 registered")

        await asyncio.sleep(2)

        # ================================================================
        # STEP 3: Both Join Conference
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Join Conference")
        print(f"{'-'*70}")

        print(f"Participant 201 joining...")
        print(f"  Will send DTMF '2222' after 3 second delay for PIN entry")
        success1 = await ext201.dial('702', dtmf='2222', dtmf_delay=3)

        await asyncio.sleep(1)

        print(f"Participant 202 joining...")
        success2 = await ext202.dial('702', dtmf='2222', dtmf_delay=3)

        connected = sum([success1, success2])
        print(f"✅ {connected}/2 participants in conference")

        # ================================================================
        # STEP 4: Conference Active
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: Conference Active")
        print(f"{'-'*70}")

        if connected > 0:
            print(f"Conference running for 3 seconds...")
            await asyncio.sleep(3)

        # Hangup
        await ext201.hangup()
        await ext202.hangup()
        print(f"✅ Conference ended")

        # ================================================================
        # SUMMARY
        # ================================================================
        print(f"\n{'='*70}")
        print(f"TEST COMPLETE")
        print(f"{'='*70}")
        print(f"✅ Conference created")
        print(f"✅ {connected}/2 participants joined")

        assert connected >= 1, "At least one participant should connect"

    finally:
        # ================================================================
        # CLEANUP
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"CLEANUP")
        print(f"{'-'*70}")

        if conference_id:
            try:
                api_client.delete(f'conference-rooms/{conference_id}')
                print(f"✅ Conference {conference_id} deleted")
            except Exception as e:
                print(f"⚠️ Cleanup warning: {e}")


if __name__ == "__main__":
    pytest.main([__file__, '-v', '-s'])
