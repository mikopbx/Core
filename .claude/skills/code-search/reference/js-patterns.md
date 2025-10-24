# JavaScript Search Patterns for ast-grep

Comprehensive collection of ast-grep patterns for searching JavaScript code in MikoPBX admin interface.

## Classes

### Class Declarations

```bash
# Find all classes
sg -p 'class $NAME' -l javascript

# Find classes with extends
sg -p 'class $NAME extends $BASE' -l javascript

# Specific class name
sg -p 'class ExtensionModify' -l javascript
sg -p 'class ProvidersIndex' -l javascript
```

### Class Methods

```bash
# Find all methods in classes
sg -p 'class $CLASS { $$ $METHOD($) { $$ } }' -l javascript

# Constructor methods
sg -p 'constructor($$)' -l javascript

# Static methods
sg -p 'static $METHOD($$)' -l javascript
```

## Functions

### Function Declarations

```bash
# Traditional function declarations
sg -p 'function $NAME($$)' -l javascript

# Function expressions
sg -p 'const $NAME = function($$) { $$ }' -l javascript

# Specific function name
sg -p 'function initialize()' -l javascript
```

### Arrow Functions

```bash
# Arrow functions with parameters
sg -p 'const $NAME = ($$) => $$' -l javascript

# Arrow functions with single parameter (no parens)
sg -p 'const $NAME = $PARAM => $$' -l javascript

# Arrow functions with block body
sg -p 'const $NAME = ($$) => { $$ }' -l javascript
```

## Variables & Constants

### Variable Declarations

```bash
# const declarations
sg -p 'const $NAME = $VALUE;' -l javascript

# let declarations
sg -p 'let $NAME = $VALUE;' -l javascript

# var declarations (legacy)
sg -p 'var $NAME = $VALUE;' -l javascript
```

### Object Literals

```bash
# Object assignments
sg -p 'const $NAME = { $$ }' -l javascript

# Specific object property
sg -p 'const $OBJ = { $PROP: $VALUE }' -l javascript
```

## jQuery & Fomantic UI Patterns

### jQuery Selectors

```bash
# General jQuery usage
sg -p '$.$$' -l javascript

# jQuery with specific method
sg -p '$($$).ready' -l javascript
sg -p '$($$).click' -l javascript
sg -p '$($$).on' -l javascript

# Document ready
sg -p '$(document).ready' -l javascript
```

### Fomantic UI Components

```bash
# Dropdown usage
sg -p '$.dropdown' -l javascript
sg -p '$($$).dropdown' -l javascript

# Form usage
sg -p '$.form' -l javascript
sg -p '$($$).form' -l javascript

# Modal usage
sg -p '$.modal' -l javascript
sg -p '$($$).modal' -l javascript

# Checkbox usage
sg -p '$.checkbox' -l javascript

# Tab usage
sg -p '$.tab' -l javascript

# API calls
sg -p '$.api' -l javascript
```

## AJAX & API Calls

### jQuery AJAX

```bash
# Ajax calls
sg -p '$.ajax' -l javascript
sg -p '$($$).ajax' -l javascript

# Get requests
sg -p '$.get' -l javascript

# Post requests
sg -p '$.post' -l javascript
```

### Fetch API

```bash
# Fetch calls
sg -p 'fetch($$)' -l javascript

# Fetch with then
sg -p 'fetch($$).then' -l javascript
```

## MikoPBX-Specific Patterns

### Page Objects

MikoPBX uses page objects for admin interface:

```bash
# Find all page object definitions
sg -p 'const $PAGE = { $$ }' -l javascript | grep -i 'index\|modify\|settings'

# Find initialize methods
sg -p 'initialize($$) { $$ }' -l javascript

# Find ready handlers
sg -p '$(document).ready' -l javascript
```

### Form Handling

```bash
# Form initialization
sg -p '$($$).form({ $$ })' -l javascript

# Form validation rules
sg -p 'rules: { $$ }' -l javascript

# Form submission handlers
sg -p 'onSuccess: $$' -l javascript
sg -p 'onFailure: $$' -l javascript
```

### DataTable Patterns

```bash
# DataTable initialization
sg -p '$($$).DataTable' -l javascript

# DataTable with config
sg -p '$($$).DataTable({ $$ })' -l javascript
```

### PbxAPI Usage

```bash
# PbxAPI method calls
sg -p 'PbxApi.$$' -l javascript

# Specific API methods
sg -p 'PbxApi.SystemGetBannedIp' -l javascript
sg -p 'PbxApi.ExtensionsGetRecord' -l javascript
```

## Event Handlers

### Click Events

```bash
# Click handler with function
sg -p '$($$).click($$)' -l javascript

# Click handler with on()
sg -p '$($$).on("click", $$)' -l javascript
```

### Change Events

```bash
# Change handlers
sg -p '$($$).change($$)' -l javascript
sg -p '$($$).on("change", $$)' -l javascript
```

### Custom Events

```bash
# Event triggers
sg -p '$($$).trigger' -l javascript

# Event listeners
sg -p '$($$).on($EVENT, $$)' -l javascript
```

## Imports & Exports

### ES6 Imports

```bash
# Import statements
sg -p 'import $NAME from $PATH' -l javascript

# Named imports
sg -p 'import { $$ } from $PATH' -l javascript

# Import all
sg -p 'import * as $NAME from $PATH' -l javascript
```

### ES6 Exports

