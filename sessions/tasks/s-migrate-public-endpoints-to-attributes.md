---
id: s-migrate-public-endpoints-to-attributes
title: Migrate PUBLIC_ENDPOINTS to Attributes
status: completed
priority: low
created: 2025-12-05
completed: 2025-12-05
branch: feature/migrate-public-endpoints-attributes
---

# Migrate PUBLIC_ENDPOINTS to Attributes

## Goal

Убрать hardcoded константу `PUBLIC_ENDPOINTS` из `AuthenticationMiddleware` и перенести все публичные эндпоинты в method-level атрибуты `#[ResourceSecurity(..., requirements: [SecurityType::PUBLIC])]`.

## Background

После реализации поддержки method-level PUBLIC атрибутов (wiki-links:getLink), появилась возможность иметь единый источник истины для публичных эндпоинтов — атрибуты контроллеров.

Сейчас существует 3-priority система:
1. **Priority 1:** Attribute-based (через `PublicEndpointsRegistry`)
2. **Priority 2:** Legacy hardcoded `PUBLIC_ENDPOINTS` константа
3. **Priority 3:** Module Pattern 2 с `noAuth: true`

Цель — убрать Priority 2, оставив только атрибуты.

## Current PUBLIC_ENDPOINTS

Из `src/PBXCoreREST/Middleware/AuthenticationMiddleware.php`:

```php
private const PUBLIC_ENDPOINTS = [
    '/pbxcore/api/v3/mail-settings/oauth2-callback' => ['GET'],
    '/pbxcore/api/v3/passkeys:checkAvailability' => ['GET'],
    '/pbxcore/api/v3/passkeys:authenticationStart' => ['GET'],
    '/pbxcore/api/v3/passkeys:authenticationFinish' => ['POST'],
    '/pbxcore/api/v3/auth:login' => ['POST'],
    '/pbxcore/api/v3/auth:refresh' => ['POST'],
    '/pbxcore/api/v3/user-page-tracker:pageView' => ['POST'],
    '/pbxcore/api/v3/user-page-tracker:pageLeave' => ['POST'],
    '/pbxcore/api/v3/system:changeLanguage' => ['POST', 'PATCH'],
    '/pbxcore/api/v3/system:getAvailableLanguages' => ['GET'],
    '/pbxcore/api/v3/system:ping' => ['GET'],
    '/pbxcore/api/v3/cdr:playback' => ['GET', 'HEAD'],
    '/pbxcore/api/v3/cdr:download' => ['GET'],
];
```

## Tasks

1. [ ] Добавить `#[ResourceSecurity(..., requirements: [SecurityType::PUBLIC])]` к методам:
   - [ ] `MailSettings/RestController::oauth2Callback`
   - [ ] `Passkeys/RestController::checkAvailability`
   - [ ] `Passkeys/RestController::authenticationStart`
   - [ ] `Passkeys/RestController::authenticationFinish`
   - [ ] `UserPageTracker/RestController::pageView`
   - [ ] `UserPageTracker/RestController::pageLeave`

2. [ ] Проверить существующие атрибуты (уже есть):
   - [x] `Auth/RestController::login`
   - [x] `Auth/RestController::refresh`
   - [x] `System/RestController::ping`
   - [x] `System/RestController::changeLanguage`
   - [x] `System/RestController::getAvailableLanguages`
   - [x] `Cdr/RestController::playback`
   - [x] `Cdr/RestController::download`

3. [ ] Удалить константу `PUBLIC_ENDPOINTS` из `AuthenticationMiddleware`

4. [ ] Удалить проверку legacy endpoints из `isPublicEndpoint()`

5. [ ] Обновить тесты `test_63_public_endpoints.py`

6. [ ] Обновить документацию в `src/PBXCoreREST/CLAUDE.md`

## Files to Modify

- `src/PBXCoreREST/Middleware/AuthenticationMiddleware.php`
- `src/PBXCoreREST/Controllers/MailSettings/RestController.php`
- `src/PBXCoreREST/Controllers/Passkeys/RestController.php`
- `src/PBXCoreREST/Controllers/UserPageTracker/RestController.php`
- `tests/api/test_63_public_endpoints.py`
- `src/PBXCoreREST/CLAUDE.md`

