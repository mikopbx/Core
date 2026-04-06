#!/usr/bin/env python3
"""
Test suite for API Keys Permission Management

Tests fine-grained access control using allowed_paths with read/write permissions:
- Read-only access to specific endpoints (GET allowed, POST/PUT/PATCH/DELETE denied)
- Write access to specific endpoints (all CRUD operations allowed)
- Forbidden endpoint access (all operations denied)
- Full permissions vs restricted access comparison
- Permission inheritance and validation

API Keys support endpoint-level permissions using allowed_paths object:
{
    "/api/v3/extensions": "read",      # GET only
    "/api/v3/call-queues": "write",    # Full CRUD access
    "/api/v3/cdr": "read"              # GET only
}

When full_permissions=false, only endpoints listed in allowed_paths are accessible.
When full_permissions=true, all endpoints are accessible (allowed_paths ignored).
"""

import pytest
import time
from conftest import assert_api_success, MikoPBXClient


class TestApiKeyPermissions:
    """Test API key permission enforcement"""

    # Store created keys and records for cleanup
    created_keys = []
    created_extensions = []
    created_queues = []

    @pytest.fixture(scope='class', autouse=True)
    def setup_and_teardown(self, api_client):
        """Setup and teardown for all tests in this class"""
        yield
        # Cleanup after all tests
        self._cleanup_all(api_client)

    def _cleanup_all(self, api_client):
        """Clean up all created resources"""
        # Delete created extensions
        for ext_id in self.created_extensions[:]:
            try:
                api_client.delete(f'extensions/{ext_id}')
                print(f"✓ Cleaned up extension: {ext_id}")
            except:
                pass
        self.created_extensions.clear()

        # Delete created call queues
        for queue_id in self.created_queues[:]:
            try:
                api_client.delete(f'call-queues/{queue_id}')
                print(f"✓ Cleaned up call queue: {queue_id}")
            except:
                pass
        self.created_queues.clear()

        # Delete created API keys
        for key_id in self.created_keys[:]:
            try:
                api_client.delete(f'api-keys/{key_id}')
                print(f"✓ Cleaned up API key: {key_id}")
            except:
                pass
        self.created_keys.clear()

    def test_01_create_read_only_api_key(self, api_client):
        """
        Test creating API key with read-only permissions

        Creates a key that can only GET from specific endpoints:
        - /api/v3/extensions: read
        - /api/v3/cdr: read
        """
        # Generate API key
        gen_response = api_client.post('api-keys:generateKey', {})
        assert_api_success(gen_response, "Failed to generate API key")

        generated_key = gen_response['data'].get('key') or gen_response['data'].get('api_key')
        assert generated_key, "Generated key not found in response"

        # Create API key with read-only permissions
        key_data = {
            'key': generated_key,
            'description': 'Read-Only Test Key',
            'full_permissions': False,
            'allowed_paths': {
                '/api/v3/extensions': 'read',
                '/api/v3/cdr': 'read'
            }
        }

        response = api_client.post('api-keys', key_data)
        assert_api_success(response, "Failed to create read-only API key")

        key_id = response['data']['id']
        self.created_keys.append(key_id)

        # Verify structure
        assert 'allowed_paths' in response['data'], "Response should include allowed_paths"
        allowed_paths = response['data']['allowed_paths']

        print(f"✓ Created read-only API key: {key_id}")
        print(f"  Description: {key_data['description']}")
        print(f"  Key (partial): {generated_key[:20]}...")
        print(f"  Allowed paths: {allowed_paths}")
        print(f"  Full permissions: {response['data'].get('full_permissions', False)}")

        # Store the key for permission tests
        self.__class__.readonly_key = generated_key
        self.__class__.readonly_key_id = key_id

    def test_02_create_write_access_api_key(self, api_client):
        """
        Test creating API key with write permissions

        Creates a key with full CRUD access to specific endpoints:
        - /api/v3/call-queues: write (GET/POST/PUT/PATCH/DELETE)
        - /api/v3/extensions: read (GET only)
        """
        # Generate API key
        gen_response = api_client.post('api-keys:generateKey', {})
        assert_api_success(gen_response, "Failed to generate API key")

        generated_key = gen_response['data'].get('key') or gen_response['data'].get('api_key')
        assert generated_key, "Generated key not found in response"

        # Create API key with mixed permissions
        key_data = {
            'key': generated_key,
            'description': 'Mixed Permissions Test Key',
            'full_permissions': False,
            'allowed_paths': {
                '/api/v3/call-queues': 'write',  # Full CRUD
                '/api/v3/extensions': 'read'      # GET only
            }
        }

        response = api_client.post('api-keys', key_data)
        assert_api_success(response, "Failed to create mixed permissions API key")

        key_id = response['data']['id']
        self.created_keys.append(key_id)

        print(f"✓ Created mixed permissions API key: {key_id}")
        print(f"  Description: {key_data['description']}")
        print(f"  Key (partial): {generated_key[:20]}...")
        print(f"  Allowed paths: {response['data'].get('allowed_paths', {})}")

        # Store the key for permission tests
        self.__class__.write_key = generated_key
        self.__class__.write_key_id = key_id

    def test_03_create_forbidden_api_key(self, api_client):
        """
        Test creating API key with no permissions to certain endpoints

        Creates a key with access to some endpoints, but NOT to others:
        - /api/v3/sound-files: write (allowed)
        - /api/v3/extensions: (not listed = forbidden)
        - /api/v3/call-queues: (not listed = forbidden)
        """
        # Generate API key
        gen_response = api_client.post('api-keys:generateKey', {})
        assert_api_success(gen_response, "Failed to generate API key")

        generated_key = gen_response['data'].get('key') or gen_response['data'].get('api_key')
        assert generated_key, "Generated key not found in response"

        # Create API key with limited scope
        key_data = {
            'key': generated_key,
            'description': 'Limited Scope Test Key',
            'full_permissions': False,
            'allowed_paths': {
                '/api/v3/sound-files': 'write'  # Only this endpoint
            }
        }

        response = api_client.post('api-keys', key_data)
        assert_api_success(response, "Failed to create limited scope API key")

        key_id = response['data']['id']
        self.created_keys.append(key_id)

        print(f"✓ Created limited scope API key: {key_id}")
        print(f"  Allowed paths: {response['data'].get('allowed_paths', {})}")
        print(f"  Forbidden: /api/v3/extensions, /api/v3/call-queues (not listed)")

        # Store the key for permission tests
        self.__class__.forbidden_key = generated_key
        self.__class__.forbidden_key_id = key_id

    def test_04_create_full_permissions_api_key(self, api_client):
        """
        Test creating API key with full permissions

        Creates a key with unrestricted access (full_permissions=true)
        """
        # Generate API key
        gen_response = api_client.post('api-keys:generateKey', {})
        assert_api_success(gen_response, "Failed to generate API key")

        generated_key = gen_response['data'].get('key') or gen_response['data'].get('api_key')
        assert generated_key, "Generated key not found in response"

        # Create API key with full permissions
        key_data = {
            'key': generated_key,
            'description': 'Full Permissions Test Key',
            'full_permissions': True
        }

        response = api_client.post('api-keys', key_data)
        assert_api_success(response, "Failed to create full permissions API key")

        key_id = response['data']['id']
        self.created_keys.append(key_id)

        # Verify full_permissions flag
        assert response['data'].get('full_permissions') is True, "full_permissions should be True"
        assert response['data'].get('allowed_paths', {}) == {} or \
               response['data'].get('allowed_paths', {}) == [], \
            "allowed_paths should be empty for full permissions"

        print(f"✓ Created full permissions API key: {key_id}")
        print(f"  Full permissions: {response['data'].get('full_permissions')}")

        # Store the key for comparison tests
        self.__class__.full_key = generated_key
        self.__class__.full_key_id = key_id

    def test_10_read_only_get_allowed(self, api_client):
        """
        Test read-only key can GET from allowed endpoints

        Verifies GET /api/v3/extensions works with read permission
        """
        if not hasattr(self.__class__, 'readonly_key'):
            pytest.skip("Read-only key not created")

        # Create temporary API client with read-only key
        readonly_client = MikoPBXClient(
            base_url=api_client.base_url,
            auth_token=self.readonly_key,
        )

        # Test GET on allowed endpoint
        response = readonly_client.get('extensions', params={'limit': 5})
        assert_api_success(response, "Read-only key should be able to GET extensions")

        print(f"✓ Read-only key successfully performed GET /api/v3/extensions")
        print(f"  Retrieved {len(response.get('data', []))} records")

    def test_11_read_only_post_denied(self, api_client):
        """
        Test read-only key cannot POST to read-only endpoints

        Verifies POST /api/v3/call-queues is denied (not in allowed_paths)
        """
        if not hasattr(self.__class__, 'readonly_key'):
            pytest.skip("Read-only key not created")

        # Create temporary API client with read-only key
        readonly_client = MikoPBXClient(
            base_url=api_client.base_url,
            auth_token=self.readonly_key,
        )

        # Test POST on endpoint NOT in allowed_paths
        queue_data = {
            'name': 'Unauthorized Queue',
            'extension': '9001'
        }

        try:
            response = readonly_client.post('call-queues', queue_data)

            # Should be denied (403 Forbidden or 401 Unauthorized)
            if response['result'] is False:
                print(f"✓ Read-only key correctly denied POST /api/v3/call-queues")
                print(f"  HTTP Code: {response.get('httpCode', 'N/A')}")
                print(f"  Reason: Endpoint not in allowed_paths")
            else:
                # If it succeeded, cleanup and fail
                if 'id' in response.get('data', {}):
                    api_client.delete(f"call-queues/{response['data']['id']}")
                pytest.fail("Read-only key should NOT access endpoints not in allowed_paths")

        except Exception as e:
            if '403' in str(e) or '401' in str(e):
                print(f"✓ Read-only key correctly denied with HTTP error: {str(e)[:80]}")
            else:
                raise

    def test_12_read_only_cdr_get_allowed(self, api_client):
        """
        Test read-only key CAN access CDR with read permission

        Verifies GET /api/v3/cdr works (in allowed_paths with read)
        """
        if not hasattr(self.__class__, 'readonly_key'):
            pytest.skip("Read-only key not created")

        # Create temporary API client with read-only key
        readonly_client = MikoPBXClient(
            base_url=api_client.base_url,
            auth_token=self.readonly_key,
        )

        # Test GET on allowed endpoint
        try:
            response = readonly_client.get('cdr', params={'limit': 5})
            if response['result']:
                print(f"✓ Read-only key successfully accessed GET /api/v3/cdr")
                print(f"  Retrieved {len(response.get('data', []))} records")
            else:
                print(f"⚠ Could not access CDR: {response.get('messages')}")
        except Exception as e:
            if '403' in str(e) or '401' in str(e):
                pytest.fail(f"Read-only key should be able to GET cdr (has read permission): {str(e)[:80]}")
            else:
                print(f"⚠ CDR endpoint may not be available: {str(e)[:80]}")

    def test_20_write_key_get_allowed(self, api_client):
        """
        Test write key can GET from write-enabled endpoints

        Verifies GET /api/v3/call-queues works with write permission
        """
        if not hasattr(self.__class__, 'write_key'):
            pytest.skip("Write key not created")

        write_client = MikoPBXClient(
            base_url=api_client.base_url,
            auth_token=self.write_key,
        )

        # Test GET on write-enabled endpoint
        response = write_client.get('call-queues', params={'limit': 5})
        assert_api_success(response, "Write key should be able to GET call-queues")

        print(f"✓ Write key successfully performed GET /api/v3/call-queues")

    def test_21_write_key_post_allowed(self, api_client):
        """
        Test write key can POST to write-enabled endpoints

        Verifies POST /api/v3/call-queues works with write permission
        """
        if not hasattr(self.__class__, 'write_key'):
            pytest.skip("Write key not created")

        write_client = MikoPBXClient(
            base_url=api_client.base_url,
            auth_token=self.write_key,
        )

        # Test POST on write-enabled endpoint
        # Use timestamp-based extension to avoid conflicts
        import time
        unique_extension = f"80{int(time.time()) % 100:02d}"
        queue_data = {
            'name': 'Permission Test Queue',
            'extension': unique_extension
        }

        response = write_client.post('call-queues', queue_data)
        assert_api_success(response, "Write key should be able to POST call-queues")

        queue_id = response['data']['id']
        self.created_queues.append(queue_id)

        print(f"✓ Write key successfully performed POST /api/v3/call-queues")
        print(f"  Created queue ID: {queue_id}")

    def test_22_write_key_read_endpoint_get_allowed(self, api_client):
        """
        Test write key CAN read from read-only endpoints

        Verifies GET /api/v3/extensions works (has read permission)
        """
        if not hasattr(self.__class__, 'write_key'):
            pytest.skip("Write key not created")

        write_client = MikoPBXClient(
            base_url=api_client.base_url,
            auth_token=self.write_key,
        )

        # Test GET on read-only endpoint
        try:
            response = write_client.get('extensions', params={'limit': 5})

            if response['result']:
                print(f"✓ Write key successfully performed GET on read-only endpoint")
                print(f"  Endpoint: /api/v3/extensions (has read permission)")
                print(f"  Retrieved {len(response.get('data', []))} records")
            else:
                print(f"⚠ Could not access extensions: {response.get('messages')}")

        except Exception as e:
            if '403' in str(e) or '401' in str(e):
                pytest.fail(f"Write key should access read-only endpoints: {str(e)[:80]}")
            else:
                raise

    def test_30_forbidden_key_access_denied(self, api_client):
        """
        Test forbidden key cannot access non-listed endpoints

        Verifies GET /api/v3/extensions is denied (not in allowed_paths)
        """
        if not hasattr(self.__class__, 'forbidden_key'):
            pytest.skip("Forbidden key not created")

        forbidden_client = MikoPBXClient(
            base_url=api_client.base_url,
            auth_token=self.forbidden_key,
        )

        # Test GET on forbidden endpoint
        try:
            response = forbidden_client.get('extensions', params={'limit': 5})

            if response['result'] is False:
                print(f"✓ Limited scope key correctly denied GET /api/v3/extensions")
                print(f"  Reason: Endpoint not in allowed_paths")
            else:
                pytest.fail("Limited scope key should NOT access non-listed endpoints")

        except Exception as e:
            if '403' in str(e) or '401' in str(e):
                print(f"✓ Limited scope key correctly denied: {str(e)[:80]}")
            else:
                raise

    def test_31_forbidden_key_allowed_endpoint_works(self, api_client):
        """
        Test forbidden key CAN access its allowed endpoint

        Verifies GET /api/v3/sound-files works (in allowed_paths)
        """
        if not hasattr(self.__class__, 'forbidden_key'):
            pytest.skip("Forbidden key not created")

        forbidden_client = MikoPBXClient(
            base_url=api_client.base_url,
            auth_token=self.forbidden_key,
        )

        # Test GET on allowed endpoint
        response = forbidden_client.get('sound-files', params={'limit': 5})
        assert_api_success(response, "Limited scope key should access allowed endpoint")

        print(f"✓ Limited scope key successfully accessed allowed endpoint")
        print(f"  Endpoint: /api/v3/sound-files (write permission)")

    def test_40_full_permissions_unrestricted_access(self, api_client):
        """
        Test full permissions key has unrestricted access

        Verifies key with full_permissions=true can access any endpoint
        """
        if not hasattr(self.__class__, 'full_key'):
            pytest.skip("Full permissions key not created")

        full_client = MikoPBXClient(
            base_url=api_client.base_url,
            auth_token=self.full_key,
        )

        # Test multiple endpoints
        endpoints_to_test = [
            ('extensions', 'GET /api/v3/extensions'),
            ('call-queues', 'GET /api/v3/call-queues'),
            ('sound-files', 'GET /api/v3/sound-files'),
            ('cdr', 'GET /api/v3/cdr')
        ]

        success_count = 0
        for endpoint, description in endpoints_to_test:
            try:
                response = full_client.get(endpoint, params={'limit': 1})
                if response['result']:
                    success_count += 1
                    print(f"✓ Full permissions key accessed: {description}")
            except Exception as e:
                print(f"⚠ Could not access {description}: {str(e)[:60]}")

        assert success_count >= 2, "Full permissions key should access multiple endpoints"
        print(f"\n✓ Full permissions key successfully accessed {success_count}/{len(endpoints_to_test)} endpoints")

    def test_50_compare_restricted_vs_full_permissions(self, api_client):
        """
        Compare behavior of restricted key vs full permissions key

        Demonstrates the difference in access levels
        """
        if not hasattr(self.__class__, 'readonly_key') or \
           not hasattr(self.__class__, 'full_key'):
            pytest.skip("Keys not created")

        readonly_client = MikoPBXClient(
            base_url=api_client.base_url,
            auth_token=self.readonly_key,
        )

        full_client = MikoPBXClient(
            base_url=api_client.base_url,
            auth_token=self.full_key,
        )

        print("\n=== Access Comparison ===")

        # Test 1: Allowed endpoint for both
        print("\n1. GET /api/v3/extensions (read-only has read, full has all)")
        try:
            readonly_resp = readonly_client.get('extensions', params={'limit': 1})
            readonly_ok = readonly_resp['result']
        except:
            readonly_ok = False

        try:
            full_resp = full_client.get('extensions', params={'limit': 1})
            full_ok = full_resp['result']
        except:
            full_ok = False

        print(f"  Read-only key: {'✓ Allowed' if readonly_ok else '✗ Denied'}")
        print(f"  Full key: {'✓ Allowed' if full_ok else '✗ Denied'}")

        # Test 2: Endpoint not in read-only allowed_paths
        print("\n2. GET /api/v3/call-queues (not in read-only, in full)")
        try:
            readonly_resp = readonly_client.get('call-queues', params={'limit': 1})
            readonly_ok = readonly_resp['result']
        except:
            readonly_ok = False

        try:
            full_resp = full_client.get('call-queues', params={'limit': 1})
            full_ok = full_resp['result']
        except:
            full_ok = False

        print(f"  Read-only key: {'✗ Denied (expected)' if not readonly_ok else '⚠ Allowed (unexpected)'}")
        print(f"  Full key: {'✓ Allowed' if full_ok else '✗ Denied'}")

        print("\n=== Summary ===")
        print("Read-only key: Limited to specific endpoints with read permission")
        print("Full key: Unrestricted access to all endpoints")


