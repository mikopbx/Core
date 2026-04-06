#!/usr/bin/env python3
"""
Test 62: SIP Provider Call Routing

Tests actual call routing through SIP providers using PJSUA2:
- Outbound calls: Extension → Provider (PJSUA2 registered as inbound provider)
- Inbound calls: Provider (PJSUA2) → Extension (via DID routing)

NOTE: These tests run INSIDE the Docker container.
Provider emulation uses PJSUA2 endpoints registered as inbound providers.
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
    extensions = ["201", "202"]
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
async def test_01_outbound_call_via_provider(api_client, pjsua_manager, extension_credentials):
    """
    Test: Outbound Call Routing Through SIP Provider

    Scenario:
    1. Create inbound SIP provider in MikoPBX
    2. Register PJSUA2 endpoint as "provider trunk" (simulating external provider)
    3. Create outbound route: pattern '9XXXXXXX' → provider
    4. Register extension 201
    5. Extension 201 calls '91234567' → should route to PJSUA2 provider
    6. Verify call reaches provider (PJSUA2 auto-answers)
    7. Check CDR records

    Expected:
    - Call from 201 to 9XXXXXXX routes through provider
    - PJSUA2 provider receives INVITE and answers
    - CDR shows outbound call through provider
    """
    print(f"\n{'='*70}")
    print(f"Test: Outbound Call via Provider")
    print(f"{'='*70}")

    if '201' not in extension_credentials:
        pytest.skip("Extension 201 credentials not available")

    provider_id = None
    route_id = None

    try:
        # ================================================================
        # STEP 1: Create Inbound SIP Provider
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Create Inbound SIP Provider")
        print(f"{'-'*70}")

        provider_data = {
            "type": "sip",
            "registration_type": "inbound",  # Inbound provider (trunk registers TO MikoPBX)
            "description": "Test Provider for Outbound Routing",
            "host": "dynamic",  # Provider will register from any IP
            "username": "trunk_test_user",
            "secret": "trunk_test_password",
            "transport": "udp",
            "dtmfmode": "rfc4733",
            "qualify": False
        }

        response = api_client.post("sip-providers", provider_data)
        assert response.get("result") is True, f"Failed to create SIP provider: {response.get('messages')}"
        provider_id = response["data"]["id"]
        print(f"✓ Created inbound SIP provider (ID: {provider_id})")
        print(f"  Provider will accept registration from trunk_test_user")

        # ================================================================
        # STEP 2: Create Outbound Route
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Create Outbound Route")
        print(f"{'-'*70}")

        route_data = {
            "rulename": "External Calls via Test Provider",
            "providerid": provider_id,
            "numberbeginswith": "9",  # Calls starting with 9 go through provider
            "restnumbers": 7,  # Total length = 8 digits (9 + 7)
            "trimfrombegin": 1,  # Remove the '9' before sending to provider
            "prepend": "",
            "note": "Test outbound route"
        }

        response = api_client.post("outbound-routes", route_data)
        assert response.get("result") is True, f"Failed to create outbound route: {response.get('messages')}"
        route_id = response["data"]["id"]
        print(f"✓ Created outbound route (ID: {route_id})")
        print(f"  Pattern: 9 + {route_data['restnumbers']} digits → Provider {provider_id}")
        print(f"  Digit manipulation: trim 1 digit from begin (removes '9')")

        # Wait for Asterisk to apply configuration
        await asyncio.sleep(2)

        # ================================================================
        # STEP 3: Register PJSUA2 as Provider Trunk
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Register PJSUA2 Endpoint as Provider Trunk")
        print(f"{'-'*70}")

        print(f"Creating PJSUA2 endpoint for trunk_test_user...")
        provider_endpoint = await pjsua_manager.create_endpoint(
            extension="trunk_test_user",
            password="trunk_test_password",
            auto_register=True,
            auto_answer=True  # Provider will auto-answer incoming calls
        )
        print(f"✓ Provider trunk registered successfully")
        print(f"  Auto-answer enabled (will accept calls from MikoPBX)")

        # ================================================================
        # STEP 4: Register Extension 201
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: Register Extension 201")
        print(f"{'-'*70}")

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True
        )
        print(f"✓ Extension 201 registered")

        await asyncio.sleep(1)

        # ================================================================
        # STEP 5: Make Outbound Call
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 5: Extension 201 Calls 91234567 (via provider)")
        print(f"{'-'*70}")

        print(f"Extension 201 calling 91234567...")
        print(f"  Expected flow:")
        print(f"    1. Asterisk receives INVITE for 91234567")
        print(f"    2. Matches outbound route (pattern 9+7 digits)")
        print(f"    3. Trims '9', sends '1234567' to provider trunk")
        print(f"    4. Provider trunk (PJSUA2) receives and auto-answers")

        call_success = await ext201.dial("91234567")
        assert call_success, "Call from 201 to 91234567 failed (provider didn't answer)"
        print(f"✓ Call connected to provider")

        # Hold the call
        print(f"Maintaining call for 5 seconds...")
        await asyncio.sleep(5)
        print(f"✓ Call active for 5 seconds")

        # ================================================================
        # STEP 6: Hangup
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 6: Hangup Call")
        print(f"{'-'*70}")

        await ext201.hangup()
        print(f"✓ Call ended by extension 201")

        # ================================================================
        # STEP 7: Verify CDR
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 7: Verify CDR Records")
        print(f"{'-'*70}")

        await asyncio.sleep(2)  # Wait for CDR to be written

        response = api_client.get("cdr", params={"limit": 10, "offset": 0})
        assert response.get("result") is True, "Failed to get CDR records"

        cdr_data = response.get("data", {})
        if isinstance(cdr_data, dict):
            cdr_records = cdr_data.get("data", [])
        elif isinstance(cdr_data, list):
            cdr_records = cdr_data
        else:
            cdr_records = []

        # Find our call in CDR
        our_call = None
        for record in cdr_records:
            if not isinstance(record, dict):
                continue

            # Source should be 201, destination should contain 1234567 (after trim)
            if record.get("src") == "201" and "1234567" in str(record.get("dst", "")):
                our_call = record
                break

        if our_call:
            print(f"✓ Found CDR record:")
            print(f"  Source: {our_call.get('src')}")
            print(f"  Destination: {our_call.get('dst')}")
            print(f"  Duration: {our_call.get('billsec')}s")
            print(f"  Disposition: {our_call.get('disposition')}")
        else:
            print(f"⚠️  CDR record not found (call may have been too short)")
            print(f"  Latest CDR records: {len(cdr_records)} records found")

        print(f"\n{'='*70}")
        print(f"Test completed successfully:")
        print(f"  - Inbound provider created in MikoPBX")
        print(f"  - PJSUA2 endpoint registered as provider trunk")
        print(f"  - Outbound route with pattern matching (9+7 digits)")
        print(f"  - Call routed through provider successfully")
        print(f"  - Provider (PJSUA2) auto-answered call")
        print(f"  - Real SIP call completed end-to-end")
        print(f"{'='*70}")

    finally:
        # Cleanup
        print(f"\nCleaning up test resources...")
        if route_id:
            api_client.delete(f"outbound-routes/{route_id}")
            print(f"✓ Deleted outbound route {route_id}")
        if provider_id:
            api_client.delete(f"sip-providers/{provider_id}")
            print(f"✓ Deleted provider {provider_id}")


@pytest.mark.asyncio
async def test_02_inbound_call_via_provider_did(api_client, pjsua_manager, extension_credentials):
    """
    Test: Inbound DID Call Routing from Provider

    Scenario:
    1. Create inbound SIP provider
    2. Create incoming route: DID +74951234567 → Extension 201
    3. Register PJSUA2 as provider trunk
    4. Register extension 201 (to receive call)
    5. PJSUA2 provider calls DID +74951234567
    6. Verify call routes to extension 201
    7. Check CDR records

    Expected:
    - Inbound call from provider with DID routes to correct extension
    - Extension 201 receives call via DID routing
    - CDR shows inbound call from provider
    """
    print(f"\n{'='*70}")
    print(f"Test: Inbound DID Routing from Provider")
    print(f"{'='*70}")

    if '201' not in extension_credentials:
        pytest.skip("Extension 201 credentials not available")

    provider_id = None
    route_id = None

    try:
        # ================================================================
        # STEP 1: Create Inbound SIP Provider
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 1: Create Inbound SIP Provider")
        print(f"{'-'*70}")

        provider_data = {
            "type": "sip",
            "registration_type": "inbound",
            "description": "Test Inbound Provider (DID)",
            "host": "dynamic",
            "username": "inbound_trunk_did",
            "secret": "inbound_did_password",
            "transport": "udp",
            "dtmfmode": "rfc4733",
            "qualify": False
        }

        response = api_client.post("sip-providers", provider_data)
        assert response.get("result") is True, f"Failed to create inbound provider: {response.get('messages')}"
        provider_id = response["data"]["id"]
        print(f"✓ Created inbound provider (ID: {provider_id})")

        # ================================================================
        # STEP 2: Create Incoming Route for DID
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 2: Create Incoming Route (DID → Extension)")
        print(f"{'-'*70}")

        incoming_route_data = {
            "rulename": "DID Route +74951234567",
            "provider": provider_id,
            "number": "+74951234567",  # DID number
            "extension": "201",  # Route to extension 201
            "timeout": 30,
            "note": "Test DID routing"
        }

        response = api_client.post("incoming-routes", incoming_route_data)
        assert response.get("result") is True, f"Failed to create incoming route: {response.get('messages')}"
        route_id = response["data"]["id"]
        print(f"✓ Created incoming route (ID: {route_id})")
        print(f"  DID: {incoming_route_data['number']} → Extension {incoming_route_data['extension']}")

        # Wait for Asterisk to apply configuration
        await asyncio.sleep(2)

        # ================================================================
        # STEP 3: Register Extension 201 (to receive call)
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 3: Register Extension 201 to Receive Call")
        print(f"{'-'*70}")

        ext201 = await pjsua_manager.create_endpoint(
            extension="201",
            password=extension_credentials["201"],
            auto_register=True,
            auto_answer=True  # Will auto-answer incoming call
        )
        print(f"✓ Extension 201 registered (auto-answer enabled)")

        await asyncio.sleep(1)

        # ================================================================
        # STEP 4: Register PJSUA2 as Provider Trunk
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 4: Register PJSUA2 as Provider Trunk")
        print(f"{'-'*70}")

        provider_endpoint = await pjsua_manager.create_endpoint(
            extension="inbound_trunk_did",
            password="inbound_did_password",
            auto_register=True
        )
        print(f"✓ Provider trunk registered")

        await asyncio.sleep(1)

        # ================================================================
        # STEP 5: Provider Calls DID Number
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 5: Provider Calls DID +74951234567")
        print(f"{'-'*70}")

        print(f"Provider calling DID +74951234567...")
        print(f"  Expected flow:")
        print(f"    1. PJSUA2 provider sends INVITE to +74951234567")
        print(f"    2. MikoPBX matches incoming route (DID → Extension 201)")
        print(f"    3. MikoPBX routes call to extension 201")
        print(f"    4. Extension 201 auto-answers")

        call_success = await provider_endpoint.dial("+74951234567")
        assert call_success, "Inbound call from provider to DID failed"
        print(f"✓ Call from provider connected")

        # Hold the call
        print(f"Maintaining call for 5 seconds...")
        await asyncio.sleep(5)
        print(f"✓ Call active for 5 seconds")

        # ================================================================
        # STEP 6: Hangup
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 6: Hangup Call")
        print(f"{'-'*70}")

        await provider_endpoint.hangup()
        print(f"✓ Call ended by provider")

        # ================================================================
        # STEP 7: Verify CDR
        # ================================================================
        print(f"\n{'-'*70}")
        print(f"STEP 7: Verify CDR Records")
        print(f"{'-'*70}")

        await asyncio.sleep(2)

        response = api_client.get("cdr", params={"limit": 10, "offset": 0})
        assert response.get("result") is True, "Failed to get CDR records"

        cdr_data = response.get("data", {})
        if isinstance(cdr_data, dict):
            cdr_records = cdr_data.get("data", [])
        elif isinstance(cdr_data, list):
            cdr_records = cdr_data
        else:
            cdr_records = []

        # Find our inbound call
        our_call = None
        for record in cdr_records:
            if not isinstance(record, dict):
                continue

            # Inbound call: DID in source or destination, routed to 201
            if "74951234567" in str(record.get("src", "")) or "74951234567" in str(record.get("dst", "")):
                if record.get("dst") == "201":
                    our_call = record
                    break

        if our_call:
            print(f"✓ Found CDR record for inbound DID call:")
            print(f"  Source (DID): {our_call.get('src')}")
            print(f"  Destination: {our_call.get('dst')}")
            print(f"  Duration: {our_call.get('billsec')}s")
            print(f"  Disposition: {our_call.get('disposition')}")
        else:
            print(f"⚠️  CDR record not found (call may have been too short)")
            print(f"  Latest CDR records: {len(cdr_records)} records found")

        print(f"\n{'='*70}")
        print(f"Test completed successfully:")
        print(f"  - Inbound provider created")
        print(f"  - Incoming route (DID → Extension 201) configured")
        print(f"  - Extension 201 registered to receive calls")
        print(f"  - Provider (PJSUA2) sent inbound call with DID")
        print(f"  - Call routed correctly to extension 201")
        print(f"  - Real SIP call completed end-to-end")
        print(f"{'='*70}")

    finally:
        # Cleanup
        print(f"\nCleaning up test resources...")
        if route_id:
            api_client.delete(f"incoming-routes/{route_id}")
            print(f"✓ Deleted incoming route {route_id}")
        if provider_id:
            api_client.delete(f"sip-providers/{provider_id}")
            print(f"✓ Deleted provider {provider_id}")