## Testing

```bash
python3 -m pytest tests/api/test_63_public_endpoints.py -v -s
```

## Notes

- Priority 3 (Module Pattern 2) остаётся для обратной совместимости с legacy модулями
- После миграции останется 2-priority система: Attributes + Module noAuth

---

## Context Manifest

### How the Public Endpoint System Currently Works

When an HTTP request arrives at the MikoPBX REST API, it first passes through the `AuthenticationMiddleware` located at `src/PBXCoreREST/Middleware/AuthenticationMiddleware.php`. This middleware is the gatekeeper that decides whether a request needs authentication or can proceed without credentials.

The middleware implements a **3-priority hybrid system** for detecting public endpoints - endpoints that don't require authentication. This hybrid approach exists because the system is in the middle of a migration from hardcoded constants to attribute-based detection. Here's how it works in detail:

**Request Flow Through Authentication:**

1. **Request arrives** at `AuthenticationMiddleware::call()` (line 83)
2. **First check: Is it a public endpoint?** The middleware calls `isPublicEndpoint()` (line 91)
3. **Priority 1 check (Attribute-based)**: `isPublicEndpointByAttributes()` (line 209) queries the `PublicEndpointsRegistry` service
   - The registry was populated during application bootstrap by `RouterProvider::registerControllerForPublicEndpoints()` (line 741)
   - RouterProvider scanned all controllers with `#[ApiResource]` attributes during route generation
   - For each controller, it called `PublicEndpointsRegistry::registerFromController()` (line 751)
   - The registry method checks if the controller has `#[ResourceSecurity(..., requirements: [SecurityType::PUBLIC])]` attribute
   - If found, it registers the resource path (e.g., `/pbxcore/api/v3/auth`) in its internal `$publicEndpoints` array
   - During authentication, `isPublicEndpoint()` checks if the current URI starts with any registered public resource path
4. **Priority 2 fallback (Legacy hardcoded)**: If not found in registry, check `PUBLIC_ENDPOINTS` constant (line 214)
   - This is a hardcoded array mapping paths to allowed HTTP methods
   - Example: `'/pbxcore/api/v3/auth:login' => ['POST']`
   - Uses `strpos()` to match URI prefix and checks if HTTP method is in the allowed methods array
5. **Priority 3 fallback (Module Pattern 2)**: `Request::thisIsModuleNoAuthRequest()` checks if module route has `noAuth: true`
6. **If public**: Call `tryOptionalAuthentication()` (line 92) which attempts to validate Bearer token if present, but allows request even if token is invalid
7. **If not public**: Require Bearer token or localhost access, otherwise deny with 401 Unauthorized

**Why This 3-Priority System Exists:**

The system is migrating from hardcoded constants (Priority 2) to attribute-based detection (Priority 1), but must maintain backward compatibility. Priority 1 takes precedence, so new endpoints using attributes work immediately. Priority 2 provides fallback for endpoints not yet migrated. Priority 3 supports legacy modules that use the old Pattern 2 route registration.

**Critical Implementation Details:**

- **Registry population timing**: `PublicEndpointsRegistry` is populated during route generation in `RouterProvider::mountRoutes()`, which happens during DI container initialization at application bootstrap. This is a one-time operation that scans all controllers.

- **Class-level vs Method-level attributes**: The `ResourceSecurity` attribute can be placed at either class level (makes entire resource public) or method level (makes specific operations public). The `PublicEndpointsRegistry::registerFromController()` only checks class-level attributes because it operates at the controller level during route generation.

- **Method-level PUBLIC attributes**: Controllers like `Auth/RestController`, `System/RestController`, `Cdr/RestController`, and `WikiLinks/RestController` use method-level `#[ResourceSecurity(..., requirements: [SecurityType::PUBLIC])]` on individual methods like `login()`, `ping()`, `playback()`, etc. However, these don't get registered in `PublicEndpointsRegistry` because the registry only scans class-level attributes.

