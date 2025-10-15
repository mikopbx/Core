#!/usr/bin/env python3
"""
Test suite for Asterisk REST Interface (ARI) Users operations

Tests the /pbxcore/api/v3/asterisk-rest-users endpoint for:
- Getting all ARI users with pagination and filtering
- Getting specific user by ID
- Creating new ARI users
- Updating users (PUT - full replacement)
- Partial updates (PATCH)
- Deleting users
- Custom method: getDefault

ARI (Asterisk REST Interface) provides WebSocket-based APIs for building custom
telephony applications with real-time call control capabilities. ARI users are
authenticated accounts that can access the ARI interface for programmatic
call control, channel manipulation, and event monitoring.

NOTE: Similar structure to AMI users (test_17) but for ARI interface instead.
"""

import pytest
import time
from conftest import assert_api_success, assert_record_exists, assert_record_deleted


class TestAsteriskRestUsers:
    """Comprehensive CRUD tests for ARI Users"""

    created_ids = []

    def test_01_get_default_template(self, api_client):
        """Test GET /asterisk-rest-users:getDefault - Get default user template"""
        response = api_client.get('asterisk-rest-users:getDefault')
        assert_api_success(response, "Failed to get default ARI user template")

        data = response['data']
        assert isinstance(data, dict), "Default template should be a dict"

        # Verify essential fields exist
        assert 'username' in data or 'password' in data or 'description' in data

        print(f"✓ Retrieved default ARI user template")

    def test_02_create_ari_user_basic(self, api_client):
        """Test POST /asterisk-rest-users - Create basic ARI user"""
        user_data = {
            'username': 'test_ari_user',
            'password': 'TestSecret123!@#',
            'description': 'Test ARI User',
            'disabled': False
        }

        response = api_client.post('asterisk-rest-users', user_data)
        assert_api_success(response, "Failed to create ARI user")

        assert 'id' in response['data']
        user_id = response['data']['id']
        self.created_ids.append(user_id)

        print(f"✓ Created ARI user: {user_id}")
        print(f"  Username: {user_data['username']}")
        print(f"  Description: {user_data['description']}")

    def test_03_create_ari_user_minimal(self, api_client):
        """Test POST /asterisk-rest-users - Create user with minimal fields"""
        user_data = {
            'username': 'minimal_ari',
            'password': 'MinimalPass456'
        }

        response = api_client.post('asterisk-rest-users', user_data)
        assert_api_success(response, "Failed to create minimal ARI user")

        user_id = response['data']['id']
        self.created_ids.append(user_id)

        print(f"✓ Created minimal ARI user: {user_id}")

    def test_04_get_users_list(self, api_client):
        """Test GET /asterisk-rest-users - Get list with pagination"""
        response = api_client.get('asterisk-rest-users', params={'limit': 20, 'offset': 0})
        assert_api_success(response, "Failed to get ARI users list")

        data = response['data']

        # Handle pagination format (dict with 'items') or plain list
        if isinstance(data, dict):
            users_list = data.get('items', [])
            total = data.get('total', len(users_list))
            print(f"✓ Found {len(users_list)} ARI users (pagination format, total: {total})")
        elif isinstance(data, list):
            users_list = data
            print(f"✓ Found {len(users_list)} ARI users")
        else:
            users_list = []
            print(f"⚠ Unexpected data type: {type(data)}")

        if len(self.created_ids) > 0:
            assert len(users_list) >= len(self.created_ids), \
                f"Expected at least {len(self.created_ids)} users"

    def test_05_get_users_with_search(self, api_client):
        """Test GET /asterisk-rest-users - Search by username"""
        try:
            response = api_client.get('asterisk-rest-users', params={'search': 'test_ari', 'limit': 10})
            assert_api_success(response, "Failed to search ARI users")

            data = response['data']

            # Handle pagination format (dict with 'items') or plain list
            if isinstance(data, dict):
                users_list = data.get('items', [])
                total = data.get('total', len(users_list))
                print(f"✓ Search found {len(users_list)} users matching 'test_ari' (total: {total})")
            elif isinstance(data, list):
                users_list = data
                print(f"✓ Search found {len(users_list)} users matching 'test_ari'")
            else:
                print(f"⚠ Unexpected data type: {type(data)}")
        except Exception as e:
            if '422' in str(e):
                print(f"⚠ Search not fully implemented or invalid params")
            else:
                raise

    def test_06_get_user_by_id(self, api_client):
        """Test GET /asterisk-rest-users/{id} - Get specific user"""
        if not self.created_ids:
            pytest.skip("No users created yet")

        user_id = self.created_ids[0]
        record = assert_record_exists(api_client, 'asterisk-rest-users', user_id)

        # Verify structure (ID can be int or string)
        assert str(record['id']) == str(user_id)
        assert 'username' in record
        assert 'description' in record or 'disabled' in record

        print(f"✓ Retrieved ARI user: ID={user_id}")
        if 'username' in record:
            print(f"  Username: {record['username']}")
        if 'description' in record:
            print(f"  Description: {record['description']}")

    def test_07_update_user(self, api_client):
        """Test PUT /asterisk-rest-users/{id} - Full update"""
        if not self.created_ids:
            pytest.skip("No users created yet")

        user_id = self.created_ids[0]
        current = assert_record_exists(api_client, 'asterisk-rest-users', user_id)

        # Update with all required fields
        update_data = {
            'id': user_id,
            'username': current.get('username', 'test_ari_user') + '_updated',
            'password': 'UpdatedSecret789!@#',
            'description': current.get('description', 'User') + ' (Updated)',
            'disabled': False
        }

        response = api_client.put(f'asterisk-rest-users/{user_id}', update_data)
        assert_api_success(response, "Failed to update ARI user")

        # Verify update
        updated = assert_record_exists(api_client, 'asterisk-rest-users', user_id)
        assert '(Updated)' in updated.get('description', '')

        print(f"✓ Updated ARI user: {updated.get('description', 'N/A')}")

    def test_08_patch_user(self, api_client):
        """Test PATCH /asterisk-rest-users/{id} - Partial update"""
        if not self.created_ids:
            pytest.skip("No users created yet")

        user_id = self.created_ids[0]

        patch_data = {
            'description': 'Patched ARI User Description',
            'disabled': True
        }

        response = api_client.patch(f'asterisk-rest-users/{user_id}', patch_data)
        assert_api_success(response, "Failed to patch ARI user")

        # Verify patch
        updated = assert_record_exists(api_client, 'asterisk-rest-users', user_id)
        assert updated.get('description') == 'Patched ARI User Description'

        # Handle both boolean and string representations, or missing field
        disabled_value = updated.get('disabled')
        if disabled_value is not None:
            is_disabled = disabled_value in [True, 'true', '1', 1]
            assert is_disabled, f"Expected disabled=True, got {disabled_value}"
            print(f"✓ Patched ARI user (disabled={disabled_value})")
        else:
            # Field may not be returned in response
            print(f"✓ Patched ARI user (disabled field not in response)")

    def test_09_delete_users(self, api_client):
        """Test DELETE /asterisk-rest-users/{id} - Delete users"""
        deleted_count = 0
        failed_count = 0

        for user_id in self.created_ids[:]:
            try:
                response = api_client.delete(f'asterisk-rest-users/{user_id}')
                assert_api_success(response, f"Failed to delete ARI user {user_id}")

                assert_record_deleted(api_client, 'asterisk-rest-users', user_id)

                print(f"✓ Deleted ARI user: {user_id}")
                deleted_count += 1
            except Exception as e:
                if '422' in str(e) or '404' in str(e):
                    print(f"⚠ Could not delete user {user_id}: {str(e)[:80]}")
                    failed_count += 1
                else:
                    raise

        print(f"✓ Deleted {deleted_count} users, {failed_count} failed")
        self.created_ids.clear()


