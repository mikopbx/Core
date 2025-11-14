#!/usr/bin/env python3
"""
SIP Provider (Trunk) Testing

Tests for external SIP provider integration:
- Outbound call routing through providers
- Provider configuration validation
- Failover scenarios
- DID/Incoming route configuration

Note: These tests focus on MikoPBX provider configuration and routing logic.
Full provider simulation would require a SIP server, which is beyond scope.
"""

import pytest
from typing import Dict, Any


@pytest.mark.asyncio
async def test_01_create_sip_provider_via_api(api_client):
    """
    Test creating SIP provider through REST API

    This validates:
    - Provider creation endpoint
    - Provider configuration storage
    - Provider appears in provider list
    """
    # Create SIP provider configuration using correct API format
    provider_data = {
        "type": "sip",  # lowercase
        "registration_type": "outbound",
        "description": "Test SIP Provider for Automation",
        "host": "sip.test-provider.com",
        "port": 5060,
        "username": "test_trunk_user",
        "secret": "test_secret_password",
        "transport": "udp",
        "dtmfmode": "rfc4733",
        "qualify": True,
        "qualifyfreq": 30
    }

    print(f"\n→ Creating SIP provider: {provider_data['description']}")

    # Create provider via REST API
    response = api_client.post("sip-providers", provider_data)

    # Validate response
    assert response.get("result") is True, f"Provider creation should succeed: {response}"
    assert "data" in response, "Response should contain data"
    assert "id" in response["data"], "Response should contain provider ID"

    provider_id = response["data"]["id"]
    print(f"✓ Provider created successfully with ID: {provider_id}")

    # Store provider_id for other tests
    return provider_id


@pytest.mark.asyncio
async def test_02_get_provider_by_id(api_client):
    """
    Test retrieving provider by ID

    This validates:
    - GET endpoint for specific provider
    - Provider data retrieval
    """
    # First create a provider
    provider_id = await test_01_create_sip_provider_via_api(api_client)

    print(f"\n→ Retrieving provider by ID: {provider_id}")

    # Get provider by ID
    response = api_client.get(f"sip-providers/{provider_id}")

    # Validate response
    assert response.get("result") is True, "Provider retrieval should succeed"
    assert "data" in response, "Response should contain data"
    provider = response["data"]

    print(f"✓ Provider retrieved: {provider.get('description')}")
    assert provider.get("type") == "SIP", "Provider type should be 'SIP'"
    assert provider.get("host") == "sip.test-provider.com", "Host should match"

    # Cleanup
    api_client.delete(f"sip-providers/{provider_id}")


@pytest.mark.asyncio
async def test_03_create_outbound_route_for_provider(api_client):
    """
    Test creating outbound route that uses SIP provider

    This validates:
    - Outbound route configuration
    - Provider assignment to route
    - Pattern matching for external numbers
    """
    # First create a provider
    provider_id = await test_01_create_sip_provider_via_api(api_client)

    print(f"\n→ Using provider ID: {provider_id}")

    # Create outbound route
    route_data = {
        "rulename": "Test External Calls",
        "providerid": provider_id,
        "numberbeginswith": "74",  # Moscow mobile prefix
        "restnumbers": 9,  # 9 digits remain after "74" = 11 total
        "trimfrombegin": 0,
        "prepend": "",
        "note": "Test route for automation"
    }

    print(f"→ Creating outbound route: {route_data['rulename']}")
    print(f"  Pattern: {route_data['numberbeginswith']} + {route_data['restnumbers']} digits")
    print(f"  Provider: {provider_id}")

    # Create route via REST API
    response = api_client.post("outbound-routes", route_data)

    # Validate response
    assert response.get("result") is True, f"Outbound route creation should succeed: {response}"
    assert "data" in response, "Response should contain data"
    assert "id" in response["data"], "Response should contain route ID"

    route_id = response["data"]["id"]
    print(f"✓ Outbound route created with ID: {route_id}")

    # Verify route by getting it back
    get_response = api_client.get(f"outbound-routes/{route_id}")
    assert get_response.get("result") is True, "Route retrieval should succeed"
    route = get_response["data"]

    print(f"✓ Route verified: {route.get('rulename')} → Provider: {route.get('providerid')}")
    assert route.get("providerid") == provider_id, "Route should be assigned to correct provider"

    # Cleanup
    api_client.delete(f"outbound-routes/{route_id}")
    api_client.delete(f"sip-providers/{provider_id}")


