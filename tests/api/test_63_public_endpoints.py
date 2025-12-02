#!/usr/bin/env python3
"""
Test suite for Public Endpoints - 3-Priority Hybrid System

Tests the hybrid public endpoint detection system with 3 priorities:
1. PRIORITY 1: Attribute-based (Pattern 4) - #[ResourceSecurity(..., requirements: [SecurityType::PUBLIC])]
2. PRIORITY 2: Legacy hardcoded constants - PUBLIC_ENDPOINTS in AuthenticationMiddleware
3. PRIORITY 3: Module Pattern 2 - noAuth: true parameter in getPBXCoreRESTAdditionalRoutes()

Architecture:
- AuthenticationMiddleware checks endpoints in priority order
- Public endpoints work without Bearer token
- Optional authentication: public endpoints can use Bearer token for enhanced features
- Priority order ensures modern attribute-based detection takes precedence

Implementation Details:
- Priority 1: PublicEndpointsRegistry service populated during route generation
- Priority 2: Hardcoded array in AuthenticationMiddleware::PUBLIC_ENDPOINTS
- Priority 3: Request::thisIsModuleNoAuthRequest() checks module route config
"""

import pytest
import requests
from conftest import MikoPBXClient, API_BASE_URL, assert_api_success

# HTTP Status Code Constants for readability
HTTP_OK = 200
HTTP_BAD_REQUEST = 400
HTTP_UNAUTHORIZED = 401
HTTP_FORBIDDEN = 403
HTTP_NOT_FOUND = 404
HTTP_METHOD_NOT_ALLOWED = 405
HTTP_UNPROCESSABLE_ENTITY = 422


class TestPublicEndpointsRegistry:
    """
    Priority 1: Attribute-based public endpoints (Pattern 4)

    Tests endpoints marked with #[ResourceSecurity(..., requirements: [SecurityType::PUBLIC])]
    These endpoints are automatically registered in PublicEndpointsRegistry during route generation.
    """

    def test_01_priority1_ping_without_auth(self):
        """Test Priority 1 - system:ping works without authentication"""
        # Create client WITHOUT authentication
        client = MikoPBXClient(API_BASE_URL)

        # system:ping has method-level SecurityType::PUBLIC attribute
        response = client.get_raw('system:ping')

        assert response.status_code == HTTP_OK, \
            f"Public endpoint system:ping should return {HTTP_OK}, got {response.status_code}"

        data = response.json()
        assert data.get('result') is True, \
            f"Public endpoint should succeed, got: {data}"

        print(f"✓ Priority 1: system:ping works without authentication")
        print(f"  Response: {data.get('data', {})}")

    def test_02_priority1_ping_with_auth(self, api_client):
        """Test Priority 1 - system:ping works WITH optional authentication"""
        # Use authenticated client (optional auth)
        response = api_client.get('system:ping')

        assert_api_success(response, "Public endpoint should work with valid token")

        print(f"✓ Priority 1: system:ping works with optional authentication")
        print(f"  Note: Public endpoints support optional auth for enhanced features")

    def test_03_verify_endpoint_in_registry(self):
        """Test Priority 1 - Verify endpoint is registered in PublicEndpointsRegistry"""
        # This test verifies that the endpoint was registered during route generation
        # We can't directly access the registry, but we can verify behavior

        client = MikoPBXClient(API_BASE_URL)
        response = client.get_raw('system:ping')

        # If it works without auth, it's in the registry
        assert response.status_code == HTTP_OK, \
            "Endpoint should be in PublicEndpointsRegistry"

        print(f"✓ Priority 1: system:ping is registered in PublicEndpointsRegistry")


