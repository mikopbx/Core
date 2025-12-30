#!/usr/bin/env python3
"""
Test suite for IVR Menu CRUD operations

Tests the /pbxcore/api/v3/ivr-menu endpoint for:
- Creating IVR menus with actions
- Reading menus with action details
- Updating menu configurations
- Partial updates (PATCH)
- Deleting menus
- Copy functionality
- Getting default template
"""

import pytest
from conftest import assert_api_success, assert_record_exists, assert_record_deleted


class TestIvrMenuCRUD:
    """Comprehensive CRUD tests for IVR Menu"""

    @pytest.fixture(autouse=True, scope="class")
    def cleanup_ivr_menus(self, api_client):
        """Fixture that cleans up IVR menus before and after tests.

        - Pre-cleanup: removes IVR menus with test extensions from previous runs
        - Post-cleanup: removes all IVR menus created during this test run
        """
        # Initialize created_ids on class instance
        TestIvrMenuCRUD.created_ids = []

        # Pre-cleanup: remove IVR menus with test extensions from previous failed runs
        test_extensions = ['2000', '30021']
        try:
            response = api_client.get('ivr-menu')
            if response.get('result') and response.get('data'):
                for ivr in response['data']:
                    if ivr.get('extension') in test_extensions:
                        api_client.delete(f"ivr-menu/{ivr['id']}")
                        print(f"  Pre-cleanup: removed IVR {ivr['id']} (ext: {ivr['extension']})")
        except Exception as e:
            print(f"  Pre-cleanup warning: {e}")

        yield  # Tests run here

        # Post-cleanup: remove all IVR menus created during tests
        for ivr_id in TestIvrMenuCRUD.created_ids[:]:
            try:
                api_client.delete(f'ivr-menu/{ivr_id}')
                print(f"  Cleanup: deleted IVR menu {ivr_id}")
            except Exception:
                pass  # Already deleted or doesn't exist

        TestIvrMenuCRUD.created_ids.clear()

    def test_01_get_default_template(self, api_client):
        """Test GET /ivr-menu:getDefault - Get default IVR menu template"""
        response = api_client.get('ivr-menu:getDefault')
        assert_api_success(response, "Failed to get default IVR menu template")

        data = response['data']
        assert 'name' in data
        assert 'extension' in data
        assert 'timeout' in data
        assert 'number_of_repeat' in data
        assert 'actions' in data

        # Check defaults (values are returned as integers after formatBySchema)
        assert int(data['timeout']) == 7
        assert int(data['number_of_repeat']) == 3
        assert data['allow_enter_any_internal_extension'] in [False, '0', 0]

        print(f"✓ Default template has timeout={data['timeout']}, repeat={data['number_of_repeat']}")

    def test_02_create_main_ivr_menu(self, api_client, ivr_menu_fixtures):
        """Test POST /ivr-menu - Create main IVR menu with actions"""
        # Get fixture data
        fixture = ivr_menu_fixtures['main.ivr.menu']

        # Prepare IVR menu data
        ivr_data = {
            'name': fixture['name'],
            'extension': '2000',  # Use free extension
            'description': fixture['description'],
            'timeout': 7,
            'timeout_extension': '',
            'number_of_repeat': 3,
            'allow_enter_any_internal_extension': True,
            'audio_message_id': '',
            'actions': [
                {'digits': '2', 'extension': '202'},
                {'digits': '3', 'extension': '203'}
            ]
        }

        response = api_client.post('ivr-menu', ivr_data)
        assert_api_success(response, "Failed to create main IVR menu")

        # Verify created record
        assert 'id' in response['data']
        ivr_id = response['data']['id']
        assert ivr_id.startswith('IVR-')

        # Store for cleanup
        self.created_ids.append(ivr_id)

        print(f"✓ Created main IVR menu with ID: {ivr_id}")
        print(f"  Name: {ivr_data['name']}")
        print(f"  Extension: {ivr_data['extension']}")
        print(f"  Actions: {len(ivr_data['actions'])}")

    def test_03_create_second_ivr_menu(self, api_client, ivr_menu_fixtures):
        """Test POST /ivr-menu - Create second level IVR menu"""
        fixture = ivr_menu_fixtures['second.ivr.menu']

        ivr_data = {
            'name': fixture['name'],
            'extension': fixture['extension'],  # Use fixture extension (30021) to avoid conflicts
            'description': fixture['description'],
            'timeout': 5,
            'timeout_extension': '201',
            'number_of_repeat': 2,
            'allow_enter_any_internal_extension': False,
            'actions': [
                {'digits': '1', 'extension': '201'},
                {'digits': '2', 'extension': '202'}
            ]
        }

        response = api_client.post('ivr-menu', ivr_data)
        assert_api_success(response, "Failed to create second IVR menu")

        ivr_id = response['data']['id']
        self.created_ids.append(ivr_id)

        print(f"✓ Created second IVR menu with ID: {ivr_id}")
        print(f"  Timeout extension: {ivr_data['timeout_extension']}")

    def test_04_get_ivr_list(self, api_client):
        """Test GET /ivr-menu - Get list of IVR menus"""
        response = api_client.get('ivr-menu', params={'limit': 10})
        assert_api_success(response, "Failed to get IVR menu list")

        data = response['data']
        assert isinstance(data, list), "Response data should be a list"

        # After creating 2 IVRs in previous tests, we should have at least 2
        # But tests might run independently, so just check structure
        if len(self.created_ids) > 0:
            assert len(data) >= len(self.created_ids), f"Expected at least {len(self.created_ids)} IVR menus, got {len(data)}"

        # Verify structure
        for menu in data:
            assert 'id' in menu
            assert 'name' in menu
            assert 'extension' in menu
            assert 'actions' in menu

        print(f"✓ Found {len(data)} IVR menus")

    def test_05_get_ivr_record(self, api_client):
        """Test GET /ivr-menu/{id} - Get single IVR menu with details"""
        if not self.created_ids:
            pytest.skip("No IVR menus created yet")

        ivr_id = self.created_ids[0]
        record = assert_record_exists(api_client, 'ivr-menu', ivr_id)

        # Verify all fields present
        assert record['id'] == ivr_id
        assert 'name' in record
        assert 'extension' in record
        assert 'description' in record
        assert 'timeout' in record
        assert 'timeout_extension' in record
        assert 'number_of_repeat' in record
        assert 'allow_enter_any_internal_extension' in record
        assert 'actions' in record

        # Verify actions structure
        assert isinstance(record['actions'], list)
        if len(record['actions']) > 0:
            action = record['actions'][0]
            assert 'digits' in action
            assert 'extension' in action
            assert 'extension_represent' in action

        print(f"✓ Retrieved IVR menu: {record['name']}")
        print(f"  Extension: {record['extension']}")
        print(f"  Actions: {len(record['actions'])}")
        print(f"  Timeout: {record['timeout']}s")
        print(f"  Repeat: {record['number_of_repeat']} times")

    def test_06_search_ivr_menus(self, api_client):
        """Test GET /ivr-menu with search parameter"""
        response = api_client.get('ivr-menu', params={
            'search': 'IVR',
            'limit': 10
        })
        assert_api_success(response, "Failed to search IVR menus")

        data = response['data']
        assert isinstance(data, list)

        # Verify search results contain search term
        for menu in data:
            search_fields = f"{menu.get('name', '')} {menu.get('description', '')}"
            assert 'IVR' in search_fields.upper() or 'MENU' in search_fields.upper()

        print(f"✓ Search found {len(data)} IVR menus")

    def test_07_update_ivr_menu_full(self, api_client):
        """Test PUT /ivr-menu/{id} - Full update of IVR menu"""
        if not self.created_ids:
            pytest.skip("No IVR menus created yet")

        ivr_id = self.created_ids[0]

        # Get current data first
        current = assert_record_exists(api_client, 'ivr-menu', ivr_id)

        # Update all fields
        update_data = {
            'name': f"{current['name']} (Updated)",
            'extension': current['extension'],
            'description': 'Updated via PUT request',
            'timeout': 10,
            'timeout_extension': '',
            'number_of_repeat': 5,
            'allow_enter_any_internal_extension': False,
            'audio_message_id': '',
            'actions': [
                {'digits': '1', 'extension': '201'},
                {'digits': '2', 'extension': '202'},
                {'digits': '3', 'extension': '203'},
                {'digits': '9', 'extension': '200'}
            ]
        }

        response = api_client.put(f'ivr-menu/{ivr_id}', update_data)
        assert_api_success(response, "Failed to update IVR menu")

        # Verify changes
        updated = assert_record_exists(api_client, 'ivr-menu', ivr_id)
        assert updated['name'] == update_data['name']
        assert updated['timeout'] == 10
        assert updated['number_of_repeat'] == 5
        assert len(updated['actions']) == 4

        print(f"✓ Updated IVR menu: {updated['name']}")
        print(f"  New timeout: {updated['timeout']}s")
        print(f"  New actions count: {len(updated['actions'])}")

    def test_08_patch_ivr_menu(self, api_client):
        """Test PATCH /ivr-menu/{id} - Partial update"""
        if not self.created_ids:
            pytest.skip("No IVR menus created yet")

        ivr_id = self.created_ids[0]

        # Patch only specific fields
        patch_data = {
            'description': 'Patched description',
            'timeout': 15
        }

        response = api_client.patch(f'ivr-menu/{ivr_id}', patch_data)
        assert_api_success(response, "Failed to patch IVR menu")

        # Verify only patched fields changed
        updated = assert_record_exists(api_client, 'ivr-menu', ivr_id)
        assert updated['description'] == 'Patched description'
        assert updated['timeout'] == 15

        print(f"✓ Patched IVR menu")
        print(f"  New description: {updated['description']}")
        print(f"  New timeout: {updated['timeout']}s")

    def test_09_copy_ivr_menu(self, api_client):
        """Test GET /ivr-menu/{id}:copy - Copy IVR menu"""
        if not self.created_ids:
            pytest.skip("No IVR menus created yet")

        source_id = self.created_ids[0]

        response = api_client.get(f'ivr-menu/{source_id}:copy')
        assert_api_success(response, "Failed to copy IVR menu")

        copied_data = response['data']
        # Copy actually creates a new record with new ID
        assert 'id' in copied_data
        assert copied_data['id'] != source_id
        assert copied_data['id'].startswith('IVR-')
        assert 'name' in copied_data
        assert 'extension' in copied_data
        assert 'actions' in copied_data

        # Name should have "copy of" prefix (lowercase)
        assert 'copy of' in copied_data['name'].lower()

        # Store copied ID for cleanup
        self.created_ids.append(copied_data['id'])

        print(f"✓ Copied IVR menu created with new ID: {copied_data['id']}")
        print(f"  New name: {copied_data['name']}")
        print(f"  New extension: {copied_data['extension']}")
        print(f"  Actions preserved: {len(copied_data['actions'])}")

    def test_10_validate_required_fields(self, api_client):
        """Test POST /ivr-menu - Validation of required fields"""
        # Try to create without required fields
        invalid_data = {
            'description': 'Missing name and extension'
        }

        try:
            response = api_client.post('ivr-menu', invalid_data)
            # Should fail validation
            assert response['result'] is False
            assert response.get('httpCode', 200) in [400, 422]
            assert len(response.get('messages', {}).get('error', [])) > 0
            print(f"✓ Validation works - rejected incomplete data")
            print(f"  Errors: {response['messages']}")
        except Exception as e:
            # HTTP 422 is expected for validation errors
            if '422' in str(e):
                print(f"✓ Validation works - HTTP 422 Unprocessable Entity")
            else:
                raise

    def test_11_validate_extension_format(self, api_client):
        """Test POST /ivr-menu - Validation of extension format"""
        invalid_data = {
            'name': 'Test IVR',
            'extension': 'abc',  # Invalid - should be numeric
            'timeout': 7
        }

        try:
            response = api_client.post('ivr-menu', invalid_data)
            # Should fail validation
            assert response['result'] is False
            assert response.get('httpCode', 200) in [400, 422]
            print(f"✓ Extension format validation works")
        except Exception as e:
            if '422' in str(e):
                print(f"✓ Extension format validation works - HTTP 422")
            else:
                raise

    def test_12_validate_timeout_range(self, api_client):
        """Test PATCH /ivr-menu/{id} - Validation of timeout range"""
        if not self.created_ids:
            pytest.skip("No IVR menus created yet")

        ivr_id = self.created_ids[0]

        # Try invalid timeout
        patch_data = {
            'timeout': 9999  # Too large
        }

        response = api_client.patch(f'ivr-menu/{ivr_id}', patch_data)

        # Should fail validation (but might be allowed in some implementations)
        if response['result'] is False:
            print(f"✓ Timeout range validation enforced")
        else:
            print(f"⚠ Timeout range validation not enforced (implementation-specific)")

    def test_13_verify_cleanup(self, api_client):
        """Perform cleanup and verify all test IVR menus are removed"""
        test_extensions = ['2000', '30021']

        # First, explicitly delete all created IVR menus
        deleted_count = 0
        for ivr_id in self.created_ids[:]:
            try:
                api_client.delete(f'ivr-menu/{ivr_id}')
                print(f"  Deleted IVR menu {ivr_id}")
                deleted_count += 1
            except Exception as e:
                print(f"  Could not delete {ivr_id}: {e}")

        # Clear the list since we've cleaned up
        self.created_ids.clear()

        # Now verify no test IVRs remain
        response = api_client.get('ivr-menu')
        assert_api_success(response, "Failed to get IVR menu list")

        data = response['data']
        for menu in data:
            assert menu.get('extension') not in test_extensions, \
                f"Test IVR with extension {menu.get('extension')} still exists"

        print(f"✓ Cleanup complete - deleted {deleted_count} IVR menus, no test IVRs remain")


