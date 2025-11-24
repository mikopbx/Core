---
name: m-refactor-router-provider-public-endpoints
branch: feature/m-refactor-router-provider-public-endpoints
status: pending
created: 2025-11-24
---

# Refactor RouterProvider and Public Endpoints Handling

## Problem/Goal
RouterProvider has code duplication between `generateMappedRoutes()` and `generateAllRoutes()` methods with similar route registration logic. Additionally, need to clarify the necessity of `PUBLIC_ENDPOINTS` constant in AuthenticationMiddleware when endpoints are already marked as public in controller annotations. The system should support creating public endpoints in external modules.

## Success Criteria

**Code Quality & Testing:**
- [ ] Дублирование между `generateMappedRoutes()` и `generateAllRoutes()` устранено - общая логика вынесена в приватный метод
- [ ] Unit тесты для регистрации маршрутов созданы и покрывают оба метода
- [ ] Все существующие функциональные тесты проходят после рефакторинга

**Public Endpoints Architecture:**
- [ ] Определена стратегия работы с публичными эндпоинтами (либо только аннотации, либо аннотации + константа с обоснованием)
- [ ] Внешние модули могут регистрировать публичные эндпоинты без модификации core кода
- [ ] AuthenticationMiddleware корректно обрабатывает публичные эндпоинты из модулей

**Examples & Documentation:**
- [ ] Каждый пример в `/Users/nb/PhpstormProjects/mikopbx/Extensions/EXAMPLES/REST-API` дополнен минимум одним публичным ресурсом
- [ ] Публичные эндпоинты в примерах работают без авторизации (проверено curl/тестами)
- [ ] Документация обновлена: как создавать публичные эндпоинты в модулях

**PHPStan Compliance:**
- [ ] PHPStan анализ проходит без новых ошибок

## Context Manifest

### How Public Endpoints Currently Work

The MikoPBX REST API uses a dual-path authentication system where endpoints can be made public through two mechanisms: attribute-based security annotations and legacy hardcoded constants.

#### Path 1: Attribute-Based Public Endpoints (Modern Pattern 2025)

Controllers use PHP 8 attributes to declare security requirements. When a controller method is marked with `#[ResourceSecurity]` attribute containing `SecurityType::PUBLIC`, the endpoint requires no authentication.

**Example from CDR Controller:**
```php
#[ResourceSecurity('cdr', requirements: [SecurityType::PUBLIC])]
#[ApiOperation(summary: 'rest_cdr_Playback', ...)]
public function playback(): void {}
```

The flow is:
1. RouterProvider scans all controllers and generates routes automatically based on `#[ApiResource]` and `#[HttpMapping]` attributes
2. Each route is registered to `handleCRUDRequest()` or `handleCustomRequest()` methods
3. AuthenticationMiddleware intercepts ALL requests before they reach controllers
4. SecurityResolver (in BaseRestController) reads `#[ResourceSecurity]` attributes to determine if endpoint is public
5. However, AuthenticationMiddleware doesn't currently check these attributes - it only checks hardcoded `PUBLIC_ENDPOINTS` constant

#### Path 2: Hardcoded PUBLIC_ENDPOINTS Constant (Current Implementation)

AuthenticationMiddleware contains a hardcoded list of public endpoints:

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

The middleware checks incoming requests against this list using simple string prefix matching:

```php
private function isPublicEndpoint(Micro $application): bool
{
    $uri = $request->getURI();
    $method = $request->getMethod();

    foreach (self::PUBLIC_ENDPOINTS as $endpoint => $allowedMethods) {
        if (strpos($uri, $endpoint) === 0 && in_array($method, $allowedMethods, true)) {
            return true;
        }
    }
    return false;
}
```

**Problem**: This creates duplication - endpoints are marked public in two places:
1. In controller via `#[ResourceSecurity('cdr', requirements: [SecurityType::PUBLIC])]`
2. In AuthenticationMiddleware via hardcoded constant

#### Path 3: Module Public Endpoints (Legacy Pattern 2)

