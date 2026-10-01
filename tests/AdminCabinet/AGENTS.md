# tests/AdminCabinet — agent guide

Selenium e2e tests of the web GUI, driven by PHPUnit 9 through BrowserStack. Nothing here
runs without a BrowserStack account and a reachable MikoPBX instance. Repo-wide rules live
in the root `AGENTS.md`; BrowserStack setup in `BROWSERSTACK_SETUP.md`, JUnit upload in
`JUNIT_UPLOAD_GUIDE.md`, the ARM64/AMD64 matrix runner in `README.md`.

## Running
- Preferred: `tests/AdminCabinet/Scripts/run-tests-and-upload.sh [SuiteName]` from the repo
  root on the host. It runs `vendor/bin/phpunit -c tests/AdminCabinet/phpunit.xml` inside
  `mikopbx-php83` (`CONTAINER_NAME` to override), writes `reports/junit.xml`, uploads it.
  `PHPUNIT_FILTER` narrows to one test. Suite names are in `phpunit.xml`.
- Manual: `docker exec -e ... mikopbx-php83 sh -c 'cd /offload/rootfs/usr/www/tests/AdminCabinet
  && ../../vendor/bin/phpunit -c phpunit.xml --testsuite Extensions'`. Run from this directory or
  set `CONFIG_FILE`: `Lib/globals.php` looks for `config/local.conf.json` relative to the cwd.
- `phpunit-audiofiles.xml` runs the AudioFiles suite in one shared browser session; `debug-unit.xml`
  runs every `*Test.php` under `Tests/` as one suite.

## Required environment
- `config/local.conf.json` (copy `.example`; git-ignored) or env `BROWSERSTACK_USERNAME`,
  `BROWSERSTACK_ACCESS_KEY`, `MIKO_LICENSE_KEY`. Env wins over the file.
- `SERVER_PBX` — URL of the PBX under test. The default in `globals.php` is a stale LAN address;
  always set it explicitly.
- BrowserStack Local must be started on the macOS host (`./start-browserstack-local.sh`; there is
  no ARM64 Linux binary for the container), then export `BROWSERSTACK_DAEMON_STARTED=true`,
  `BROWSERSTACK_LOCAL=true`, `BROWSERSTACK_LOCAL_IDENTIFIER=local_test`. Only the literal string
  `false` makes the test start its own tunnel from PHP.
- GUI credentials are hardcoded in `Tests/Traits/LoginTrait.php` (`admin` / `123456789MikoPBX#1`);
  the target PBX must match or the first `ChangeWeakPasswordTest` run must set them.

## Gotchas
- Suites are order-dependent (Create* -> Change* -> CheckDropdown* -> Delete*); run a single
  later suite only against a PBX that already has the earlier data.
- Never enable `processIsolation`: the refresh token is an httpOnly cookie and each new PHP
  process forces a fresh login and a new BrowserStack session.
- Per-entity tests in `Tests/<Feature>/` are generated: edit `Tests/Data/*DataFactory.php` and
  rerun the matching `composer generate-*-tests` script (see `composer.json`); do not hand-edit them.
- Screenshots on failure go to `test-screenshots/` relative to the cwd; `reports/` is git-ignored.
- Do not put credentials in scripts or commits; use env or the ignored config file.
