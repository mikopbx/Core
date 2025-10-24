# MikoPBX Real-World Search Scenarios

Practical examples of using ast-grep to solve common MikoPBX development tasks.

## Scenario 1: "Find all classes that extend X"

**User Request**: "Find all classes extending BaseAction"

**Solution**:
```bash
sg -p 'class $NAME extends BaseAction' -l php
```

**Expected Results**:
```
src/PBXCoreREST/Lib/Auth/Actions/LoginAction.php:35
src/PBXCoreREST/Lib/Auth/Actions/LogoutAction.php:28
src/PBXCoreREST/Lib/Auth/Actions/RefreshAction.php:31
src/PBXCoreREST/Lib/Extensions/Actions/CreateAction.php:42
...
```

**Explanation**: This pattern finds all classes in the codebase that inherit from `BaseAction`, which is the base class for all REST API action handlers.

---

## Scenario 2: "Where is method X defined?"

**User Request**: "Where is `getParameterDefinitions` defined?"

**Solution**:
```bash
sg -p 'public static function getParameterDefinitions' -l php
```

**Expected Results**:
```
src/PBXCoreREST/Lib/Extensions/DataStructure.php:45
src/PBXCoreREST/Lib/Providers/DataStructure.php:52
src/PBXCoreREST/Lib/IncomingRoutes/DataStructure.php:38
...
```

**Explanation**: Finds all `DataStructure.php` files that implement the parameter definition method required for OpenAPI schema generation.

**Refine to specific resource**:
```bash
sg -p 'public static function getParameterDefinitions' -l php --globs 'Lib/Extensions/*.php'
```

---

## Scenario 3: "Find all usages of class X"

**User Request**: "Find all files using PBXApiResult"

**Solution**:
```bash
# Step 1: Find import statements
sg -p 'use $CLASS;' -l php | grep 'PBXApiResult'

# Step 2: Get unique file list
sg -p 'use $CLASS;' -l php | grep 'PBXApiResult' | cut -d: -f1 | sort -u
```

**Expected Results**:
```
src/PBXCoreREST/Lib/Auth/Actions/LoginAction.php
src/PBXCoreREST/Lib/Auth/Actions/LogoutAction.php
src/PBXCoreREST/Lib/Extensions/Actions/CreateAction.php
...

Found in 47 files
```

**Explanation**: Since `use` statements are simple text imports, we combine ast-grep with grep to filter for the specific class name.

---

## Scenario 4: "Find implementation pattern"

**User Request**: "How do other Actions implement validation?"

**Solution**:
```bash
# Find all main() methods in Action files
sg -p 'public static function main' -l php --globs '*Action.php' | head -50
```

**Alternative - Find specific validation pattern**:
```bash
# Find validation method calls
sg -p 'public static function main($$): $RESULT' -l php --globs 'Lib/*/Actions/*Action.php'
```

**Explanation**: Shows the pattern used across different Action classes, helping you understand the standard implementation approach.

---

## Scenario 5: "Find all files in module X"

**User Request**: "Find all Action files in Extensions module"

**Solution**:
```bash
sg -p 'class $NAME' -l php --globs 'Lib/Extensions/Actions/*Action.php'
```

**Expected Results**:
```
src/PBXCoreREST/Lib/Extensions/Actions/CreateAction.php:35: class CreateAction extends BaseAction
src/PBXCoreREST/Lib/Extensions/Actions/UpdateAction.php:28: class UpdateAction extends BaseAction
src/PBXCoreREST/Lib/Extensions/Actions/DeleteAction.php:31: class DeleteAction extends BaseAction
```

**Explanation**: Combines path globbing with class pattern to find all Action classes in a specific resource directory.

---

## Scenario 6: "Find constants matching pattern"

**User Request**: "Find all TYPE_ constants"

**Solution**:
```bash
sg -p 'public const $NAME' -l php | grep 'TYPE_'
```

**Count by file**:
```bash
sg -p 'public const $NAME' -l php | grep 'TYPE_' | cut -d: -f1 | uniq -c
```

**Expected Results**:
```
src/Common/Models/Extensions.php:45: public const TYPE_SIP = 'SIP';
src/Common/Models/Extensions.php:46: public const TYPE_IAX = 'IAX2';
src/Common/Models/Extensions.php:47: public const TYPE_EXTERNAL = 'EXTERNAL';
...
```

**Explanation**: ast-grep finds all public constants, grep filters for those starting with TYPE_, which is a common naming convention for enum-like constants in MikoPBX.

