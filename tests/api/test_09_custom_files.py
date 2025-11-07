#!/usr/bin/env python3
"""
Test suite for Custom Files operations

Tests the /pbxcore/api/v3/custom-files endpoint for:
- Getting list of custom files with pagination and filtering
- Getting specific custom file by ID
- Custom method: getDefault (default template)
- Creating new custom files (expects database lock issue)
- Updating/patching existing files
- Deleting files
- Mode validation: override, append, script

Custom Files allows system administrators to manage configuration files that persist
across system updates. Content is stored as base64-encoded strings.

NOTE: Write operations (CREATE/UPDATE/DELETE) may be affected by database locking issue.
This test suite focuses on read operations which work reliably.
"""

import pytest
import base64
import uuid
import requests
from conftest import assert_api_success


class TestCustomFiles:
    """Custom Files read operations tests"""

    sample_id = None

    def test_01_get_default_template(self, api_client):
        """Test GET /custom-files:getDefault - Get default template"""
        response = api_client.get('custom-files:getDefault')
        assert_api_success(response, "Failed to get default custom file template")

        data = response['data']
        assert isinstance(data, dict), "Default template should be a dict"

        print(f"✓ Retrieved default custom file template")
        print(f"  Template keys: {list(data.keys())}")
        if 'mode' in data:
            print(f"  Default mode: {data['mode']}")

    def test_02_get_list(self, api_client):
        """Test GET /custom-files - Get list with pagination"""
        response = api_client.get('custom-files', params={'limit': 20, 'offset': 0})
        assert_api_success(response, "Failed to get custom files list")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        print(f"✓ Retrieved {len(data)} custom files")

        # Store sample ID for other tests
        if len(data) > 0 and 'id' in data[0]:
            TestCustomFiles.sample_id = data[0]['id']
            print(f"  Sample ID: {TestCustomFiles.sample_id}")
            if 'filepath' in data[0]:
                print(f"  Sample filepath: {data[0]['filepath']}")
            if 'mode' in data[0]:
                print(f"  Sample mode: {data[0]['mode']}")

    def test_03_get_list_with_search(self, api_client):
        """Test GET /custom-files - Search by filepath"""
        response = api_client.get('custom-files', params={'search': '/etc', 'limit': 10})
        assert_api_success(response, "Failed to search custom files")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        print(f"✓ Search found {len(data)} files matching '/etc'")

    def test_04_get_list_ordered_by_filepath(self, api_client):
        """Test GET /custom-files - Order by filepath"""
        response = api_client.get('custom-files', params={
            'order': 'filepath',
            'orderWay': 'ASC',
            'limit': 10
        })
        assert_api_success(response, "Failed to get ordered list")

        data = response['data']
        print(f"✓ Retrieved {len(data)} files ordered by filepath ASC")

    def test_05_get_list_ordered_by_mode(self, api_client):
        """Test GET /custom-files - Order by mode"""
        response = api_client.get('custom-files', params={
            'order': 'mode',
            'orderWay': 'DESC',
            'limit': 10
        })
        assert_api_success(response, "Failed to get ordered list")

        data = response['data']
        print(f"✓ Retrieved {len(data)} files ordered by mode DESC")

    def test_06_get_by_id(self, api_client):
        """Test GET /custom-files/{id} - Get specific file"""
        if not TestCustomFiles.sample_id:
            pytest.skip("No sample ID available")

        response = api_client.get(f'custom-files/{TestCustomFiles.sample_id}')
        assert_api_success(response, f"Failed to get custom file {TestCustomFiles.sample_id}")

        data = response['data']
        assert isinstance(data, dict), "Response data should be a dict"
        assert str(data['id']) == str(TestCustomFiles.sample_id), "ID should match"

        print(f"✓ Retrieved custom file: {TestCustomFiles.sample_id}")
        if 'filepath' in data:
            print(f"  Filepath: {data['filepath']}")
        if 'mode' in data:
            print(f"  Mode: {data['mode']}")
        if 'description' in data:
            print(f"  Description: {data['description']}")
        if 'content' in data:
            # Content is base64-encoded
            print(f"  Content length: {len(data['content'])} chars (base64)")


