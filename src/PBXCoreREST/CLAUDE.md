# CLAUDE.md - MikoPBX REST API Development

This file provides guidance to Claude Code (claude.ai/code) for REST API development in MikoPBX.

## REST API Architecture Overview

MikoPBX REST API uses a queue-based architecture:

```
HTTP Request → Middleware (Auth/CSRF) → Controller → Redis Queue → Worker → Processor (enum+match) → Action → DataStructure → Response
```

**API Versions:**
- **v3 API** (Current) - `/pbxcore/api/v3/` - PHP 8 attributes, OpenAPI 3.1, Google API Design Guide
- **Legacy API** - `/pbxcore/api/` - Backward compatibility

## Core Components

### 1. Controllers (v3 API)

**Reference:** `src/PBXCoreREST/Controllers/CallQueues/RestController.php`

Controllers use PHP 8 attributes and extend `BaseRestController`:

```php
#[ApiResource(path: '/pbxcore/api/v3/call-queues', tags: ['Call Queues'])]
#[ResourceSecurity('call_queues', requirements: [SecurityType::LOCALHOST, SecurityType::BEARER_TOKEN])]  // LOCALHOST = internal auth, not in OpenAPI
#[HttpMapping(
    mapping: ['GET' => ['getList', 'getRecord'], 'POST' => ['create'], ...],
    resourceLevelMethods: ['getRecord', 'update', 'patch', 'delete'],
    collectionLevelMethods: ['getList', 'create'],
    customMethods: ['getDefault', 'copy'],
    idPattern: 'QUEUE-[A-Z0-9]{8,}'
)]
class RestController extends BaseRestController
{
    protected string $processorClass = CallQueuesManagementProcessor::class;

    // Methods documented with attributes, implementation in BaseRestController
    public function getList(): void {}
    public function getRecord(string $id): void {}
}
```

**Key Features:**
- Zero implementation needed - `BaseRestController` handles routing
- Automatic OpenAPI generation from attributes
- Auto-discovery by `RouterProvider` - no route registration needed

### 2. Processors

**Reference:** `src/PBXCoreREST/Lib/CallQueuesManagementProcessor.php`

Type-safe dispatching with PHP 8 enums and match expressions:

```php
enum CallQueueAction: string {
    case GET_LIST = 'getList';
    case CREATE = 'create';
    // ...
}

class CallQueuesManagementProcessor extends Injectable
{
    public static function callBack(array $request): PBXApiResult
    {
        $action = CallQueueAction::tryFrom($request['action']);

        return match ($action) {
            CallQueueAction::GET_LIST => GetListAction::main($request['data']),
            CallQueueAction::CREATE => CreateRecordAction::main($request['data']),
            // ...
        };
    }
}
```

### 3. Action Classes

**Reference:** `src/PBXCoreREST/Lib/CallQueues/GetListAction.php`

One action = one class with static `main()` method:

```php
class GetListAction extends AbstractGetListAction
{
    public static function main(array $data = []): PBXApiResult
    {
        return self::executeStandardList(
            $data,
            CallQueues::class,
            DataStructure::class,
            ['name', 'description'],  // Search fields
            ['name', 'extension'],    // Sort fields
            'name ASC'               // Default order
        );
    }
}
```

**Available Abstract Classes:**
- `AbstractGetListAction` - List with search/sort/pagination
- `AbstractGetRecordAction` - Single record by ID
- `AbstractCreateAction` - Create with validation
- `AbstractUpdateAction` - Full replacement
- `AbstractPatchAction` - Partial update
- `AbstractDeleteAction` - Delete with checks

### 4. DataStructure

**Reference:** `src/PBXCoreREST/Lib/CallQueues/DataStructure.php`

Transform models and provide OpenAPI schemas:

```php
class DataStructure extends AbstractDataStructure implements OpenApiSchemaProvider
{
    use SearchIndexTrait;

    public static function createFromModel($model): array
    {
        $data = self::createBaseStructure($model);
        $data['id'] = $model->uniqid;  // Use uniqid for v3 API

        // Add fields with representations
        $data = self::addMultipleExtensionFields($data, [...]);
        $data = self::addSoundFileField($data, 'moh_sound_id', $model->moh_sound_id);

        return self::formatBySchema($data, 'detail');
    }

    public static function getDetailSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'id' => ['type' => 'string', 'pattern' => '^QUEUE-[A-Z0-9]{8}$'],
                'timeout' => ['type' => 'integer', 'minimum' => 0, 'maximum' => 300],
                'enabled' => ['type' => 'boolean', 'default' => false]
            ]
        ];
    }
}
```

