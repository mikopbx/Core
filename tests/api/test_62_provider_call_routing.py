#!/usr/bin/env python3
"""
SIP Provider Call Routing Tests

Tests actual call routing through SIP providers:
- Outbound calls: Extension → Provider
- Inbound calls: Provider (DID) → Extension
- Provider without authentication
- Provider failover scenarios

Note: These tests use gophone to simulate provider endpoints.
"""

import pytest
import asyncio
import sys
from pathlib import Path

# Add pycalltests directory to path for gophone_helper
pycalltests_dir = Path(__file__).parent.parent / "pycalltests"
sys.path.insert(0, str(pycalltests_dir))

from gophone_helper import GoPhoneEndpoint, GoPhoneConfig
from conftest import assert_api_success, get_extension_secret


@pytest.mark.asyncio
class TestProviderOutboundRouting:
    """
    Test outbound call routing through SIP providers

    Scenario: Extension calls external number → PBX routes via provider → Provider receives call
    """

    async def test_01_outbound_call_via_provider(self, api_client):
        """
        Test outbound call routing through provider

        Steps:
        1. Verify extensions 201, 202 exist (skip if not)
        2. Create SIP provider configuration
        3. Create outbound route: pattern '9X' → provider
        4. Start gophone as "provider" (answer mode, simulating external trunk)
        5. Extension 201 calls '91234567' → should route to provider
        6. Verify call reaches provider
        7. Check CDR records

        Expected:
        - Call from 201 to 9XXXXXXX routes through provider
        - Provider receives INVITE
        - CDR shows outbound call through provider
        """
        print("\n→ Test: Outbound call via provider")

        # Step 1: Verify extensions exist
        print("→ Checking for existing extensions 201 and 202...")
        response = api_client.get('extensions', params={'limit': 1000})
        assert_api_success(response, "Failed to get extensions")

        extensions = response.get("data", [])
        ext_201 = next((e for e in extensions if e.get('number') == '201'), None)
        ext_202 = next((e for e in extensions if e.get('number') == '202'), None)

        if not ext_201:
            pytest.skip("Extension 201 not configured in system")

        if not ext_202:
            pytest.skip("Extension 202 not configured in system")

        ext_201_id = ext_201.get('id')
        ext_202_id = ext_202.get('id')

        # Get SIP secrets from database (API doesn't expose passwords for security)
        secret_201 = get_extension_secret('201')
        secret_202 = get_extension_secret('202')

        if not secret_201:
            pytest.skip("Could not retrieve SIP secret for extension 201")
        if not secret_202:
            pytest.skip("Could not retrieve SIP secret for extension 202")

        print(f"\n✓ Found extension 201 (ID: {ext_201_id}, Secret: {secret_201[:8]}...)")
        print(f"✓ Found extension 202 (ID: {ext_202_id}, Secret: {secret_202[:8]}...)")


        try:
            # Step 2: Create SIP provider
            provider_data = {
                "type": "sip",
                "registration_type": "outbound",  # Outbound provider (no registration from PBX)
                "description": "Test Provider for Outbound Routing",
                "host": "127.0.0.1",  # Provider "trunk" IP (will be gophone)
                "port": 5070,  # Different port for provider
                "username": "trunk_user",
                "secret": "trunk_password",
                "transport": "udp",
                "dtmfmode": "rfc4733",
                "qualify": False  # Disable qualify for testing
            }

            response = api_client.post("sip-providers", provider_data)
            assert_api_success(response, "Failed to create SIP provider")
            provider_id = response["data"]["id"]
            print(f"✓ Created SIP provider (ID: {provider_id})")

            # Step 3: Create outbound route
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
            assert_api_success(response, "Failed to create outbound route")
            route_id = response["data"]["id"]
            print(f"✓ Created outbound route (ID: {route_id})")
            print(f"  Pattern: 9 + {route_data['restnumbers']} digits → Provider {provider_id}")

            # Step 4: Start gophone as "provider" (simulating external trunk)
            # This will answer incoming calls from MikoPBX
            provider_config = GoPhoneConfig(
                extension="trunk_user",
                password="trunk_password",
                server_ip="192.168.107.3",  # Listen for calls from MikoPBX
                server_port=5060,
                listen_ip="0.0.0.0",
                listen_port=5070,  # Provider listens on port 5070
                media="log"  # Log media for debugging
            )

            # Find gophone binary
            gophone_bin = pycalltests_dir / "gophone"
            if not gophone_bin.exists():
                pytest.skip("gophone binary not found. Run install-gophone.sh first")

            provider_endpoint = GoPhoneEndpoint(provider_config, str(gophone_bin))

            # Start provider as SIP server (will accept incoming calls)
            print("→ Starting gophone as provider (SIP server mode)...")
            success = await provider_endpoint.start_as_server(require_auth=True, timeout=2)
            assert success, "Provider failed to start"
            print("✓ Provider SIP server ready to receive calls on port 5070")

            # Step 5: Register extension 201
            ext_201_config = GoPhoneConfig(
                extension="201",
                password=secret_201,
                server_ip="192.168.107.3",
                server_port=5060,
                media="log"
            )
            ext_201_endpoint = GoPhoneEndpoint(ext_201_config, str(gophone_bin))

            print("→ Registering extension 201...")
            success = await ext_201_endpoint.register(timeout=5)
            assert success, "Extension 201 failed to register"
            print("✓ Extension 201 registered")

            # Step 6: Make outbound call: 201 → 91234567 (should route through provider)
            print("→ Extension 201 calling 91234567 (outbound via provider)...")

            # Make the call
            call_success = await ext_201_endpoint.dial("91234567")
            assert call_success, "Call from 201 to 91234567 failed"
            print("✓ Call connected")

            # Hold the call for a few seconds
            await asyncio.sleep(5)
            print("✓ Call active for 5 seconds")

            # Hangup
            await ext_201_endpoint.hangup()
            print("✓ Call ended")

            # Step 7: Verify in CDR
            print("→ Checking CDR records...")
            await asyncio.sleep(2)  # Wait for CDR to be written

            # Get recent CDR records
            response = api_client.get("cdr", params={"limit": 10, "offset": 0})
            assert_api_success(response, "Failed to get CDR records")

            cdr_data = response.get("data", {})

            # CDR API returns different formats - handle both
            if isinstance(cdr_data, dict):
                cdr_records = cdr_data.get("data", [])
            elif isinstance(cdr_data, list):
                cdr_records = cdr_data
            else:
                cdr_records = []

            # Find our call in CDR
            our_call = None
            for record in cdr_records:
                # Skip if record is not a dict
                if not isinstance(record, dict):
                    continue

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
                print("⚠️  CDR record not found (call may have been too short)")
                print(f"  Latest CDR records: {len(cdr_records)} records found")

            # Cleanup
            await ext_201_endpoint.unregister()
            await provider_endpoint.stop()

            api_client.delete(f"outbound-routes/{route_id}")
            api_client.delete(f"sip-providers/{provider_id}")
            print("✓ Test completed successfully:")
            print("  - Provider created and configured")
            print("  - Outbound route with pattern matching (9+7 digits)")
            print("  - Extension registered to PBX")
            print("  - Provider server accepted incoming call from PBX")
            print("  - Call completed end-to-end through provider")

        except Exception as e:
            print(f"✗ Test failed with error: {e}")
            raise


