# CLAUDE.md - MikoPBX REST API

REST API v3 with PHP 8.3 attributes, async Redis queue processing, and OpenAPI auto-generation.

## Directory Structure

```
PBXCoreREST/
├── Controllers/                     # Resource controllers + 2 base classes
│   ├── BaseController.php           # Request/response handling, worker queueing
│   ├── BaseRestController.php       # CRUD/Custom method routing
│   └── {Resource}/RestController.php # One per resource (Advice, ApiKeys, Auth,
│                                    #   CallQueues, Cdr, Extensions, Firewall,
│                                    #   Modules, Network, Sip, SipProviders, Iax,
│                                    #   IaxProviders, OffWorkTimes, Storage, System, …)
│                                    #   Some resource dirs add extra controllers:
│                                    #   Modules/ModulesControllerBase.php,
│                                    #   MailSettings/OAuth2CallbackController.php
│
├── Lib/                             # Action/processor implementations per resource
│   ├── Common/                      # Abstract/utility base classes:
│   │   #  Abstract{SaveRecord(7-phase create/update/patch),GetList(paginate/filter),
│   │   #    GetRecord,Create,Update,Patch,Delete,ChangePriority,CopyRecord,
│   │   #    GetForSelect,DataStructure}Action.php
│   │   #  CommonDataStructure (shared pagination/sorting fields)
│   │   #  BaseActionHelper (sanitize/validate/transactions)
│   │   #  SchemaValidator, SchemaFormatter, TextFieldProcessor (HTML escaping),
│   │   #  SystemSanitizer, CodeSecurityValidator (dangerous content),
│   │   #  AvatarHelper, SearchIndexTrait (full-text index),
│   │   #  OpenApiSchemaProvider (schema from attributes)
│   │
│   ├── {Resource}/                  # Per-resource subdir: DataStructure + Action classes
│   │   ├── DataStructure.php        # Parameter definitions (single source of truth)
│   │   ├── SaveRecordAction.php     # Create/Update/Patch logic
│   │   └── GetListAction.php / GetRecordAction.php / DeleteAction.php
│   │   #  Extra resource subdirs: CdrDB, Waf (note naming split — the
│   │   #  OffWorkTimes controller maps to Lib/OutWorkTimes)
│   │
│   ├── {Resource}ManagementProcessor.php  # FLAT at Lib/ top-level (NOT inside the
│   │                                #   subdir): enum-based action routing. ~45 of
│   │                                #   them (also *Processor.php variants, e.g.
│   │                                #   SIPStackProcessor, SearchProcessor)
│   ├── ResponseSchemaValidator.php  # Response schema validation (flat in Lib/)
│   ├── PBXApiResult.php             # API result container
│   └── PerformanceMetrics.php       # Performance tracking
│
├── Attributes/                      # PHP 8.3 attributes for OpenAPI + RBAC:
│   #  ApiResource (path/tags/security), HttpMapping (method→operation),
│   #  ResourceSecurity (Resource:Action RBAC), ApiOperation, ApiParameterRef
│   #  (ref to DataStructure param), ApiDataSchema, ApiResponse
│   #  enums: ActionType (READ/WRITE/ADMIN/SENSITIVE),
│   #         SecurityType (LOCALHOST/BEARER_TOKEN/PUBLIC),
│   #         ParameterLocation (query/path/header/body)
│
├── Http/                           # Request.php, Response.php (extended Phalcon),
│                                   #   ForwardedHeaderFilter.php (see below)
├── Middleware/                     # BaseMiddleware, AuthenticationMiddleware
│                                   #   (JWT + API Key + ACL), UnifiedSecurityMiddleware
│                                   #   (security headers), ResponseMiddleware (JSON)
├── Services/                       # SecurityResolver, TokenValidationService,
│                                   #   PublicEndpointsRegistry, ApiMetadataRegistry,
│                                   #   ApiKeyPermissionChecker
├── Providers/                      # Request/Response/Dispatcher providers,
│                                   #   RouterProvider (route auto-discovery from
│                                   #   attributes), PublicEndpointsRegistryProvider
├── Workers/                        # WorkerApiCommands (main, Redis, maxProc=3),
│                                   #   WorkerBulkEmployees, WorkerCurrentPageEvents,
│                                   #   WorkerDownloader, WorkerLongPoolAPI,
│                                   #   WorkerMakeLogFilesArchive, WorkerMergeUploadedFile,
│                                   #   WorkerModuleInstaller
├── Traits/ResponseTrait.php
└── Config/RegisterDIServices.php   # DI container configuration
```

