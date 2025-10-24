---
name: php-style
description: Проверка соответствия PHP кода стандартам PSR и паттернам MikoPBX. Использовать при написании нового PHP кода, рефакторинге существующего кода или проверке качества кода. Валидирует соответствие PSR-1, PSR-4, PSR-12 и современным возможностям PHP 8.3.
allowed-tools: Read, Grep, Glob
---

# PHP Code Standards Skill

This skill ensures all PHP code in MikoPBX follows PSR standards and project-specific conventions.

## When to Use This Skill

Use this skill when:
- Writing new PHP classes, methods, or functions
- Refactoring existing PHP code
- Reviewing code for quality and standards compliance
- Preparing code for commit (pre-commit validation)
- Debugging code style issues flagged by PHPStan or PHP CS Fixer

## Core Principles

### 1. PSR Compliance First

MikoPBX strictly follows these PSR standards:
- **PSR-1**: Basic Coding Standard
- **PSR-4**: Autoloader Standard
- **PSR-12**: Extended Coding Style
- **PSR-3**: Logger Interface (where applicable)
- **PSR-11**: Container Interface (for DI)

See [PSR_STANDARDS.md](PSR_STANDARDS.md) for detailed compliance requirements.

### 2. Modern PHP 8.3 Features

Always leverage modern PHP capabilities:
- Strict types declaration: `declare(strict_types=1);`
- Typed properties and constants
- Constructor property promotion
- Named arguments
- Match expressions over switch
- Readonly properties
- Enums for type safety
- Union and intersection types

### 3. Type Safety

**CRITICAL**: Every property, parameter, and return value MUST have explicit type declarations.

```php
// ✅ CORRECT: Fully typed
public function processExtension(string $number, ?array $config = null): Extension|null
{
    // ...
}

// ❌ WRONG: Missing types
public function processExtension($number, $config = null)
{
    // ...
}
```

## Quick Reference Checklist

Before committing PHP code, verify:

- [ ] File has GPL v3 license header
- [ ] `declare(strict_types=1);` immediately after opening tag
- [ ] Namespace matches directory structure (PSR-4)
- [ ] All imports alphabetically sorted
- [ ] Class name in StudlyCaps/PascalCase
- [ ] Methods in camelCase
- [ ] All properties have visibility and type declarations
- [ ] All method parameters have type declarations
- [ ] All methods have return type declarations
- [ ] Constants in UPPER_CASE (except PBX setting keys which use PascalCase)
- [ ] PHPDoc blocks for complex methods and properties
- [ ] No mixed tabs/spaces (4 spaces for indentation)
- [ ] PHPStan analysis passes without errors
- [ ] Code formatted according to PSR-12

## File Structure Template

Every PHP file must follow this structure:

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

use MikoPBX\Common\Models\Extensions;
use Phalcon\Di\Di;
use Psr\Log\LoggerInterface;

/**
 * Controller for managing PBX extensions
 */
class ExtensionsController extends BaseController
{
    // Implementation
}
```

## Class Organization

Classes must be organized in this order:

1. **Constants** (visibility + type + UPPER_CASE)
2. **Properties** (grouped by visibility: public, protected, private)
3. **Constructor**
4. **Public methods**
5. **Protected methods**
6. **Private methods**
7. **Static methods** (at the very end)

Example:

```php
class ExampleService
{
    // 1. Constants
    private const int DEFAULT_TIMEOUT = 30;
    public const string VERSION = '1.0.0';

    // 2. Properties (by visibility)
    public bool $isEnabled = true;
    protected ?string $cacheKey = null;
    private array $config = [];

    // 3. Constructor
    public function __construct(
        private readonly LoggerInterface $logger
    ) {
    }

    // 4. Public methods
    public function execute(): void
    {
        // ...
    }

    // 5. Protected methods
    protected function validate(): bool
    {
        return true;
    }

    // 6. Private methods
    private function initialize(): void
    {
        // ...
    }