Modules using Pattern 2 (getPBXCoreRESTAdditionalRoutes) can mark routes as public using the 6th parameter:

```php
public function getPBXCoreRESTAdditionalRoutes(): array
{
    return [
        // [ControllerClass, method, path, httpMethod, rootUrl, noAuth]
        [GetController::class, 'callAction', '/pbxcore/api/module-name/{action}', 'get', '', true],
        //                                                                                    ^^^^
        //                                                                                    noAuth flag
    ];
}
```

The Request class checks this in `thisIsModuleNoAuthRequest()`:

```php
public function thisIsModuleNoAuthRequest(Micro $api): bool
{
    $pattern = $api->request->getURI(true);
    $additionalRoutes = PBXConfModulesProvider::hookModulesMethod(
        RestAPIConfigInterface::GET_PBXCORE_REST_ADDITIONAL_ROUTES
    );

    foreach ($additionalRoutes as $additionalRoutesFromModule) {
        foreach ($additionalRoutesFromModule as $additionalRoute) {
            $noAuth = $additionalRoute[5] ?? false;  // 6th element
            $resultPattern = '/^' . str_replace('/', '\/', $additionalRoute[2]) . '/';
            $resultPattern = preg_replace('/\{[^\/]+\}/', '[^\/]+', $resultPattern);

            if ($noAuth === true && preg_match($resultPattern, $pattern)) {
                return true;
            }
        }
    }
    return false;
}
```

AuthenticationMiddleware calls this:
```php
if ($this->isPublicEndpoint($application) || $request->thisIsModuleNoAuthRequest($application)) {
    $this->tryOptionalAuthentication($request);
    return true;
}
```

**Problem**: Module Pattern 4 (modern attribute-based) doesn't have a way to mark routes as public because SecurityResolver is only used AFTER authentication passes.

### How RouterProvider Generates Routes

RouterProvider has code duplication between `generateMappedRoutes()` and `generateAllRoutes()` methods. Both methods follow identical routing logic with only minor differences.

#### Route Generation Flow

When RouterProvider starts:

1. **getAllRoutes()** collects routes from multiple sources in priority order:
   ```php
   $routes = [
       ...self::SPECIAL_ROUTES,           // Special hardcoded routes (currently empty)
       ...$this->discoverUniversalRoutes(), // Core controllers with #[ApiResource]
       ...$this->discoverModuleControllers(), // Module Pattern 4 controllers
       ...self::LEGACY_ROUTES,            // Legacy ModulesControllerBase routes
       ...$moduleRoutes,                  // Module Pattern 2 routes from getPBXCoreRESTAdditionalRoutes()
   ];
   ```

2. **discoverUniversalRoutes()** scans `/src/PBXCoreREST/Controllers/` recursively:
   - Finds all PHP files
   - Checks if class has `#[ApiResource]` attribute
   - Extracts resource path from attribute
   - Calls `generateUniversalRoutes()` for each controller

3. **discoverModuleControllers()** scans enabled modules in `/storage/usbdisk1/mikopbx/custom_modules/`:
   - Gets enabled modules from database (PbxExtensionModules where disabled=0)
   - Scans each module's `Lib/RestAPI/` directory for `*Controller.php` files
   - Checks if class has `#[ApiResource]` attribute
   - Calls `generateUniversalRoutes()` for each module controller

4. **generateUniversalRoutes()** determines which route generation method to use:
   - Checks if controller has `#[HttpMapping]` attribute
   - If yes → calls `generateMappedRoutes()` (efficient, only needed routes)
   - If no → calls `generateAllRoutes()` (fallback, all possible routes)

5. **Route Registration Order** (CRITICAL - Phalcon matches in order):
   ```
   Priority 1: Resource-level custom methods    /tasks/{id}:download
   Priority 2: Collection-level custom methods   /tasks:getDefault
   Priority 3: Resource-level CRUD               /tasks/{id}
   Priority 4: Collection-level CRUD             /tasks/
   ```

#### Code Duplication in generateMappedRoutes() and generateAllRoutes()