## Request Flow

```
HTTP Request → RouterProvider (auto-discovery from attributes)
  → AuthenticationMiddleware (public check → localhost → JWT/API Key → ACL)
    → BaseRestController (CRUD or custom method routing)
      → BaseController.sendRequestToBackendWorker()
        → Queue length check (lLen > API_QUEUE_MAX_LENGTH → HTTP 503)
        → Redis queue (api:requests) with created_at timestamp
          → WorkerApiCommands (3 parallel processes)
            → Stale request check (age > API_REQUEST_TTL → drop)
            → ManagementProcessor (enum-based routing)
              → Action class (7-phase SaveRecord pattern)
                → PBXApiResult
              → Redis response (api:response:{request_id}, TTL=120s)
            → Smart polling: 10ms → 50ms → 100ms → 250ms
          → ResponseMiddleware → HTTP Response
```

## Queue Backpressure Protection

Prevents system deadlock when the API queue grows uncontrollably (e.g. thundering herd from modules/polling).

- **Fast-fail (Mechanism A)**: BaseController checks queue length before `rpush`. If > `API_QUEUE_MAX_LENGTH` (default 50), returns HTTP 503 immediately — php-fpm worker freed instantly instead of blocking 30s.
- **Stale request drop (Mechanism B)**: WorkerApiCommands checks `created_at` age before processing. Requests older than `API_REQUEST_TTL` (default 35s) are dropped — client already timed out.
- **Frontend retry**: `PbxApiClient.callApi()` retries 503 with exponential backoff (3 attempts: 1s/2s/4s).
- **Response TTL**: 120s (orphaned response keys cleaned up faster).
- **Configuration**: Thresholds via PbxSettings (`API_QUEUE_MAX_LENGTH`, `API_REQUEST_TTL`).
- **Bypasses**: Debug and async requests skip the TTL check. Legacy requests without `created_at` are processed normally.

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
enum CallQueueAction: string {
    case GET_LIST = 'getList';
    case CREATE = 'create';
    case UPDATE = 'update';
    case DELETE = 'delete';
    // ...
}

class CallQueuesManagementProcessor extends Injectable {
    public static function callBack(array $request): PBXApiResult {
        $action = CallQueueAction::tryFrom($request['action']);
        return match($action) {
            CallQueueAction::GET_LIST => GetListAction::main($request['data']),
            // ...
        };
    }
}
```

## Authentication

- **Public endpoints**: Detected via `#[ResourceSecurity]` attribute or module routes.
- **Localhost**: 127.0.0.1/::1 bypass authentication.
- **JWT**: Bearer token with HMAC-SHA256, 15-min access + 30-day refresh.
- **API Keys**: 64-char hex tokens, bcrypt hashed, optional path restrictions.
- **ACL**: Resource:Action RBAC after authentication.

## Forwarded HTTP Headers (worker envelope)

Worker actions run in a separate process and cannot reach Phalcon's `Request`. `BaseController::prepareRequestMessage()` pre-extracts a **filtered** subset of incoming HTTP headers into the message envelope under `httpHeaders` (lowercased keys, single string values). Policy lives in `src/PBXCoreREST/Http/ForwardedHeaderFilter.php`:

* **Deny-list (final word)** — `Authorization`, `Cookie`, `Set-Cookie`, `Proxy-Authorization`, and the `Authentication-*` family are stripped unconditionally. They must never reach an action, even by accident.
* **Allow-list** — public-safe proxy/client metadata (`X-Forwarded-*`, `X-Real-IP`, `User-Agent`, `Referer`, `Origin`, `Host`, `Accept-Language`).
* **Allow-prefixes** — reserved namespaces: `X-Mikopbx-*` (core features: debug toggles, async hints, …) and `X-Module-*` (extension modules, per-module conventions).