    // 7. Static methods
    public static function create(): self
    {
        return new self();
    }
}
```

## Naming Conventions

### Classes and Interfaces
- **Classes**: StudlyCaps/PascalCase
  - `ExtensionsController`, `PbxSettings`, `WorkerPrepareAdvice`
- **Interfaces**: PascalCase + `Interface` suffix
  - `WorkerInterface`, `ConfigProviderInterface`
- **Traits**: PascalCase + `Trait` suffix
  - `ValidationTrait`, `PbxSettingsConstantsTrait`
- **Enums**: PascalCase
  - `ExtensionType`, `LogLevel`

### Methods and Functions
- **Methods**: camelCase
  - `getDefaultCodecs()`, `validatePhoneNumber()`
- **Controller actions**: camelCase + `Action` suffix
  - `indexAction()`, `modifyAction()`
- **Boolean methods**: `is/has/can` prefix
  - `isSimplePassword()`, `hasPermission()`, `canModify()`

### Variables and Properties
- **Properties**: camelCase
  - `$userName`, `$activeExtensions`, `$maxRetryCount`
- **Constants**: UPPER_CASE with underscores
  - `MAX_RETRY_COUNT`, `DEFAULT_LANGUAGE`
- **PBX Settings**: PascalCase (MikoPBX convention)
  - `WebAdminLanguage`, `PBXTimezone`

## Error Handling Pattern

Use modern exception handling with PSR-3 logging:

```php
public function performOperation(): bool
{
    try {
        $this->database->beginTransaction();

        $this->updateRecords();
        $this->cleanupOldData();

        $this->database->commit();
        $this->logger->info('Operation completed');
        return true;

    } catch (DatabaseException $e) {
        $this->database->rollback();

        $this->logger->error('Database operation failed', [
            'exception' => $e,
            'trace' => $e->getTraceAsString()
        ]);

        throw $e;

    } catch (\Throwable $e) {
        $this->database->rollback();

        $this->logger->critical('Unexpected error', [
            'exception' => $e,
            'type' => get_class($e)
        ]);

        throw new DatabaseException(
            'Operation failed: ' . $e->getMessage(),
            0,
            $e
        );
    }
}
```

## Dependency Injection

Use PSR-11 container and constructor injection:

```php
use Phalcon\Di\Di;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;

class ExtensionsController extends BaseController
{
    private LoggerInterface $logger;

    public function onConstruct(): void
    {
        // Get services from PSR-11 container
        $this->logger = $this->di->get(LoggerInterface::class);
    }
}
```

For modern services, use constructor property promotion:

```php
class DataService
{
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly DatabaseConnection $database
    ) {
    }
}
```

## Documentation Standards

Use PHPDoc for complex methods:

```php
/**
 * Update extension codecs based on provided data
 *
 * This method processes codec configuration from form submission,
 * validates the data, and updates the database accordingly.
 *
 * @param string $codecsData JSON-encoded codec configuration
 * @param array<string, array<string>> $messages Error collection (by reference)
 *
 * @return bool True if update successful, false otherwise
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
```

**Best practices:**
- Use typed arrays: `@var array<string, mixed>`
- Document all thrown exceptions
- Use `@since` tags for tracking features
- Avoid redundant documentation for obvious code
- Keep PHPDoc aligned with actual code

## Code Quality Validation

### Running PHPStan

Analyze code before committing:

```bash
# Analyze specific file
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse "/path/to/file.php"

# Analyze entire directory
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse src/
```

### Using PHP CS Fixer

Format code according to PSR-12:

```bash
# Check code style
composer cs-check

# Fix code style issues
composer cs-fix
```

## Common Patterns

### Phalcon Model

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Common\Models;

use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness;

/**
 * PBX settings storage model
 *
 * @property string $key
 * @property string $value
 *
 * @method static PbxSettings|null findFirstByKey(string $key)
 */
class PbxSettings extends ModelsBase
{
    private const string CACHE_PREFIX = 'settings:';
    private const int CACHE_TTL = 3600;

    public string $key = '';
    public string $value = '';

