# Third-Party Modules — Core (MikoPBX) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the MikoPBX core trustworthy for third-party marketplace modules: verify downloaded archives by sha256 over https, validate the module id before it becomes a path, record where a module came from and its trust level, show that to the administrator before and after installation, and warn (by advice + e-mail) when an installed version is revoked by moderation.

**Architecture:** The install pipeline (`src/PBXCoreREST/Lib/Modules/Pipeline/`) is the trust boundary and keeps every check: `ModuleDownloadService` gains https-only and sha256 verification; `GetMetadataFromModulePackageAction` validates `moduleUniqueID` with the single pattern declared in `DataStructure`; `InstallPipeline::phaseSetupNewVersion()` stamps `installSource`/`trustLevel` on the `PbxExtensionModules` row after the module's own installer created it. The UI (Volt + ES6 sources under `sites/admin-cabinet/assets/js/src/PbxExtensionModules/`) reads the new catalog fields (`trust_level`, `publisher`, `source_url`, `support_email`, top-level `revoked`) and shows badges, publisher details and confirmation texts. `CheckModulesUpdates` gets a separate pass over installed modules that raises an `error` advice for revoked versions — the level `WorkerNotifyAdministrator` already e-mails.

**Tech Stack:** PHP 8.4 / Phalcon 5.9 (DI, models with `@Column` annotations, `UpdateDatabase` auto-ALTER), SQLite, Redis (`ManagedCacheProvider`), Guzzle 7, PHPUnit 9 run inside a container built from the stand image (see Global Constraints), Volt, jQuery + Fomantic UI, Babel (docker `ghcr.io/mikopbx/babel-compiler`), pytest (`tests/api`).

**Spec:** `docs/superpowers/specs/2026-09-21-third-party-modules-design.md` (branch `docs/third-party-modules-spec`; sections 5 — contract, 6 — core, 8 — pilot, 9 — tests). GitHub issues #1134–#1140 (label `marketplace`), Jira umbrella LIC-320. Server side is a separate plan in `mikolicenseserver` (`docs/superpowers/plans/2026-10-01-publisher-api-step1.md`); this plan depends on the server only through the contract fields of spec section 5 and degrades gracefully when they are absent.

## Global Constraints

