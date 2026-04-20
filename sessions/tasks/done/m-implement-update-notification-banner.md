---
name: m-implement-update-notification-banner
branch: feature/update-notification-banner
status: completed
created: 2026-04-20
completed: 2026-04-20
---

# Update Notification Banner (GitLab-style)

## Problem/Goal

MikoPBX currently notifies admins about available PBX and module updates only via a small bell icon in the top navbar. It's easy to miss, especially for critical security updates. Inspired by GitLab's critical patch notification banner, we want a prominent, dismissible banner at the top of every admin page.

Additionally, MikoPBX sometimes releases security patches as external modules. We need a `module_type: "security"` classification so the banner can highlight uninstalled security patches in red.

## Success Criteria

- [x] `module_type` field added to `PbxExtensionModules` model with extended enum `general`/`languagepack`/`security`/`cti`/`utility`/`call_feature`/`ai` (default `general`, open-ended — any server-provided string is accepted)
- [x] Migration backfills existing installed modules from their `module.json` (`UpdateConfigsUpToVer2026188`)
- [x] New module installations persist `module_type` from `module.json` (`PbxExtensionSetupBase::registerNewModule`)
- [x] `CheckUpdates` worker emits severity-aware advice (`info`/`warning`) using `severity` field from release server, defaulting to `info` when absent
- [x] `CheckModulesUpdates` worker emits `warning`-level advice for uninstalled security modules and for security module updates
- [x] Top-of-page dismissible banner appears on all admin pages when security/critical updates available
- [x] Banner is red for security/critical issues; regular (info-level) updates stay in the existing bell icon only (refinement agreed mid-task — avoids banner noise for non-urgent updates)
- [x] "Remind me in 3 days" and close button store dismiss state in `localStorage` (key includes `messageTpl + module + version`, so new versions re-show the banner)
- [x] All changes fully backward-compatible: works with current release server responses (no `severity`, no `module_type` fields)
- [x] New translation keys (16 total: 7 in Common.php, 9 in Modules.php) added to all 26 project locales (en, ru + 24 others via pbx-translation-expert)
- [x] `module_type` exposed in REST API module responses (`/pbxcore/api/v3/modules`) via `DataStructure` SSoT
- [x] **Bonus:** marketplace module category dropdown filter with dynamic category collection + forward-compat labels for unknown types (client change; awaiting server-side `module_type` exposure — captured to `wiki-llm/inbox/2026-04-20-1708-release-server-module-type-severity.md` for server team)

## Context Manifest

### Current Architecture

**Advice pipeline (already exists):**
- `WorkerPrepareAdvice` runs every 5 seconds, processes advice modules with cached results (24h TTL for updates)
- `CheckUpdates` (`src/Core/Workers/Libs/WorkerPrepareAdvice/CheckUpdates.php`) calls `GET /pbxcore/api/v3/system:checkIfNewReleaseAvailable`, emits `info`-level advice with key `adv_AvailableNewVersionPBX`
- `CheckModulesUpdates` calls `GetAvailableModulesAction::main()`, compares installed vs remote versions, emits `info`-level advice with key `adv_AvailableNewVersionModule`
- `GetAdviceListAction::main()` aggregates all cached advice, publishes via EventBus `'advice'` channel
- Frontend `advice-worker.js` subscribes to `'advice'` channel and renders the bell icon popup

**Advice data structure:**
```json
{
  "error":   [{"messageTpl": "key", "messageParams": {...}}],
  "warning": [{"messageTpl": "key", "messageParams": {...}}],
  "info":    [{"messageTpl": "key", "messageParams": {...}}],
  "needUpdate": [...]
}
```

**Release server endpoints:**
- `https://releases.mikopbx.com/releases/v1/mikopbx/ifNewReleaseAvailable` — quick check, returns `{newVersionAvailable, version}`
- `https://releases.mikopbx.com/releases/v1/mikopbx/getAvailableModules` — module list, cached 1h

**Module categorization (current):**
- Only `module_type: "languagepack"` is recognized, via `PbxExtensionUtils::isLanguagePackModule()` which reads `module.json` from filesystem
- No `module_type` column in `PbxExtensionModules` model
- Module metadata API (`DataStructure.php`) does not expose `module_type`

### Files to Modify