- **Why method-level attributes still work**: Even though method-level PUBLIC attributes aren't in the registry, they still work because those endpoints are ALSO listed in the `PUBLIC_ENDPOINTS` constant (Priority 2 fallback). This is the temporary dual-registration that exists during migration.

**Current State - What's Already Using Attributes:**

Looking at the controllers, here's what already has PUBLIC attributes:

**Class-level PUBLIC (registered in Priority 1):**
- `OAuth2CallbackController` - entire resource public (`/pbxcore/api/v3/mail-settings/oauth2-callback`)

**Method-level PUBLIC (working via Priority 2 fallback):**
- `Auth/RestController::login()` - has attribute, also in PUBLIC_ENDPOINTS
- `Auth/RestController::refresh()` - has attribute, also in PUBLIC_ENDPOINTS
- `Auth/RestController::validateToken()` - has attribute, internal endpoint for Nginx/Lua
- `System/RestController::ping()` - has attribute, also in PUBLIC_ENDPOINTS
- `System/RestController::changeLanguage()` - has attribute, also in PUBLIC_ENDPOINTS
- `System/RestController::getAvailableLanguages()` - has attribute, also in PUBLIC_ENDPOINTS
- `Cdr/RestController::playback()` - has attribute, also in PUBLIC_ENDPOINTS
- `Cdr/RestController::download()` - has attribute, also in PUBLIC_ENDPOINTS
- `WikiLinks/RestController::getLink()` - has attribute

**What Needs Attributes (currently only in Priority 2):**
- `MailSettings/RestController::oauth2Callback` - **WAIT, THIS IS WRONG**
- `Passkeys/RestController::checkAvailability` - needs method-level attribute
- `Passkeys/RestController::authenticationStart` - needs method-level attribute
- `Passkeys/RestController::authenticationFinish` - needs method-level attribute
- `UserPageTracker/RestController::pageView` - needs method-level attribute
- `UserPageTracker/RestController::pageLeave` - needs method-level attribute

**CRITICAL DISCOVERY - OAuth2 Callback Architecture:**

After examining the code, I discovered that `/pbxcore/api/v3/mail-settings/oauth2-callback` has a **separate controller**:

- **Separate controller**: `MailSettings/OAuth2CallbackController` (extends `BaseController`, NOT `BaseRestController`)
- **Already has class-level PUBLIC attribute**: `#[ResourceSecurity('oauth2_callback', requirements: [SecurityType::PUBLIC])]` (line 65-68)
- **Already registered in Priority 1**: Because it has class-level attribute
- **Separate route**: `/pbxcore/api/v3/mail-settings/oauth2-callback` (different from main `/pbxcore/api/v3/mail-settings` resource)

This means OAuth2 callback is **already migrated** and doesn't need any changes! The entry in `PUBLIC_ENDPOINTS` for `/pbxcore/api/v3/mail-settings/oauth2-callback` is redundant legacy code.

**Corrected Migration List:**

Endpoints that actually need method-level attributes added:
1. `Passkeys/RestController::checkAvailability`
2. `Passkeys/RestController::authenticationStart`
3. `Passkeys/RestController::authenticationFinish`
4. `UserPageTracker/RestController::pageView`
5. `UserPageTracker/RestController::pageLeave`

### For This Migration - What Needs to Connect

Since we're migrating from Priority 2 (hardcoded constants) to Priority 1 (attributes), we need to understand the attribute system deeply.

**The ResourceSecurity Attribute:**

Located at `src/PBXCoreREST/Attributes/ResourceSecurity.php`, this attribute defines security requirements for resources and operations. Key properties:

- `$resource` (string): Resource name for RBAC (e.g., 'passkeys', 'user_page_tracker')
- `$action` (ActionType|null): Action type (READ/WRITE/DELETE) - auto-detected if null
- `$requirements` (array<SecurityType>): Security requirements array
- `$optional` (bool): Whether security is optional
- `$description` (string): Description of security requirements

**SecurityType Enum Options:**

- `SecurityType::PUBLIC` - No authentication required
- `SecurityType::LOCALHOST` - Only from 127.0.0.1
- `SecurityType::BEARER_TOKEN` - Requires JWT or API Key

**How to Make an Endpoint Public:**

