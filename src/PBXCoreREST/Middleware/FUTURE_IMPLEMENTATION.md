# UnifiedSecurityMiddleware - Future Implementation Plan

## Current State (2025)

### Active Implementation
- **AuthenticationMiddleware** - handles authentication (JWT/API Key/Localhost)
- **PUBLIC_ENDPOINTS** - hardcoded in AuthenticationMiddleware::PUBLIC_ENDPOINTS constant
- **ApiKeyPermissionChecker** - validates scopes for API keys

### Prepared but NOT Active
- **UnifiedSecurityMiddleware** (241 lines) - fully implemented but not registered
- **SecurityType attributes** - defined but not used
- **Scope-based permissions** - implemented but bypassed

## Why UnifiedSecurityMiddleware Exists

This class was created to prepare for **attribute-based security** when the codebase needed it.

**Problem with current approach:**
```php
// ❌ Current: Hardcoded list in AuthenticationMiddleware
private const PUBLIC_ENDPOINTS = [
    '/pbxcore/api/v3/auth:login' => ['POST'],
    '/pbxcore/api/v3/system:ping' => ['GET'],
    // ... 11 endpoints
];
```

**Intended approach:**
```php
// ✅ Future: Attribute-based configuration
#[ResourceSecurity('auth', requirements: [SecurityType::PUBLIC])]
class AuthController {
    #[ApiOperation(security: [SecurityType::PUBLIC])]
    public function login(): void {}
}
```

## Migration Path (When Needed)

### Phase 1: Activate UnifiedSecurityMiddleware
```php
// src/PBXCoreREST/Providers/RouterProvider.php
class UnifiedSecurityMiddleware implements MiddlewareInterface {
    public function call(Micro $application): bool {
        // Already implemented!
    }
}

$middleware = [
    AuthenticationMiddleware::class => 'before',
    UnifiedSecurityMiddleware::class => 'before',  // ADD THIS
    ResponseMiddleware::class => 'after',
];
```

### Phase 2: Migrate PUBLIC_ENDPOINTS to Attributes

**Before:**
```php
private const PUBLIC_ENDPOINTS = [
    '/pbxcore/api/v3/auth:login' => ['POST'],
];
```

**After:**
```php
#[ResourceSecurity('auth', requirements: [SecurityType::PUBLIC])]
#[HttpMapping(mapping: ['POST' => ['login']])]
class AuthController {
    public function login(): void {}
}
```

### Phase 3: Enable Scope-Based Permissions

```php
// API Key with scopes
$apiKey = [
    'scopes' => ['extensions:read', 'providers:*'],
];

// UnifiedSecurityMiddleware automatically checks:
// - extensions:read  ✅ Allows GET /extensions
// - extensions:write ❌ Denies POST /extensions
// - providers:*      ✅ Allows all /providers endpoints
```

## Benefits of Migration

### 1. Centralized Security Configuration
- All security in attributes, not spread across code
- Easy to find which endpoints are public
- OpenAPI spec auto-generates security requirements

### 2. Fine-Grained Permissions
- Scope-based access control
- Per-endpoint permission checking
- Wildcard patterns (*:*, resource:*, *:action)

### 3. Audit Trail
- SecurityCheckResult with access logs
- Detailed security decisions for each request
- Easy debugging of permission issues

### 4. Maintainability
- Add/remove public endpoints by changing attributes
- No code changes in middleware
- Type-safe with PHP 8 attributes

## Why Not Migrate Now?

**Decision: KEEP AS FUTURE IMPLEMENTATION**

Reasons:
1. **Works perfectly** - current hardcoded approach is simple and reliable
2. **No business need** - fine-grained permissions not required yet
3. **Testing overhead** - would need extensive integration tests
4. **API stability** - public endpoints list is stable, changes rarely

**When to migrate:**
- Need per-API-key endpoint restrictions
- Need attribute-based security for OpenAPI generation
- PUBLIC_ENDPOINTS list becomes hard to maintain (>50 endpoints)
- Compliance requires detailed access logging

## Code Organization

### Keep These Files:
- ✅ `UnifiedSecurityMiddleware.php` - future implementation
- ✅ `SecurityType.php` - enum for security types
- ✅ `ResourceSecurity.php` - attribute class

### Why Keep Them:
- **Design investment** - well-designed, tested approach
- **Migration ready** - can activate when needed
- **Documentation** - shows intended architecture
- **No cost** - inactive code doesn't hurt performance

## Testing Strategy

### Current (Hardcoded)
```bash
# API tests verify public endpoints work
pytest tests/api/test_01_auth.py::test_02_ping_no_auth
```

### Future (Attribute-Based)
```bash
# Generate public endpoints list from attributes
# Compare with actual middleware behavior
# Ensure OpenAPI spec matches
```

## Decision Log

**2025-10-24: KEEP UnifiedSecurityMiddleware as Future Implementation**

Rationale:
- Current approach works well
- Migration not needed now
- Code is well-documented for future use
- No maintenance burden

**Review triggers:**
- PUBLIC_ENDPOINTS list grows significantly
- Need fine-grained API key permissions
- OpenAPI security requirements become complex
- Compliance audit requires detailed access logs

## Related Documentation

- `src/PBXCoreREST/Middleware/UnifiedSecurityMiddleware.php` - Implementation
- `src/PBXCoreREST/Attributes/SecurityType.php` - Security types enum
- `src/PBXCoreREST/Attributes/ResourceSecurity.php` - Security attribute
- `src/PBXCoreREST/Services/ApiKeyPermissionChecker.php` - Current permission logic
