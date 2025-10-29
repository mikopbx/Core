#!/usr/bin/env python3
"""
Test suite for Provider Status Operations (getHistory, forceCheck, getStatus)

Tests the status monitoring and history features for both SIP and IAX providers.
These endpoints provide real-time status information and historical state changes.
"""
import pytest
import time
from conftest import assert_api_success


class TestSIPProviderStatusOperations:
    """Test status operations for SIP providers"""

    def test_01_get_sip_provider_status(self, api_client, sample_sip_provider):
        """Test getting status for a SIP provider"""
        response = api_client.get(f'sip-providers/{sample_sip_provider}:getStatus')
        assert_api_success(response, "Failed to get SIP provider status")

        # Verify status structure
        assert 'id' in response['data'], "Status should include provider ID"
        assert 'type' in response['data'], "Status should include provider type"
        assert 'state' in response['data'], "Status should include current state"
        assert 'stateText' in response['data'], "Status should include state text"
        assert 'stateColor' in response['data'], "Status should include state color"

        print(f"✓ Retrieved SIP provider status: {response['data']['state']}")
        print(f"  State: {response['data']['stateText']} ({response['data']['stateColor']})")

    def test_02_force_check_sip_provider(self, api_client, sample_sip_provider):
        """Test forcing a status check for SIP provider"""
        response = api_client.post(f'sip-providers/{sample_sip_provider}:forceCheck', data={})
        assert_api_success(response, "Failed to force check SIP provider")

        # Wait a moment for the check to complete
        time.sleep(1)

        # Verify we can get status after force check
        status_response = api_client.get(f'sip-providers/{sample_sip_provider}:getStatus')
        assert_api_success(status_response, "Failed to get status after force check")

        print(f"✓ Force check completed for SIP provider")
        print(f"  Current state: {status_response['data']['state']}")

    def test_03_get_sip_provider_history(self, api_client, sample_sip_provider):
        """Test getting history for a SIP provider"""
        # Force a check to ensure we have some history
        api_client.post(f'sip-providers/{sample_sip_provider}:forceCheck', data={})
        time.sleep(1)

        response = api_client.get(f'sip-providers/{sample_sip_provider}:getHistory')
        assert_api_success(response, "Failed to get SIP provider history")

        # Verify history structure
        data = response['data']
        assert 'provider' in data, "History should include provider info"
        assert 'events' in data, "History should include events array"
        assert 'count' in data, "History should include event count"
        assert 'limit' in data, "History should include limit"

        print(f"✓ Retrieved SIP provider history")
        print(f"  Provider: {data['provider']['description'] if 'description' in data['provider'] else 'N/A'}")
        print(f"  Events count: {data['count']}")
        print(f"  Total available: {data.get('totalAvailable', 'N/A')}")

        # If we have events, verify their structure
        if data['events']:
            first_event = data['events'][0]
            print(f"  Latest event: {first_event.get('datetime', 'N/A')}")
            print(f"    State: {first_event.get('state', 'N/A')}")

    def test_04_get_sip_provider_history_with_limit(self, api_client, sample_sip_provider):
        """Test getting history with custom limit"""
        response = api_client.get(f'sip-providers/{sample_sip_provider}:getHistory', params={'limit': 5})
        assert_api_success(response, "Failed to get SIP provider history with limit")

        data = response['data']
        assert data['limit'] == 5, "Limit should be 5"
        assert len(data['events']) <= 5, "Should return at most 5 events"

        print(f"✓ Retrieved SIP provider history with limit=5")
        print(f"  Events returned: {len(data['events'])}")

    def test_05_get_sip_provider_status_with_refresh(self, api_client, sample_sip_provider):
        """Test getting status with refresh from AMI"""
        response = api_client.get(
            f'sip-providers/{sample_sip_provider}:getStatus',
            params={'refreshFromAmi': 'true'}
        )
        assert_api_success(response, "Failed to get SIP provider status with refresh")

        print(f"✓ Retrieved SIP provider status with AMI refresh")
        print(f"  State: {response['data']['state']}")


