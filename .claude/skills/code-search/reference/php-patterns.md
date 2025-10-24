# PHP Search Patterns for ast-grep

Comprehensive collection of ast-grep patterns for searching PHP code in MikoPBX.

## Classes

### Basic Class Patterns

```bash
# Find all classes
sg -p 'class $NAME' -l php

# Find abstract classes
sg -p 'abstract class $NAME' -l php

# Find final classes
sg -p 'final class $NAME' -l php

# Find classes with specific name
sg -p 'class UserController' -l php
```

### Class Inheritance

```bash
# Find classes extending specific base
sg -p 'class $NAME extends BaseAction' -l php
sg -p 'class $NAME extends ModelsBase' -l php
sg -p 'class $NAME extends WorkerBase' -l php

# Find classes implementing interface
sg -p 'class $NAME implements $INTERFACE' -l php

# Find classes in specific files only
sg -p 'class $NAME' -l php --globs '*Action.php'
sg -p 'class $NAME' -l php --globs '*Processor.php'
sg -p 'class $NAME' -l php --globs 'Models/*.php'
```

### MikoPBX-Specific Classes

```bash
# REST API Actions
sg -p 'class $NAME extends BaseAction' -l php

# REST API Processors
sg -p 'class $NAME extends Injectable' -l php --globs '*Processor.php'

# Database Models
sg -p 'class $NAME extends ModelsBase' -l php

# Background Workers
sg -p 'class $NAME extends WorkerBase' -l php

# Service Providers
sg -p 'class $NAME extends DiProvider' -l php

# REST Controllers
sg -p 'class $NAME extends RestController' -l php
```

## Methods

### Method Visibility & Modifiers

```bash
# Public methods
sg -p 'public function $NAME' -l php

# Private methods
sg -p 'private function $NAME' -l php

# Protected methods
sg -p 'protected function $NAME' -l php

# Static methods
sg -p 'public static function $NAME' -l php
sg -p 'private static function $NAME' -l php

# Abstract methods
sg -p 'abstract public function $NAME' -l php

# Final methods
sg -p 'final public function $NAME' -l php
```

### Methods with Parameters

```bash
# Methods with any parameters
sg -p 'public function $NAME($$)' -l php

# Methods with specific parameter name
sg -p 'public function $NAME($request)' -l php

# Methods with typed parameters
sg -p 'public function $NAME(array $data)' -l php
sg -p 'public function $NAME(string $id)' -l php
```

### Methods with Return Types

```bash
# Methods returning specific type
sg -p 'public function $NAME(): array' -l php
sg -p 'public function $NAME(): string' -l php
sg -p 'public function $NAME(): PBXApiResult' -l php

# Methods returning void
sg -p 'public function $NAME(): void' -l php

# Methods with nullable return
sg -p 'public function $NAME(): ?string' -l php
```

### MikoPBX-Specific Methods

```bash
# Main action entry point
sg -p 'public static function main' -l php

# Callback methods in Processors
sg -p 'public static function callBack' -l php

# Parameter definitions
sg -p 'public static function getParameterDefinitions' -l php

# Related schemas
sg -p 'public static function getRelatedSchemas' -l php

# Model validation
sg -p 'public function validation' -l php

# Lifecycle hooks
sg -p 'public function initialize' -l php
sg -p 'public function afterSave' -l php
sg -p 'public function beforeDelete' -l php
```

### Finding Specific Method Names

```bash
# Specific method name
sg -p 'public static function callBack' -l php
sg -p 'public function validation' -l php

# Methods in Action files only
sg -p 'public static function main' -l php --globs '*Action.php'

# Methods matching pattern (combine with grep)
sg -p 'public function $NAME' -l php | grep -i 'save\|update\|create'
sg -p 'public function $NAME' -l php | grep -i 'get\|fetch\|load'
sg -p 'public function $NAME' -l php | grep -i 'delete\|remove'
```

## Properties & Constants

### Class Properties

```bash
# Public properties
sg -p 'public $PROP' -l php

# Private properties
sg -p 'private $PROP' -l php

# Protected properties
sg -p 'protected $PROP' -l php

# Static properties
sg -p 'public static $PROP' -l php
sg -p 'private static $PROP' -l php

# Typed properties
sg -p 'public string $name' -l php
sg -p 'private array $data' -l php
```

