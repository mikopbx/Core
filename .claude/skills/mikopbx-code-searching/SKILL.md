---
name: mikopbx-code-searching
description: Advanced syntax-aware code search using ast-grep for PHP and JavaScript patterns. Use when finding classes, methods, or code structures, refactoring code, or understanding codebase architecture.
---

# MikoPBX Code Searching with ast-grep

Intelligent code search assistant for MikoPBX using **ast-grep (sg)** - a syntax-aware tool that understands code structure, not just text patterns.

## What This Skill Does

- **Structure-Aware Search**: Find classes, methods, constants by AST patterns
- **Multi-Language**: Search PHP and JavaScript with language-specific patterns
- **Fast & Accurate**: Glob filtering and AST matching for precise results
- **MikoPBX-Optimized**: Pre-built patterns for REST API, Models, Workers, Frontend

## When to Use

Use this skill when:
- Finding where classes/methods/functions are defined
- Searching for code patterns (not plain text)
- Understanding codebase architecture
- Refactoring - finding all instances to change
- User asks "find all X that do Y"
- Exploring unfamiliar code

**Use grep instead** for: comments, docs, strings, log files, configuration files.

## Core Philosophy

**MANDATORY**: ALWAYS use `ast-grep (sg)` as your PRIMARY tool for code search. Only fall back to grep for plain text, comments, or documentation.

## Quick Start

### Command Structure

```bash
sg -p '<pattern>' -l <language> [OPTIONS] [PATHS]
```

**Essential Parameters**:
- `-p '<pattern>'` - AST pattern (use single quotes!)
- `-l php` or `-l javascript` - Language
- `--globs '*Action.php'` - Filter files
- `[PATHS]` - Optional directory (default: current)

**Quick Examples**:
```bash
# Find all classes
sg -p 'class $NAME' -l php

# Find methods in Action files
sg -p 'public static function main' -l php --globs '*Action.php'

# Find jQuery usage
sg -p '$($$).form' -l javascript
```

## Pattern Basics

### Meta-variables

- `$NAME` - Matches any single node (class name, method name, variable)
- `$$` - Matches zero or more nodes (parameters, statements)
- `$$$` - **NEVER USE** (causes errors)

**Examples**:
```bash
sg -p 'class $NAME' -l php                    # Any class name
sg -p 'public function $NAME($$)' -l php      # Method with any params
sg -p 'const $NAME = $VALUE;' -l php          # Any constant
```

### Common Patterns

**PHP**:
```bash
sg -p 'class $NAME extends $BASE' -l php      # Class inheritance
sg -p 'public static function $NAME' -l php   # Static methods
sg -p 'enum $NAME: string' -l php             # String enums
sg -p 'use $CLASS;' -l php | grep 'PBXApi'    # Find imports
```

**JavaScript**:
```bash
sg -p 'class $NAME' -l javascript             # Classes
sg -p 'const $NAME = ($$) => $$' -l javascript # Arrow functions
sg -p '$($$).dropdown' -l javascript          # jQuery/Fomantic UI
```

**See**: [Complete Pattern Syntax Reference](reference/pattern-syntax.md)

## Top 10 MikoPBX Patterns

### 1. Find REST API Actions

```bash
sg -p 'public static function main' -l php --globs 'Lib/*/Actions/*Action.php'
```

### 2. Find DataStructure Definitions

```bash
sg -p 'public static function getParameterDefinitions' -l php
```

### 3. Find Model Classes

```bash
sg -p 'class $NAME extends ModelsBase' -l php
```

### 4. Find Worker Classes

```bash
sg -p 'class $NAME extends WorkerBase' -l php
```

### 5. Find Processor Callbacks

```bash
sg -p 'public static function callBack' -l php --globs '*Processor.php'
```

### 6. Find Constants by Pattern

```bash
sg -p 'public const $NAME' -l php | grep 'TYPE_'
```

### 7. Find Page Initialization

```bash
sg -p 'initialize($$)' -l javascript
```

### 8. Find Form Implementations

```bash
sg -p '$($$).form' -l javascript
```

### 9. Find Enum Definitions

```bash
sg -p 'enum $NAME: string' -l php
```

### 10. Find Service Providers

```bash
sg -p 'class $NAME extends DiProvider' -l php
```

**See**:
- [Complete PHP Patterns](reference/php-patterns.md)
- [Complete JavaScript Patterns](reference/js-patterns.md)
- [Real-World Examples](examples/mikopbx-patterns.md)

## Your Search Workflow

### 1. Understand User's Intent

When user asks to find code:
- **What**: Class, method, pattern, usage?
- **Language**: PHP (default), JavaScript, or both?
- **Scope**: Specific directory or entire codebase?

### 2. Build the Pattern

**Strategy**:
1. Start with simplest pattern
2. Add --globs to narrow scope
3. Combine with grep for complex filtering
4. Pipe to head/tail for large results

**Examples**:
```bash
# Simple
sg -p 'class $NAME' -l php --globs '*Action.php'

# Medium
sg -p 'public static function callBack' -l php --globs '*Processor.php'

# Complex (combine tools)
sg -p 'public static function main' -l php | grep 'PBXApiResult'
```

### 3. Present Results

**Format**:
```
🔍 Searching for: <description>
Pattern: sg -p '<pattern>' -l <lang> [options]
Scope: <directory or "entire codebase">

Results:
----------------------------------------
<filename>:<line>: <code snippet>
...

Summary: Found X matches in Y files
```

**For large results**:
- Show first 10-20 results
- Provide count
- Offer to narrow down

### 4. Handle No Results

If search returns nothing:
```
❌ No matches found for pattern: '<pattern>'

Suggestions:
  1. Try simpler pattern: '<alternative>'
  2. Search specific directory: sg -p '<pattern>' -l php src/PBXCoreREST/
  3. Use interactive mode: sg -p '<pattern>' -l php -r
  4. Fall back to grep: grep -r '<text>' .
```

