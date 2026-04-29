---
name: h-fix-asterisk-sounds-symlink
branch: fix/asterisk-sounds-symlink
status: in-progress
created: 2026-04-29
related-task: t2_linux5 repo `h-rename-asterisk-sounds-base-rootfs.md` (must land together)
---

# Asterisk reads sounds from writable storage via runtime symlink

## Problem/Goal

GitHub issue [mikopbx/Core#1038](https://github.com/mikopbx/Core/issues/1038): custom Language Pack modules from the marketplace install sound files into `/storage/usbdisk1/mikopbx/media/sounds/`, but Asterisk reads from `/offload/asterisk/sounds/` (because Asterisk constructs the sounds path as `${astdatadir}/sounds/`). Result: only `en-en` and `ru-ru` (baked into the read-only rootfs at the path Asterisk reads from) actually play. All 23 other languages and every custom Language Pack module are silently invisible to Asterisk.

The PHP-side pipeline added in commit 48740886a (Nov 2025) is complete and correct:
- `SoundFilesConf::start()` copies all base languages from rootfs into writable storage
- `WorkerSoundFilesInit::start()` calls `SoundFilesConf::convertAllSoundFiles()` which transcodes every wav/mp3 into all 7 Asterisk codec formats (wav/mp3/ulaw/alaw/gsm/g722/sln/opus)
- `SoundFilesConf::installModuleSounds()` puts Language Pack module sounds into the same writable storage dir
- `AsteriskConf::generateConfigProtected()` writes `astsoundsdir => /storage/usbdisk1/mikopbx/media/sounds` into `/etc/asterisk/asterisk.conf`

The last mile was never delivered: stock Asterisk has no `astsoundsdir` directive — it only honors `astetcdir, astmoddir, astvarlibdir, astdbdir, astkeydir, astdatadir, astagidir, astrundir, astlogdir, astsbindir, astspooldir`. The directive is silently ignored, the patch to add it to `main/asterisk.c` is not present in `t2_linux5/package/miko/asterisk/` (21 other patches, no sounds patch).

This task fixes the issue without patching Asterisk — using the same pattern MikoPBX already uses for JS/CSS/View caches: a runtime symlink created in `Storage::createWorkDirs()` under `mount -o remount,rw /offload`. That makes `/offload/asterisk/sounds → /storage/usbdisk1/mikopbx/media/sounds` so Asterisk's `${astdatadir}/sounds/` lookups land in writable storage, where all base languages and module sounds (in all formats) live.

For the symlink to land cleanly, `t2_linux5` must rename the rootfs base sounds dir from `sounds/` to `sounds-base/` (otherwise the runtime symlink can't replace a non-empty rootfs directory). That coordination is in `h-rename-asterisk-sounds-base-rootfs.md` in the t2_linux5 repo.

## Success Criteria

- [ ] `resources/sounds/` renamed to `resources/sounds-base/` (contents identical)
- [ ] `SoundFilesConf::SOURCE_SOUNDS_DIR` constant points to `/offload/asterisk/sounds-base`
- [ ] `Storage::createWorkDirs()` creates `/offload/asterisk/sounds → /storage/usbdisk1/mikopbx/media/sounds` symlink under `remount,rw /offload` block
- [ ] Symlink creation is idempotent — repeated boots reproduce the same state
- [ ] `AsteriskConf::generateConfigProtected()` no longer writes `astsoundsdir => ...` to `asterisk.conf` (dead directive removed)
- [ ] PHPStan still passes on the three changed files (`Storage.php`, `AsteriskConf.php`, `SoundFilesConf.php`)
- [ ] After deploy + boot on dev box `100.64.0.19` (paired with t2_linux5 image rebuild):
  - [ ] `ls -la /offload/asterisk/sounds` shows symlink → `/storage/usbdisk1/mikopbx/media/sounds`
  - [ ] `cat /etc/asterisk/asterisk.conf` has no `astsoundsdir` line
  - [ ] `asterisk -rx "core show settings"` unchanged for `Sounds search custom dir`
  - [ ] Asterisk plays a non-base language sound (e.g. de-de from a Language Pack module) without "Failed to open file" errors

## Required Changes

### Change 0: Extend `SoundFilesConf::start()` to copy supplementary content

`SoundFilesConf::start()` historically only copied language-country directories (regex `^[a-z]{2}-[a-z]{2}$/i`) from source to target — `moh/`, `other/`, `blacklist.txt`, `filter.sh` were silently skipped because they used to live in the rootfs at `/offload/asterisk/sounds/` and were read directly by consumers (Asterisk, MusicOnHoldConf, etc).

After the symlink redirect lands, `/offload/asterisk/sounds/` becomes the writable storage tree. Anything not copied into it is invisible. Most critically:

- **`MusicOnHoldConf::checkMohFiles()`** (line 97): does `glob("/offload/asterisk/sounds/moh$mask")` to restore default MOH tracks when the live MOH dir is empty. After symlink → resolves to `/storage/.../sounds/moh/` → empty → silent MOH on fresh installs.
- **White-label `other/` injections** (per t2_linux5 task → `sounds-base/other/`): same problem — Asterisk would see them through the symlink only if `SoundFilesConf` copies them across.

Add a new private method `copySupplementaryFiles($targetDir)` that iterates entries in `SOURCE_SOUNDS_DIR`, skips language-country dirs (already handled), and `cp -Rn` everything else into the target. Call it from `start()` BEFORE the early-return guard so:
- Fresh installs get the supplementary content on first boot together with languages
- Already-initialised installs (upgrade scenario) get the supplementary content dropped in even though languages are already present (early-return path is taken)

`cp -Rn` (no-clobber) preserves any user customisations already in the target.

### Change 1: Rename `resources/sounds/` → `resources/sounds-base/`

```bash
git -C /Volumes/DevDisk/Developement/mikopbx/Core mv resources/sounds resources/sounds-base
```

Contents (`blacklist.txt`, `filter.sh`, `en-en/`, `ru-ru/`, `moh/`, `other/`) move unchanged. Path inside container after rootfs build: `/offload/asterisk/sounds-base/` (handled by t2_linux5 task).

### Change 2: `src/Core/System/Configs/SoundFilesConf.php` line 48

```diff
-    private const string SOURCE_SOUNDS_DIR = '/offload/asterisk/sounds';
+    /**
+     * Source directory for system sound files (read-only, baked into rootfs).
+     * On first boot, SoundFilesConf::start() copies these into AST_SOUNDS_DIR
+     * (writable storage). Asterisk itself reads sounds via the symlink
+     * /offload/asterisk/sounds → /storage/.../sounds (created by
+     * Storage::createWorkDirs()), so this base path is only consulted by the
+     * PHP installer, never by Asterisk directly.
+     */
+    private const string SOURCE_SOUNDS_DIR = '/offload/asterisk/sounds-base';
```

### Change 3: `src/Core/System/Storage.php` `createWorkDirs()` method

Inside the existing `mount -o remount,rw /offload` block (between line 863 and line 912), add a symlink creation step next to the existing asset/view/agi-bin symlinks:

```diff
@@ -899,6 +899,16 @@ private function createWorkDirs(): void
         // Ensure Volt cache directory exists
         $voltCacheDir = Directories::getDir(Directories::APP_VOLT_CACHE_DIR);
         if (!file_exists($voltCacheDir)) {
             Util::mwMkdir($voltCacheDir);
         }

+        // Asterisk sounds: expose writable sounds directory at the path Asterisk
+        // actually reads from (${astdatadir}/sounds = /offload/asterisk/sounds).
+        // Stock Asterisk has no astsoundsdir directive, so we use a symlink —
+        // same pattern as createAssetsSymlinks/createViewSymlinks above.
+        // Base languages live at /offload/asterisk/sounds-base/ (rootfs), which
+        // SoundFilesConf::start() copies into the writable target on first boot.
+        Util::createUpdateSymlink(
+            Directories::getDir(Directories::AST_SOUNDS_DIR),
+            '/offload/asterisk/sounds'
+        );
+
         $this->createAssetsSymlinks();
         $this->createViewSymlinks();
         $this->createAGIBINSymlinks($isLiveCd);
```

`Util::createUpdateSymlink($target, $link)`:
- creates `$target` directory via `mwMkdir` (if needed)
- if `$link` already exists as a symlink to a different target, copies content over and replaces it
- if `$link` exists as an empty directory, removes it and creates the symlink
- creates the symlink

This is fully idempotent. After the first successful run, every subsequent boot finds the symlink already correct and is a no-op.

### Change 4: `src/Core/Asterisk/Configs/AsteriskConf.php` `generateConfigProtected()` method

Remove the dead `astsoundsdir` directive — stock Asterisk doesn't honor it; with the runtime symlink in place, the path is already correct via `${astdatadir}/sounds/`:

```diff
@@ -50,7 +50,6 @@ protected function generateConfigProtected(): void
         $astrundir = '/var/asterisk/run';
         $astmoddir = Directories::getDir(Directories::AST_MOD_DIR);
         $astvarlibdir = Directories::getDir(Directories::AST_VAR_LIB_DIR);
-        $astsoundsdir = Directories::getDir(Directories::AST_SOUNDS_DIR);
         $astdbdir = Directories::getDir(Directories::AST_DB_DIR);
         $astlogdir = Directories::getDir(Directories::AST_LOG_DIR);
         $astspooldir = Directories::getDir(Directories::AST_SPOOL_DIR);
@@ -65,7 +64,6 @@ protected function generateConfigProtected(): void
             "astrundir => {$astrundir}\n" .
             "astmoddir => {$astmoddir}\n" .
             "astvarlibdir => {$astvarlibdir}\n" .
-            "astsoundsdir => {$astsoundsdir}\n" .
             "astdbdir => {$astdbdir}\n" .
             "astlogdir => {$astlogdir}\n" .
             "astspooldir => {$astspooldir}\n" .
```

### Not changed: `Directories::AST_SOUNDS_DIR` constant in `src/Core/System/Directories.php`

`AST_SOUNDS_DIR = 'asterisk.astsoundsdir'` resolves via `mikopbx-settings.json:28` to `/storage/usbdisk1/mikopbx/media/sounds`. PHP code uses this path everywhere as the writable target. We keep both the constant and the JSON key — they're now consumed only by PHP code (`SoundFilesConf::installModuleSounds()`, `Storage::createWorkDirs()`, etc.), no longer written into asterisk.conf. The name "astsoundsdir" is misleading now (since stock Asterisk doesn't have such a directive), but renaming is a separate concern and would touch many call sites. Leave for a future refactor.

### Files NOT touched but verified safe

- `MusicOnHoldConf.php:97` `glob("/offload/asterisk/sounds/moh$mask")` — resolves through the symlink to `/storage/.../sounds/moh/`, where `SoundFilesConf::start()` copies `moh/` from `sounds-base/`. ✓
- `Storage.php:79` `if (stripos($soundFile->path, '/offload/asterisk/sounds/other/') === 0)` — string-prefix check on raw path, symlink-aware. ✓
- `UpdateConfigsUpToVer202301225.php:49,52` — historic upgrade script, doesn't run on current versions. ✓

## Coordination with t2_linux5

The t2_linux5 task `h-rename-asterisk-sounds-base-rootfs.md` does:
1. `package/miko/pbx/pbx.conf`: copy `resources/sounds-base/*` → `$root/var/asterisk/sounds-base/` (was `sounds/*` → `sounds/`)
2. `target/share/mikopbx-build/miko_firmware/clean-prompts.part`: clean `offload_stage/asterisk/sounds-base/` (was `sounds/`)
3. `target/share/mikopbx-build/white-label/llacotPBX/build-image.sh`: white-label sounds → `sounds-base/other/` (was `sounds/other/`)

Result on built partition: `/offload/asterisk/sounds-base/` (real dir) and NO `/offload/asterisk/sounds/`.

Both repos must release together. Standalone Core ship without t2_linux5: `Util::createUpdateSymlink` calls PHP `rmdir()` on the non-empty `/offload/asterisk/sounds/` from current rootfs → fails silently → no symlink → state identical to broken-today behaviour. Standalone t2_linux5 ship without Core: rootfs has no `sounds/` and no symlink gets created → ALL sounds break (including en-en/ru-ru) → catastrophic regression.

## Verification

### After local edits, before deploy

1. PHPStan on changed files (per global rule):
   ```bash
   cd /Volumes/DevDisk/Developement/mikopbx/Core
   docker exec mikopbx-php83 vendor/bin/phpstan analyse \
     src/Core/System/Storage.php \
     src/Core/Asterisk/Configs/AsteriskConf.php \
     src/Core/System/Configs/SoundFilesConf.php
   ```
   Expected: no new errors introduced by these changes.

2. Confirm renamed dir:
   ```bash
   ls /Volumes/DevDisk/Developement/mikopbx/Core/resources/sounds-base/
   # blacklist.txt  en-en  filter.sh  moh  other  ru-ru
   git -C /Volumes/DevDisk/Developement/mikopbx/Core status
   # Should show: renamed: resources/sounds/* -> resources/sounds-base/*
   #              modified: src/Core/Asterisk/Configs/AsteriskConf.php
   #              modified: src/Core/System/Storage.php
   #              modified: src/Core/System/Configs/SoundFilesConf.php
   ```

### After deploy on 100.64.0.19 (paired with t2_linux5 partition rebuild)

```bash
ssh root@100.64.0.19 'ls -la /offload/asterisk/'
# Expected:
#   sounds-base/                                       (real dir from rootfs)
#   sounds → /storage/usbdisk1/mikopbx/media/sounds   (symlink, created by createWorkDirs)

ssh root@100.64.0.19 'cat /etc/asterisk/asterisk.conf | grep -i sounds'
# Expected: empty (astsoundsdir directive removed)

ssh root@100.64.0.19 'asterisk -rx "core show settings" | grep -A1 Directories'
# Expected: Data directory: /offload/asterisk  (unchanged, sounds resolve via symlink)

ssh root@100.64.0.19 'ls /offload/asterisk/sounds/' # follows symlink
# Expected: en-en  ru-ru  ... (all 25 langs after WorkerSoundFilesInit ran)

# After installing a Language Pack module (e.g. de-de) from marketplace:
ssh root@100.64.0.19 'asterisk -rx "originate Local/100@internal application Playback de-de/digits/1"'
# Expected: call connects, German "1" prompt plays

# Validate format conversion: every base language has all 7 codec variants
ssh root@100.64.0.19 'ls /storage/usbdisk1/mikopbx/media/sounds/en-en/ | head'
# Expected: digits/  letters/  *.alaw  *.g722  *.gsm  *.opus  *.sln  *.ulaw  *.wav
```

## Risks and Edge Cases

- **First boot after upgrade from older firmware (pre-fix)**: existing systems already have `/storage/.../sounds/` populated by older `SoundFilesConf::start()`. After upgrade, rootfs has `sounds-base/` (new) and no `sounds/` (new). `Storage::createWorkDirs()` runs on every boot — on the first one after upgrade, `/offload/asterisk/sounds` does not exist (rootfs no longer ships it), so `createUpdateSymlink` falls into the "create new symlink" branch. Storage content stays untouched. ✓
- **Pre-fix system upgraded to fix without t2_linux5 rebuild**: `/offload/asterisk/sounds/` still exists as a real dir from old rootfs. `createUpdateSymlink` calls PHP `rmdir()` (line 591 of `Util.php`) which fails on non-empty dir, so the symlink is NOT created. Behaviour stays as it is today — buggy but not worse. The t2_linux5 rebuild is required to actually fix the issue, and that's documented as the joint coordinated release.
- **Fresh install (clean partition, fresh storage)**: rootfs has `sounds-base/`, storage empty. Boot order:
  1. `Storage::createWorkDirs()` runs → `Util::createUpdateSymlink` creates `/storage/.../sounds/` via `mwMkdir`, then symlinks `/offload/asterisk/sounds → /storage/.../sounds`.
  2. `WorkerSoundFilesInit` runs → `SoundFilesConf::start()` reads from `/offload/asterisk/sounds-base/` and copies `en-en, ru-ru, moh, other, ...` to `/storage/.../sounds/`.
  3. `convertAllSoundFiles()` transcodes everything to 7 codec formats.
  4. Asterisk `${astdatadir}/sounds/` resolves through symlink to `/storage/.../sounds/`, finds everything.
- **Repeated boots / system upgrades**: `Storage::createWorkDirs()` runs every boot. Second time, `/offload/asterisk/sounds` is already a symlink to the correct target — `createUpdateSymlink` short-circuits (sees correct existing link, does nothing). No-op. ✓
- **Module install/uninstall**: `SoundFilesConf::installModuleSounds()` writes to `Directories::getDir(Directories::AST_SOUNDS_DIR) = /storage/.../sounds/`. Asterisk picks it up via symlink. ✓
- **MusicOnHoldConf and `sounds/other`**: glob/strpos paths starting with `/offload/asterisk/sounds/...` continue to work because PHP doesn't `realpath()` them; the symlink kernel translation is transparent. With the supplementary-copy fix in `SoundFilesConf::start()`, the writable target also contains `moh/`, `other/`, `blacklist.txt`, `filter.sh` so these consumers find what they expect.

## User Notes

The dead `astsoundsdir` directive went into `asterisk.conf` for ~6 months (since Nov 2025). Stock Asterisk just ignored it, so nothing crashed — it was a silent no-op. The fix removes it both because it's misleading (anyone reading the config thinks sounds are configurable, they're not via that key) and because the future state has the correct path delivered via filesystem symlink.

