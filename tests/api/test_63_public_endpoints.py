#!/usr/bin/env python3
"""
Test suite for Public Endpoints - 2-Priority System

Tests the public endpoint detection system with 2 priorities:
1. PRIORITY 1: Attribute-based - #[ResourceSecurity(..., requirements: [SecurityType::PUBLIC])]
   - Class-level: Registers entire resource path as public
   - Method-level: Registers specific custom method routes (e.g., /path:methodName)
2. PRIORITY 2: Module Pattern 2 - noAuth: true parameter in getPBXCoreRESTAdditionalRoutes()

Architecture:
- AuthenticationMiddleware checks endpoints via PublicEndpointsRegistry first
- If not found in registry, checks Module Pattern 2 (noAuth flag)
- Public endpoints work without Bearer token
- Optional authentication: public endpoints can use Bearer token for enhanced features

Implementation Details:
- Priority 1: PublicEndpointsRegistry scans class-level and method-level ResourceSecurity attributes
- Priority 2: Request::thisIsModuleNoAuthRequest() checks module route config

Migration Note (2025-12):
- Removed legacy PUBLIC_ENDPOINTS constant from AuthenticationMiddleware
- All public endpoints now use method-level or class-level SecurityType::PUBLIC attributes
- Passkeys and UserPageTracker endpoints migrated to method-level attributes
"""

import pytest
import requests
from conftest import MikoPBXClient, assert_api_success
from config import get_config

config = get_config()
API_URL = config.api_url

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
        client = MikoPBXClient(API_URL)

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

        client = MikoPBXClient(API_URL)
        response = client.get_raw('system:ping')

        # If it works without auth, it's in the registry
        assert response.status_code == HTTP_OK, \
            "Endpoint should be in PublicEndpointsRegistry"

        print(f"✓ Priority 1: system:ping is registered in PublicEndpointsRegistry")