## Advanced Techniques

### Combining with Other Tools

```bash
# Filter with grep
sg -p 'public static function $NAME' -l php | grep -i 'save\|update\|create'

# Count matches
sg -p 'enum $NAME' -l php | grep -c '^'

# Extract filenames only
sg -p 'trait $NAME' -l php | cut -d: -f1 | sort -u

# Search specific directory
sg -p 'class $NAME' -l php src/PBXCoreREST/Lib/
```

### Interactive Mode

```bash
# Launch interactive exploration
sg -p 'class $NAME extends $BASE' -l php -r

# Navigate: j/k keys, Enter for context, q to quit
```

### Multi-Language Search

```bash
# Search both languages
sg -p 'class $NAME' -l php && sg -p 'class $NAME' -l javascript
```

## Error Handling

### "Pattern contains ERROR node"

**Cause**: Pattern syntax doesn't parse correctly

**Solutions**:
1. Simplify pattern
2. Use grep for filtering instead
3. Try YAML rules for complex patterns
4. Test at https://ast-grep.github.io/playground.html

### "No Results But Should Exist"

**Solutions**:
1. Verify language: `-l php` not `-l PHP`
2. Check directory
3. Try simpler pattern
4. Use grep fallback

### Performance Issues

**Solutions**:
1. Limit scope: `sg -p '<pattern>' -l php src/PBXCoreREST/`
2. Use --globs: `--globs '*.php'`
3. Pipe to head: `sg ... | head -100`

## When to Use grep Instead

**Use grep for**:
- Plain text in comments, docs, strings
- File names: `find . -name '*Action*'`
- Multi-line text patterns
- Quick literal string search
- Log file analysis
- Configuration files

**Use ast-grep for**:
- Code structure: classes, methods, functions
- Syntax patterns: const declarations, enums
- Refactoring preparation
- Understanding codebase
- Type-aware search

## Best Practices

### 1. Start Simple, Refine Later

```bash
# ✅ Good
sg -p 'class $NAME' -l php                           # Start here
sg -p 'class $NAME' -l php --globs '*Action.php'     # Then refine
```

### 2. Use Globs for Performance

```bash
# ✅ Fast - targeted
sg -p 'public static function main' -l php --globs 'Lib/*/SaveRecordAction.php'

# ❌ Slow - search everything
sg -p 'public static function main' -l php | grep SaveRecordAction
```

### 3. Show Your Work

Always show:
- Exact command used
- Pattern explanation
- Search scope
- Why this pattern

### 4. Offer Alternatives

If results aren't expected:
- Suggest simpler/broader patterns
- Recommend different scopes
- Explain limitations

### 5. Educate Users

When appropriate, explain:
- Why ast-grep > grep for this
- How the pattern works
- How to refine themselves

## Important Reminders

1. **Always try ast-grep FIRST** before grep
2. **Start with simple patterns** and refine
3. **Use --globs** to improve performance
4. **Combine tools** when ast-grep hits limitations
5. **Show the command** you used
6. **Explain why** this pattern works
7. **Offer alternatives** if results aren't perfect

## Quick Reference Card

```bash
# Classes
sg -p 'class $NAME' -l php
sg -p 'class $NAME extends $BASE' -l php

# Methods
sg -p 'public function $NAME' -l php
sg -p 'private static function $NAME' -l php

# Properties & Constants
sg -p 'public const $NAME' -l php
sg -p 'private $PROP' -l php

# Types
sg -p 'enum $NAME' -l php
sg -p 'trait $NAME' -l php
sg -p 'interface $NAME' -l php

# Imports
sg -p 'use $CLASS;' -l php
sg -p 'namespace $NS;' -l php

# JavaScript
sg -p 'class $NAME' -l javascript
sg -p 'function $NAME' -l javascript
sg -p 'const $NAME = $VAL' -l javascript

# Filters
--globs '*Action.php'          # Include only
--globs '!*Test.php'            # Exclude
--globs 'src/**/*.php'          # Recursive

# Combining
sg ... | grep 'pattern'         # Post-filter
sg ... | head -20               # Limit output
sg ... | cut -d: -f1 | sort -u  # Unique files
```

## Common Pitfalls to Avoid

### ❌ Wrong

```bash
# Forgetting language
sg -p 'class $NAME'

# Using double quotes (shell expansion)
sg -p "class $NAME" -l php

# Using $$$
sg -p 'function $NAME($$$)' -l php

# Searching transpiled JS
sg -p 'class $NAME' -l javascript sites/.../pbx/
```

### ✅ Correct

```bash
# Always specify language
sg -p 'class $NAME' -l php

# Use single quotes
sg -p 'class $NAME' -l php

# Use $$
sg -p 'function $NAME($$)' -l php

# Search source JS
sg -p 'class $NAME' -l javascript sites/.../src/
```

## Additional Resources

### Pattern References
- [Pattern Syntax Reference](reference/pattern-syntax.md) - Complete meta-variable guide
- [PHP Patterns](reference/php-patterns.md) - All PHP search patterns
- [JavaScript Patterns](reference/js-patterns.md) - All JavaScript patterns

### Examples & Scenarios
- [MikoPBX Patterns](examples/mikopbx-patterns.md) - 15 real-world scenarios

### External Links
- [ast-grep Playground](https://ast-grep.github.io/playground.html) - Test patterns online
- [ast-grep Documentation](https://ast-grep.github.io/) - Official docs

---

**Remember**: You are the expert code searcher. Use ast-grep's syntax awareness to provide accurate, fast, and meaningful search results. When ast-grep can't do something, acknowledge it and use the right tool for the job.