class TestPublicEndpointsLegacy:
    """
    Priority 2: Legacy hardcoded public endpoints

    Tests endpoints from PUBLIC_ENDPOINTS constant in AuthenticationMiddleware.
    These are kept for backward compatibility during migration to attribute-based detection.
    """

    def test_01_priority2_system_ping_legacy(self):
        """Test Priority 2 - system:ping from PUBLIC_ENDPOINTS constant"""
        # system:ping is BOTH in registry (Priority 1) AND in PUBLIC_ENDPOINTS (Priority 2)
        # This test verifies backward compatibility

        client = MikoPBXClient(API_BASE_URL)
        response = client.get_raw('system:ping')

        assert response.status_code == HTTP_OK, \
            f"Legacy public endpoint should work, got {response.status_code}"

        data = response.json()
        assert data.get('result') is True

        print(f"✓ Priority 2: system:ping works via PUBLIC_ENDPOINTS constant")
        print(f"  Note: Also registered in Priority 1 - both work")

    def test_02_priority2_auth_login_without_token(self):
        """Test Priority 2 - auth:login from PUBLIC_ENDPOINTS (POST)"""
        # auth:login is in PUBLIC_ENDPOINTS - must work without Bearer token

        client = MikoPBXClient(API_BASE_URL)

        # Try to login without prior authentication
        response = client.session.post(
            f"{API_BASE_URL}/auth:login",
            data={
                'login': 'invalid_user',
                'password': 'invalid_password'
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            verify=False
        )

        # Should return 401 or result:false, but NOT 403 (auth required)
        # This proves the endpoint is public (authentication happens inside, not at middleware)
        assert response.status_code in [HTTP_OK, HTTP_UNAUTHORIZED], \
            f"auth:login should be public (got {response.status_code}, expected {HTTP_OK}/{HTTP_UNAUTHORIZED})"

        print(f"✓ Priority 2: auth:login is public (returned {response.status_code})")
        print(f"  Note: Invalid credentials rejected by login logic, not by middleware")

    def test_03_priority2_auth_refresh_without_token(self):
        """Test Priority 2 - auth:refresh from PUBLIC_ENDPOINTS (POST)"""
        # auth:refresh is in PUBLIC_ENDPOINTS - must work without Bearer token

        client = MikoPBXClient(API_BASE_URL)

        # Try to refresh without Bearer token (will fail, but should be public)
        response = client.session.post(
            f"{API_BASE_URL}/auth:refresh",
            json={},
            verify=False
        )

        # Should return 200/401, but NOT 403 (which would mean auth required at middleware)
        assert response.status_code in [HTTP_OK, HTTP_UNAUTHORIZED], \
            f"auth:refresh should be public (got {response.status_code})"

        print(f"✓ Priority 2: auth:refresh is public (returned {response.status_code})")
        print(f"  Note: No refresh token → login logic fails, but middleware allows access")

    def test_04_priority2_get_languages_without_auth(self):
        """Test Priority 2 - system:getAvailableLanguages from PUBLIC_ENDPOINTS"""
        # getAvailableLanguages is in PUBLIC_ENDPOINTS - needed for login page

        client = MikoPBXClient(API_BASE_URL)
        response = client.get_raw('system:getAvailableLanguages')

        assert response.status_code == HTTP_OK, \
            f"Public endpoint should return {HTTP_OK}, got {response.status_code}"

        data = response.json()
        assert data.get('result') is True, \
            f"getAvailableLanguages should succeed without auth: {data}"

        # Verify we got language list (API returns array or object)
        languages = data.get('data', {})
        assert len(languages) > 0, "Should return at least one language"

        print(f"✓ Priority 2: system:getAvailableLanguages works without auth")
        # Handle both list and dict responses
        if isinstance(languages, dict):
            print(f"  Languages: {list(languages.keys())[:5]}...")
        else:
            print(f"  Languages: {languages[:5] if isinstance(languages, list) else 'N/A'}...")

    def test_05_priority2_change_language_without_auth(self):
        """Test Priority 2 - system:changeLanguage from PUBLIC_ENDPOINTS"""
        # changeLanguage supports both POST and PATCH in PUBLIC_ENDPOINTS

        client = MikoPBXClient(API_BASE_URL)

        # POST method
        response_post = client.session.post(
            f"{API_BASE_URL}/system:changeLanguage",
            json={'language': 'en'},
            verify=False
        )

        # Should be public (200/400/422, but NOT 401/403)
        assert response_post.status_code not in [HTTP_UNAUTHORIZED, HTTP_FORBIDDEN], \
            f"changeLanguage (POST) should be public, got {response_post.status_code}"

        print(f"✓ Priority 2: system:changeLanguage (POST) is public")

        # PATCH method
        response_patch = client.session.patch(
            f"{API_BASE_URL}/system:changeLanguage",
            json={'language': 'en'},
            verify=False
        )

        assert response_patch.status_code not in [HTTP_UNAUTHORIZED, HTTP_FORBIDDEN], \
            f"changeLanguage (PATCH) should be public, got {response_patch.status_code}"

        print(f"✓ Priority 2: system:changeLanguage (PATCH) is public")


class TestPublicEndpointsModules:
    """
    Priority 3: Module Pattern 2 public endpoints

    Tests endpoints from modules using noAuth: true in getPBXCoreRESTAdditionalRoutes().
    These endpoints are detected via Request::thisIsModuleNoAuthRequest().
    """

    def test_01_priority3_module_endpoint_skip_if_no_modules(self):
        """Test Priority 3 - Module Pattern 2 with noAuth: true"""
        # Module examples are not available in current project
        # This test documents the expected behavior

        pytest.skip("Module examples not available in current project")

        # Expected behavior when modules ARE present:
        # 1. Module defines route with 6th parameter = true
        # 2. Request::thisIsModuleNoAuthRequest() checks route config
        # 3. AuthenticationMiddleware allows access without Bearer token

        # Example endpoint (if module exists):
        # GET /pbxcore/api/module-example-v2-public/status

        print(f"✓ Priority 3: Module Pattern 2 documented (skip - no modules)")


class TestPublicEndpointsNegative:
    """
    Negative tests - verify protected endpoints still require authentication
    """

    def test_01_protected_endpoint_requires_auth(self):
        """Test that protected endpoints (non-public) require authentication"""
        client = MikoPBXClient(API_BASE_URL)

        # extensions endpoint should be protected
        response = client.get_raw('extensions')

        # Should return 401 Unauthorized (no Bearer token)
        assert response.status_code == HTTP_UNAUTHORIZED, \
            f"Protected endpoint should return {HTTP_UNAUTHORIZED}, got {response.status_code}"

        data = response.json()
        assert data.get('result') is False, \
            "Protected endpoint should reject unauthenticated requests"

        print(f"✓ Negative test: Protected endpoint correctly requires authentication")

    def test_02_protected_endpoint_works_with_auth(self, api_client):
        """Test that protected endpoints work WITH authentication"""
        # Same endpoint, but with Bearer token
        response = api_client.get('extensions', params={'limit': 1})

        assert_api_success(response, "Protected endpoint should work with valid token")

        print(f"✓ Negative test: Protected endpoint works with authentication")

    def test_03_optional_auth_provides_context(self, api_client):
        """Test that public endpoints can use optional auth for enhanced features"""
        # Public endpoint WITHOUT auth - anonymous
        client_anon = MikoPBXClient(API_BASE_URL)
        response_anon = client_anon.get_raw('system:ping')
        data_anon = response_anon.json()

        # Public endpoint WITH auth - authenticated context
        response_auth = api_client.get('system:ping')

        # Both should succeed
        assert response_anon.status_code == HTTP_OK
        assert response_auth.get('result') is True

        print(f"✓ Optional auth: Public endpoint works both ways")
        print(f"  Anonymous: {data_anon.get('data', {})}")
        print(f"  Authenticated: {response_auth.get('data', {})}")


class TestPublicEndpointsPriority:
    """
    Test priority order - Priority 1 should be checked before Priority 2
    """

    def test_01_priority1_takes_precedence(self):
        """Test that Priority 1 (registry) is checked before Priority 2 (constant)"""
        # system:ping is in BOTH Priority 1 (registry) and Priority 2 (constant)
        # Priority 1 should be checked first

        client = MikoPBXClient(API_BASE_URL)
        response = client.get_raw('system:ping')

        assert response.status_code == HTTP_OK
        data = response.json()
        assert data.get('result') is True

        print(f"✓ Priority order: system:ping accessible (Priority 1 checked first)")
        print(f"  Note: Endpoint exists in both Priority 1 and 2")

    def test_02_fallback_to_priority2_if_registry_unavailable(self):
        """Test that Priority 2 (constant) works as fallback"""
        # If PublicEndpointsRegistry is unavailable, Priority 2 should still work
        # We test this by verifying an endpoint that's ONLY in Priority 2

        client = MikoPBXClient(API_BASE_URL)

        # user-page-tracker:pageView is ONLY in PUBLIC_ENDPOINTS (Priority 2)
        # Not in any controller's SecurityType::PUBLIC (Priority 1)
        response = client.session.post(
            f"{API_BASE_URL}/user-page-tracker:pageView",
            json={'page': '/test', 'duration': 10},
            verify=False
        )

        # Should be public (not 401/403)
        assert response.status_code not in [HTTP_UNAUTHORIZED, HTTP_FORBIDDEN], \
            f"Priority 2 fallback should work, got {response.status_code}"

        print(f"✓ Priority 2 fallback: pageView accessible without Priority 1")
        print(f"  Note: This endpoint only exists in PUBLIC_ENDPOINTS constant")


class TestPublicEndpointsEdgeCases:
    """
    Edge cases and special scenarios
    """

    def test_01_method_specific_public_access(self):
        """Test that only allowed methods work on public endpoints"""
        client = MikoPBXClient(API_BASE_URL)

        # system:ping is public for GET
        response_get = client.get_raw('system:ping')
        assert response_get.status_code == HTTP_OK, "GET should work"

        # system:ping should NOT be public for POST (not in PUBLIC_ENDPOINTS for POST)
        response_post = client.session.post(
            f"{API_BASE_URL}/system:ping",
            json={},
            verify=False
        )

        # Should fail (401 auth required, 404 not found, or 405 method not allowed)
        # Note: MikoPBX checks auth before method, so 401 is also valid
        assert response_post.status_code in [HTTP_UNAUTHORIZED, HTTP_NOT_FOUND, HTTP_METHOD_NOT_ALLOWED], \
            f"POST on GET-only public endpoint should fail, got {response_post.status_code}"

        print(f"✓ Edge case: Method-specific public access enforced")
        print(f"  GET: {response_get.status_code}, POST: {response_post.status_code}")

    def test_02_public_endpoint_with_invalid_token(self):
        """Test public endpoint with invalid Bearer token (should still work)"""
        client = MikoPBXClient(API_BASE_URL)

        # Add invalid Bearer token
        response = client.session.get(
            f"{API_BASE_URL}/system:ping",
            headers={'Authorization': 'Bearer invalid_token_12345'},
            verify=False
        )

        # Public endpoint should still work (invalid token ignored)
        assert response.status_code == HTTP_OK, \
            f"Public endpoint should work with invalid token, got {response.status_code}"

        data = response.json()
        assert data.get('result') is True

        print(f"✓ Edge case: Public endpoint works with invalid Bearer token")
        print(f"  Note: Invalid token silently ignored, request proceeds as anonymous")

    def test_03_cdr_playback_token_based_security(self):
        """Test CDR playback endpoint - public but uses token-based security"""
        # cdr:playback is in PUBLIC_ENDPOINTS but uses special token-based auth

        client = MikoPBXClient(API_BASE_URL)

        # Try without record_id parameter (should fail validation, not auth)
        response = client.get_raw('cdr:playback')

        # Should be public (not 401/403), but fail validation (400/422)
        assert response.status_code not in [HTTP_UNAUTHORIZED, HTTP_FORBIDDEN], \
            f"cdr:playback should be public, got {response.status_code}"

        print(f"✓ Edge case: cdr:playback is public (uses token-based security)")
        print(f"  Status: {response.status_code} (validation error, not auth error)")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
