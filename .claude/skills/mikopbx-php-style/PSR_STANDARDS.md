# PSR Standards Compliance Guide

This document provides detailed guidance on PSR standards compliance for MikoPBX.

## Table of Contents

1. [PSR-1: Basic Coding Standard](#psr-1-basic-coding-standard)
2. [PSR-4: Autoloader Standard](#psr-4-autoloader-standard)
3. [PSR-12: Extended Coding Style](#psr-12-extended-coding-style)
4. [PSR-3: Logger Interface](#psr-3-logger-interface)
5. [PSR-11: Container Interface](#psr-11-container-interface)

---

## PSR-1: Basic Coding Standard

### Overview

PSR-1 defines basic coding elements required for shared PHP code.

### Requirements

#### 1. PHP Tags

**Rule**: Files MUST use only `<?php` and `<?=` tags.

```php
✅ CORRECT:
<?php
namespace MikoPBX\Core;

❌ WRONG:
<?
namespace MikoPBX\Core;

❌ WRONG:
<? echo $value; ?>

✅ CORRECT (for templates only):
<?= htmlspecialchars($value) ?>
```

#### 2. Character Encoding

**Rule**: Files MUST use only UTF-8 without BOM.

- Ensure your IDE/editor saves files as UTF-8 without BOM
- Check file encoding: `file -bi filename.php` should show `charset=utf-8`

#### 3. Side Effects

**Rule**: Files SHOULD either declare symbols (classes, functions, constants) OR cause side effects (generate output, change .ini settings, etc.) but SHOULD NOT do both.

```php
✅ CORRECT - Only declares symbols:
<?php
declare(strict_types=1);

namespace MikoPBX\Core\System;

class Configuration
{
    // Class definition only
}

❌ WRONG - Mixes declaration and side effects:
<?php
namespace MikoPBX\Core\System;

echo "Loading configuration..."; // Side effect

class Configuration
{
    // Class definition
}

✅ CORRECT - Only side effects (bootstrap file):
<?php
require_once 'vendor/autoload.php';
error_reporting(E_ALL);
ini_set('display_errors', '1');
```

#### 4. Namespace and Class Names

**Rule**: Namespaces and classes MUST follow PSR-4 autoloading standard.

**Rule**: Class names MUST be declared in StudlyCaps.

```php
✅ CORRECT:
namespace MikoPBX\AdminCabinet\Controllers;

class ExtensionsController
{
}

❌ WRONG:
namespace MikoPBX\AdminCabinet\Controllers;

class extensions_controller  // Wrong case
{
}
```

#### 5. Class Constants

**Rule**: Class constants MUST be declared in all upper case with underscore separators.

```php
✅ CORRECT:
class Configuration
{
    public const DEFAULT_TIMEOUT = 30;
    private const MAX_RETRY_COUNT = 3;
}

❌ WRONG:
class Configuration
{
    public const defaultTimeout = 30;  // Wrong case
    private const maxRetryCount = 3;   // Wrong case
}
```

**Exception**: MikoPBX PBX setting keys use PascalCase by convention:

```php
✅ CORRECT (MikoPBX convention):
class PbxSettings
{
    public const WebAdminLanguage = 'WebAdminLanguage';
    public const PBXTimezone = 'PBXTimezone';
}
```

#### 6. Method Names

**Rule**: Method names MUST be declared in camelCase.

```php
✅ CORRECT:
class ExtensionsController
{
    public function indexAction(): void
    {
    }

    public function getExtensionById(string $id): ?Extension
    {
    }

    private function validatePhoneNumber(string $number): bool
    {
        return true;
    }
}

❌ WRONG:
class ExtensionsController
{
    public function IndexAction(): void  // Wrong case
    {
    }

    public function get_extension_by_id(string $id): ?Extension  // Wrong case
    {
    }
}
```

---

## PSR-4: Autoloader Standard

### Overview

PSR-4 describes a specification for autoloading classes from file paths.

### Requirements

#### 1. Fully Qualified Class Name

The fully qualified class name has the form:

```
\<NamespaceName>(\<SubNamespaceNames>)*\<ClassName>
```

Example: `\MikoPBX\Core\System\Configuration`

#### 2. Namespace Prefix

The namespace prefix corresponds to a base directory:

- Namespace prefix: `MikoPBX\`
- Base directory: `src/`

#### 3. Directory Structure

The namespace structure MUST match the directory structure:

```php
✅ CORRECT:
Class: MikoPBX\AdminCabinet\Controllers\ExtensionsController
File:  src/AdminCabinet/Controllers/ExtensionsController.php

Class: MikoPBX\Core\System\Util
File:  src/Core/System/Util.php

Class: MikoPBX\Common\Models\Extensions
File:  src/Common/Models/Extensions.php

❌ WRONG:
Class: MikoPBX\AdminCabinet\Controllers\ExtensionsController
File:  src/controllers/extensions.php  // Wrong directory and filename
```

#### 4. Class File Naming

**Rule**: The file name MUST match the class name exactly and end in `.php`.

```php
✅ CORRECT:
Class: ExtensionsController
File:  ExtensionsController.php

❌ WRONG:
Class: ExtensionsController
File:  extensionscontroller.php  // Wrong case
File:  extensions_controller.php // Wrong format
File:  ExtensionsController.class.php  // Wrong suffix
```

---

## PSR-12: Extended Coding Style

### Overview

PSR-12 extends PSR-1 with comprehensive coding style rules.

### 1. General Rules

#### Files

- MUST use Unix LF line endings
- MUST end with a single blank line
- MUST use 4 spaces for indentation (NO TABS)
- Lines SHOULD NOT exceed 120 characters

#### Declare Statements

**Rule**: When present, `declare` statements MUST be on the first line after opening tag with no blank lines.

```php
✅ CORRECT:
<?php
declare(strict_types=1);

namespace MikoPBX\Core;

❌ WRONG:
<?php

declare(strict_types=1);  // Blank line before declare

namespace MikoPBX\Core;
```

**Rule**: There MUST be exactly one space after the `declare` keyword.

**Rule**: There MUST NOT be spaces around the equals sign.

```php
✅ CORRECT:
declare(strict_types=1);
declare(ticks=1);

❌ WRONG:
declare( strict_types = 1 );  // Extra spaces
```

#### Namespace and Use Declarations

**Rule**: There MUST be one blank line after the namespace declaration.

**Rule**: All `use` declarations MUST go after the namespace declaration.

**Rule**: There MUST be one `use` keyword per declaration.

**Rule**: There MUST be one blank line after the `use` block.

```php
✅ CORRECT:
<?php

declare(strict_types=1);

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\Extensions;
use Phalcon\Di\Di;
use Psr\Log\LoggerInterface;

class SystemConfiguration
{
}

❌ WRONG:
<?php
declare(strict_types=1);
namespace MikoPBX\Core\System;  // Missing blank line
use MikoPBX\Common\Models\Extensions;  // Missing blank line after namespace

class SystemConfiguration  // Missing blank line after use
{
}
```

**Rule**: `use` declarations SHOULD be alphabetically sorted.

```php
✅ CORRECT:
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;
use Phalcon\Di\Di;

❌ WRONG (not sorted):
use Phalcon\Di\Di;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\Users;
use MikoPBX\Common\Models\Sip;
```

**Allowed**: Grouped imports with curly braces:

```php
✅ ALLOWED:
use MikoPBX\Common\Models\{Extensions, Sip, Users};
use Phalcon\Http\{Request, Response};
```

### 2. Classes, Properties, and Methods

#### Class Declaration

**Rule**: Opening brace for classes MUST go on its own line.

**Rule**: Closing brace MUST go on the next line after the body.

```php
✅ CORRECT:
class ExtensionsController extends BaseController
{
    // Body
}

❌ WRONG:
class ExtensionsController extends BaseController {  // Brace on same line
    // Body
}
```

**Rule**: The `extends` and `implements` keywords MUST be on the same line as the class name.

```php
✅ CORRECT:
class ExtensionsController extends BaseController implements ControllerInterface
{
}

✅ CORRECT (multiple interfaces):
class ExtensionsController extends BaseController implements
    ControllerInterface,
    LoggableInterface,
    CacheableInterface
{
}

❌ WRONG:
class ExtensionsController
    extends BaseController
    implements ControllerInterface  // extends/implements on separate lines
{
}
```

#### Properties

**Rule**: Visibility MUST be declared on all properties.

**Rule**: The `var` keyword MUST NOT be used.

**Rule**: There MUST NOT be more than one property declared per statement.

```php
✅ CORRECT:
private string $name;
protected ?int $count = null;
public bool $isActive = false;

❌ WRONG:
var $name;  // No var keyword

private $name, $count;  // Multiple properties per statement

$name;  // No visibility
```

#### Methods

**Rule**: Visibility MUST be declared on all methods.

**Rule**: Opening brace MUST go on its own line.

**Rule**: Closing brace MUST go on the next line after the body.

```php
✅ CORRECT:
public function getExtensions(): array
{
    return [];
}

❌ WRONG:
public function getExtensions(): array {  // Brace on same line
    return [];
}

function getExtensions(): array  // No visibility
{
    return [];
}
```

**Rule**: There MUST NOT be a space after the method name.

**Rule**: There MUST NOT be a space after the opening parenthesis.

**Rule**: There MUST NOT be a space before the closing parenthesis.

```php
✅ CORRECT:
public function processExtension(string $id): void
{
}

❌ WRONG:
public function processExtension ( string $id ) : void  // Extra spaces
{
}
```

#### Method Arguments

**Rule**: In the argument list, there MUST NOT be a space before each comma, and there MUST be one space after each comma.

```php
✅ CORRECT:
public function createExtension(string $number, string $name, bool $enabled): Extension
{
}

❌ WRONG:
public function createExtension(string $number , string $name , bool $enabled): Extension  // Spaces before commas
{
}

public function createExtension(string $number,string $name,bool $enabled): Extension  // No spaces after commas
{
}
```

**Rule**: Method arguments with default values MUST go at the end.

```php
✅ CORRECT:
public function fetchData(string $url, int $timeout = 30, bool $retry = true): array
{
}

❌ WRONG:
public function fetchData(int $timeout = 30, string $url, bool $retry = true): array  // Default not at end
{
}
```

**Rule**: When splitting argument lists across multiple lines, each argument MUST be on its own line indented once.

```php
✅ CORRECT:
public function createComplexObject(
    string $name,
    int $priority,
    array $config,
    bool $enabled = true
): ComplexObject {
    // Implementation
}

❌ WRONG:
public function createComplexObject(
    string $name, int $priority,  // Multiple arguments per line
    array $config, bool $enabled = true
): ComplexObject {
}
```

### 3. Control Structures

#### General Rules

**Rule**: There MUST be one space after the control structure keyword.

**Rule**: There MUST NOT be a space after the opening parenthesis.

**Rule**: There MUST NOT be a space before the closing parenthesis.

**Rule**: There MUST be one space between the closing parenthesis and the opening brace.

**Rule**: The structure body MUST be indented once.

**Rule**: The body MUST be on the next line after the opening brace.

**Rule**: The closing brace MUST be on the next line after the body.

#### if, elseif, else

```php
✅ CORRECT:
if ($condition) {
    // Code
} elseif ($anotherCondition) {
    // Code
} else {
    // Code
}

❌ WRONG:
if($condition){  // No spaces
    // Code
}
elseif ($anotherCondition)  // elseif on separate line
{
    // Code
}
else {  // else on separate line
    // Code
}
```

#### switch, case

```php
✅ CORRECT:
switch ($value) {
    case 'option1':
        // Code
        break;

    case 'option2':
    case 'option3':
        // Code
        break;

    default:
        // Code
        break;
}

❌ WRONG:
switch ($value)
{  // Brace on separate line
    case 'option1':
    // Code not indented
    break;
}
```

**Note**: Prefer `match` expressions over `switch` in PHP 8.0+:

```php
✅ PREFERRED (PHP 8.0+):
$result = match ($value) {
    'option1' => 'result1',
    'option2', 'option3' => 'result2',
    default => 'default_result',
};
```

#### while, do while

```php
✅ CORRECT:
while ($condition) {
    // Code
}

do {
    // Code
} while ($condition);

❌ WRONG:
while ($condition)
{  // Brace on separate line
    // Code
}
```

#### for, foreach

```php
✅ CORRECT:
for ($i = 0; $i < 10; $i++) {
    // Code
}

foreach ($items as $key => $value) {
    // Code
}

❌ WRONG:
for($i=0;$i<10;$i++){  // Missing spaces
    // Code
}
```

#### try, catch, finally

```php
✅ CORRECT:
try {
    // Code
} catch (FirstException $e) {
    // Code
} catch (SecondException|ThirdException $e) {
    // Code
} finally {
    // Cleanup
}

❌ WRONG:
try {
    // Code
}
catch (FirstException $e)  // catch on separate line
{
    // Code
}
```

---

## PSR-3: Logger Interface

### Overview

PSR-3 defines a common interface for logging libraries.

### Requirements

#### Log Levels

Use standard PSR-3 log levels:

```php
use Psr\Log\LogLevel;

$logger->emergency($message, $context);  // System is unusable
$logger->alert($message, $context);      // Immediate action required
$logger->critical($message, $context);   // Critical conditions
$logger->error($message, $context);      // Runtime errors
$logger->warning($message, $context);    // Warning messages
$logger->notice($message, $context);     // Normal but significant
$logger->info($message, $context);       // Informational
$logger->debug($message, $context);      // Debug-level messages
```

#### Context Arrays

Always provide context for better debugging:

```php
✅ CORRECT:
$this->logger->error('Failed to save extension', [
    'extension_id' => $extensionId,
    'number' => $number,
    'error' => $e->getMessage(),
    'trace' => $e->getTraceAsString()
]);

❌ WRONG:
$this->logger->error('Failed to save extension');  // No context
```

#### Using Logger Interface

Always depend on the interface, not implementation:

```php
✅ CORRECT:
use Psr\Log\LoggerInterface;

class DataService
{
    public function __construct(
        private readonly LoggerInterface $logger
    ) {
    }
}

❌ WRONG:
use Monolog\Logger;

class DataService
{
    public function __construct(
        private readonly Logger $logger  // Depends on implementation
    ) {
    }
}
```

---

## PSR-11: Container Interface

### Overview

PSR-11 defines a common interface for dependency injection containers.

### Requirements

#### Container Usage

Access services via the PSR-11 interface:

```php
✅ CORRECT:
use Phalcon\Di\Di;
use Psr\Container\ContainerInterface;
use Psr\Log\LoggerInterface;

class ExtensionsController
{
    private LoggerInterface $logger;
    private ContainerInterface $container;

    public function onConstruct(): void
    {
        $this->container = $this->di;  // Phalcon DI is PSR-11 compatible
        $this->logger = $this->container->get(LoggerInterface::class);
    }
}

❌ WRONG:
use Phalcon\Di;

class ExtensionsController
{
    public function onConstruct(): void
    {
        // Direct access without interface
        $this->logger = Di::getDefault()->get('logger');
    }
}
```

#### Service Registration

Use interface names for service registration:

```php
✅ CORRECT:
use Psr\Log\LoggerInterface;
use Monolog\Logger;

$di->setShared(LoggerInterface::class, function () {
    return new Logger('mikopbx');
});

❌ WRONG:
$di->setShared('logger', function () {  // String identifier instead of interface
    return new Logger('mikopbx');
});
```

---

## Summary

Following PSR standards ensures:

1. **Interoperability**: Code works with other PSR-compliant libraries
2. **Consistency**: Uniform coding style across the project
3. **Maintainability**: Easier to read and understand
4. **Tooling**: Better IDE support and static analysis
5. **Community**: Aligned with PHP community best practices

When writing PHP code for MikoPBX, always verify compliance with these PSR standards.