**generateMappedRoutes()** (lines 331-453):
```php
private function generateMappedRoutes(
    string $controllerClass,
    string $resourcePath,
    array $patterns,
    HttpMapping $httpMapping
): array {
    $routes = [];
    $httpMethods = ['get', 'head', 'post', 'put', 'patch', 'delete'];

    // 1. Resource-level custom methods (lines 356-382)
    foreach ($patterns as $pattern) {
        $idPattern = /* ... logic ... */;
        foreach ($httpMethods as $httpMethod) {
            $operations = $mapping[strtoupper($httpMethod)] ?? [];
            $resourceCustomMethods = array_intersect($operations, ...);
            foreach ($resourceCustomMethods as $customMethod) {
                $routes[] = [$controllerClass, 'handleResourceCustomRequest', $resourcePath, $httpMethod, '/{id:' . $idPattern . '}\:{method:' . preg_quote($customMethod, '/') . '}'];
            }
        }
    }

    // 2. Collection-level custom methods (lines 386-419)
    foreach ($httpMethods as $httpMethod) {
        $operations = $mapping[strtoupper($httpMethod)] ?? [];
        $customOps = array_intersect($operations, $httpMapping->customMethods);
        foreach ($collectionCustomMethods as $customMethod) {
            $routes[] = [$controllerClass, 'handleCustomRequest', $resourcePath, $httpMethod, ':{method:' . preg_quote($customMethod, '/') . '}'];
        }
    }

    // 3. Resource-level CRUD (lines 421-439)
    foreach ($patterns as $pattern) {
        $idPattern = /* ... same logic ... */;
        foreach ($httpMethods as $httpMethod) {
            $routes[] = [$controllerClass, 'handleCRUDRequest', $resourcePath, $httpMethod, '/{id:' . $idPattern . '}'];
        }
    }

    // 4. Collection-level CRUD (lines 441-450)
    foreach ($httpMethods as $httpMethod) {
        $routes[] = [$controllerClass, 'handleCRUDRequest', $resourcePath, $httpMethod, '/'];
    }
}
```

**generateAllRoutes()** (lines 458-520):
```php
private function generateAllRoutes(string $controllerClass, string $resourcePath, array $patterns): array
{
    $routes = [];

    // 1. Resource-level custom methods (lines 474-488)
    foreach ($patterns as $pattern) {
        $idPattern = /* ... same logic ... */;
        $routes[] = [$controllerClass, 'handleResourceCustomRequest', $resourcePath, 'get', '/{id:' . $idPattern . '}:{method:[a-zA-Z][a-zA-Z0-9]*}'];
        $routes[] = [$controllerClass, 'handleResourceCustomRequest', $resourcePath, 'head', '/{id:' . $idPattern . '}:{method:[a-zA-Z][a-zA-Z0-9]*}'];
        // ... same for post, put, patch, delete
    }

    // 2. Collection-level custom methods (lines 490-496)
    $routes[] = [$controllerClass, 'handleCustomRequest', $resourcePath, 'get', ':{method:[a-zA-Z][a-zA-Z0-9]*}'];
    $routes[] = [$controllerClass, 'handleCustomRequest', $resourcePath, 'head', ':{method:[a-zA-Z][a-zA-Z0-9]*}'];
    // ... same for post, put, patch, delete

    // 3. Resource-level CRUD (lines 498-509)
    foreach ($patterns as $pattern) {
        $idPattern = /* ... same logic ... */;
        $routes[] = [$controllerClass, 'handleCRUDRequest', $resourcePath, 'get', '/{id:' . $idPattern . '}'];
        // ... same for head, put, patch, delete
    }

    // 4. Collection-level CRUD (lines 511-518)
    $routes[] = [$controllerClass, 'handleCRUDRequest', $resourcePath, 'get', '/'];
    $routes[] = [$controllerClass, 'handleCRUDRequest', $resourcePath, 'head', '/'];
    // ... same for post, put, patch, delete
}
```

**Duplication Analysis:**

