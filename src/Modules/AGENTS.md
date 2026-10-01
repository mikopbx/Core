# src/Modules - extension module framework

Base classes and hook contracts that external modules (`Modules\<UniqueID>\...`, installed under
`core.modulesDir`) build on. Repo-wide rules live in the root AGENTS.md.

## Conventions the code relies on but does not enforce

- Module UniqueID must start with `Module`. The config class is resolved by convention:
  `Modules\<UniqueID>\Lib\<UniqueID without "Module">Conf` (see `PbxExtensionState::reloadConfigClass()`
  and `PbxExtensionUtils::validateEnabledModules()`). A wrongly named class is silently treated as "no config class".
- `ConfigClass` and `ModulesModelsBase` derive UniqueID and paths from the namespace: exactly 3 segments,
  first one `Modules`. Deeper namespaces lose `moduleUniqueId`/DB connection binding.
- Hook names are the string constants in `Config/*Interface.php`; they are dispatched by name through
  `Common/Providers/PBXConfModulesProvider::hookModulesMethod()` (results keyed by UniqueID, empty results
  dropped, exceptions swallowed and syslogged). Add a hook = add the constant, a stub in `ConfigClass`, and a caller.
- Two constants have no stub in `ConfigClass`: `GENERATE_FAIL2BAN_FILTERS` and `GET_PASSKEY_SESSION_DATA`.
  Callers use `method_exists`, so modules opt in by simply defining the method. `getWafExemptions()` and
  `applyACLFiltersToCDRQuery()` are the reverse: stubs exist, but `CDRConfigInterface` is not in the
  `implements` list and WAF has no interface constant. Keep this asymmetry unless you fix all sides.
- Overriding a hook with an incompatible signature is a PHP fatal, not an exception. `validateEnabledModules()`
  probes each enabled module in a separate `php -r` process at boot and force-disables offenders.

## Lifecycle ordering (do not reorder without reading the comments)

- Install: `checkCompatibility -> activateLicense -> installFiles -> installDB -> fixFilesRights`.
  `installDB` = create tables from model annotations, register in `PbxExtensionModules`
  (`module_type` from `module.json`, default `general`), add sidebar item.
- Enable: license -> recreate module DB connections -> probe (`onBeforeModuleEnable`, broken relations) ->
  firewall -> `onBeforeModuleEnable` again -> persist flag -> sounds -> `onAfterModuleEnable` -> volt cache -> WAF sync.
  Disable mirrors it; workers are killed only after `onAfterModuleDisable` on purpose.
- `onBeforeModuleEnable/Disable` returning `false` aborts only inside the probe; the probe runs in a
  transaction that is always rolled back. Do not persist anything from those hooks.
- Once the enabled flag is persisted, later failures are reported but never roll the flag back.
- Every enable/disable/force-disable path must go through `PbxExtensionState`, which holds a per-module
  advisory flock (`/var/run/mikopbx/module_state_<id>.lock`, reentrant in-process). Bypassing it races the
  crash-loop watchdog in `Core/Workers/Cron/WorkerSafeScriptsCore`.

## Caches to invalidate

- `PbxExtensionUtils::isEnabled()` caches only `true` (1h); `false` is re-queried every call.
- `ModulesStateCache` (`modules:state:hash`) is what tells workers to restart; `PBXConfModulesProvider::getVersionsHash(true)`
  must be called after install/uninstall (asset and translation cache busting).

## Docs

Public developer docs are the DevelopementDocs repo (`module-developement/`); the `@see docs.mikopbx.com`
links in docblocks point there. Update them when changing a hook contract.
