# Module Extension Dropdown Owner Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep an enabled module extension available in routing dropdowns after one or more incoming routes reference it.

**Architecture:** Add a small pure resolver that extracts the first valid module owner from an ordered list of related model class names. `DropdownsAction` will pass the extension's related classes to this resolver, query `PbxExtensionModules` only for the valid module ID, and preserve the existing disabled-module filter.

**Tech Stack:** PHP 8.4, Phalcon models, PHPUnit 11.

## Global Constraints

- Accept only namespaces shaped as `Modules\<ModuleUniqueID>\Models\...`.
- Ignore core and malformed model namespaces.
- Do not change the REST response or database schema.
- Preserve filtering of disabled modules.

---

### Task 1: Resolve the module owner without relation-order corruption

**Files:**
- Create: `src/PBXCoreREST/Lib/Extensions/ModuleExtensionOwnerResolver.php`
- Create: `tests/Unit/PBXCoreREST/Lib/Extensions/ModuleExtensionOwnerResolverTest.php`
- Modify: `src/PBXCoreREST/Lib/Extensions/DropdownsAction.php:211-244`

**Interfaces:**
- Consumes: ordered `list<string>` of related model class names.
- Produces: `ModuleExtensionOwnerResolver::resolve(array $relatedModelClasses): ?string`.

- [x] **Step 1: Write the failing resolver tests**

Cover these inputs:

```php
[
    Modules\ModuleSmartIVR\Models\ModuleSmartIVR::class,
    MikoPBX\Common\Models\IncomingRoutingTable::class,
]
```

must return `ModuleSmartIVR`; core-only, missing-ID, and missing-`Models`
namespaces must return `null`.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
php -d include_path=/tmp /tmp/phpunit-11.phar \
  --bootstrap /tmp/mikopbx-test-bootstrap.php \
  tests/Unit/PBXCoreREST/Lib/Extensions/ModuleExtensionOwnerResolverTest.php
```

Expected: failure because `ModuleExtensionOwnerResolver` does not exist.

- [x] **Step 3: Implement the pure resolver**

Parse each class into namespace segments, accept only exact leading segment
`Modules`, non-empty module ID, and exact third segment `Models`, then return the
first valid ID. Return `null` if no valid owner exists.

- [x] **Step 4: Integrate the resolver into the dropdown action**

Replace the mutable namespace-segment loop with:

```php
$relatedModelClasses = array_map(
    static fn(array $relation): string => get_class($relation['object']),
    $extension->getRelatedLinks()
);
$moduleUniqueID = ModuleExtensionOwnerResolver::resolve($relatedModelClasses);
```

Return `null` when no module owner is found; otherwise return
`PbxExtensionModules::findFirstByUniqid($moduleUniqueID)`.

- [x] **Step 5: Run the focused test and verify GREEN**

Run the focused PHPUnit command from Step 2. Expected: all tests pass.

- [x] **Step 6: Run related verification**

```bash
php -d include_path=/tmp /tmp/phpunit-11.phar \
  --bootstrap /tmp/mikopbx-test-bootstrap.php \
  tests/Unit/PBXCoreREST/Lib/Extensions
php -l src/PBXCoreREST/Lib/Extensions/ModuleExtensionOwnerResolver.php
php -l src/PBXCoreREST/Lib/Extensions/DropdownsAction.php
php -l tests/Unit/PBXCoreREST/Lib/Extensions/ModuleExtensionOwnerResolverTest.php
git diff --check
```

- [x] **Step 7: Verify the client scenario on `serber@boffart.miko.ru`**

Use a read-only PHP check with the observed related class sequence and assert the
resolver returns `ModuleSmartIVR`. Do not change routes `43` or `44` during this
verification.

- [x] **Step 8: Commit the fix**

```bash
git add src/PBXCoreREST/Lib/Extensions/ModuleExtensionOwnerResolver.php \
  src/PBXCoreREST/Lib/Extensions/DropdownsAction.php \
  tests/Unit/PBXCoreREST/Lib/Extensions/ModuleExtensionOwnerResolverTest.php \
  docs/superpowers/plans/2026-08-13-module-extension-dropdown-owner.md
git commit -m "fix: preserve module destinations across routes"
```
