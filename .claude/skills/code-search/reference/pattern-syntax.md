# ast-grep Pattern Syntax Reference

Complete reference for ast-grep pattern syntax and meta-variables.

## Meta-variables

Meta-variables are placeholders that capture parts of code in your search patterns.

### `$NAME` - Single Node Matcher

Matches **any single AST node** - can be an identifier, expression, statement, type, etc.

**Examples**:
```bash
# Matches any class name
sg -p 'class $NAME' -l php
# Captures: UserController, BaseModel, RestController, etc.

# Matches any function name
sg -p 'function $NAME()' -l php
# Captures: getData, processRequest, initialize, etc.

# Matches any variable
sg -p '$VAR = $VALUE;' -l php
# Captures: $user = ..., $result = ..., $data = ..., etc.
```

### `$$` - Multiple Nodes Matcher

Matches **zero or more** statements, parameters, or nodes in a sequence.

**Examples**:
```bash
# Matches methods with any number of parameters
sg -p 'public function $NAME($$)' -l php
# Captures: getName(), setData($id), process($a, $b, $c), etc.

# Matches any code inside a function
sg -p 'function $NAME() { $$ }' -l javascript
# Captures all function bodies regardless of statements count
```

### `$$$` - DO NOT USE ⚠️

**CRITICAL**: `$$$` causes ERROR nodes in ast-grep and should NEVER be used.

```bash
# ❌ WRONG - causes errors
sg -p 'function $NAME($$$)' -l php

# ✅ CORRECT - use $$ instead
sg -p 'function $NAME($$)' -l php
```

## Pattern Examples

### Valid Patterns ✅

```bash
# Classes
sg -p 'class $NAME' -l php
sg -p 'abstract class $NAME' -l php
sg -p 'class $NAME extends $BASE' -l php
sg -p 'class $NAME implements $INTERFACE' -l php

# Methods
sg -p 'public function $NAME' -l php
sg -p 'private static function $NAME($$)' -l php
sg -p 'protected function $NAME(): $TYPE' -l php

# Properties & Constants
sg -p 'public const $NAME = $VALUE;' -l php
sg -p 'private $PROPERTY;' -l php
sg -p 'public static $VAR' -l php

# Enums & Types
sg -p 'enum $NAME' -l php
sg -p 'enum $NAME: string' -l php
sg -p 'trait $NAME' -l php
sg -p 'interface $NAME' -l php

# Imports & Namespaces
sg -p 'use $CLASS;' -l php
sg -p 'namespace $NS;' -l php

# Assignments & Variables
sg -p '$VAR = $VALUE;' -l php
sg -p 'const $NAME = $VALUE;' -l javascript
```

### Invalid Patterns ❌

These patterns don't parse well in ast-grep:

```bash
# ❌ Case statements (unreliable parsing)
sg -p 'case $NAME:' -l php
# Solution: Use grep or search parent match/switch

# ❌ Triple dollar sign
sg -p 'function $NAME($$$)' -l php
# Solution: Use $$ instead

# ❌ Attributes (need special handling)
sg -p '#[Route]' -l php
# Solution: Use grep or YAML rules

# ❌ Complex predicates
sg -p 'const $NAME(#match "TYPE_.*") = $VALUE;' -l php
# Solution: Use YAML rules or pipe to grep
```

## Advanced Pattern Features

### Predicates (Filtering)

ast-grep predicates are limited in CLI mode. For complex filtering, combine with grep:

```bash
# Find constants with "TYPE_" in name
sg -p 'public const $NAME' -l php | grep 'TYPE_'

# Find methods starting with "get"
sg -p 'public function $NAME' -l php | grep 'function get'

# Find specific class name
sg -p 'class MySpecificClass' -l php
```

**Note**: Complex predicates like `$NAME(#match "REGEX")` require YAML rule files with `sg scan`.

### Contextual Matching

Find patterns inside specific contexts by combining with grep:

```bash
# Find methods inside specific class
sg -p 'public function $NAME' -l php | grep -A2 -B2 'ClassName'

# Find properties in specific file
sg -p 'private $PROP' -l php --globs 'UserModel.php'
```

For complex contextual matching (e.g., "find method X only inside class Y"), use YAML rules:

```yaml
# rule.yml
rule:
  pattern: public function $METHOD
  inside:
    pattern: class MyClass
    stopBy: end
```

Then run: `sg scan -r rule.yml`