---

## Scenario 7: "Find JavaScript initialization code"

**User Request**: "Find all jQuery document.ready calls"

**Solution**:
```bash
sg -p '$(document).ready' -l javascript
```

**Alternative - Find page objects**:
```bash
# Find objects with initialize method
sg -p 'initialize($$)' -l javascript
```

**Expected Results**:
```
sites/admin-cabinet/assets/js/src/Extensions/extension-modify.js:428
sites/admin-cabinet/assets/js/src/Providers/provider-modify.js:312
sites/admin-cabinet/assets/js/src/IncomingRoutes/incoming-route-index.js:156
```

**Explanation**: MikoPBX uses jQuery document.ready for page initialization. This finds all entry points for frontend code.

---

## Scenario 8: "Find REST API Processors"

**User Request**: "Show me all REST API processor classes"

**Solution**:
```bash
sg -p 'class $NAME extends Injectable' -l php --globs '*Processor.php'
```

**Find their callback methods**:
```bash
sg -p 'public static function callBack' -l php --globs '*Processor.php'
```

**Expected Results**:
```
src/PBXCoreREST/Lib/ExtensionsManagementProcessor.php:35: class ExtensionsManagementProcessor extends Injectable
src/PBXCoreREST/Lib/ProvidersManagementProcessor.php:28: class ProvidersManagementProcessor extends Injectable
...

Callback methods:
src/PBXCoreREST/Lib/ExtensionsManagementProcessor.php:70: public static function callBack(array $request): PBXApiResult
```

**Explanation**: Processors handle queued REST API requests. This shows the structure of the async request processing system.

---

## Scenario 9: "Find Model Lifecycle Hooks"

**User Request**: "Which models have afterSave hooks?"

**Solution**:
```bash
sg -p 'public function afterSave' -l php src/Common/Models/
```

**Find all lifecycle hooks**:
```bash
echo "=== Initialize ==="
sg -p 'public function initialize' -l php src/Common/Models/ | cut -d: -f1 | sort -u

echo "=== AfterSave ==="
sg -p 'public function afterSave' -l php src/Common/Models/ | cut -d: -f1 | sort -u

echo "=== BeforeDelete ==="
sg -p 'public function beforeDelete' -l php src/Common/Models/ | cut -d: -f1 | sort -u
```

**Explanation**: Phalcon models use lifecycle hooks. This finds which models implement custom logic during database operations.

---

## Scenario 10: "Find Fomantic UI Component Usage"

**User Request**: "Where are dropdowns initialized in the admin interface?"

**Solution**:
```bash
sg -p '$($$).dropdown' -l javascript
```

**Filter to specific component types**:
```bash
# Find dropdown initialization with config
sg -p '$($$).dropdown({ $$ })' -l javascript

# Get unique files
sg -p '$($$).dropdown' -l javascript | cut -d: -f1 | sort -u
```

**Expected Results**:
```
sites/admin-cabinet/assets/js/src/Extensions/extension-modify.js:125
sites/admin-cabinet/assets/js/src/Providers/provider-modify.js:89
sites/admin-cabinet/assets/js/src/FormElements/dropdown.js:45
...

Found in 23 files
```

**Explanation**: Fomantic UI dropdowns are a core component. This shows where they're initialized across the admin interface.

---

## Advanced Scenarios

### Scenario 11: "Find All Save/Update/Create Methods"

**User Request**: "Show me all methods that modify data"

**Solution**:
```bash
sg -p 'public function $NAME' -l php | grep -iE 'save|update|create|insert|modify'
```

**Filter to specific file types**:
```bash
sg -p 'public static function main' -l php --globs 'Lib/*/SaveRecordAction.php'
```

---

### Scenario 12: "Find Enum Definitions"

**User Request**: "What enums exist in the codebase?"

**Solution**:
```bash
# All enums
sg -p 'enum $NAME' -l php

# String-backed enums
sg -p 'enum $NAME: string' -l php

# Count enums
sg -p 'enum $NAME' -l php | grep -c 'enum'
```

**Expected Results**:
```
src/PBXCoreREST/Lib/Extensions/Enums/ExtensionType.php:10: enum ExtensionType: string
src/PBXCoreREST/Lib/Providers/Enums/ProviderType.php:12: enum ProviderType: string
...

Found 8 enums
```

---

### Scenario 13: "Find Worker Classes"

**User Request**: "What background workers does MikoPBX have?"

**Solution**:
```bash
sg -p 'class $NAME extends WorkerBase' -l php
```