Both methods share:
1. **ID Pattern calculation** - identical logic in both methods (lines 357-362 vs 477-479, repeated again at 425-427 vs 500-502)
2. **HTTP method iteration** - both iterate over ['get', 'head', 'post', 'put', 'patch', 'delete']
3. **Route ordering logic** - both follow same 4-phase priority order
4. **Route format construction** - both build routes as `[$controllerClass, $method, $resourcePath, $httpMethod, $pattern]`

**Key Differences:**

| Aspect | generateMappedRoutes() | generateAllRoutes() |
|--------|------------------------|---------------------|
| Custom methods | Explicit (from HttpMapping) | Wildcard pattern `:{method:[a-zA-Z][a-zA-Z0-9]*}` |
| Route count | Only needed routes | All possible routes (overhead) |
| Pattern specificity | `:{method:download}` | `:{method:[a-zA-Z]...}` |
| HTTP method loops | Nested in custom method filter | Simple repetition |

### How External Modules Register REST API Routes

Modules have **4 patterns** for REST API integration (documented in `/src/PBXCoreREST/CLAUDE.md` and `/src/Modules/CLAUDE.md`):

#### Pattern 1: Legacy ModulesControllerBase (Before 2025)
- URL: `/pbxcore/api/modules/{moduleName}/{actionName}`
- Route: Hardcoded in RouterProvider::LEGACY_ROUTES
- Example: ModuleAutoprovision, ModuleBitrix24Notify
- **Public endpoints**: Not supported (always requires authentication)

#### Pattern 2: Custom Controllers via getPBXCoreRESTAdditionalRoutes() (2017-2024)
- URL: `/pbxcore/api/{custom-path}/{action}`
- Route: Module implements `getPBXCoreRESTAdditionalRoutes()` in ConfigClass
- Example: ModuleExampleRestAPIv2
- **Public endpoints**: Supported via 6th parameter `noAuth: true`

**Example from ModuleExampleRestAPIv2Conf.php:**
```php
public function getPBXCoreRESTAdditionalRoutes(): array
{
    return [
        // [ControllerClass, method, path, httpMethod, rootUrl, noAuth]
        [GetController::class, 'callAction', '/pbxcore/api/module-example-rest-api-v2/{actionName}', 'get', '', false],
        [PostController::class, 'callAction', '/pbxcore/api/module-example-rest-api-v2/{actionName}', 'post', '', false],
        // To make public: change false to true ──────────────────────────────────────────────────────────────┘
    ];
}
```

These routes are added to RouterProvider via:
```php
$moduleRoutes = PBXConfModulesProvider::hookModulesMethod(
    RestAPIConfigInterface::GET_PBXCORE_REST_ADDITIONAL_ROUTES
);
if (!empty($moduleRoutes)) {
    $routes = [...$routes, ...array_merge(...array_values($moduleRoutes))];
}
```

#### Pattern 3: Module Pattern 3 (2024) - Simple REST endpoints
- URL: `/pbxcore/api/v3/modules/{moduleId}/{action}`
- Route: Uses PbxExtensionsProcessor (similar to Pattern 1)
- Example: Transition pattern between Pattern 2 and Pattern 4
- **Public endpoints**: Not documented

#### Pattern 4: Modern Attribute-Based (2025+)
- URL: `/pbxcore/api/v3/modules/{module-name}/{resource}`
- Route: Auto-discovered by `discoverModuleControllers()` in RouterProvider
- Controllers use `#[ApiResource]`, `#[HttpMapping]`, `#[ResourceSecurity]` attributes
- Example: ModuleExampleRestAPIv3
- **Public endpoints**: Attributes exist but NOT checked by AuthenticationMiddleware!

**Example from ModuleExampleRestAPIv3 Tasks Controller:**
```php
#[ApiResource(path: '/pbxcore/api/v3/modules/module-example-rest-api-v3/tasks', ...)]
#[HttpMapping(mapping: ['GET' => ['getList', 'getRecord'], ...], ...)]
#[ResourceSecurity('module-example-rest-api-v3-tasks', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
class Controller extends BaseRestController { ... }
```

