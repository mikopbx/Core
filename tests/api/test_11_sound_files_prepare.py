#!/usr/bin/env python3
"""
Test suite for Sound Files CRUD operations

Tests the sound file endpoints for:
- /pbxcore/api/v3/sound-files - Audio file management
- Creating, reading, updating, deleting sound files
- Custom methods: getDefault, getForSelect, playback
- File upload and conversion (skipped - requires multipart)
"""

import pytest
from conftest import assert_api_success, assert_record_exists, assert_record_deleted


class TestSoundFiles:
    """Comprehensive CRUD tests for Sound Files"""

    created_ids = []

    def test_01_get_default_template(self, api_client):
        """Test GET /sound-files:getDefault - Get default sound file template"""
        response = api_client.get('sound-files:getDefault')
        assert_api_success(response, "Failed to get default sound file template")

        data = response['data']

        # Check that template has expected structure
        assert 'name' in data
        assert 'category' in data

        # Default category should be 'custom'
        assert data['category'] == 'custom'

        print(f"✓ Retrieved default sound file template")

    def test_02_get_sound_files_list(self, api_client):
        """Test GET /sound-files - Get list of all sound files"""
        response = api_client.get('sound-files', params={'limit': 50})
        assert_api_success(response, "Failed to get sound files list")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        if len(data) > 0:
            # Check structure of first sound file
            first = data[0]
            assert 'id' in first
            assert 'name' in first
            assert 'category' in first

        print(f"✓ Found {len(data)} sound files")

    def test_03_get_sound_files_by_category(self, api_client):
        """Test GET /sound-files?category=custom - Filter by category"""
        response = api_client.get('sound-files', params={'category': 'custom', 'limit': 50})
        assert_api_success(response, "Failed to get custom sound files")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        # All returned files should be custom category
        for sound in data:
            assert sound['category'] == 'custom', f"Expected custom category, got {sound['category']}"

        print(f"✓ Found {len(data)} custom sound files")

    def test_04_get_sound_files_for_select(self, api_client):
        """Test GET /sound-files:getForSelect - Get sound files for dropdown"""
        response = api_client.get('sound-files:getForSelect')
        assert_api_success(response, "Failed to get sound files for select")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        if len(data) > 0:
            first = data[0]
            # Select format should have id and name at minimum
            assert 'id' in first or 'value' in first
            assert 'name' in first or 'text' in first

        print(f"✓ Retrieved {len(data)} sound files for dropdown")

    def test_05_create_sound_file_without_path(self, api_client):
        """Test POST /sound-files - Create sound file record (metadata only)"""
        sound_data = {
            'name': 'Test Audio File',
            'description': 'Created by API test',
            'category': 'custom'
        }

        response = api_client.post('sound-files', sound_data)
        assert_api_success(response, "Failed to create sound file")

        assert 'id' in response['data']
        sound_id = response['data']['id']
        self.created_ids.append(sound_id)

        print(f"✓ Created sound file: {sound_id}")
        print(f"  Name: {sound_data['name']}")

    def test_06_get_sound_file_by_id(self, api_client):
        """Test GET /sound-files/{id} - Get specific sound file"""
        if not self.created_ids:
            pytest.skip("No sound files created yet")

        sound_id = self.created_ids[0]
        record = assert_record_exists(api_client, 'sound-files', sound_id)

        # Verify structure
        assert record['id'] == sound_id
        assert 'name' in record
        assert 'category' in record
        assert 'path' in record

        print(f"✓ Retrieved sound file: {record['name']}")
        print(f"  Path: {record.get('path', 'N/A')}")
        print(f"  Category: {record['category']}")

    def test_07_update_sound_file(self, api_client):
        """Test PUT /sound-files/{id} - Full update"""
        if not self.created_ids:
            pytest.skip("No sound files created yet")

        sound_id = self.created_ids[0]
        current = assert_record_exists(api_client, 'sound-files', sound_id)

        # Update fields
        update_data = current.copy()
        update_data['name'] = f"{current['name']} (Updated)"
        update_data['description'] = "Updated via PUT"

        response = api_client.put(f'sound-files/{sound_id}', update_data)
        assert_api_success(response, "Failed to update sound file")

        # Verify update
        updated = assert_record_exists(api_client, 'sound-files', sound_id)
        assert '(Updated)' in updated['name']

        print(f"✓ Updated sound file: {updated['name']}")

    def test_08_patch_sound_file(self, api_client):
        """Test PATCH /sound-files/{id} - Partial update"""
        if not self.created_ids:
            pytest.skip("No sound files created yet")

        sound_id = self.created_ids[0]

        patch_data = {
            'description': 'Patched description'
        }

        response = api_client.patch(f'sound-files/{sound_id}', patch_data)
        assert_api_success(response, "Failed to patch sound file")

        # Verify patch
        updated = assert_record_exists(api_client, 'sound-files', sound_id)
        assert updated['description'] == 'Patched description'

        print(f"✓ Patched sound file description")

    def test_09_delete_sound_files(self, api_client):
        """Test DELETE /sound-files/{id} - Delete sound files"""
        for sound_id in self.created_ids[:]:
            response = api_client.delete(f'sound-files/{sound_id}')
            assert_api_success(response, f"Failed to delete sound file {sound_id}")

            assert_record_deleted(api_client, 'sound-files', sound_id)

            print(f"✓ Deleted sound file: {sound_id}")

        self.created_ids.clear()


