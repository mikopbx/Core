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

### Methods (in priority order):

1. **JWT Bearer Token** (15 min) - `/pbxcore/api/v3/auth:login`
   ```bash
   curl -X POST http://127.0.0.1:8081/pbxcore/api/v3/auth:login \
        -H "Content-Type: application/json" \
        -d '{"login":"admin","password":"your-password"}'
   # Use: -H "Authorization: Bearer eyJ0eXAi..."
   ```

2. **API Keys** (no expiration) - `/admin-cabinet/api-keys/`
   ```bash
   curl -H "Authorization: Bearer miko_ak_1234567890abcdef..."
   ```

3. **Session** - Browser access with CSRF protection

4. **Localhost** - Always allowed (127.0.0.1)

5. **Public Endpoints** - No auth required:
   - `/pbxcore/api/health`
   - `/pbxcore/api/v3/auth:login`
   - `/pbxcore/api/v3/auth:refresh`
   - `/pbxcore/api/v3/passkeys:*`

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

```bash
# Login
TOKEN=$(curl -s -X POST http://127.0.0.1:8081/pbxcore/api/v3/auth:login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"123456789MikoPBX#1"}' | jq -r '.data.accessToken')

# GET list
curl -X GET "http://127.0.0.1:8081/pbxcore/api/v3/call-queues?limit=10" \
  -H "Authorization: Bearer $TOKEN"

# POST create
curl -X POST "http://127.0.0.1:8081/pbxcore/api/v3/call-queues" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Test Queue","extension":"2200777"}'

# PATCH update
curl -X PATCH "http://127.0.0.1:8081/pbxcore/api/v3/call-queues/QUEUE-CF423A55" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"strategy":"random"}'

# Custom method
curl -X GET "http://127.0.0.1:8081/pbxcore/api/v3/call-queues:getDefault" \
  -H "Authorization: Bearer $TOKEN"
```

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