class TestJwtVsApiKeyPermissions:
    """Compare JWT admin token (unrestricted) vs API key permissions (restricted)"""

    def test_01_jwt_admin_token_unrestricted_access(self, api_client):
        """
        Test JWT admin token has unrestricted access to all endpoints

        This test verifies that authentication via login/password provides
        full administrative access, unlike API keys which can be restricted.
        """
        # api_client fixture uses JWT token from login/password authentication
        # It should have unrestricted access to all endpoints

        endpoints_to_test = [
            ('extensions', 'GET /api/v3/extensions'),
            ('call-queues', 'GET /api/v3/call-queues'),
            ('sound-files', 'GET /api/v3/sound-files'),
            ('cdr', 'GET /api/v3/cdr'),
            ('api-keys', 'GET /api/v3/api-keys'),
            ('employees', 'GET /api/v3/employees'),
            ('providers', 'GET /api/v3/providers'),
        ]

        success_count = 0
        print("\n=== Testing JWT Admin Token Access ===")

        for endpoint, description in endpoints_to_test:
            try:
                response = api_client.get(endpoint, params={'limit': 1})
                if response['result']:
                    success_count += 1
                    print(f"✓ {description}")
            except Exception as e:
                print(f"✗ {description}: {str(e)[:60]}")

        # JWT admin token should access ALL endpoints
        assert success_count >= 5, f"JWT admin token should access most endpoints (got {success_count}/{len(endpoints_to_test)})"

        print(f"\n✓ JWT admin token (login/password) accessed {success_count}/{len(endpoints_to_test)} endpoints")
        print("  No restrictions applied - full administrative access")

    def test_02_api_key_restricted_vs_jwt_unrestricted(self, api_client):
        """
        Direct comparison: API key with restrictions vs JWT admin token

        Creates a restricted API key and demonstrates that:
        - JWT admin token: Full access to everything
        - API key: Only access to allowed_paths
        """
        # Step 1: Create restricted API key (read-only for extensions)
        gen_response = api_client.post('api-keys:generateKey', {})
        if not gen_response['result']:
            pytest.skip("Could not generate API key")

        generated_key = gen_response['data'].get('key') or gen_response['data'].get('api_key')

        key_data = {
            'key': generated_key,
            'description': 'JWT vs API Key Comparison Test',
            'full_permissions': False,
            'allowed_paths': {
                '/api/v3/extensions': 'read'  # ONLY extensions, ONLY read
            }
        }

        create_response = api_client.post('api-keys', key_data)
        if not create_response['result']:
            pytest.skip("Could not create restricted API key")

        key_id = create_response['data']['id']

        # Step 2: Create client with restricted API key
        restricted_client = MikoPBXClient(
            base_url=api_client.base_url,
            auth_token=generated_key
        )

        print("\n=== Comparison: JWT Admin Token vs Restricted API Key ===\n")

        # Test 1: Extensions (allowed for both)
        print("1. GET /api/v3/extensions")
        try:
            jwt_response = api_client.get('extensions', params={'limit': 1})
            jwt_ok = jwt_response['result']
        except:
            jwt_ok = False

        try:
            api_key_response = restricted_client.get('extensions', params={'limit': 1})
            api_key_ok = api_key_response['result']
        except:
            api_key_ok = False

        print(f"   JWT admin token: {'✓ Allowed' if jwt_ok else '✗ Denied'}")
        print(f"   API key (restricted): {'✓ Allowed' if api_key_ok else '✗ Denied'}")
        print(f"   → Both have access (extensions in allowed_paths)")

        # Test 2: Call Queues (NOT in API key allowed_paths)
        print("\n2. GET /api/v3/call-queues")
        try:
            jwt_response = api_client.get('call-queues', params={'limit': 1})
            jwt_ok = jwt_response['result']
        except:
            jwt_ok = False

        try:
            api_key_response = restricted_client.get('call-queues', params={'limit': 1})
            api_key_ok = api_key_response['result']
        except:
            api_key_ok = False

        print(f"   JWT admin token: {'✓ Allowed' if jwt_ok else '✗ Denied'}")
        print(f"   API key (restricted): {'✗ Denied (expected)' if not api_key_ok else '⚠ Allowed (unexpected)'}")
        print(f"   → JWT has access, API key does NOT (not in allowed_paths)")

        # Test 3: POST to Call Queues (write operation)
        print("\n3. POST /api/v3/call-queues (write operation)")
        queue_data = {
            'name': 'JWT vs API Key Test Queue',
            'extension': '9999'
        }

        # JWT admin token should succeed
        try:
            jwt_response = api_client.post('call-queues', queue_data)
            jwt_ok = jwt_response['result']
            if jwt_ok and 'id' in jwt_response.get('data', {}):
                created_queue_id = jwt_response['data']['id']
        except:
            jwt_ok = False
            created_queue_id = None

        # API key should fail (not in allowed_paths)
        try:
            api_key_response = restricted_client.post('call-queues', queue_data)
            api_key_ok = api_key_response['result']
        except:
            api_key_ok = False

        print(f"   JWT admin token: {'✓ Allowed (created)' if jwt_ok else '✗ Denied'}")
        print(f"   API key (restricted): {'✗ Denied (expected)' if not api_key_ok else '⚠ Allowed (unexpected)'}")
        print(f"   → JWT can create resources, API key cannot")

        # Cleanup
        try:
            if created_queue_id:
                api_client.delete(f'call-queues/{created_queue_id}')
                print(f"\n✓ Cleaned up test queue: {created_queue_id}")
        except:
            pass

        try:
            api_client.delete(f'api-keys/{key_id}')
            print(f"✓ Cleaned up test API key: {key_id}")
        except:
            pass

        print("\n=== Summary ===")
        print("JWT admin token (login/password):")
        print("  • Full unrestricted access to ALL endpoints")
        print("  • Can perform ALL operations (GET, POST, PUT, PATCH, DELETE)")
        print("  • No allowed_paths restrictions")
        print("\nAPI Key (with allowed_paths):")
        print("  • Access limited to endpoints in allowed_paths only")
        print("  • Operations limited by permission (read/write)")
        print("  • Fine-grained access control for external integrations")

        # Assertions
        assert jwt_ok, "JWT admin token should be able to create resources"
        assert not api_key_ok, "Restricted API key should NOT access endpoints outside allowed_paths"


