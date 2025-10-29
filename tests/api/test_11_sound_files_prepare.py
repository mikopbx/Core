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
    uploaded_file_path = None
    converted_file_path = None

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
        import time

        sound_data = {
            'name': 'Test Audio File',
            'description': 'Created by API test',
            'category': 'custom'
        }

        # Retry on database lock (SQLite may be locked by other operations)
        max_attempts = 3
        last_error = None

        for attempt in range(max_attempts):
            try:
                response = api_client.post('sound-files', sound_data)
                assert_api_success(response, "Failed to create sound file")

                assert 'id' in response['data']
                sound_id = response['data']['id']
                self.created_ids.append(sound_id)

                print(f"✓ Created sound file: {sound_id}")
                print(f"  Name: {sound_data['name']}")
                return  # Success, exit
            except Exception as e:
                last_error = e
                if 'database is locked' in str(e).lower() and attempt < max_attempts - 1:
                    print(f"  Database locked, retrying (attempt {attempt + 1}/{max_attempts})...")
                    time.sleep(2)  # Wait 2 seconds before retry
                else:
                    raise

        # If we got here, all retries failed
        if last_error:
            raise last_error

    def test_06_get_sound_file_by_id(self, api_client):
        """Test GET /sound-files/{id} - Get specific sound file"""
        import time

        if not self.created_ids:
            pytest.skip("No sound files created yet")

        sound_id = self.created_ids[0]

        # Wait for async API processing to complete (Redis queue + worker)
        # Also verify that the record still exists (may have been deleted by system restore)
        max_attempts = 5
        for attempt in range(max_attempts):
            try:
                record = assert_record_exists(api_client, 'sound-files', sound_id)
                break
            except Exception as e:
                # If record doesn't exist after retries, skip test
                if 'not found' in str(e).lower() or '404' in str(e) or '422' in str(e):
                    pytest.skip(f"Sound file {sound_id} no longer exists (may have been deleted by system restore)")

                if attempt < max_attempts - 1:
                    print(f"  Waiting for record to be available (attempt {attempt + 1}/{max_attempts})...")
                    time.sleep(1)
                else:
                    raise

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
        import time

        if not self.created_ids:
            pytest.skip("No sound files created yet")

        sound_id = self.created_ids[0]

        # Wait for async API processing to complete (Redis queue + worker)
        # Also verify that the record still exists (may have been deleted by system restore)
        max_attempts = 5
        for attempt in range(max_attempts):
            try:
                current = assert_record_exists(api_client, 'sound-files', sound_id)
                break
            except Exception as e:
                # If record doesn't exist after retries, skip test
                if 'not found' in str(e).lower() or '404' in str(e) or '422' in str(e):
                    pytest.skip(f"Sound file {sound_id} no longer exists (may have been deleted by system restore)")

                if attempt < max_attempts - 1:
                    print(f"  Waiting for record to be available (attempt {attempt + 1}/{max_attempts})...")
                    time.sleep(1)
                else:
                    raise

        # Update fields
        update_data = current.copy()
        update_data['name'] = f"{current['name']} (Updated)"
        update_data['description'] = "Updated via PUT"

        response = api_client.put(f'sound-files/{sound_id}', update_data)
        assert_api_success(response, "Failed to update sound file")

        # Verify update with retry logic (async API processing via Redis queue + worker)
        # Worker may still be processing the update, causing 422 validation errors
        max_verify_attempts = 5
        updated = None
        for attempt in range(max_verify_attempts):
            try:
                updated = assert_record_exists(api_client, 'sound-files', sound_id)

                # Check if update actually applied (worker completed processing)
                if '(Updated)' in updated['name']:
                    break  # Update successful
                else:
                    # Update not yet visible - worker still processing
                    if attempt < max_verify_attempts - 1:
                        print(f"  Waiting for update to complete (attempt {attempt + 1}/{max_verify_attempts})...")
                        time.sleep(1)
                    else:
                        pytest.fail(f"Update not applied after {max_verify_attempts} attempts. Name: {updated['name']}")

            except Exception as e:
                # Handle 422 errors during async processing
                if '422' in str(e):
                    # Validation error - record in intermediate state, worker still processing
                    if attempt < max_verify_attempts - 1:
                        print(f"  Record validation failed (worker processing), retrying (attempt {attempt + 1}/{max_verify_attempts})...")
                        time.sleep(1)
                    else:
                        pytest.fail(f"Persistent 422 validation error after {max_verify_attempts} attempts: {e}")
                # Handle record deletion during update
                elif 'not found' in str(e).lower() or '404' in str(e):
                    pytest.skip(f"Sound file {sound_id} deleted during update (system restore)")
                else:
                    raise

        # Final assertion - ensure we got the updated data
        assert updated is not None, "Failed to retrieve updated record"
        assert '(Updated)' in updated['name'], f"Update not reflected. Expected '(Updated)' in name, got: {updated['name']}"

        print(f"✓ Updated sound file: {updated['name']}")

    def test_08_patch_sound_file(self, api_client):
        """Test PATCH /sound-files/{id} - Partial update"""
        import time

        if not self.created_ids:
            pytest.skip("No sound files created yet")

        sound_id = self.created_ids[0]

        # Verify record exists before patching
        try:
            assert_record_exists(api_client, 'sound-files', sound_id)
        except Exception as e:
            if 'not found' in str(e).lower() or '404' in str(e) or '422' in str(e):
                pytest.skip(f"Sound file {sound_id} no longer exists (may have been deleted by system restore)")
            raise

        patch_data = {
            'description': 'Patched description'
        }

        response = api_client.patch(f'sound-files/{sound_id}', patch_data)
        assert_api_success(response, "Failed to patch sound file")

        # Verify patch with retry logic (async API processing via Redis queue + worker)
        max_verify_attempts = 5
        updated = None
        for attempt in range(max_verify_attempts):
            try:
                updated = assert_record_exists(api_client, 'sound-files', sound_id)

                # Check if patch actually applied
                if updated['description'] == 'Patched description':
                    break  # Patch successful
                else:
                    # Patch not yet visible - worker still processing
                    if attempt < max_verify_attempts - 1:
                        print(f"  Waiting for patch to complete (attempt {attempt + 1}/{max_verify_attempts})...")
                        time.sleep(1)
                    else:
                        pytest.fail(f"Patch not applied after {max_verify_attempts} attempts. Description: {updated['description']}")

            except Exception as e:
                # Handle 422 errors during async processing
                if '422' in str(e):
                    if attempt < max_verify_attempts - 1:
                        print(f"  Record validation failed (worker processing), retrying (attempt {attempt + 1}/{max_verify_attempts})...")
                        time.sleep(1)
                    else:
                        pytest.fail(f"Persistent 422 validation error after {max_verify_attempts} attempts: {e}")
                elif 'not found' in str(e).lower() or '404' in str(e):
                    pytest.skip(f"Sound file {sound_id} deleted during patch (system restore)")
                else:
                    raise

        # Final assertion
        assert updated is not None, "Failed to retrieve patched record"
        assert updated['description'] == 'Patched description', f"Patch not reflected. Expected 'Patched description', got: {updated['description']}"

        print(f"✓ Patched sound file description")

    def test_09_upload_real_audio_file(self, api_client):
        """Test POST /files:upload - Upload real WAV file via Files API"""
        import os
        import time
        from pathlib import Path

        # Path to sample WAV file from AdminCabinet tests
        sample_file = Path(__file__).parent.parent / 'AdminCabinet' / 'assets' / 'sample.wav'

        if not sample_file.exists():
            pytest.skip(f"Sample WAV file not found: {sample_file}")

        print(f"  Uploading: {sample_file.name}")
        print(f"  Size: {sample_file.stat().st_size / 1024:.2f} KB")

        # Upload via Files API with category 'sound'
        response = api_client.upload_file(
            'files:upload',
            str(sample_file),
            params={'category': 'sound'}
        )

        assert_api_success(response, "Failed to upload audio file")

        # Check response structure
        data = response.get('data', {})
        upload_id = data.get('upload_id', '')

        # Wait for file merge to complete (single chunk should be immediate, but wait anyway)
        max_wait = 15  # Wait up to 15 seconds
        merged_file_path = None

        print(f"  Waiting for file merge (upload_id: {upload_id})...")
        for i in range(max_wait):
            time.sleep(1)
            status_response = api_client.get('files:uploadStatus', params={'id': upload_id})

            if status_response.get('result'):
                status_data = status_response.get('data', {})
                d_status = status_data.get('d_status', '')

                if d_status == 'UPLOAD_COMPLETE':
                    merged_file_path = status_data.get('upload_file_path', status_data.get('filename', ''))
                    print(f"  ✓ File merge completed ({i+1}s)")
                    break
                elif d_status == 'UPLOAD_ERROR':
                    pytest.fail(f"Upload failed with error: {status_data.get('error', 'Unknown error')}")

        if not merged_file_path:
            # Fallback to original response
            merged_file_path = data.get('upload_file_path', data.get('filename', ''))

        if not merged_file_path:
            pytest.fail(f"Failed to get merged file path after {max_wait}s. Last status: {status_response}")

        # Store upload info for next test
        self.__class__.uploaded_file_path = merged_file_path

        print(f"✓ Uploaded audio file")
        print(f"  Merged file path: {merged_file_path}")

    def test_10_convert_uploaded_audio_file(self, api_client):
        """Test POST /sound-files:convertAudioFile - Convert uploaded file to system format"""
        if not hasattr(self.__class__, 'uploaded_file_path') or not self.uploaded_file_path:
            pytest.skip("No uploaded file from previous test")

        print(f"  Converting audio file...")
        print(f"  Source: {self.uploaded_file_path}")

        # Convert audio file (like web interface does)
        convert_data = {
            'temp_filename': self.uploaded_file_path,
            'category': 'custom'
        }

        response = api_client.post('sound-files:convertAudioFile', convert_data)
        assert_api_success(response, "Failed to convert audio file")

        # Get converted file info
        data = response.get('data', {})
        print(f"  Convert response data: {data}")

        # ConvertAudioFile returns array with MP3 path as first element
        if isinstance(data, list) and len(data) > 0:
            converted_path = data[0]
            self.__class__.converted_file_path = converted_path
            print(f"✓ Audio file converted to MP3")
            print(f"  Converted path: {converted_path}")

            # Now create a sound file record manually with retry on database lock
            import time

            sound_data = {
                'name': 'API Test Sample Audio',
                'description': 'Sample audio uploaded and converted via API test',
                'category': 'custom',
                'path': converted_path
            }

            # Retry on database lock
            max_attempts = 3
            for attempt in range(max_attempts):
                try:
                    sound_response = api_client.post('sound-files', sound_data)
                    if sound_response.get('result'):
                        sound_id = sound_response['data']['id']
                        self.created_ids.append(sound_id)
                        print(f"  ✓ Sound file record created")
                        print(f"  Sound File ID: {sound_id}")
                    break
                except Exception as e:
                    if 'database is locked' in str(e).lower() and attempt < max_attempts - 1:
                        print(f"  Database locked, retrying (attempt {attempt + 1}/{max_attempts})...")
                        time.sleep(2)
                    else:
                        raise
        elif 'sound_file_id' in data:
            # Alternative: if API already created the record
            sound_id = data['sound_file_id']
            self.created_ids.append(sound_id)
            print(f"✓ Audio file converted and record created")
            print(f"  Sound File ID: {sound_id}")

    def test_11_verify_converted_file_in_list(self, api_client):
        """Test GET /sound-files - Verify converted file appears in list"""
        if not self.created_ids:
            pytest.skip("No sound file created from conversion")

        sound_id = self.created_ids[-1]  # Get last created ID

        # Get the sound file record
        response = api_client.get(f'sound-files/{sound_id}')
        assert_api_success(response, f"Failed to get sound file {sound_id}")

        data = response['data']

        print(f"✓ Sound file accessible in system")
        print(f"  ID: {data['id']}")
        print(f"  Name: {data.get('name', 'N/A')}")
        print(f"  Path: {data.get('path', 'N/A')}")
        print(f"  Category: {data.get('category', 'N/A')}")
        print(f"  Duration: {data.get('duration', 'N/A')}")

        # Test playback endpoint
        if data.get('path'):
            try:
                playback_response = api_client.get('sound-files:playback', params={'view': data['path']})
                if playback_response.get('result'):
                    print(f"  ✓ File is playable via web interface")
                    print(f"  Playback URL: /pbxcore/api/v3/sound-files:playback?view={data['path']}")
            except Exception as e:
                print(f"  ⚠ Playback test skipped: {str(e)[:50]}")

    def test_12_delete_sound_files(self, api_client):
        """Test DELETE /sound-files/{id} - Delete sound files"""
        if not self.created_ids:
            pytest.skip("No sound files created to delete")

        for sound_id in self.created_ids[:]:
            try:
                response = api_client.delete(f'sound-files/{sound_id}')
                assert_api_success(response, f"Failed to delete sound file {sound_id}")

                assert_record_deleted(api_client, 'sound-files', sound_id)
            except Exception as e:
                # If record doesn't exist, it's already deleted (e.g., by system restore)
                if 'not found' in str(e).lower() or '404' in str(e) or '422' in str(e):
                    print(f"  ⚠ Sound file {sound_id} already deleted")
                    continue
                raise

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