| File | Action | Line |
|------|--------|------|
| `src/Common/Models/PbxExtensionModules.php` | Add `$module_type` property with `@Column` annotation | ~120 |
| `src/Core/System/Upgrade/Releases/UpdateConfigsUpToVer2026188.php` | **Create** — backfill migration | new file |
| `src/Modules/Setup/PbxExtensionSetupBase.php` | Read `module_type` from `module.json` in `registerNewModule()` | ~507 |
| `src/PBXCoreREST/Lib/System/CheckIfNewReleaseAvailableAction.php` | Pass `severity` field from server response | ~118 |
| `src/Core/Workers/Libs/WorkerPrepareAdvice/CheckUpdates.php` | Use severity-aware advice level | ~81 |
| `src/Core/Workers/Libs/WorkerPrepareAdvice/CheckModulesUpdates.php` | Detect security modules + version updates severity | ~53 |
| `src/PBXCoreREST/Lib/Modules/DataStructure.php` | Add `module_type` to API field definitions | field definitions, `createFromModel`, `createFromRepositoryData`, `getOpenApiSchema` |
| `src/Common/Messages/en/Common.php` (+ 28 locales) | Add 5 new translation keys | — |
| `src/AdminCabinet/Views/layouts/main.volt` | Add banner DOM | ~20 |
| `sites/admin-cabinet/assets/js/src/Advice/update-banner.js` | **Create** — banner logic | new file |
| `src/AdminCabinet/Providers/AssetProvider.php` | Register `update-banner.js` | ~274 |

### Design Decisions

1. **Single `module_type` field** for all categorization (not separate `type` + `category`)
2. **Severity from server** for core updates, defaults to `info` → backward compatible
3. **`module_type: "security"` uninstalled** → red banner ("install patch")
4. **`localStorage` dismiss** (per-browser, not per-instance) — simpler for v1; can migrate to `PbxSettings` later if multi-admin scenario requires
5. **Dismiss key** = `updateBannerDismiss_{messageTpl}_{version}` — new versions re-show automatically
6. **Critical severity** maps to `warning` in advice pipeline (no `critical` bucket exists); banner JS distinguishes red vs blue by `severity` in `messageParams`

### Implementation Order

1. Model column → auto-migration adds DB column on boot
2. Backfill migration → existing rows get `module_type`
3. `PbxExtensionSetupBase::registerNewModule()` → new installs persist field
4. `DataStructure.php` → API exposes field (purely additive)
5. `CheckIfNewReleaseAvailableAction.php` → passes `severity` with `?? 'info'`
6. `CheckUpdates.php` → uses `severity` for advice bucket
7. `CheckModulesUpdates.php` → security module detection (two passes)
8. Translation keys (PHP messages + banner UI labels)
9. `main.volt` → banner DOM (hidden by default)
10. `update-banner.js` → subscribes to `'advice'` EventBus, manages display/dismiss
11. `AssetProvider.php` → loads banner JS on all pages
12. Babel transpile → ES5 output in `sites/admin-cabinet/assets/js/pbx/Advice/update-banner.js`

### Verification

1. Restart `mikopbx-php83` container, verify `module_type` column exists in `m_PbxExtensionModules` via `sqlite-inspector`
2. Confirm existing language pack modules backfilled to `module_type='languagepack'`
3. Call `GET /pbxcore/api/v3/advice:getList` — structure unchanged, still `{error, warning, info}`
4. Call `GET /pbxcore/api/v3/modules` — response now includes `module_type`
5. Open admin UI — banner appears if updates available (blue) or hidden if up-to-date
6. Click "Remind me in 3 days" → banner disappears → F5 → still hidden → clear `localStorage` → banner reappears
7. Simulate `module_type: "security"` in advice cache → banner renders red with "Install patch" button
8. Run PHPStan on all modified PHP files: `docker exec mikopbx-php83 /offload/rootfs/usr/www/vendor/bin/phpstan analyse <file> --level=max`

## User Notes

- Обратная совместимость критична: сервер `releases.mikopbx.com` сейчас не возвращает `severity` и `module_type`. Все изменения должны работать "молча" на текущих ответах и активироваться когда сервер начнёт отдавать новые поля.
- Security-модули = обычные модули с `module_type: "security"` в `module.json`, особой логики установки не требуется
- `module_type` отдельно от `severity`: для модулей `type=security` достаточно (нет "неважных security-модулей"); для ядра severity отдельным полем с сервера
- После реализации базового функционала можно опционально добавить группировку в маркетплейсе по `module_type`

## Work Log

### 2026-04-20

- Task created, plan approved (stored at /Users/nb/.claude/plans/precious-brewing-frost.md).

#### Pre-work housekeeping
- Restored 303 vendor CSS/JS assets that had been left uncopied: `git restore sites/admin-cabinet/assets/{css,js}/vendor/`.
- Stashed unrelated `.claude/hooks/pre-commit-review.js` improvement as `stash@{0}: pre-commit-review-dual-agent-update` (user to pop when convenient).
- Fast-forwarded `develop` (+5 upstream commits), branched `feature/update-notification-banner` from fresh tip.