Add the attribute to the method signature:

```php
#[ResourceSecurity('resource_name_action', requirements: [SecurityType::PUBLIC])]
public function methodName(): void
{
    // Implementation
}
```

**Critical Pattern Observations:**

1. **Resource naming convention**: When using method-level PUBLIC attributes, the resource name follows pattern `{resource}_{action}` (e.g., `auth_login`, `system_ping`, `wiki_links_get_link`)

2. **Placement**: Attribute goes BEFORE `#[ApiOperation]` and AFTER `#[ApiDataSchema]` in the method's attribute stack

3. **Mixed security controllers**: Some controllers have class-level `ResourceSecurity` with Bearer token requirements, but override specific methods with method-level PUBLIC attributes (example: `Cdr/RestController` has no class-level security, each method defines its own)

**Example from Auth/RestController (lines 275-294):**

```php
#[ResourceSecurity('auth_login', requirements: [SecurityType::PUBLIC])]
#[ApiDataSchema(
    schemaClass: DataStructure::class,
    type: 'loginResponse'
)]
#[ApiOperation(
    summary: 'rest_auth_Login',
    description: 'rest_auth_LoginDesc',
    operationId: 'authLogin'
)]
#[ApiParameterRef('login')]
#[ApiParameterRef('password')]
#[ApiParameterRef('sessionToken')]
#[ApiParameterRef('rememberMe')]
#[ApiResponse(200, 'rest_response_200_auth_login')]
#[ApiResponse(401, 'rest_response_401_invalid_credentials', 'PBXApiResult')]
public function login(): void
```

**Example from WikiLinks/RestController (line 67):**

```php
#[ResourceSecurity('wiki_links_get_link', requirements: [SecurityType::PUBLIC])]
#[ApiOperation(
    summary: 'rest_operation_wl_getLink_summary',
    description: 'rest_operation_wl_getLink_description',
    operationId: 'getWikiLink'
)]
```

**Why Method-Level Attributes Don't Work with PublicEndpointsRegistry:**

The current implementation of `PublicEndpointsRegistry::registerFromController()` (line 81-105) only scans class-level attributes:

```php
public function registerFromController(string $controllerClass, string $resourcePath): void
{
    // ...
    $reflection = new \ReflectionClass($controllerClass);
    $attributes = $reflection->getAttributes(ResourceSecurity::class);
    // Only checks class-level attributes, not method-level!

    if (empty($attributes)) {
        return; // If no class-level attribute, exits early
    }

    $resourceSecurity = $attributes[0]->newInstance();

    if (in_array(SecurityType::PUBLIC, $resourceSecurity->requirements, true)) {
        $this->registerPublicEndpoint($resourcePath);
    }
}
```

**This means**: Method-level PUBLIC attributes currently ONLY work because those endpoints are ALSO in `PUBLIC_ENDPOINTS` constant (Priority 2 fallback). Once we remove the constant, method-level attributes will stop working unless we enhance the registry.

**Two Options for Migration:**

**Option A: Enhance PublicEndpointsRegistry to scan method-level attributes**
- Modify `registerFromController()` to iterate through all public methods
- Check each method for `ResourceSecurity` attribute with `SecurityType::PUBLIC`
- Register method-specific routes (e.g., `/pbxcore/api/v3/passkeys:checkAvailability`)
- More complex but allows granular method-level control

**Option B: Move to class-level attributes with mixed security**
- Remove class-level `ResourceSecurity` from controllers like `Passkeys/RestController`
- Each method defines its own security requirements
- Simpler registry implementation
- Already working for `Cdr/RestController` which has no class-level security

**Current Codebase Pattern: Option B**

Looking at `Cdr/RestController` (lines 48-76), it has NO class-level `ResourceSecurity` attribute. Instead, each method defines security:

```php
#[ApiResource(path: '/pbxcore/api/v3/cdr', ...)]
#[HttpMapping(...)]  // NO class-level ResourceSecurity!
class RestController extends BaseRestController
{
    #[ResourceSecurity('cdr', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
    public function getList(): void {}

    #[ResourceSecurity('cdr_playback', requirements: [SecurityType::PUBLIC])]
    public function playback(): void {}
}
```

