# Code Quality Tools and Automation

This document describes the tools and automation used to maintain PHP code quality in MikoPBX.

## Table of Contents

1. [PHPStan - Static Analysis](#phpstan---static-analysis)
2. [PHP CS Fixer - Code Style](#php-cs-fixer---code-style)
3. [Composer Scripts](#composer-scripts)
4. [Git Hooks](#git-hooks)
5. [Docker Integration](#docker-integration)
6. [IDE Configuration](#ide-configuration)

---

## PHPStan - Static Analysis

### Overview

PHPStan performs static analysis to find bugs before runtime. MikoPBX uses PHPStan level 8 (strictest).

### Configuration

File: `phpstan.neon`

```yaml
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

### Usage

#### Analyze Single File

```bash
# Inside Docker container
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse "/path/to/file.php"

# From host (if composer installed)
vendor/bin/phpstan analyse src/AdminCabinet/Controllers/ExtensionsController.php
```

#### Analyze Directory

```bash
# Analyze entire src directory
vendor/bin/phpstan analyse src/

# Analyze specific subdirectory
vendor/bin/phpstan analyse src/Core/Workers/

# With progress and debugging
vendor/bin/phpstan analyse src/ --debug
```

#### Generate Baseline

For existing code with errors, create a baseline:

```bash
vendor/bin/phpstan analyse --generate-baseline
```

This creates `phpstan-baseline.neon` with existing errors, allowing you to fix them incrementally.

### Common PHPStan Errors and Fixes

#### Missing Type Declaration

```php
❌ Error: Method has no return type specified

public function getName()
{
    return $this->name;
}

✅ Fix:

public function getName(): string
{
    return $this->name;
}
```

#### Nullable Return Not Declared

```php
❌ Error: Method might return null but return type doesn't allow it

public function findExtension(string $number): Extension
{
    return Extensions::findFirstByNumber($number); // Can be null
}

✅ Fix:

public function findExtension(string $number): ?Extension
{
    return Extensions::findFirstByNumber($number);
}
```

#### Mixed Type Usage

```php
❌ Error: Parameter $data has no type specified

public function process($data)
{
    // ...
}

✅ Fix:

public function process(array $data): void
{
    // ...
}

// Or if truly mixed:

public function process(mixed $data): void
{
    // ...
}
```

#### Possible Null Reference

```php
❌ Error: Cannot call method on possibly null value

$extension = Extensions::findFirst($id);
$name = $extension->getName(); // $extension might be null

✅ Fix:

$extension = Extensions::findFirst($id);
if ($extension === null) {
    throw new NotFoundException("Extension not found");
}
$name = $extension->getName();

// Or use null-safe operator (PHP 8.0+):
$name = Extensions::findFirst($id)?->getName();
```

---

## PHP CS Fixer - Code Style

### Overview

PHP CS Fixer automatically fixes code to comply with PSR-12 and additional rules.

### Configuration

File: `.php-cs-fixer.php`

```php
<?php

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
        'no_trailing_comma_in_singleline_array' => true,
        'no_unneeded_control_parentheses' => true,
        'no_unused_imports' => true,
        'no_whitespace_before_comma_in_array' => true,
        'no_whitespace_in_blank_line' => true,
        'normalize_index_brace' => true,
        'object_operator_without_whitespace' => true,
        'ordered_imports' => ['sort_algorithm' => 'alpha'],
        'phpdoc_align' => ['align' => 'left'],
        'phpdoc_indent' => true,
        'phpdoc_no_useless_inheritdoc' => true,
        'phpdoc_scalar' => true,
        'phpdoc_single_line_var_spacing' => true,
        'phpdoc_trim' => true,
        'phpdoc_types' => true,
        'phpdoc_var_without_name' => true,
        'return_type_declaration' => true,
        'self_accessor' => true,
        'short_scalar_cast' => true,
        'single_blank_line_before_namespace' => true,
        'single_class_element_per_statement' => true,
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

### Usage

#### Check Code Style

```bash
# Check without fixing
composer cs-check

# Or directly:
vendor/bin/php-cs-fixer fix --dry-run --diff
```

#### Fix Code Style

```bash
# Fix all files
composer cs-fix

# Or directly:
vendor/bin/php-cs-fixer fix

# Fix specific file
vendor/bin/php-cs-fixer fix src/AdminCabinet/Controllers/ExtensionsController.php

# Fix with verbose output
vendor/bin/php-cs-fixer fix --verbose --diff
```

#### Using Cache

PHP CS Fixer uses a cache to speed up subsequent runs:

```bash
# Clear cache
rm .php-cs-fixer.cache

# Disable cache
vendor/bin/php-cs-fixer fix --using-cache=no
```

---

## Composer Scripts

### Configuration

File: `composer.json`

```json
{
    "scripts": {
        "analyze": "phpstan analyse",
        "analyze:baseline": "phpstan analyse --generate-baseline",
        "cs-check": "php-cs-fixer fix --dry-run --diff",
        "cs-fix": "php-cs-fixer fix",
        "test": "phpunit",
        "test:coverage": "phpunit --coverage-html coverage",
        "quality": [
            "@cs-check",
            "@analyze",
            "@test"
        ],
        "quality:fix": [
            "@cs-fix",
            "@analyze",
            "@test"
        ]
    },
    "scripts-descriptions": {
        "analyze": "Run PHPStan static analysis",
        "analyze:baseline": "Generate PHPStan baseline for existing errors",
        "cs-check": "Check code style without fixing",
        "cs-fix": "Fix code style issues automatically",
        "test": "Run PHPUnit tests",
        "test:coverage": "Run tests with coverage report",
        "quality": "Run all quality checks (style, analysis, tests)",
        "quality:fix": "Fix style and run quality checks"
    }
}
```

### Usage

```bash
# Run static analysis
composer analyze

# Check code style
composer cs-check

# Fix code style
composer cs-fix

# Run tests
composer test

# Run all quality checks
composer quality

# Fix style and run checks
composer quality:fix
```

---

## Git Hooks

### Pre-commit Hook

File: `.git/hooks/pre-commit`

```bash
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Running pre-commit checks..."

# Get list of staged PHP files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.php$')

if [ -z "$STAGED_FILES" ]; then
    echo -e "${GREEN}No PHP files to check${NC}"
    exit 0
fi

# PHP syntax check
echo "Checking PHP syntax..."
SYNTAX_ERRORS=0

for FILE in $STAGED_FILES; do
    php -l "$FILE" > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}Syntax error in $FILE${NC}"
        php -l "$FILE"
        SYNTAX_ERRORS=1
    fi
done

if [ $SYNTAX_ERRORS -ne 0 ]; then
    echo -e "${RED}❌ Syntax check failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PHP syntax check passed${NC}"

# PSR-12 compliance check
echo "Checking PSR-12 compliance..."

vendor/bin/php-cs-fixer fix --dry-run --diff --config=.php-cs-fixer.php $STAGED_FILES > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Code style issues found. Run 'composer cs-fix' to fix them.${NC}"
    echo -e "${YELLOW}To commit anyway, use --no-verify${NC}"
    exit 1
fi
echo -e "${GREEN}✓ PSR-12 check passed${NC}"

# PHPStan analysis
echo "Running static analysis..."

vendor/bin/phpstan analyse --no-progress $STAGED_FILES > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}Static analysis failed${NC}"
    vendor/bin/phpstan analyse --no-progress $STAGED_FILES
    echo -e "${YELLOW}To commit anyway, use --no-verify${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Static analysis passed${NC}"

echo -e "${GREEN}All checks passed!${NC}"
exit 0
```

### Make Hook Executable

```bash
chmod +x .git/hooks/pre-commit
```

### Bypass Hook (When Necessary)

```bash
# Skip pre-commit hook
git commit --no-verify -m "Emergency fix"
```

---

## Docker Integration

### Running Tools in Docker Container

#### PHPStan in Container

```bash
# Analyze file
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse "/path/to/file.php"

# Analyze directory
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse "/offload/rootfs/usr/www/src/Core/"

# With debugging
docker exec <containerId> /offload/rootfs/usr/www/vendor/bin/phpstan analyse --debug "/path/to/file.php"
```

#### PHP CS Fixer in Container

```bash
# Fix file
docker exec <containerId> php-cs-fixer fix "/path/to/file.php"

# Fix directory
docker exec <containerId> php-cs-fixer fix "/offload/rootfs/usr/www/src/AdminCabinet/"
```

### Docker Compose Integration

Add to `docker-compose.yml`:

```yaml
services:
  mikopbx:
    # ... existing configuration ...

  code-quality:
    image: mikopbx:latest
    volumes:
      - ./src:/app/src
    command: >
      sh -c "
        vendor/bin/php-cs-fixer fix /app/src &&
        vendor/bin/phpstan analyse /app/src
      "
```

Run quality checks:

```bash
docker-compose run --rm code-quality
```

---

## IDE Configuration

### PhpStorm / IntelliJ IDEA

#### PHP CS Fixer Integration

1. Go to: Settings → Tools → External Tools
2. Click "+" to add new tool
3. Configure:
   - Name: `PHP CS Fixer`
   - Program: `$ProjectFileDir$/vendor/bin/php-cs-fixer`
   - Arguments: `fix $FilePath$`
   - Working directory: `$ProjectFileDir$`

#### PHPStan Integration

1. Install PHPStan plugin
2. Go to: Settings → PHP → Quality Tools → PHPStan
3. Configure:
   - PHPStan path: `vendor/bin/phpstan`
   - Configuration file: `phpstan.neon`
4. Enable "Run PHPStan on save"

#### Code Style Settings

1. Go to: Settings → Editor → Code Style → PHP
2. Click "Set from..." → Predefined Style → PSR-12
3. Customize:
   - Tabs and Indents → Use tab character: OFF
   - Tabs and Indents → Tab size: 4
   - Tabs and Indents → Indent: 4
   - Wrapping and Braces → Method declaration → Parameters: Do not wrap

### VS Code

#### Extensions

Install:
- `bmewburn.vscode-intelephense-client` (PHP Intelephense)
- `junstyle.php-cs-fixer` (PHP CS Fixer)
- `swordev.phpstan` (PHPStan)

#### Settings

File: `.vscode/settings.json`

```json
{
    "php.suggest.basic": false,
    "php.validate.enable": true,
    "php.validate.run": "onSave",

    "intelephense.format.braces": "psr12",

    "php-cs-fixer.executablePath": "${workspaceRoot}/vendor/bin/php-cs-fixer",
    "php-cs-fixer.onsave": true,
    "php-cs-fixer.rules": "@PSR12",
    "php-cs-fixer.config": ".php-cs-fixer.php",

    "phpstan.enabled": true,
    "phpstan.path": "${workspaceRoot}/vendor/bin/phpstan",
    "phpstan.configFile": "${workspaceRoot}/phpstan.neon",

    "editor.formatOnSave": true,
    "editor.tabSize": 4,
    "editor.insertSpaces": true
}
```

---

## Automation Workflow

### Complete Quality Check Workflow

```bash
#!/bin/bash
# quality-check.sh

echo "=== Running Code Quality Checks ==="

# 1. PHP Syntax Check
echo "1. Checking PHP syntax..."
find src -name "*.php" -exec php -l {} \; | grep -v "No syntax errors"
if [ $? -ne 1 ]; then
    echo "❌ Syntax errors found"
    exit 1
fi
echo "✓ Syntax check passed"

# 2. Code Style Check
echo "2. Checking code style (PSR-12)..."
composer cs-check
if [ $? -ne 0 ]; then
    echo "❌ Code style issues found"
    echo "Run 'composer cs-fix' to fix automatically"
    exit 1
fi
echo "✓ Code style check passed"

# 3. Static Analysis
echo "3. Running static analysis (PHPStan)..."
composer analyze
if [ $? -ne 0 ]; then
    echo "❌ Static analysis failed"
    exit 1
fi
echo "✓ Static analysis passed"

# 4. Unit Tests
echo "4. Running unit tests..."
composer test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed"
    exit 1
fi
echo "✓ Tests passed"

echo "=== All Quality Checks Passed ==="
```

Make executable and run:

```bash
chmod +x quality-check.sh
./quality-check.sh
```

---

## Summary

This quality tooling setup ensures:

1. **Automated Style Enforcement**: PHP CS Fixer maintains PSR-12 compliance
2. **Static Analysis**: PHPStan catches bugs before runtime
3. **Git Integration**: Pre-commit hooks prevent bad code from being committed
4. **IDE Support**: Seamless integration with popular IDEs
5. **Docker Compatibility**: All tools work inside containers
6. **Composer Scripts**: Easy-to-remember commands for all checks

Always run `composer quality` before committing code to ensure compliance with all standards.
