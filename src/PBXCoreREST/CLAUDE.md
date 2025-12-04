# MikoPBX REST API Development Guide

REST API v3 development guide for MikoPBX using modern PHP 8.3 patterns.

## Architecture Overview

```
HTTP Request → Middleware → Controller → Redis Queue → Worker → Processor → Action → DataStructure → Response
```

## Core Components

### 1. Controllers (PHP 8 Attributes)

```php
#[ApiResource(path: '/pbxcore/api/v3/call-queues', tags: ['Call Queues'])]
#[ResourceSecurity('call_queues', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]
#[HttpMapping(
    mapping: ['GET' => ['getList', 'getRecord'], 'POST' => ['create']],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete'],
    collectionLevelMethods: ['getList', 'create'],
    customMethods: ['getDefault', 'copy'],
    // ✨ NEW: idPattern supports arrays for multiple prefixes
    idPattern: ['CONFERENCE-', 'CONFERENCE-ROOM-', 'CONFERENCE']  // CONFERENCE-xxx, CONFERENCE-ROOM-xxx, CONFERENCExxx
)]
class RestController extends BaseRestController
{
    // ✨ Lightweight references to DataStructure::getParameterDefinitions()['request']
    // All constraints (enum, pattern, maxLength, min/max, defaults) inherited from definitions
    #[ApiParameterRef('name', required: true)]
    #[ApiParameterRef('extension', required: true)]
    #[ApiParameterRef('strategy')]
    public function create(): void {}

    // ✨ Internal-only operations (excluded from OpenAPI)
    // Use internal=true for operations called only by Nginx/Lua or internal services
    #[ApiOperation(
        summary: 'Validate JWT token (internal)',
        description: 'Internal endpoint for JWT token validation by Nginx/Lua. Only accessible from localhost.',
        operationId: 'authValidateToken',
        internal: true  // ⚠️ This operation will NOT appear in OpenAPI specification
    )]
    public function validateToken(): void {}
}
```

### 2. DataStructure - Single Source of Truth

✨ **CRITICAL:** ALL field definitions (validation, sanitization, defaults, constraints) must be centralized in `getParameterDefinitions()`.

```php
class DataStructure extends AbstractDataStructure
{
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                'name' => [
                    'type' => 'string',
                    'description' => 'Queue name',
                    'minLength' => 1,
                    'maxLength' => 64,
                    'sanitize' => 'text',
                    'required' => true,
                    'example' => 'Support Queue'
                ],
                'strategy' => [
                    'type' => 'string',
                    'enum' => ['ringall', 'leastrecent', 'fewestcalls', 'random', 'rrmemory'],
                    'sanitize' => 'string',
                    'default' => 'ringall'
                ],
                'timeout' => [
                    'type' => 'integer',
                    'minimum' => 0,
                    'maximum' => 300,
                    'sanitize' => 'int',
                    'default' => 30
                ]
            ],
            'response' => [
                'represent' => [
                    'type' => 'string',
                    'description' => 'HTML representation for dropdowns'
                ]
            ]
        ];
    }

    // Auto-generate sanitization rules from definitions
    public static function getSanitizationRules(): array
    {
        $definitions = static::getParameterDefinitions();
        $rules = [];

        foreach ($definitions['request'] as $field => $def) {
            $rule = [$def['type'] ?? 'string'];

            if (isset($def['sanitize'])) {
                $rule[] = 'sanitize:' . $def['sanitize'];
            }
            if (isset($def['maxLength'])) {
                $rule[] = 'max:' . $def['maxLength'];
            }
            if (!isset($def['required'])) {
                $rule[] = 'empty_to_null';
            }

            $rules[$field] = implode('|', $rule);
        }

        return $rules;
    }
}
```

### 3. SaveRecordAction - 7-Phase Pattern

✨ **CRITICAL:** Follow this exact 7-phase pattern with WHY comments for every SaveRecordAction.