**Key Methods:**
- `createFromModel()` - Detail view with all fields
- `createForList()` - List view with search index
- `getDetailSchema()` - OpenAPI schema for validation/conversion
- `getListItemSchema()` - Schema for list items
- `formatBySchema()` - Auto-convert types (string→int, string→bool)

## PHP Attributes

**Available Attributes:**

| Attribute | Level | Purpose |
|-----------|-------|---------|
| `#[ApiResource]` | Class | Resource metadata, tags, processor |
| `#[HttpMapping]` | Class | HTTP method mapping, custom methods, ID pattern |
| `#[ResourceSecurity]` | Class | Security requirements, ACL |
| `#[ApiOperation]` | Method | Operation summary, description, operationId |
| `#[ApiParameter]` | Method | Parameters (query, path, body) |
| `#[ApiResponse]` | Method | Response codes and schemas |
| `#[ApiDataSchema]` | Method | Link to DataStructure class |

## Creating New API Endpoints

### Quick Start

1. **Create Controller:** `src/PBXCoreREST/Controllers/YourResource/RestController.php`
2. **Create Processor:** `src/PBXCoreREST/Lib/YourResourceManagementProcessor.php` (with enum)
3. **Create Actions:** `src/PBXCoreREST/Lib/YourResource/*Action.php`
4. **Create DataStructure:** `src/PBXCoreREST/Lib/YourResource/DataStructure.php`
5. **Done!** Routes auto-discovered by `RouterProvider`

### Example Structure

```
src/PBXCoreREST/
├── Controllers/
│   └── YourResource/
│       └── RestController.php          # Attributes only, no implementation
├── Lib/
│   ├── YourResourceManagementProcessor.php  # Enum + match dispatch
│   └── YourResource/
│       ├── DataStructure.php           # Model → API format + schemas
│       ├── GetListAction.php           # extends AbstractGetListAction
│       ├── GetRecordAction.php         # extends AbstractGetRecordAction
│       ├── CreateRecordAction.php      # extends AbstractCreateAction
│       ├── UpdateRecordAction.php      # extends AbstractUpdateAction
│       ├── PatchRecordAction.php       # extends AbstractPatchAction
│       └── DeleteRecordAction.php      # extends AbstractDeleteAction
```

**Generated Routes:**
- `GET /pbxcore/api/v3/your-resource` → getList
- `GET /pbxcore/api/v3/your-resource/{id}` → getRecord
- `POST /pbxcore/api/v3/your-resource` → create
- `PUT /pbxcore/api/v3/your-resource/{id}` → update
- `PATCH /pbxcore/api/v3/your-resource/{id}` → patch
- `DELETE /pbxcore/api/v3/your-resource/{id}` → delete

### Custom Methods (Google API Design Guide)

Collection-level: `GET /resource:method`
Resource-level: `GET /resource/{id}:method`

```php
#[HttpMapping(customMethods: ['export', 'import'])]
// Note: SecurityType::LOCALHOST is for internal authorization only, not exposed in OpenAPI
// In enum: case EXPORT = 'export';
// Routes: /resource:export, /resource/{id}:import
```

## Authentication

**Reference:** `src/PBXCoreREST/Middleware/AuthenticationMiddleware.php`

### JWT Token Architecture

MikoPBX uses a dual-token system following OAuth 2.0 best practices:

**Access Token (JWT)**:
- Type: JSON Web Token with HS256 signature
- Lifetime: 15 minutes (900 seconds)
- Storage: Client memory (NOT in cookies)
- Transmission: `Authorization: Bearer <token>` header
- Payload: `{userId, role, language, iat, exp, nbf}`
- Cannot be revoked server-side (stateless)

**Refresh Token**:
- Type: Random hex string (64 characters)
- Lifetime: 30 days (2592000 seconds)
- Storage: Redis with SHA256 hash key
- Transmission: httpOnly cookie `refreshToken`
- Security: Automatic rotation on each refresh
- Can be revoked: Deleted from Redis on logout