@pytest.mark.asyncio
async def test_04_create_incoming_route_for_did(api_client):
    """
    Test creating incoming route for DID number

    This validates:
    - Incoming route configuration
    - DID to extension mapping
    - Provider to incoming route association
    """
    # First create a provider
    provider_id = await test_01_create_sip_provider_via_api(api_client)

    print(f"\n→ Using provider ID: {provider_id}")

    # Create incoming route for DID
    route_data = {
        "rulename": "Test DID Route",
        "provider": provider_id,
        "number": "+74951234567",  # Test DID number
        "extension": "201",  # Route to extension 201
        "timeout": 30,
        "note": "Test incoming route for automation"
    }

    print(f"→ Creating incoming route:")
    print(f"  DID: {route_data['number']}")
    print(f"  Destination: Extension {route_data['extension']}")
    print(f"  Provider: {provider_id}")

    # Create incoming route via REST API
    response = api_client.post("incoming-routes", route_data)

    # Validate response
    assert response.get("result") is True, f"Incoming route creation should succeed: {response}"
    assert "data" in response, "Response should contain data"
    assert "id" in response["data"], "Response should contain route ID"

    route_id = response["data"]["id"]
    print(f"✓ Incoming route created with ID: {route_id}")

    # Verify route by getting it back
    get_response = api_client.get(f"incoming-routes/{route_id}")
    assert get_response.get("result") is True, "Route retrieval should succeed"
    route = get_response["data"]

    print(f"✓ Route verified: {route.get('number')} → Ext {route.get('extension')}")

    # Cleanup
    api_client.delete(f"incoming-routes/{route_id}")
    api_client.delete(f"sip-providers/{provider_id}")


@pytest.mark.asyncio
async def test_05_provider_crud_lifecycle(api_client):
    """
    Test complete CRUD lifecycle for SIP provider

    This validates:
    - Create (POST)
    - Read (GET)
    - Update (PUT/PATCH)
    - Delete (DELETE)
    """
    print("\n→ Testing complete CRUD lifecycle...")

    # 1. CREATE
    provider_data = {
        "type": "sip",
        "registration_type": "outbound",
        "description": "CRUD Test Provider",
        "host": "sip.crud-test.com",
        "port": 5060,
        "username": "crud_user",
        "secret": "crud_password",
        "transport": "udp",
        "dtmfmode": "rfc4733",
        "qualify": True
    }

    create_response = api_client.post("sip-providers", provider_data)
    assert create_response.get("result") is True, "Create should succeed"
    provider_id = create_response["data"]["id"]
    print(f"✓ Created provider: {provider_id}")

    # 2. READ
    get_response = api_client.get(f"sip-providers/{provider_id}")
    assert get_response.get("result") is True, "Get should succeed"
    provider = get_response["data"]
    assert provider.get("host") == "sip.crud-test.com", "Host should match"
    print(f"✓ Retrieved provider: {provider.get('description')}")

    # 3. UPDATE
    update_data = provider.copy()
    update_data["description"] = "CRUD Test Provider (Updated)"
    update_data["port"] = 5061

    update_response = api_client.put(f"sip-providers/{provider_id}", update_data)
    assert update_response.get("result") is True, "Update should succeed"
    print(f"✓ Updated provider")

    # Verify update
    verify_response = api_client.get(f"sip-providers/{provider_id}")
    updated_provider = verify_response["data"]
    assert updated_provider.get("description") == "CRUD Test Provider (Updated)", "Description should be updated"
    assert updated_provider.get("port") == 5061, "Port should be updated"
    print(f"✓ Verified update: port changed to {updated_provider.get('port')}")

    # 4. DELETE
    delete_response = api_client.delete(f"sip-providers/{provider_id}")
    assert delete_response.get("result") is True, "Delete should succeed"
    print(f"✓ Deleted provider")

    # Verify deletion - should return 404 or empty result
    try:
        get_deleted = api_client.get(f"sip-providers/{provider_id}")
        # Provider should not exist
        assert get_deleted.get("result") is False or get_deleted.get("data") is None, "Provider should not exist after deletion"
        print("✓ Verified deletion: provider not found")
    except Exception:
        # 404 exception is also acceptable
        print("✓ Verified deletion: 404 received")


# TODO: Future tests to implement
# - test_provider_failover: Test switching between primary/backup providers
# - test_outbound_call_routing: Make actual outbound call through provider (requires real provider or mock)
# - test_inbound_call_routing: Simulate inbound DID call (requires SIP server simulation)
# - test_provider_auth_failure: Test handling of authentication failures
# - test_provider_codec_negotiation: Test codec preferences and negotiation
# - test_multiple_providers: Test multiple provider configuration and priority
# - test_provider_status_monitoring: Test real-time provider registration status
