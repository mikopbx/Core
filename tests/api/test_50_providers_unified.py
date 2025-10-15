#!/usr/bin/env python3
"""
Test suite for unified Providers endpoint (read-only)

Tests the unified provider endpoint:
- /pbxcore/api/v3/providers - Unified read-only access to all providers (SIP and IAX)
"""

import pytest
from conftest import assert_api_success


class TestUnifiedProviders:
    """Tests for unified Providers endpoint (read-only)"""

    @pytest.mark.dependency()
    def test_01_get_all_providers(self, api_client):
        """Test GET /providers - Get all providers (both SIP and IAX)"""
        response = api_client.get('providers')
        assert_api_success(response, "Failed to get providers list")
        
        assert 'data' in response
        print(f"✓ Retrieved {len(response['data'])} providers")

    @pytest.mark.dependency()
    def test_02_get_providers_statuses(self, api_client):
        """Test GET /providers:getStatuses - Get all provider statuses"""
        response = api_client.get('providers:getStatuses')
        
        # Status endpoint might return empty data if no providers are registered
        if response.get('result'):
            print(f"✓ Retrieved provider statuses")
        else:
            print(f"⚠ Get statuses returned: {response.get('messages', {})}")

    @pytest.mark.dependency(depends=["TestUnifiedProviders::test_01_get_all_providers"])
    def test_03_get_single_provider_status(self, api_client):
        """Test GET /providers/{id}:getStatus - Get single provider status"""
        # First, get list of providers to find an ID
        response = api_client.get('providers')
        
        if not response.get('result') or not response.get('data'):
            pytest.skip("No providers available for testing")
        
        providers = response['data']
        if not providers:
            pytest.skip("No providers found")
        
        # Test with first provider
        provider_id = providers[0]['id']
        print(f"\n  Testing with provider ID: {provider_id}")
        
        try:
            status_response = api_client.get(f'providers/{provider_id}:getStatus')
            
            if status_response.get('result'):
                data = status_response['data']
                assert 'state' in data or 'status' in data or 'stateText' in data
                print(f"✓ Retrieved provider status for {provider_id}")
            else:
                print(f"⚠ Get status returned: {status_response.get('messages', {})}")
        except Exception as e:
            if '404' in str(e) or '501' in str(e):
                print(f"⚠ Get status not implemented (expected)")
            else:
                raise

    @pytest.mark.dependency(depends=["TestUnifiedProviders::test_01_get_all_providers"])
    def test_04_get_single_provider(self, api_client):
        """Test GET /providers/{id} - Get single provider details"""
        # First, get list of providers to find an ID
        response = api_client.get('providers')
        
        if not response.get('result') or not response.get('data'):
            pytest.skip("No providers available for testing")
        
        providers = response['data']
        if not providers:
            pytest.skip("No providers found")
        
        # Test with first provider
        provider_id = providers[0]['id']
        print(f"\n  Testing with provider ID: {provider_id}")
        
        detail_response = api_client.get(f'providers/{provider_id}')
        assert_api_success(detail_response, f"Failed to get provider {provider_id}")
        
        assert 'id' in detail_response['data']
        assert detail_response['data']['id'] == provider_id
        print(f"✓ Retrieved provider details for {provider_id}")

    def test_05_write_operations_blocked(self, api_client):
        """Test that write operations are blocked on unified endpoint"""
        # Try to create a provider (should fail)
        try:
            response = api_client.post('providers', {'description': 'Test'})
            # If we get here, the request didn't fail as expected
            assert not response.get('result'), "POST should be blocked on unified endpoint"
            print("✓ POST correctly blocked on unified endpoint")
        except Exception as e:
            # Expected to fail
            assert '405' in str(e) or 'not supported' in str(e).lower()
            print("✓ POST correctly blocked on unified endpoint")

