# CLAUDE.md - Common Providers

Service providers that register services in the Phalcon DI container. All providers implement `ServiceProviderInterface` and define a `SERVICE_NAME` constant.

## File Inventory (33 providers)

```
Providers/
├── AclProvider.php                        # Access control lists (ACL)
├── AmiConnectionCommand.php               # AMI command sender
├── AmiConnectionListener.php              # AMI event listener
├── BeanstalkConnectionModelsProvider.php   # Beanstalk queue connection
├── CDRDatabaseProvider.php                # CDR SQLite database
├── ConfigProvider.php                     # Application configuration loader
├── CryptProvider.php                      # Cookie/session encryption
├── DatabaseProviderBase.php               # Abstract base for DB providers
├── EventBusProvider.php                   # Nginx nchan pub/sub events
├── JwtProvider.php                        # JWT token validation
├── LanguageProvider.php                   # Context-aware language detection
├── LoggerAuthProvider.php                 # Authentication audit logger
├── LoggerProvider.php                     # Main system logger (syslog)
├── MainDatabaseProvider.php               # Main SQLite database
├── ManagedCacheProvider.php               # Redis cache (DB4)
├── MarketPlaceProvider.php                # License/marketplace
├── MessagesProvider.php                   # Translation message arrays
├── ModelsAnnotationsProvider.php          # Phalcon annotations reader
├── ModelsMetadataProvider.php             # Model metadata (Redis DB2)
├── ModulesDBConnectionsProvider.php       # Dynamic per-module DB connections
├── MutexProvider.php                      # Redis distributed locking
├── NatsConnectionProvider.php             # NATS message broker
├── PBXConfModulesProvider.php             # Module hooks and configuration
├── PBXCoreRESTClientProvider.php          # Internal HTTP client (Guzzle)
├── RecordingStorageDatabaseProvider.php   # Recording metadata SQLite DB
├── RedisClientProvider.php                # Redis client (DB1)
├── RegistryProvider.php                   # Global state registry
├── RouterProvider.php                     # URL routing
├── SentryErrorHandlerProvider.php         # Sentry error tracking
├── SessionProvider.php                    # Sessions (DEPRECATED → JWT)
├── TranslationProvider.php                # i18n translation factory
├── UrlProvider.php                        # URL generation
└── WhoopsErrorHandlerProvider.php         # Pretty error pages + JSON
```

## Provider Reference

| Provider | Service Name | Shared | Backend | Notes |
|----------|-------------|--------|---------|-------|
| AclProvider | `ACL` | Yes | Memory+Cache | 24h TTL, module hooks |
| AmiConnectionCommand | `amiCommander` | Yes | TCP/5038 | Non-blocking AMI |
| AmiConnectionListener | `amiListener` | Yes | TCP/5038 | Event listener AMI |
| BeanstalkConnectionModelsProvider | `beanstalkConnectionModels` | Yes | Beanstalk | Queue connection |
| CDRDatabaseProvider | `dbCDR` | Yes | SQLite | cdr.db, separate for perf |
| ConfigProvider | `config` | Yes | JSON files | mikopbx-settings.json |
| CryptProvider | `crypt` | Yes | DB key | Cookie encryption |
| EventBusProvider | `eventBus` | Yes | Nginx nchan | WebSocket pub/sub |
| JwtProvider | `jwt` | Yes | Memory | HMAC-SHA256, 10min leeway |
| LanguageProvider | `language` | Yes | DB/DI | Context-aware (CLI vs Web) |
| LoggerAuthProvider | `loggerAuth` | Yes | Syslog AUTH | Auth audit trail |
| LoggerProvider | `logger` | Yes | Syslog | UDP 127.0.0.1:514 |
| MainDatabaseProvider | `db` | Yes | SQLite | mikopbx.db |
| ManagedCacheProvider | `managedCache` | No | Redis DB4 | 1h TTL |
| MarketPlaceProvider | `license` | Yes | License class | Module marketplace |
| MessagesProvider | `messages` | Yes | Files/Cache | 29 languages |
| ModelsAnnotationsProvider | `annotations` | Yes | Memory | Model annotations |
| ModelsMetadataProvider | `modelsMetadata` | Yes | Redis DB2 | 10min TTL, annotations strategy |
| ModulesDBConnectionsProvider | (dynamic) | (dynamic) | SQLite per module | `{moduleId}_module_db` |
| MutexProvider | `mutex` | No | Redis | Distributed locking |
| NatsConnectionProvider | `natsConnection` | Yes | NATS | Async messaging |
| PBXConfModulesProvider | `pbxConfModules` | Yes | DB | Module hooks + priority |
| PBXCoreRESTClientProvider | `restAPIClient` | No | HTTP | GuzzleHttp, 30s timeout |
| RecordingStorageDatabaseProvider | `dbRecordingStorage` | Yes | SQLite | recording_storage.db |
| RedisClientProvider | `redis` | No | Redis DB1 | Worker IPC |
| RegistryProvider | `registry` | Yes | Memory | Global state |
| RouterProvider | `router` | No | Config | Module route integration |
| SentryErrorHandlerProvider | `sentryErrorHandler` | No | Sentry API | Production error tracking |
| SessionProvider | `session` | Yes | Redis DB5 | DEPRECATED (use JWT) |
| TranslationProvider | `translation` | Yes | Messages | Phalcon factory |
| UrlProvider | `url` | Yes | Config | Base URI |
| WhoopsErrorHandlerProvider | `whoopsErrorHandler` | No | Output | Pretty errors + JSON |

