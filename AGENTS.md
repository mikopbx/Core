# MikoPBX Core — agent guide

Open-source PBX on Asterisk with a PHP/Phalcon web GUI. Ground truth for versions is
`composer.json` (PHP ^8.4, ext-phalcon ^5.9.3, PHPUnit ^9, PHPStan ^2). Runtime targets a
single container (Docker or LXC) bundling PHP, SQLite, Redis, Beanstalkd, Asterisk, Nginx.
Related repos: `mikopbx/DevelopementDocs` (developer docs), `mikopbx/ModuleTemplate`.

Nested `AGENTS.md` files in `src/*/`, `tests/*/` and
`sites/admin-cabinet/assets/js/src/SystemDiagnostic/` hold subsystem detail; read the one
for the subtree you touch. Keep this file repo-wide only.

## Conventions
- Import `use Phalcon\Di\Di;` (never `use Phalcon\Di;`).
- CLI scripts and tests bootstrap with `require_once 'Globals.php';` — no path; the
  autoloader resolves `src/Core/Config/Globals.php`.
- PSR-12 (`composer phpcs`). Static analysis: `vendor/bin/phpstan analyse` (`phpstan.neon`,
  level 0, `src/` only). Run it after PHP changes.
- Register new JS/CSS via `AssetProvider`; never edit `sites/admin-cabinet/assets/js/pbx/**`
  (Babel output of `assets/js/src/**`). Use the `babel-compiler` skill to transpile.
- UI strings live in `src/Common/Messages/<lang>/*.php`, Russian is the source language;
  use the `translations` skill.
- Reuse existing helpers and naming; no dead code, no stubbed "simplified" implementations,
  no mock services in tests.

## Branches and releases
- `develop` is the only development branch; every PR, including cloud-session PRs, targets
  it (hotfix cherry-pick PRs into `release/*` are the one exception). `master` is being
  retired (INFRA-141): do not branch from it or merge into it.
- A release is a tag `YYYY.M.N` (M = feature line, N = build counter), not a branch merge.
  The owner makes it by running the TeamCity chain on `develop` with the *Release build*
  flag; the chain builds without the `-dev` suffix, runs the REST tests, publishes Docker
  images and a GitHub pre-release and tags the built revision in Core and in the build
  repositories. Nightly green chains publish `YYYY.M.N-dev` pre-releases and move the `:dev`
  Docker tag.
- A hotfix is fixed on `develop` first, then cherry-picked onto `release/YYYY.M.N` (cut from
  tag `YYYY.M.N` in each repository that needs it, usually only Core) and released by the
  same chain on that branch under the next free version number. The branch is deleted after
  the release. Not yet exercised (INFRA-141): the T2 toolchain always comes from the latest
  `develop` full build, so verify on a throwaway tag first.
- Releases, tags, release branches and their deletion are owner actions: agents do not
  trigger TeamCity, tag, promote or delete branches unless explicitly asked.

## Testing
- Unit: `vendor/bin/phpunit -c tests/Unit/phpunit.xml <path>` — the XML defines no
  testsuites, so a path is mandatory. Run inside the PHP container so `vendor/` and
  extensions match production.
- `tests/AdminCabinet` (PHPUnit + Selenium/BrowserStack), `tests/api` (pytest),
  `tests/Calls` (bash/PHP, separate Asterisk on port 5062), `tests/pycalltests` (PJSUA2,
  runs inside the container). Each has its own README or guide.
- Host `tests/` is synced to `/offload/rootfs/usr/www/tests` in the container.
- Restart the container before verifying backend changes; workers cache code.

## Target host gotchas
- Rootfs is read-only. Hot-patch with
  `busybox mount -o remount,rw /offload` ... `busybox mount -o remount,ro /offload`.
  Use `busybox mount`, not bare `mount`; the mount point is `/offload`, not `/offload/rootfs`.
- Packaging on macOS: `COPYFILE_DISABLE=1 tar --no-xattrs ...` or `._*` files land on the host.
- After editing `src/Common/Messages/*`, delete `/var/tmp/www_cache/js/localization-*.min.js`
  on the host; `AssetProvider::makeLocalizationAssets()` only regenerates a missing file and
  the version hash ignores translation content.
- Live paths: DB `/cf/conf/mikopbx.db`; logs under `/storage/usbdisk1/mikopbx/log/`
  (`system/messages`, `php/php-error.log`, `nginx/error.log`, `asterisk/`, `fail2ban/`).
- Module workers crashing 100+ times in 30 min are auto-disabled (`DISABLED_BY_CRASH_LOOP`).

## Skills
Project skills (Agent Skills standard) are published separately at
https://github.com/mikopbx/agent-skills and are not part of this repository. Install them
into your agent with `npx skills add mikopbx/agent-skills` (works for Claude Code, Codex,
Cursor, Gemini CLI and others). Skills referenced elsewhere in these guides (`babel-compiler`,
`translations`, `api-client`, ...) come from that repository.

## Do not
- Commit or stage without being asked. Do not read `vendor/`, `node_modules/`, `build/`,
  `resources/{db,sounds-base,rootfs}/`, `*.min.*` — they are generated or huge.
- Leave partial implementations, duplicated helpers, or resource leaks (DB handles,
  timers, listeners).