## Wildcard Behavior

### Statement vs Expression Context

`$$` behaves differently based on context:

**Statement context** (inside `{}`):
```bash
# Matches zero or more statements
sg -p 'function $NAME() { $$ }' -l php
# Matches: empty functions, functions with 1 statement, many statements
```

**Parameter context** (inside `()`):
```bash
# Matches zero or more parameters
sg -p 'function $NAME($$)' -l php
# Matches: getName(), getData($id), process($a, $b, $c)
```

**Array context** (inside `[]`):
```bash
# Matches zero or more array elements
sg -p '[$VAR => $$]' -l php
```

## Pattern Testing

### Online Playground

Test patterns at: https://ast-grep.github.io/playground.html

**Workflow**:
1. Select language (PHP, JavaScript, etc.)
2. Paste code sample
3. Enter pattern
4. See live matches

### Interactive Mode

```bash
# Launch interactive search
sg -p 'class $NAME extends $BASE' -l php -r

# Navigate results:
# - j/k: move up/down
# - Enter: see full context
# - q: quit
```

## Language-Specific Notes

### PHP

- **Visibility modifiers** are part of the pattern: `public`, `private`, `protected`
- **Static** keyword: include in pattern if searching for static members
- **Type hints**: can be captured with meta-variables: `function $NAME(): $TYPE`
- **Namespaces**: use full pattern `namespace $NS;` (don't forget semicolon)

### JavaScript

- **Arrow functions**: `const $NAME = ($$) => $$`
- **Function expressions**: `const $NAME = function($$) { $$ }`
- **jQuery**: `$.$$` matches jQuery calls
- **Export/Import**: `export $WHAT` or `import $WHAT from $WHERE`

## Common Pitfalls

### 1. Forgetting Language Flag

```bash
# ❌ Wrong - no language specified
sg -p 'class $NAME'

# ✅ Correct
sg -p 'class $NAME' -l php
```

### 2. Using Wrong Quote Type

```bash
# ❌ Wrong - double quotes can cause shell expansion
sg -p "class $NAME" -l php

# ✅ Correct - single quotes prevent shell expansion
sg -p 'class $NAME' -l php
```

### 3. Over-specific Patterns

```bash
# ❌ Too specific - won't match variations
sg -p 'public static final function getName(): string' -l php

# ✅ Better - matches more variations
sg -p 'function getName' -l php
```

### 4. Forgetting Semicolons

```bash
# ❌ May not match - PHP statements need semicolons
sg -p 'const $NAME = $VALUE' -l php

# ✅ Correct
sg -p 'const $NAME = $VALUE;' -l php
```

## Performance Tips

### 1. Use --globs to Filter Files

```bash
# ✅ Fast - only searches Action files
sg -p 'public static function main' -l php --globs '*Action.php'

# ❌ Slow - searches all PHP files
sg -p 'public static function main' -l php
```

### 2. Limit Search Scope

```bash
# ✅ Fast - specific directory
sg -p 'class $NAME' -l php src/PBXCoreREST/

# ❌ Slower - entire codebase
sg -p 'class $NAME' -l php
```

### 3. Pipe to head Early

```bash
# ✅ Stop after 20 results
sg -p 'use $CLASS;' -l php | head -20

# ❌ Process all results then limit
sg -p 'use $CLASS;' -l php > results.txt && head -20 results.txt
```

## YAML Rules (Advanced)

For very complex patterns, create YAML rule files:

```yaml
# find-validation-methods.yml
rule:
  any:
    - pattern: public function validate($$)
    - pattern: private function validateData($$)
  inside:
    pattern: class $NAME
```

Run with:
```bash
sg scan -r find-validation-methods.yml
```

**When to use YAML rules**:
- Complex conditional logic (any/all/not)
- Contextual matching (inside/has/follows)
- Multiple related patterns
- Reusable search configurations

## Summary

**Key Takeaways**:
1. `$NAME` = single node, `$$` = multiple nodes, never use `$$$`
2. Always specify language with `-l`
3. Test patterns in playground first
4. Use --globs for performance
5. Combine with grep for complex filtering
6. Fall back to YAML rules for very complex searches

**Next Steps**:
- See [php-patterns.md](php-patterns.md) for PHP-specific examples
- See [js-patterns.md](js-patterns.md) for JavaScript examples
- See [../examples/mikopbx-patterns.md](../examples/mikopbx-patterns.md) for MikoPBX use cases