To make this public, developers would change:
```php
#[ResourceSecurity('module-example-rest-api-v3-tasks', requirements: [SecurityType::PUBLIC])]
```

**BUT** AuthenticationMiddleware doesn't check this attribute! It only checks:
1. Hardcoded PUBLIC_ENDPOINTS constant
2. Module Pattern 2 noAuth flag via `thisIsModuleNoAuthRequest()`

### Why PUBLIC_ENDPOINTS Constant Exists

Based on code analysis, the PUBLIC_ENDPOINTS constant serves as a **temporary bridge** during the 2024-2025 refactoring from imperative routing to attribute-based routing.

**Historical Context:**
- Before 2025: Routes were manually registered, public endpoints manually whitelisted
- 2025 Pattern: Routes auto-discovered via attributes, security declared via `#[ResourceSecurity]`
- PUBLIC_ENDPOINTS: Hardcoded list maintained during transition period

**Current State:**
- Core endpoints like Auth, Passkeys, CDR have BOTH:
  - `#[ResourceSecurity('auth', requirements: [SecurityType::PUBLIC])]` in controller
  - Entry in PUBLIC_ENDPOINTS constant in middleware

**Future State (intended):**
- AuthenticationMiddleware should read `#[ResourceSecurity]` attributes dynamically
- PUBLIC_ENDPOINTS constant becomes redundant
- Single source of truth: controller attributes

**Problem:**
- Modules using Pattern 4 cannot create public endpoints because SecurityResolver is only called AFTER authentication passes
- Need to move attribute checking into AuthenticationMiddleware

### Testing Infrastructure for Routing

The codebase uses pytest for API testing. Relevant test patterns:

**Test File Naming:**
- `test_XX_resource_name.py` - Resource-specific tests (e.g., `test_25_outbound_routes.py`)
- Tests use numbering for execution order

**Test Structure:**
```python
import pytest
from tests.api.conftest import api_client, auth_headers

class TestOutboundRoutes:
    def test_get_list(self, api_client, auth_headers):
        response = api_client.get('/pbxcore/api/v3/outbound-routes', headers=auth_headers)
        assert response.status_code == 200

    def test_create(self, api_client, auth_headers):
        response = api_client.post('/pbxcore/api/v3/outbound-routes',
                                   json={'name': 'Test'},
                                   headers=auth_headers)
        assert response.status_code == 201
```

**Testing Public Endpoints:**
```python
def test_public_endpoint_without_auth(self, api_client):
    # Should work without auth headers
    response = api_client.get('/pbxcore/api/v3/system:ping')
    assert response.status_code == 200

def test_public_endpoint_with_optional_auth(self, api_client, auth_headers):
    # Should work with auth headers too
    response = api_client.get('/pbxcore/api/v3/system:ping', headers=auth_headers)
    assert response.status_code == 200
```

**No existing router-specific unit tests found** - tests focus on endpoint functionality, not routing mechanics.

### Module Examples Structure

REST API examples located at `/Users/nb/PhpstormProjects/mikopbx/Extensions/EXAMPLES/REST-API/`:

**ModuleExampleRestAPIv1** - Pattern 1 (Legacy)
- Uses ModulesControllerBase
- No public endpoint support

**ModuleExampleRestAPIv2** - Pattern 2 (Custom Routes)
```
ModuleExampleRestAPIv2/
├── Lib/
│   ├── ExampleRestAPIv2Conf.php          # implements getPBXCoreRESTAdditionalRoutes()
│   └── RestAPI/
│       ├── Controllers/
│       │   ├── GetController.php          # GET operations
│       │   └── PostController.php         # POST operations
│       └── Backend/
│           ├── ModuleRestAPIProcessor.php # Routes to Actions
│           └── Actions/
│               ├── GetConfigAction.php
│               ├── GetUsersAction.php
│               ├── DownloadFileAction.php
│               └── ...
```

Currently NO public endpoints in examples. All routes use `noAuth: false`.

