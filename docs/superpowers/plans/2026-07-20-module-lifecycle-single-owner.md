# Module Lifecycle Single-Owner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure a successful Core module state transition invokes each AFTER lifecycle hook exactly once.

**Architecture:** `PbxExtensionState` remains the sole lifecycle owner. `ReloadModuleStateAction` continues reacting to persisted module state and planning configuration actions, but no longer dispatches lifecycle callbacks.

**Tech Stack:** PHP 8.4, PHPUnit 9, Phalcon-based MikoPBX Core.

## Global Constraints

- Do not change the module installation pipeline, reload coalescing, firewall behavior, worker handling, or external module code.
- Preserve all existing configuration-action planning in `ReloadModuleStateAction`.
- Use a failing regression test before changing production code.

---

### Task 1: Prove model-event processing repeats AFTER hooks

**Files:**
- Create: `tests/Unit/Core/Workers/Libs/WorkerModelsEvents/Actions/ReloadModuleStateActionTest.php`
- Modify: none

**Interfaces:**
- Consumes: `ReloadModuleStateAction::handleModuleConfigChanges(ConfigClass $configClassObj, array $moduleRecord): void`
- Produces: regression coverage for enabled and disabled records.

- [ ] **Step 1: Write the failing regression test**

Create a small `ConfigClass` test double with counters in `onAfterModuleEnable()` and `onAfterModuleDisable()`. Instantiate it without its environment-dependent constructor and call `handleModuleConfigChanges()` once with `disabled=0` and once with `disabled=1`. Assert both counters remain zero because model-event processing is not a lifecycle transition owner.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/Core/Workers/Libs/WorkerModelsEvents/Actions/ReloadModuleStateActionTest.php
```

Expected: two assertion failures showing that the current implementation invoked the corresponding AFTER hooks once.

### Task 2: Remove duplicate lifecycle dispatch

**Files:**
- Modify: `src/Core/Workers/Libs/WorkerModelsEvents/Actions/ReloadModuleStateAction.php`
- Test: `tests/Unit/Core/Workers/Libs/WorkerModelsEvents/Actions/ReloadModuleStateActionTest.php`

**Interfaces:**
- Consumes: persisted `PbxExtensionModules` model-event records.
- Produces: configuration action planning without lifecycle hook execution.

- [ ] **Step 1: Implement the minimal fix**

Delete only the final `onAfterModuleEnable()` / `onAfterModuleDisable()` dispatch block from `handleModuleConfigChanges()`. Do not modify fail2ban, nginx, crond, or manager action planning.

- [ ] **Step 2: Run the focused test and verify GREEN**

Run the focused PHPUnit command from Task 1.

Expected: two tests, zero failures.

- [ ] **Step 3: Run related regression tests**

Run:

```bash
vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/Core/Workers/Libs/WorkerModelsEvents/Actions/ReloadModuleStateActionTest.php tests/Modules/PbxExtensionStateTest.php
```

Expected: zero failures.

- [ ] **Step 4: Run syntax and diff validation**

Run:

```bash
php -l src/Core/Workers/Libs/WorkerModelsEvents/Actions/ReloadModuleStateAction.php
php -l tests/Unit/Core/Workers/Libs/WorkerModelsEvents/Actions/ReloadModuleStateActionTest.php
git diff --check
```

Expected: both files report no syntax errors and `git diff --check` exits successfully.

- [ ] **Step 5: Run the broad available unit suite**

Run the repository PHPUnit suite supported by the local environment. Record any environmental or pre-existing failures separately from failures caused by this change.

- [ ] **Step 6: Commit the implementation**

Stage only the Core source, regression test, and this plan, then commit with message:

```text
fix(modules): invoke lifecycle hooks once
```