Future cleanup candidate (separate task, not blocking): rename `Directories::AST_SOUNDS_DIR` constant and `mikopbx-settings.json` key from `astsoundsdir` to something like `astsoundswritabledir` or `mediaSoundsDir` — but that touches many call sites and isn't required to fix #1038.

## Work Log

- 2026-04-29 Investigation: confirmed `astsoundsdir` is not a real Asterisk directive (verified via stock Asterisk source `main/asterisk.c` and live `core show settings` on dev box 100.64.0.19); confirmed no Asterisk patch in t2_linux5 adds it; traced commit 48740886a (2025-11-04) where `astsoundsdir` line was added to `AsteriskConf.php` without companion patch; identified `Storage::createWorkDirs` cache-symlink pattern as model for fix.
- 2026-04-29 Created task. Companion task `h-rename-asterisk-sounds-base-rootfs.md` filed in t2_linux5 repo.
- 2026-04-29 First implementation pass: renamed `resources/sounds/` → `resources/sounds-base/` (1162 files, R100 in git), updated `SoundFilesConf::SOURCE_SOUNDS_DIR`, added symlink in `Storage::createWorkDirs()`, removed dead `astsoundsdir` from `AsteriskConf`. PHPStan baseline: 14 pre-existing errors, delta 0 after changes.
- 2026-04-29 Codex review caught a regression: `MusicOnHoldConf::checkMohFiles():97` glob's `/offload/asterisk/sounds/moh*` to restore MOH defaults when live dir is empty. After symlink, that path resolves to writable `/storage/.../sounds/moh/`, but `SoundFilesConf::start()` only copies xx-xx language dirs — moh/, other/, top-level files were silently skipped. Same root cause would also break white-label `sounds-base/other/` injections.
- 2026-04-29 Fix: added `SoundFilesConf::copySupplementaryFiles()` private method invoked from `start()` BEFORE the early-return gate, doing `cp -Rn` for every non-language entry in source. Idempotent (preserves user customisations), runs every boot to handle upgrade scenarios where languages already populated but supplementary content absent.
