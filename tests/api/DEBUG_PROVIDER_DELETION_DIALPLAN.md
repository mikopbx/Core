# Bug: extensions.conf stale incoming context after provider deletion

## Problem Statement

When a SIP provider is deleted, its incoming context `[<ProviderID>-incoming]` remains in `extensions.conf`. The stale context only disappears when an unrelated model change (e.g., adding an employee) triggers a full dialplan regeneration.

QA reproduction steps:
1. Add SIP provider
2. Add incoming route for this provider
3. Verify `[<ProviderID>-incoming]` context appears in extensions.conf
4. Delete the provider
5. Check extensions.conf - **context remains** (BUG)

## Current Fix Attempt (commit 450d55d8f, Feb 10, 2026)

Moved `getNewSettingsForDependentModules()` from `fillModifiedTables()` to `startReload()` in WorkerModelsEvents.php. The idea: defer DB reads until after the 5-second timeout to ensure DELETE transaction is committed.

**This fix is INSUFFICIENT** - QA confirms the bug still reproduces.

## Investigation Results

### Architecture (critical chain)

```
Provider DELETE API → executeInTransaction() {
    Sip::delete() → afterDelete → beanstalk msg (DURING transaction, BEFORE commit)
    → CASCADE: Provider::delete() → afterDelete → beanstalk msg
    → CASCADE: IncomingRoutingTable::delete() → afterDelete → beanstalk msg
    → COMMIT
}

WorkerModelsEvents receives beanstalk messages:
    fillModifiedTables('Sip') → plans ReloadPJSIPAction + ReloadDialplanAction + ReloadFirewallAction
    fillModifiedTables('IncomingRoutingTable') → plans ReloadDialplanAction (already planned)

After 5s timeout → startReload():
    1. getNewSettingsForDependentModules() → refreshes SINGLETON config objects in DI
    2. ReloadPJSIPAction → SIPConf::reload() → new SIPConf() → pjsip.conf
    3. ReloadDialplanAction → ExtensionsConf::reload() → new ExtensionsConf() → extensions.conf
```

### Key Finding: Singleton Config Objects

`hookModulesMethod()` in `ExtensionsConf` uses **singleton** objects from DI container (`AsteriskConfModulesProvider`):

```php
// AsteriskConfigClass.php:115
$internalModules = $this->di->getShared(AsteriskConfModulesProvider::SERVICE_NAME);
```

Same singletons used by WorkerModelsEvents:
```php
// WorkerModelsEvents.php:246
$this->arrAsteriskConfObjects = $this->di->getShared(AsteriskConfModulesProvider::SERVICE_NAME);
```

So `getNewSettingsForDependentModules()` refreshes the **same** SIPConf singleton that `ExtensionsConf::reload()` will use via hooks.

### Key Finding: SIPConf lazy-load fallback

```php
// SIPConf.php:287-289
public function extensionGenContexts(): string {
    if ($this->data_providers === null) {
        $this->getSettings();  // Lazy-load if not initialized
    }
    // Uses $this->data_providers to generate incoming contexts
}
```

If `data_providers` is already set (from previous cycle), it won't re-read from DB.

### Key Finding: Transaction timing

All beanstalk messages are sent **DURING** the transaction (in afterDelete callbacks), **BEFORE** commit. The 5-second timeout in WorkerModelsEvents should be sufficient for the transaction to commit (~100ms).

### Monitoring Evidence

Manual test showed TWO regenerations of extensions.conf:
```
Poll 1 (3s):  md5=e10a09  (old file, context present)
Poll 2 (6s):  md5=184e1c  (FIRST regen, context STILL PRESENT)
Poll 5 (15s): md5=a0a3e5  (SECOND regen, context REMOVED)
```

The first regeneration at ~6s still had the stale context. The second at ~15s removed it.

### Possible Root Causes (to investigate)

1. **Two reload cycles**: The first regen might be from creation events (if user deleted provider before creation cycle completed). Need DEBUG-TRACE logging to confirm.

2. **`last_change` not updated**: `fillModifiedTables()` only sets `last_change` when going from 0→>0 planned actions. If there were already pending actions, the timer started earlier and the 5s window may overlap with the delete transaction.

3. **Singleton `data_providers` stale**: If `getNewSettingsForDependentModules` refreshed the singleton with stale data (before transaction commit), the non-null `data_providers` prevents `extensionGenContexts()` from re-reading.

4. **`ReloadPJSIPAction` runs before `ReloadDialplanAction`**: `SIPConf::reload()` creates a NEW SIPConf instance and calls `getSettings()` on it. This does NOT affect the singleton. But it calls `core reload` on Asterisk which re-reads the OLD extensions.conf.

## Files Involved

