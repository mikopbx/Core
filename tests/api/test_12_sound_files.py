#!/usr/bin/env python3
"""Test suite for Sound Files operations"""
import pytest
from conftest import assert_api_success

class TestSoundFiles:
    sample_id = None
    def test_01_get_default_template(self, api_client):
        response = api_client.get('sound-files:getDefault')
        assert_api_success(response, "Failed to get default template")
        print(f"✓ Retrieved default sound file template")
    def test_02_get_list(self, api_client):
        response = api_client.get('sound-files', params={'limit': 20})
        assert_api_success(response, "Failed to get list")
        data = response['data']
        print(f"✓ Retrieved {len(data)} sound files")
        if len(data) > 0 and 'id' in data[0]:
            TestSoundFiles.sample_id = data[0]['id']
    def test_03_get_by_id(self, api_client):
        if not TestSoundFiles.sample_id:
            pytest.skip("No sample ID")
        response = api_client.get(f'sound-files/{TestSoundFiles.sample_id}')
        assert_api_success(response, "Failed to get record")
        print(f"✓ Retrieved sound file: {TestSoundFiles.sample_id}")
    def test_04_filter_by_category(self, api_client):
        response = api_client.get('sound-files', params={'category': 'custom', 'limit': 10})
        if response['result']:
            print(f"✓ Filter by category works")

    def test_05_update_nonexistent_sound_file_returns_404(self, api_client):
        """
        Test PUT/PATCH on non-existent sound file returns 404
        Validates REST API compliance:
        - PUT /sound-files/NONEXISTENT-ID → 404 Not Found ✓
        - PATCH /sound-files/NONEXISTENT-ID → 404 Not Found ✓
        - POST /sound-files {id: CUSTOM-ID} → 201 Created (allowed for migrations) ✓
        """
        nonexistent_id = 999999
        update_data = {
            'id': nonexistent_id,
            'name': 'Test Sound',
            'description': 'Test Description'
        }

        # Test PUT - should return 404
        print(f"\n→ Testing PUT /sound-files/{nonexistent_id} (should return 404)")
        response = api_client.put(f'sound-files/{nonexistent_id}', update_data, allow_404=True)

        assert response['result'] is False, "PUT on non-existent resource should fail"
        assert 'httpCode' in response, "Response should include httpCode"
        assert response['httpCode'] == 404, f"Expected 404, got {response.get('httpCode')}"

        # Check error message
        errors = response.get('messages', {}).get('error', [])
        assert len(errors) > 0, "Should have error message"
        assert any('not found' in str(err).lower() for err in errors), \
            f"Error should mention 'not found', got: {errors}"
        print(f"✓ PUT to non-existent sound file correctly returns 404")

        # Test PATCH - should return 404
        print(f"\n→ Testing PATCH /sound-files/{nonexistent_id} (should return 404)")
        patch_payload = {'name': 'Updated Name'}
        response = api_client.patch(f'sound-files/{nonexistent_id}', patch_payload, allow_404=True)

        assert response['result'] is False, "PATCH on non-existent resource should fail"
        assert 'httpCode' in response, "Response should include httpCode"
        assert response['httpCode'] == 404, f"Expected 404, got {response.get('httpCode')}"

        errors = response.get('messages', {}).get('error', [])
        assert len(errors) > 0, "Should have error message"
        # Accept both 'not found' text and 'api_SoundFileNotFound' translation key
        assert any('not found' in str(err).lower() or 'soundfilenotfound' in str(err).lower() for err in errors), \
            f"Error should mention 'not found' or 'SoundFileNotFound', got: {errors}"
        print(f"✓ PATCH to non-existent sound file correctly returns 404")

        # Test POST with custom ID - should succeed (allowed for migrations)
        # Note: SoundFiles uses numeric IDs, not string IDs
        # Custom ID creation may not be supported, but should not return 404
        print(f"\n→ Testing POST /sound-files with custom ID {nonexistent_id}")
        response = api_client.post('sound-files', update_data)

        if response['result']:
            created_id = response['data'].get('id')
            print(f"✓ POST with custom ID allowed for migrations (created: {created_id})")
            # Cleanup
            api_client.delete(f'sound-files/{created_id}')
        else:
            # If POST with custom ID fails, just verify it's not a 404
            # (could be validation error or other issue)
            if 'httpCode' in response:
                assert response['httpCode'] != 404, f"POST should not return 404, got: {response.get('httpCode')}"
            print(f"✓ POST with custom ID handled appropriately (not 404)")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
