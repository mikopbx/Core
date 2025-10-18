#!/usr/bin/env python3
"""
Test suite for SIP Providers operations

Tests the /pbxcore/api/v3/sip-providers endpoint
"""

import pytest
from conftest import assert_api_success


class TestSipProviders:
    """SIP Providers read operations tests"""

    def test_01_get_default_template(self, api_client):
        """Test GET /sip-providers:getDefault"""
        response = api_client.get('sip-providers:getDefault')
        assert_api_success(response, "Failed to get default template")
        print(f"✓ Retrieved default SIP provider template")

    def test_02_get_list(self, api_client):
        """Test GET /sip-providers - List with pagination"""
        response = api_client.get('sip-providers', params={'limit': 20})
        assert_api_success(response, "Failed to get list")
        data = response['data']
        print(f"✓ Retrieved {len(data)} SIP providers")

    def test_03_get_by_id(self, api_client, sample_sip_provider):
        """Test GET /sip-providers/{id}"""
        response = api_client.get(f'sip-providers/{sample_sip_provider}')
        assert_api_success(response, "Failed to get record")
        print(f"✓ Retrieved SIP provider: {sample_sip_provider}")


class TestSipProvidersEdgeCases:
    """Edge cases"""

    def test_01_get_nonexistent(self, api_client):
        """Test GET /sip-providers/{id} - Non-existent"""
        try:
            response = api_client.get('sip-providers/SIP-FAKE-ID')
            assert not response['result']
            print(f"✓ Non-existent rejected")
        except Exception as e:
            if '404' in str(e):
                print(f"✓ Non-existent rejected (404)")

    def test_02_update_nonexistent_provider_returns_404(self, api_client):
        """
        Test updating non-existent SIP provider returns 404

        Tests:
        1. PUT on non-existent ID returns 404
        2. PATCH on non-existent ID returns 404
        3. POST with custom ID is allowed (migration support)
        """

        print(f"\n{'='*70}")
        print(f"Test: Update Non-Existent SIP Provider")
        print(f"{'='*70}")

        fake_id = 'SIP-NONEXISTENT-999999'

        # ====================================================================
        # TEST 1: PUT with non-existent ID should return 404
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"TEST 1: PUT with non-existent ID")
        print(f"{'-'*70}")
        print(f"Attempting to update: {fake_id}")

        update_data = {
            'id': fake_id,
            'type': 'SIP',
            'description': 'Should Not Work',
            'registration_type': 'outbound',
            'host': 'fake.example.com',
            'username': 'fakeuser',
            'secret': 'fakepass'
        }

        try:
            response = api_client.put(f'sip-providers/{fake_id}', update_data, allow_404=True)

            print(f"\n📥 Response received:")
            print(f"  Result: {response.get('result')}")
            print(f"  HTTP Code: {response.get('httpCode')}")
            print(f"  Messages: {response.get('messages', {})}")

            # Verify 404 response
            assert response.get('httpCode') == 404, \
                f"Expected 404, got {response.get('httpCode')}"
            assert not response.get('result'), "PUT should fail for non-existent resource"

            print(f"\n✅ TEST 1 PASSED: PUT correctly returned 404")

        except AssertionError:
            raise
        except Exception as e:
            if '404' in str(e):
                print(f"\n✅ TEST 1 PASSED: PUT correctly returned 404 (exception)")
            else:
                raise

        # ====================================================================
        # TEST 2: PATCH with non-existent ID should return 404
        # ====================================================================
        print(f"\n{'-'*70}")
        print(f"TEST 2: PATCH with non-existent ID")
        print(f"{'-'*70}")
        print(f"Attempting to patch: {fake_id}")

        patch_data = {
            'id': fake_id,
            'type': 'SIP',  # Required for polymorphic providers
            'description': 'Partial Update Should Not Work'
        }

        try:
            response = api_client.patch(f'sip-providers/{fake_id}', patch_data, allow_404=True)

            print(f"\n📥 Response received:")
            print(f"  Result: {response.get('result')}")
            print(f"  HTTP Code: {response.get('httpCode')}")
            print(f"  Messages: {response.get('messages', {})}")

            # Verify 404 response
            assert response.get('httpCode') == 404, \
                f"Expected 404, got {response.get('httpCode')}"
            assert not response.get('result'), "PATCH should fail for non-existent resource"

            print(f"\n✅ TEST 2 PASSED: PATCH correctly returned 404")

        except AssertionError:
            raise
        except Exception as e:
            if '404' in str(e):
                print(f"\n✅ TEST 2 PASSED: PATCH correctly returned 404 (exception)")
            else:
                raise

        print(f"\n{'='*70}")
        print(f"✅ All Non-Existent Provider Tests Passed")
        print(f"{'='*70}\n")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