- Branch `worktree-third-party-modules-core` from `origin/develop`, worktree `/Volumes/DevDisk/Developement/mikopbx/Core/.claude/worktrees/third-party-modules-core`. Use `/usr/bin/git` from the worktree root (the worktree guard rejects `git -C`, `cd … && git` and the `rtk` wrapper); the pre-commit hook needs a `code-review` agent run and the flag `/Volumes/DevDisk/Developement/mikopbx/Core/.claude/.review-pass` (content `reviewed`) written **in the main checkout** by a separate Bash call before each commit, and removed after it.
- The stand container `mikopbx-php83` mounts `src`, `tests`, `vendor` and `sites/admin-cabinet` from the **main checkout**, so it never sees this worktree. Task 0 starts a second container `mikopbx-tpm` (pattern: `mikopbx-lv2e2e` from `_temp/27.09.2026/mikopbx/lv2e2e/`) that mounts `src`, `tests` and `sites/admin-cabinet` from the worktree and `vendor` from the main checkout. Every `docker exec` in this plan targets `mikopbx-tpm`. Unit tests: `docker exec mikopbx-tpm php /usr/www/vendor/bin/phpunit -c /usr/www/tests/Unit/phpunit.xml <path>` (a path is mandatory — the XML defines no suites). Restart before backend verification: `~/.claude/skills/container-inspector/scripts/restart-container.sh mikopbx-tpm --wait-services`. The worktree has no `vendor/`: PHPStan runs as `/Volumes/DevDisk/Developement/mikopbx/Core/vendor/bin/phpstan analyse -c phpstan.neon` from the worktree root (level 0, `src/`).
- JS is edited only under `sites/admin-cabinet/assets/js/src/**` and transpiled with the `babel-compiler` skill (`docker run --rm -v <project root>:/workspace ghcr.io/mikopbx/babel-compiler:latest /workspace/<file> core`); never edit `assets/js/pbx/**`. UI strings go to `src/Common/Messages/ru/*.php` first (Russian is the source) and are translated with the `translations` skill; after editing messages delete `/var/tmp/www_cache/js/localization-*.min.js` in the container.
- `use Phalcon\Di\Di;` (never `Phalcon\Di`). PSR-12. No dead code, no stubs, no mock services in tests.
- Spec values, verbatim: sha256 pattern `^[a-f0-9]{64}$`; scheme strictly `https` in the default pipeline and in `StartDownloadAction`; `moduleUniqueID` pattern in the core stays `^[A-Za-z0-9_\-]{1,128}$` (the server's `^Module…` rule is stricter on purpose); `installSource` ∈ {`marketplace`,`manual`,`''`}; `trustLevel` ∈ {`official`,`verified`,`community`,`''`}; revoked advice level `error`, key `adv_ModuleVersionRevoked`; check frequency unchanged (`cacheTime 86400`).
- Backward compatibility with the production catalog: every new field may be absent (old server) — absent `sha256` → md5 check as today; absent `trust_level` → treat as `official`; absent `revoked` → no revocations. The legacy pipeline (`MODULES_LEGACY_INSTALL_PIPELINE=1`) gets only the https narrowing; `WorkerDownloader::checkFile()` (shared with firmware) is not touched.
- Do not commit or push without the owner's word except as this plan's commit steps say (the owner approved commits of this work on the feature branch); never push to `develop`; open no PR until Task 8 says so.
- Temporary scripts only under `/Volumes/DevDisk/Developement/_temp/<DD.MM.YYYY>/mikopbx/`.

## Review Focus

1. A catalog answer whose `href` is `http://…` — the default pipeline must refuse before any byte is downloaded, with a translated error, not a Guzzle exception (Task 1 `testRefusesHttpAndMalformedUrl`). An https answer that redirects to http is refused by Guzzle itself through `allow_redirects.protocols = ['https']` (Task 1 Step 3; not unit-testable without a server).
2. A catalog `sha256` that is present but malformed (63 chars, non-hex, uppercase) — must be treated as *present and wrong* → refuse, never silently fall back to md5 (Task 1 `testMalformedSha256IsNotAFallback`). `null`, `''` or a missing key = md5 check (spec 5.3).
3. A `module.json` whose `moduleUniqueID` is `../ModuleX` or contains a space — the package path must refuse before `InstallPipeline` builds a staging path (Task 2 `testRejectsPathBreakingIds`).
4. A revoked version of a module that the catalog no longer lists at all (every version withdrawn) — the advice must still fire from the installed list, not from `modules[]` (Task 5 `testRevokedModuleMissingFromCatalogStillWarns`).
5. Upgrading from a build without the two new columns: `getModulesArray()` served from the Redis hash written before the ALTER has no `installSource` key — the controller reads it with `?? ''` (Task 4 Step 4), so the UI and the advice never throw on the missing key.

---

### Task 0: Worktree and a container that sees it

- [ ] **Step 1: Worktree**

```bash
cd /Volumes/DevDisk/Developement/mikopbx/Core
git worktree add .claude/worktrees/third-party-modules-core -b worktree-third-party-modules-core origin/develop
cd .claude/worktrees/third-party-modules-core
```

- [ ] **Step 2: Container `mikopbx-tpm`**

Copy `_temp/27.09.2026/mikopbx/lv2e2e/` scripts to `_temp/<today>/mikopbx/tpm/`, rename the container to `mikopbx-tpm`, change the three bind mounts to this worktree (`src` → `/offload/rootfs/usr/www/src`, `tests` → `/offload/rootfs/usr/www/tests`, `sites/admin-cabinet` → `/offload/rootfs/usr/www/sites/admin-cabinet`), keep `vendor` from `/Volumes/DevDisk/Developement/mikopbx/Core/vendor`, pick free host ports. Start it, wait for services, open `https://<ip>:<port>` once (admin / password from `CLAUDE.local.md`). Verify the mount: `docker inspect mikopbx-tpm --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}' | grep third-party-modules-core`.

- [ ] **Step 3: Baseline**

`docker exec mikopbx-tpm php /usr/www/vendor/bin/phpunit -c /usr/www/tests/Unit/phpunit.xml /usr/www/tests/Unit/PBXCoreREST/Lib/Modules/Pipeline` → green on untouched code. Nothing to commit.

---

### Task 1: sha256 and https in the default download path (#1134)

**Files:**
- Modify: `src/PBXCoreREST/Lib/Modules/Pipeline/ModuleDownloadService.php` (`download()` lines 62–130, `verify()` 135–151)
- Modify: `src/PBXCoreREST/Lib/Modules/Pipeline/InstallPipeline.php` (`phaseAcquireFromRepo()` lines 221–236)
- Modify: `src/PBXCoreREST/Lib/Modules/StartDownloadAction.php` (line 72)
- Modify: `src/Common/Messages/ru/Modules.php` (+2 keys)
- Create: `tests/Unit/PBXCoreREST/Lib/Modules/Pipeline/ModuleDownloadServiceTest.php`

**Interfaces:**
- Produces: `ModuleDownloadService::download(string $url, string $md5, string $targetFile, ?callable $onProgress = null, string $sha256 = ''): string` — `$sha256` empty = "field absent, md5 is authoritative"; non-empty = must be 64 lowercase hex and must match.
- Produces: `public static function validateDownloadUrl(string $url): string` (empty = ok, else translation key `ext_DownloadUrlNotHttps`), `public static function isSha256(string $value): bool`, `public const string SHA256_PATTERN = '/^[a-f0-9]{64}$/'`.
- Produces: translation keys `ext_DownloadUrlNotHttps` ("Ссылка на модуль должна начинаться с https://"), `ext_Sha256Mismatch` ("Контрольная сумма sha256 скачанного файла не совпала").

- [ ] **Step 1: Write the failing tests**

`tests/Unit/PBXCoreREST/Lib/Modules/Pipeline/ModuleDownloadServiceTest.php`:

```php
<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Modules\Pipeline;

use MikoPBX\PBXCoreREST\Lib\Modules\Pipeline\ModuleDownloadService;
use PHPUnit\Framework\TestCase;

/**
 * The default install pipeline is the trust boundary for marketplace archives
 * (spec 6.1): https only, sha256 when the catalog provides it, md5 otherwise.
 * verify() is exercised through a file on disk; download() through the URL
 * validation that runs before any network call.
 */
final class ModuleDownloadServiceTest extends TestCase
{
    private string $file;

    protected function setUp(): void
    {
        $this->file = tempnam(sys_get_temp_dir(), 'mds');
        file_put_contents($this->file, 'module-bytes');
    }

    protected function tearDown(): void
    {
        @unlink($this->file);
    }

    public function testRefusesHttpAndMalformedUrl(): void
    {
        $this->assertSame('ext_DownloadUrlNotHttps', ModuleDownloadService::validateDownloadUrl('http://releases.mikopbx.com/m.zip'));
        $this->assertSame('ext_DownloadUrlNotHttps', ModuleDownloadService::validateDownloadUrl('ftp://x/m.zip'));
        $this->assertSame('ext_DownloadUrlNotHttps', ModuleDownloadService::validateDownloadUrl('not a url'));
        $this->assertSame('ext_DownloadUrlNotHttps', ModuleDownloadService::validateDownloadUrl(''));
        $this->assertSame('', ModuleDownloadService::validateDownloadUrl('https://files.miko.ru/s/AbC/download'));
        $this->assertSame('', ModuleDownloadService::validateDownloadUrl('HTTPS://files.miko.ru/s/AbC/download'));

        // download() must stop before touching the network
        $service = new ModuleDownloadService();
        $error = $service->download('http://127.0.0.1:9/m.zip', md5('x'), $this->file . '.dl');
        $this->assertStringContainsString('ext_DownloadUrlNotHttps', $error);
        $this->assertFileDoesNotExist($this->file . '.dl');
    }

    public function testIsSha256(): void
    {
        $this->assertTrue(ModuleDownloadService::isSha256(hash('sha256', 'x')));
        $this->assertFalse(ModuleDownloadService::isSha256(strtoupper(hash('sha256', 'x'))));
        $this->assertFalse(ModuleDownloadService::isSha256(substr(hash('sha256', 'x'), 1)));
        $this->assertFalse(ModuleDownloadService::isSha256(''));
    }

    public function testVerifyUsesSha256WhenPresent(): void
    {
        $service = new ModuleDownloadService();
        $verify = new \ReflectionMethod($service, 'verify');

        $good = hash_file('sha256', $this->file);
        $this->assertSame('', $verify->invoke($service, $this->file, 'not-even-md5', $good), 'sha256 present and matching: md5 is not consulted');
        $this->assertFileExists($this->file);

        $wrong = str_repeat('0', 64);
        $this->assertStringContainsString('ext_Sha256Mismatch', $verify->invoke($service, $this->file, md5_file($this->file), $wrong));
        $this->assertFileDoesNotExist($this->file, 'a mismatching archive is deleted');
    }

    public function testVerifyFallsBackToMd5OnlyWhenSha256Absent(): void
    {
        $service = new ModuleDownloadService();
        $verify = new \ReflectionMethod($service, 'verify');
        $this->assertSame('', $verify->invoke($service, $this->file, md5_file($this->file), ''));
        $this->assertStringContainsString('MD5', $verify->invoke($service, $this->file, md5('other'), ''));
    }

    public function testMalformedSha256IsNotAFallback(): void
    {
        $service = new ModuleDownloadService();
        $verify = new \ReflectionMethod($service, 'verify');
        // present but malformed: refuse, do not silently downgrade to md5
        $this->assertStringContainsString('ext_Sha256Mismatch', $verify->invoke($service, $this->file, md5_file($this->file), strtoupper(hash_file('sha256', $this->file))));
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
docker exec mikopbx-tpm php /usr/www/vendor/bin/phpunit -c /usr/www/tests/Unit/phpunit.xml /usr/www/tests/Unit/PBXCoreREST/Lib/Modules/Pipeline/ModuleDownloadServiceTest.php
```

Expected: errors — `validateDownloadUrl` undefined, `verify()` takes 2 arguments.

- [ ] **Step 3: Implement**

In `ModuleDownloadService`:

```php
    public const string SHA256_PATTERN = '/^[a-f0-9]{64}$/';

    /**
     * The catalog is the only source of module archives, and it serves https.
     * Anything else is refused before a connection is attempted (spec 6.1).
     *
     * @return string Empty when the url is acceptable, else a translation key
     */
    public static function validateDownloadUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '' || filter_var($url, FILTER_VALIDATE_URL) === false || !preg_match('#^https://#i', $url)) {
            return 'ext_DownloadUrlNotHttps';
        }
        return '';
    }

    public static function isSha256(string $value): bool
    {
        return (bool)preg_match(self::SHA256_PATTERN, $value);
    }
```

Change the signature and the top of `download()`:

```php
    public function download(string $url, string $md5, string $targetFile, ?callable $onProgress = null, string $sha256 = ''): string
    {
        $urlError = self::validateDownloadUrl($url);
        if ($urlError !== '') {
            return TranslationProvider::translate($urlError);
        }
        if (file_exists($targetFile)) {
```

(add `use MikoPBX\Common\Providers\TranslationProvider;` — the same provider `InstallPipeline` uses; outside DI it returns the key, which the tests rely on). The last line of `download()` becomes `return $this->verify($targetFile, $md5, $sha256);`.

Guzzle follows redirects to any protocol by default (`RedirectMiddleware::$defaultSettings['protocols'] = ['http','https']`), so an https answer that 302s to http would still be downloaded. In the `getAsync()` options add, next to `'connect_timeout' => 5`:

```php
            // https only, also across redirects (spec 6.1)
            'allow_redirects' => ['max' => 5, 'protocols' => ['https']],
```

Replace `verify()`:

```php
    /**
     * Verifies the archive against the catalog hashes and the declared size.
     * sha256 (spec 5.3) is authoritative when the catalog sent it; an md5-only
     * answer comes from releases published before step 1 and keeps the old check.
     * A present-but-malformed sha256 is a mismatch, never a reason to downgrade.
     */
    private function verify(string $targetFile, string $md5, string $sha256): string
    {
        if (!file_exists($targetFile)) {
            return 'Downloaded file is missing';
        }
        if ($sha256 !== '') {
            if (!self::isSha256($sha256) || hash_file('sha256', $targetFile) !== $sha256) {
                unlink($targetFile);
                return TranslationProvider::translate('ext_Sha256Mismatch');
            }
        } elseif (md5_file($targetFile) !== $md5) {
            unlink($targetFile);
            return 'Error on comparing MD5 sum';
        }
        // A server that omits Content-Length yields declaredSize=0 — a hash
        // match is then the authoritative check, do not fail on size.
        if ($this->declaredSize > 0 && $this->declaredSize !== filesize($targetFile)) {
            unlink($targetFile);
            return 'Error on comparing file size';
        }
        return '';
    }
```

In `InstallPipeline::phaseAcquireFromRepo()` pass the new argument:

```php
        $error = $downloader->download(
            (string)$moduleLink['href'],
            (string)$moduleLink['md5'],
            $zipFile,
            function (int $percent): void {
                // Map download to the 25..50 progress band
                $this->tickProgress(ModuleInstallationBase::STAGE_IV_DOWNLOAD_MODULE, 25 + intdiv($percent, 4));
            },
            trim((string)($moduleLink['sha256'] ?? ''))
        );
```

(no `strtolower`: the contract is lowercase hex, and an uppercase value is a malformed-present value, which `verify()` refuses — `testMalformedSha256IsNotAFallback` pins that.) `DataStructure` is not touched: the legacy `startDownload` route keeps md5 only, and no `ApiParameterRef` would reference a `sha256` parameter.

`StartDownloadAction.php:72`: replace the inline check with the shared one — `if (ModuleDownloadService::validateDownloadUrl($url) !== '') { … 'Download URL must be a valid https URL' … }` (add the `use`). One expression for both pipelines.

`src/Common/Messages/ru/Modules.php`: add `'ext_DownloadUrlNotHttps' => 'Ссылка на модуль должна начинаться с https://'` and `'ext_Sha256Mismatch' => 'Контрольная сумма sha256 скачанного файла не совпала'`; run the `translations` skill for the other 25 languages.

- [ ] **Step 4: Run the tests, PHPStan**

Same docker command → `OK (5 tests)`. Also `docker exec mikopbx-tpm php /usr/www/vendor/bin/phpunit -c /usr/www/tests/Unit/phpunit.xml /usr/www/tests/Unit/PBXCoreREST/Lib/Modules/Pipeline` (existing extractor/rollback tests stay green). PHPStan (Global Constraints command) clean.

- [ ] **Step 5: Live check on the container**

Restart `mikopbx-tpm`, then install any free module from the marketplace through its UI — the production catalog sends no `sha256` yet, so this proves the md5 fallback and the https path. Check `/storage/usbdisk1/mikopbx/log/php/php-error.log` is clean.

- [ ] **Step 6: Review gate and commit**

Run the `code-review` agent on `git diff`, then (separate Bash calls):

```bash
printf 'reviewed\n' > /Volumes/DevDisk/Developement/mikopbx/Core/.claude/.review-pass
```

```bash
/usr/bin/git add src/PBXCoreREST/Lib/Modules/Pipeline/ModuleDownloadService.php src/PBXCoreREST/Lib/Modules/Pipeline/InstallPipeline.php src/PBXCoreREST/Lib/Modules/StartDownloadAction.php src/Common/Messages tests/Unit/PBXCoreREST/Lib/Modules/Pipeline/ModuleDownloadServiceTest.php
/usr/bin/git commit -m "feat(modules): verify marketplace archives by sha256 and require https"
```

```bash
rm -f /Volumes/DevDisk/Developement/mikopbx/Core/.claude/.review-pass
```

(The same three-call sequence applies to every later commit step; it is written out once here.)

---

### Task 2: One `moduleUniqueID` pattern, applied before the id becomes a path (#1135)

**Files:**
- Modify: `src/PBXCoreREST/Lib/Modules/DataStructure.php` (`getAllFieldDefinitions()` entries `id`, `uniqid` lines 232–244; new constant)
- Modify: `src/PBXCoreREST/Lib/Modules/GetMetadataFromModulePackageAction.php` (lines 95–101)
- Modify: `src/PBXCoreREST/Lib/Modules/StartDownloadAction.php` (line 64)
- Modify: `src/Common/Messages/ru/Modules.php` (+1 key)
- Create: `tests/Unit/PBXCoreREST/Lib/Modules/ModuleUniqueIdPatternTest.php`

**Interfaces:**
- Produces: `DataStructure::MODULE_UNIQUE_ID_PATTERN = '^[A-Za-z0-9_\-]{1,128}$'` (no delimiters, so the same string serves as OpenAPI `pattern`) and `public static function isValidModuleUniqueId(string $id): bool`; `'pattern' => self::MODULE_UNIQUE_ID_PATTERN` and `'maxLength' => 128` on the `id` and `uniqid` field definitions (the single source of REST validation rules per `src/PBXCoreREST/AGENTS.md`). `Controllers/Modules/RestController.php` carries twelve stricter `ApiParameterRef('id', …, pattern: '^[A-Za-z][A-Za-z0-9]*$')` for path ids of installed modules — left as they are (stricter is fine for already installed ids); noted so nobody "unifies" them downwards.
- Produces: translation key `ext_InvalidModuleUniqueID` ("Недопустимый идентификатор модуля в module.json: %id%").

- [ ] **Step 1: Write the failing tests**

`tests/Unit/PBXCoreREST/Lib/Modules/ModuleUniqueIdPatternTest.php` (GPL header as in Task 1):

```php
declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Modules;

use MikoPBX\PBXCoreREST\Lib\Modules\DataStructure;
use MikoPBX\PBXCoreREST\Lib\Modules\GetMetadataFromModulePackageAction;
use PHPUnit\Framework\TestCase;
use ZipArchive;

/**
 * moduleUniqueID from module.json becomes a directory name under the modules
 * dir (spec 6.2). One pattern, declared in DataStructure, guards both the
 * package path and the legacy download action.
 */
final class ModuleUniqueIdPatternTest extends TestCase
{
    private array $tmp = [];

    protected function tearDown(): void
    {
        foreach ($this->tmp as $f) {
            @unlink($f);
        }
    }

    private function packageWithId(string $id): string
    {
        $path = tempnam(sys_get_temp_dir(), 'pkg') . '.zip';
        $this->tmp[] = $path;
        $zip = new ZipArchive();
        $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('module.json', json_encode(['moduleUniqueID' => $id, 'version' => '1.0.0']));
        $zip->addFromString('Setup/PbxExtensionSetup.php', '<?php');
        $zip->close();
        return $path;
    }

    public function testPatternIsDeclaredOnceInDataStructure(): void
    {
        $defs = DataStructure::getParameterDefinitions();
        $this->assertSame('^[A-Za-z0-9_\-]{1,128}$', $defs["request"]["uniqid"]["pattern"] ?? null);
        $this->assertTrue(DataStructure::isValidModuleUniqueId('ModuleCalleridSearchCH'));
        $this->assertTrue(DataStructure::isValidModuleUniqueId('Module_x-1'));
        $this->assertFalse(DataStructure::isValidModuleUniqueId(''));
        $this->assertFalse(DataStructure::isValidModuleUniqueId(str_repeat('a', 129)));
    }

    public function testRejectsPathBreakingIds(): void
    {
        foreach (['../ModuleX', 'Module X', 'Module/X', "Module\0X", 'Модуль'] as $bad) {
            $this->assertFalse(DataStructure::isValidModuleUniqueId($bad), $bad);
            $res = GetMetadataFromModulePackageAction::main($this->packageWithId($bad));
            $this->assertFalse($res->success, $bad);
            $this->assertNotEmpty($res->messages, $bad);
        }
    }

    public function testAcceptsValidPackage(): void
    {
        $res = GetMetadataFromModulePackageAction::main($this->packageWithId('ModuleDemo'));
        $this->assertTrue($res->success);
        $this->assertSame('ModuleDemo', $res->data['uniqid']);
    }
}
```

`uniqid` is a writable field, so it lives in the `request` section of `getParameterDefinitions()`; the test pins the pattern there.

- [ ] **Step 2: Run the tests to verify they fail**

Expected: `isValidModuleUniqueId` undefined; `testRejectsPathBreakingIds` fails on `../ModuleX` (today only emptiness is checked).

- [ ] **Step 3: Implement**

`DataStructure`:

```php
    /**
     * Module ids become directory names under the modules dir; this is the only
     * charset accepted anywhere in the REST layer (spec 6.2). The release server
     * is stricter for new third-party modules (^Module[A-Za-z0-9]{1,60}$); the core
     * stays permissive so already installed modules keep working.
     */
    public const string MODULE_UNIQUE_ID_PATTERN = '^[A-Za-z0-9_\-]{1,128}$';

    public static function isValidModuleUniqueId(string $id): bool
    {
        return (bool)preg_match('/' . self::MODULE_UNIQUE_ID_PATTERN . '/', $id);
    }
```

and in `getAllFieldDefinitions()` set `'pattern' => self::MODULE_UNIQUE_ID_PATTERN, 'maxLength' => 128,` on both `id` and `uniqid` (they say `maxLength => 100` today, which disagrees with `{1,128}`).

`GetMetadataFromModulePackageAction::main()` after the emptiness check:

```php
        if (!is_string($moduleUniqueID) || !DataStructure::isValidModuleUniqueId($moduleUniqueID)) {
            $res->messages[] = TranslationProvider::translate('ext_InvalidModuleUniqueID', [
                'id' => mb_substr((string)$moduleUniqueID, 0, 64),
            ]);
            return $res;
        }
```

`StartDownloadAction.php:64`: `!preg_match('/^[A-Za-z0-9_\-]{1,128}$/', $moduleUniqueID)` → `!DataStructure::isValidModuleUniqueId($moduleUniqueID)`.

`ru/Modules.php`: `'ext_InvalidModuleUniqueID' => 'Недопустимый идентификатор модуля в module.json: %id%'` + translations.

- [ ] **Step 4: Tests, PHPStan, API test**

Unit: `OK (3 tests)`. PHPStan clean. `tests/api/test_39_modules.py` (29 lines, two GET smokes today — no install fixture exists): add

```python
def test_03_rejects_bad_module_id(api_client, tmp_path):
    """module.json with a path-breaking moduleUniqueID is refused before any install step (spec 6.2)."""
    import json, zipfile
    pkg = tmp_path / "bad.zip"
    with zipfile.ZipFile(pkg, "w") as z:
        z.writestr("module.json", json.dumps({"moduleUniqueID": "../ModuleX", "version": "1.0.0"}))
        z.writestr("Setup/PbxExtensionSetup.php", "<?php")
    upload = api_client.upload_file("files:upload", str(pkg))          # conftest.py:514
    meta = api_client.post("modules:getMetadataFromPackage", {"filePath": upload["data"]["filename"]})
    assert meta["result"] is False
    assert meta["messages"], "a translated reason is returned"
```

`getMetadataFromPackage` is the synchronous action the pipeline itself calls, so no operation polling is needed. Run: `cd tests/api && pytest test_39_modules.py -k bad_module_id` (environment per `tests/api/README.md`, container `mikopbx-tpm`).

- [ ] **Step 5: Review gate and commit**

```bash
/usr/bin/git add src/PBXCoreREST/Lib/Modules/DataStructure.php src/PBXCoreREST/Lib/Modules/GetMetadataFromModulePackageAction.php src/PBXCoreREST/Lib/Modules/StartDownloadAction.php src/Common/Messages tests/Unit/PBXCoreREST/Lib/Modules/ModuleUniqueIdPatternTest.php tests/api/test_39_modules.py
/usr/bin/git commit -m "fix(modules): validate moduleUniqueID with one shared pattern before it becomes a path"
```

---

### Task 3: `installSource` and `trustLevel` columns, stamped by the pipeline (#1136)

**Files:**
- Modify: `src/Common/Models/PbxExtensionModules.php` (two properties after `$disableReasonText`; constants)
- Modify: `src/PBXCoreREST/Lib/Modules/Pipeline/InstallPipeline.php` (`phaseAcquireFromRepo()` sets the source and trust level; `phaseSetupNewVersion()` lines 453–466 stamps the row; two private properties)
- Create: `tests/Unit/Common/Models/PbxExtensionModulesTrustTest.php`

**Interfaces:**
- Produces: `PbxExtensionModules::SOURCE_MARKETPLACE='marketplace'`, `SOURCE_MANUAL='manual'`, `TRUST_OFFICIAL='official'`, `TRUST_VERIFIED='verified'`, `TRUST_COMMUNITY='community'`; `public ?string $installSource = ''`, `public ?string $trustLevel = ''`; `public static function normalizeTrustLevel(mixed $value): string` (known value → itself; absent/null/unknown → `official`).
- Produces: `InstallPipeline` private `string $installSource = PbxExtensionModules::SOURCE_MANUAL` and `string $trustLevel = ''`, both set in `phaseAcquireFromRepo()` (the only repo-specific phase; the package flow never runs it, so the defaults *are* the package values); `phaseSetupNewVersion()` writes them to the row found by `findFirstByUniqid()` right after the `install` child step.

- [ ] **Step 1: Write the failing tests**

`tests/Unit/Common/Models/PbxExtensionModulesTrustTest.php` (GPL header):

```php
declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Models;

use MikoPBX\Common\Models\PbxExtensionModules;
use PHPUnit\Framework\TestCase;

/** Trust vocabulary of installed modules (spec 6.3) and tolerance to rows written before the columns existed. */
final class PbxExtensionModulesTrustTest extends TestCase
{
    public function testVocabulary(): void
    {
        $this->assertSame('marketplace', PbxExtensionModules::SOURCE_MARKETPLACE);
        $this->assertSame('manual', PbxExtensionModules::SOURCE_MANUAL);
        $this->assertSame('official', PbxExtensionModules::normalizeTrustLevel('official'));
        $this->assertSame('community', PbxExtensionModules::normalizeTrustLevel('community'));
        $this->assertSame('verified', PbxExtensionModules::normalizeTrustLevel('verified'));
    }

    public function testUnknownOrAbsentTrustIsOfficial(): void
    {
        // Old server answers carry no trust_level: an official module (spec 5)
        $this->assertSame('official', PbxExtensionModules::normalizeTrustLevel(null));
        $this->assertSame('official', PbxExtensionModules::normalizeTrustLevel(''));
        $this->assertSame('official', PbxExtensionModules::normalizeTrustLevel('gold'));
        $this->assertSame('official', PbxExtensionModules::normalizeTrustLevel(['x']));
    }

}
```

- [ ] **Step 2: Run the tests to verify they fail**

Expected: constants undefined.

- [ ] **Step 3: Implement**

`PbxExtensionModules`, after `$disableReasonText`:

```php
    public const string SOURCE_MARKETPLACE = 'marketplace';
    public const string SOURCE_MANUAL = 'manual';
    public const string TRUST_OFFICIAL = 'official';
    public const string TRUST_VERIFIED = 'verified';
    public const string TRUST_COMMUNITY = 'community';

    /**
     * Where the installed code came from: marketplace | manual | '' (installed before this column existed)
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $installSource = '';

    /**
     * Trust level of the publisher as the catalog reported it at install time:
     * official | verified | community | ''. A snapshot — the catalog is authoritative while online.
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $trustLevel = '';

    /** Absent or unknown values mean an official MIKO module (old catalog answers). */
    public static function normalizeTrustLevel(mixed $value): string
    {
        return in_array($value, [self::TRUST_VERIFIED, self::TRUST_COMMUNITY], true) ? $value : self::TRUST_OFFICIAL;
    }
```

`UpdateDatabase::updateDatabaseStructure()` adds the columns on the next boot (`ALTER TABLE ADD COLUMN` fast path). The Redis hash of `getModulesArray()` is cleared by the ORM event handler in `ModelsBase` (`clearCache`, lines 113–119) on the first write after the ALTER; until then cached rows lack the two keys, which the controller tolerates with `?? ''` (Task 4).

`InstallPipeline` (`run()` line 117 already branches on `$row['operation'] === ModuleOperations::OPERATION_INSTALL_REPO` and only then calls `phaseAcquireFromRepo()` — that phase is the one place that knows the code came from the catalog). Add two properties:

```php
    /** Provenance stamped on the registry row after install (spec 6.3); package flow keeps the defaults */
    private string $installSource = PbxExtensionModules::SOURCE_MANUAL;
    private string $trustLevel = '';
```

In `phaseAcquireFromRepo()` after `$releaseInfo['licProductId'] = …`:

```php
        // Catalog install: remember the publisher trust level as the catalog reports it; absent = official
        $this->installSource = PbxExtensionModules::SOURCE_MARKETPLACE;
        $this->trustLevel = PbxExtensionModules::normalizeTrustLevel($moduleInfo->data['trust_level'] ?? null);
```

In `phaseSetupNewVersion()` replace the `$newVersion = …` line with:

```php
        // The module's own installer created/updated the registry row; stamp the provenance
        // here, not in the overridable PbxExtensionSetupBase::registerNewModule() (spec 6.3).
        $module = PbxExtensionModules::findFirstByUniqid($this->moduleUniqueId);
        $newVersion = (string)($module?->version ?? '');
        if ($module !== null) {
            $module->installSource = $this->installSource;
            $module->trustLevel = $this->trustLevel;
            $module->save();
        }
```

- [ ] **Step 4: Tests, PHPStan, live**

Unit `OK (2 tests)`; PHPStan clean. Restart `mikopbx-tpm` (the ALTER runs at boot — check `system/messages` for `UpdateDatabase`), install a module from the marketplace, then `sqlite3 /cf/conf/mikopbx.db "select uniqid, installSource, trustLevel from m_PbxExtensionModules"` (the `sqlite-inspector` skill) → `marketplace`, `official`. Upload the same module as a ZIP → `manual`, ``. Spec 9 asks for an `installSource` check in `tests/api`, but no REST answer exposes the column (`getList`/`getRecord` of modules fall into `default: Unknown action`, `ModulesManagementProcessor.php:208`): the sqlite check above is the acceptance check of this task. Exposing the column through REST is a separate decision for the owner, not part of this plan.

- [ ] **Step 5: Review gate and commit**

```bash
/usr/bin/git add src/Common/Models/PbxExtensionModules.php src/PBXCoreREST/Lib/Modules/Pipeline/InstallPipeline.php tests/Unit/Common/Models/PbxExtensionModulesTrustTest.php
/usr/bin/git commit -m "feat(modules): record install source and publisher trust level on installed modules"
```

---

### Task 4: Badges, publisher details, confirmation texts (#1137)

**Files:**
- Modify: `sites/admin-cabinet/assets/js/src/PbxExtensionModules/pbx-extension-module-marketplace.js` (`addModuleDescription()` lines 347–382)
- Modify: `sites/admin-cabinet/assets/js/src/PbxExtensionModules/pbx-extension-module-detail.js` (`cbAfterGetModuleDetails()` 111–190, `prepareDeveloperView()`)
- Modify: `sites/admin-cabinet/assets/js/src/PbxExtensionModules/pbx-extension-module-install-from-repo.js` (`openInstallModuleModal()` 125–162)
- Modify: `sites/admin-cabinet/assets/js/src/PbxExtensionModules/pbx-extension-module-install-from-zip.js` (`checkStatusFileMerging()` 127–156)
- Modify: `src/AdminCabinet/Views/PbxExtensionModules/moduleDetailsModal.volt` (second row), `indexTabs/installedTab.volt` (developer cell); `moduleInstallModal.volt` is reused unchanged (it is included at page level, `index.volt:2`)
- Modify: `src/AdminCabinet/Controllers/PbxExtensionModulesController.php` (lines 45–69: pass `installSource`, `trustLevel`)
- Modify: `src/Common/Messages/ru/Modules.php` (+9 keys)
- Create: `sites/admin-cabinet/assets/js/src/PbxExtensionModules/pbx-extension-module-trust.js` (one small helper shared by the three screens)

**Interfaces:**
- Produces: `const moduleTrust = { level(obj), badgeHtml(level), isCommunity(obj), confirmText(level) }` in `pbx-extension-module-trust.js`, registered in `AssetProvider` before the marketplace scripts (find where `pbx-extension-module-marketplace.js` is listed and add the new file right before it).
- Produces: catalog rows (`tr.new-module-row`) carry `data-trust="<level>"` — the single place the install dialog reads the level from (every install button belongs to a catalog row or to the details modal opened from one).
- Produces: translation keys `ext_TrustVerified` ("Проверенный издатель"), `ext_TrustCommunity` ("Модуль сообщества"), `ext_InstalledManually` ("Установлен вручную из файла"), `ext_SourceCode` ("Исходный код"), `ext_SupportEmail` ("Поддержка"), `ext_CommunityInstallWarning` ("Это модуль сообщества. MIKO проверила только издателя при первом приёме; код модуля не проверяется и исполняется с правами root. Поддержку оказывает издатель."), `ext_ManualInstallWarning` ("Модуль не из маркетплейса MikoPBX: MIKO его не проверяла, он исполняется с правами root. Устанавливайте только файлы из источника, которому доверяете."), `ext_ManualInstallTitle` ("Установка модуля из файла"), `ext_RevokedVersion` (used in Task 5). No `ext_TrustOfficial`: an official module shows nothing (spec 6.4), and an absent field must never turn into a positive claim.
- Deliberate limit: the community warning is shown by `openInstallModuleModal()` (first install and release picks from the details modal). Updates go through `openUpdateChangelogModal()` / `updateAllModules()` and show no repeated warning — the module is already installed and the administrator saw the text once. Spec 6.4 wording "before every install" is read as "before every *new* install".

- [ ] **Step 1: The shared helper**

`pbx-extension-module-trust.js`:

```js
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 * (GPL-3.0 header as in the sibling files)
 */

/* global globalTranslate */

/**
 * Trust level of a marketplace module (spec 6.4). The catalog may omit the
 * field (old release server): that is an official MIKO module.
 */
const moduleTrust = {
    OFFICIAL: 'official',
    VERIFIED: 'verified',
    COMMUNITY: 'community',

    level(obj) {
        const value = obj && typeof obj.trust_level === 'string' ? obj.trust_level : '';
        return value === moduleTrust.VERIFIED || value === moduleTrust.COMMUNITY ? value : moduleTrust.OFFICIAL;
    },

    isCommunity(obj) {
        return moduleTrust.level(obj) === moduleTrust.COMMUNITY;
    },

    /** Empty for official modules: no badge (spec 6.4). */
    badgeHtml(level) {
        if (level === moduleTrust.VERIFIED) {
            return `<span class="ui tiny green label trust-badge" data-trust="verified"><i class="check icon"></i>${globalTranslate.ext_TrustVerified}</span>`;
        }
        if (level === moduleTrust.COMMUNITY) {
            return `<span class="ui tiny orange label trust-badge" data-trust="community"><i class="users icon"></i>${globalTranslate.ext_TrustCommunity}</span>`;
        }
        return '';
    },

    manualBadgeHtml() {
        return `<span class="ui tiny grey label trust-badge" data-source="manual"><i class="file archive icon"></i>${globalTranslate.ext_InstalledManually}</span>`;
    },

    /** Text to prepend to the install confirmation; empty = nothing to add. */
    confirmText(level) {
        return level === moduleTrust.COMMUNITY ? `<p><b>${globalTranslate.ext_CommunityInstallWarning}</b></p>` : '';
    },
};
```

Register it in `AssetProvider` (grep `pbx-extension-module-marketplace.js` in `src/AdminCabinet/Providers/AssetProvider.php`) immediately before the marketplace script.

- [ ] **Step 2: Catalog row and details modal**

`addModuleDescription()`: before `const dynamicRow`, add `const trustLevel = moduleTrust.level(obj);` and `const author = decodeURIComponent(obj.publisher || obj.developer || '');`; in the template add `data-trust="${trustLevel}"` to `<tr>`, render `${moduleTrust.badgeHtml(trustLevel)}` after the name, and use `${author}` instead of `${decodeURIComponent(obj.developer)}` in the author cell.

`moduleDetailsModal.volt`, second row: after the publisher column add

```volt
            <div class="column module-trust"></div>
            <div class="column module-source"></div>
            <div class="column module-support"></div>
```

`cbAfterGetModuleDetails()`: after the developer block:

```js
            // Trust level, source code and support (spec 6.4); absent fields = official module = nothing shown
            const trustLevel = moduleTrust.level(repoData);
            const badge = moduleTrust.badgeHtml(trustLevel);
            if (badge === '') {
                $newPopup.find('.module-trust').remove();
            } else {
                $newPopup.find('.module-trust').html(badge);
            }
            const sourceUrl = typeof repoData.source_url === 'string' && /^https:\/\//i.test(repoData.source_url) ? repoData.source_url : '';
            if (sourceUrl !== '') {
                $newPopup.find('.module-source').html(`<a href="${extensionModuleDetail.escapeHtml(sourceUrl)}" target="_blank" rel="noopener">${globalTranslate.ext_SourceCode}</a>`);
            } else {
                $newPopup.find('.module-source').remove();
            }
            if (typeof repoData.support_email === 'string' && repoData.support_email !== '') {
                const mail = extensionModuleDetail.escapeHtml(repoData.support_email);
                $newPopup.find('.module-support').html(`${globalTranslate.ext_SupportEmail}: <a href="mailto:${mail}">${mail}</a>`);
            } else {
                $newPopup.find('.module-support').remove();
            }
```

(`extensionModuleDetail.escapeHtml()` already exists in this file and escapes quotes; values are set by MIKO in the cabinet, so this is hygiene, not a boundary.)

`prepareDeveloperView()`: use `repoData.publisher || repoData.developer` as the displayed name.

- [ ] **Step 3: Confirmation dialogs**

`openInstallModuleModal()`: the release-pick buttons in the details modal (`prepareChangeLogView()`) carry no `data-trust` and sit in no `<tr>`, so the level is read from the **catalog row by uniqid** — every install button originates from a catalog row or from the modal opened from one. Add once, after the `if/else` that fills the description:

```js
                    const trustLevel = moduleTrust.level({ trust_level: $(`tr.new-module-row[data-id=${moduleUniqueId}]`).data('trust') });
                    const $description = theForm.find('div.description');
                    $description.html(moduleTrust.confirmText(trustLevel) + $description.html());
```

`checkStatusFileMerging()`: there is no confirmation on the manual path today. Wrap the `installStatusLoopWorker.startWatch(params.fileId); ModulesAPI.installFromPackage(...)` pair into a function `installationFromZip.runInstall(params)` and, before it, show the shared modal (`#install-modal-form` is included at page level in `index.volt`, so it exists on every tab):

```js
        const $form = $('#install-modal-form');
        $form.modal({
            closable: false,
            onShow: () => {
                $form.find('span.action').text(globalTranslate.ext_ManualInstallTitle);
                // the user's file name, not the server-side upload path
                $form.find('span.module-name').text(installationFromZip.originalFileName || '');
                $form.find('div.description').html(`<p><b>${globalTranslate.ext_ManualInstallWarning}</b></p>`);
            },
            onDeny: () => {
                // Cancel: roll the page back to the pre-upload state
                installationFromZip.uploadInProgress = false;
                installationFromZip.$progressBarBlock.hide();
                $('a.button').removeClass('disabled');
                $('#add-new-button').removeClass('loading');
                return true;
            },
            onApprove: () => {
                installationFromZip.runInstall(params);
                return true;
            },
        }).modal('show');
```

`installationFromZip.originalFileName` is set in `cbResumableUploadFile()` from the resumable file object (`file.fileName`) when the upload starts; read that method to pick the exact property the resumable object exposes.

- [ ] **Step 4: Installed list**

`PbxExtensionModulesController` (lines 45–69): add to `$moduleRecord`

```php
                // Rows cached before the columns existed have no keys: '' = unknown, no badge
                'installSource' => (string)($module['installSource'] ?? ''),
                'trustLevel' => (string)($module['trustLevel'] ?? ''),
```

`installedTab.volt`, developer cell (the row needs no new `data-*`: nothing reads them):

```volt
        <td class="{{ module['status'] }} disability show-details-on-click">{{ module['developer'] }}
            {% if module['installSource'] == 'manual' %}
                <br><span class="ui tiny grey label"><i class="file archive icon"></i>{{ t._('ext_InstalledManually') }}</span>
            {% elseif module['trustLevel'] == 'community' %}
                <br><span class="ui tiny orange label"><i class="users icon"></i>{{ t._('ext_TrustCommunity') }}</span>
            {% elseif module['trustLevel'] == 'verified' %}
                <br><span class="ui tiny green label"><i class="check icon"></i>{{ t._('ext_TrustVerified') }}</span>
            {% endif %}
        </td>
```

- [ ] **Step 5: No response-schema change**

`ResponseSchemaValidator::validate()` runs only from `AbstractGetRecordAction` / `AbstractGetListAction`; no action under `Lib/Modules/` extends them, so the catalog answers (`getAvailableModules`, `getModuleInfo`, `getModuleLink`) are never validated, and `GetAvailableModulesAction` passes the server JSON through untouched. Nothing to declare; the spec's note in 6.4 about `ResponseSchemaValidator` is wrong and is corrected in the spec in Task 8.

- [ ] **Step 6: Translate, transpile, verify in the browser**

Add the nine `ext_*` keys to `src/Common/Messages/ru/Modules.php`, run the `translations` skill, delete `/var/tmp/www_cache/js/localization-*.min.js` in `mikopbx-tpm`. Transpile the five JS files with the `babel-compiler` skill. Restart the container and, in the browser (`mikopbx-web-tester` agent or by hand): catalog shows no badge for official modules; details modal shows no trust cell for them; a ZIP upload shows the manual-install dialog, Cancel restores the page (progress block hidden, buttons enabled); the installed list shows "Установлен вручную" on the uploaded module.

To see the community branch before the server ships, stub the catalog through the managed cache (plain `redis-cli` cannot: the cache lives in Redis db 4 under `_PH_MANAGED_CACHE:` with Phalcon's serializer, and `GetAvailableModulesAction` ignores a value that is not an array). Script `_temp/<today>/mikopbx/tpm/stub-catalog.php`, run as `docker exec mikopbx-tpm php /offload/rootfs/usr/www/tests/_stub-catalog.php` after copying it into the worktree `tests/` (untracked):

```php
<?php
require_once 'Globals.php';

use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckModulesUpdates;
use Phalcon\Di\Di;

$lang  = (string)(\MikoPBX\Common\Models\PbxSettings::getValueByKey('WebAdminLanguage') ?: 'ru');
$cache = Di::getDefault()->getShared('managedCache');
$data  = json_decode(file_get_contents(__DIR__ . '/_catalog-stub.json'), true);
$cache->set('ModulesManagementProcessor:GetAvailableModules:' . $lang, $data, 3600);
$cache->delete('WorkerPrepareAdvice:' . CheckModulesUpdates::class);
echo "catalog stubbed for $lang\n";
```

`_catalog-stub.json` = a real `getAvailableModules` answer with one module changed to `"trust_level":"community","publisher":"Test Publisher","source_url":"https://github.com/example/mod","support_email":"help@example.com"` (and, for Task 5, a `"revoked"` map). Reload the marketplace page. Check the exact cache key prefix in `GetAvailableModulesAction.php:58–64` before running.

- [ ] **Step 7: Review gate and commit**

```bash
/usr/bin/git add sites/admin-cabinet/assets/js/src/PbxExtensionModules sites/admin-cabinet/assets/js/pbx/PbxExtensionModules src/AdminCabinet/Views/PbxExtensionModules src/AdminCabinet/Controllers/PbxExtensionModulesController.php src/AdminCabinet/Providers/AssetProvider.php src/Common/Messages
/usr/bin/git commit -m "feat(marketplace): trust badges, publisher details and install confirmation texts"
```

---

### Task 5: Revoked-version advice (#1138)

**Files:**
- Modify: `src/Core/Workers/Libs/WorkerPrepareAdvice/CheckModulesUpdates.php` (`process()` lines 53–113)
- Modify: `src/Common/Messages/ru/Common.php` (+1 key next to `adv_SecurityPatchAvailable`)
- Modify: `sites/admin-cabinet/assets/js/src/PbxExtensionModules/pbx-extension-module-marketplace.js` (`cbParseModuleUpdates()` 265–322: mark installed rows)
- Create: `tests/Unit/Core/Workers/Libs/WorkerPrepareAdvice/CheckModulesUpdatesRevokedTest.php`

**Interfaces:**
- Produces: `CheckModulesUpdates::revokedAdvices(array $installed, array $revoked, string $baseUrl): array` — pure, `$installed` = `getModulesArray()` rows, `$revoked` = the catalog's top-level `revoked` map `{uniqid: [{version, reason}]}`; returns a list of `['messageTpl' => 'adv_ModuleVersionRevoked', 'messageParams' => ['url','module','ver','reason']]`.
- Produces: `process()` emits them under `$messages['error']` **before** the existing loop; `adv_ModuleVersionRevoked` = "Версия %ver% модуля <a href=\"%url%\" class=\"advices-module-update\">%module%</a> отозвана модерацией маркетплейса: %reason%. Обновите модуль или отключите его."
- Produces: installed rows get `<span class="ui tiny red label revoked-badge">` + the reason as a popup when `revoked[uniqid]` contains the installed version (JS, from the already loaded catalog answer); key `ext_RevokedVersion` ("Версия отозвана").

- [ ] **Step 1: Write the failing tests**

`tests/Unit/Core/Workers/Libs/WorkerPrepareAdvice/CheckModulesUpdatesRevokedTest.php` (GPL header):

```php
declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerPrepareAdvice;

use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckModulesUpdates;
use PHPUnit\Framework\TestCase;

/**
 * Spec 6.5: a moderation-revoked installed version raises an `error` advice
 * from the INSTALLED list — the catalog loop cannot do it, because a revoked
 * version is removed from modules[] and the module may have no newer version.
 */
final class CheckModulesUpdatesRevokedTest extends TestCase
{
    private function installed(string $uniqid, string $version): array
    {
        return [$uniqid => ['uniqid' => $uniqid, 'name' => $uniqid, 'version' => $version]];
    }

    public function testExactVersionMatchRaisesError(): void
    {
        $advices = CheckModulesUpdates::revokedAdvices(
            $this->installed('ModuleA', '1.0.1'),
            ['ModuleA' => [['version' => '1.0.1', 'reason' => 'drops calls']]],
            '/admin-cabinet/pbx-extension-modules/index/'
        );
        $this->assertCount(1, $advices);
        $this->assertSame('adv_ModuleVersionRevoked', $advices[0]['messageTpl']);
        $this->assertSame('1.0.1', $advices[0]['messageParams']['ver']);
        $this->assertSame('drops calls', $advices[0]['messageParams']['reason']);
        $this->assertStringContainsString('ModuleA', $advices[0]['messageParams']['url']);
    }

    public function testOtherVersionsAndUnknownModulesAreSilent(): void
    {
        $this->assertSame([], CheckModulesUpdates::revokedAdvices($this->installed('ModuleA', '1.0.2'), ['ModuleA' => [['version' => '1.0.1', 'reason' => 'x']]], '/'));
        $this->assertSame([], CheckModulesUpdates::revokedAdvices($this->installed('ModuleB', '1.0.1'), ['ModuleA' => [['version' => '1.0.1', 'reason' => 'x']]], '/'));
        $this->assertSame([], CheckModulesUpdates::revokedAdvices($this->installed('ModuleA', '1.0.1'), [], '/'));
    }

    public function testRevokedModuleMissingFromCatalogStillWarns(): void
    {
        // The module is not in modules[] at all (every version withdrawn): the installed list drives the check
        $advices = CheckModulesUpdates::revokedAdvices($this->installed('ModuleGone', '2.0'), ['ModuleGone' => [['version' => '2.0', 'reason' => 'malware']]], '/');
        $this->assertCount(1, $advices);
    }

    public function testVersionCompareIsExact(): void
    {
        // Spec 5.1: exact match. version_compare('1.0.0', '1.0', '!=') is true, and the JS
        // marketplace.versionCompare() without zeroExtend agrees — 1.0 and 1.0.0 differ.
        $advices = CheckModulesUpdates::revokedAdvices($this->installed('ModuleA', '1.0.0'), ['ModuleA' => [['version' => '1.0', 'reason' => 'x']]], '/');
        $this->assertSame([], $advices);
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Expected: `revokedAdvices` undefined.

- [ ] **Step 3: Implement**

In `CheckModulesUpdates`:

```php
    /**
     * Advice rows for installed versions revoked by marketplace moderation (spec 6.5).
     * Driven by the installed list, not by modules[]: a revoked version is no longer in
     * the catalog and the module may have no newer release at all.
     *
     * @param array<string, array<string, mixed>> $installed PbxExtensionModules::getModulesArray()
     * @param array<string, list<array{version: string, reason: string}>> $revoked catalog `revoked` map
     * @return list<array{messageTpl: string, messageParams: array<string, string>}>
     */
    public static function revokedAdvices(array $installed, array $revoked, string $baseUrl): array
    {
        $out = [];
        foreach ($installed as $uniqid => $module) {
            $uniqid = (string)($module['uniqid'] ?? $uniqid);
            if (!isset($revoked[$uniqid]) || !is_array($revoked[$uniqid])) {
                continue;
            }
            $localVersion = (string)($module['version'] ?? '');
            foreach ($revoked[$uniqid] as $entry) {
                if ($localVersion === '' || version_compare($localVersion, (string)($entry['version'] ?? ''), '!=')) {
                    continue;
                }
                $out[] = [
                    'messageTpl' => 'adv_ModuleVersionRevoked',
                    'messageParams' => [
                        'url' => $baseUrl . '?module=' . urlencode($uniqid) . '#/marketplace',
                        'module' => (string)($module['name'] ?? $uniqid),
                        'ver' => $localVersion,
                        'reason' => (string)($entry['reason'] ?? ''),
                    ],
                ];
                break;
            }
        }
        return $out;
    }
```

In `process()`, after `$marketplaceBaseUrl = …` and before the `foreach ($modulesFromServer …)`:

```php
        // Separate pass over INSTALLED modules: revocations are `error` so WorkerNotifyAdministrator mails them
        $revoked = $res->data['revoked'] ?? [];
        foreach (self::revokedAdvices($modulesFromLocal, is_array($revoked) ? $revoked : [], $marketplaceBaseUrl) as $advice) {
            $messages['error'][] = $advice;
        }
```

`ru/Common.php` next to `adv_SecurityPatchAvailable`: `'adv_ModuleVersionRevoked' => 'Версия %ver% модуля <a href="%url%" class="advices-module-update">%module%</a> отозвана модерацией маркетплейса: %reason%. Обновите модуль или отключите его.'` + translations.

JS, `cbParseModuleUpdates(responseData, isSuccessful)` (line 265; `responseData` is `response.data` — the raw catalog answer with both `modules` and the top-level `revoked`): after the loop over the modules add

```js
        // Revoked installed versions (spec 6.5): mark the installed row from the catalog's `revoked` map
        const revoked = (responseData && typeof responseData.revoked === 'object' && responseData.revoked) || {};
        Object.keys(revoked).forEach((uniqid) => {
            const $row = $(`tr.module-row[data-id=${uniqid}]`);
            if ($row.length === 0) return;
            const installedVersion = String($row.data('version') || '');
            const entries = Array.isArray(revoked[uniqid]) ? revoked[uniqid] : [];
            const hit = entries.find((e) => marketplace.versionCompare(String(e.version), installedVersion) === 0);
            if (!hit || $row.find('.revoked-badge').length > 0) return;
            const reason = extensionModuleDetail.escapeHtml(String(hit.reason || ''));
            $row.find('td.version').append(`<br><span class="ui tiny red label revoked-badge popuped" data-content="${reason}"><i class="ban icon"></i>${globalTranslate.ext_RevokedVersion}</span>`);
            $row.find('.revoked-badge').popup();
        });
```

(`extensionModuleDetail` is loaded on the same page — `AssetProvider` lines 613–625.)

- [ ] **Step 4: Tests, PHPStan, live**

Unit `OK (4 tests)`; the existing tests under `tests/Unit/Core/Workers` green; PHPStan clean. Live: extend the stub of Task 4 Step 6 with `"revoked":{"<installed uniqid>":[{"version":"<its exact installed version>","reason":"test"}]}` and run the stub script again (it also deletes the advice cache entry; do **not** start a second `WorkerPrepareAdvice` by hand — the supervised one recomputes within seconds). The dashboard shows the red advice; `GET /pbxcore/api/v3/advice:getList` has it under `advice.error`; the installed row shows the red badge. Transpile the JS.

- [ ] **Step 5: Review gate and commit**

```bash
/usr/bin/git add src/Core/Workers/Libs/WorkerPrepareAdvice/CheckModulesUpdates.php src/Common/Messages sites/admin-cabinet/assets/js/src/PbxExtensionModules/pbx-extension-module-marketplace.js sites/admin-cabinet/assets/js/pbx/PbxExtensionModules tests/Unit/Core/Workers/Libs/WorkerPrepareAdvice/CheckModulesUpdatesRevokedTest.php
/usr/bin/git commit -m "feat(advice): warn and e-mail when an installed module version is revoked by moderation"
```

---

### Task 6: Remove `max_pbx_version` (#1139)

**Files:**
- Modify: `src/PBXCoreREST/Lib/Modules/DataStructure.php` (delete `createFromRepositoryData()` lines 88–110 — no callers; drop `max_pbx_version` from `getOpenApiSchema()` `detailFields` ~line 136 and from `getAllFieldDefinitions()` ~line 350)
- Modify: `src/Common/Messages/*/RestApi.php` (remove `rest_schema_module_max_pbx_version` in all 26+ languages)
- Modify (separate repo `mikopbx/DevelopementDocs`): `marketplace/licensing.md` lines 174–200, `module-developement/module-json.md` lines 23, 344, 374–387, 407

- [ ] **Step 1: Confirm there are no callers**

```bash
grep -rn --exclude-dir=vendor --exclude-dir=node_modules --exclude-dir=pbx --exclude='*secret*' --exclude='*.env*' -e 'createFromRepositoryData' -e 'max_pbx_version' src sites/admin-cabinet/assets/js/src tests
```

Expected: only the `DataStructure.php` lines and the message files.

- [ ] **Step 2: Remove**

Delete the method and the two field entries; delete the translation key in every `src/Common/Messages/*/RestApi.php` (one `perl -ni -e 'print unless /rest_schema_module_max_pbx_version/' src/Common/Messages/*/RestApi.php`). Run `vendor/bin/phpstan analyse` and the whole `tests/Unit/PBXCoreREST` directory in the container. Check the OpenAPI output (`openapi-analyzer` skill) no longer lists the field.

- [ ] **Step 3: Docs (DevelopementDocs repo)**

In `marketplace/licensing.md` rewrite the compatibility paragraph: the release server filters offers by `min_pbx_version` only; there is no upper bound — a module incompatible with a newer PBX is handled by `disableOldModules` and by version revocation (spec 6.6). In `module-json.md` drop the "What about max_pbx_version?" subsection and the table row; keep the statement that the field is ignored if present. Commit in that repo on a branch `docs/remove-max-pbx-version`.

- [ ] **Step 4: Review gate and commit**

```bash
/usr/bin/git add src/PBXCoreREST/Lib/Modules/DataStructure.php src/Common/Messages
/usr/bin/git commit -m "refactor(modules): remove the never-enforced max_pbx_version field"
```

---

### Task 7: CI publishing example and onboarding guide (#1140)

**Files (repo `mikopbx/DevelopementDocs`):**
- Create: `marketplace/third-party-publishing.md`
- Create: `marketplace/examples/publish-module.yml` (GitHub Actions) and `marketplace/examples/publish-module.sh` (any CI / local)
- Modify: `SUMMARY.md` (link the new page under Marketplace)

Depends on the server plan's Task 7 being deployed (endpoint `POST https://releases.mikopbx.com/releases/v1/publisher/modules/{guid}/releases`); write the docs now, mark the page "available from release server step 1" until then.

- [ ] **Step 1: The script**

`marketplace/examples/publish-module.sh`:

```sh
#!/bin/sh
# Publishes one module release to the MikoPBX marketplace (publisher API, step 1).
# Needs: MIKOPBX_PUBLISHER_TOKEN (mpub_… from the publisher cabinet, keep it in CI secrets),
#        MODULE_GUID (moduleUniqueID), VERSION, ZIP path; optional CHANNEL=draft|stable (default draft).
set -eu
: "${MIKOPBX_PUBLISHER_TOKEN:?set the token from CI secrets}"
: "${MODULE_GUID:?}" ; : "${VERSION:?}" ; : "${ZIP:?}"
CHANNEL="${CHANNEL:-draft}"
MIN_PBX="${MIN_PBX_VERSION:-$(python3 -c 'import json;print(json.load(open("module.json")).get("min_pbx_version",""))' 2>/dev/null || true)}"

# --form-string for text fields: with -F a value starting with @ or < would be read as a file
VERSION="${VERSION#v}"   # a tag like v1.0.1 must become 1.0.1 (the server compares it with module.json)
HTTP=$(curl -sS -o response.json -w '%{http_code}' \
  -H "Authorization: Bearer $MIKOPBX_PUBLISHER_TOKEN" \
  -F "file=@$ZIP" --form-string "version=$VERSION" --form-string "min_pbx_version=$MIN_PBX" \
  --form-string "changelog_ru=${CHANGELOG_RU:-}" --form-string "changelog_en=${CHANGELOG_EN:-}" --form-string "channel=$CHANNEL" \
  "https://releases.mikopbx.com/releases/v1/publisher/modules/$MODULE_GUID/releases")
case "$HTTP" in
  200) cat response.json; echo ;;
  413) echo "archive is over 100 MB (nginx answered with an HTML page, not JSON)"; exit 1 ;;
  *)   echo "HTTP $HTTP"; cat response.json 2>/dev/null; echo; exit 1 ;;
esac
```

- [ ] **Step 2: The workflow**

`marketplace/examples/publish-module.yml`:

```yaml
name: Publish module release
on:
  release:
    types: [published]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Free checks (recommended)
        run: |
          php -l $(git ls-files '*.php') >/dev/null
          test -f module.json && php -r 'json_decode(file_get_contents("module.json"), flags: JSON_THROW_ON_ERROR);'
          # add: vendor/bin/phpstan analyse, gitleaks detect
      - name: Build ZIP
        run: zip -r "${{ github.event.repository.name }}-${{ github.event.release.tag_name }}.zip" . -x '.git/*' '.github/*'
      - name: Publish
        env:
          MIKOPBX_PUBLISHER_TOKEN: ${{ secrets.MIKOPBX_PUBLISHER_TOKEN }}
          MODULE_GUID: ModuleYourName
          VERSION: ${{ github.event.release.tag_name }}
          ZIP: ${{ github.event.repository.name }}-${{ github.event.release.tag_name }}.zip
          CHANNEL: stable
          CHANGELOG_EN: ${{ github.event.release.body }}
        run: sh marketplace/examples/publish-module.sh
```

(authors copy the script into their repo; the path in `run:` is theirs).

- [ ] **Step 3: The onboarding page**

`marketplace/third-party-publishing.md` sections, each 1–3 paragraphs, written from spec 2, 4.3–4.4, 4.8, 8: *Trust levels* (official / verified / community — what the administrator sees and what each requires), *Applying* (e-mail/issue with GitHub account, module GUID request, public source URL for community), *First acceptance* (MIKO reviews the application and the first release; later releases are automatic), *Publishing* (token once from the cabinet, the script above, `channel` semantics, error codes 401/403/409/413/422/429 with the 422 reason codes), *Revocation* (what MIKO does, what administrators see, what the publisher must do: fix and release), *Publisher duties* (support address, incident response, keeping sources public for community), *What the server checks* (the ZIP rules — size, entries, paths, `module.json`, `Setup/PbxExtensionSetup.php`, GUID pattern `^Module[A-Za-z0-9]{1,60}$`, version strictly increasing) and *What it does not* (no code review — run `php -l`, PHPStan, secret scanning in your CI). Add the page to `SUMMARY.md`.

- [ ] **Step 4: Commit (DevelopementDocs)**

Branch `docs/third-party-publishing`, one commit `docs(marketplace): third-party publisher onboarding and CI example`. No PR until the server endpoint is live.

---

### Task 8: End-to-end check and hand-off

- [ ] **Step 1: Full test run**

```bash
docker exec mikopbx-tpm php /usr/www/vendor/bin/phpunit -c /usr/www/tests/Unit/phpunit.xml /usr/www/tests/Unit/PBXCoreREST
docker exec mikopbx-tpm php /usr/www/vendor/bin/phpunit -c /usr/www/tests/Unit/phpunit.xml /usr/www/tests/Unit/Common
docker exec mikopbx-tpm php /usr/www/vendor/bin/phpunit -c /usr/www/tests/Unit/phpunit.xml /usr/www/tests/Unit/Core
/Volumes/DevDisk/Developement/mikopbx/Core/vendor/bin/phpstan analyse -c phpstan.neon
```

plus `tests/api/test_39_modules.py`. Expected: all green. Then fix spec 6.4 in `docs/superpowers/specs/2026-09-21-third-party-modules-design.md`: drop the sentence about declaring fields for `ResponseSchemaValidator` (it never validates the catalog answers) — one line, same commit as the docs.

- [ ] **Step 2: UI pass**

With the `mikopbx-web-tester` agent on `mikopbx-tpm`: install from marketplace (official, no dialog change), ZIP upload (manual dialog, badge), stubbed community module (badge + warning text in the dialog, publisher/source/support in details), stubbed revocation (red advice on the dashboard, red badge in the list, e-mail queued — check `WorkerNotifyAdministrator` log line or the mail queue).

- [ ] **Step 3: Pilot readiness against the real server**

When the server plan is deployed to the stand (`releases` host of the license server stand): point the container at it (the catalog URL is a constant in `GetAvailableModulesAction` — do **not** commit a stand URL; use the hosts file or a temporary env override documented in `_temp`), run spec section 8 steps 5–7 with `ModuleCalleridSearchCH`, and record the result in the Jira umbrella LIC-320.

- [ ] **Step 4: Report**

Branch `worktree-third-party-modules-core` (rename to `feat/third-party-modules-core` before the PR), six commits in Core, the issues #1134–#1139 referenced in the PR body with "Closes #…" per issue, #1140 handled in DevelopementDocs. Push the branch and open a **draft** PR against `develop`; the owner decides on the merge after the server side is live. Stop and remove `mikopbx-tpm` afterwards.

---

## Self-review notes

- Spec coverage: 6.1 → T1; 6.2 → T2; 6.3 → T3; 6.4 → T4; 6.5 → T5; 6.6 → T6; 7 → T7; 8 (core steps 5–7) → T8; 9 (core items) → tests in T1–T5 + T8.
- Interfaces reused across tasks: `moduleTrust.level()` (T4) is the only reader of `trust_level` in JS; the controller's `?? ''` (T4) is the only reader of the new columns outside the pipeline; `ModuleDownloadService::validateDownloadUrl()` (T1) is called by both the default pipeline and `StartDownloadAction`; `DataStructure::isValidModuleUniqueId()` (T2) by both `GetMetadataFromModulePackageAction` and `StartDownloadAction`.
- Known pre-existing defect, not fixed here: `getModulesArray()` returns a 0..n indexed list on a cold cache, so the existing `isset($modulesFromLocal[$uniqid])` in `CheckModulesUpdates` misses on the first run after a cache flush; `revokedAdvices()` reads `$module['uniqid']` and is immune. Worth its own issue.
- Optional hardening left out: `phaseExtractToStaging()` accepts a `module.json` uniqid that differs from the requested one in the repo flow; the server refuses such archives (`guid_mismatch`), the core could refuse too with one comparison.
- Deliberately not in this plan: a `DISABLED_BY_REVOCATION` reason (spec: the core disables nothing), a "marketplace only" setting, sha256 in the legacy `WorkerDownloader` (shared with firmware), any change to `GetAvailableModulesAction` parsing (it passes the raw JSON through, so the new keys arrive without code).