```bash
# Default export
sg -p 'export default $VALUE' -l javascript

# Named exports
sg -p 'export const $NAME = $$' -l javascript
sg -p 'export function $NAME' -l javascript

# Export object
sg -p 'export { $$ }' -l javascript
```

## Async/Await Patterns

```bash
# Async functions
sg -p 'async function $NAME($$)' -l javascript

# Async arrow functions
sg -p 'const $NAME = async ($$) => $$' -l javascript

# Await usage
sg -p 'await $CALL' -l javascript
```

## Common MikoPBX File Patterns

### Finding Files by Pattern

```bash
# All modification pages
sg -p 'const $NAME = { $$ }' -l javascript --globs '*-modify.js'

# All index pages
sg -p 'const $NAME = { $$ }' -l javascript --globs '*-index.js'

# Specific component
sg -p 'class $NAME' -l javascript --globs 'Extensions/*.js'

# PbxAPI module
sg -p 'const PbxApi = { $$ }' -l javascript --globs 'PbxAPI/*.js'
```

### Directory-Specific Searches

```bash
# In Extensions module
sg -p 'const $NAME = { $$ }' -l javascript sites/admin-cabinet/assets/js/src/Extensions/

# In Providers module
sg -p 'initialize($$)' -l javascript sites/admin-cabinet/assets/js/src/Providers/

# In main utilities
sg -p 'function $NAME' -l javascript sites/admin-cabinet/assets/js/src/main/
```

## Combining Patterns

### Filter Results with grep

```bash
# Find initialization functions
sg -p 'function $NAME($$)' -l javascript | grep 'initialize\|init'

# Find callback functions
sg -p 'const $NAME = ($$) => $$' -l javascript | grep -i 'callback\|handler'

# Find API calls
sg -p '$.ajax' -l javascript | grep 'url:'
```

### Count Matches

```bash
# Count jQuery ajax calls
sg -p '$.ajax' -l javascript | grep -c '^'

# Count form initializations
sg -p '$($$).form' -l javascript | wc -l
```

### Extract File Names

```bash
# Files using DataTable
sg -p '$($$).DataTable' -l javascript | cut -d: -f1 | sort -u

# Files with dropdown usage
sg -p '$.dropdown' -l javascript | cut -d: -f1 | sort -u
```

## Performance Tips

### 1. Use Globs to Filter Files

```bash
# ✅ Fast - only modification pages
sg -p 'initialize($$)' -l javascript --globs '*-modify.js'

# ❌ Slower - all JS files
sg -p 'initialize($$)' -l javascript
```

### 2. Limit Scope to Directory

```bash
# ✅ Fast - specific module
sg -p 'class $NAME' -l javascript sites/admin-cabinet/assets/js/src/Extensions/

# ❌ Slower - entire codebase
sg -p 'class $NAME' -l javascript
```

### 3. Search in Source, Not Transpiled

```bash
# ✅ Good - search source code
sg -p 'class $NAME' -l javascript sites/admin-cabinet/assets/js/src/

# ❌ Bad - searching transpiled code
sg -p 'class $NAME' -l javascript sites/admin-cabinet/assets/js/pbx/
```

## Common JavaScript Pitfalls

### 1. Semicolon Optional

Unlike PHP, JavaScript semicolons are optional:

```bash
# Both patterns may be needed
sg -p 'const $NAME = $VALUE;' -l javascript
sg -p 'const $NAME = $VALUE' -l javascript  # Without semicolon
```

### 2. Arrow Function Variations

```bash
# Different arrow function forms
sg -p 'const $NAME = () => $$' -l javascript          # No params
sg -p 'const $NAME = $PARAM => $$' -l javascript      # Single param
sg -p 'const $NAME = ($$) => $$' -l javascript        # Multiple params
sg -p 'const $NAME = ($$) => { $$ }' -l javascript    # Block body
```

### 3. jQuery vs Vanilla JS

```bash
# jQuery
sg -p '$($$).click' -l javascript

# Vanilla JS (won't match with above pattern)
sg -p '$($$).addEventListener' -l javascript
```

## Advanced Techniques

### Finding Chained Methods

```bash
# Method chaining (combine with grep)
sg -p '$($$)' -l javascript | grep -E '\.\w+\(.*\)\.\w+\('
```

### Finding Callback Patterns

```bash
# Success callbacks
sg -p 'onSuccess: $$' -l javascript

# Failure callbacks
sg -p 'onFailure: $$' -l javascript

# Complete callbacks
sg -p 'complete: $$' -l javascript
```

### Finding Configuration Objects

```bash
# Object with specific key
sg -p '{ url: $$ }' -l javascript

# Validation rules
sg -p '{ rules: { $$ } }' -l javascript
```

## Summary

**Most Used JavaScript Patterns**:
```bash
# Classes
sg -p 'class $NAME' -l javascript

# Functions
sg -p 'function $NAME($$)' -l javascript
sg -p 'const $NAME = ($$) => $$' -l javascript

# jQuery
sg -p '$($$).form' -l javascript
sg -p '$($$).dropdown' -l javascript

# Variables
sg -p 'const $NAME = $VALUE;' -l javascript
```

**Next Steps**:
- See [pattern-syntax.md](pattern-syntax.md) for pattern fundamentals
- See [php-patterns.md](php-patterns.md) for PHP patterns
- See [../examples/mikopbx-patterns.md](../examples/mikopbx-patterns.md) for real-world examples