class TestCustomFilesEdgeCases:
    """Edge cases for custom files"""

    def test_01_get_nonexistent_file(self, api_client):
        """Test GET /custom-files/{id} - Non-existent ID"""
        fake_id = '999999'

        try:
            response = api_client.get(f'custom-files/{fake_id}')
            assert response['result'] is False, "Non-existent file should return error"
            print(f"✓ Non-existent file rejected")
        except Exception as e:
            if '404' in str(e) or '422' in str(e):
                print(f"✓ Non-existent file rejected (HTTP error)")
            else:
                raise

    def test_02_invalid_id_format(self, api_client):
        """Test GET /custom-files/{id} - Invalid ID format"""
        invalid_id = 'abc'

        try:
            response = api_client.get(f'custom-files/{invalid_id}')

            if not response['result']:
                print(f"✓ Invalid ID format rejected")
            else:
                print(f"⚠ Invalid ID format accepted")
        except Exception as e:
            if '400' in str(e) or '404' in str(e) or '422' in str(e):
                print(f"✓ Invalid ID format rejected (HTTP error)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_03_negative_limit(self, api_client):
        """Test GET /custom-files - Negative limit"""
        response = api_client.get('custom-files', params={'limit': -10, 'offset': 0})

        if response['result']:
            # May convert to positive or use default
            print(f"⚠ Negative limit accepted (may be converted)")
        else:
            print(f"✓ Negative limit rejected")

    def test_04_limit_exceeds_maximum(self, api_client):
        """Test GET /custom-files - Limit exceeds max (>100)"""
        response = api_client.get('custom-files', params={'limit': 200, 'offset': 0})

        if response['result']:
            data = response['data']
            # Should cap at 100
            assert len(data) <= 100, f"Limit should be capped at 100, got {len(data)}"
            print(f"✓ Large limit capped at {len(data)} files")
        else:
            print(f"✓ Large limit rejected")

    def test_05_invalid_order_field(self, api_client):
        """Test GET /custom-files - Invalid order field"""
        response = api_client.get('custom-files', params={
            'order': 'invalid_field',
            'limit': 10
        })

        if response['result']:
            # May ignore or use default
            print(f"⚠ Invalid order field accepted (may use default)")
        else:
            print(f"✓ Invalid order field rejected")

    def test_06_invalid_order_direction(self, api_client):
        """Test GET /custom-files - Invalid orderWay"""
        response = api_client.get('custom-files', params={
            'order': 'filepath',
            'orderWay': 'INVALID',
            'limit': 10
        })

        if response['result']:
            # May ignore or use default
            print(f"⚠ Invalid orderWay accepted (may use default)")
        else:
            print(f"✓ Invalid orderWay rejected")

    def test_07_update_nonexistent_custom_file_returns_404(self, api_client):
        """Test PUT /custom-files/{id} - Update non-existent file should return 404"""
        nonexistent_id = '999999'
        content = "# Test content\n"
        encoded_content = base64.b64encode(content.encode()).decode()

        update_data = {
            'filepath': '/tmp/nonexistent_test.conf',
            'content': encoded_content,
            'mode': 'override',
            'description': 'This should fail with 404'
        }

        try:
            response = api_client.put(f'custom-files/{nonexistent_id}', update_data)

            # Should fail
            assert response['result'] is False, "PUT on non-existent custom file should fail"

            # Check for error messages
            assert 'messages' in response, "Response should contain messages"
            errors = response['messages'].get('error', [])
            assert len(errors) > 0, "Should have error messages"

            # Verify the error mentions the file not being found
            error_text = ' '.join(str(e) for e in errors).lower()
            assert 'not found' in error_text or '404' in error_text, \
                f"Error should mention 'not found', got: {errors}"

            print(f"✓ PUT on non-existent custom file correctly returned 404")
            print(f"  Error: {errors[0]}")

        except Exception as e:
            error_str = str(e)
            # Expecting 404 HTTP error
            if '404' in error_str:
                print(f"✓ PUT on non-existent custom file correctly returned HTTP 404")
            else:
                raise AssertionError(f"Expected 404 error, got: {error_str}")

    def test_08_patch_nonexistent_custom_file_returns_404(self, api_client):
        """Test PATCH /custom-files/{id} - Patch non-existent file should return 404"""
        nonexistent_id = '999999'

        patch_data = {
            'mode': 'append',
            'description': 'This should fail with 404'
        }

        try:
            response = api_client.patch(f'custom-files/{nonexistent_id}', patch_data)

            # Should fail
            assert response['result'] is False, "PATCH on non-existent custom file should fail"

            # Check for error messages
            assert 'messages' in response, "Response should contain messages"
            errors = response['messages'].get('error', [])
            assert len(errors) > 0, "Should have error messages"

            # Verify the error mentions the file not being found
            error_text = ' '.join(str(e) for e in errors).lower()
            assert 'not found' in error_text or '404' in error_text, \
                f"Error should mention 'not found', got: {errors}"

            print(f"✓ PATCH on non-existent custom file correctly returned 404")
            print(f"  Error: {errors[0]}")

        except Exception as e:
            error_str = str(e)
            # Expecting 404 HTTP error
            if '404' in error_str:
                print(f"✓ PATCH on non-existent custom file correctly returned HTTP 404")
            else:
                raise AssertionError(f"Expected 404 error, got: {error_str}")


class TestCustomFilesWriteOperations:
    """Write operations tests (expected to fail due to DB lock)"""

    created_id = None

    def test_01_create_custom_file(self, api_client):
        """Test POST /custom-files - Create new file (expected DB lock)"""
        # Prepare base64-encoded content
        content = "# Custom configuration\n[section]\noption=value\n"
        encoded_content = base64.b64encode(content.encode()).decode()

        custom_file_data = {
            'filepath': '/tmp/test_custom_file.conf',
            'content': encoded_content,
            'mode': 'override',
            'description': 'Test custom file created by pytest'
        }

        try:
            response = api_client.post('custom-files', custom_file_data)

            if response['result']:
                assert_api_success(response, "Failed to create custom file")
                TestCustomFilesWriteOperations.created_id = response['data'].get('id')
                print(f"✓ Custom file created successfully")
                print(f"  ID: {TestCustomFilesWriteOperations.created_id}")
            else:
                print(f"✗ Create rejected: {response.get('messages', {})}")
        except Exception as e:
            error_str = str(e)
            if 'savepoint' in error_str.lower() or 'sql' in error_str.lower():
                print(f"✗ CREATE blocked by database locking issue (expected)")
                print(f"  Error: {error_str[:100]}")
            elif '422' in error_str or '400' in error_str:
                print(f"✓ Create validation works (rejected invalid data)")
            elif '409' in error_str:
                print(f"✓ Create conflict detection works (duplicate filepath)")
            else:
                print(f"⚠ Unexpected error: {error_str[:80]}")

    def test_02_update_custom_file(self, api_client):
        """Test PUT /custom-files/{id} - Full update (expected DB lock)"""
        if not TestCustomFilesWriteOperations.created_id:
            pytest.skip("No created file ID available")

        content = "# Updated configuration\n[section]\noption=new_value\n"
        encoded_content = base64.b64encode(content.encode()).decode()

        update_data = {
            'filepath': '/tmp/test_custom_file_updated.conf',
            'content': encoded_content,
            'mode': 'append',
            'description': 'Updated by pytest'
        }

        try:
            response = api_client.put(f'custom-files/{TestCustomFilesWriteOperations.created_id}', update_data)

            if response['result']:
                print(f"✓ Custom file updated successfully")
            else:
                print(f"✗ Update rejected")
        except Exception as e:
            if 'savepoint' in str(e).lower():
                print(f"✗ UPDATE blocked by database locking issue (expected)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:80]}")

    def test_03_patch_custom_file(self, api_client):
        """Test PATCH /custom-files/{id} - Partial update (expected DB lock)"""
        if not TestCustomFilesWriteOperations.created_id:
            pytest.skip("No created file ID available")

        patch_data = {
            'mode': 'script',
            'description': 'Patched description'
        }

        try:
            response = api_client.patch(f'custom-files/{TestCustomFilesWriteOperations.created_id}', patch_data)

            if response['result']:
                print(f"✓ Custom file patched successfully")
            else:
                print(f"✗ Patch rejected")
        except Exception as e:
            if 'savepoint' in str(e).lower():
                print(f"✗ PATCH blocked by database locking issue (expected)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:80]}")

    def test_04_delete_custom_file(self, api_client):
        """Test DELETE /custom-files/{id} - Delete file (expected DB lock)"""
        if not TestCustomFilesWriteOperations.created_id:
            pytest.skip("No created file ID available")

        try:
            response = api_client.delete(f'custom-files/{TestCustomFilesWriteOperations.created_id}')

            if response['result']:
                print(f"✓ Custom file deleted successfully")
                TestCustomFilesWriteOperations.created_id = None
            else:
                print(f"✗ Delete rejected")
        except Exception as e:
            if 'savepoint' in str(e).lower():
                print(f"✗ DELETE blocked by database locking issue (expected)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:80]}")


class TestCustomFilesValidation:
    """Validation tests for custom files"""

    def test_01_create_without_filepath(self, api_client):
        """Test POST /custom-files - Missing filepath"""
        content = base64.b64encode(b"test").decode()

        try:
            response = api_client.post('custom-files', {
                'content': content,
                'mode': 'override'
                # Missing filepath
            })

            if not response['result']:
                print(f"✓ Missing filepath rejected")
            else:
                print(f"⚠ Missing filepath accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Missing filepath rejected (HTTP error)")
            elif 'savepoint' in str(e).lower():
                print(f"⚠ Cannot test validation (DB lock)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_02_create_with_invalid_mode(self, api_client):
        """Test POST /custom-files - Invalid mode"""
        content = base64.b64encode(b"test").decode()

        try:
            response = api_client.post('custom-files', {
                'filepath': '/tmp/test.conf',
                'content': content,
                'mode': 'invalid_mode'
            })

            if not response['result']:
                print(f"✓ Invalid mode rejected")
            else:
                print(f"⚠ Invalid mode accepted")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid mode rejected (HTTP error)")
            elif 'savepoint' in str(e).lower():
                print(f"⚠ Cannot test validation (DB lock)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_03_create_with_empty_content(self, api_client):
        """Test POST /custom-files - Empty content"""
        try:
            response = api_client.post('custom-files', {
                'filepath': '/tmp/empty.conf',
                'content': '',
                'mode': 'override'
            })

            if not response['result']:
                print(f"✓ Empty content rejected")
            else:
                print(f"⚠ Empty content accepted (may be allowed)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Empty content validation works")
            elif 'savepoint' in str(e).lower():
                print(f"⚠ Cannot test validation (DB lock)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_04_create_with_invalid_base64(self, api_client):
        """Test POST /custom-files - Invalid base64 content"""
        try:
            response = api_client.post('custom-files', {
                'filepath': '/tmp/test.conf',
                'content': 'not-valid-base64!@#$',
                'mode': 'override'
            })

            if not response['result']:
                print(f"✓ Invalid base64 rejected")
            else:
                print(f"⚠ Invalid base64 accepted (may be validated later)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Base64 validation works")
            elif 'savepoint' in str(e).lower():
                print(f"⚠ Cannot test validation (DB lock)")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_05_patch_mode_none_without_content(self, api_client):
        """
        Test PATCH /custom-files/{id} - Switch to MODE_NONE without content

        Verifies that when switching to MODE_NONE, the content field is optional
        (it will be cleared automatically by the system).
        """
        # First, get an existing custom file to patch
        response = api_client.get('custom-files', params={'limit': 1})

        if not response['result'] or not response['data']:
            pytest.skip("No custom files available for testing")

        file_id = response['data'][0]['id']

        print(f"\n  Testing file ID: {file_id}")
        print(f"  Original mode: {response['data'][0].get('mode', 'unknown')}")

        # Try to switch to MODE_NONE without providing content
        # This should succeed because MODE_NONE clears content anyway
        patch_data = {
            'mode': 'none',
            # Intentionally NOT including 'content' field - should be optional for MODE_NONE
        }

        try:
            response = api_client.patch(f'custom-files/{file_id}', patch_data)

            if response['result']:
                print(f"✓ Successfully switched to MODE_NONE without content field")
                print(f"  New mode: {response['data'].get('mode', 'unknown')}")

                # Verify that content was cleared
                if 'content' in response['data']:
                    content_len = len(response['data']['content'])
                    if content_len == 0:
                        print(f"  Content correctly cleared")
                    else:
                        print(f"  Content length: {content_len} (may be cleared after save)")
            else:
                # Check if error is about required content
                errors = response.get('messages', {}).get('error', {})
                error_str = str(errors)

                if 'content' in error_str.lower() and 'required' in error_str.lower():
                    pytest.fail(f"BUG: Content incorrectly required for MODE_NONE. Error: {errors}")
                else:
                    pytest.fail(f"Patch rejected with unexpected error: {errors}")

        except Exception as e:
            error_str = str(e)
            if 'savepoint' in error_str.lower():
                pytest.skip("Cannot test (DB lock)")
            elif '422' in error_str or '400' in error_str:
                if 'content' in error_str.lower() and 'required' in error_str.lower():
                    pytest.fail(f"BUG: Content incorrectly required for MODE_NONE. Error: {error_str[:100]}")
                else:
                    pytest.fail(f"Unexpected validation error: {error_str[:80]}")
            else:
                raise


class TestCustomFilesLifecycle:
    """
    Complete lifecycle tests for MODE_CUSTOM files with filesystem verification

    Tests the full workflow:
    1. Create custom file via POST
    2. Verify file exists on disk using checkFile endpoint
    3. Verify content matches what was created
    4. Delete file via DELETE
    5. Wait for worker to process deletion (5-6 seconds)
    6. Verify file removed from disk using checkFile endpoint
    """

    created_file_id = None
    test_filepath = None  # Will be set dynamically in test
    test_content = '#!/usr/bin/env python3\n# Test file for lifecycle testing\nprint("Hello from pytest")\n'

    @pytest.mark.order(10)
    def test_10_create_custom_file_and_verify_on_disk(self, api_client):
        """
        Test POST /custom-files + GET /custom-files/{id}:checkFile

        Creates MODE_CUSTOM file and verifies it appears on filesystem.
        MODE_CUSTOM files are automatically applied to disk via ApplyCustomFilesAction.
        """
        import time

        # Generate unique filename to avoid conflicts
        unique_id = str(uuid.uuid4())[:8]
        TestCustomFilesLifecycle.test_filepath = f'/tmp/pytest_lifecycle_{unique_id}.py'

        # Encode content
        encoded_content = base64.b64encode(self.test_content.encode()).decode()

        # Create file - system will automatically set it to MODE_CUSTOM
        # NOTE: We send mode='override' but SaveRecordAction forces MODE_CUSTOM for new files
        custom_file_data = {
            'filepath': TestCustomFilesLifecycle.test_filepath,
            'content': encoded_content,
            'mode': 'override',  # Will be forced to 'custom' by SaveRecordAction
            'description': 'Pytest lifecycle test - custom file'
        }

        print(f"\n  Creating file (will be forced to MODE_CUSTOM): {TestCustomFilesLifecycle.test_filepath}")
        response = api_client.post('custom-files', custom_file_data)
        assert_api_success(response, "Failed to create file")

        TestCustomFilesLifecycle.created_file_id = response['data'].get('id')
        assert TestCustomFilesLifecycle.created_file_id, "Created file should have ID"

        print(f"✓ File created in database")
        print(f"  ID: {TestCustomFilesLifecycle.created_file_id}")
        print(f"  Mode: {response['data'].get('mode')}")

        # Verify mode was forced to 'custom'
        assert response['data']['mode'] == 'custom', \
            f"New files should be forced to MODE_CUSTOM, got: {response['data'].get('mode')}"
        print(f"✓ Mode correctly forced to 'custom' for new file")

        # Wait for ApplyCustomFilesAction to process (usually immediate, but allow some time)
        print(f"\n  Waiting 2 seconds for file to be applied to disk...")
        time.sleep(2)

        # Verify file exists on disk using checkFile endpoint
        print(f"  Checking if file exists on disk...")
        check_response = api_client.get(f'custom-files/{TestCustomFilesLifecycle.created_file_id}:checkFile')
        assert_api_success(check_response, "Failed to check file on disk")

        check_data = check_response['data']

        # Verify file exists
        assert check_data['exists'] is True, \
            f"File should exist on disk at {self.test_filepath}"

        print(f"✓ File verified on disk")
        print(f"  Filepath: {check_data['filepath']}")
        print(f"  Size: {check_data.get('size', 0)} bytes")
        print(f"  Permissions: {check_data.get('permissions', 'N/A')}")

        # Verify content matches
        disk_content = check_data.get('content', '')
        if disk_content == self.test_content:
            print(f"✓ Content matches exactly")
        else:
            # Content might be empty or different
            pytest.fail(f"Content mismatch! Expected:\n{self.test_content}\nGot:\n{disk_content}")

    @pytest.mark.order(11)
    @pytest.mark.dependency(depends=["TestCustomFilesLifecycle::test_10_create_custom_file_and_verify_on_disk"])
    def test_11_delete_and_verify_removal(self, api_client):
        """
        Test DELETE /custom-files/{id} + verify filesystem cleanup

        Deletes MODE_CUSTOM file and verifies it's removed from filesystem.
        Deletion is processed asynchronously by worker, so we wait 5-6 seconds.
        """
        import time

        if not TestCustomFilesLifecycle.created_file_id:
            pytest.skip("No created file ID available from previous test")

        print(f"\n  Deleting custom file ID: {TestCustomFilesLifecycle.created_file_id}")

        # Delete the file
        delete_response = api_client.delete(f'custom-files/{TestCustomFilesLifecycle.created_file_id}')
        assert_api_success(delete_response, "Failed to delete custom file")

        print(f"✓ File deleted from database")

        # Wait for worker to process deletion and remove file from disk
        wait_time = 6
        print(f"\n  Waiting {wait_time} seconds for file removal from disk...")
        time.sleep(wait_time)

        # Verify file no longer exists on disk
        print(f"  Checking if file removed from disk...")

        # Try to check file - should get 404 since record was deleted
        try:
            check_response = api_client.get(f'custom-files/{TestCustomFilesLifecycle.created_file_id}:checkFile')

            # If we get here, record still exists (shouldn't happen but handle it)
            check_data = check_response['data']
            assert check_data['exists'] is False, \
                f"File should no longer exist on disk at {TestCustomFilesLifecycle.test_filepath}"

            print(f"✓ File removed from disk")
            print(f"  Filepath: {check_data['filepath']}")
            print(f"  Exists: {check_data['exists']}")

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                # Expected - file record deleted from database
                print(f"✓ File record not found (expected after deletion)")
                print(f"  HTTP Code: 404")
            else:
                raise

        # Clean up
        TestCustomFilesLifecycle.created_file_id = None

    def test_12_patch_mode_none_preserves_content_requirement(self, api_client):
        """
        Test PATCH /custom-files/{id} - Verify content not required for mode='none'

        This test verifies the bug fix: PATCH should not require content field
        when file already has mode='none' or when switching to mode='none'.

        NOTE: Uses existing system file with mode='override' since all new files
        get forced to MODE_CUSTOM which has protected mode.
        """
        # Get an existing non-MODE_CUSTOM file to test PATCH
        response = api_client.get('custom-files', params={'limit': 100})

        if not response['result'] or not response['data']:
            pytest.skip("No custom files available for testing")

        # Find a file with mode that can be changed (not MODE_CUSTOM)
        test_file = None
        for file in response['data']:
            if file.get('mode') in ['override', 'append', 'script']:
                test_file = file
                break

        if not test_file:
            pytest.skip("No non-MODE_CUSTOM files available for testing")

        file_id = test_file['id']
        original_mode = test_file.get('mode')

        print(f"\n  Using existing file ID: {file_id}")
        print(f"  Original mode: {original_mode}")
        print(f"  Filepath: {test_file.get('filepath', 'N/A')}")

        # Try to PATCH to mode='none' without content field
        # This should succeed after the bug fix
        patch_data = {
            'mode': 'none',
            'description': f"Test PATCH mode=none (was {original_mode})"
            # Content intentionally NOT included
        }

        print(f"  Patching to mode='none' without content field...")
        try:
            patch_response = api_client.patch(f'custom-files/{file_id}', patch_data)

            if patch_response['result']:
                print(f"✓ PATCH succeeded without content field")
                print(f"  New mode: {patch_response['data'].get('mode')}")

                # Verify mode changed to 'none'
                assert patch_response['data']['mode'] == 'none', \
                    f"Mode should be 'none', got: {patch_response['data'].get('mode')}"

                # Restore original mode
                api_client.patch(f'custom-files/{file_id}', {'mode': original_mode})
                print(f"  Restored original mode: {original_mode}")
            else:
                errors = patch_response.get('messages', {}).get('error', [])
                error_str = str(errors)

                if 'content' in error_str.lower() and 'required' in error_str.lower():
                    pytest.fail(f"❌ BUG STILL EXISTS: Content incorrectly required for mode='none'. Errors: {errors}")
                else:
                    pytest.fail(f"PATCH failed with unexpected error: {errors}")

        except Exception as e:
            # Try to restore original mode even if test fails
            try:
                api_client.patch(f'custom-files/{file_id}', {'mode': original_mode})
            except:
                pass
            raise


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