**Find their start methods**:
```bash
sg -p 'public function start' -l php --globs 'Worker*.php'
```

**Expected Results**:
```
src/Core/Workers/WorkerApiCommands.php:35: class WorkerApiCommands extends WorkerBase
src/Core/Workers/WorkerCdr.php:28: class WorkerCdr extends WorkerBase
src/Core/Workers/WorkerModelsEvents.php:42: class WorkerModelsEvents extends WorkerBase
...
```

---

### Scenario 14: "Find DataTable Implementations"

**User Request**: "Which pages use DataTables?"

**Solution**:
```bash
sg -p '$($$).DataTable' -l javascript | cut -d: -f1 | sort -u
```

**Find with specific configuration**:
```bash
sg -p '$($$).DataTable({ $$ })' -l javascript
```

**Expected Results**:
```
sites/admin-cabinet/assets/js/src/Extensions/extensions-index.js
sites/admin-cabinet/assets/js/src/Providers/providers-index.js
sites/admin-cabinet/assets/js/src/CallDetailRecords/cdr-index.js
...

Found in 12 index pages
```

---

### Scenario 15: "Find Form Validation Rules"

**User Request**: "How is form validation configured?"

**Solution**:
```bash
# Find form initialization
sg -p '$($$).form({ $$ })' -l javascript

# Filter for validation rules
sg -p '$($$).form' -l javascript | grep -A5 'rules:'
```

---

## Output Format Examples

### Concise Format (Small Results)

```
🔍 Found 3 classes extending BaseAction in Extensions:

Lib/Extensions/Actions/CreateAction.php:42
Lib/Extensions/Actions/UpdateAction.php:35
Lib/Extensions/Actions/DeleteAction.php:28
```

### Detailed Format (Exploration)

```
🔍 Searching for: public static callback methods in Processors

Pattern: sg -p 'public static function callBack' -l php --globs '*Processor.php'
Scope: Entire codebase

Results:
----------------------------------------
Lib/ExtensionsManagementProcessor.php:70
    public static function callBack(array $request): PBXApiResult

Lib/ProvidersManagementProcessor.php:55
    public static function callBack(array $request): PBXApiResult

Summary: Found 8 matches in 8 files
```

### Error Format

```
❌ Pattern failed: 'case $NAME:'

Reason: case statements don't parse reliably in ast-grep
Alternative approach:
  1. Use grep: grep -r 'case.*:' src/
  2. Simplify to: sg -p 'match ($VAR)' -l php
  3. Search parent switch: sg -p 'switch ($VAR) { $$ }' -l php
```

---

## Tips for Real-World Usage

### 1. Start Broad, Then Narrow

```bash
# Step 1: Find all classes
sg -p 'class $NAME' -l php

# Step 2: Add inheritance filter
sg -p 'class $NAME extends ModelsBase' -l php

# Step 3: Add file filter
sg -p 'class $NAME extends ModelsBase' -l php --globs 'Models/*.php'
```

### 2. Combine Tools for Complex Searches

```bash
# ast-grep for structure, grep for content
sg -p 'public const $NAME' -l php | grep 'TYPE_' | grep -v 'DEPRECATED'
```

### 3. Use Pipes for Post-Processing

```bash
# Count matches
sg -p 'enum $NAME' -l php | grep -c '^'

# Get unique files
sg -p 'use $CLASS;' -l php | cut -d: -f1 | sort -u

# Show context
sg -p 'public static function main' -l php | head -20
```

### 4. Document Your Searches

When sharing with team:
```bash
# Document what you're looking for
# Finding all REST API actions in Extensions module
sg -p 'class $NAME extends BaseAction' -l php --globs 'Lib/Extensions/Actions/*.php'
```

---

## Summary

**Most Common MikoPBX Searches**:

```bash
# REST API
sg -p 'public static function main' -l php --globs '*Action.php'
sg -p 'public static function getParameterDefinitions' -l php

# Models
sg -p 'class $NAME extends ModelsBase' -l php

# Workers
sg -p 'class $NAME extends WorkerBase' -l php

# Frontend
sg -p 'initialize($$)' -l javascript
sg -p '$($$).form' -l javascript
```

**Next Steps**:
- See [../reference/pattern-syntax.md](../reference/pattern-syntax.md) for syntax details
- See [../reference/php-patterns.md](../reference/php-patterns.md) for PHP patterns
- See [../reference/js-patterns.md](../reference/js-patterns.md) for JavaScript patterns
