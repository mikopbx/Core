# Middleware Testing

## Current State

Unit testing of `AuthenticationMiddleware` is **NOT FEASIBLE** with standard PHPUnit mocks due to:

1. **Phalcon Dependencies**: Request/Response classes extend Phalcon\Http\Request/Response with final methods
2. **DI Container**: Middleware requires full Phalcon DI container setup
3. **halt() Method**: Stops application execution, hard to test in isolation

## Testing Strategy

### Integration Tests (Recommended)

Use **pytest API tests** instead:

```bash
# Test public endpoints (no auth required)
pytest tests/api/test_01_auth.py::TestAuthFlow::test_01_login_success
pytest tests/api/test_01_auth.py::TestAuthFlow::test_02_ping_no_auth

# Test protected endpoints (auth required)
pytest tests/api/test_02_extensions.py::TestExtensionsAPI::test_01_get_list_with_auth
pytest tests/api/test_02_extensions.py::TestExtensionsAPI::test_02_get_list_no_auth_fails

# Test localhost access
pytest tests/api/test_01_auth.py::TestAuthFlow::test_03_localhost_access
```

### Coverage

**Covered by API tests:**
- ✅ Public endpoints authentication bypass
- ✅ Bearer token (JWT) validation
- ✅ Bearer token (API Key) validation
- ✅ Localhost access
- ✅ 401 Unauthorized responses
- ✅ Module no-auth requests

**Test Files:**
- `tests/api/test_01_auth.py` - Authentication flow tests
- `tests/api/test_02_*.py` - Endpoint tests with auth headers
- `tests/api/test_52_*.py` - Permission tests

## Manual Testing

### Test Public Endpoints

```bash
# Should work without authentication
curl https://mikopbx_php83.localhost:8445/pbxcore/api/v3/system:ping

curl -X POST https://mikopbx_php83.localhost:8445/pbxcore/api/v3/auth:login \
  -d "username=admin&password=123456789MikoPBX#1"
```

### Test Protected Endpoints

```bash
# Should return 401 without token
curl https://mikopbx_php83.localhost:8445/pbxcore/api/v3/extensions

# Should work with token
TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
curl https://mikopbx_php83.localhost:8445/pbxcore/api/v3/extensions \
  -H "Authorization: Bearer $TOKEN"
```

### Test Localhost Access

```bash
# From within Docker container (localhost)
docker exec mikopbx_php83 curl http://127.0.0.1/pbxcore/api/v3/extensions
```

## Code Coverage

Use **pytest with coverage**:

```bash
pytest tests/api/ --cov=src/PBXCoreREST/Middleware --cov-report=html
```

This generates:
- Line coverage for middleware classes
- Branch coverage for authentication logic
- HTML report in `htmlcov/`

## Future Improvements

To enable unit testing:

1. **Extract interfaces**: Create `AuthenticationInterface` for dependency injection
2. **Use test doubles**: Replace Phalcon Request/Response with testable wrappers
3. **Separate concerns**: Extract authentication logic from middleware class

Example:

```php
class AuthenticationService {
    public function isPublicEndpoint(string $uri, string $method): bool { }
    public function validateBearerToken(string $token): ?array { }
    public function isLocalhost(string $ip): bool { }
}

class AuthenticationMiddleware {
    private AuthenticationService $authService;

    public function call(Micro $app): bool {
        return $this->authService->authenticate($app);
    }
}
```

## See Also

- `tests/api/README.md` - API testing documentation
- `tests/api/pytest.ini` - Pytest configuration
- `.claude/skills/api-client/` - API testing skill