    public function initialize(): void
    {
        $this->setSource('m_PbxSettings');
        parent::initialize();
    }

    public function validation(): bool
    {
        $validation = new Validation();

        $validation->add('key', new Uniqueness([
            'message' => 'Setting key must be unique'
        ]));

        return $this->validate($validation);
    }
}
```

### Background Worker

```php
<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers;

use Psr\Log\LoggerInterface;

/**
 * Background worker for system monitoring
 */
class WorkerMonitor extends WorkerBase
{
    private const int CHECK_INTERVAL = 30;

    private LoggerInterface $logger;

    public function __construct()
    {
        parent::__construct();
        $this->logger = $this->di->get(LoggerInterface::class);
    }

    public function start(array $params = []): void
    {
        $this->logger->info('Starting monitor worker');

        while (!$this->needRestart) {
            try {
                $this->checkSystem();
                $this->sleepWorker(self::CHECK_INTERVAL);
            } catch (\Throwable $e) {
                $this->logger->error('Worker error', [
                    'exception' => $e
                ]);
                sleep(5);
            }
        }
    }
}
```

### REST API Controller

```php
<?php

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Controllers\Extensions;

use MikoPBX\PBXCoreREST\Controllers\BaseController;

/**
 * REST API controller for extensions management
 */
class RestController extends BaseController
{
    /**
     * Get extension by ID
     */
    public function getAction(string $id): void
    {
        try {
            $extension = Extensions::findFirst($id);

            if ($extension === null) {
                $this->sendNotFoundResponse();
                return;
            }

            $this->sendSuccessResponse($extension->toArray());

        } catch (\Throwable $e) {
            $this->logger->error('Failed to get extension', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);

            $this->sendErrorResponse($e->getMessage());
        }
    }
}
```

## Additional Resources

For comprehensive examples and detailed standards, see:

- **[PSR_STANDARDS.md](PSR_STANDARDS.md)** - Complete PSR compliance guide
- **[CODE_EXAMPLES.md](CODE_EXAMPLES.md)** - Real-world code examples
- **[QUALITY_TOOLS.md](QUALITY_TOOLS.md)** - Automation and tooling

## Workflow Integration

### Before Writing Code
1. Check existing similar files for patterns
2. Review relevant sections in this skill
3. Set up your IDE to use 4 spaces (not tabs)

### While Writing Code
1. Follow the file structure template
2. Add type declarations to everything
3. Use modern PHP features (enums, match, readonly)
4. Write PHPDoc for complex logic

### Before Committing
1. Run PHPStan: `vendor/bin/phpstan analyse file.php`
2. Run PHP CS Fixer: `composer cs-fix`
3. Verify checklist above is complete
4. Review changes for consistency

### After Review
1. Address all PHPStan warnings
2. Fix any PSR-12 violations
3. Add tests for new functionality
4. Update documentation if needed

## Common Mistakes to Avoid

❌ **DON'T:**
- Use short PHP tags `<?` or `<?=`
- Mix tabs and spaces for indentation
- Skip type declarations
- Use mixed-case or snake_case for method names (except Action suffix)
- Put opening brace on same line for classes
- Forget `declare(strict_types=1);`
- Skip PHPDoc for public APIs
- Use global variables
- Write methods longer than 50 lines without breaking them up

✅ **DO:**
- Always use `<?php` tags
- Use 4 spaces for indentation
- Declare types for everything
- Use camelCase for methods
- Put opening brace on new line for classes
- Always add strict types declaration
- Document complex public methods
- Use dependency injection
- Keep methods focused and concise

## Summary

This skill ensures:
- **Compliance**: All code follows PSR-1, PSR-4, PSR-12
- **Type Safety**: Strict types and full type declarations
- **Consistency**: Uniform coding patterns across project
- **Quality**: Automated validation with PHPStan and PHP CS Fixer
- **Maintainability**: Clean, documented, testable code
- **Modern PHP**: Leveraging PHP 8.3 features

When in doubt, refer to the detailed guides in the additional resources above.