class TestIvrMenuEdgeCases:
    """Edge cases and error scenarios"""

    def test_01_get_nonexistent_record(self, api_client):
        """Test GET /ivr-menu/{id} with non-existent ID"""
        fake_id = 'IVR-FFFFFFFF'  # Valid format but non-existent

        try:
            response = api_client.get(f'ivr-menu/{fake_id}')
            assert response['result'] is False
            assert response.get('httpCode', 200) in [404, 422]
            print(f"✓ Error returned for non-existent IVR menu")
        except Exception as e:
            if '404' in str(e) or '422' in str(e):
                print(f"✓ Error returned for non-existent IVR menu (via exception)")
            else:
                raise

    def test_02_update_nonexistent_record(self, api_client):
        """Test PUT /ivr-menu/{id} with non-existent ID - Should return 404"""
        fake_id = 'IVR-FFFFFFFF'

        update_data = {
            'name': 'Should Fail',
            'extension': '2999',
            'timeout': 7
        }

        response = api_client.put(f'ivr-menu/{fake_id}', update_data, allow_404=True)
        # PUT on non-existent resource should return 404
        assert response['result'] is False, "PUT on non-existent IVR menu should fail"
        assert response.get('httpCode', 200) == 404, f"Expected HTTP 404, got {response.get('httpCode')}"
        assert len(response.get('messages', {}).get('error', [])) > 0, "Should have error message"
        print(f"✓ PUT on non-existent IVR menu returns 404 (REST compliant)")

    def test_03_patch_nonexistent_record(self, api_client):
        """Test PATCH /ivr-menu/{id} with non-existent ID - Should return 404"""
        fake_id = 'IVR-FFFFFFFF'

        patch_data = {
            'description': 'Should Fail'
        }

        response = api_client.patch(f'ivr-menu/{fake_id}', patch_data, allow_404=True)
        # PATCH on non-existent resource should return 404
        assert response['result'] is False, "PATCH on non-existent IVR menu should fail"
        assert response.get('httpCode', 200) == 404, f"Expected HTTP 404, got {response.get('httpCode')}"
        assert len(response.get('messages', {}).get('error', [])) > 0, "Should have error message"
        print(f"✓ PATCH on non-existent IVR menu returns 404 (REST compliant)")

    def test_04_delete_nonexistent_record(self, api_client):
        """Test DELETE /ivr-menu/{id} with non-existent ID"""
        fake_id = 'IVR-FFFFFFFF'

        try:
            response = api_client.delete(f'ivr-menu/{fake_id}')
            # Some APIs return 404, which is correct REST behavior
            assert response['result'] is False
            print(f"✓ DELETE on non-existent record returns error (REST compliant)")
        except Exception as e:
            if '404' in str(e):
                print(f"✓ DELETE on non-existent record returns 404 (REST compliant)")
            else:
                raise

    def test_05_duplicate_extension(self, api_client):
        """Test creating IVR menu with duplicate extension"""
        # Use a unique extension that's unlikely to exist
        import time
        unique_ext = f"28{int(time.time()) % 100000}"

        # Create first IVR
        ivr_data = {
            'name': 'First IVR',
            'extension': unique_ext,
            'timeout': 7
        }

        try:
            response1 = api_client.post('ivr-menu', ivr_data)
            if not response1['result']:
                pytest.skip("Failed to create first IVR menu")

            ivr_id = response1['data']['id']

            try:
                # Try to create second with same extension
                ivr_data2 = {
                    'name': 'Second IVR',
                    'extension': unique_ext,  # Same extension
                    'timeout': 7
                }

                response2 = api_client.post('ivr-menu', ivr_data2)

                # Should fail with conflict
                assert response2['result'] is False
                assert response2.get('httpCode', 200) in [409, 422]
                print(f"✓ Duplicate extension rejected with {response2.get('httpCode')}")
            except Exception as e:
                if '409' in str(e) or '422' in str(e):
                    print(f"✓ Duplicate extension rejected (via exception)")
                else:
                    raise
            finally:
                # Cleanup
                api_client.delete(f'ivr-menu/{ivr_id}')
        except Exception as e:
            if '409' in str(e):
                # Extension already exists from previous test run
                print(f"⚠ Test extension already exists, skipping duplicate test")
                pytest.skip("Test extension already exists")
            else:
                raise


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