class TestIAXProviderStatusOperations:
    """Test status operations for IAX providers"""

    def test_01_get_iax_provider_status(self, api_client, sample_iax_provider):
        """Test getting status for an IAX provider"""
        response = api_client.get(f'iax-providers/{sample_iax_provider}:getStatus')
        assert_api_success(response, "Failed to get IAX provider status")

        # Verify status structure
        assert 'id' in response['data'], "Status should include provider ID"
        assert 'type' in response['data'], "Status should include provider type"
        assert 'state' in response['data'], "Status should include current state"
        assert response['data']['type'] == 'iax', "Provider type should be 'iax'"

        print(f"✓ Retrieved IAX provider status: {response['data']['state']}")
        print(f"  State: {response['data']['stateText']} ({response['data']['stateColor']})")

    def test_02_force_check_iax_provider(self, api_client, sample_iax_provider):
        """Test forcing a status check for IAX provider"""
        response = api_client.post(f'iax-providers/{sample_iax_provider}:forceCheck', data={})
        assert_api_success(response, "Failed to force check IAX provider")

        # Wait a moment for the check to complete
        time.sleep(1)

        # Verify we can get status after force check
        status_response = api_client.get(f'iax-providers/{sample_iax_provider}:getStatus')
        assert_api_success(status_response, "Failed to get status after force check")

        print(f"✓ Force check completed for IAX provider")
        print(f"  Current state: {status_response['data']['state']}")

    def test_03_get_iax_provider_history(self, api_client, sample_iax_provider):
        """Test getting history for an IAX provider"""
        # Force a check to ensure we have some history
        api_client.post(f'iax-providers/{sample_iax_provider}:forceCheck', data={})
        time.sleep(1)

        response = api_client.get(f'iax-providers/{sample_iax_provider}:getHistory')
        assert_api_success(response, "Failed to get IAX provider history")

        # Verify history structure
        data = response['data']
        assert 'provider' in data, "History should include provider info"
        assert 'events' in data, "History should include events array"
        assert 'count' in data, "History should include event count"

        print(f"✓ Retrieved IAX provider history")
        print(f"  Provider: {data['provider'].get('description', 'N/A')}")
        print(f"  Events count: {data['count']}")
        print(f"  Total available: {data.get('totalAvailable', 'N/A')}")

    def test_04_get_iax_provider_history_with_statistics(self, api_client, sample_iax_provider):
        """Test that history includes statistics"""
        response = api_client.get(f'iax-providers/{sample_iax_provider}:getHistory')
        assert_api_success(response, "Failed to get IAX provider history")

        data = response['data']
        if 'statistics' in data and data['statistics']:
            stats = data['statistics']
            print(f"✓ History includes statistics")
            print(f"  Total events: {stats.get('totalEvents', 'N/A')}")
            print(f"  State changes: {stats.get('stateChanges', 'N/A')}")
            print(f"  Errors: {stats.get('errors', 'N/A')}")
            print(f"  Recoveries: {stats.get('recoveries', 'N/A')}")
        else:
            print(f"⚠ No statistics available (history might be empty)")


