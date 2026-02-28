# CLAUDE.md - MikoPBX REST API

REST API v3 with PHP 8.3 attributes, async Redis queue processing, and OpenAPI auto-generation.

## Directory Structure

```
PBXCoreREST/
├── Controllers/                     # 43 resource controllers + 2 base classes
│   ├── BaseController.php           # Request/response handling, worker queueing
│   ├── BaseRestController.php       # CRUD/Custom method routing
│   ├── Advice/RestController.php
│   ├── ApiKeys/RestController.php
│   ├── AsteriskManagers/RestController.php
│   ├── AsteriskRestUsers/RestController.php
│   ├── Auth/RestController.php
│   ├── CallQueues/RestController.php
│   ├── Cdr/RestController.php
│   ├── ConferenceRooms/RestController.php
│   ├── CustomFiles/RestController.php
│   ├── DialplanApplications/RestController.php
│   ├── Employees/RestController.php
│   ├── Extensions/RestController.php
│   ├── Fail2Ban/RestController.php
│   ├── Files/RestController.php
│   ├── Firewall/RestController.php
│   ├── GeneralSettings/RestController.php
│   ├── Iax/RestController.php
│   ├── IaxProviders/RestController.php
│   ├── IncomingRoutes/RestController.php
│   ├── IvrMenu/RestController.php
│   ├── License/RestController.php
│   ├── MailSettings/RestController.php
│   ├── MailSettings/OAuth2CallbackController.php
│   ├── Modules/RestController.php
│   ├── Modules/ModulesControllerBase.php
│   ├── Network/RestController.php
│   ├── NetworkFilters/RestController.php
│   ├── OffWorkTimes/RestController.php
│   ├── OpenAPI/RestController.php
│   ├── OutboundRoutes/RestController.php
│   ├── Passkeys/RestController.php
│   ├── Passwords/RestController.php
│   ├── PbxStatus/RestController.php
│   ├── Providers/RestController.php
│   ├── S3Storage/RestController.php
│   ├── Search/RestController.php
│   ├── Sip/RestController.php
│   ├── SipProviders/RestController.php
│   ├── SoundFiles/RestController.php
│   ├── Storage/RestController.php
│   ├── Sysinfo/RestController.php
│   ├── Syslog/RestController.php
│   ├── System/RestController.php
│   ├── TimeSettings/RestController.php
│   ├── UserPageTracker/RestController.php
│   ├── Users/RestController.php
│   └── WikiLinks/RestController.php
│
├── Lib/                             # 488 PHP files across 46 subdirectories
│   ├── Common/                      # 21 abstract/utility classes
│   │   ├── AbstractSaveRecordAction.php     # Base create/update/patch (7-phase)
│   │   ├── AbstractGetListAction.php        # List with pagination/filtering
│   │   ├── AbstractGetRecordAction.php      # Get single record by ID
│   │   ├── AbstractCreateAction.php         # POST create
│   │   ├── AbstractUpdateAction.php         # PUT full update
│   │   ├── AbstractPatchAction.php          # PATCH partial update
│   │   ├── AbstractDeleteAction.php         # DELETE
│   │   ├── AbstractChangePriorityAction.php # Priority reordering
│   │   ├── AbstractCopyRecordAction.php     # Record duplication
│   │   ├── AbstractGetForSelectAction.php   # Dropdown select data
│   │   ├── AbstractDataStructure.php        # Parameter definitions & validation
│   │   ├── CommonDataStructure.php          # Shared fields (pagination, sorting)
│   │   ├── BaseActionHelper.php             # Sanitization, validation, transactions
│   │   ├── SchemaValidator.php              # JSON schema validation
│   │   ├── SchemaFormatter.php              # Data normalization
│   │   ├── TextFieldProcessor.php           # Text sanitization, HTML escaping
│   │   ├── SystemSanitizer.php              # System-level input sanitization
│   │   ├── CodeSecurityValidator.php        # Dangerous content validation
│   │   ├── AvatarHelper.php                 # Avatar image handling
│   │   ├── SearchIndexTrait.php             # Full-text search index
│   │   └── OpenApiSchemaProvider.php        # Schema from attributes
│   │
│   ├── {Resource}/                  # Per-resource: DataStructure, Actions, Processor
│   │   ├── DataStructure.php        # Parameter definitions (single source of truth)
│   │   ├── SaveRecordAction.php     # Create/Update/Patch logic
│   │   ├── GetListAction.php        # List records
│   │   ├── GetRecordAction.php      # Get single record
│   │   ├── DeleteAction.php         # Delete record
│   │   └── {Resource}ManagementProcessor.php  # Enum-based action routing
│   │
│   ├── PBXApiResult.php             # API result container
│   └── PerformanceMetrics.php       # Performance tracking
│
├── Attributes/                      # PHP 8.3 attributes for OpenAPI + RBAC
│   ├── ApiResource.php              # Resource metadata (path, tags, security)
│   ├── HttpMapping.php              # HTTP method → operation mapping
│   ├── ResourceSecurity.php         # Resource:Action RBAC
│   ├── ActionType.php               # enum: READ, WRITE, ADMIN, SENSITIVE
│   ├── SecurityType.php             # enum: LOCALHOST, BEARER_TOKEN, PUBLIC
│   ├── ApiOperation.php             # Operation metadata
│   ├── ApiParameterRef.php          # Reference to DataStructure parameter
│   ├── ApiDataSchema.php            # Data schema definition
│   ├── ApiResponse.php              # Response metadata
│   └── ParameterLocation.php        # enum: query, path, header, body
│
├── Http/
│   ├── Request.php                  # Extended Phalcon Request
│   └── Response.php                 # Extended Phalcon Response
│
├── Middleware/
│   ├── BaseMiddleware.php           # Base class with DI
│   ├── AuthenticationMiddleware.php # JWT + API Key auth, ACL authorization
│   ├── UnifiedSecurityMiddleware.php # Security headers
│   └── ResponseMiddleware.php       # JSON response formatting
│
├── Services/
│   ├── SecurityResolver.php         # ActionType + ResourceSecurity extraction
│   ├── TokenValidationService.php   # API Key validation
│   ├── PublicEndpointsRegistry.php  # 2-priority public endpoint detection
│   ├── ApiMetadataRegistry.php      # Controller metadata caching
│   ├── ApiKeyPermissionChecker.php  # API Key permission checking
│   └── ServiceRegistry.php         # Service registration
│
├── Providers/
│   ├── RequestProvider.php
│   ├── ResponseProvider.php
│   ├── DispatcherProvider.php
│   ├── RouterProvider.php           # Universal route auto-discovery from attributes
│   └── PublicEndpointsRegistryProvider.php
│
├── Workers/
│   ├── WorkerApiCommands.php        # Main API processor (Redis, maxProc=3)
│   ├── WorkerBulkEmployees.php      # Bulk employee operations
│   ├── WorkerCurrentPageEvents.php  # Page activity tracking
│   ├── WorkerDownloader.php         # File download processor
│   ├── WorkerLongPoolAPI.php        # Long polling
│   ├── WorkerMakeLogFilesArchive.php # Log archiving
│   ├── WorkerMergeUploadedFile.php  # Multipart file reassembly
│   └── WorkerModuleInstaller.php    # Module installation
│
├── Traits/
│   └── ResponseTrait.php
│
└── Config/
    └── RegisterDIServices.php       # DI container configuration
```

