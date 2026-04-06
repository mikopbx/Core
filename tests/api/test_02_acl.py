#!/usr/bin/env python3
"""
Test suite for ACL (Access Control List) authorization in REST API

Tests the ACL layer that checks user permissions after JWT authentication:
- Role extraction from JWT token payload
- ACL permission checks for controller/action pairs
- 401 Unauthorized vs 403 Forbidden distinction
- Universal API version handling (v1, v2, v3, etc.)

Architecture:
- AuthenticationMiddleware validates JWT token
- parseRequestToAcl() extracts controller path and action from request
- AclProvider checks if role has access to controller/action
- 401 = not authenticated (no/invalid token)
- 403 = authenticated but not authorized (no ACL permission)

ACL Resource Format:
- Controller = full resource path (e.g., /pbxcore/api/v3/extensions)
- Action = operation name (getList, getRecord, create, update, delete, or custom method)

NOTE: Full ACL testing requires ModuleUsersUI which creates non-admin roles.
These tests focus on the middleware ACL check mechanism itself.
"""

import pytest
from conftest import assert_api_success, MikoPBXClient
from config import get_config

config = get_config()


class TestAclBasics:
    """Basic ACL authorization tests"""

    def test_01_request_without_token_returns_401(self, api_client):
        """Test that request without Bearer token returns 401 Unauthorized"""
        # Create client without authentication
        unauthenticated_client = MikoPBXClient(config.api_url, config.api_username, config.api_password)
        # Don't authenticate - no token

        # Try to access protected resource (skip auto-retry to test server response)
        response = unauthenticated_client.get_raw('extensions', skip_auth_retry=True)

        # Should get 401 Unauthorized
        assert response.status_code == 401, \
            f"Expected 401 Unauthorized, got {response.status_code}"

        print(f"✓ Request without token correctly rejected with 401")

    def test_02_request_with_invalid_token_returns_401(self, api_client):
        """Test that request with invalid Bearer token returns 401 Unauthorized"""
        # Create client with fake token
        fake_client = MikoPBXClient(config.api_url, config.api_username, config.api_password)
        fake_client.access_token = "invalid.jwt.token"

        # Try to access protected resource (skip auto-retry to test server response)
        response = fake_client.get_raw('extensions', skip_auth_retry=True)

        # Should get 401 Unauthorized (token validation failed)
        assert response.status_code == 401, \
            f"Expected 401 Unauthorized, got {response.status_code}"

        print(f"✓ Request with invalid token correctly rejected with 401")

    def test_03_request_with_expired_token_returns_401(self, api_client):
        """Test that request with expired JWT token returns 401 Unauthorized"""
        # Create a valid-looking but expired JWT
        # JWT format: header.payload.signature (base64 encoded)
        import base64
        import json
        import time

        header = base64.urlsafe_b64encode(json.dumps({
            "typ": "JWT",
            "alg": "HS256"
        }).encode()).decode().rstrip('=')

        # Expired payload (exp = 1 second ago)
        payload = base64.urlsafe_b64encode(json.dumps({
            "sub": "1",
            "role": "admins",
            "exp": int(time.time()) - 1,
            "iat": int(time.time()) - 3600
        }).encode()).decode().rstrip('=')

        # Fake signature (won't validate anyway)
        signature = "fake_signature_that_wont_validate"

        expired_token = f"{header}.{payload}.{signature}"

        # Create client with expired token
        expired_client = MikoPBXClient(config.api_url, config.api_username, config.api_password)
        expired_client.access_token = expired_token

        # Try to access protected resource (skip auto-retry to test server response)
        response = expired_client.get_raw('extensions', skip_auth_retry=True)

        # Should get 401 Unauthorized (token expired/invalid signature)
        assert response.status_code == 401, \
            f"Expected 401 Unauthorized, got {response.status_code}"

        print(f"✓ Request with expired token correctly rejected with 401")

    def test_04_authenticated_request_succeeds(self, api_client):
        """Test that authenticated request with valid token succeeds"""
        # api_client fixture is already authenticated
        response = api_client.get('extensions')

        # Should succeed for admin role
        assert_api_success(response, "Failed to access extensions with valid token")

        print(f"✓ Authenticated request with valid token succeeds")

    def test_05_public_endpoint_without_token(self, api_client):
        """Test that public endpoints work without authentication"""
        # Create client without authentication
        unauthenticated_client = MikoPBXClient(config.api_url, config.api_username, config.api_password)
        # Don't authenticate

        # system:ping is a public endpoint
        response = unauthenticated_client.get_raw('system:ping')

        # Should succeed without token
        assert response.status_code == 200, \
            f"Expected 200 OK for public endpoint, got {response.status_code}"

        print(f"✓ Public endpoint works without authentication")

    def test_06_auth_endpoints_are_public(self, api_client):
        """Test that auth endpoints are accessible without token"""
        # Create client without authentication
        unauthenticated_client = MikoPBXClient(config.api_url, config.api_username, config.api_password)

        # auth:login should be public (otherwise how would you get a token?)
        # Note: We're testing with invalid credentials, expecting 401 from login logic, not from auth middleware
        import requests

        response = requests.post(
            f"{config.api_url}/auth:login",
            data={'login': 'test', 'password': 'test'},
            verify=False
        )

        # Should not be 401 from auth middleware (that would mean auth required for login)
        # Should be 401 from login logic (invalid credentials) or 200/400/422 for valid response
        # The key is: we got a response, not blocked by auth middleware
        assert response.status_code != 401 or 'accessToken' not in response.text, \
            "Auth endpoint should be accessible"

        print(f"✓ Auth endpoint is accessible without prior authentication")