```php
public static function main(array $data): PBXApiResult
{
    $res = self::createApiResult(__METHOD__);

    // ============ PHASE 1: SANITIZATION ============
    // WHY: Security - never trust user input
    $sanitizationRules = DataStructure::getSanitizationRules();
    $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, ['name', 'description']);

    // ============ PHASE 2: REQUIRED VALIDATION ============
    // WHY: Fail fast - don't waste resources
    $validationErrors = self::validateRequiredFields($sanitizedData, [
        'name' => [['type' => 'required', 'message' => 'Name is required']]
    ]);
    if (!empty($validationErrors)) {
        $res->messages['error'] = $validationErrors;
        return $res;
    }

    // ============ PHASE 3: DETERMINE OPERATION ============
    // WHY: Different logic for new vs existing records
    $isNewRecord = empty($sanitizedData['id']);
    $model = $isNewRecord ? new Model() : Model::findByUniqid($sanitizedData['id']);

    // ============ PHASE 4: APPLY DEFAULTS (CREATE ONLY!) ============
    // WHY CREATE: New records need complete data
    // WHY NOT UPDATE/PATCH: Would overwrite existing values!
    if ($isNewRecord) {
        $sanitizedData = DataStructure::applyDefaults($sanitizedData);
    }

    // ============ PHASE 5: SCHEMA VALIDATION ============
    // WHY: Validate AFTER defaults to check complete dataset
    $schemaErrors = DataStructure::validateInputData($sanitizedData);
    if (!empty($schemaErrors)) {
        $res->messages['error'] = $schemaErrors;
        $res->httpCode = 422;
        return $res;
    }

    // ============ PHASE 6: SAVE ============
    // WHY: All-or-nothing transaction
    $savedModel = self::executeInTransaction(function() use ($model, $sanitizedData) {
        // Apply fields with isset() for PATCH support
        if (isset($sanitizedData['name'])) $model->name = $sanitizedData['name'];
        if (isset($sanitizedData['strategy'])) $model->strategy = $sanitizedData['strategy'];

        if (!$model->save()) {
            throw new \Exception(implode(', ', $model->getMessages()));
        }
        return $model;
    });

    // ============ PHASE 7: RESPONSE ============
    // WHY: Consistent API format
    $res->data = DataStructure::createFromModel($savedModel);
    $res->success = true;
    $res->httpCode = $isNewRecord ? 201 : 200;

    return $res;
}
```

## Authentication Architecture

### JWT Bearer Tokens & API Keys
Use the **`auth-token-manager`** skill to obtain JWT Bearer tokens automatically:
- Handles login with username/password
- Returns ready-to-use access token
- Manages cookies and token lifecycle

Use the **`api-client`** skill to execute API requests with automatic authentication:
- Auto-authentication with JWT tokens
- Supports all HTTP methods (GET, POST, PATCH, DELETE)
- Executes requests inside Docker containers

**Dual-token system:**
- **Access Token:** JWT, 15 min, stateless, Bearer header
- **Refresh Token:** 30 days, Redis storage, httpOnly cookie, auto-rotation
- **API Keys:** No expiration, format: `miko_ak_1234567890abcdef...`

### Public Endpoints

**Public endpoints** allow access without authentication. MikoPBX uses a **3-priority hybrid system** that checks endpoints in the following order:

1. **Priority 1:** Attribute-based (Pattern 4) via `PublicEndpointsRegistry`
2. **Priority 2:** Legacy hardcoded constants in `AuthenticationMiddleware::PUBLIC_ENDPOINTS`
3. **Priority 3:** Module Pattern 2 with `noAuth: true` flag

The `AuthenticationMiddleware` checks these priorities in order during request authentication. If an endpoint is found in any priority level, it's treated as public and authentication is skipped.

**Testing:** Comprehensive functional tests in `tests/api/test_63_public_endpoints.py` verify all 3 priorities, priority order, optional authentication, and edge cases.

#### Strategy 1: Attribute-Based Public Endpoints (Recommended - Pattern 4)

Mark entire resource as public using `SecurityType::PUBLIC`:

```php
#[ApiResource(path: '/pbxcore/api/v3/webhooks')]
#[ResourceSecurity('webhooks', requirements: [SecurityType::PUBLIC])]
#[HttpMapping(mapping: ['POST' => ['processWebhook']], ...)]
class WebhooksController extends BaseRestController
{
    // All methods in this controller are public
}
```

**How it works:**
1. `RouterProvider` scans controller during route generation
2. Detects `SecurityType::PUBLIC` in `ResourceSecurity` attribute
3. Registers endpoint in `PublicEndpointsRegistry` service
4. `AuthenticationMiddleware` checks registry before requiring authentication

**Benefits:**
- ✅ Single source of truth (controller attributes)
- ✅ Works for Core and Module Pattern 4 endpoints
- ✅ No code duplication
- ✅ Automatic discovery

