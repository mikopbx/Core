# PHP Style Guide for MikoPBX

This guide defines the PHP coding standards used in MikoPBX based on real examples from the codebase and modern PHP best practices.

## Table of Contents

1. [File Structure](#1-file-structure)
2. [Class Organization](#2-class-organization)
3. [Documentation Standards](#3-documentation-standards)
4. [Naming Conventions](#4-naming-conventions)
5. [Type Declarations](#5-type-declarations)
6. [Method Organization](#6-method-organization)
7. [Error Handling](#7-error-handling)
8. [Dependency Injection](#8-dependency-injection)
9. [Database and Models](#9-database-and-models)
10. [Background Workers](#10-background-workers)
11. [Modern PHP Features](#11-modern-php-features)
12. [MikoPBX-Specific Patterns](#12-mikopbx-specific-patterns)

## 1. File Structure

### License Header

Every PHP file must start with the GPL v3 license header:

```php
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */
```

### Namespace and Use Statements

```php
declare(strict_types=1);

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\ExtensionEditForm;
use MikoPBX\Common\Models\{Extensions, Sip, Users};
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;
use Phalcon\Http\ResponseInterface;
```

**Best Practices:**
- Use `declare(strict_types=1)` for all new files
- One namespace per file following PSR-4
- Group related imports with curly braces
- Order: PHP core, third-party packages, then MikoPBX classes
- Sort alphabetically within groups

## 2. Class Organization

### Class Structure Template

```php
/**
 * Controller for managing PBX extensions
 */
class ExtensionsController extends BaseController
{
    // Constants
    private const int DEFAULT_TIMEOUT = 30;
    public const string SERVICE_NAME = 'extensions';
    
    // Properties (typed)
    private array $allowedCodecs = [];
    protected ?string $currentExtension = null;
    public bool $isEnabled = true;
    
    // Constructor (if needed)
    public function __construct()
    {
        parent::__construct();
        // Initialization logic
    }
    
    // Public methods
    public function indexAction(): void
    {
        // Implementation
    }
    
    // Protected methods
    protected function validateExtension(string $number): bool
    {
        // Implementation
    }
    
    // Private methods
    private function loadConfiguration(): array
    {
        // Implementation
    }
    
    // Static methods at the end
    public static function sortArrayByPriority(array $a, array $b): int
    {
        return (int)$a['priority'] - (int)$b['priority'];
    }
}
```

## 3. Documentation Standards

### Class Documentation

```php
/**
 * Manages system configuration parameters
 * 
 * This class provides methods for reading and writing PBX settings
 * with caching support and validation.
 * 
 * @package MikoPBX\Common\Models
 */
class PbxSettings extends ModelsBase
{
```

### Method Documentation

```php
/**
 * Update extension codecs based on provided data
 *
 * This method processes codec configuration from form submission,
 * validates the data, and updates the database accordingly.
 *
 * @param string $codecsData JSON-encoded codec configuration
 * @param array  &$messages  Array to collect error messages (passed by reference)
 * 
 * @return bool True if update was successful, false otherwise
 * 
 * @throws \JsonException If codec data is invalid JSON
 */
private function updateCodecs(string $codecsData, array &$messages): bool
{
```

### Property Documentation

```php
class WorkerPrepareAdvice extends WorkerBase
{
    /**
     * Redis response TTL in seconds
     * @var int
     */
    private const int REDIS_RESPONSE_TTL = 3600;
    
    /**
     * Cache of simple passwords for validation
     * @var array<string>
     */
    private array $simplePasswords = [];
    
    /**
     * Current system configuration
     * @var array{language: string, timezone: string}
     */
    private array $config = [];
}
```

## 4. Naming Conventions

### Classes and Interfaces

```php
// Classes: PascalCase
class ExtensionsController {}
class PbxSettings {}
class WorkerPrepareAdvice {}

// Interfaces: PascalCase with Interface suffix
interface WorkerInterface {}
interface ConfigProviderInterface {}

// Traits: PascalCase with Trait suffix
trait PbxSettingsConstantsTrait {}
trait ValidationTrait {}
```

### Methods

```php
// Action methods in controllers: camelCase + Action suffix
public function indexAction(): void {}
public function modifyAction(): void {}

// Regular methods: descriptive camelCase
public function getDefaultCodecs(): array {}
private function validatePhoneNumber(string $number): bool {}
protected function buildQueryParameters(array $filters): array {}

// Boolean methods: use is/has/can prefix
public function isSimplePassword(string $password): bool {}
public function hasPermission(string $action): bool {}
public function canModify(): bool {}
```

### Variables and Properties

```php
// Properties and variables: camelCase
private string $userName;
private array $activeExtensions;
private ?int $maxRetryCount = null;

// Constants: UPPER_SNAKE_CASE or PascalCase for class constants
private const int MAX_RETRY_COUNT = 3;
private const string DEFAULT_LANGUAGE = 'en';
public const string KeyLanguage = 'WebAdminLanguage';
```

## 5. Type Declarations

### Strict Types

Always use strict types in new files:

```php
<?php
declare(strict_types=1);
```

### Property Types

```php
class ExampleService
{
    // Scalar types
    private string $name = '';
    private int $count = 0;
    private float $percentage = 0.0;
    private bool $isActive = false;
    
    // Nullable types
    private ?string $description = null;
    private ?array $cache = null;
    
    // Array types with PHPDoc for specificity
    /** @var array<string, mixed> */
    private array $config = [];
    
    /** @var array<int, Extension> */
    private array $extensions = [];
    
    // Object types
    private Logger $logger;
    private ?DatabaseConnection $connection = null;
}
```

### Method Signatures

```php
// Return type declarations
public function getName(): string
{
    return $this->name;
}

public function getConfig(): array
{
    return $this->config;
}

// Nullable returns
public function findExtension(string $number): ?Extension
{
    // Returns Extension object or null
}

// Void returns
public function updateStatus(string $status): void
{
    $this->status = $status;
}

// Union types (PHP 8+)
public function processValue(string|int $value): string|int
{
    return is_string($value) ? strtoupper($value) : $value * 2;
}

// Mixed type when truly needed
public function getCachedValue(string $key): mixed
{
    return $this->cache[$key] ?? null;
}
```

## 6. Method Organization

### Method Structure

```php
public function processExtensions(array $extensions, bool $validate = true): array
{
    // 1. Parameter validation / early returns
    if (empty($extensions)) {
        return [];
    }
    
    // 2. Variable initialization
    $results = [];
    $errors = [];
    
    // 3. Main logic with logical grouping
    foreach ($extensions as $extension) {
        // Validate extension
        if ($validate && !$this->isValidExtension($extension)) {
            $errors[] = "Invalid extension: {$extension['number']}";
            continue;
        }
        
        // Process extension
        $processed = $this->transformExtension($extension);
        
        // Store result
        $results[] = $processed;
    }
    
    // 4. Log any errors
    if (!empty($errors)) {
        $this->logger->warning('Extension processing errors', $errors);
    }
    
    // 5. Return result
    return $results;
}
```

### Early Returns

```php
public function updateExtension(string $id, array $data): bool
{
    // Early return for invalid input
    if (empty($id) || empty($data)) {
        return false;
    }
    
    // Early return if extension doesn't exist
    $extension = Extensions::findFirstById($id);
    if ($extension === null) {
        $this->logger->error("Extension not found: $id");
        return false;
    }
    
    // Main logic with single nesting level
    $extension->assign($data);
    return $extension->save();
}
```

## 7. Error Handling

### Exception Handling

```php
public function performDatabaseOperation(): bool
{
    try {
        $this->database->beginTransaction();
        
        // Perform operations
        $this->updateRecords();
        $this->cleanupOldData();
        
        $this->database->commit();
        return true;
        
    } catch (DatabaseException $e) {
        $this->database->rollback();
        SystemMessages::sysLogMsg(
            __CLASS__,
            "Database operation failed: " . $e->getMessage(),
            LOG_ERR
        );
        return false;
        
    } catch (Throwable $e) {
        $this->database->rollback();
        CriticalErrorsHandler::handleExceptionWithSyslog($e);
        return false;
    }
}
```

### Error Collection Pattern

```php
/**
 * Process multiple items collecting errors
 * 
 * @param array $items Items to process
 * @param array &$messages Error messages collection (passed by reference)
 * @return bool True if all successful, false if any errors
 */
public function processItems(array $items, array &$messages): bool
{
    $success = true;
    
    foreach ($items as $item) {
        try {
            $this->processItem($item);
        } catch (ProcessingException $e) {
            $success = false;
            $messages['error'][] = sprintf(
                'Failed to process item %s: %s',
                $item['id'],
                $e->getMessage()
            );
        }
    }
    
    return $success;
}
```

## 8. Dependency Injection

### Using Phalcon DI

```php
class ExtensionsController extends BaseController
{
    /**
     * Get extension details via REST API
     */
    public function getDetailsAction(string $id): void
    {
        // Get service from DI container
        $restClient = $this->di->get(PBXCoreRESTClientProvider::SERVICE_NAME, [
            '/pbxcore/api/extensions/getRecord',
            PBXCoreRESTClientProvider::HTTP_METHOD_GET,
            ['id' => $id]
        ]);
        
        $response = $restClient->sendRequest();
        
        // Alternative: Using static DI
        $cache = Di::getDefault()->get('cache');
    }
}
```

### Service Provider Pattern

```php
namespace MikoPBX\Common\Providers;

use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;

class EventBusProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'eventBus';
    
    /**
     * Register event bus service
     */
    public function register(DiInterface $di): void
    {
        $di->setShared(
            self::SERVICE_NAME,
            function () {
                $natsHost = getenv('NATS_HOST') ?: '127.0.0.1';
                $natsPort = getenv('NATS_PORT') ?: '4222';
                
                return new EventBus([
                    'host' => $natsHost,
                    'port' => $natsPort,
                    'channelId' => 'event-bus'
                ]);
            }
        );
    }
}
```

## 9. Database and Models

### Model Definition

```php
namespace MikoPBX\Common\Models;

use MikoPBX\Common\Models\Traits\ValidationTrait;

/**
 * PBX settings storage model
 * 
 * @property string $key Setting key
 * @property string $value Setting value
 */
class PbxSettings extends ModelsBase
{
    use PbxSettingsConstantsTrait;
    use PbxSettingsDefaultValuesTrait;
    use ValidationTrait;
    
    public string $key = '';
    public string $value = '';
    
    /**
     * Initialize model
     */
    public function initialize(): void
    {
        $this->setSource('m_PbxSettings');
        parent::initialize();
    }
    
    /**
     * Model validation rules
     */
    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add(
            'key',
            new Uniqueness([
                'message' => 'Setting key must be unique'
            ])
        );
        
        return $this->validate($validation);
    }
    
    /**
     * Get setting value by key with caching
     */
    public static function getValueByKey(string $key): string
    {
        $cache = Di::getDefault()->get('cache');
        $cacheKey = self::CACHE_KEY . ':' . $key;
        
        // Try cache first
        $value = $cache->get($cacheKey);
        if ($value !== null) {
            return $value;
        }
        
        // Load from database
        $setting = self::findFirstByKey($key);
        $value = $setting !== null ? $setting->value : self::getDefaultValue($key);
        
        // Cache the result
        $cache->set($cacheKey, $value, 3600);
        
        return $value;
    }
}
```

### Database Operations

```php
// Finding records
$extension = Extensions::findFirstById($id);
$extensions = Extensions::find([
    'conditions' => 'type = :type: AND disabled = :disabled:',
    'bind' => [
        'type' => 'SIP',
        'disabled' => '0'
    ],
    'order' => 'number ASC'
]);

// Creating records
$extension = new Extensions();
$extension->assign([
    'number' => '100',
    'type' => 'SIP',
    'callerid' => 'John Doe'
]);

if (!$extension->save()) {
    $errors = $extension->getMessages();
    foreach ($errors as $error) {
        $this->logger->error($error->getMessage());
    }
}

// Updating records
$extension->number = '101';
$extension->save();

// Deleting records
$extension->delete();

// Transactions
$this->db->begin();
try {
    // Multiple operations
    $extension->save();
    $sip->save();
    
    $this->db->commit();
} catch (Exception $e) {
    $this->db->rollback();
    throw $e;
}
```

### Multi-Model Queries with JOINs

When working with related models, use the Query Builder for complex queries with JOINs:

```php
// CORRECT: Using Query Builder with proper model references
$parameters = [
    'models' => [
        'Extensions' => Extensions::class,
    ],
    'conditions' => 'Extensions.is_general_user_number = "1" AND Sip.weakSecret = "2"',
    'columns' => [
        'id' => 'Extensions.id',
        'username' => 'Extensions.callerid',
        'number' => 'Extensions.number',
        'secret' => 'Sip.secret',
    ],
    'order' => 'number',
    'joins' => [
        'Sip' => [
            0 => Sip::class,
            1 => 'Sip.extension = Extensions.number',
            2 => 'Sip',
            3 => 'INNER',
        ],
        'Users' => [
            0 => Users::class,
            1 => 'Users.id = Extensions.userid',
            2 => 'Users',
            3 => 'INNER',
        ],
    ],
];

$queryResult = $this->di->get('modelsManager')->createBuilder($parameters)
    ->getQuery()
    ->execute();

// Processing results
foreach ($queryResult as $record) {
    // Access columns as defined in 'columns' array
    $extensionId = $record->id;
    $username = $record->username;
    $number = $record->number;
    $secret = $record->secret;
}
```

**Key points for multi-model queries:**

1. **Main model declaration**: Always specify the main model in the `models` array
2. **Join syntax**: Each join requires an array with 4 elements:
   - `[0]` - Model class name
   - `[1]` - Join condition
   - `[2]` - Alias (usually same as model name)
   - `[3]` - Join type (INNER, LEFT, RIGHT)
3. **Column aliasing**: Use the `columns` array to specify which columns to select and their aliases
4. **Condition references**: Use table aliases in conditions (e.g., `Sip.weakSecret`)

```php
// Example: Complex query with multiple conditions and filters
$categories = ['WEB', 'SSH', 'AMI'];

$parameters = [
    'models' => [
        'NetworkFilters' => NetworkFilters::class,
    ],
    'conditions' => 'NetworkFilters.deny IS NOT NULL AND NetworkFilters.deny != :empty: ' .
                   'AND FirewallRules.category IN ({categories:array}) ' .
                   'AND FirewallRules.action = :action:',
    'bind' => [
        'empty' => '',
        'categories' => $categories,
        'action' => 'allow'
    ],
    'joins' => [
        'FirewallRules' => [
            0 => FirewallRules::class,
            1 => 'FirewallRules.networkfilterid = NetworkFilters.id',
            2 => 'FirewallRules',
            3 => 'INNER',
        ],
    ],
];

$filters = $this->di->get('modelsManager')->createBuilder($parameters)
    ->getQuery()
    ->execute();
```

**Common pitfalls to avoid:**

1. **INCORRECT**: Using `find()` method directly with joins
```php
// This won't work properly
$filters = NetworkFilters::find([
    'conditions' => 'NetworkFilters.deny IS NOT NULL',
    'joins' => [...] // joins in find() may not work as expected
]);
```

2. **INCORRECT**: Missing main model in models array
```php
// Missing main model declaration
$parameters = [
    'conditions' => 'Extensions.number = "100"',
    'joins' => [...]
];
```

3. **CORRECT**: Always use Query Builder for complex joins
```php
$builder = $this->di->get('modelsManager')->createBuilder($parameters);
$query = $builder->getQuery();
$result = $query->execute();
```

## 10. Background Workers

### Worker Implementation

```php
namespace MikoPBX\Core\Workers;

use MikoPBX\Core\System\SystemMessages;

/**
 * Background worker for preparing system advice
 */
class WorkerPrepareAdvice extends WorkerBase
{
    /**
     * Worker constants
     */
    private const int CHECK_INTERVAL = 30;
    private const string CACHE_KEY = 'system:advice';
    
    /**
     * Start worker
     */
    public function start(array $params): void
    {
        SystemMessages::echoGreenToTeletype('Starting advice preparation worker...');
        
        $this->workerLoop();
    }
    
    /**
     * Main worker loop
     */
    private function workerLoop(): void
    {
        while ($this->needRestart === false) {
            try {
                $this->processAdvice();
                
                // Sleep before next iteration
                $this->sleepWorker(self::CHECK_INTERVAL);
                
            } catch (Throwable $e) {
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    'Worker error: ' . $e->getMessage(),
                    LOG_ERR
                );
                sleep(5); // Brief pause on error
            }
        }
    }
    
    /**
     * Process system advice
     */
    private function processAdvice(): void
    {
        $advice = $this->collectSystemAdvice();
        
        if (!empty($advice)) {
            $this->publishAdvice($advice);
        }
    }
    
    /**
     * Collect system advice
     * 
     * @return array<string, array>
     */
    private function collectSystemAdvice(): array
    {
        $advice = [
            'error' => [],
            'warning' => [],
            'info' => []
        ];
        
        // Check passwords
        if ($this->hasWeakPasswords()) {
            $advice['warning'][] = [
                'messageTpl' => 'adv_WeakPasswordsDetected',
                'messageParams' => []
            ];
        }
        
        // Check disk space
        $diskUsage = $this->getDiskUsage();
        if ($diskUsage > 90) {
            $advice['error'][] = [
                'messageTpl' => 'adv_LowDiskSpace',
                'messageParams' => ['usage' => $diskUsage]
            ];
        }
        
        return $advice;
    }
}
```

### Redis-based Worker

```php
class WorkerApiCommands extends WorkerRedisBase
{
    /**
     * Job processing configuration
     */
    private const int MAX_RETRIES = 3;
    private const int RETRY_DELAY = 5;
    private const int JOB_TIMEOUT = 300;
    
    /**
     * Process job from queue
     */
    protected function processJob(array $job): void
    {
        $jobId = $job['id'] ?? uniqid('job_');
        
        $this->logger->info("Processing job: $jobId");
        
        try {
            $result = match ($job['action']) {
                'reload' => $this->handleReload($job['params']),
                'restart' => $this->handleRestart($job['params']),
                'status' => $this->handleStatus($job['params']),
                default => throw new InvalidArgumentException("Unknown action: {$job['action']}")
            };
            
            $this->publishResult($jobId, $result);
            
        } catch (Exception $e) {
            $this->handleJobError($jobId, $e);
        }
    }
}
```

## 11. Modern PHP Features

### Enums (PHP 8.1+)

```php
enum ExtensionType: string
{
    case SIP = 'SIP';
    case IAX = 'IAX';
    case PJSIP = 'PJSIP';
    case EXTERNAL = 'EXTERNAL';
    
    public function isInternal(): bool
    {
        return in_array($this, [self::SIP, self::IAX, self::PJSIP], true);
    }
}

// Usage
$type = ExtensionType::SIP;
if ($type->isInternal()) {
    // Process internal extension
}
```

### Named Arguments (PHP 8.0+)

```php
// Method definition
public function createExtension(
    string $number,
    string $callerid,
    ExtensionType $type = ExtensionType::SIP,
    bool $recordCalls = false,
    ?string $email = null
): Extension {
    // Implementation
}

// Usage with named arguments
$extension = $this->createExtension(
    number: '100',
    callerid: 'John Doe',
    recordCalls: true
);
```

### Constructor Property Promotion (PHP 8.0+)

```php
class CloudConfig
{
    public function __construct(
        private readonly string $provider,
        private readonly string $region,
        private readonly array $credentials,
        private ?string $instanceId = null
    ) {
    }
    
    public function getProvider(): string
    {
        return $this->provider;
    }
}
```

### Match Expression (PHP 8.0+)

```php
public function getCodecPriority(string $codec): int
{
    return match (strtolower($codec)) {
        'opus' => 1,
        'g722' => 2,
        'alaw', 'ulaw' => 3,
        'g729' => 4,
        'gsm' => 5,
        default => 99
    };
}
```

### Null Safe Operator (PHP 8.0+)

```php
// Instead of
$callerid = null;
if ($extension !== null) {
    $user = $extension->getUser();
    if ($user !== null) {
        $callerid = $user->getCallerId();
    }
}

// Use null safe operator
$callerid = $extension?->getUser()?->getCallerId();
```

## 12. MikoPBX-Specific Patterns

### System Messages

```php
use MikoPBX\Core\System\SystemMessages;

// Console output with colors
SystemMessages::echoGreenToTeletype('Operation completed successfully');
SystemMessages::echoRedToTeletype('Error: Operation failed');
SystemMessages::echoYellowToTeletype('Warning: Check configuration');

// System logging
SystemMessages::sysLogMsg(
    __CLASS__,
    'Processing started for extension: ' . $extensionNumber,
    LOG_INFO
);

SystemMessages::sysLogMsg(
    __CLASS__,
    'Critical error: ' . $exception->getMessage(),
    LOG_ERR
);
```

### Configuration Access

```php
// Using PbxSettings model
$language = PbxSettings::getValueByKey(PbxSettings::KeyLanguage);
$timezone = PbxSettings::getValueByKey(PbxSettings::KeyTimezone);

// Setting values
PbxSettings::setValueByKey(PbxSettings::KeyLanguage, 'en');

// Bulk operations
$settings = [
    PbxSettings::KeyLanguage => 'en',
    PbxSettings::KeyTimezone => 'UTC',
    PbxSettings::KeyVersion => '2024.1'
];

foreach ($settings as $key => $value) {
    PbxSettings::setValueByKey($key, $value);
}
```

### Directory Access

```php
// CORRECT: Use Directories utility class
use MikoPBX\Core\System\Directories;

$cacheDir = Directories::getDir(Directories::WWW_DOWNLOAD_CACHE_DIR);
$logsDir = Directories::getDir(Directories::CORE_LOGS_DIR);
$tmpDir = Directories::getDir(Directories::CORE_TEMP_DIR);

// INCORRECT: Don't access config directly for directories
// $cacheDir = $this->di->getShared('config')->path('www.downloadCacheDir');
```

### Event Bus Usage

```php
// Publishing events
$eventBus = $this->di->get(EventBusProvider::SERVICE_NAME);

$eventBus->publish([
    'model' => Extensions::class,
    'recordId' => $extension->id,
    'action' => 'create',
    'data' => $extension->toArray()
]);

// In workers or services
$this->publishEvent('system:reload', [
    'module' => 'extensions',
    'reason' => 'Configuration updated'
]);
```

### Cloud Provisioning Pattern

```php
namespace MikoPBX\Core\System\CloudProvisioning;

abstract class CloudProvider
{
    abstract public function instanceExists(string $instanceId): bool;
    abstract public function getMetadata(string $path): ?string;
    abstract public function configureInstance(): bool;
    
    /**
     * Common initialization logic
     */
    public function initialize(): bool
    {
        if (!$this->validateEnvironment()) {
            return false;
        }
        
        $instanceId = $this->detectInstanceId();
        if ($instanceId === null) {
            SystemMessages::sysLogMsg(
                static::class,
                'Failed to detect instance ID',
                LOG_WARNING
            );
            return false;
        }
        
        return $this->configureInstance();
    }
}
```

## Code Quality Tools

### PHPStan Configuration

```yaml
# phpstan.neon
parameters:
    level: 8
    paths:
        - src
    excludePaths:
        - src/*/cache/*
    checkMissingIterableValueType: false
```

### Code Style Fixer

```bash
# Run PHP CS Fixer
vendor/bin/php-cs-fixer fix src --rules=@PSR12

# Check without fixing
vendor/bin/php-cs-fixer fix src --dry-run --diff
```

### Pre-commit Hooks

```bash
#!/bin/bash
# .git/hooks/pre-commit

# PHP syntax check
find . -name "*.php" -exec php -l {} \; || exit 1

# PHPStan
vendor/bin/phpstan analyse || exit 1

# Code style
vendor/bin/php-cs-fixer fix --dry-run || exit 1
```

## Summary

This style guide represents the coding standards used throughout the MikoPBX project. Key principles:

1. **Consistency** - Follow established patterns in the codebase
2. **Type Safety** - Use strict types and type declarations
3. **Documentation** - Comprehensive PHPDoc blocks
4. **Modern PHP** - Leverage PHP 8+ features where appropriate
5. **Error Handling** - Graceful error handling with proper logging
6. **Testing** - Write testable code with dependency injection
7. **Performance** - Consider caching and optimization
8. **Security** - Validate input, escape output, use prepared statements

When in doubt, look at existing code in the same module for examples of the preferred style.