### Class Constants

```bash
# All constants
sg -p 'const $NAME' -l php

# Public constants
sg -p 'public const $NAME' -l php

# Constants with value
sg -p 'public const $NAME = $VALUE;' -l php

# Constants matching pattern (combine with grep)
sg -p 'public const $NAME' -l php | grep 'TYPE_'
sg -p 'public const $NAME' -l php | grep 'STATUS_'
sg -p 'const $NAME' -l php | grep 'ERROR_'
```

## Enums, Traits & Interfaces

### Enums (PHP 8.1+)

```bash
# All enums
sg -p 'enum $NAME' -l php

# String-backed enums
sg -p 'enum $NAME: string' -l php

# Int-backed enums
sg -p 'enum $NAME: int' -l php

# Enum in specific namespace
sg -p 'enum $NAME' -l php src/PBXCoreREST/
```

### Traits

```bash
# All traits
sg -p 'trait $NAME' -l php

# Trait usage in classes
sg -p 'use $TRAIT;' -l php | grep -v '^use [A-Z]'  # Filter out namespace imports

# Specific trait name
sg -p 'trait RecordRepresentation' -l php
```

### Interfaces

```bash
# All interfaces
sg -p 'interface $NAME' -l php

# Interface in specific directory
sg -p 'interface $NAME' -l php src/Modules/
```

## Namespaces & Imports

### Namespace Declarations

```bash
# All namespace declarations
sg -p 'namespace $NS;' -l php

# Specific namespace
sg -p 'namespace MikoPBX\\PBXCoreREST;' -l php

# Namespaces under specific root
sg -p 'namespace $NS;' -l php | grep 'MikoPBX\\Core'
sg -p 'namespace $NS;' -l php | grep 'MikoPBX\\Common'
```

### Use Statements (Imports)

```bash
# All use statements
sg -p 'use $CLASS;' -l php

# Find specific class imports
sg -p 'use $CLASS;' -l php | grep 'PBXApiResult'
sg -p 'use $CLASS;' -l php | grep 'ModelsBase'
sg -p 'use $CLASS;' -l php | grep 'Di\\Di'

# Find all files importing specific class
sg -p 'use $CLASS;' -l php | grep 'Extensions' | cut -d: -f1 | sort -u
```

## MikoPBX REST API Patterns

### Finding API Resources

```bash
# All DataStructure classes
sg -p 'public static function getParameterDefinitions' -l php

# All SaveRecordAction classes
sg -p 'class $NAME' -l php --globs 'Lib/*/SaveRecordAction.php'

# All GetRecordAction classes
sg -p 'class $NAME' -l php --globs 'Lib/*/GetRecordAction.php'

# All DeleteRecordAction classes
sg -p 'class $NAME' -l php --globs 'Lib/*/DeleteRecordAction.php'

# All Processor classes
sg -p 'class $NAME extends Injectable' -l php --globs '*Processor.php'

# All Action classes in specific resource
sg -p 'class $NAME' -l php --globs 'Lib/Extensions/Actions/*.php'
```

### REST API Methods

```bash
# Find all main() entry points
sg -p 'public static function main' -l php --globs 'Lib/*/Actions/*.php'

# Find all callBack() processors
sg -p 'public static function callBack' -l php --globs '*Processor.php'

# Find parameter definition methods
sg -p 'public static function getParameterDefinitions(): array' -l php

# Find schema relationship methods
sg -p 'public static function getRelatedSchemas(): array' -l php
```

## MikoPBX Model Patterns

### Finding Models

```bash
# All model classes
sg -p 'class $NAME extends ModelsBase' -l php

# Models in specific module
sg -p 'class $NAME extends ModelsBase' -l php src/Common/Models/

# Specific model
sg -p 'class Extensions extends ModelsBase' -l php
```

### Model Methods

```bash
# Validation methods
sg -p 'public function validation' -l php src/Common/Models/

# Lifecycle hooks
sg -p 'public function initialize' -l php src/Common/Models/
sg -p 'public function afterSave' -l php src/Common/Models/
sg -p 'public function beforeDelete' -l php src/Common/Models/

# Dynamic getters
sg -p 'public function get$NAME' -l php src/Common/Models/
```