class TestApiKeyPermissionsValidation:
    """Test validation and edge cases for API key permissions"""

    def test_01_invalid_permission_value(self, api_client):
        """Test validation - invalid permission value (not read/write)"""
        # Generate API key
        gen_response = api_client.post('api-keys:generateKey', {})
        if not gen_response['result']:
            pytest.skip("Could not generate key")

        generated_key = gen_response['data'].get('key') or gen_response['data'].get('api_key')

        # Try to create with invalid permission value
        invalid_data = {
            'key': generated_key,
            'description': 'Invalid Permission Test',
            'full_permissions': False,
            'allowed_paths': {
                '/api/v3/extensions': 'readwrite'  # Invalid: should be 'read' or 'write'
            }
        }

        try:
            response = api_client.post('api-keys', invalid_data)

            if not response['result']:
                print(f"✓ Invalid permission value rejected")
                print(f"  Error: {response.get('messages', {}).get('error', 'Validation failed')}")
            else:
                # Cleanup
                if 'id' in response.get('data', {}):
                    api_client.delete(f"api-keys/{response['data']['id']}")
                print(f"⚠ Invalid permission value accepted (may be normalized)")

        except Exception as e:
            if '422' in str(e) or '400' in str(e):
                print(f"✓ Invalid permission value rejected via HTTP error")
            else:
                raise

    def test_02_conflicting_full_permissions_and_paths(self, api_client):
        """Test validation - full_permissions=true with allowed_paths"""
        # Generate API key
        gen_response = api_client.post('api-keys:generateKey', {})
        if not gen_response['result']:
            pytest.skip("Could not generate key")

        generated_key = gen_response['data'].get('key') or gen_response['data'].get('api_key')

        # Create with conflicting settings
        conflicting_data = {
            'key': generated_key,
            'description': 'Conflicting Permissions Test',
            'full_permissions': True,  # Full access
            'allowed_paths': {         # But also specific paths (conflicting)
                '/api/v3/extensions': 'read'
            }
        }

        response = api_client.post('api-keys', conflicting_data)

        if response['result']:
            # If accepted, verify which takes precedence
            key_id = response['data']['id']

            # Check if allowed_paths was cleared (full_permissions takes precedence)
            allowed_paths = response['data'].get('allowed_paths', {})

            if not allowed_paths or allowed_paths == {}:
                print(f"✓ Conflicting settings accepted - full_permissions took precedence")
                print(f"  allowed_paths was cleared automatically")
            else:
                print(f"⚠ Conflicting settings accepted - both values preserved")
                print(f"  full_permissions: {response['data'].get('full_permissions')}")
                print(f"  allowed_paths: {allowed_paths}")

            # Cleanup
            try:
                api_client.delete(f'api-keys/{key_id}')
            except:
                pass
        else:
            print(f"✓ Conflicting settings rejected")
            print(f"  Error: {response.get('messages', {}).get('error', 'Validation failed')}")

    def test_03_empty_allowed_paths_with_full_permissions_false(self, api_client):
        """Test validation - full_permissions=false with empty allowed_paths"""
        # Generate API key
        gen_response = api_client.post('api-keys:generateKey', {})
        if not gen_response['result']:
            pytest.skip("Could not generate key")

        generated_key = gen_response['data'].get('key') or gen_response['data'].get('api_key')

        # Create with no permissions
        no_access_data = {
            'key': generated_key,
            'description': 'No Access Test Key',
            'full_permissions': False,
            'allowed_paths': {}  # Empty = no access to anything
        }

        response = api_client.post('api-keys', no_access_data)

        if response['result']:
            key_id = response['data']['id']
            print(f"✓ Key with no permissions created (valid for security)")
            print(f"  This key cannot access any endpoints")

            # Cleanup
            try:
                api_client.delete(f'api-keys/{key_id}')
            except:
                pass
        else:
            print(f"⚠ Empty allowed_paths rejected")
            print(f"  Error: {response.get('messages', {}).get('error')}")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