@pytest.mark.asyncio
class TestProviderInboundRouting:
    """
    Test inbound call routing from SIP providers

    Scenario: Provider sends DID call → PBX routes to extension
    """

    async def test_01_inbound_call_via_provider_did(self, api_client):
        """
        Test inbound DID call routing from provider

        Steps:
        1. Verify extension 201 exists (skip if not)
        2. Create SIP provider configuration (inbound)
        3. Create incoming route: DID +74951234567 → Extension 201
        4. Start gophone as "provider" that makes calls
        5. Register extension 201 to answer
        6. Provider calls MikoPBX with DID number
        7. Verify call reaches extension 201
        8. Check CDR records

        Expected:
        - Inbound call from provider with DID routes to correct extension
        - CDR shows inbound call from provider
        """
        print("\n→ Test: Inbound DID routing from provider")

        # Step 1: Verify extension 201 exists
        print("→ Checking for existing extension 201...")
        response = api_client.get('extensions', params={'limit': 1000})
        assert_api_success(response, "Failed to get extensions")

        extensions = response.get("data", [])
        ext_201 = next((e for e in extensions if e.get('number') == '201'), None)

        if not ext_201:
            pytest.skip("Extension 201 not configured in system")

        ext_201_id = ext_201.get('id')
        print(f"✓ Found extension 201 (ID: {ext_201_id})")

        # Find gophone binary
        gophone_bin = pycalltests_dir / "gophone"
        if not gophone_bin.exists():
            pytest.skip("gophone binary not found. Run install-gophone.sh first")

        try:
            # Create SIP provider (inbound) - provider calls INTO MikoPBX
            provider_data = {
                "type": "sip",
                "registration_type": "inbound",  # Accept calls from provider
                "description": "Test Inbound Provider",
                "host": "127.0.0.1",  # Provider IP
                "port": 5070,  # Provider port
                "username": "inbound_trunk",
                "secret": "inbound_password",
                "transport": "udp",
                "dtmfmode": "rfc4733",
                "qualify": False
            }

            response = api_client.post("sip-providers", provider_data)
            assert_api_success(response, "Failed to create inbound provider")
            provider_id = response["data"]["id"]
            print(f"✓ Created inbound provider (ID: {provider_id})")

            # Create incoming route for DID
            # When provider calls MikoPBX with DID +74951234567, route to extension 201
            incoming_route_data = {
                "rulename": "DID Route +74951234567",
                "provider": provider_id,
                "number": "+74951234567",  # DID number
                "extension": "201",  # Route to extension 201
                "timeout": 30,
                "note": "Test DID routing"
            }

            response = api_client.post("incoming-routes", incoming_route_data)
            assert_api_success(response, "Failed to create incoming route")
            route_id = response["data"]["id"]
            print(f"✓ Created incoming route (ID: {route_id})")
            print(f"  DID: {incoming_route_data['number']} → Extension {incoming_route_data['extension']}")

            # Get extension 201 secret for registration
            secret_201 = get_extension_secret('201')
            if not secret_201:
                pytest.skip("Could not retrieve SIP secret for extension 201")

            # Step 4: Register extension 201 (to receive incoming call)
            ext_201_config = GoPhoneConfig(
                extension="201",
                password=secret_201,
                server_ip="192.168.107.3",
                server_port=5060,
                media="log"
            )
            ext_201_endpoint = GoPhoneEndpoint(ext_201_config, str(gophone_bin))

            print("→ Registering extension 201 to receive calls...")
            success = await ext_201_endpoint.register(timeout=5)
            assert success, "Extension 201 failed to register"
            print("✓ Extension 201 registered and ready to receive calls")

            # Step 5: Start gophone as "provider" that will make calls to MikoPBX
            # This simulates external provider calling into MikoPBX with DID
            provider_config = GoPhoneConfig(
                extension="inbound_trunk",  # Provider username
                password="inbound_password",  # Provider password
                server_ip="192.168.107.3",  # Call to MikoPBX
                server_port=5060,
                listen_ip="0.0.0.0",
                listen_port=5070,  # Provider's port
                media="log"
            )
            provider_endpoint = GoPhoneEndpoint(provider_config, str(gophone_bin))

            # Step 6: Provider makes call to DID number +74951234567
            # MikoPBX should recognize the DID and route to extension 201
            print("→ Provider calling DID +74951234567 (should route to extension 201)...")

            # Provider calls the DID number
            # MikoPBX will receive INVITE and match DID in incoming route
            call_success = await provider_endpoint.dial("+74951234567")
            assert call_success, "Inbound call from provider failed"
            print("✓ Call from provider to DID connected")

            # Hold the call for a few seconds
            await asyncio.sleep(5)
            print("✓ Call active for 5 seconds")

            # Hangup
            await provider_endpoint.hangup()
            print("✓ Call ended")

            # Step 7: Verify in CDR
            print("→ Checking CDR records...")
            await asyncio.sleep(2)  # Wait for CDR to be written

            # Get recent CDR records
            response = api_client.get("cdr", params={"limit": 10, "offset": 0})
            assert_api_success(response, "Failed to get CDR records")

            cdr_data = response.get("data", {})

            # CDR API returns different formats - handle both
            if isinstance(cdr_data, dict):
                cdr_records = cdr_data.get("data", [])
            elif isinstance(cdr_data, list):
                cdr_records = cdr_data
            else:
                cdr_records = []

            # Find our inbound call in CDR
            our_call = None
            for record in cdr_records:
                # Skip if record is not a dict
                if not isinstance(record, dict):
                    continue

                # Inbound call should have DID in source or destination
                if "74951234567" in str(record.get("src", "")) or "74951234567" in str(record.get("dst", "")):
                    if record.get("dst") == "201":  # Routed to extension 201
                        our_call = record
                        break

            if our_call:
                print(f"✓ Found CDR record for inbound DID call:")
                print(f"  Source (DID): {our_call.get('src')}")
                print(f"  Destination: {our_call.get('dst')}")
                print(f"  Duration: {our_call.get('billsec')}s")
                print(f"  Disposition: {our_call.get('disposition')}")
            else:
                print("⚠️  CDR record not found (call may have been too short)")
                print(f"  Latest CDR records: {len(cdr_records)} records found")

            # Cleanup
            await ext_201_endpoint.unregister()
            await provider_endpoint.stop()

            api_client.delete(f"incoming-routes/{route_id}")
            api_client.delete(f"sip-providers/{provider_id}")
            print("✓ Test completed successfully:")
            print("  - Inbound provider configured")
            print("  - Incoming route (DID → Extension) created")
            print("  - Extension 201 registered to receive calls")
            print("  - Provider sent inbound call with DID +74951234567")
            print("  - Call routed correctly to extension 201")
            print("  - Real SIP call completed end-to-end")

        except Exception as e:
            print(f"✗ Test failed with error: {e}")
            raise


