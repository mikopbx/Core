# Module Lifecycle Single-Owner Design

## Problem

`PbxExtensionState::enableModule()` and `disableModule()` synchronously execute the module's `onAfterModuleEnable()` and `onAfterModuleDisable()` hooks after persisting the new state. The resulting `PbxExtensionModules` model event is later handled by `ReloadModuleStateAction`, which executes the same AFTER hook again. A single state transition therefore invokes module side effects twice.

## Scope

This change makes `PbxExtensionState` the sole owner of module lifecycle hooks. `ReloadModuleStateAction` remains responsible for reacting to the persisted state: refreshing module providers and database connections, planning system configuration reloads, and restarting workers when the enabled-module state hash changes.

The change does not alter module installation, action coalescing, firewall application, nginx handling, worker shutdown, or external module code.

## Design

Remove the AFTER-hook dispatch block from `ReloadModuleStateAction::handleModuleConfigChanges()`. Keep the method's existing fail2ban, nginx, crond, and manager action planning unchanged.

`PbxExtensionState` retains the lifecycle order:

1. validate the transition;
2. execute the BEFORE hook;
3. persist `PbxExtensionModules.disabled`;
4. execute the AFTER hook once;
5. perform the remaining transition cleanup.

Model-event processing must never execute lifecycle hooks. This prevents duplicated side effects while preserving all configuration reloads derived from the module's declared interfaces.

## Compatibility and Risk

The behavior change is limited to removing an unintended second AFTER invocation. Modules continue to receive one synchronous AFTER callback from every successful Core enable or disable transition. Configuration actions remain scheduled from the model event exactly as before.

Code that directly edits `PbxExtensionModules.disabled` instead of using `PbxExtensionState` will no longer receive lifecycle callbacks. Such direct edits bypass the established transition checks, firewall handling, BEFORE hooks, sound handling, and worker handling, so they are not a supported lifecycle path.

## Verification

Add focused regression coverage proving that `ReloadModuleStateAction::handleModuleConfigChanges()`:

- still plans declared Core configuration actions;
- does not invoke `onAfterModuleEnable()` for `disabled=0`;
- does not invoke `onAfterModuleDisable()` for `disabled=1`.

Run the focused test first in the failing state, apply the minimal production change, rerun it, then run related module-state and worker-model-event tests followed by the repository's broader unit-test command where available.