**ModuleExampleRestAPIv3** - Pattern 4 (Modern Attributes)
```
ModuleExampleRestAPIv3/
├── Lib/
│   ├── ExampleRestAPIv3Conf.php          # No route registration needed!
│   └── RestAPI/
│       └── Tasks/
│           ├── Controller.php             # #[ApiResource], #[HttpMapping], #[ResourceSecurity]
│           ├── Processor.php              # Routes to Actions
│           ├── DataStructure.php          # Field definitions
│           └── Actions/
│               ├── GetListAction.php
│               ├── GetRecordAction.php
│               └── ...
```

Controller uses:
```php
#[ResourceSecurity('module-example-rest-api-v3-tasks',
    requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
```

To make public, would need:
```php
#[ResourceSecurity('module-example-rest-api-v3-tasks',
    requirements: [SecurityType::PUBLIC])]
```

### Technical Reference Details

#### Key Classes and Their Responsibilities

**RouterProvider** (`/src/PBXCoreREST/Providers/RouterProvider.php`)
- Discovers controllers with `#[ApiResource]` attribute
- Generates routes based on `#[HttpMapping]` or fallback patterns
- Mounts routes to Phalcon Micro application
- **Does NOT** handle authentication - only routing

**AuthenticationMiddleware** (`/src/PBXCoreREST/Middleware/AuthenticationMiddleware.php`)
- Intercepts ALL requests before controllers
- Checks 3 authentication channels:
  1. PUBLIC endpoints (hardcoded constant + module noAuth flag)
  2. LOCALHOST (127.0.0.1)
  3. BEARER_TOKEN (JWT or API Key)
- **Does NOT currently** check controller `#[ResourceSecurity]` attributes

**SecurityResolver** (`/src/PBXCoreREST/Services/SecurityResolver.php`)
- Reads `#[ResourceSecurity]` attributes from controllers/methods
- Resolves ActionType (READ, WRITE, DELETE, ADMIN)
- Builds permission strings (resource:action format)
- **Currently only used** in BaseRestController for permission checks AFTER authentication

**BaseRestController** (`/src/PBXCoreREST/Controllers/BaseRestController.php`)
- Base class for all REST controllers
- Provides `handleCRUDRequest()` and `handleCustomRequest()` methods
- Contains SecurityResolver instance
- Methods to get ResourceSecurity, ActionType, permissions for methods

**Request** (`/src/PBXCoreREST/Http/Request.php`)
- Extended Phalcon Request class
- Contains `thisIsModuleNoAuthRequest()` for Pattern 2 module public endpoints
- Checks module routes' 6th parameter (noAuth flag)

#### Attributes Used for Route Configuration

**ApiResource** - Marks controller as REST resource
```php
#[ApiResource(
    path: '/pbxcore/api/v3/call-queues',
    tags: ['Call Queues'],
    description: 'Call queue management',
    processor: CallQueuesManagementProcessor::class
)]
```

**HttpMapping** - Defines HTTP method → operations mapping
```php
#[HttpMapping(
    mapping: [
        'GET' => ['getList', 'getRecord'],
        'POST' => ['create'],
        'PUT' => ['update'],
        'PATCH' => ['patch'],
        'DELETE' => ['delete']
    ],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete'],
    collectionLevelMethods: ['getList', 'create'],
    customMethods: ['getDefault', 'copy'],
    idPattern: '[^/:]+' // Regex for ID parameter
)]
```

**ResourceSecurity** - Declares security requirements
```php
#[ResourceSecurity(
    'call_queues',
    requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN]
)]

// For public endpoints:
#[ResourceSecurity('webhooks', requirements: [SecurityType::PUBLIC])]
```

**SecurityType** - Enum of security requirement types
```php
enum SecurityType: string
{
    case LOCALHOST = 'localhost';      // 127.0.0.1 only
    case BEARER_TOKEN = 'bearer_token'; // JWT or API Key
    case PUBLIC = 'public';             // No authentication
}
```

#### Route Format