**The ACTUAL Problem:**

After deeper analysis, I realize the method-level attributes work through a DIFFERENT mechanism:

1. `AuthenticationMiddleware::isPublicEndpoint()` calls `isPublicEndpointByAttributes()` (line 209)
2. This checks `PublicEndpointsRegistry::isPublicEndpoint($uri)` (line 239)
3. The registry's `isPublicEndpoint()` method (line 63) does a **prefix match** on URI

**What this means for method-level attributes:**

If a controller has class-level `SecurityType::PUBLIC`, the ENTIRE resource path is registered (e.g., `/pbxcore/api/v3/auth`). Then any URI starting with that path is considered public (e.g., `/pbxcore/api/v3/auth:login`, `/pbxcore/api/v3/auth:refresh`).

But if a controller has class-level `SecurityType::BEARER_TOKEN` (like `Passkeys/RestController` line 57), the resource path `/pbxcore/api/v3/passkeys` is NOT registered as public, so method-level PUBLIC attributes on individual methods don't work through Priority 1.

**The Real Solution:**

We need to enhance `PublicEndpointsRegistry` to register method-level public endpoints. Here's the new flow:

1. `RouterProvider::registerControllerForPublicEndpoints()` calls registry
2. Registry scans class-level `ResourceSecurity` - if PUBLIC, register entire resource
3. **NEW**: If class-level is NOT public, scan each public method for method-level `ResourceSecurity` with PUBLIC
4. For each method-level PUBLIC, construct the method route and register it separately
5. Example: Register `/pbxcore/api/v3/passkeys:checkAvailability` as public, even though base `/pbxcore/api/v3/passkeys` is protected

**Route Pattern Construction:**

Looking at Google API Design patterns and MikoPBX routing:
- Custom methods: `GET /resource:method` (collection-level) or `GET /resource/{id}:method` (resource-level)
- Standard methods: `GET /resource` (getList), `GET /resource/{id}` (getRecord)

For public method registration, we need to construct:
- `checkAvailability` → `/pbxcore/api/v3/passkeys:checkAvailability`
- `authenticationStart` → `/pbxcore/api/v3/passkeys:authenticationStart`
- `authenticationFinish` → `/pbxcore/api/v3/passkeys:authenticationFinish`
- `pageView` → `/pbxcore/api/v3/user-page-tracker:pageView`
- `pageLeave` → `/pbxcore/api/v3/user-page-tracker:pageLeave`

**Method Name to Route Mapping:**

The `HttpMapping` attribute defines which methods are custom methods. We can use this to determine the route pattern.

### Technical Reference Details

#### Files to Modify

**1. Add method-level attributes (no code changes needed if we enhance registry):**
- `src/PBXCoreREST/Controllers/Passkeys/RestController.php`
  - Add `#[ResourceSecurity('passkeys_check_availability', requirements: [SecurityType::PUBLIC])]` before `checkAvailability()` method
  - Add `#[ResourceSecurity('passkeys_authentication_start', requirements: [SecurityType::PUBLIC])]` before `authenticationStart()` method
  - Add `#[ResourceSecurity('passkeys_authentication_finish', requirements: [SecurityType::PUBLIC])]` before `authenticationFinish()` method

- `src/PBXCoreREST/Controllers/UserPageTracker/RestController.php`
  - Add `#[ResourceSecurity('user_page_tracker_page_view', requirements: [SecurityType::PUBLIC])]` before `pageView()` method
  - Add `#[ResourceSecurity('user_page_tracker_page_leave', requirements: [SecurityType::PUBLIC])]` before `pageLeave()` method

**2. Enhance PublicEndpointsRegistry to support method-level attributes:**
- `src/PBXCoreREST/Services/PublicEndpointsRegistry.php`
  - Enhance `registerFromController()` to scan method-level attributes
  - Add logic to construct method-specific routes (e.g., `/path:methodName`)
  - Register both class-level (entire resource) and method-level (specific operations) public endpoints