#### Strategy 2: Module Pattern 2 Public Endpoints

For legacy Pattern 2 modules, use 6th parameter `noAuth: true`:

```php
public function getPBXCoreRESTAdditionalRoutes(): array
{
    return [
        // Private endpoint (requires authentication)
        [GetController::class, 'callAction', '/pbxcore/api/module-name/{action}', 'get', '', false],

        // Public endpoint (no authentication required)
        [GetController::class, 'callAction', '/pbxcore/api/module-name-public/{action}', 'get', '', true],
        //                                                                                           ^^^^
        //                                                                                           noAuth flag
    ];
}
```

**How it works:**
1. `Request::thisIsModuleNoAuthRequest()` checks 6th parameter
2. Matches URI pattern against module routes
3. Returns `true` if `noAuth === true`
4. `AuthenticationMiddleware` allows request

#### Strategy 3: Legacy Hardcoded Constants (Backward Compatibility)

Core public endpoints still in `AuthenticationMiddleware::PUBLIC_ENDPOINTS`:

```php
private const PUBLIC_ENDPOINTS = [
    '/pbxcore/api/v3/auth:login' => ['POST'],
    '/pbxcore/api/v3/auth:refresh' => ['POST'],
    '/pbxcore/api/v3/system:ping' => ['GET'],
    // ... other core public endpoints
];
```

**Migration path:** New endpoints should use Strategy 1 (attributes). This constant will be phased out once all core endpoints are migrated.

#### Optional Authentication on Public Endpoints

Public endpoints support **optional authentication** - they work with or without Bearer token:

```php
// Public endpoint without token
GET /pbxcore/api/v3/system:ping
→ 200 OK (anonymous)

// Public endpoint with valid token
GET /pbxcore/api/v3/system:ping
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGci...
→ 200 OK (authenticated, user context available)
```

**Use case:** Health check endpoints that can provide extended info for authenticated users.

## Creating New Endpoints

### Core Endpoints

1. **Controller:** `src/PBXCoreREST/Controllers/YourResource/RestController.php`
2. **Processor:** `src/PBXCoreREST/Lib/YourResourceManagementProcessor.php` (enum + match)
3. **Actions:** `src/PBXCoreREST/Lib/YourResource/*Action.php`
4. **DataStructure:** `src/PBXCoreREST/Lib/YourResource/DataStructure.php`

Auto-generated routes:
- `GET /pbxcore/api/v3/your-resource` → getList
- `GET /pbxcore/api/v3/your-resource/{id}` → getRecord
- `POST /pbxcore/api/v3/your-resource` → create
- `PUT /pbxcore/api/v3/your-resource/{id}` → update
- `PATCH /pbxcore/api/v3/your-resource/{id}` → patch
- `DELETE /pbxcore/api/v3/your-resource/{id}` → delete

Custom methods (Google API Design):
- Collection: `GET /resource:method`
- Resource: `GET /resource/{id}:method`

**ID Pattern Generation:**

The `RouterProvider::buildIdPattern()` method handles ID pattern generation for route matching:

- **Array of prefixes** (e.g., `['SIP-', 'IAX-', 'SIP-TRUNK-']`): Escapes each prefix and appends `[^/:]+` to exclude colons and slashes for proper `/{id}:method` parsing
- **Single regex pattern** (e.g., `[0-9]+`): Uses pattern as-is without modification
- **Empty array**: Returns default pattern `[^/:]+`

This ensures proper route matching when controllers define multiple ID prefixes via the `idPattern` parameter in `HttpMapping` attribute.

**Implementation reference:** `/Users/nb/PhpstormProjects/mikopbx/project-modules-api-refactoring/src/PBXCoreREST/Providers/RouterProvider.php:605-612`

### Module Endpoints (Pattern 4)

**⚠️ CRITICAL: Prevent endpoint conflicts**

When creating module endpoints, **ALWAYS** include module namespace in path:

```php
// ✅ CORRECT - includes module namespace
#[ApiResource(path: '/pbxcore/api/v3/modules/your-module-name/resource')]

// ❌ WRONG - conflicts with Core!
#[ApiResource(path: '/pbxcore/api/v3/resource')]
```

