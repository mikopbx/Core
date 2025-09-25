# Common Providers Guide

This directory contains service providers that register various services in the Phalcon DI container. These providers are essential components of the MikoPBX dependency injection system.

## Overview

All providers in this directory extend from `Phalcon\Di\ServiceProviderInterface` and implement the `register()` method to register services in the DI container. Services are typically registered using:
- `setShared()` - For singleton services (one instance per request)
- `set()` - For new instances on each request

Each provider defines a `SERVICE_NAME` constant that should be used when accessing the service:
```php
use MikoPBX\Common\Providers\LoggerProvider;

// Correct way to access services
$logger = $di->getShared(LoggerProvider::SERVICE_NAME);
```

## Provider List

### AclProvider
- **Service Name**: `acl`
- **Description**: Manages Access Control Lists (ACL) for security permissions
- **Key Dependencies**: None specified
- **Usage**: Controls access permissions for various system resources

### AmiConnectionCommand
- **Service Name**: `amiCommander`
- **Description**: Provides AMI (Asterisk Manager Interface) connection for sending commands
- **Key Dependencies**: `config` service
- **Configuration**: Uses `ami.port` from config, defaults to port 5038
- **Note**: Returns singleton instance for command operations

### AmiConnectionListener
- **Service Name**: `amiListener`
- **Description**: Provides AMI connection for listening to Asterisk events
- **Key Dependencies**: `config` service
- **Configuration**: Uses `ami.port` from config, defaults to port 5038
- **Note**: Separate from command connection to avoid blocking

### BeanstalkConnectionModelsProvider
- **Service Name**: `modelsCache`
- **Description**: Provides Beanstalk queue connection for models caching
- **Key Dependencies**: `config` service
- **Configuration**: Uses `beanstalk.host` and `beanstalk.port` from config
- **Note**: Returns PheanstalkInterface for queue operations

### CDRDatabaseProvider
- **Service Name**: `dbCDR`
- **Description**: Provides SQLite connection for Call Detail Records (CDR) database
- **Key Dependencies**: `config` service
- **Database**: `/storage/usbdisk1/mikopbx/astlogs/asterisk/cdr.db`
- **Note**: Separate database for CDR performance optimization

### ConfigProvider
- **Service Name**: `config`
- **Description**: Loads and manages application configuration
- **Key Dependencies**: None (loads from config files)
- **Configuration**: Merges configs from multiple sources
- **Files**: 
  - `/etc/inc/mikopbx-settings.json`
  - `/etc/inc/mikopbx-AMI-info.json`
  - App config from application directory

### DatabaseProviderBase
- **Type**: Abstract base class
- **Description**: Base class for database providers with common functionality
- **Features**:
  - Connection retry logic (up to 5 attempts)
  - Error logging
  - Transaction management
- **Note**: Extended by MainDatabaseProvider and CDRDatabaseProvider

### EventBusProvider
- **Service Name**: `eventBus`
- **Description**: Real-time event publishing system using nginx nchan module
- **Key Dependencies**: 
  - `restAPIClient` service (PBXCoreRESTClientProvider)
- **Channel**: `event-bus`
- **Features**: 
  - Publishes events through REST API to nginx nchan pub/sub channels
  - Supports WebSocket connections for real-time client updates
  - Used for model change notifications and system advice/alerts
- **Usage**:
  ```php
  use MikoPBX\Common\Providers\EventBusProvider;
  
  $eventBus = $di->getShared(EventBusProvider::SERVICE_NAME);
  $eventBus->publish('models-changed', [
      'model' => 'Extensions',
      'recordId' => '123',
      'action' => 'update'
  ]);
  ```
- **Client Connection**: Clients connect via WebSocket to `/pbxcore/api/nchan/sub/event-bus`

### LanguageProvider
- **Service Name**: `language`
- **Description**: Manages system language settings
- **Key Dependencies**: `registry` service
- **Default**: Returns system language code (e.g., 'en')

### LoggerAuthProvider
- **Service Name**: `loggerAuth`
- **Description**: Logger specifically for authentication events
- **Key Dependencies**: None
- **Log File**: `/var/log/mikopbx_auth.log`
- **Note**: Separate logger for security audit trail

### LoggerProvider
- **Service Name**: `logger`
- **Description**: Main system logger using Monolog
- **Key Dependencies**: None
- **Features**:
  - Syslog handler (UDP to 127.0.0.1:514)
  - CLI output handler for console
  - Configurable log levels

### MainDatabaseProvider
- **Service Name**: `db`
- **Description**: Main SQLite database connection
- **Key Dependencies**: `config` service
- **Database**: `/storage/usbdisk1/mikopbx/db/mikopbx.db`
- **Note**: Central database for system configuration