**3. Remove legacy constant and fallback:**
- `src/PBXCoreREST/Middleware/AuthenticationMiddleware.php`
  - Remove `PUBLIC_ENDPOINTS` constant (lines 61-75)
  - Remove Priority 2 fallback code in `isPublicEndpoint()` (lines 214-218)
  - Update docblock to remove legacy fallback references

**4. Update tests:**
- `tests/api/test_63_public_endpoints.py`
  - Remove tests for Priority 2 (legacy hardcoded endpoints)
  - Add tests for new method-level public attributes
  - Update documentation comments to reflect 2-priority system (Attributes + Module noAuth)

**5. Update documentation:**
- `src/PBXCoreREST/CLAUDE.md`
  - Remove Priority 2 from public endpoints section
  - Update architecture description to 2-priority system
  - Add examples of method-level PUBLIC attributes

#### PublicEndpointsRegistry Enhancement Details

**Current `registerFromController()` logic:**

```php
public function registerFromController(string $controllerClass, string $resourcePath): void
{
    if (!class_exists($controllerClass)) {
        return;
    }

    try {
        $reflection = new \ReflectionClass($controllerClass);
        $attributes = $reflection->getAttributes(ResourceSecurity::class);

        if (empty($attributes)) {
            return;
        }

        /** @var ResourceSecurity $resourceSecurity */
        $resourceSecurity = $attributes[0]->newInstance();

        // Check if this resource has PUBLIC security requirement
        if (in_array(SecurityType::PUBLIC, $resourceSecurity->requirements, true)) {
            $this->registerPublicEndpoint($resourcePath);
        }
    } catch (\ReflectionException) {
        // Ignore reflection errors
    }
}
```

**Enhanced logic needed:**

```php
public function registerFromController(string $controllerClass, string $resourcePath): void
{
    if (!class_exists($controllerClass)) {
        return;
    }

    try {
        $reflection = new \ReflectionClass($controllerClass);

        // Check class-level security
        $classAttributes = $reflection->getAttributes(ResourceSecurity::class);
        if (!empty($classAttributes)) {
            $resourceSecurity = $classAttributes[0]->newInstance();
            if (in_array(SecurityType::PUBLIC, $resourceSecurity->requirements, true)) {
                $this->registerPublicEndpoint($resourcePath);
                return; // Entire resource is public, no need to check methods
            }
        }

        // Class-level is not public, check method-level attributes
        $methods = $reflection->getMethods(\ReflectionMethod::IS_PUBLIC);
        foreach ($methods as $method) {
            $methodAttributes = $method->getAttributes(ResourceSecurity::class);
            if (empty($methodAttributes)) {
                continue;
            }

            $methodSecurity = $methodAttributes[0]->newInstance();
            if (in_array(SecurityType::PUBLIC, $methodSecurity->requirements, true)) {
                // Construct method-specific route
                $methodName = $method->getName();
                $methodRoute = $this->buildMethodRoute($resourcePath, $methodName);
                $this->registerPublicEndpoint($methodRoute);
            }
        }
    } catch (\ReflectionException) {
        // Ignore reflection errors
    }
}

private function buildMethodRoute(string $resourcePath, string $methodName): string
{
    // Convert camelCase to snake-case for route
    // Example: checkAvailability -> check-availability
    $snakeCase = strtolower(preg_replace('/([a-z])([A-Z])/', '$1-$2', $methodName));

    // Construct custom method route
    return $resourcePath . ':' . $snakeCase;
}
```

**Wait, this is wrong!** Looking at routes again:

- `checkAvailability` method maps to route `/pbxcore/api/v3/passkeys:checkAvailability` (camelCase preserved!)
- The route uses the EXACT method name from `HttpMapping::customMethods`, not snake-case

**Corrected buildMethodRoute():**

```php
private function buildMethodRoute(string $resourcePath, string $methodName): string
{
    // Custom methods use exact method name in route (camelCase preserved)
    return $resourcePath . ':' . $methodName;
}
```

#### Authentication Middleware Changes

**Current `isPublicEndpoint()` (lines 201-221):**