**Token Storage**:
```
Redis Key: refresh_token:{sha256(token)}
Redis Value: {userId, role, clientIp, userAgent, createdAt, lastUsedAt}
TTL: 30 days (automatic cleanup by Redis)
```

**Remember Me**:
- When `rememberMe=true`: Cookie expires in 30 days
- When `rememberMe=false`: Session cookie (expires on browser close)
- Both use same Redis storage with 30-day TTL

### Authentication Methods (in priority order):

1. **JWT Bearer Token** (15 min) - `/pbxcore/api/v3/auth:login`
   ```bash
    # 1. Получаем access token
    TOKEN=$(curl -s -k -X POST 'https://maclic.miko.ru:8445/pbxcore/api/v3/auth:login' \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "login=admin&password=123456789MikoPBX%231&rememberMe=true" \
        -c cookies.txt | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")

    echo "Access Token: ${TOKEN:0:30}..."

    # 2. Используем token для запроса к ресурсу
    curl -s -k -X GET 'https://maclic.miko.ru:8445/pbxcore/api/v3/extensions' \
        -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

    # 3. Refresh token (автоматически из cookie)
    NEW_TOKEN=$(curl -s -k -X POST 'https://maclic.miko.ru:8445/pbxcore/api/v3/auth:refresh' \
        -b cookies.txt -c cookies.txt | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")

    echo "New Token: ${NEW_TOKEN:0:30}..."

    # 4. Logout
    curl -s -k -X POST 'https://maclic.miko.ru:8445/pbxcore/api/v3/auth:logout' \
        -H "Authorization: Bearer $TOKEN" \
        -b cookies.txt | python3 -m json.tool

    Или в одну строку для быстрого теста:
    curl -s -k -X GET 'https://maclic.miko.ru:8445/pbxcore/api/v3/extensions' \
        -H "Authorization: Bearer $(curl -s -k -X POST 'https://maclic.miko.ru:8445/pbxcore/api/v3/auth:login' \
        -d 'login=admin&password=123456789MikoPBX%231' | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["accessToken"])')" \
        | python3 -m json.tool | head -50
   ```

2. **API Keys** (no expiration) - `/admin-cabinet/api-keys/`
   ```bash
   curl -H "Authorization: Bearer miko_ak_1234567890abcdef..." \
        http://127.0.0.1:8081/pbxcore/api/v3/extensions
   ```


3. **Localhost** - Always allowed (127.0.0.1)

4. **Public Endpoints** - No auth required:
   - `/pbxcore/api/health`
   - `/pbxcore/api/v3/auth:login`
   - `/pbxcore/api/v3/auth:refresh`
   - `/pbxcore/api/v3/auth:logout` (public but requires token for deletion)
   - `/pbxcore/api/v3/passkeys:*`

**Security Features**:
- httpOnly cookies prevent XSS attacks
- Secure flag ensures HTTPS-only transmission
- SameSite=Strict prevents CSRF attacks
- Token rotation on refresh prevents replay attacks
- Device tracking (IP + User-Agent)
- Rate limiting on failed login attempts
- Automatic cleanup of expired tokens (Redis TTL)

## Common Patterns

### CRUD with Abstract Classes

```php
// List
class GetListAction extends AbstractGetListAction {
    public static function main(array $data = []): PBXApiResult {
        return self::executeStandardList($data, Model::class, DataStructure::class,
            ['name'], ['name'], 'name ASC');
    }
}

// Get
class GetRecordAction extends AbstractGetRecordAction {
    public static function main(string $id): PBXApiResult {
        return self::executeStandardGet($id, Model::class, DataStructure::class);
    }
}

// Create
class CreateRecordAction extends AbstractCreateAction {
    public static function main(array $data): PBXApiResult {
        return self::executeStandardCreate($data, Model::class, DataStructure::class);
    }
}
```

### N+1 Prevention

Pre-load related data in one query:

```php
$queues = CallQueues::find($queryOptions);
$queueIds = array_column($queues->toArray(), 'uniqid');

// Load all members at once
$allMembers = CallQueueMembers::find([
    'conditions' => 'queue IN ({ids:array})',
    'bind' => ['ids' => $queueIds]
]);

// Group by queue
foreach ($allMembers as $member) {
    $membersByQueue[$member->queue][] = $member;
}
```

### File Downloads

```php
$res->data = [
    'fpassthru' => [
        'filename' => $filePath,
        'content_type' => 'application/octet-stream',
        'download_name' => basename($filePath),
        'need_delete' => false
    ]
];
```