class TestUnifiedProviderStatusOperations:
    """Test status operations via unified providers endpoint"""

    def test_01_get_all_provider_statuses(self, api_client):
        """Test getting all provider statuses via unified endpoint"""
        response = api_client.get('providers:getStatuses')
        assert_api_success(response, "Failed to get all provider statuses")

        data = response['data']
        assert 'sip' in data or 'iax' in data, "Response should include sip or iax providers"

        sip_count = len(data.get('sip', {})) if isinstance(data.get('sip'), dict) else 0
        iax_count = len(data.get('iax', {})) if isinstance(data.get('iax'), dict) else 0

        print(f"✓ Retrieved all provider statuses")
        print(f"  SIP providers: {sip_count}")
        print(f"  IAX providers: {iax_count}")

    def test_02_get_specific_provider_status_via_unified(self, api_client, sample_sip_provider):
        """Test getting specific provider status via unified endpoint"""
        response = api_client.get(f'providers/{sample_sip_provider}:getStatus')
        assert_api_success(response, "Failed to get provider status via unified endpoint")

        print(f"✓ Retrieved provider status via unified endpoint")
        print(f"  State: {response['data']['state']}")

    def test_03_get_provider_history_via_unified(self, api_client, sample_sip_provider):
        """Test getting provider history via unified endpoint"""
        response = api_client.get(f'providers/{sample_sip_provider}:getHistory')
        assert_api_success(response, "Failed to get provider history via unified endpoint")

        data = response['data']
        print(f"✓ Retrieved provider history via unified endpoint")
        print(f"  Events count: {data['count']}")


class TestProviderStatusEdgeCases:
    """Test edge cases and error handling"""

    def test_01_get_status_for_nonexistent_provider(self, api_client):
        """Test getting status for non-existent provider"""
        try:
            response = api_client.get('sip-providers/SIP-NONEXISTENT:getStatus')
            # If successful, should return UNKNOWN state
            assert response['data']['state'] in ['UNKNOWN', 'unknown'], \
                "Non-existent provider should have UNKNOWN state"
            print(f"✓ Non-existent provider returns UNKNOWN state")
        except Exception as e:
            # Or should return an error
            assert '422' in str(e) or '404' in str(e), "Should return 404 or 422 error"
            print(f"✓ Correctly handled non-existent provider with error: {type(e).__name__}")

    def test_02_get_history_for_nonexistent_provider(self, api_client):
        """Test getting history for non-existent provider"""
        response = api_client.get('sip-providers/SIP-NONEXISTENT:getHistory')

        # GetHistoryAction returns success with empty history even for non-existent providers
        # as long as the ID has the correct format
        # Note: response uses 'result' field, not 'success'
        assert response.get('result') == True or response.get('success') == True, "Should be successful"
        assert response['data']['count'] == 0, "Should have no events"
        assert 'provider' in response['data'], "Should include provider info"
        print(f"✓ Non-existent provider returns empty history with success")

    def test_03_force_check_with_invalid_id(self, api_client):
        """Test force check with invalid provider ID"""
        try:
            response = api_client.post('sip-providers/INVALID-ID:forceCheck', data={})
            # If successful, should handle gracefully
            assert response.get('success') == False or \
                   response['data'].get('state') == 'UNKNOWN', \
                   "Should fail or return UNKNOWN for invalid ID"
            print(f"✓ Correctly handled invalid provider ID")
        except Exception as e:
            # Invalid ID format should return 404
            assert '404' in str(e), "Should return 404 for invalid ID format"
            print(f"✓ Correctly rejected invalid provider ID format with 404")

    def test_04_get_history_with_large_limit(self, api_client, sample_sip_provider):
        """Test getting history with very large limit"""
        response = api_client.get(
            f'sip-providers/{sample_sip_provider}:getHistory',
            params={'limit': 9999}
        )
        assert_api_success(response, "Failed to get history with large limit")

        # Limit should be capped at MAX_LIMIT (1000)
        data = response['data']
        assert data['limit'] <= 1000, "Limit should be capped at 1000"

        print(f"✓ Large limit correctly capped")
        print(f"  Requested: 9999, Actual: {data['limit']}")

    def test_05_get_history_with_zero_limit(self, api_client, sample_sip_provider):
        """Test getting history with zero limit"""
        response = api_client.get(
            f'sip-providers/{sample_sip_provider}:getHistory',
            params={'limit': 0}
        )
        assert_api_success(response, "Failed to get history with zero limit")

        # Limit should be adjusted to minimum (1)
        data = response['data']
        assert data['limit'] >= 1, "Limit should be at least 1"

        print(f"✓ Zero limit correctly adjusted")
        print(f"  Adjusted to: {data['limit']}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