class TestSoundFilesEdgeCases:
    """Edge cases for sound file management"""

    def test_01_validate_required_fields(self, api_client):
        """Test sound file validation - missing required fields"""
        invalid_data = {
            'description': 'Missing name'
        }

        try:
            response = api_client.post('sound-files', invalid_data)
            assert response['result'] is False
            print(f"✓ Validation rejected incomplete data")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Validation works (HTTP error)")
            else:
                raise

    def test_02_get_nonexistent_sound_file(self, api_client):
        """Test GET /sound-files/{id} with non-existent ID"""
        fake_id = '999999'

        try:
            response = api_client.get(f'sound-files/{fake_id}')
            assert response['result'] is False
            print(f"✓ Non-existent sound file rejected")
        except Exception as e:
            if '404' in str(e) or '422' in str(e):
                print(f"✓ Non-existent sound file rejected (HTTP error)")
            else:
                raise

    def test_03_invalid_category(self, api_client):
        """Test sound file creation with invalid category"""
        invalid_data = {
            'name': 'Test File',
            'category': 'invalid_category'
        }

        try:
            response = api_client.post('sound-files', invalid_data)
            # Should either reject or accept with default category
            if response['result'] is False:
                print(f"✓ Invalid category rejected")
            else:
                # Some implementations might accept and use default
                print(f"⚠ Invalid category accepted (implementation allows)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid category rejected (HTTP error)")
            else:
                raise

    def test_04_playback_nonexistent_file(self, api_client):
        """Test playback of non-existent file path"""
        fake_path = '/tmp/nonexistent_audio_file.wav'

        try:
            response = api_client.get('sound-files:playback', params={'view': fake_path})
            # Should return error for missing file
            assert response['result'] is False
            print(f"✓ Playback rejected non-existent file")
        except Exception as e:
            if '404' in str(e) or '400' in str(e) or '422' in str(e):
                print(f"✓ Playback rejected non-existent file (HTTP error)")
            else:
                raise


class TestSoundFilesPlayback:
    """Tests for sound file playback functionality"""

    def test_01_get_existing_sound_file_for_playback(self, api_client):
        """Test playback preparation - get existing sound file"""
        # Get list of sound files to find one with valid path
        response = api_client.get('sound-files', params={'limit': 10})
        assert_api_success(response, "Failed to get sound files list")

        data = response['data']
        if len(data) == 0:
            pytest.skip("No sound files available for playback test")

        # Find a file with non-empty path
        sound_file = None
        for sound in data:
            if sound.get('path') and sound['path'] != '':
                sound_file = sound
                break

        if not sound_file:
            pytest.skip("No sound files with valid paths found")

        print(f"✓ Found sound file for playback test: {sound_file['name']}")
        print(f"  Path: {sound_file['path']}")
        print(f"  Duration: {sound_file.get('duration', 'Unknown')}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