Each header value is capped at `ForwardedHeaderFilter::MAX_VALUE_LENGTH` (1024 bytes) to bound the queue payload. Array-typed values from Phalcon are joined with `, ` per RFC 7230 §3.2.2.

### Reading headers in an action

```php
public static function main(array $data, array $httpHeaders = []): PBXApiResult
{
    $ua  = $httpHeaders['user-agent'] ?? '';
    $xff = $httpHeaders['x-forwarded-for'] ?? '';  // already first-hop-able by caller
    // ...
}
```

The processor must explicitly forward both bags from the request envelope:

```php
SystemAction::CHECK_CLIENT_IP_VISIBILITY => CheckClientIpVisibilityAction::main(
    $request['sessionContext'] ?? [],
    $request['httpHeaders']    ?? []
),
```

### Adding a new module header

Pick a name under `X-Module-<YourModule>-` — no edits to `BaseController` or `ForwardedHeaderFilter` required; the allow-prefix list already lets it through. Document the header's contract in your module's `CLAUDE.md`.

## Session Context (worker envelope)

Alongside `httpHeaders`, `BaseController::prepareRequestMessage()` populates a `sessionContext` envelope key whenever the request carries a Bearer token (JWT or API Key). Workers receive it under `$request['sessionContext']`; localhost/public-endpoint requests arrive with the key absent (treat as `[]`).

Populated fields:

* `auth_type`     — currently always `bearer_token`
* `token_id`      — `m_ApiKeys.id` of the row that validated the request
* `origin`        — `scheme://host` of the inbound request (WebAuthn RP)
* `remote_addr`   — client IP after the proxy-aware resolution chain
* `user_name`     — JWT `userId` (absent for raw API-Key callers)
* `role`          — JWT role claim (absent for raw API-Key callers)
* `session_id`    — JWT `userId`, reused as the WebAuthn challenge slot

Processors that consume any of these MUST forward the bag explicitly to their action — actions are not Injectable across the queue boundary. The pattern is identical to `httpHeaders`:

```php
FirewallBouncerAction::EXPORT_DECISIONS => ExportDecisionsAction::main(
    $request['sessionContext'] ?? [],
    $request['data']           ?? []
),
```

### Per-token state via `token_id`

`token_id` is the canonical key for per-bouncer/per-client state that must survive across queue invocations. Current consumers:

* **WebAuthn challenge storage** — Passkeys actions key challenges by `session_id` (JWT userId) plus `origin`.
* **Firewall-bouncer snapshot cursor** — `ExportDecisionsAction` stores the previous snapshot at `_PH_REDIS_CLIENT:fwbouncer:cursor:<token_id>` (TTL 1 h, refreshed every poll, falls back to `…:anon` when `token_id` is missing) so the next poll can emit `deleted[]` decisions within one cycle instead of waiting for natural TTL decay. See `Lib/FirewallBouncer/ExportDecisionsAction.php` (`CURSOR_KEY_PREFIX`, `CURSOR_TTL`) for cursor semantics and the `?startup=true` reset.
* **CDR ACL filtering** — `CdrManagementProcessor` forwards `sessionContext` so `GetListAction` can scope rows by `role`.

Redis exceptions in cursor-style helpers should be caught and degraded to first-poll behaviour (logged via `SystemMessages::sysLogMsg`) — mirrors `DockerNetworkFilterService::getRedisBouncerDecisions()`.

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

## Unit Tests

PBXCoreREST unit tests live under `tests/Unit/PBXCoreREST` (Services, Http, Lib).
`tests/Unit/phpunit.xml` defines no `<testsuites>`, so pass the path explicitly:

```bash
# whole PBXCoreREST unit slice
vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/PBXCoreREST

# one file
vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/PBXCoreREST/Http/ForwardedHeaderFilterTest.php
```

Run inside the PHP container so the `vendor/` autoloader matches production. Older
integration-style tests also live under `tests/PBXCoreREST` (Middleware, Workers,
Lib/Waf). See `tests/Unit/CLAUDE.md` for the full unit-test workflow.

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
</content>
</invoke>