### Source Code
- `src/Core/Workers/WorkerModelsEvents.php` - Worker with the deferred fix (lines 433-510: startReload, 593-619: fillModifiedTables)
- `src/Core/Asterisk/Configs/SIPConf.php` - Generates incoming contexts (lines 285-330: extensionGenContexts, 402-410: getSettings, 505-537: getProviders)
- `src/Core/Asterisk/Configs/ExtensionsConf.php` - Main extensions.conf generator (lines 311-322: reload)
- `src/Core/Asterisk/Configs/AsteriskConfigClass.php` - Base class (lines 112-137: hookModulesMethod, 182-188: generateConfig)
- `src/Core/Providers/AsteriskConfModulesProvider.php` - Creates singleton config objects
- `src/Core/Asterisk/Configs/Generators/Extensions/IncomingContexts.php` - Generates incoming context dialplan
- `src/PBXCoreREST/Lib/Providers/DeleteRecordAction.php` - API delete handler
- `src/PBXCoreREST/Lib/Common/BaseActionHelper.php` - Transaction wrapper (executeInTransaction)
- `src/Core/Workers/Libs/WorkerModelsEvents/Actions/ReloadDialplanAction.php` - Calls ExtensionsConf::reload()
- `src/Core/Workers/Libs/WorkerModelsEvents/Actions/ReloadPJSIPAction.php` - Calls SIPConf::reload()
- `src/Core/Workers/Libs/WorkerModelsEvents/ProcessOtherModels.php` - Model→action dependency table

### Test
- `tests/api/test_30_provider_deletion_dialplan_cleanup.py` - Regression test (7 steps, currently passes because it uses forced regeneration + 45s polling)

## Next Steps for Debugging

### 1. Add DEBUG-TRACE logging (WARNING level)

The debug logging was added to WorkerModelsEvents.php but host file wasn't synced to container. Need to either:
- Use `docker exec` to edit the file directly in the container, OR
- Copy the file into the container with `docker cp`

Key log points to add (at LOG_WARNING level so they appear in syslog):
- `fillModifiedTables()`: log model name, action, recordId, existing planned actions count, whether timer was reset
- `startReload()`: log elapsed time, modified models, planned actions, whether timeout was bypassed
- `startReload()`: log completed actions list

### 2. Reproduce with logging

1. Create provider + incoming route via web UI
2. Wait 15+ seconds for creation events to fully process
3. Start monitoring `grep DEBUG-TRACE /storage/usbdisk1/mikopbx/log/system/messages`
4. Delete provider
5. Watch logs to see exact sequence: which models triggered which actions, timer timing, number of reload cycles

### 3. Potential fix approaches

**Approach A: Reset `last_change` on EVERY new event (not just first)**
```php
// In fillModifiedTables(), change:
if ($countPlannedActions === 0 && count($this->plannedReloadActions) > 0) {
// To:
if (count($this->plannedReloadActions) > 0) {
```
This ensures the 5-second timer restarts for every new event.

**Approach B: Force SIPConf to re-read DB in extensionGenContexts()**
```php
// In SIPConf::extensionGenContexts(), always refresh:
public function extensionGenContexts(): string {
    $this->data_providers = $this->getProviders(); // Always re-read
    // ...
}
```
This bypasses any stale singleton data.

**Approach C: Clear singleton data_providers before reload**
In `ReloadDialplanAction::execute()`, clear the singleton SIPConf's data before calling reload:
```php
public function execute(array $parameters = []): void {
    // Force fresh data for all config singletons
    $singletons = Di::getDefault()->getShared(AsteriskConfModulesProvider::SERVICE_NAME);
    foreach ($singletons as $obj) {
        if (method_exists($obj, 'getSettings')) {
            $obj->getSettings();
        }
    }
    ExtensionsConf::reload();
}
```

**Approach D: Make ExtensionsConf::reload() refresh hook objects**
Before calling `generateConfig()`, refresh all hooked objects:
```php
public static function reload(): void {
    $conf = new self();
    // Force all singleton configs to re-read from DB
    $modules = $conf->di->getShared(AsteriskConfModulesProvider::SERVICE_NAME);
    foreach ($modules as $module) {
        if (method_exists($module, 'getSettings')) {
            $module->getSettings();
        }
    }
    $conf->generateConfig();
    // ...
}
```

## Container Info
- Container: `mikopbx-php83` (IP: 192.168.97.2, HTTP: 8081, API v3)
- Host code synced to container via Docker volume mount, BUT worker must be restarted to pick up changes
- To copy file directly: `docker cp file.php mikopbx-php83:/usr/www/src/Core/Workers/WorkerModelsEvents.php`
- To restart worker: `bash .claude/skills/container-inspector/scripts/restart-worker.sh mikopbx-php83 WorkerModelsEvents`
- Test command: `cd tests/api && MIKOPBX_API_URL="http://192.168.97.2:8081/pbxcore/api/v3" MIKOPBX_API_USERNAME="admin" MIKOPBX_API_PASSWORD="123456789MikoPBX#1" python3 -m pytest test_30_provider_deletion_dialplan_cleanup.py -v -s`