**Why this matters:**
1. **Core conflicts:** Module path `/pbxcore/api/v3/tasks` conflicts with Core `/pbxcore/api/v3/tasks`
2. **Module conflicts:** Two modules can't use `/pbxcore/api/v3/tasks`
3. **Future-proof:** Core may add new endpoints in future updates

**Recommended patterns:**
- `/pbxcore/api/v3/modules/{module-kebab-case}/{resource}` ✅
- `/pbxcore/api/v3/module-{module-name}/{resource}` ⚠️ (alternative)

**Examples:**
```php
// ModuleTaskManager
#[ApiResource(path: '/pbxcore/api/v3/modules/task-manager/tasks')]

// ModuleCRM
#[ApiResource(path: '/pbxcore/api/v3/modules/crm/contacts')]
```

**Public Module Endpoints (Pattern 4):**

Modules can create public endpoints using `SecurityType::PUBLIC`:

```php
namespace Modules\ModuleWebhooks\Lib\RestAPI\Webhooks;

#[ApiResource(path: '/pbxcore/api/v3/modules/webhooks/receiver')]
#[ResourceSecurity('webhooks-receiver', requirements: [SecurityType::PUBLIC])]
#[HttpMapping(
    mapping: ['POST' => ['processWebhook']],
    collectionLevelMethods: ['processWebhook']
)]
class Controller extends BaseRestController
{
    protected string $processorClass = Processor::class;

    // This endpoint will be publicly accessible without authentication
    // Example: POST /pbxcore/api/v3/modules/webhooks/receiver
}
```

**Why use public endpoints in modules:**
- Webhook receivers (GitHub, GitLab, payment gateways)
- Public API integrations
- Health check endpoints
- Status pages

**Pattern 2 modules** should use the 6th parameter `noAuth: true` as shown in Strategy 2 above.

## HTTP Status Codes

```
200 OK                      # GET, PUT, PATCH, DELETE success
201 Created                 # POST success
400 Bad Request             # Invalid format
401 Unauthorized            # No/invalid auth
403 Forbidden               # No permission
404 Not Found               # Resource missing
409 Conflict                # Duplicate/constraint
422 Unprocessable Entity    # Validation error
500 Internal Server Error   # Unexpected error
```

## OpenAPI Management Endpoints

The `/pbxcore/api/v3/openapi` resource provides comprehensive API metadata and documentation.

### Available Endpoints

**GET /pbxcore/api/v3/openapi:getSpecification**
- Returns OpenAPI 3.1 specification (JSON/YAML)
- Query parameter: `format` (json/yaml)
- Used by: Swagger UI, ReDoc, API documentation tools

**GET /pbxcore/api/v3/openapi:getAclRules**
- Returns ACL rules extracted from API metadata
- Used by: Access control systems

**GET /pbxcore/api/v3/openapi:getValidationSchemas**
- Returns validation schemas for all endpoints
- Used by: Frontend validation, API clients

**GET /pbxcore/api/v3/openapi:getSimplifiedPermissions**
- Returns simplified resource/action structure for API Keys
- Groups endpoints by resource and action type (read/write)
- Used by: API Keys management UI

**GET /pbxcore/api/v3/openapi:getDetailedPermissions**
- Returns comprehensive controller/action structure for ACL tree building
- Categories: AdminCabinet (APP), PBX_CORE_REST (REST), Module categories
- Response structure:
  ```json
  {
    "categories": {
      "AdminCabinet": {
        "type": "APP",
        "controllers": {
          "ClassName": {
            "name": "ControllerName",
            "label": "Display Label",
            "actions": ["action1", "action2"]
          }
        }
      },
      "PBX_CORE_REST": {
        "type": "REST",
        "controllers": {
          "/pbxcore/api/v3/resource": {
            "name": "resource",
            "label": "Resource Tag",
            "actions": ["getList", "create", "update"]
          }
        }
      },
      "ModuleId": {
        "type": "APP|REST",
        "controllers": { /* module controllers */ }
      }
    }
  }
  ```
- Module Pattern 2 endpoints (legacy) use `"actions": ["*"]` wildcard
- Module REST v3 endpoints (Pattern 4) are separated into respective module categories
- Used by: ModuleUsersUI ACL tree builder

**POST /pbxcore/api/v3/openapi:clearCache**
**DELETE /pbxcore/api/v3/openapi:clearCache**
- Clears OpenAPI metadata cache
- Forces metadata regeneration on next request

### Implementation Details