## MikoPBX Worker Patterns

```bash
# All worker classes
sg -p 'class $NAME extends WorkerBase' -l php

# Worker main loop
sg -p 'public function start' -l php --globs 'Worker*.php'

# Worker in specific directory
sg -p 'class $NAME extends WorkerBase' -l php src/Core/Workers/
```

## Combining Patterns with File Filters

### By File Type

```bash
# Only Action files
sg -p 'public static function main' -l php --globs '*Action.php'

# Only Processor files
sg -p 'public static function callBack' -l php --globs '*Processor.php'

# Only Model files
sg -p 'public function validation' -l php --globs '*Models/*.php'

# Exclude Test files
sg -p 'class $NAME' -l php --globs '!*Test.php'
```

### By Directory

```bash
# Only REST API
sg -p 'class $NAME' -l php src/PBXCoreREST/

# Only Models
sg -p 'class $NAME extends ModelsBase' -l php src/Common/Models/

# Only Workers
sg -p 'class $NAME extends WorkerBase' -l php src/Core/Workers/

# Specific resource
sg -p 'public static function main' -l php src/PBXCoreREST/Lib/Extensions/
```

## Post-Processing Results

### Extract File Names Only

```bash
# Unique list of files
sg -p 'class $NAME extends BaseAction' -l php | cut -d: -f1 | sort -u
```

### Count Matches

```bash
# Count total matches
sg -p 'public const $NAME' -l php | grep -c '^'

# Count files with matches
sg -p 'enum $NAME' -l php | cut -d: -f1 | sort -u | wc -l
```

### Filter by Content

```bash
# Find methods with specific return type
sg -p 'public function $NAME(): $TYPE' -l php | grep 'PBXApiResult'

# Find constants starting with TYPE_
sg -p 'public const $NAME' -l php | grep "const TYPE_"

# Find save/update/create methods
sg -p 'public function $NAME' -l php | grep -E 'save|update|create'
```

## Performance Tips for PHP Searches

### 1. Use Specific Globs

```bash
# ✅ Fast - targeted search
sg -p 'public static function main' -l php --globs 'Lib/*/SaveRecordAction.php'

# ❌ Slow - searches all PHP files
sg -p 'public static function main' -l php
```

### 2. Limit Scope to Directory

```bash
# ✅ Fast - specific directory
sg -p 'class $NAME extends ModelsBase' -l php src/Common/Models/

# ❌ Slower - entire codebase
sg -p 'class $NAME extends ModelsBase' -l php
```

### 3. Combine Tools Efficiently

```bash
# ✅ Good - ast-grep then grep filter
sg -p 'public function $NAME' -l php | grep 'function get'

# ❌ Less efficient - grep then ast-grep
grep -r 'function get' . | sg -p 'public function $NAME' -l php
```

## Common PHP Pitfalls

### 1. Forgetting Semicolons

```bash
# ❌ May not match
sg -p 'const $NAME = $VALUE' -l php

# ✅ Correct
sg -p 'const $NAME = $VALUE;' -l php
```

### 2. Visibility Modifiers Matter

```bash
# ❌ Too specific - misses private/protected
sg -p 'public function $NAME' -l php

# ✅ To match all visibilities, search each separately or use grep
sg -p 'function $NAME' -l php  # May not work as expected
sg -p 'public function $NAME' -l php  # Better
```

### 3. Static Keyword Position

```bash
# ✅ Correct order
sg -p 'public static function $NAME' -l php

# ❌ Wrong order
sg -p 'static public function $NAME' -l php  # Won't match
```

## Summary

**Most Used PHP Patterns**:
```bash
# Classes
sg -p 'class $NAME extends $BASE' -l php

# Methods
sg -p 'public static function $NAME' -l php

# Constants
sg -p 'public const $NAME' -l php | grep 'TYPE_'

# Imports
sg -p 'use $CLASS;' -l php | grep 'ClassName'
```

**Next Steps**:
- See [pattern-syntax.md](pattern-syntax.md) for pattern fundamentals
- See [js-patterns.md](js-patterns.md) for JavaScript patterns
- See [../examples/mikopbx-patterns.md](../examples/mikopbx-patterns.md) for real-world examples