## Request Flow

```
HTTP Request → RouterProvider (auto-discovery from attributes)
  → AuthenticationMiddleware (public check → localhost → JWT/API Key → ACL)
    → BaseRestController (CRUD or custom method routing)
      → BaseController.sendRequestToBackendWorker()
        → Redis queue (api:requests)
          → WorkerApiCommands (3 parallel processes)
            → ManagementProcessor (enum-based routing)
              → Action class (7-phase SaveRecord pattern)
                → PBXApiResult
              → Redis response (api:response:{request_id})
            → Smart polling: 10ms → 50ms → 100ms → 250ms
          → ResponseMiddleware → HTTP Response
```

## DataStructure Pattern (Single Source of Truth)

```php
class DataStructure extends AbstractDataStructure
{
    public static function getParameterDefinitions(): array
    {
        return [
            'request' => [
                'name' => [
                    'type' => 'string',
                    'description' => 'translation_key',
                    'required' => true,
                    'minLength' => 1, 'maxLength' => 64,
                    'sanitize' => 'text',
                    'example' => 'Sales Queue'
                ],
            ],
            'response' => [
                'represent' => ['type' => 'string'],
            ]
        ];
    }

    public static function createFromModel($model): array { ... }
}
```

## 7-Phase SaveRecordAction

```
Phase 1: SANITIZE — DataStructure::getSanitizationRules()
Phase 2: VALIDATE REQUIRED — Fail fast on missing fields
Phase 3: DETERMINE OPERATION — New vs existing record
Phase 4: APPLY DEFAULTS — CREATE only (not update/patch!)
Phase 5: SCHEMA VALIDATION — After defaults applied
Phase 6: SAVE — executeInTransaction(), use isset() for PATCH
Phase 7: RESPONSE — DataStructure::createFromModel(), 201/200
```

## Processor Pattern (Enum-Based)

```php
enum CallQueuesAction: string {
    case GET_LIST = 'getList';
    case CREATE = 'create';
    case UPDATE = 'update';
    case DELETE = 'delete';
    // ...
}

class CallQueuesManagementProcessor extends Injectable {
    public static function callBack(array $request): PBXApiResult {
        $action = CallQueuesAction::tryFrom($request['action']);
        return match($action) {
            CallQueuesAction::GET_LIST => GetListAction::main($request['data']),
            // ...
        };
    }
}
```

## Authentication

- **Public endpoints**: Detected via `#[ResourceSecurity]` attribute or module routes
- **Localhost**: 127.0.0.1/::1 bypass authentication
- **JWT**: Bearer token with HMAC-SHA256, 15-min access + 30-day refresh
- **API Keys**: 64-char hex tokens, bcrypt hashed, optional path restrictions
- **ACL**: Resource:Action RBAC after authentication

## URL Routing

```
GET    /pbxcore/api/v3/{resource}           → getList
GET    /pbxcore/api/v3/{resource}/{id}      → getRecord
POST   /pbxcore/api/v3/{resource}           → create
PUT    /pbxcore/api/v3/{resource}/{id}      → update
PATCH  /pbxcore/api/v3/{resource}/{id}      → patch
DELETE /pbxcore/api/v3/{resource}/{id}      → delete
GET    /pbxcore/api/v3/{resource}:custom    → custom method
POST   /pbxcore/api/v3/{resource}/{id}:copy → custom with ID
```

## PBXApiResult

```php
class PBXApiResult {
    public bool $success = false;
    public array $data = [];
    public array $messages = [];     // ['error' => [...], 'warning' => [...]]
    public ?int $httpCode = null;    // 200, 201, 400, 422, 409, 500
    public ?array $pagination = null;
}
```