### ManagedCacheProvider
- **Service Name**: `managedCache`
- **Description**: Advanced caching with automatic dependency tracking
- **Key Dependencies**: 
  - `config` service
  - `registry` service
- **Features**:
  - Redis backend
  - Automatic cache invalidation on model changes
  - Smart dependency management

### MarketPlaceProvider
- **Service Name**: `license`
- **Description**: License management and marketplace integration
- **Key Dependencies**: `config` service
- **Features**: Handles license validation and marketplace API calls

### MessagesProvider
- **Service Name**: `messages`
- **Description**: System message queue provider
- **Key Dependencies**: `beanstalk` service
- **Note**: Legacy provider for backward compatibility

### ModelsAnnotationsProvider
- **Service Name**: `annotations`
- **Description**: Phalcon annotations reader for models
- **Key Dependencies**: None
- **Features**: Memory adapter for annotation caching

### ModelsMetadataProvider
- **Service Name**: `modelsMetadata`
- **Description**: Model metadata caching
- **Key Dependencies**: None
- **Features**: 
  - Memory adapter for development
  - Files adapter for production
  - 86400 second TTL

### ModulesDBConnectionsProvider
- **Service Name**: `modulesDBConnectionsService`
- **Description**: Manages database connections for modules
- **Key Dependencies**: 
  - `config` service
  - `registry` service
- **Features**: Dynamic database connections for installed modules

### MutexProvider
- **Service Name**: `mutex`
- **Description**: Distributed mutex/locking service
- **Key Dependencies**: None
- **Note**: Currently returns null (placeholder for future implementation)

### NatsConnectionProvider
- **Service Name**: `nats`
- **Description**: NATS message broker connection
- **Key Dependencies**: `logger` service
- **Configuration**: Connects to localhost:4222
- **Features**: Message broker for inter-process communication
- **Note**: Used for general messaging, not for EventBus (which uses nginx nchan)

### PBXConfModulesProvider
- **Service Name**: `pbxConfModules`
- **Description**: Module configuration manager
- **Key Dependencies**: 
  - `config` service
  - `registry` service
- **Features**: 
  - Loads and caches enabled modules
  - Hooks into system processes
  - Module priority management

### PBXCoreRESTClientProvider
- **Service Name**: `restAPIClient`
- **Description**: Internal REST API client with full RESTful support
- **Key Dependencies**: None (uses PbxSettings directly)
- **Configuration**: Uses `WEB_PORT` from PbxSettings
- **Supported HTTP Methods**:
  - `GET` - Retrieve resources
  - `POST` - Create new resources
  - `PUT` - Fully update resources
  - `PATCH` - Partially update resources
  - `DELETE` - Remove resources
- **Features**:
  - Full RESTful API v3 support
  - Legacy API compatibility
  - Event publishing via nchan
  - JSON and form-data support
  - Automatic error handling
- **Usage Examples**:
  ```php
  // GET request
  $result = $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
      '/pbxcore/api/v3/extensions/101',
      PBXCoreRESTClientProvider::HTTP_METHOD_GET
  ]);

  // POST request with JSON
  $result = $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
      '/pbxcore/api/v3/extensions',
      PBXCoreRESTClientProvider::HTTP_METHOD_POST,
      ['number' => '102', 'username' => 'John'],
      ['Content-Type' => 'application/json']
  ]);

  // PUT request
  $result = $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
      '/pbxcore/api/v3/extensions/102',
      PBXCoreRESTClientProvider::HTTP_METHOD_PUT,
      ['number' => '102', 'username' => 'John Doe'],
      ['Content-Type' => 'application/json']
  ]);

  // PATCH request
  $result = $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
      '/pbxcore/api/v3/extensions/102',
      PBXCoreRESTClientProvider::HTTP_METHOD_PATCH,
      ['email' => 'new@example.com'],
      ['Content-Type' => 'application/json']
  ]);

  // DELETE request
  $result = $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
      '/pbxcore/api/v3/extensions/102',
      PBXCoreRESTClientProvider::HTTP_METHOD_DELETE
  ]);

  // Custom method on singleton resource
  $result = $di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
      '/pbxcore/api/v3/system:datetime',
      PBXCoreRESTClientProvider::HTTP_METHOD_GET
  ]);
  ```

### RedisClientProvider
- **Service Name**: `redis`
- **Description**: Redis client for caching and IPC
- **Key Dependencies**: None
- **Configuration**: Connects to localhost:6379

### RegistryProvider
- **Service Name**: `registry`
- **Description**: Global registry for shared data
- **Key Dependencies**: None
- **Features**: Stores global state and shared variables

### RouterProvider
- **Service Name**: `router`
- **Description**: URL routing configuration
- **Key Dependencies**: None
- **Features**: 
  - RESTful routes
  - Module routes support
  - Case-insensitive controller/action names

