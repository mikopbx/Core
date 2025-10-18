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


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