## Key Provider Details

### CryptProvider (NEW)
Cookie and session encryption using `Phalcon\Encryption\Crypt`. Key from `PbxSettings.WWW_ENCRYPTION_KEY`, auto-generated with `Random::base64Safe(16)` if missing.

### JwtProvider (NEW)
JWT token validation with HMAC-SHA256. 600-second leeway for clock skew.

```php
// Methods
validate(string $token): ?array
extractRoleFromHeader(?string $header): ?string
extractRoleFromRefreshToken(string $token): ?string
extractUserIdFromRefreshToken(string $token): ?string
extractHomePageFromRefreshToken(string $token): ?string
```

Secret key: `PbxSettings.SSH_RSA_KEY` (primary), `PbxSettings.WEB_ADMIN_PASSWORD` (fallback). Refresh tokens stored in Redis via `RedisTokenStorage`.

### RecordingStorageDatabaseProvider (NEW)
Separate SQLite database at `/storage/usbdisk1/mikopbx/astlogs/asterisk/recording_storage.db` for tracking recording file locations (local vs S3). Reduces main DB size.

### MutexProvider (Redis-based locking)
Full distributed mutex implementation (not a placeholder):

```php
// Execute callback with mutex protection
$mutex->synchronized('config-gen', function() {
    // critical section
}, timeout: 10, ttl: 30);

// Non-blocking lock attempt
$mutex->tryLock('name', ttl: 30): bool
$mutex->isLocked('name'): bool
$mutex->getTTL('name'): int
```

Uses Redis `SET NX EX` with atomic Lua script release. Key prefix: `mutex:`. Lock token: 16-byte random hex.

### SessionProvider (DEPRECATED)
Redis backend (DB5), 3600s lifetime. Replaced by JWT-based authentication via `JwtProvider` and `AuthenticationMiddleware`.

### LanguageProvider (Context-aware)
Returns language code based on execution context:

- **CLI (EventBus workers)**: `PbxSettings.WEB_ADMIN_LANGUAGE`
- **CLI (other)**: `PbxSettings.SSH_LANGUAGE`
- **Web (authenticated)**: JWT token `language` claim
- **Web (fallback)**: `PbxSettings.WEB_ADMIN_LANGUAGE`

Defines `AVAILABLE_LANGUAGES` constant with 29 languages including name, flag class, and translation key.

### LoggerProvider
Uses **Phalcon\Logger** with **Syslog adapter** (not Monolog). Ident: `php.backend`/`php.frontend`. Facility: `LOG_DAEMON`. Environment-aware: suppresses console output during boot.

### ModelsMetadataProvider
Backend: **Redis** (DB2), not Memory/Files. Adapter: `Phalcon\Mvc\Model\MetaData\Redis`. Strategy: `Annotations`. TTL: 600s.

### MessagesProvider
Loads translation arrays from multiple sources:
1. English from `/src/Common/Messages/en/*.php`
2. Language-specific from `/src/Common/Messages/{lang}/*.php`
3. Module translations: `{moduleDir}/Messages/{lang}/*.php` or `{moduleDir}/Messages/{lang}.php`
4. Language metadata from `LanguageProvider::AVAILABLE_LANGUAGES`

Cached via ManagedCache with key `LocalisationArray:{version_hash}:{language}`.

### DatabaseProviderBase
Abstract base for all database providers. SQLite PRAGMA settings:
- `busy_timeout = 5000` (5s wait on lock)
- `journal_mode = WAL` (Write-Ahead Logging)
- `synchronous = NORMAL`
- `cache_size = -10000` (10MB)
- `temp_store = MEMORY`

### EventBusProvider
Publishes events via HTTP POST to `/pbxcore/api/nchan/pub/event-bus`. Uses `PBXCoreRESTClientProvider` internally. HTTP 201 on success.

```php
$eventBus->publish('models-changed', ['model' => 'Extensions', 'recordId' => '123']);
```

### PBXCoreRESTClientProvider
GuzzleHttp client for internal REST API. Base URI: `http://localhost:{WEB_PORT}`. Supports GET, POST, PUT, PATCH, DELETE. Returns `PBXApiResult`.

### PBXConfModulesProvider
Module hook system. Loads enabled modules, instantiates config classes, sorts by priority.

```php
PBXConfModulesProvider::hookModulesMethod('extensionGenInternal');
PBXConfModulesProvider::getVersionsHash();  // MD5 of PBX + module versions
```

## Usage

```php
use MikoPBX\Common\Providers\LoggerProvider;

// Always use SERVICE_NAME constant
$logger = $di->getShared(LoggerProvider::SERVICE_NAME);

// Non-shared services return new instances
$mutex = $di->get(MutexProvider::SERVICE_NAME);
```

## Redis Database Allocation

| DB | Service | Purpose |
|----|---------|---------|
| 1 | redis | Worker IPC, general |
| 2 | modelsMetadata | Model schema cache |
| 4 | managedCache | Application cache |
| 5 | session | Sessions (deprecated) |

## Adding New Providers

```php
namespace MikoPBX\Common\Providers;

use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

class MyProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'myService';

    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($di) {
                $config = $di->getShared(ConfigProvider::SERVICE_NAME);
                return new MyService($config->myService->toArray());
            }
        );
    }
}
```