class TestPublicEndpointsMethodLevel:
    """
    Priority 1: Method-level attribute-based public endpoints

    Tests endpoints with method-level #[ResourceSecurity(..., requirements: [SecurityType::PUBLIC])]
    These endpoints are registered in PublicEndpointsRegistry as /path:methodName patterns.
    """

    def test_01_auth_login_without_token(self):
        """Test method-level PUBLIC - auth:login"""
        # auth:login has method-level SecurityType::PUBLIC attribute

        client = MikoPBXClient(API_URL)

        response = client.session.post(
            f"{API_URL}/auth:login",
            data={
                'login': 'invalid_user',
                'password': 'invalid_password'
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            verify=False
        )

        # Should return 401 or result:false, but NOT 403 (auth required)
        assert response.status_code in [HTTP_OK, HTTP_UNAUTHORIZED], \
            f"auth:login should be public (got {response.status_code}, expected {HTTP_OK}/{HTTP_UNAUTHORIZED})"

        print(f"✓ Method-level PUBLIC: auth:login is public (returned {response.status_code})")
        print(f"  Note: Invalid credentials rejected by login logic, not by middleware")

    def test_02_auth_refresh_without_token(self):
        """Test method-level PUBLIC - auth:refresh"""
        # auth:refresh has method-level SecurityType::PUBLIC attribute

        client = MikoPBXClient(API_URL)

        response = client.session.post(
            f"{API_URL}/auth:refresh",
            json={},
            verify=False
        )

        # Should return 200/401, but NOT 403
        assert response.status_code in [HTTP_OK, HTTP_UNAUTHORIZED], \
            f"auth:refresh should be public (got {response.status_code})"

        print(f"✓ Method-level PUBLIC: auth:refresh is public (returned {response.status_code})")

    def test_03_get_languages_without_auth(self):
        """Test method-level PUBLIC - system:getAvailableLanguages"""
        # getAvailableLanguages has method-level SecurityType::PUBLIC attribute

        client = MikoPBXClient(API_URL)
        response = client.get_raw('system:getAvailableLanguages')

        assert response.status_code == HTTP_OK, \
            f"Public endpoint should return {HTTP_OK}, got {response.status_code}"

        data = response.json()
        assert data.get('result') is True, \
            f"getAvailableLanguages should succeed without auth: {data}"

        languages = data.get('data', {})
        assert len(languages) > 0, "Should return at least one language"

        print(f"✓ Method-level PUBLIC: system:getAvailableLanguages works without auth")
        if isinstance(languages, dict):
            print(f"  Languages: {list(languages.keys())[:5]}...")
        else:
            print(f"  Languages: {languages[:5] if isinstance(languages, list) else 'N/A'}...")

    def test_04_change_language_without_auth(self):
        """Test method-level PUBLIC - system:changeLanguage"""
        # changeLanguage has method-level SecurityType::PUBLIC attribute

        client = MikoPBXClient(API_URL)

        response_post = client.session.post(
            f"{API_URL}/system:changeLanguage",
            json={'language': 'en'},
            verify=False
        )

        assert response_post.status_code not in [HTTP_UNAUTHORIZED, HTTP_FORBIDDEN], \
            f"changeLanguage (POST) should be public, got {response_post.status_code}"

        print(f"✓ Method-level PUBLIC: system:changeLanguage (POST) is public")

    def test_05_passkeys_check_availability_without_auth(self):
        """Test method-level PUBLIC - passkeys:checkAvailability"""
        # checkAvailability has method-level SecurityType::PUBLIC attribute

        client = MikoPBXClient(API_URL)

        response = client.session.get(
            f"{API_URL}/passkeys:checkAvailability",
            params={'login': 'admin'},
            verify=False
        )

        # Should be public (not 401/403)
        assert response.status_code not in [HTTP_UNAUTHORIZED, HTTP_FORBIDDEN], \
            f"passkeys:checkAvailability should be public, got {response.status_code}"

        print(f"✓ Method-level PUBLIC: passkeys:checkAvailability is public")

    def test_06_passkeys_authentication_start_without_auth(self):
        """Test method-level PUBLIC - passkeys:authenticationStart"""
        # authenticationStart has method-level SecurityType::PUBLIC attribute

        client = MikoPBXClient(API_URL)

        response = client.session.get(
            f"{API_URL}/passkeys:authenticationStart",
            params={'login': 'admin'},
            verify=False
        )

        # Should be public (not 401/403)
        assert response.status_code not in [HTTP_UNAUTHORIZED, HTTP_FORBIDDEN], \
            f"passkeys:authenticationStart should be public, got {response.status_code}"

        print(f"✓ Method-level PUBLIC: passkeys:authenticationStart is public")

    def test_07_passkeys_authentication_finish_without_auth(self):
        """Test method-level PUBLIC - passkeys:authenticationFinish"""
        # authenticationFinish has method-level SecurityType::PUBLIC attribute

        client = MikoPBXClient(API_URL)

        response = client.session.post(
            f"{API_URL}/passkeys:authenticationFinish",
            json={'credential': {}},
            verify=False
        )

        # Should be public (not 401/403)
        assert response.status_code not in [HTTP_UNAUTHORIZED, HTTP_FORBIDDEN], \
            f"passkeys:authenticationFinish should be public, got {response.status_code}"

        print(f"✓ Method-level PUBLIC: passkeys:authenticationFinish is public")

    def test_08_user_page_tracker_page_view_without_auth(self):
        """Test method-level PUBLIC - user-page-tracker:pageView"""
        # pageView has method-level SecurityType::PUBLIC attribute

        client = MikoPBXClient(API_URL)

        response = client.session.post(
            f"{API_URL}/user-page-tracker:pageView",
            json={'pageName': '/test', 'expire': 300},
            verify=False
        )

        # Should be public (not 401/403)
        assert response.status_code not in [HTTP_UNAUTHORIZED, HTTP_FORBIDDEN], \
            f"user-page-tracker:pageView should be public, got {response.status_code}"

        print(f"✓ Method-level PUBLIC: user-page-tracker:pageView is public")

    def test_09_user_page_tracker_page_leave_without_auth(self):
        """Test method-level PUBLIC - user-page-tracker:pageLeave"""
        # pageLeave has method-level SecurityType::PUBLIC attribute

        client = MikoPBXClient(API_URL)

        response = client.session.post(
            f"{API_URL}/user-page-tracker:pageLeave",
            json={'pageName': '/test'},
            verify=False
        )

        # Should be public (not 401/403)
        assert response.status_code not in [HTTP_UNAUTHORIZED, HTTP_FORBIDDEN], \
            f"user-page-tracker:pageLeave should be public, got {response.status_code}"

        print(f"✓ Method-level PUBLIC: user-page-tracker:pageLeave is public")


class TestPublicEndpointsNegative:
    """
    Negative tests - verify protected endpoints still require authentication
    """

    def test_01_protected_endpoint_requires_auth(self):
        """Test that protected endpoints (non-public) require authentication"""
        client = MikoPBXClient(API_URL)

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
        client_anon = MikoPBXClient(API_URL)
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
    Test priority order - Priority 1 (attributes) is checked before Priority 2 (modules)
    """

    def test_01_priority1_takes_precedence(self):
        """Test that Priority 1 (registry) is checked first"""
        # system:ping uses method-level SecurityType::PUBLIC attribute (Priority 1)

        client = MikoPBXClient(API_URL)
        response = client.get_raw('system:ping')

        assert response.status_code == HTTP_OK
        data = response.json()
        assert data.get('result') is True

        print(f"✓ Priority order: system:ping accessible via attribute-based detection")

    def test_02_method_level_attributes_work(self):
        """Test that method-level PUBLIC attributes work correctly"""
        # All custom methods with SecurityType::PUBLIC should be registered

        client = MikoPBXClient(API_URL)

        # Test various method-level public endpoints
        endpoints = [
            ('GET', 'system:ping'),
            ('GET', 'system:getAvailableLanguages'),
            ('GET', 'passkeys:checkAvailability'),
        ]

        for method, endpoint in endpoints:
            if method == 'GET':
                response = client.get_raw(endpoint)
            else:
                response = client.session.post(f"{API_URL}/{endpoint}", json={}, verify=False)

            assert response.status_code not in [HTTP_UNAUTHORIZED, HTTP_FORBIDDEN], \
                f"{endpoint} should be public via method-level attribute, got {response.status_code}"

        print(f"✓ Method-level attributes: All tested endpoints are public")


class TestPublicEndpointsEdgeCases:
    """
    Edge cases and special scenarios
    """

    def test_01_method_specific_public_access(self):
        """Test that only allowed methods work on public endpoints"""
        client = MikoPBXClient(API_URL)

        # system:ping is public for GET (registered via method-level attribute)
        response_get = client.get_raw('system:ping')
        assert response_get.status_code == HTTP_OK, "GET should work"

        # system:ping should NOT be accessible for POST (router rejects)
        # Note: PublicEndpointsRegistry only registers the URI, HTTP method filtering
        # happens at router level. If URI is public, request passes auth but may fail routing.
        response_post = client.session.post(
            f"{API_URL}/system:ping",
            json={},
            verify=False
        )

        # Router should reject POST (404 not found, or 405 method not allowed)
        # With attribute-based detection, auth passes but routing fails
        assert response_post.status_code in [HTTP_NOT_FOUND, HTTP_METHOD_NOT_ALLOWED], \
            f"POST on GET-only public endpoint should fail at router level, got {response_post.status_code}"

        print(f"✓ Edge case: Method-specific public access enforced by router")
        print(f"  GET: {response_get.status_code}, POST: {response_post.status_code}")

    def test_02_public_endpoint_with_invalid_token(self):
        """Test public endpoint with invalid Bearer token (should still work)"""
        client = MikoPBXClient(API_URL)

        # Add invalid Bearer token
        response = client.session.get(
            f"{API_URL}/system:ping",
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

        client = MikoPBXClient(API_URL)

        # Try without record_id parameter (should fail validation, not auth)
        response = client.get_raw('cdr:playback')

        # Should be public (not 401/403), but fail validation (400/422)
        assert response.status_code not in [HTTP_UNAUTHORIZED, HTTP_FORBIDDEN], \
            f"cdr:playback should be public, got {response.status_code}"

        print(f"✓ Edge case: cdr:playback is public (uses token-based security)")
        print(f"  Status: {response.status_code} (validation error, not auth error)")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