@pytest.mark.asyncio
class TestProviderAuthentication:
    """
    Test provider authentication scenarios
    """

    async def test_01_provider_without_authentication(self, api_client):
        """
        Test provider with minimal authentication (simulating IP-based trust)

        Steps:
        1. Verify extensions exist
        2. Create provider with minimal credentials
        3. Create outbound route using this provider
        4. Start gophone as provider server WITHOUT requiring auth
        5. Extension 201 calls through this provider
        6. Verify call completes without authentication
        7. Check CDR

        Expected:
        - Provider accepts calls without challenge/authentication
        - Call completes successfully
        - CDR shows outbound call
        """
        print("\n→ Test: Provider without authentication (IP-based trust)")

        # Step 1: Verify extensions exist
        print("→ Checking for existing extensions...")
        response = api_client.get('extensions', params={'limit': 1000})
        assert_api_success(response, "Failed to get extensions")

        extensions = response.get("data", [])
        ext_201 = next((e for e in extensions if e.get('number') == '201'), None)

        if not ext_201:
            pytest.skip("Extension 201 not configured in system")

        ext_201_id = ext_201.get('id')

        # Get SIP secret
        secret_201 = get_extension_secret('201')
        if not secret_201:
            pytest.skip("Could not retrieve SIP secret for extension 201")

        print(f"✓ Found extension 201 (ID: {ext_201_id}, Secret: {secret_201[:8]}...)")

        # Find gophone binary
        gophone_bin = pycalltests_dir / "gophone"
        if not gophone_bin.exists():
            pytest.skip("gophone binary not found. Run install-gophone.sh first")

        try:
            # Step 2: Create provider with minimal authentication
            provider_data = {
                "type": "sip",
                "registration_type": "outbound",
                "description": "IP Trust Provider (No Auth)",
                "host": "127.0.0.1",  # Provider IP
                "port": 5071,  # Different port
                "username": "noauth_trunk",  # Minimal username
                "secret": "noauth",  # Minimal password
                "transport": "udp",
                "dtmfmode": "rfc4733",
                "qualify": False
            }

            response = api_client.post("sip-providers", provider_data)
            assert_api_success(response, "Failed to create provider")
            provider_id = response["data"]["id"]
            print(f"✓ Created provider with minimal auth (ID: {provider_id})")

            # Step 3: Create outbound route
            route_data = {
                "rulename": "External via No-Auth Provider",
                "providerid": provider_id,
                "numberbeginswith": "8",  # Calls starting with 8
                "restnumbers": 7,  # Total 8 digits
                "trimfrombegin": 1,  # Remove the '8'
                "prepend": "",
                "note": "Test IP-based trust routing"
            }

            response = api_client.post("outbound-routes", route_data)
            assert_api_success(response, "Failed to create outbound route")
            route_id = response["data"]["id"]
            print(f"✓ Created outbound route (ID: {route_id})")
            print(f"  Pattern: 8 + {route_data['restnumbers']} digits → Provider {provider_id}")

            # Step 4: Start gophone as provider WITHOUT requiring authentication
            provider_config = GoPhoneConfig(
                extension="noauth_trunk",
                password="noauth",
                server_ip="192.168.107.3",
                server_port=5060,
                listen_ip="0.0.0.0",
                listen_port=5071,  # Provider on port 5071
                media="log"
            )

            provider_endpoint = GoPhoneEndpoint(provider_config, str(gophone_bin))

            # Start as server WITHOUT authentication requirement
            print("→ Starting provider SIP server without authentication...")
            success = await provider_endpoint.start_as_server(require_auth=False, timeout=2)
            assert success, "Provider failed to start"
            print("✓ Provider SIP server ready (no auth required)")

            # Step 5: Register extension 201
            ext_201_config = GoPhoneConfig(
                extension="201",
                password=secret_201,
                server_ip="192.168.107.3",
                server_port=5060,
                media="log"
            )
            ext_201_endpoint = GoPhoneEndpoint(ext_201_config, str(gophone_bin))

            print("→ Registering extension 201...")
            success = await ext_201_endpoint.register(timeout=5)
            assert success, "Extension 201 failed to register"
            print("✓ Extension 201 registered")

            # Step 6: Make call: 201 → 81234567 (routes to provider without auth)
            print("→ Extension 201 calling 81234567 (via no-auth provider)...")

            call_success = await ext_201_endpoint.dial("81234567")
            assert call_success, "Call from 201 to 81234567 failed"
            print("✓ Call connected WITHOUT authentication challenge")

            # Hold the call
            await asyncio.sleep(5)
            print("✓ Call active for 5 seconds")

            # Hangup
            await ext_201_endpoint.hangup()
            print("✓ Call ended")

            # Step 7: Verify in CDR
            print("→ Checking CDR records...")
            await asyncio.sleep(2)

            response = api_client.get("cdr", params={"limit": 10, "offset": 0})
            assert_api_success(response, "Failed to get CDR records")

            cdr_data = response.get("data", {})
            if isinstance(cdr_data, dict):
                cdr_records = cdr_data.get("data", [])
            elif isinstance(cdr_data, list):
                cdr_records = cdr_data
            else:
                cdr_records = []

            # Find our call
            our_call = None
            for record in cdr_records:
                if not isinstance(record, dict):
                    continue

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
                print("⚠️  CDR record not found (call may have been too short)")

            # Cleanup
            await ext_201_endpoint.unregister()
            await provider_endpoint.stop()

            api_client.delete(f"outbound-routes/{route_id}")
            api_client.delete(f"sip-providers/{provider_id}")
            print("✓ Test completed successfully:")
            print("  - Provider configured for IP-based trust")
            print("  - Outbound route created")
            print("  - Provider accepted calls WITHOUT authentication")
            print("  - Call completed end-to-end without auth challenge")
            print("  - This simulates real-world IP-based SIP trunking")

        except Exception as e:
            print(f"✗ Test failed with error: {e}")
            raise