**Controller Discovery**: `src/PBXCoreREST/Lib/OpenAPI/GetDetailedPermissionsAction.php`
- Scans AdminCabinet controllers via filesystem (MVC pattern)
- Scans REST API controllers via `ControllerDiscovery` and `ApiMetadataRegistry` (Pattern 4)
- Separates Core REST endpoints from Module REST v3 endpoints by namespace analysis
- Scans Module APP controllers in enabled modules
- Scans Module REST controllers (Pattern 2 legacy with Phalcon Annotations)

**Module Endpoint Separation**: Module REST v3 endpoints (Pattern 4) are detected by namespace pattern `Modules\{ModuleId}\Lib\RestAPI\...` and placed in module categories instead of PBX_CORE_REST. This ensures proper ACL tree grouping.

**Pattern 2 Wildcard Actions**: Legacy modules using Pattern 2 (`moduleRestAPICallback`, `getPBXCoreRESTAdditionalRoutes`) return `["*"]` wildcard for actions because parsing Phalcon Annotations would require controller instantiation. Frontend should interpret this as "all actions" and provide single permission toggle for the entire endpoint.

**Test Coverage**: `tests/api/test_49_openapi.py`
- `test_13_get_detailed_permissions` - Validates response structure and categories
- `test_14_module_rest_v3_endpoints_separation` - Ensures Module REST v3 endpoints are properly separated from Core

## Testing & Validation

### API Testing
Use the **`api-client`** skill to test endpoints:
- Execute requests with auto-authentication
- Test CRUD operations (GET, POST, PATCH, DELETE)
- Debug API responses with specific parameters

Use the **`api-test-generator`** skill to generate comprehensive tests:
- Generate Python pytest tests for endpoints
- Add coverage for CRUD operations
- Validate API compliance with OpenAPI schemas

### Endpoint Validation
Use the **`endpoint-validator`** skill to validate endpoints:
- Check OpenAPI schema compliance
- Verify parameter consistency
- Validate DataStructure definitions

### Database Verification
Use the **`sqlite-inspector`** skill to verify data:
- Check data consistency after API operations
- Validate foreign key relationships
- Inspect CDR records for testing

### OpenAPI Analysis
Use the **`openapi-analyzer`** skill to analyze API specification:
- Extract endpoint schemas
- Check endpoint documentation
- Integrate with validation and test generation

### Code Quality
Use the **`php-style`** skill to check PHP code standards (PSR-1/4/12, PHP 8.3)

## Key Patterns & Rules

### ✅ Single Source of Truth Pattern
- ALL field definitions in `DataStructure::getParameterDefinitions()`
- Auto-generate sanitization rules from definitions
- Controllers use `#[ApiParameterRef]` to reference definitions
- NO duplicate field definitions anywhere

### ✅ 7-Phase SaveRecordAction
1. **SANITIZATION** - Security first
2. **REQUIRED VALIDATION** - Fail fast
3. **DETERMINE OPERATION** - New vs existing
4. **APPLY DEFAULTS** - CREATE only, never UPDATE/PATCH
5. **SCHEMA VALIDATION** - After defaults
6. **SAVE** - Transaction wrapper
7. **RESPONSE** - Consistent format

### ✅ PATCH Support
- Use `isset()` checks for all field assignments
- Never apply defaults on UPDATE/PATCH
- Preserve existing values for missing fields

### ❌ NEVER
- Define sanitization rules inline in actions (always use DataStructure)
- Apply defaults on UPDATE/PATCH operations
- Skip WHY comments in SaveRecordAction phases

## Reference Implementations

Study these as perfect examples:
- **CallQueues** - Complete 7-phase pattern, nested members
- **IvrMenu** - Complex nested actions array
- **Providers** - Polymorphic schema (SIP/IAX), password masking
- **Firewall** - Security validation, nested rules, inheritance, **dual-stack IPv4/IPv6 support**
- **Employees** - Multi-entity save (Users + Extensions + Sip)
- **Network** - Dual-stack IPv4/IPv6 configuration, dynamic field handling

## IPv4 and IPv6 Support

### Network Configuration Endpoints

The Network API endpoints (`/pbxcore/api/v3/network`) support dual-stack IPv4 and IPv6 configuration:

#### IPv6 Fields in Network Interface Configuration