#### Backend
- `src/Common/Models/PbxExtensionModules.php` — added `public ?string $module_type = 'general'` with `@Column` annotation (open-ended enum, any server string accepted).
- `src/Core/System/Upgrade/Releases/UpdateConfigsUpToVer2026188.php` — new idempotent backfill migration; reads `module_type` from each module's `module.json`, defaults to `general`.
- `src/Modules/Setup/PbxExtensionSetupBase.php` — added `$module_type` property, extraction from `module.json` in constructor, persistence in `registerNewModule()`.
- `src/PBXCoreREST/Lib/Modules/DataStructure.php` — `module_type` added to `getAllFieldDefinitions()`, `createFromModel()`, `createFromRepositoryData()`, and `$commonFields` of `getOpenApiSchema()`.
- `src/PBXCoreREST/Lib/System/CheckIfNewReleaseAvailableAction.php` — `severity` pass-through with `?? 'info'` default.
- `src/Core/Workers/Libs/WorkerPrepareAdvice/CheckUpdates.php` — severity→bucket mapping (`critical|warning` → warning, else info); severity forwarded in `messageParams`.
- `src/Core/Workers/Libs/WorkerPrepareAdvice/CheckModulesUpdates.php` — two-pass rewrite: installed modules (security update → warning bucket) and uninstalled security modules (→ warning bucket, new `adv_SecurityPatchAvailable` template).

#### Frontend
- `src/AdminCabinet/Views/layouts/main.volt` — added `<div id="update-banner" class="update-banner hidden" aria-live="polite">` inside `.article`.
- `sites/admin-cabinet/assets/css/custom.css` — banner styles (info/warning variants with colored left border, dismiss + remind buttons).
- `sites/admin-cabinet/assets/js/src/Advice/update-banner.js` — new ES6 module, subscribes to EventBus `'advice'`, renders only warning-bucket entries, localStorage dismiss keyed on `messageTpl+module+version`, "Remind in 3 days" via `remindAt` timestamp.
- `src/AdminCabinet/Providers/AssetProvider.php` — registered `update-banner.js` next to `advice-worker.js`.
- Transpiled to ES5 at `sites/admin-cabinet/assets/js/pbx/Advice/update-banner.js` via local Babel (installed to `/tmp/node_modules/`, Docker unavailable).
- `src/AdminCabinet/Views/PbxExtensionModules/indexTabs/marketplaceTab.volt` — added `#module-type-filter-wrapper` hidden dropdown above marketplace table.
- `sites/admin-cabinet/assets/js/src/PbxExtensionModules/pbx-extension-module-marketplace.js` — `selectedType` state, `registerTypeFilter/populateTypeFilter/applyTypeFilter/moduleTypeLabel`, `data-type` attribute on rows, DataTable custom filter scoped by table ID, fallback capitalized labels for unknown server-provided types. Transpiled to ES5.

#### Translations
- 16 new keys across 26 locales (7 `banner_*` + `adv_SecurityPatchAvailable` in `Common.php`; 9 `ext_ModuleType*` in `Modules.php`).
- RU/EN written manually; remaining 24 locales via `pbx-translation-expert` agent (minor apostrophe escaping fixed in fr/nl).

#### Decisions / mid-task refinements
- Extended `module_type` enum from 3 to 7 values (added `cti/utility/call_feature/ai`) per user request for richer taxonomy.
- Banner scope narrowed: only warning-bucket entries shown as banner; info-level regular updates stay in the bell exclusively (original "blue banner for regular updates" spec rejected to avoid banner noise).
- Marketplace category dropdown filter added as bonus (not in original success criteria).
- Critical severity maps to `warning` bucket (no `critical` bucket exists in advice pipeline); banner distinguishes red vs blue via `severity` in `messageParams`.
- localStorage (per-browser) chosen over `PbxSettings` for dismiss state; deferred multi-admin migration.

#### Static checks
- `php -l` — 0 errors across all 11 modified PHP files plus dedup'd locales.
- PHPStan L0 (local, `/tmp/phpstan-runner`) — 30 pre-existing Phalcon/GuzzleHttp class-not-found errors (no local vendor/); **no new errors introduced**.
- `--level=max` via container deferred to CI (Docker unavailable locally).

#### Code review findings
- Critical (fixed): duplicate `banner_*` keys in `es/Common.php` (lines 941–946) and `el/Common.php` (lines 693–698) — translation agent artifact; PHP silently used last occurrence.
- Warning (accepted): silent `save()` in migration — matches existing pattern in sibling migrations, not a regression.
- Suggestions deferred: defense-in-depth escape for `actionUrl`, dropdown re-init on refetch, localStorage key churn, `adv_AvailableNewVersionModule` i18n path.

#### Discovered / follow-ups
- Release server (`releases.mikopbx.com`) must add `module_type` and `severity` fields for full activation — spec captured at `/Volumes/DevDisk/Developement/wiki-llm/inbox/2026-04-20-1708-release-server-module-type-severity.md`.
- Marketplace dropdown filter awaits server-side `module_type` exposure; forward-compat labels already in place.

#### Blocked / not done
- Container restart + browser UI verification — Docker unavailable in current environment. Manual verification required after merge.
- Pending `stash@{0}: pre-commit-review-dual-agent-update` to pop later.