### SentryErrorHandlerProvider
- **Service Name**: `sentryErrorHandler`
- **Description**: Sentry error tracking integration
- **Key Dependencies**: 
  - `config` service
  - Environment variables
- **Configuration**: Uses SENTRY_DSN environment variable
- **Features**: Production error tracking

### SessionProvider
- **Service Name**: `session`
- **Description**: Session management
- **Key Dependencies**: 
  - `cookies` service
  - `crypt` service
- **Backend**: Redis session adapter
- **Configuration**: 
  - 3 day lifetime
  - Secure cookies
  - HTTP only

### TranslationProvider
- **Service Name**: `translation`
- **Description**: Internationalization support
- **Key Dependencies**: 
  - `language` service
  - `messages` service
- **Features**: 
  - Multi-language support
  - Dynamic message loading
  - Language fallback

### UrlProvider
- **Service Name**: `url`
- **Description**: URL generation helper
- **Key Dependencies**: `config` service
- **Configuration**: Uses `adminApplication.baseUri`

### WhoopsErrorHandlerProvider
- **Service Name**: `whoopsErrorHandler`
- **Description**: Development error handler with pretty errors
- **Key Dependencies**: None
- **Features**: 
  - Pretty error pages
  - Stack traces
  - Code context

## Usage Example

```php
use MikoPBX\Common\Providers\LoggerProvider;
use Phalcon\Di\FactoryDefault;

// In your service registration or bootstrap:
$di = new FactoryDefault();

// Register a provider
$di->register(new LoggerProvider());

// Access the service using the service constant
$logger = $di->getShared(LoggerProvider::SERVICE_NAME);
$logger->info('Service initialized');

// In a class that extends Injectable:
class MyService extends \Phalcon\Di\Injectable
{
    public function doSomething(): void
    {
        $logger = $this->di->getShared(LoggerProvider::SERVICE_NAME);
        $logger->info('Doing something');
    }
}
```

## Provider Dependencies Graph

```
config
├── amiCommander
├── amiListener  
├── modelsCache (beanstalk)
├── dbCDR
├── db
├── managedCache
├── license
├── modulesDBConnectionsService
├── pbxConfModules
├── restAPIClient
└── url

registry
├── language
├── managedCache
├── modulesDBConnectionsService
└── pbxConfModules

logger
├── nats
└── restAPIClient

eventBus (depends on restAPIClient)

session (depends on cookies, crypt)
translation (depends on language, messages)
```

## Event System Architecture

The MikoPBX event system uses nginx nchan module for real-time pub/sub messaging:

### Server-Side (Publishing)
1. **EventBusProvider** publishes events via REST API to localhost
2. Events are sent to `/pbxcore/api/nchan/pub/{channel}`
3. Nginx nchan module handles message distribution
4. Configuration: 50 message buffer, 10s message timeout

### Client-Side (Subscribing)
1. Clients connect via WebSocket to `/pbxcore/api/nchan/sub/{channel}`
2. Authentication is handled by Lua script (`access-nchan.lua`)
3. JavaScript EventBus (`event-bus.js`) manages WebSocket connections

### Common Events
- `models-changed` - Fired when database models are created/updated/deleted
- `advice` - System notifications and warnings
- `connection-status` - WebSocket connection state changes
- Dynamic channels - Used by modules for async operation progress (e.g., installation, updates)

### Configuration Files
- `/etc/nginx/mikopbx/locations/longpool.conf` - Nchan endpoints
- `/etc/nginx/mikopbx/lua/access-nchan.lua` - Authentication logic
- `/sites/admin-cabinet/assets/js/src/main/event-bus.js` - Client implementation

## Best Practices

1. **Use `setShared()`** for services that should be singletons
2. **Always define SERVICE_NAME constant** in provider classes
3. **Use service constants instead of string names** when accessing services:
   ```php
   // Good
   $logger = $di->getShared(LoggerProvider::SERVICE_NAME);
   
   // Avoid
   $logger = $di->get('logger');
   ```
4. **Implement proper error handling** in provider registration
5. **Document service dependencies** clearly
6. **Use configuration values** from the config service
7. **Lazy load services** when possible to improve performance

## Adding New Providers

To add a new provider:

1. Create a class implementing `Phalcon\Di\ServiceProviderInterface`
2. Implement the `register(DiInterface $di)` method
3. Register your service using `$di->setShared()` or `$di->set()`
4. Add the provider to the bootstrap process
5. Document the service in this file

Example:
```php
namespace MikoPBX\Common\Providers;

use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

class MyServiceProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'myService';
    
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function() use ($di) {
                $config = $di->getShared(ConfigProvider::SERVICE_NAME);
                return new MyService($config->myService->toArray());
            }
        );
    }
}
```