```php
// IPv6 configuration mode
'ipv6_mode' => [
    'type' => 'string',
    'enum' => ['0', '1', '2'],
    'default' => '0',
    'description' => '0=Off, 1=Auto (SLAAC/DHCPv6), 2=Manual (static)'
]

// Static IPv6 address (used when ipv6_mode='2')
'ipv6addr' => [
    'type' => 'string',
    'pattern' => '^[0-9a-fA-F:]+$',
    'example' => '2001:db8::1'
]

// IPv6 prefix length (1-128, typically 64)
'ipv6_subnet' => [
    'type' => 'string',
    'pattern' => '^[0-9]{1,3}$',
    'example' => '64'
]

// IPv6 gateway
'ipv6_gateway' => [
    'type' => 'string',
    'pattern' => '^[0-9a-fA-F:]+$',
    'example' => '2001:db8::254'
]

// IPv6 DNS servers
'primarydns6' => [
    'type' => 'string',
    'example' => '2001:4860:4860::8888'
]
'secondarydns6' => [
    'type' => 'string',
    'example' => '2001:4860:4860::8844'
]
```

#### Auto-Configuration Mode (SLAAC/DHCPv6)

When `ipv6_mode='1'`, the system automatically configures IPv6 via:
- **SLAAC** (Stateless Address Autoconfiguration)
- **DHCPv6** (Dynamic Host Configuration Protocol for IPv6)

The API returns current auto-configured values in read-only fields:
- `currentIpv6addr` - Auto-configured IPv6 address
- `currentIpv6_subnet` - Auto-configured prefix length
- `currentIpv6_gateway` - Auto-configured gateway
- `currentPrimarydns6` - Auto-configured primary DNS
- `currentSecondarydns6` - Auto-configured secondary DNS

```json
// Example response with IPv6 Auto mode
{
  "ipv6_mode": "1",
  "ipv6addr": "",
  "ipv6_subnet": "",
  "ipv6_gateway": "",
  "currentIpv6addr": "2001:db8::a123:4567:89ab:cdef",
  "currentIpv6_subnet": "64",
  "currentIpv6_gateway": "fe80::1"
}
```

#### Manual Configuration Mode

When `ipv6_mode='2'`, provide static IPv6 configuration:

```json
POST /pbxcore/api/v3/network/{id}
{
  "ipv6_mode": "2",
  "ipv6addr": "2001:db8::1",
  "ipv6_subnet": "64",
  "ipv6_gateway": "2001:db8::254",
  "primarydns6": "2001:4860:4860::8888",
  "secondarydns6": "2001:4860:4860::8844"
}
```

#### Dual-Stack Configuration

IPv4 and IPv6 work simultaneously. A complete dual-stack configuration:

```json
{
  "interface": "eth0",
  "dhcp": "0",
  "ipaddr": "192.168.1.10",
  "subnet": "255.255.255.0",
  "gateway": "192.168.1.1",
  "primarydns": "8.8.8.8",
  "ipv6_mode": "2",
  "ipv6addr": "2001:db8::10",
  "ipv6_subnet": "64",
  "ipv6_gateway": "2001:db8::1",
  "primarydns6": "2001:4860:4860::8888"
}
```

### IP Address Validation

Use `IpAddressHelper` utility for dual-stack IP validation:

```php
use MikoPBX\Core\Utilities\IpAddressHelper;

// In SaveConfigAction
if (!empty($data['ipv6addr'])) {
    if (!IpAddressHelper::isIpv6($data['ipv6addr'])) {
        $res->messages['error'][] = 'Invalid IPv6 address';
        return $res;
    }
}

// Validate CIDR notation
$cidr = IpAddressHelper::normalizeCidr($data['network']);
if ($cidr === false) {
    $res->messages['error'][] = 'Invalid CIDR notation';
    return $res;
}

// Check IP version consistency
$ipVersion = IpAddressHelper::getIpVersion($data['gateway']);
$networkVersion = IpAddressHelper::getIpVersion($data['network']);
if ($ipVersion !== $networkVersion) {
    $res->messages['error'][] = 'Gateway and network IP versions must match';
    return $res;
}
```

### Static Routes with IPv6

Network static routes support both IPv4 and IPv6:

```json
// IPv4 route
POST /pbxcore/api/v3/network/routes
{
  "network": "10.0.0.0",
  "subnet": "24",
  "gateway": "192.168.1.1"
}

// IPv6 route
POST /pbxcore/api/v3/network/routes
{
  "network": "2001:db8:1::",
  "subnet": "64",
  "gateway": "2001:db8::1"
}
```