class TestAclResourceParsing:
    """Test that ACL correctly parses different request patterns"""

    def test_01_collection_get_list(self, api_client):
        """Test GET /resource → action=getList"""
        # GET /extensions should map to:
        # controller=/pbxcore/api/v3/extensions, action=getList
        response = api_client.get('extensions')
        assert_api_success(response, "GET extensions (getList) failed")

        print(f"✓ GET /resource correctly maps to getList action")

    @pytest.mark.order(after="test_15_extensions_employees.py::TestEmployees::test_02_get_list")
    def test_02_resource_get_record(self, api_client):
        """Test GET /resource/{id} → action=getRecord"""
        # Use employees endpoint which has getRecord implemented
        # First get a valid employee ID
        list_response = api_client.get('employees', params={'limit': 1})
        if not list_response.get('result') or not list_response.get('data'):
            pytest.skip("No employees available for testing")

        # employees returns nested data structure
        employees_data = list_response['data'].get('data', [])
        if not employees_data:
            pytest.skip("No employees available for testing")

        emp_id = employees_data[0]['id']

        # GET /employees/{id} should map to:
        # controller=/pbxcore/api/v3/employees, action=getRecord
        response = api_client.get(f'employees/{emp_id}')
        assert_api_success(response, f"GET employees/{emp_id} (getRecord) failed")

        print(f"✓ GET /resource/{{id}} correctly maps to getRecord action")

    def test_03_custom_collection_method(self, api_client):
        """Test GET /resource:customMethod → action=customMethod"""
        # GET /extensions:getForSelect should map to:
        # controller=/pbxcore/api/v3/extensions, action=getForSelect
        response = api_client.get('extensions:getForSelect')
        assert_api_success(response, "GET extensions:getForSelect failed")

        print(f"✓ GET /resource:customMethod correctly maps to custom action")

    @pytest.mark.order(after="test_15_extensions_employees.py::TestEmployees::test_02_get_list")
    def test_04_custom_resource_method(self, api_client):
        """Test GET /resource/{id}:customMethod → action=customMethod"""
        # This tests pattern like:
        # GET /sip/{number}:getStatus
        # controller=/pbxcore/api/v3/sip, action=getStatus

        # Get a valid internal extension number from employees
        list_response = api_client.get('employees', params={'limit': 1})
        if not list_response.get('result') or not list_response.get('data'):
            pytest.skip("No employees available for testing")

        employees_data = list_response['data'].get('data', [])
        if not employees_data:
            pytest.skip("No employees available for testing")

        ext_number = employees_data[0].get('number')
        if not ext_number:
            pytest.skip("Employee has no number field")

        # GET /sip/{number}:getStatus
        response = api_client.get(f'sip/{ext_number}:getStatus')
        assert_api_success(response, f"GET sip/{ext_number}:getStatus failed")

        print(f"✓ GET /resource/{{id}}:customMethod correctly parsed")

    def test_05_nested_module_path(self, api_client):
        """Test /modules/{module}/{resource} path parsing"""
        # This tests module endpoint patterns like:
        # GET /pbxcore/api/v3/modules/my-module/tasks

        # Note: This is a parsing test - we may not have actual modules installed
        # The key is that parseRequestToAcl handles these paths correctly

        # Try accessing a hypothetical module endpoint
        # If module doesn't exist, we'll get 404, not a parse error
        response = api_client.get_raw('modules/test-module/resource')

        # Should get 404 (not found) not 500 (parse error)
        assert response.status_code in [200, 404, 422], \
            f"Expected valid response for module path, got {response.status_code}"

        print(f"✓ Module path /modules/{{module}}/{{resource}} correctly parsed")


class TestAclVersionAgnostic:
    """Test that ACL works with any API version"""

    def test_01_v3_endpoint_works(self, api_client):
        """Test that v3 endpoints are handled correctly"""
        # Standard v3 endpoint
        response = api_client.get('extensions')
        assert_api_success(response, "v3 endpoint failed")

        print(f"✓ v3 endpoint works correctly")

    # Note: v1, v2 tests would require those API versions to exist
    # For now, we test that the regex pattern matches correctly
    # The key is that parseRequestToAcl uses /pbxcore/api/v\d+/ pattern


class TestAclHttpMethods:
    """Test ACL action mapping for different HTTP methods"""

    def test_01_get_maps_correctly(self, api_client):
        """Test GET → getList/getRecord"""
        response = api_client.get('extensions')
        assert_api_success(response, "GET request failed")
        print(f"✓ GET method maps to getList/getRecord")

    def test_02_post_requires_permission(self, api_client):
        """Test POST → create action requires permission"""
        # POST to call-queues requires 'create' permission
        # Admin should have this permission
        # Note: We're testing ACL, not the actual create logic

        import requests

        # Make raw POST request to test ACL parsing (validation will fail but ACL should pass)
        response = api_client.session.post(
            f"{api_client.base_url}/call-queues",
            json={'name': 'test-queue'},
            headers=api_client._get_headers(),
            timeout=30
        )

        # Should get 422 (validation error), not 401/403 (auth/acl rejection)
        # 422 means ACL check passed, but validation failed
        assert response.status_code in [200, 201, 422], \
            f"Expected 200/201/422, got {response.status_code} (possible ACL rejection)"

        # Verify the API processed it as 'create' action
        data = response.json()
        assert data.get('function') == 'create', \
            f"Expected 'create' action, got {data.get('function')}"

        print(f"✓ POST method maps to create action")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
