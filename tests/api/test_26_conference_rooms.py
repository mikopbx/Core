#!/usr/bin/env python3
"""Test suite for Conference Rooms operations"""
import pytest
from conftest import assert_api_success

class TestConferenceRooms:
    def test_01_get_default_template(self, api_client):
        response = api_client.get('conference-rooms:getDefault')
        assert_api_success(response, "Failed to get default template")
        print(f"✓ Retrieved default conference room template")
    def test_02_get_list(self, api_client):
        response = api_client.get('conference-rooms', params={'limit': 20})
        assert_api_success(response, "Failed to get list")
        data = response['data']
        print(f"✓ Retrieved {len(data)} conference rooms")
    def test_03_get_by_id(self, api_client, sample_conference_room):
        response = api_client.get(f'conference-rooms/{sample_conference_room}')
        assert_api_success(response, "Failed to get record")
        print(f"✓ Retrieved conference room: {sample_conference_room}")

def test_update_nonexistent_conference_room(api_client):
    """
    Test updating non-existent conference room returns 404

    Steps:
    1. Attempt PUT on non-existent ID
    2. Verify 404 response
    3. Attempt PATCH on non-existent ID
    4. Verify 404 response
    """

    print(f"\n{'='*70}")
    print(f"Test: Update Non-Existent Conference Room")
    print(f"{'='*70}")

    fake_id = 'CONFERENCE-NONEXISTENT-999999'

    # ====================================================================
    # TEST 1: PUT with non-existent ID
    # ====================================================================
    print(f"\n{'-'*70}")
    print(f"TEST 1: PUT with non-existent ID")
    print(f"{'-'*70}")
    print(f"Attempting to update: {fake_id}")

    update_data = {
        'id': fake_id,
        'name': 'Should Not Work',
        'extension': '9999',
        'pinCode': '1234'
    }

    try:
        response = api_client.put(f'conference-rooms/{fake_id}', update_data, allow_404=True)

        print(f"\n📥 Response received:")
        print(f"  Result: {response.get('result')}")
        print(f"  HTTP Code: {response.get('httpCode')}")
        print(f"  Messages: {response.get('messages', {})}")

        # Verify 404 response
        assert response.get('result') is False, "Expected result to be False"
        assert response.get('httpCode') == 404, f"Expected 404, got {response.get('httpCode')}"

        error_messages = response.get('messages', {}).get('error', [])
        assert 'Conference room not found' in error_messages or \
               any('not found' in msg.lower() for msg in error_messages), \
               f"Expected 'not found' error, got: {error_messages}"

        print(f"✅ PUT correctly returned 404 for non-existent ID")

    except AssertionError:
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        raise

    # ====================================================================
    # TEST 2: PATCH with non-existent ID
    # ====================================================================
    print(f"\n{'-'*70}")
    print(f"TEST 2: PATCH with non-existent ID")
    print(f"{'-'*70}")
    print(f"Attempting to patch: {fake_id}")

    patch_data = {
        'name': 'Should Also Not Work'
    }

    try:
        response = api_client.patch(f'conference-rooms/{fake_id}', patch_data, allow_404=True)

        print(f"\n📥 Response received:")
        print(f"  Result: {response.get('result')}")
        print(f"  HTTP Code: {response.get('httpCode')}")
        print(f"  Messages: {response.get('messages', {})}")

        # Verify 404 response
        assert response.get('result') is False, "Expected result to be False"
        assert response.get('httpCode') == 404, f"Expected 404, got {response.get('httpCode')}"

        error_messages = response.get('messages', {}).get('error', [])
        assert 'Conference room not found' in error_messages or \
               any('not found' in msg.lower() for msg in error_messages), \
               f"Expected 'not found' error, got: {error_messages}"

        print(f"✅ PATCH correctly returned 404 for non-existent ID")

    except AssertionError:
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        raise

    # ====================================================================
    # SUMMARY
    # ====================================================================
    print(f"\n{'='*70}")
    print(f"404 VALIDATION COMPLETE")
    print(f"{'='*70}")
    print(f"✅ PUT  - Correctly returns 404 for non-existent ID")
    print(f"✅ PATCH - Correctly returns 404 for non-existent ID")
    print(f"\nAPI properly validates record existence before updates!")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