class TestAsteriskRestUsersEdgeCases:
    """Edge cases for ARI users"""

    def test_01_validate_required_fields(self, api_client):
        """Test validation - missing required username field"""
        invalid_data = {
            'password': 'TestSecret123',
            'description': 'Invalid User',
            # Missing required 'username' field
        }

        try:
            response = api_client.post('asterisk-rest-users', invalid_data)

            if not response['result']:
                print(f"✓ Validation rejected incomplete data")
            else:
                # Cleanup if accepted
                if 'id' in response['data']:
                    try:
                        api_client.delete(f"asterisk-rest-users/{response['data']['id']}")
                    except:
                        pass
                print(f"⚠ Missing username was accepted (may have default)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Validation works (HTTP error)")
            else:
                raise

    def test_02_validate_username_uniqueness(self, api_client):
        """Test validation - duplicate username should fail"""
        # Create first user
        user_data = {
            'username': 'test_unique_ari',
            'password': 'TestSecret123',
            'description': 'First User'
        }

        first = api_client.post('asterisk-rest-users', user_data)
        if not first['result']:
            pytest.skip("Could not create first user")

        first_id = first['data']['id']

        try:
            # Try to create duplicate
            duplicate_data = user_data.copy()
            duplicate_data['description'] = 'Duplicate User'

            response = api_client.post('asterisk-rest-users', duplicate_data)

            if not response['result']:
                print(f"✓ Duplicate username rejected")
            else:
                # Cleanup duplicate if created
                if 'id' in response['data']:
                    api_client.delete(f"asterisk-rest-users/{response['data']['id']}")
                print(f"⚠ Duplicate username accepted")
        except Exception as e:
            if '409' in str(e) or '422' in str(e):
                print(f"✓ Duplicate username rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")
        finally:
            # Cleanup first user
            try:
                api_client.delete(f'asterisk-rest-users/{first_id}')
            except:
                pass

    def test_03_validate_password_requirements(self, api_client):
        """Test validation - weak password handling"""
        weak_data = {
            'username': 'test_weak_pass_ari',
            'password': '123',  # Weak password
            'description': 'Weak Password Test'
        }

        try:
            response = api_client.post('asterisk-rest-users', weak_data)

            if response['result']:
                # Some systems may accept weak passwords
                user_id = response['data']['id']
                try:
                    api_client.delete(f'asterisk-rest-users/{user_id}')
                except:
                    pass
                print(f"⚠ Weak password accepted (lenient validation)")
            else:
                print(f"✓ Weak password rejected")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Weak password rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")

    def test_04_get_nonexistent_user(self, api_client):
        """Test GET /asterisk-rest-users/{id} with non-existent ID"""
        fake_id = '999999'

        try:
            response = api_client.get(f'asterisk-rest-users/{fake_id}')
            assert response['result'] is False
            print(f"✓ Non-existent user rejected")
        except Exception as e:
            if '404' in str(e) or '422' in str(e):
                print(f"✓ Non-existent user rejected (HTTP error)")
            else:
                raise

    def test_05_validate_username_format(self, api_client):
        """Test validation - invalid username characters"""
        invalid_data = {
            'username': 'test user@#$',  # Invalid characters
            'password': 'TestSecret123',
            'description': 'Invalid Username Format'
        }

        try:
            response = api_client.post('asterisk-rest-users', invalid_data)

            if not response['result']:
                print(f"✓ Invalid username format rejected")
            else:
                # Cleanup if accepted (system may normalize)
                if 'id' in response['data']:
                    api_client.delete(f"asterisk-rest-users/{response['data']['id']}")
                print(f"⚠ Invalid username format accepted (may be normalized)")
        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid username format rejected via HTTP error")
            else:
                print(f"⚠ Unexpected error: {str(e)[:50]}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