The subnet field accepts:
- **IPv4**: 0-32 (CIDR notation)
- **IPv6**: 1-128 (prefix length)

### Firewall: IPv4/IPv6 Dual-Stack Support

The Firewall REST API demonstrates how to implement dual-stack IPv4/IPv6 support with proper validation:

**SaveRecordAction IPv6 Validation** (`src/PBXCoreREST/Lib/Firewall/SaveRecordAction.php`):
```php
private static function validateIpAndCidr(string $network, int|string $subnet): array
{
    $errors = [];

    // Detect IP version using IpAddressHelper
    $version = IpAddressHelper::getIpVersion($network);
    if ($version === false) {
        $errors[] = "Invalid IP address format: $network";
        return $errors;
    }

    $subnetInt = is_string($subnet) ? intval($subnet) : $subnet;

    // IPv4 validation (prefix /0-/32)
    if ($version === IpAddressHelper::IP_VERSION_4) {
        if ($subnetInt < 0 || $subnetInt > 32) {
            $errors[] = "IPv4 subnet prefix must be between 0 and 32, got: $subnet";
        }

        // Validate octets are in correct range
        $octets = explode('.', $network);
        if (count($octets) !== 4) {
            $errors[] = "Invalid IPv4 address format: $network (must have 4 octets)";
            return $errors;
        }

        foreach ($octets as $index => $octet) {
            $octetNum = (int)$octet;
            if ($octetNum < 0 || $octetNum > 255) {
                $errors[] = "Invalid IPv4 octet #" . ($index + 1) . ": $octet (must be 0-255)";
            }
        }
    }
    // IPv6 validation (prefix /0-/128)
    else {
        if ($subnetInt < 0 || $subnetInt > 128) {
            $errors[] = "IPv6 prefix length must be between 0 and 128, got: $subnet";
        }

        // Validate IPv6 format using filter
        if (!filter_var($network, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            $errors[] = "Invalid IPv6 address format: $network";
        }
    }

    // Final CIDR validation using IpAddressHelper
    $cidr = "$network/$subnet";
    if (IpAddressHelper::normalizeCidr($cidr) === false) {
        $errors[] = "Invalid CIDR notation format: $cidr";
    }

    return $errors;
}
```

**Key implementation details:**
1. **Version detection**: Use `IpAddressHelper::getIpVersion()` to detect IPv4 vs IPv6
2. **Subnet range validation**: IPv4 accepts /0-/32, IPv6 accepts /0-/128
3. **Format validation**: Use `filter_var()` with `FILTER_FLAG_IPV6` for IPv6
4. **CIDR normalization**: Use `IpAddressHelper::normalizeCidr()` for final validation
5. **Unified storage**: Store both IPv4 and IPv6 in same network/subnet fields
6. **Either/or enforcement**: UI enforces one protocol per rule (NIST SP 800-119)

**Model-level validation** (`src/Common/Models/NetworkFilters.php`):
```php
public function beforeValidation(): bool
{
    // Validate permit field (IPv4 or IPv6 CIDR)
    if (!empty($this->permit)) {
        $cidrInfo = IpAddressHelper::normalizeCidr($this->permit);
        if ($cidrInfo === false) {
            $this->appendMessage(new Message(
                'Invalid permit network CIDR notation',
                'permit'
            ));
            return false;
        }
    }

    // Validate deny field
    if (!empty($this->deny)) {
        $cidrInfo = IpAddressHelper::normalizeCidr($this->deny);
        if ($cidrInfo === false) {
            $this->appendMessage(new Message(
                'Invalid deny network CIDR notation',
                'deny'
            ));
            return false;
        }
    }

    return true;
}
```

**Testing:**
- Unit tests: `tests/Common/Models/NetworkFiltersTest.php` (IPv6 CIDR validation)
- Unit tests: `tests/Core/System/Configs/IptablesConfTest.php` (IPv6 firewall rule generation)
- Test various IPv6 formats: 2001:db8::/64, fe80::/10, ::1/128, ::/0

**See also:** `src/AdminCabinet/CLAUDE.md` section "Dual-Stack IPv4/IPv6 Forms" for frontend implementation

## External Resources

- [Google API Design Guide](https://cloud.google.com/apis/design)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [HTTP Status Codes](https://httpstatuses.com/)