### Error Handling

```php
try {
    // Business logic
    $res->success = true;
} catch (ValidationException $e) {
    $res->messages['error'][] = $e->getMessage();
    $res->httpCode = 422;  // Unprocessable Entity
} catch (ConflictException $e) {
    $res->httpCode = 409;  // Conflict
} catch (\Exception $e) {
    $res->httpCode = 500;
    CriticalErrorsHandler::handleExceptionWithSyslog($e);
}
```

## HTTP Status Codes

```php
200 => 'OK'                     // GET, PUT, PATCH, DELETE success
201 => 'Created'                // POST success
400 => 'Bad Request'            // Invalid format
401 => 'Unauthorized'           // No/invalid auth
403 => 'Forbidden'              // No permission
404 => 'Not Found'              // Resource missing
409 => 'Conflict'               // Duplicate/constraint
422 => 'Unprocessable Entity'   // Validation error
500 => 'Internal Server Error'  // Unexpected error
```

## Testing

### JSON Parsing Utilities

The MikoPBX container doesn't include `jq` by default. Use these alternatives:

**Python (recommended):**
```bash
# Pretty print JSON
curl ... | python3 -m json.tool

# Extract specific field
TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")
```

**PHP:**
```bash
TOKEN=$(echo "$RESPONSE" | php -r '$json = json_decode(stream_get_contents(STDIN), true); echo $json["data"]["accessToken"];')
```

**grep/cut (simple extraction):**
```bash
TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
```

### Manual Testing with curl

```bash
# Step 1: Login and save tokens
RESPONSE=$(curl -s -X POST http://127.0.0.1:8081/pbxcore/api/v3/auth:login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "login=admin&password=123456789MikoPBX#1&rememberMe=true" \
  -c cookies.txt)

# Extract access token
TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")
echo "Access Token: $TOKEN"

# Step 2: Use token for API calls
# GET list with search and pagination
curl -X GET "http://127.0.0.1:8081/pbxcore/api/v3/call-queues?search=support&limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# GET single record
curl -X GET "http://127.0.0.1:8081/pbxcore/api/v3/call-queues/QUEUE-CF423A55" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# POST create new record
curl -X POST "http://127.0.0.1:8081/pbxcore/api/v3/call-queues" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test Queue",
    "extension":"2200777",
    "strategy":"ringall",
    "timeout":300,
    "enabled":true
  }' | python3 -m json.tool

# PUT full update (replaces all fields)
curl -X PUT "http://127.0.0.1:8081/pbxcore/api/v3/call-queues/QUEUE-CF423A55" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Updated Queue",
    "extension":"2200777",
    "strategy":"random"
  }' | python3 -m json.tool

# PATCH partial update (only specified fields)
curl -X PATCH "http://127.0.0.1:8081/pbxcore/api/v3/call-queues/QUEUE-CF423A55" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"strategy":"random","enabled":false}' | python3 -m json.tool

# DELETE record
curl -X DELETE "http://127.0.0.1:8081/pbxcore/api/v3/call-queues/QUEUE-CF423A55" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Custom collection-level method
curl -X GET "http://127.0.0.1:8081/pbxcore/api/v3/call-queues:getDefault" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Custom resource-level method
curl -X POST "http://127.0.0.1:8081/pbxcore/api/v3/call-queues/QUEUE-CF423A55:copy" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newExtension":"2200888"}' | python3 -m json.tool

# Step 3: Refresh token when access token expires
NEW_TOKEN=$(curl -s -X POST http://127.0.0.1:8081/pbxcore/api/v3/auth:refresh \
  -b cookies.txt -c cookies.txt | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")
echo "New Access Token: $NEW_TOKEN"

# Step 4: Logout
curl -X POST "http://127.0.0.1:8081/pbxcore/api/v3/auth:logout" \
  -H "Authorization: Bearer $TOKEN" \
  -b cookies.txt | python3 -m json.tool
```

### Automated Testing Script

**Reference:** `test-jwt-auth.sh` in project root

Complete bash script for testing JWT authentication flow:
- Login with username/password
- Access protected endpoints with JWT token
- Refresh token mechanism
- Token rotation verification
- Logout and token invalidation