All routes are arrays with 5 elements:
```php
[$controllerClass, $methodName, $resourcePath, $httpMethod, $pattern]

// Examples:
['MikoPBX\\PBXCoreREST\\Controllers\\CallQueues\\RestController',
 'handleCRUDRequest',
 '/pbxcore/api/v3/call-queues',
 'get',
 '/']

['MikoPBX\\PBXCoreREST\\Controllers\\CallQueues\\RestController',
 'handleCustomRequest',
 '/pbxcore/api/v3/call-queues',
 'get',
 ':getDefault']

['MikoPBX\\PBXCoreREST\\Controllers\\CallQueues\\RestController',
 'handleCRUDRequest',
 '/pbxcore/api/v3/call-queues',
 'get',
 '/{id:[^/:]+}']
```

#### File Locations for Implementation

**Core routing logic:**
- `/Users/nb/PhpstormProjects/mikopbx/project-modules-api-refactoring/src/PBXCoreREST/Providers/RouterProvider.php`
- Lines 331-453: `generateMappedRoutes()` - needs refactoring
- Lines 458-520: `generateAllRoutes()` - needs refactoring

**Authentication logic:**
- `/Users/nb/PhpstormProjects/mikopbx/project-modules-api-refactoring/src/PBXCoreREST/Middleware/AuthenticationMiddleware.php`
- Lines 56-70: PUBLIC_ENDPOINTS constant - analyze necessity
- Lines 192-206: `isPublicEndpoint()` - may need attribute checking
- Lines 86: Check for module noAuth - Pattern 2 support

**Security resolution:**
- `/Users/nb/PhpstormProjects/mikopbx/project-modules-api-refactoring/src/PBXCoreREST/Services/SecurityResolver.php`
- May need to expose public endpoint checking method

**Example modules:**
- `/Users/nb/PhpstormProjects/mikopbx/Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv2/` - Pattern 2
- `/Users/nb/PhpstormProjects/mikopbx/Extensions/EXAMPLES/REST-API/ModuleExampleRestAPIv3/` - Pattern 4

**Tests should go:**
- `/Users/nb/PhpstormProjects/mikopbx/project-modules-api-refactoring/tests/api/test_XX_router_provider.py` - Unit tests for route generation
- `/Users/nb/PhpstormProjects/mikopbx/project-modules-api-refactoring/tests/api/test_XX_public_endpoints.py` - Integration tests for public access

### Architectural Decision Points

**Option 1: Keep PUBLIC_ENDPOINTS constant (easier, less ideal)**
- Pros: No breaking changes, simple implementation
- Cons: Duplication, manual maintenance, doesn't support module Pattern 4

**Option 2: Migrate to attribute-based detection (recommended)**
- Pros: Single source of truth, supports all patterns, future-proof
- Cons: Requires refactoring AuthenticationMiddleware
- Implementation: Move SecurityResolver logic into middleware, check attributes before authentication

**Option 3: Hybrid approach (pragmatic)**
- Pros: Supports both old and new patterns during transition
- Cons: Keeps some duplication temporarily
- Implementation: Check attributes first, fallback to constant for legacy endpoints

### Dependencies and Integration Points

**Module Pattern 2 Integration:**
- ConfigClass implements RestAPIConfigInterface
- getPBXCoreRESTAdditionalRoutes() returns array with 6th parameter for noAuth
- Request::thisIsModuleNoAuthRequest() checks this flag
- Already works for public endpoints

**Module Pattern 4 Integration:**
- Controllers extend BaseRestController
- Use #[ResourceSecurity] attribute
- Auto-discovered by RouterProvider::discoverModuleControllers()
- Currently CANNOT create public endpoints (attribute not checked)

**OpenAPI Generation:**
- SecurityResolver used by ControllerDiscovery for OpenAPI spec
- Public endpoints should appear without security schemes
- Current implementation may already handle this correctly

**ACL System:**
- ResourceSecurity attributes define RBAC permissions
- SecurityType::PUBLIC means bypass all ACL checks
- Need to ensure public endpoints don't leak into permission system

## User Notes
<!-- Any specific notes or requirements from the developer -->

## Work Log
<!-- Updated as work progresses -->
- [YYYY-MM-DD] Started task, initial research