```php
private function isPublicEndpoint(Micro $application): bool
{
    /** @var Request $request */
    $request = $application->getService(RequestProvider::SERVICE_NAME);
    $uri = $request->getURI();
    $method = $request->getMethod();

    // Strategy 1: Check attribute-based public endpoints registry
    if ($this->isPublicEndpointByAttributes($application, $uri)) {
        return true;
    }

    // Strategy 2: Check hardcoded legacy endpoints (backward compatibility)
    foreach (self::PUBLIC_ENDPOINTS as $endpoint => $allowedMethods) {
        if (strpos($uri, $endpoint) === 0 && in_array($method, $allowedMethods, true)) {
            return true;
        }
    }

    return false;
}
```

**After migration:**

```php
private function isPublicEndpoint(Micro $application): bool
{
    /** @var Request $request */
    $request = $application->getService(RequestProvider::SERVICE_NAME);
    $uri = $request->getURI();

    // Check attribute-based public endpoints registry
    return $this->isPublicEndpointByAttributes($application, $uri);
}
```

**Simplified!** Remove Priority 2 fallback entirely.

#### Test Updates Required

**Current test structure** (`test_63_public_endpoints.py`):

- `TestPublicEndpointsRegistry` - Priority 1 tests (keep)
- `TestPublicEndpointsLegacy` - Priority 2 tests (remove or refactor)
- `TestPublicEndpointsModules` - Priority 3 tests (keep)
- `TestPublicEndpointsNegative` - Negative tests (keep)
- `TestPublicEndpointsPriority` - Priority order tests (update to 2-priority)
- `TestPublicEndpointsEdgeCases` - Edge cases (keep)

**New tests needed:**

- Test method-level PUBLIC attributes work (e.g., `passkeys:checkAvailability`)
- Test class-level BEARER_TOKEN with method-level PUBLIC override
- Test that non-public methods still require auth

#### Environment Requirements

**No special environment requirements** - this is a code-only migration:

- PHP 8.3+ (already required by project)
- Phalcon 5.8+ (already required by project)
- Reflection API (built-in to PHP)

**Development workflow:**

1. Add method-level attributes to controllers
2. Enhance `PublicEndpointsRegistry::registerFromController()`
3. Test in development environment
4. Remove `PUBLIC_ENDPOINTS` constant
5. Remove Priority 2 fallback in `isPublicEndpoint()`
6. Update tests
7. Run full test suite to verify no regressions

#### Critical Edge Cases

**Edge Case 1: OAuth2 Callback Already Migrated**

The `/pbxcore/api/v3/mail-settings/oauth2-callback` endpoint has a separate controller (`OAuth2CallbackController`) with class-level PUBLIC attribute. It's already in Priority 1. The entry in `PUBLIC_ENDPOINTS` can be safely removed.

**Edge Case 2: CDR Playback Token-Based Security**

The `cdr:playback` and `cdr:download` methods are PUBLIC (no authentication required at middleware level), but implement custom token-based security inside the action. These use query parameter tokens generated by the system. After migration, ensure these continue to work as PUBLIC endpoints.

**Edge Case 3: Optional Authentication**

Public endpoints support optional authentication - if a valid Bearer token is provided, the user context is available to the action for enhanced features. This is implemented in `AuthenticationMiddleware::tryOptionalAuthentication()` (line 116). After migration, ensure this still works.

**Edge Case 4: Method Name Consistency**

The method name in `#[ResourceSecurity('resource_name_method', ...)]` is for documentation/ACL only. The actual route is determined by `HttpMapping::customMethods`. Ensure registry uses the correct method name from HTTP mapping, not from the security attribute's resource name.

**Edge Case 5: HTTP Method Filtering**

Current Priority 2 filters by HTTP method (e.g., `'POST' => ['login']`). After migration to Priority 1 with method-level attributes, the registry doesn't filter by HTTP method - it only matches URI. This is acceptable because:
- The router will reject invalid methods (404/405)
- AuthenticationMiddleware runs BEFORE routing, so it can't know which method the route expects
- If URI matches a public endpoint, any HTTP method is allowed through auth (routing will handle method validation)

**Verification:** Test that `POST /pbxcore/api/v3/system:ping` is rejected by router (405 Method Not Allowed), not by auth (401 Unauthorized).
