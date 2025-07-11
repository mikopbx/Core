# PHP Style Guide for MikoPBX

This guide defines the PHP coding standards used in MikoPBX based on PSR standards, modern PHP best practices, and MikoPBX-specific patterns.

## Table of Contents

1. [PSR Compliance](#1-psr-compliance)
2. [File Structure](#2-file-structure)
3. [Class Organization](#3-class-organization)
4. [Documentation Standards](#4-documentation-standards)
5. [Naming Conventions](#5-naming-conventions)
6. [Type Declarations](#6-type-declarations)
7. [Method Organization](#7-method-organization)
8. [Error Handling](#8-error-handling)
9. [Dependency Injection](#9-dependency-injection)
10. [Database and Models](#10-database-and-models)
11. [Background Workers](#11-background-workers)
12. [Modern PHP Features](#12-modern-php-features)
13. [MikoPBX-Specific Patterns](#13-mikopbx-specific-patterns)
14. [Code Quality Tools](#14-code-quality-tools)

## 1. PSR Compliance

MikoPBX follows these PSR standards:

- **PSR-1**: Basic Coding Standard
- **PSR-4**: Autoloader Standard
- **PSR-12**: Extended Coding Style
- **PSR-3**: Logger Interface (where applicable)
- **PSR-11**: Container Interface (for DI)

### Key PSR Requirements

```php
<?php
// PSR-1: PHP tags
// Use only <?php or <?= tags, never short tags

// PSR-1: UTF-8 without BOM
// All PHP files MUST use UTF-8 without BOM

// PSR-1: Side effects
// Files SHOULD declare symbols OR execute logic, not both

// PSR-12: Strict types declaration must be on first line after <?php
declare(strict_types=1);

// PSR-4: Namespace must match directory structure
namespace MikoPBX\Core\System;

// PSR-12: One blank line after namespace
// PSR-12: One blank line after use declarations block

use MikoPBX\Common\Models\Extensions;
use Phalcon\Di\Injectable;
use Psr\Log\LoggerInterface;

// PSR-1: Class names MUST be in StudlyCaps
// PSR-12: Opening brace for classes on new line
class SystemConfiguration extends Injectable
{
    // PSR-12: Visibility MUST be declared on all properties
    private string $configPath;
    
    // PSR-1: Method names MUST be in camelCase
    // PSR-12: Opening brace for methods on new line
    public function loadConfiguration(): void
    {
        // PSR-12: 4 spaces for indentation, no tabs
        // PSR-12: Control structures have space after keyword
        if ($this->isConfigured()) {
            $this->processConfig();
        }
    }
}
```

## 2. File Structure

### License Header

Every PHP file must start with the GPL v3 license header:

```php
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

declare(strict_types=1);

namespace MikoPBX\AdminCabinet\Controllers;

// PSR-12: Imports must be alphabetically sorted
// PSR-12: Grouped imports with {} are allowed
use MikoPBX\AdminCabinet\Forms\ExtensionEditForm;
use MikoPBX\Common\Models\{Extensions, Sip, Users};
use MikoPBX\Common\Providers\PBXCoreRESTClientProvider;
use Phalcon\Http\ResponseInterface;
use Psr\Log\LoggerInterface;

/**
 * Controller for managing PBX extensions
 */
class ExtensionsController extends BaseController
{
    // Implementation
}
```

**Best Practices:**
- Use `declare(strict_types=1)` immediately after the opening PHP tag (PSR-12)
- One namespace per file following PSR-4
- Group related imports with curly braces
- Order: PHP core, PSR interfaces, third-party packages, then MikoPBX classes
- Sort alphabetically within groups
- One blank line after namespace declaration (PSR-12)
- One blank line after use declaration block (PSR-12)

## 3. Class Organization

### Class Structure Template (PSR-12 Compliant)

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Core\System;

use Psr\Log\LoggerInterface;

/**
 * Controller for managing PBX extensions
 * 
 * @package MikoPBX\Core\System
 */
class ExtensionsController extends BaseController
{
    // Constants (PSR-12: uppercase with underscores)
    private const int DEFAULT_TIMEOUT = 30;
    private const string SERVICE_NAME = 'extensions';
    
    // Properties with visibility and types (PSR-12)
    private array $allowedCodecs = [];
    protected ?string $currentExtension = null;
    public bool $isEnabled = true;
    
    // Constructor
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly ConfigService $config
    ) {
        parent::__construct();
    }
    
    // Public methods first
    public function indexAction(): void
    {
        // Implementation
    }
    
    // Then protected methods
    protected function validateExtension(string $number): bool
    {
        // Implementation
        return true;
    }
    
    // Private methods last
    private function loadConfiguration(): array
    {
        // Implementation
        return [];
    }
    
    // Static methods at the very end
    public static function sortArrayByPriority(array $a, array $b): int
    {
        return (int)$a['priority'] - (int)$b['priority'];
    }
}
```

## 4. Documentation Standards

### PSR-5 (Draft) and PSR-19 (Draft) Compatible Documentation

```php
/**
 * Manages system configuration parameters
 * 
 * This class provides methods for reading and writing PBX settings
 * with caching support and validation.
 * 
 * @package MikoPBX\Common\Models
 * @since 2024.1.0
 * @author MikoPBX Team
 */
class PbxSettings extends ModelsBase
{
    /**
     * Redis response TTL in seconds
     * 
     * @var int
     */
    private const int REDIS_RESPONSE_TTL = 3600;
    
    /**
     * Cache of simple passwords for validation
     * 
     * @var array<int, string>
     */
    private array $simplePasswords = [];
    
    /**
     * Update extension codecs based on provided data
     *
     * This method processes codec configuration from form submission,
     * validates the data, and updates the database accordingly.
     *
     * @param string $codecsData JSON-encoded codec configuration
     * @param array<string, array<string>> $messages Array to collect error messages (passed by reference)
     * 
     * @return bool True if update was successful, false otherwise
     * 
     * @throws \JsonException If codec data is invalid JSON
     * @throws \RuntimeException If database operation fails
     * 
     * @since 2024.1.0
     */
    public function updateCodecs(string $codecsData, array &$messages): bool
    {
        // Implementation
        return true;
    }
}
```

### PHPDoc Best Practices

1. **Use typed arrays**: `@var array<string, mixed>` instead of just `@var array`
2. **Document thrown exceptions**: List all exceptions that can be thrown
3. **Use @since tags**: For tracking when features were added
4. **Avoid redundant documentation**: Don't document obvious things

## 5. Naming Conventions (PSR-1 & PSR-12)

### Classes and Interfaces

```php
// PSR-1: Classes MUST be in StudlyCaps/PascalCase
class ExtensionsController {}
class PbxSettings {}
class WorkerPrepareAdvice {}

// Interfaces: PascalCase with Interface suffix
interface WorkerInterface {}
interface ConfigProviderInterface {}

// Traits: PascalCase with Trait suffix
trait PbxSettingsConstantsTrait {}
trait ValidationTrait {}

// Enums (PHP 8.1+): PascalCase
enum ExtensionType: string
{
    case SIP = 'SIP';
    case PJSIP = 'PJSIP';
}
```

### Methods and Functions

```php
// PSR-1: Method names MUST be in camelCase
public function getDefaultCodecs(): array {}
private function validatePhoneNumber(string $number): bool {}

// Action methods in controllers: camelCase + Action suffix
public function indexAction(): void {}
public function modifyAction(): void {}

// Boolean methods: use is/has/can prefix
public function isSimplePassword(string $password): bool {}
public function hasPermission(string $action): bool {}
public function canModify(): bool {}
```

### Variables and Properties

```php
// PSR-1: No recommendation for properties, but we use camelCase
private string $userName;
private array $activeExtensions;
private ?int $maxRetryCount = null;

// PSR-1: Class constants MUST be in UPPER_CASE with underscores
private const int MAX_RETRY_COUNT = 3;
private const string DEFAULT_LANGUAGE = 'en';

// MikoPBX convention: PascalCase for setting keys
public const string WebAdminLanguage = 'WebAdminLanguage';
public const string PBXTimezone = 'PBXTimezone';
```

## 6. Type Declarations

### PHP 8.3 Type System

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Core\Services;

use Psr\Log\LoggerInterface;

class ExampleService
{
    // Scalar types with defaults
    private string $name = '';
    private int $count = 0;
    private float $percentage = 0.0;
    private bool $isActive = false;
    
    // Nullable types
    private ?string $description = null;
    private ?array $cache = null;
    
    // Typed arrays with generics notation
    /** @var array<string, mixed> Configuration array */
    private array $config = [];
    
    /** @var array<int, Extension> List of extensions */
    private array $extensions = [];
    
    // Object types
    private LoggerInterface $logger;
    private ?DatabaseConnection $connection = null;
    
    // PHP 8.3: Typed class constants
    private const string VERSION = '1.0.0';
    private const int TIMEOUT = 30;
    
    // Union types (PHP 8.0+)
    public function processValue(string|int|float $value): string
    {
        return match (true) {
            is_string($value) => strtoupper($value),
            is_int($value) => (string) ($value * 2),
            is_float($value) => number_format($value, 2),
        };
    }
    
    // Intersection types (PHP 8.1+)
    public function processLoggable(LoggableInterface&SerializableInterface $object): void
    {
        $this->logger->info('Processing', ['data' => serialize($object)]);
    }
    
    // Never return type (PHP 8.1+)
    public function throwException(): never
    {
        throw new \RuntimeException('This always throws');
    }
    
    // Mixed type when truly needed
    public function getCachedValue(string $key): mixed
    {
        return $this->cache[$key] ?? null;
    }
}
```

### Method Signatures Best Practices

```php
// Return type declarations are mandatory
public function getName(): string
{
    return $this->name;
}

// Use void for methods with no return
public function updateStatus(string $status): void
{
    $this->status = $status;
}

// Nullable returns when appropriate
public function findExtension(string $number): ?Extension
{
    return Extensions::findFirstByNumber($number);
}

// Self return type for fluent interfaces
public function setName(string $name): self
{
    $this->name = $name;
    return $this;
}

// Static return type (PHP 8.0+)
public function withName(string $name): static
{
    $clone = clone $this;
    $clone->name = $name;
    return $clone;
}
```

## 7. Method Organization

### PSR-12 Method Structure

```php
public function processExtensions(array $extensions, bool $validate = true): array
{
    // PSR-12: Opening brace on new line
    // Early returns for validation
    if (empty($extensions)) {
        return [];
    }
    
    // Variable initialization grouped together
    $results = [];
    $errors = [];
    $processedCount = 0;
    
    // Main logic with clear sections
    foreach ($extensions as $extension) {
        // Validation section
        if ($validate && !$this->isValidExtension($extension)) {
            $errors[] = "Invalid extension: {$extension['number']}";
            continue;
        }
        
        // Processing section
        try {
            $processed = $this->transformExtension($extension);
            $results[] = $processed;
            $processedCount++;
        } catch (\Exception $e) {
            $this->logger->error('Processing failed', [
                'extension' => $extension['number'],
                'error' => $e->getMessage()
            ]);
        }
    }
    
    // Logging section
    if (!empty($errors)) {
        $this->logger->warning('Extension processing completed with errors', [
            'errors' => $errors,
            'processed' => $processedCount
        ]);
    }
    
    return $results;
}
```

### Control Structures (PSR-12)

```php
// PSR-12: Space after control structure keyword
// PSR-12: Space after closing parenthesis
// PSR-12: Opening brace on same line for control structures
if ($condition) {
    // code
} elseif ($anotherCondition) {
    // code
} else {
    // code
}

// PSR-12: while/do-while
while ($condition) {
    // code
}

do {
    // code
} while ($condition);

// PSR-12: for loops
for ($i = 0; $i < 10; $i++) {
    // code
}

// PSR-12: foreach
foreach ($items as $key => $value) {
    // code
}

// PSR-12: try-catch
try {
    // code
} catch (FirstException $e) {
    // code
} catch (SecondException|ThirdException $e) {
    // PHP 8.0+ union types in catch
    // code
} finally {
    // cleanup
}

// PSR-12: switch (deprecated in favor of match)
switch ($value) {
    case 'option1':
        // code
        break;
        
    case 'option2':
    case 'option3':
        // code
        break;
        
    default:
        // code
        break;
}
```

## 8. Error Handling

### Modern Exception Handling with PSR-3 Logging

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Core\Services;

use MikoPBX\Core\Exceptions\DatabaseException;
use MikoPBX\Core\Exceptions\ValidationException;
use Psr\Log\LoggerInterface;
use Psr\Log\LogLevel;

class DataService
{
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly DatabaseConnection $database
    ) {
    }
    
    /**
     * Perform database operation with proper error handling
     * 
     * @throws DatabaseException If database operation fails
     */
    public function performDatabaseOperation(): bool
    {
        try {
            $this->database->beginTransaction();
            
            // Perform operations
            $this->updateRecords();
            $this->cleanupOldData();
            
            $this->database->commit();
            
            $this->logger->info('Database operation completed successfully');
            return true;
            
        } catch (DatabaseException $e) {
            $this->database->rollback();
            
            // PSR-3 logging with context
            $this->logger->error('Database operation failed', [
                'exception' => $e,
                'operation' => 'performDatabaseOperation',
                'trace' => $e->getTraceAsString()
            ]);
            
            throw $e; // Re-throw for caller to handle
            
        } catch (\Throwable $e) {
            $this->database->rollback();
            
            // Log unexpected errors with critical level
            $this->logger->critical('Unexpected error in database operation', [
                'exception' => $e,
                'type' => get_class($e),
                'message' => $e->getMessage()
            ]);
            
            // Wrap in domain exception
            throw new DatabaseException(
                'Database operation failed: ' . $e->getMessage(),
                0,
                $e
            );
        }
    }
    
    /**
     * Process items with error collection
     * 
     * @param array<int, array> $items Items to process
     * @param array<string, array<string>> $messages Error collection
     * @return bool True if all successful
     */
    public function processItems(array $items, array &$messages): bool
    {
        $success = true;
        $processedCount = 0;
        $failedCount = 0;
        
        foreach ($items as $index => $item) {
            try {
                $this->validateItem($item);
                $this->processItem($item);
                $processedCount++;
                
            } catch (ValidationException $e) {
                $success = false;
                $failedCount++;
                
                $messages['error'][] = sprintf(
                    'Validation failed for item %d: %s',
                    $index,
                    $e->getMessage()
                );
                
                $this->logger->warning('Item validation failed', [
                    'item_index' => $index,
                    'error' => $e->getMessage(),
                    'item_data' => $item
                ]);
                
            } catch (\Exception $e) {
                $success = false;
                $failedCount++;
                
                $messages['error'][] = sprintf(
                    'Processing failed for item %d: %s',
                    $index,
                    $e->getMessage()
                );
                
                $this->logger->error('Item processing failed', [
                    'item_index' => $index,
                    'exception' => $e
                ]);
            }
        }
        
        // Summary logging
        $this->logger->info('Batch processing completed', [
            'total' => count($items),
            'processed' => $processedCount,
            'failed' => $failedCount,
            'success' => $success
        ]);
        
        return $success;
    }
}
```

### Custom Exception Classes

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Core\Exceptions;

/**
 * Base exception for MikoPBX
 */
class MikoPBXException extends \Exception
{
    protected array $context = [];
    
    public function __construct(
        string $message = '',
        int $code = 0,
        ?\Throwable $previous = null,
        array $context = []
    ) {
        parent::__construct($message, $code, $previous);
        $this->context = $context;
    }
    
    public function getContext(): array
    {
        return $this->context;
    }
}

/**
 * Database-specific exceptions
 */
class DatabaseException extends MikoPBXException
{
    public function __construct(
        string $message,
        int $code = 0,
        ?\Throwable $previous = null,
        ?string $query = null
    ) {
        $context = [];
        if ($query !== null) {
            $context['query'] = $query;
        }
        
        parent::__construct($message, $code, $previous, $context);
    }
}
```

## 9. Dependency Injection

### PSR-11 Container Usage with Phalcon

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Core\Controllers;

use Phalcon\Di\Di;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;

class ExtensionsController extends BaseController
{
    private LoggerInterface $logger;
    private ContainerInterface $container;
    
    public function onConstruct(): void
    {
        // Get PSR-11 compatible container
        $this->container = $this->di;
        
        // Get services following PSR-11
        $this->logger = $this->container->get(LoggerInterface::class);
    }
    
    /**
     * Get extension details via REST API
     */
    public function getDetailsAction(string $id): void
    {
        // Use container to get services
        $restClient = $this->container->get(PBXCoreRESTClientProvider::SERVICE_NAME);
        
        try {
            $response = $restClient->getExtension($id);
            $this->view->extension = $response;
            
        } catch (\Exception $e) {
            $this->logger->error('Failed to get extension details', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            
            $this->response->setStatusCode(500);
            $this->response->setJsonContent([
                'error' => 'Failed to load extension'
            ]);
        }
    }
}
```

### Service Provider Pattern (PSR-11 Compatible)

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Psr\Log\LoggerInterface;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Monolog\Handler\RotatingFileHandler;

/**
 * PSR-3 Logger provider
 */
class LoggerProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'logger';
    
    /**
     * Register logger service
     */
    public function register(DiInterface $di): void
    {
        // Register PSR-3 logger
        $di->setShared(LoggerInterface::class, function () use ($di) {
            $config = $di->get('config');
            $logger = new Logger('mikopbx');
            
            // Add rotating file handler
            $logPath = $config->path('core.logsDir') . '/application.log';
            $logger->pushHandler(
                new RotatingFileHandler($logPath, 7, Logger::INFO)
            );
            
            // Add error handler for critical errors
            $errorPath = $config->path('core.logsDir') . '/error.log';
            $logger->pushHandler(
                new StreamHandler($errorPath, Logger::ERROR)
            );
            
            return $logger;
        });
        
        // Alias for backward compatibility
        $di->setShared(self::SERVICE_NAME, function () use ($di) {
            return $di->get(LoggerInterface::class);
        });
    }
}
```

## 10. Database and Models

### Phalcon Model with PSR Standards

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Common\Models;

use MikoPBX\Common\Models\Traits\ValidationTrait;
use Phalcon\Di\Di;
use Phalcon\Mvc\Model\Relation;
use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness;
use Psr\SimpleCache\CacheInterface;

/**
 * PBX settings storage model
 * 
 * @property string $key Setting key
 * @property string $value Setting value
 * 
 * @method static PbxSettings|null findFirstByKey(string $key)
 * @method static ResultsetInterface find(array $parameters = [])
 */
class PbxSettings extends ModelsBase
{
    use PbxSettingsConstantsTrait;
    use PbxSettingsDefaultValuesTrait;
    use ValidationTrait;
    
    // PSR-12: Class constants with visibility
    private const string CACHE_PREFIX = 'settings:';
    private const int CACHE_TTL = 3600;
    
    public string $key = '';
    public string $value = '';
    
    /**
     * Initialize model relationships and behaviors
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
                'message' => 'Setting key must be unique',
                'field' => 'key'
            ])
        );
        
        return $this->validate($validation);
    }
    
    /**
     * Get setting value by key with caching
     * 
     * @param string $key Setting key
     * @return string Setting value or default
     */
    public static function getValueByKey(string $key): string
    {
        /** @var CacheInterface $cache */
        $cache = Di::getDefault()->get('cache');
        $cacheKey = self::CACHE_PREFIX . $key;
        
        try {
            // PSR-16 Simple Cache
            $value = $cache->get($cacheKey);
            if ($value !== null) {
                return (string) $value;
            }
            
            // Load from database
            $setting = self::findFirstByKey($key);
            $value = $setting !== null 
                ? $setting->value 
                : self::getDefaultValue($key);
            
            // Cache the result
            $cache->set($cacheKey, $value, self::CACHE_TTL);
            
            return $value;
            
        } catch (\Throwable $e) {
            // Log error and return default
            Di::getDefault()->get('logger')->error(
                'Failed to get setting',
                ['key' => $key, 'error' => $e->getMessage()]
            );
            
            return self::getDefaultValue($key);
        }
    }
    
    /**
     * Set setting value by key
     * 
     * @param string $key Setting key
     * @param string $value Setting value
     * @return bool Success status
     */
    public static function setValueByKey(string $key, string $value): bool
    {
        $setting = self::findFirstByKey($key) ?? new self();
        $setting->key = $key;
        $setting->value = $value;
        
        if ($setting->save()) {
            // Invalidate cache
            /** @var CacheInterface $cache */
            $cache = Di::getDefault()->get('cache');
            $cache->delete(self::CACHE_PREFIX . $key);
            
            return true;
        }
        
        return false;
    }
}
```

### Query Builder Best Practices

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Core\Repositories;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;
use Phalcon\Di\Injectable;

class ExtensionRepository extends Injectable
{
    /**
     * Find extensions with weak passwords
     * 
     * @return array<int, array{id: string, username: string, number: string, secret: string}>
     */
    public function findExtensionsWithWeakPasswords(): array
    {
        // PSR-12: Arrays on multiple lines when they're long
        $parameters = [
            'models' => [
                'Extensions' => Extensions::class,
            ],
            'conditions' => 'Extensions.is_general_user_number = :general: '
                         . 'AND Sip.weakSecret = :weak:',
            'bind' => [
                'general' => '1',
                'weak' => '1',
            ],
            'columns' => [
                'id' => 'Extensions.id',
                'username' => 'Extensions.callerid',
                'number' => 'Extensions.number',
                'secret' => 'Sip.secret',
            ],
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
            'order' => 'Extensions.number ASC',
        ];
        
        $query = $this->modelsManager
            ->createBuilder($parameters)
            ->getQuery();
        
        return $query->execute()->toArray();
    }
    
    /**
     * Find active extensions by type
     * 
     * @param string $type Extension type
     * @param int $limit Result limit
     * @return Extensions[]
     */
    public function findActiveByType(string $type, int $limit = 100): array
    {
        return Extensions::find([
            'conditions' => 'type = :type: AND disabled = :disabled:',
            'bind' => [
                'type' => $type,
                'disabled' => '0',
            ],
            'order' => 'number ASC',
            'limit' => $limit,
        ])->toArray();
    }
}
```

## 11. Background Workers

### Modern Worker Implementation

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers;

use MikoPBX\Core\System\SystemMessages;
use Psr\Log\LoggerInterface;

/**
 * Background worker for preparing system advice
 */
class WorkerPrepareAdvice extends WorkerBase
{
    // PSR-12: Class constants with visibility
    private const int CHECK_INTERVAL = 30;
    private const string WORKER_NAME = 'WorkerPrepareAdvice';
    
    private LoggerInterface $logger;
    
    /**
     * Initialize worker
     */
    public function __construct()
    {
        parent::__construct();
        $this->logger = $this->di->get(LoggerInterface::class);
    }
    
    /**
     * Start worker process
     * 
     * @param array<string, mixed> $params Worker parameters
     */
    public function start(array $params = []): void
    {
        $this->logger->info('Starting advice preparation worker', [
            'worker' => self::WORKER_NAME,
            'params' => $params
        ]);
        
        SystemMessages::echoGreenToTeletype('Starting advice preparation worker...');
        
        $this->workerLoop();
    }
    
    /**
     * Main worker loop
     */
    private function workerLoop(): void
    {
        while (!$this->needRestart) {
            try {
                $startTime = microtime(true);
                
                $this->processAdvice();
                
                $executionTime = microtime(true) - $startTime;
                $this->logger->debug('Advice processing completed', [
                    'execution_time' => round($executionTime, 3)
                ]);
                
                // Sleep before next iteration
                $this->sleepWorker(self::CHECK_INTERVAL);
                
            } catch (\Throwable $e) {
                $this->logger->error('Worker error', [
                    'worker' => self::WORKER_NAME,
                    'exception' => $e,
                    'trace' => $e->getTraceAsString()
                ]);
                
                // Brief pause on error
                sleep(5);
            }
        }
        
        $this->logger->info('Worker stopped', ['worker' => self::WORKER_NAME]);
    }
    
    /**
     * Process system advice
     */
    private function processAdvice(): void
    {
        $advice = $this->collectSystemAdvice();
        
        if (!empty($advice['error']) || !empty($advice['warning'])) {
            $this->publishAdvice($advice);
        }
    }
    
    /**
     * Collect system advice
     * 
     * @return array{error: array, warning: array, info: array}
     */
    private function collectSystemAdvice(): array
    {
        $advice = [
            'error' => [],
            'warning' => [],
            'info' => []
        ];
        
        // Check various system aspects
        $this->checkPasswords($advice);
        $this->checkDiskSpace($advice);
        $this->checkSystemResources($advice);
        
        return $advice;
    }
    
    /**
     * Check for weak passwords
     * 
     * @param array<string, array> $advice Advice array to populate
     */
    private function checkPasswords(array &$advice): void
    {
        if ($this->hasWeakPasswords()) {
            $advice['warning'][] = [
                'messageTpl' => 'adv_WeakPasswordsDetected',
                'messageParams' => [
                    'count' => $this->getWeakPasswordCount()
                ]
            ];
        }
    }
}
```

## 12. Modern PHP Features

### PHP 8.3 Features in Use

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Core\System;

/**
 * Demonstrates modern PHP 8.3 features
 */
class ModernPHPExample
{
    // PHP 8.3: Typed class constants
    private const string VERSION = '2024.1.0';
    private const int MAX_RETRIES = 3;
    private const array ALLOWED_TYPES = ['sip', 'iax', 'pjsip'];
    
    // PHP 8.2: Readonly classes (if entire class is readonly)
    // readonly class ImmutableConfig { }
    
    // PHP 8.1: Readonly properties
    public function __construct(
        private readonly string $environment,
        private readonly array $config,
        private readonly ?LoggerInterface $logger = null
    ) {
    }
    
    // PHP 8.1: Enums with methods
    public function getExtensionPriority(ExtensionType $type): int
    {
        return match ($type) {
            ExtensionType::SIP => 1,
            ExtensionType::PJSIP => 2,
            ExtensionType::IAX => 3,
            ExtensionType::EXTERNAL => 99,
        };
    }
    
    // PHP 8.0: Named arguments in action
    public function createExtension(string $number, string $name): Extension
    {
        return new Extension(
            number: $number,
            callerid: $name,
            type: ExtensionType::SIP,
            recordCalls: true,
            // Can skip optional parameters
        );
    }
    
    // PHP 8.0: Union types
    public function normalize(string|int|float $value): string
    {
        return match (true) {
            is_string($value) => trim($value),
            is_int($value) => (string) $value,
            is_float($value) => number_format($value, 2),
        };
    }
    
    // PHP 8.0: Null safe operator
    public function getConfigValue(string $key): ?string
    {
        return $this->config['settings']?->get($key)?->toString();
    }
    
    // PHP 8.1: First-class callable syntax
    public function getProcessors(): array
    {
        return [
            $this->processString(...),
            $this->processInteger(...),
            $this->processFloat(...),
        ];
    }
    
    // PHP 8.1: Never return type
    private function throwError(string $message): never
    {
        throw new \RuntimeException($message);
    }
    
    // PHP 8.2: DNF Types (Disjunctive Normal Form)
    public function process(
        (CountableInterface&IteratorInterface)|array $data
    ): void {
        foreach ($data as $item) {
            // Process item
        }
    }
}

// PHP 8.1: Enums
enum ExtensionType: string
{
    case SIP = 'SIP';
    case PJSIP = 'PJSIP';
    case IAX = 'IAX';
    case EXTERNAL = 'EXTERNAL';
    
    public function isInternal(): bool
    {
        return $this !== self::EXTERNAL;
    }
    
    public function getDisplayName(): string
    {
        return match ($this) {
            self::SIP => 'SIP (chan_sip)',
            self::PJSIP => 'PJSIP (chan_pjsip)',
            self::IAX => 'IAX2',
            self::EXTERNAL => 'External',
        };
    }
}
```

### Attributes (PHP 8.0+)

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Core\Attributes;

use Attribute;

/**
 * Custom attributes for MikoPBX
 */
#[Attribute(Attribute::TARGET_METHOD)]
class RequiresAuthentication
{
    public function __construct(
        public readonly string $permission = 'read'
    ) {
    }
}

#[Attribute(Attribute::TARGET_CLASS | Attribute::TARGET_METHOD)]
class Deprecated
{
    public function __construct(
        public readonly string $reason,
        public readonly ?string $replacement = null
    ) {
    }
}

// Usage
class ExtensionController
{
    #[RequiresAuthentication(permission: 'write')]
    public function updateAction(int $id): void
    {
        // Method implementation
    }
    
    #[Deprecated(
        reason: 'Use updateAction instead',
        replacement: 'updateAction'
    )]
    public function modifyAction(int $id): void
    {
        // Legacy method
    }
}
```

## 13. MikoPBX-Specific Patterns

### System Messages with PSR-3 Integration

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Core\System;

use Psr\Log\LoggerInterface;
use Psr\Log\LogLevel;

/**
 * Enhanced system messages with PSR-3 support
 */
class SystemMessages
{
    private static ?LoggerInterface $logger = null;
    
    /**
     * Set PSR-3 logger
     */
    public static function setLogger(LoggerInterface $logger): void
    {
        self::$logger = $logger;
    }
    
    /**
     * Output colored message to console
     */
    public static function echoGreenToTeletype(string $message): void
    {
        echo "\033[32m{$message}\033[0m\n";
        self::$logger?->info($message);
    }
    
    public static function echoRedToTeletype(string $message): void
    {
        echo "\033[31m{$message}\033[0m\n";
        self::$logger?->error($message);
    }
    
    /**
     * PSR-3 compatible system log
     */
    public static function sysLogMsg(
        string $ident,
        string $message,
        int $priority = LOG_INFO,
        array $context = []
    ): void {
        // Map syslog priority to PSR-3 levels
        $level = match ($priority) {
            LOG_EMERG, LOG_ALERT => LogLevel::EMERGENCY,
            LOG_CRIT => LogLevel::CRITICAL,
            LOG_ERR => LogLevel::ERROR,
            LOG_WARNING => LogLevel::WARNING,
            LOG_NOTICE => LogLevel::NOTICE,
            LOG_INFO => LogLevel::INFO,
            LOG_DEBUG => LogLevel::DEBUG,
            default => LogLevel::INFO,
        };
        
        // Add ident to context
        $context['ident'] = $ident;
        
        // Log via PSR-3 if available
        self::$logger?->log($level, $message, $context);
        
        // Also log to syslog for backward compatibility
        openlog($ident, LOG_PID | LOG_PERROR, LOG_LOCAL0);
        syslog($priority, $message);
        closelog();
    }
}
```

### Configuration Pattern with Type Safety

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Core\Config;

use MikoPBX\Common\Models\PbxSettings;

/**
 * Type-safe configuration accessor
 */
class ConfigManager
{
    private array $cache = [];
    
    /**
     * Get string configuration value
     */
    public function getString(string $key, string $default = ''): string
    {
        return (string) $this->getValue($key, $default);
    }
    
    /**
     * Get integer configuration value
     */
    public function getInt(string $key, int $default = 0): int
    {
        return (int) $this->getValue($key, $default);
    }
    
    /**
     * Get boolean configuration value
     */
    public function getBool(string $key, bool $default = false): bool
    {
        $value = $this->getValue($key, $default);
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }
    
    /**
     * Get array configuration value
     */
    public function getArray(string $key, array $default = []): array
    {
        $value = $this->getValue($key, '');
        if (empty($value)) {
            return $default;
        }
        
        try {
            $decoded = json_decode($value, true, 512, JSON_THROW_ON_ERROR);
            return is_array($decoded) ? $decoded : $default;
        } catch (\JsonException) {
            return $default;
        }
    }
    
    /**
     * Get raw value from settings
     */
    private function getValue(string $key, mixed $default): mixed
    {
        if (!isset($this->cache[$key])) {
            $this->cache[$key] = PbxSettings::getValueByKey($key) ?: $default;
        }
        
        return $this->cache[$key];
    }
    
    /**
     * Clear configuration cache
     */
    public function clearCache(): void
    {
        $this->cache = [];
    }
}
```

## 14. Code Quality Tools

### PHP CS Fixer Configuration

```php
<?php
// .php-cs-fixer.php

$finder = PhpCsFixer\Finder::create()
    ->in(__DIR__ . '/src')
    ->exclude('vendor')
    ->exclude('cache')
    ->name('*.php')
    ->notName('*.blade.php');

return (new PhpCsFixer\Config())
    ->setRules([
        // PSR-12 is the base
        '@PSR12' => true,
        
        // Additional rules for modern PHP
        'array_syntax' => ['syntax' => 'short'],
        'binary_operator_spaces' => ['default' => 'single_space'],
        'blank_line_after_opening_tag' => true,
        'blank_line_before_statement' => [
            'statements' => ['return', 'throw', 'try'],
        ],
        'cast_spaces' => true,
        'class_attributes_separation' => [
            'elements' => [
                'const' => 'one',
                'method' => 'one',
                'property' => 'one',
            ],
        ],
        'concat_space' => ['spacing' => 'one'],
        'declare_equal_normalize' => ['space' => 'none'],
        'declare_strict_types' => true,
        'function_typehint_space' => true,
        'lowercase_cast' => true,
        'lowercase_static_reference' => true,
        'method_argument_space' => [
            'on_multiline' => 'ensure_fully_multiline',
        ],
        'no_blank_lines_after_class_opening' => true,
        'no_blank_lines_after_phpdoc' => true,
        'no_empty_phpdoc' => true,
        'no_empty_statement' => true,
        'no_leading_import_slash' => true,
        'no_leading_namespace_whitespace' => true,
        'no_mixed_echo_print' => ['use' => 'echo'],
        'no_multiline_whitespace_around_double_arrow' => true,
        'no_short_bool_cast' => true,
        'no_singleline_whitespace_before_semicolons' => true,
        'no_spaces_around_offset' => true,
        'no_trailing_comma_in_list_call' => true,
        'no_trailing_comma_in_singleline_array' => true,
        'no_unneeded_control_parentheses' => true,
        'no_unused_imports' => true,
        'no_whitespace_before_comma_in_array' => true,
        'no_whitespace_in_blank_line' => true,
        'normalize_index_brace' => true,
        'object_operator_without_whitespace' => true,
        'ordered_imports' => ['sort_algorithm' => 'alpha'],
        'phpdoc_align' => ['align' => 'left'],
        'phpdoc_annotation_without_dot' => true,
        'phpdoc_indent' => true,
        'phpdoc_no_access' => true,
        'phpdoc_no_alias_tag' => true,
        'phpdoc_no_package' => true,
        'phpdoc_no_useless_inheritdoc' => true,
        'phpdoc_return_self_reference' => true,
        'phpdoc_scalar' => true,
        'phpdoc_single_line_var_spacing' => true,
        'phpdoc_summary' => true,
        'phpdoc_to_comment' => true,
        'phpdoc_trim' => true,
        'phpdoc_types' => true,
        'phpdoc_var_without_name' => true,
        'return_type_declaration' => true,
        'self_accessor' => true,
        'short_scalar_cast' => true,
        'single_blank_line_before_namespace' => true,
        'single_class_element_per_statement' => true,
        'single_line_comment_style' => true,
        'single_quote' => true,
        'space_after_semicolon' => true,
        'standardize_not_equals' => true,
        'ternary_operator_spaces' => true,
        'trailing_comma_in_multiline' => ['elements' => ['arrays']],
        'trim_array_spaces' => true,
        'unary_operator_spaces' => true,
        'whitespace_after_comma_in_array' => true,
    ])
    ->setRiskyAllowed(true)
    ->setFinder($finder);
```

### PHPStan Configuration

```yaml
# phpstan.neon
includes:
    - vendor/phpstan/phpstan-strict-rules/rules.neon
    - vendor/phpstan/phpstan-deprecation-rules/rules.neon

parameters:
    level: 8
    
    paths:
        - src
        
    excludePaths:
        - src/*/cache/*
        - src/*/vendor/*
        
    # PHP 8.3 support
    phpVersion: 80300
    
    # Treat PHPDoc types as certain
    treatPhpDocTypesAsCertain: true
    
    # Check for dead code
    checkAlwaysTrueCheckTypeFunctionCall: true
    checkAlwaysTrueInstanceof: true
    checkAlwaysTrueStrictComparison: true
    
    # Strict rules
    checkExplicitMixedMissingReturn: true
    checkFunctionNameCase: true
    checkInternalClassCaseSensitivity: true
    
    # Ignore specific errors if needed
    ignoreErrors:
        - '#Call to an undefined method Phalcon\\Mvc\\Model::#'
        
    # Stub files for better analysis
    stubFiles:
        - stubs/Phalcon.stub
```

### Composer Scripts

```json
{
    "scripts": {
        "analyze": "phpstan analyse",
        "cs-check": "php-cs-fixer fix --dry-run --diff",
        "cs-fix": "php-cs-fixer fix",
        "test": "phpunit",
        "quality": [
            "@cs-check",
            "@analyze",
            "@test"
        ]
    },
    "scripts-descriptions": {
        "analyze": "Run PHPStan static analysis",
        "cs-check": "Check code style without fixing",
        "cs-fix": "Fix code style issues",
        "test": "Run PHPUnit tests",
        "quality": "Run all quality checks"
    }
}
```

### Git Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Running pre-commit checks..."

# PHP syntax check
echo "Checking PHP syntax..."
for file in $(git diff --cached --name-only --diff-filter=ACM | grep '\.php$'); do
    php -l "$file" > /dev/null
    if [ $? -ne 0 ]; then
        echo -e "${RED}Syntax error in $file${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ PHP syntax check passed${NC}"

# PSR-12 compliance check
echo "Checking PSR-12 compliance..."
vendor/bin/php-cs-fixer fix --dry-run --diff --config=.php-cs-fixer.php > /dev/null
if [ $? -ne 0 ]; then
    echo -e "${RED}Code style issues found. Run 'composer cs-fix' to fix them.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PSR-12 check passed${NC}"

# PHPStan analysis
echo "Running static analysis..."
vendor/bin/phpstan analyse --no-progress
if [ $? -ne 0 ]; then
    echo -e "${RED}Static analysis failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Static analysis passed${NC}"

echo -e "${GREEN}All checks passed!${NC}"
```

## Summary

This updated style guide aligns MikoPBX development with PSR standards while maintaining project-specific conventions. Key improvements:

1. **Full PSR Compliance**: PSR-1, PSR-4, PSR-12 for code style
2. **Modern PHP Features**: Leveraging PHP 8.0-8.3 capabilities
3. **Type Safety**: Comprehensive type declarations and strict types
4. **Better Documentation**: PSR-5/19 compatible PHPDoc
5. **Consistent Structure**: Clear organization following PSR-12
6. **Enhanced Error Handling**: PSR-3 logging integration
7. **Quality Tools**: Automated checking for standards compliance

When contributing to MikoPBX:
- Always use `declare(strict_types=1)`
- Follow PSR-12 for formatting
- Use type declarations everywhere possible
- Write comprehensive documentation
- Run quality checks before committing
- Leverage modern PHP features appropriately
- Maintain backward compatibility where required

This guide ensures code consistency, maintainability, and alignment with PHP community standards.