Run with:
```bash
PBX_HOST=localhost PBX_PORT=8081 PBX_PASSWORD='123456789MikoPBX#1' ./test-jwt-auth.sh
```

### Testing Checklist

✅ **Authentication:**
- [ ] Login returns 200 with accessToken and refreshToken cookie
- [ ] Access token works in Authorization header
- [ ] Refresh token rotates on each refresh
- [ ] Logout deletes refresh token from Redis
- [ ] Old access token still works after logout (until expiry)

✅ **CRUD Operations:**
- [ ] GET list returns paginated results
- [ ] GET list search/filter works
- [ ] GET record by ID returns single item
- [ ] POST create returns 201 with new ID
- [ ] PUT update returns 200
- [ ] PATCH partial update returns 200
- [ ] DELETE returns 200

✅ **Validation:**
- [ ] Invalid data returns 422 with error messages
- [ ] Missing required fields returns 422
- [ ] Duplicate unique fields returns 409
- [ ] Invalid ID format returns 404

✅ **Security:**
- [ ] Unauthorized requests return 401
- [ ] Forbidden actions return 403
- [ ] CSRF protection enabled for session auth
- [ ] Rate limiting on login attempts

## Module API Extension

**Reference:** Module implementation in module's config class

```php
class ModuleConf extends ConfigClass implements RestAPIConfigInterface
{
    public function moduleRestAPICallback(array $request): void
    {
        $action = $request['action'];
        $processor = match ($action) {
            'getRoles' => GetRolesProcessor::class,
            default => null
        };

        if ($processor === null) {
            ProcessorClass::responseError('Unknown action', 400);
            return;
        }

        ProcessorClass::responseSuccess($processor::process($request['data']));
    }

    public function needAuthentication(string $action): bool
    {
        return !in_array($action, ['webhook', 'provision']);
    }
}
```

**Routes:** `/pbxcore/api/modules/{moduleName}/{actionName}`

## Best Practices

### Code Organization
- One Action = One Class with single `main()` method
- Use Abstract Classes for standard CRUD
- Use Enums + Match for type-safe dispatching
- Early returns for validation

### API Design
- Follow REST principles and HTTP methods
- Use Google API Design Guide for custom methods
- Always version APIs: `/api/v3/`
- Implement pagination for lists

### Data Handling
- Never return raw models - use DataStructure
- Define OpenAPI schemas for type conversion
- Include representation fields for dropdowns
- Use uniqid for v3 API IDs

### Security
- Prefer JWT for sessions, API Keys for integrations
- Sanitize in controller, validate in action
- Use parameterized queries (never string concatenation)
- CSRF protection enabled by default

### Performance
- Pre-load related data (avoid N+1)
- Implement pagination
- Use database indexes on search/sort fields
- Use async for operations >30s

## ABSOLUTE RULES

- **NO PARTIAL IMPLEMENTATION** - Complete all features
- **NO CODE DUPLICATION** - Reuse existing functions
- **NO DEAD CODE** - Delete unused code
- **IMPLEMENT TESTS** - Every action needs tests
- **NO INCONSISTENT NAMING** - Follow patterns
- **NO MIXED CONCERNS** - Separation of responsibilities
- **RESTART CONTAINER** - After backend changes
- **USE ENUMS** - For type-safe dispatching
- **MATCH EXPRESSIONS** - Not switch
- **PHP 8 ATTRIBUTES** - For all v3 endpoints
- **OPENAPI SCHEMAS** - Define in DataStructure
- **FOLLOW GOOGLE API DESIGN** - For custom methods

## Reference Files

**Study these implementations:**
- Controller: `src/PBXCoreREST/Controllers/CallQueues/RestController.php`
- Processor: `src/PBXCoreREST/Lib/CallQueuesManagementProcessor.php`
- Action: `src/PBXCoreREST/Lib/CallQueues/GetListAction.php`
- DataStructure: `src/PBXCoreREST/Lib/CallQueues/DataStructure.php`
- Base: `src/PBXCoreREST/Controllers/BaseRestController.php`
- Router: `src/PBXCoreREST/Providers/RouterProvider.php`
- Middleware: `src/PBXCoreREST/Middleware/AuthenticationMiddleware.php`

## External Resources

- [Google API Design Guide](https://cloud.google.com/apis/design)
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [RESTful API Design](https://restfulapi.net/)
- [HTTP Status Codes](https://httpstatuses.com/)