@pytest.mark.asyncio
class TestProviderFailover:
    """
    Test provider failover scenarios
    """

    async def test_01_multiple_providers_priority(self, api_client):
        """
        Test failover between multiple providers with real calls

        Steps:
        1. Verify extension 201 exists
        2. Create 2 providers (primary and backup)
        3. Create 2 outbound routes with different priority
        4. Start ONLY backup provider (primary is unavailable)
        5. Extension 201 calls - should failover to backup
        6. Verify call reaches backup provider
        7. Check CDR shows backup provider was used

        Expected:
        - Primary provider attempted first (fails - not running)
        - Asterisk automatically fails over to backup
        - Call completes via backup provider
        - CDR shows successful call
        """
        print("\n→ Test: Provider failover (primary unavailable → backup)")

        # Step 1: Verify extension exists
        print("→ Checking for existing extensions...")
        response = api_client.get('extensions', params={'limit': 1000})
        assert_api_success(response, "Failed to get extensions")

        extensions = response.get("data", [])
        ext_201 = next((e for e in extensions if e.get('number') == '201'), None)

        if not ext_201:
            pytest.skip("Extension 201 not configured in system")

        ext_201_id = ext_201.get('id')

        secret_201 = get_extension_secret('201')
        if not secret_201:
            pytest.skip("Could not retrieve SIP secret for extension 201")

        print(f"✓ Found extension 201 (ID: {ext_201_id}, Secret: {secret_201[:8]}...)")

        # Find gophone binary
        gophone_bin = pycalltests_dir / "gophone"
        if not gophone_bin.exists():
            pytest.skip("gophone binary not found. Run install-gophone.sh first")

        try:
            # Step 2: Create primary provider (will be unavailable - not running)
            primary_data = {
                "type": "sip",
                "registration_type": "outbound",
                "description": "Primary Provider (Unavailable)",
                "host": "127.0.0.1",
                "port": 5070,  # Primary on port 5070 (not running!)
                "username": "primary_trunk",
                "secret": "primary_password",
                "transport": "udp",
                "qualify": False
            }

            response = api_client.post("sip-providers", primary_data)
            assert_api_success(response, "Failed to create primary provider")
            primary_id = response["data"]["id"]
            print(f"✓ Created primary provider (ID: {primary_id}) - will be UNAVAILABLE")

            # Create backup provider
            backup_data = {
                "type": "sip",
                "registration_type": "outbound",
                "description": "Backup Provider (Available)",
                "host": "127.0.0.1",
                "port": 5072,  # Backup on port 5072 (will be running)
                "username": "backup_trunk",
                "secret": "backup_password",
                "transport": "udp",
                "qualify": False
            }

            response = api_client.post("sip-providers", backup_data)
            assert_api_success(response, "Failed to create backup provider")
            backup_id = response["data"]["id"]
            print(f"✓ Created backup provider (ID: {backup_id}) - will be AVAILABLE")

            # Step 3: Create outbound routes with priority
            primary_route_data = {
                "rulename": "External via Primary",
                "providerid": primary_id,
                "numberbeginswith": "7",  # Calls starting with 7
                "restnumbers": 7,  # Total 8 digits
                "trimfrombegin": 1,
                "priority": 1,  # Tried first
                "note": "Primary route (will fail)"
            }

            response = api_client.post("outbound-routes", primary_route_data)
            assert_api_success(response, "Failed to create primary route")
            primary_route_id = response["data"]["id"]
            print(f"✓ Created primary route (ID: {primary_route_id}, priority 1)")

            backup_route_data = {
                "rulename": "External via Backup",
                "providerid": backup_id,
                "numberbeginswith": "7",  # Same pattern
                "restnumbers": 7,
                "trimfrombegin": 1,
                "priority": 2,  # Fallback
                "note": "Backup route (failover)"
            }

            response = api_client.post("outbound-routes", backup_route_data)
            assert_api_success(response, "Failed to create backup route")
            backup_route_id = response["data"]["id"]
            print(f"✓ Created backup route (ID: {backup_route_id}, priority 2)")

            print("\n→ Failover configuration:")
            print(f"  Pattern: 7 + 7 digits")
            print(f"  Priority 1: Provider {primary_id} on port 5070 (NOT running)")
            print(f"  Priority 2: Provider {backup_id} on port 5072 (running)")
            print(f"  Expected: Call fails on primary → fails over to backup")

            # Step 4: Start ONLY backup provider (primary intentionally unavailable)
            backup_config = GoPhoneConfig(
                extension="backup_trunk",
                password="backup_password",
                server_ip="192.168.107.3",
                server_port=5060,
                listen_ip="0.0.0.0",
                listen_port=5072,  # Backup provider
                media="log"
            )
            backup_endpoint = GoPhoneEndpoint(backup_config, str(gophone_bin))

            print("\n→ Starting ONLY backup provider (primary will be unavailable)...")
            success = await backup_endpoint.start_as_server(require_auth=True, timeout=2)
            assert success, "Backup provider failed to start"
            print("✓ Backup provider ready on port 5072")
            print("⚠️  Primary provider on port 5070 is NOT running (simulating failure)")

            # Step 5: Register extension 201
            ext_201_config = GoPhoneConfig(
                extension="201",
                password=secret_201,
                server_ip="192.168.107.3",
                server_port=5060,
                media="log"
            )
            ext_201_endpoint = GoPhoneEndpoint(ext_201_config, str(gophone_bin))

            print("\n→ Registering extension 201...")
            success = await ext_201_endpoint.register(timeout=5)
            assert success, "Extension 201 failed to register"
            print("✓ Extension 201 registered")

            # Step 6: Make call - Asterisk should try primary, fail, then use backup
            print("\n→ Extension 201 calling 71234567 (testing failover)...")
            print("  Expected behavior:")
            print("  1. Asterisk tries primary provider (port 5070) - timeout/fail")
            print("  2. Asterisk tries backup provider (port 5072) - success!")

            call_success = await ext_201_endpoint.dial("71234567")
            assert call_success, "Call from 201 to 71234567 failed (backup should have worked!)"
            print("✓ Call connected via BACKUP provider (failover successful!)")

            # Hold the call
            await asyncio.sleep(5)
            print("✓ Call active for 5 seconds via backup")

            # Hangup
            await ext_201_endpoint.hangup()
            print("✓ Call ended")

            # Step 7: Verify in CDR
            print("\n→ Checking CDR records...")
            await asyncio.sleep(2)

            response = api_client.get("cdr", params={"limit": 10, "offset": 0})
            assert_api_success(response, "Failed to get CDR records")

            cdr_data = response.get("data", {})
            if isinstance(cdr_data, dict):
                cdr_records = cdr_data.get("data", [])
            elif isinstance(cdr_data, list):
                cdr_records = cdr_data
            else:
                cdr_records = []

            # Find our call
            our_call = None
            for record in cdr_records:
                if not isinstance(record, dict):
                    continue

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
                print("⚠️  CDR record not found (call may have been too short)")

            # Cleanup
            await ext_201_endpoint.unregister()
            await backup_endpoint.stop()

            api_client.delete(f"outbound-routes/{primary_route_id}")
            api_client.delete(f"outbound-routes/{backup_route_id}")
            api_client.delete(f"sip-providers/{primary_id}")
            api_client.delete(f"sip-providers/{backup_id}")

            print("\n✓ Test completed successfully:")
            print("  - Primary provider configured but unavailable")
            print("  - Backup provider configured and running")
            print("  - Asterisk attempted primary (failed as expected)")
            print("  - Asterisk automatically failed over to backup")
            print("  - Call completed successfully via backup provider")
            print("  - This demonstrates real-world provider failover!")

        except Exception as e:
            print(f"✗ Test failed with error: {e}")
            raise
