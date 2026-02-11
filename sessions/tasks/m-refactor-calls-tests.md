---
name: m-refactor-calls-tests
branch: feature/refactor-calls-tests
status: pending
created: 2026-02-11
---

# Рефакторинг интеграционных тестов звонков (tests/Calls)

## Problem/Goal
Фреймворк tests/Calls — bash/PHP интеграционные тесты звонков через отдельный Asterisk (порт 5062).
Тесты работают, но имеют серьёзные проблемы с качеством кода: массивное дублирование,
отсутствие assertions (тесты могут молча падать), hardcoded значения, нет cleanup при падении,
опечатки в константах, race conditions на фиксированных sleep.

## Success Criteria
- [ ] `start.sh` имеет `trap cleanup EXIT INT TERM` — production БД защищена при прерывании
- [ ] Тесты возвращают exit code 1 при провале CDR-валидации
- [ ] Опечатка `ACtION_*` исправлена на `ACTION_*`
- [ ] Общий dialplan `orgn-wait` вынесен в include-файл вместо 9 копий
- [ ] Дублирование fixtures в `start.php` устранено (общий код в `TestCallsBase`)
- [ ] Фиксированные `sleep()` заменены на polling с таймаутом где возможно
- [ ] Пустые конфиг-файлы Asterisk удалены или задокументированы
- [ ] README.md добавлен с описанием архитектуры и запуска тестов

## Context Manifest
<!-- Added by context-gathering agent -->

### How This Currently Works: tests/Calls Integration Test Framework

#### Overall Architecture

The `tests/Calls` framework is a bash/PHP integration testing system that validates MikoPBX call flow scenarios by running a **second, independent Asterisk instance** (on port 5062) alongside the production MikoPBX Asterisk (on port 5060). The test Asterisk acts as a set of SIP endpoints that register to the production PBX, place calls through it, and then the PHP test scripts verify that the production PBX produced the correct CDR (Call Detail Records) entries.

The architecture has three layers: (1) `start.sh` -- the bash orchestrator that swaps the production database, starts the test Asterisk, and runs test scripts sequentially; (2) `TestCallsBase.php` -- the PHP base class that handles origination, CDR clearing, CDR comparison, and config copying; (3) individual test directories (`01-call-A-to-B/`, `02-call-A-to-B-attended-B-to-C/`, etc.) each containing a `start.php` script defining expected CDR and call rules, plus a `configs/extensions.conf` that defines the test Asterisk's dialplan for that specific scenario.

#### start.sh -- The Test Runner (111 lines)

**File**: `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/start.sh`

When invoked, `start.sh` performs these steps:

1. **Database swap**: Copies the production database (`/cf/conf/mikopbx.db`) to a backup location (`/storage/usbdisk1/mikopbx/tmp/mikopbx.db`), then replaces it with the test database (`tests/Calls/db/mikopbx.db`), but first copies the `m_LanInterfaces` table from the production dump into the test DB so network config matches the running system.

2. **Service restart**: Flushes Redis, runs `updateDb.php` (which updates the database schema and reloads all Asterisk configs -- SIP, Extensions, Manager, Modules, Features, VoiceMail, Asterisk, Indication -- then restarts all services via `pbx-console services restart-all`), waits for production Asterisk to boot.

3. **Test Asterisk startup**: Generates `asterisk.conf` from `asterisk-pattern.conf` by replacing the `PATH` placeholder with the actual directory path. Starts a second Asterisk process with `-C` pointing to this config. The test Asterisk binds on port 5062 (SIP) and port 5039 (AMI manager).

4. **Test execution**: Sets `USER_AGENT` environment variable to `mikopbx-test-<timestamp>` (used to identify test endpoints). Finds all `start.php` files, runs `00-*` init tests first, then either all remaining tests or a filtered subset (via `$1` argument). Each test gets a 300-second timeout via `/usr/bin/timeout`.

5. **Cleanup**: Stops the test Asterisk, restores the production database from the backup, and re-runs `updateDb.php` to restore production configs.

**Critical problems in start.sh**:
- No `trap` for cleanup on SIGINT/SIGTERM -- if interrupted, the production database remains overwritten with the test DB, which could corrupt a live system.
- Exit codes from individual tests are not captured -- the `for` loop just runs each test and ignores failures, so the overall script always exits 0.
- The conditional restore logic on line 101 checks `$1x == 'x'` (no argument) to decide whether to run `updateDb.php` on restore, but this means when running a specific test the DB configs are not regenerated, which could leave stale configs.

#### asterisk-pattern.conf -- Test Asterisk Config Template

**File**: `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/asterisk/asterisk-pattern.conf`

A template where `PATH` is replaced by `sed` in `start.sh` with the actual test directory path. Key directories:
- `astetcdir` => test dir's `asterisk/` subfolder (for all .conf files)
- `astrundir` => test dir's `run/` (PID file)
- `astlogdir` => test dir's `logs/`
- `astspooldir` => test dir's `logs/spool/` (where `.call` files go for origination)
- `astmoddir` => `/offload/asterisk/modules` (shared with production Asterisk)
- `astvarlibdir` => `/offload/asterisk` (shared)

#### Test Asterisk PJSIP Configuration

**File**: `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/asterisk/pjsip.conf` (overwritten at runtime)

The static file in the repo is outdated (has hardcoded 202/203 endpoints). The actual config is dynamically generated by test `00-make-config-pjsip/start.php`, which:
1. Reads up to 5 SIP peers and 2 SIP providers from the production database
2. Uses templates `pjsip-pattern.conf` and `pjsip-pattern-endpoint.conf` to generate endpoint configs
3. Each endpoint registers to `127.0.0.1:5060` (production) from the test Asterisk on port 5062
4. Sets `user_agent` to the `USER_AGENT` env var so test endpoints can be distinguished from real ones
5. Also creates outgoing routes for providers with pattern `(7|8)` to enable external call testing

The `pjsip-pattern-endpoint.conf` template uses `<ENDPOINT>` and `<PASSWORD>` as placeholders, creating auth, AOR (with `contact = sip:<ENDPOINT>@127.0.0.1:5060`), identify, registration, and endpoint sections for each peer.

#### TestCallsBase.php -- Core Test Logic

**File**: `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/Scripts/TestCallsBase.php`

**Namespace**: `MikoPBX\Tests\Calls\Scripts`

**Constructor**: Gets idle peers (registered test endpoints identified by `USER_AGENT`), assigns first three as `aNum`, `bNum`, `cNum`. Gets offline peers and assigns first as `offNum`. Connects to test Asterisk AMI on port 5039.

**Key methods**:

- `getIdlePeers()`: Connects to production AMI (`Util::getAstManager('off')`) and iterates PJSIP endpoints, filtering by `USER_AGENT` match. Returns array of numeric extension IDs in `OK` state.

- `getOffPeers()`: Similar but returns endpoints NOT in `OK` state.

- `runTest(string $testName, array $sampleCDR, ?array $rules, int $countFiles)`: Main entry point. Copies the test's extensions.conf to the test Asterisk config dir, reloads the test Asterisk dialplan, clears CDR tables, initializes sample CDR data (replacing property name strings like `'aNum'` with actual extension numbers), then either does a simple originate+wait or invokes a sequence of rules, and finally checks CDR.

- `cpConfig()`: Copies `configs/*` from the test directory to `asterisk/` and reloads the test Asterisk dialplan via `asterisk -C <conf> -rx 'dialplan reload'`. Sleeps 5 seconds after reload.

- `cleanCdr()`: Deletes ALL rows from both `CallDetailRecords` (cdr_general) and `CallDetailRecordsTmp` (cdr) tables via Phalcon ORM.

- `originateWait()`: Places a call from `aNum` to `bNum` using the `.call` file spool method, then polls `am->GetChannels(false)` every second until no channels remain, plus an additional 5-second sleep.

- `actionOriginate(src, dst)`: Creates a `.call` file in the test Asterisk spool directory (`$dirName/logs/spool/outgoing/test.call`). The call file uses `Channel: Local/$src@orgn-wait` (entering the test Asterisk's `orgn-wait` context) with `Context: out-to-exten` and `Extension: $dst`. Sets channel variables `__A_NUM`, `__B_NUM`, `__C_NUM`, `__OFF_NUM` as inherited vars.

- `actionOriginateGeneral(src, dst)`: Creates a `.call` file in the PRODUCTION Asterisk's spool directory (`/storage/.../outgoing/test.call`) using `Channel: Local/$src@internal-originate` with `Context: all_peers`. Used by tests 07 and 08 for originate-style calls.

- `invokeRules(rules)`: Iterates an array of rules, calling `invokeOriginate`, `invokeGeneralOriginate`, or `invokeWait` based on the action constant. After all rules, sleeps 5 seconds then polls for channels to complete.

- `checkCdr()`: **This is the validation heart of the framework**. After a 15-second sleep, queries CDR via `CDRDatabaseProvider::getCdr(['work_completed=1', 'columns' => '*'])`, which sends a request to the `WorkerCdr` beanstalk tube. Compares the returned rows against `$this->sampleCDR`. For each CDR row, it also checks recording files exist and measures their duration via `soxi`. The comparison allows +/-1 tolerance for `duration`, `billsec`, and `fileDuration` fields. **Critical issue**: errors are only printed to stderr, never cause a non-zero exit code. The method returns void and the test continues.

**Constants with typo**:
```php
public const ACtION_ORIGINATE = 'Originate';
public const ACtION_GENERAL_ORIGINATE = 'GeneralOriginate';
public const ACtION_WAIT = 'Wait';
```
The casing `ACtION` instead of `ACTION` is the typo mentioned in the task. These are referenced in all test scripts (tests 06, 07, 08, 10).

#### Individual Test Scripts -- Structure and Patterns

Each test directory `XX-testname/` contains:
- `start.php` -- defines `$sampleCDR` array, creates `TestCallsBase`, calls `runTest()`
- `configs/extensions.conf` -- test Asterisk dialplan for this scenario

**Every start.php follows this pattern**:
```php
use \MikoPBX\Tests\Calls\Scripts\TestCallsBase;
require_once __DIR__.'/../TestCallsBase.php';

$sampleCDR = [];
$sampleCDR[] = ['src_num'=>'aNum', 'dst_num'=>'bNum', ...];

$testName = basename(__DIR__);
$test = new TestCallsBase();
$test->runTest($testName, $sampleCDR [, $rules [, $countFiles]]);
```

The boilerplate (license header, require, TestCallsBase instantiation, basename, runTest) is identical across all 11 test scripts.

#### Test Catalog

| # | Test | Scenario | Uses Rules | CDR Count | Notes |
|---|------|----------|-----------|-----------|-------|
| 00 | make-config-pjsip | Setup: generates pjsip.conf, registers endpoints, creates outgoing routes | N/A | N/A | Init only |
| 01 | call-A-to-B | Simple A calls B | No (originateWait) | 1 | Basic call |
| 02 | call-A-to-B-attended-B-to-C | A->B, B does attended transfer (##) to C | No | 3 | B sends DTMF `##C_NUM` |
| 03 | call-A-to-B-attended-A-to-C | A->B, A does attended transfer (##) to C | No | 3 | Uses `U(z-dial-answer)` subroutine |
| 04 | call-A-to-B-blind-B-to-C | A->B, B does blind transfer (**) to C | No | 2 | B sends DTMF `**C_NUM` |
| 05 | call-A-to-B-blind-A-to-C | A->B, A does blind transfer (**) to C | No | 2 | Uses `U(z-dial-answer)` subroutine |
| 06 | call-A-to-B-pickup-C-to-B | A->B ringing, C picks up B's call via *8 | Yes (rules) | 2 | First test using rules; C calls `*8` |
| 07 | originate-A-to-B | Originate on production PBX | Yes (GeneralOriginate) | 1 | Uses production spool |
| 08 | originate-A-to-74952293042 | Originate external call via production PBX | Yes (GeneralOriginate) | 1 | Tests outgoing route |
| 09 | call-A-to-B-attended-B-to-offNum | A->B, B transfers to offline number | No | 4 | Tests transfer to unreachable peer |
| 10 | A-to-conf-B-to-conf | A and B join conference room | Yes (rules) | 2 | Uses `ConferenceConf::getConferenceExtensions()` |
| 11 | call-A-to-B-attended-B-cancel | A->B, B starts attended transfer then cancels | No | 2 | Has TODO comment about billsec > fileDuration |

#### Dialplan: The `orgn-wait` Context -- Duplicated 9 Times

The `[orgn-wait]` context appears in **9** different `extensions.conf` files (tests 01-06, 09-11). Its purpose is to act as the call originator's local channel endpoint. All copies share the same core logic:
```
exten => _X!,1,NoOp(start test)   ; or "staart test" (typo in several)
    same => n,Answer()
    same => n,Set(GLOBAL(A_NUM)=${A_NUM})
    same => n,Set(GLOBAL(B_NUM)=${B_NUM})
    same => n,Set(GLOBAL(C_NUM)=${C_NUM})
    same => n,Set(TIMEOUT(absolute)=20)
    same => n,Milliwatt()
```

Minor variations across copies:
- Test 05: `Set(TIMEOUT(absolute)=20)` comes first (before Answer)
- Test 06: Also sets `GLOBAL(SRC_NUM)`, timeout is 10
- Test 09: Also sets `GLOBAL(OFF_NUM)`, timeout is 21
- Test 10: Only sets A_NUM and B_NUM, timeout is 10
- Tests 01, 04, 09: Use `NoOp(staart test)` -- note the typo "staart"

Similarly, `[out-to-exten]` is duplicated with minor Dial flag variations (some have `Tt`, others `TtU(z-dial-answer)`, others have different timeout values).

#### Dialplan: Test-Specific Contexts

Each test defines an `[incoming]` context that handles calls arriving at the test Asterisk endpoints. Tests 07 and 08 do NOT have `[orgn-wait]` because they use the production PBX originate path instead.

The `[incoming]` context for tests 07-08 uses a different pattern that auto-detects A_NUM from the first arriving call:
```
exten => _X!,1,NoOp()
    same => n,ExecIf($["${A_NUM}x" == "x"]?Set(GLOBAL(A_NUM)=${EXTEN}))
    same => n,ExecIf($["${EXTEN}" == "${A_NUM}"]?Goto(a-incoming,${EXTEN},1))
    same => n,Goto(b-incoming,${EXTEN},1)
```
Tests 07 and 08 have **identical** `extensions.conf` files.

#### Asterisk Config Files -- Empty/Unnecessary Files

Several config files in `tests/Calls/asterisk/` are effectively empty (contain just whitespace or a single newline):
- `acl.conf` -- empty
- `codecs.conf` -- empty
- `confbridge.conf` -- empty
- `queues.conf` -- empty
- `queuerules.conf` -- empty
- `sorcery.conf` -- empty
- `udptl.conf` -- empty
- `pjsip_notify.conf` -- empty

These exist because Asterisk's `modules.conf` loads modules that expect these files. They are required for the test Asterisk to start without errors, even if they contain no configuration. They should be documented as "required empty stubs" rather than deleted.

Non-empty but boilerplate configs: `ccss.conf`, `chan_dahdi.conf`, `iax.conf`, `iaxprov.conf` have minimal default settings. The `indications.conf` file is extremely large (~737 lines) containing tone definitions for dozens of countries -- this is a standard Asterisk file that could be shared with production rather than duplicated.

#### Key Dependencies and Class Relationships

**PHP Classes Used by Tests**:
- `MikoPBX\Tests\Calls\Scripts\TestCallsBase` -- the base class
- `MikoPBX\Common\Models\CallDetailRecords` -- permanent CDR table (`cdr_general`)
- `MikoPBX\Common\Models\CallDetailRecordsTmp` -- temporary CDR table (`cdr`)
- `MikoPBX\Common\Providers\CDRDatabaseProvider` -- CDR query via beanstalk
- `MikoPBX\Core\Asterisk\AsteriskManager` -- AMI connection for origination and channel queries
- `MikoPBX\Core\System\Directories` -- getting `AST_MONITOR_DIR` for production spool path
- `MikoPBX\Core\System\PBX` -- `PROC_NAME` constant (asterisk binary), `dialplanReload()`
- `MikoPBX\Core\System\Processes` -- `mwExec()` for shell commands
- `MikoPBX\Core\System\Util` -- `getAstManager()`, `which()`, `trimExtensionForFile()`
- `MikoPBX\Common\Models\Sip` -- peer/provider query in test 00
- `MikoPBX\Common\Models\OutgoingRoutingTable` -- outgoing route creation in test 00
- `MikoPBX\Core\Asterisk\Configs\ConferenceConf` -- conference extension lookup in test 10

**External Tools Used**:
- `sqlite3` -- for database manipulation in start.sh
- `soxi` -- for measuring recording file duration in `checkCdr()`
- `asterisk` -- CLI commands via `Processes::mwExec()`
- `redis-cli` -- for FLUSHALL in start.sh
- `pbx-console` -- for `services restart-all` in updateDb.php
- `busybox mount` -- for remounting /offload/ as read-write

**AMI Connections**:
- Production AMI: `127.0.0.1:5038` (via `Util::getAstManager('off')` using DI service)
- Test AMI: `127.0.0.1:5039` (via direct `new AsteriskManager()` + `connect('127.0.0.1:5039')`)

The test AMI on port 5039 uses user `phpagi` with secret `phpagi` as defined in `tests/Calls/asterisk/manager.conf`.

**Feature codes** (from `tests/Calls/asterisk/features.conf`):
- Attended transfer: `##`
- Blind transfer: `**`
- Pickup: `*8`
- Disconnect: `*0`
- Park: `*2`

#### CDR Validation Logic in Detail

The `checkCdr()` method at line 324 of `TestCallsBase.php` works as follows:

1. Sleeps 15 seconds to allow WorkerCdr to finalize all CDR records
2. Queries `CDRDatabaseProvider::getCdr(['work_completed=1', 'columns' => '*'])` which goes through beanstalk to WorkerCdr
3. Checks row count matches expected count -- if not, prints error and **returns** (does not fail)
4. For each CDR row, checks if recording file exists and measures duration with `soxi`
5. Tries to match each CDR row to an expected sample using these comparison rules:
   - Fields `duration`, `billsec`, `fileDuration` use **non-strict** comparison: actual value must be within +/- 1 of expected
   - All other fields (like `src_num`, `dst_num`) use exact string match
   - If `countFiles > 0`, `fileDuration` matching is skipped (only file count is checked at the end)
6. Uses `$checkedIndexes` to prevent double-matching
7. If any row fails to match, prints the row as JSON and breaks

**The critical flaw**: `checkCdr()` never returns a boolean or throws an exception. Errors are printed to stderr but the test script always completes with exit code 0. Similarly, `runTest()` returns void and does not propagate failure.

#### Database Setup

**File**: `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/db/mikopbx.db`

This is a pre-configured SQLite database used as the test configuration. Before use, `start.sh` copies the `m_LanInterfaces` rows from the production DB into this test DB to preserve network configuration.

**File**: `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/db/updateDb.php`

Runs database schema updates and reloads all Asterisk configuration generators:
```php
$dbUpdater = new UpdateDatabase();
$dbUpdater->updateDatabaseStructure();
SIPConf::reload();
ExtensionsConf::reload();
ManagerConf::reload();
ModulesConf::reload();
FeaturesConf::reload();
VoiceMailConf::reload();
AsteriskConf::reload();
IndicationConf::reload();

$cmd = Util::which('pbx-console');
shell_exec("$cmd services restart-all");
```

#### SIPp Scenario (Supplementary)

**File**: `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/sipp/scenario.xml`

A basic UAC (caller) SIPp scenario for load testing. It sends INVITE, waits for 200, sends ACK, pauses 5 seconds, sends BYE. Used independently from the PHP test framework (invoked manually per the comments). Not part of the automated test flow.

### What Needs to Change: Refactoring Plan Technical Details

#### 1. Trap Cleanup in start.sh

The cleanup function should restore the database and stop the test Asterisk. It needs to be registered before the database swap happens. The current restore logic (lines 98-109) should be extracted into a `cleanup()` function:

```bash
function cleanup() {
    echo_header "Cleaning up...";
    # Stop test Asterisk if running
    if [ -f "$pidDir" ]; then
        /usr/sbin/asterisk -C "$astConf" -rx 'core stop now' > /dev/null 2>/dev/null
    fi
    # Restore production database
    if [ -f "$dumpConfFile" ]; then
        cp "$dumpConfFile" "$confFile"
        # Re-run updateDb only if we replaced the config initially
        if [ "$didSwapDb" = "true" ]; then
            export XDEBUG_CONFIG="${EMPTY}"
            php -f "$dirName/db/updateDb.php" > /dev/null 2>/dev/null
            export XDEBUG_CONFIG="${debugParams}"
        fi
    fi
}
trap cleanup EXIT INT TERM
```

The variable `$dumpConfFile`, `$confFile`, `$dirName`, `$astConf`, and `$debugParams` must be declared before the trap is set, which aligns with the current script structure.

#### 2. Exit Code Propagation

Two changes needed:
- `checkCdr()` in `TestCallsBase.php` should return a boolean indicating success/failure
- `runTest()` should propagate that to an exit code
- `start.sh` should capture the exit code from each `php -f` invocation and set a flag, then exit non-zero at the end if any test failed

In the PHP test scripts, after `runTest()`, the script should `exit(1)` if validation failed. This could be done by having `runTest()` return a boolean, or by having `checkCdr()` call `exit(1)` on failure.

#### 3. Fix ACtION Typo

In `TestCallsBase.php`, rename:
```php
public const ACtION_ORIGINATE = 'Originate';
public const ACtION_GENERAL_ORIGINATE = 'GeneralOriginate';
public const ACtION_WAIT = 'Wait';
```
to:
```php
public const ACTION_ORIGINATE = 'Originate';
public const ACTION_GENERAL_ORIGINATE = 'GeneralOriginate';
public const ACTION_WAIT = 'Wait';
```

Then update all references in test scripts (tests 06, 07, 08, 10):
- `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/Scripts/06-call-A-to-B-pickup-C-to-B/start.php` lines 30-33
- `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/Scripts/07-originate-A-to-B/start.php` line 28
- `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/Scripts/08-originate-A-to-74952293042/start.php` line 28
- `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/Scripts/10-A-to-conf-B-to-conf/start.php` lines 34-36

#### 4. Deduplicate orgn-wait Dialplan

Create a shared include file at `tests/Calls/asterisk/orgn-wait-base.conf` containing the common `[orgn-wait]` context. Each test's `extensions.conf` would then use `#include orgn-wait-base.conf` (Asterisk supports `#include` in dialplan files -- the include path is relative to `astetcdir`).

However, there are test-specific variations:
- Tests 01, 02, 03, 04, 09, 11: Standard pattern (A_NUM, B_NUM, C_NUM, timeout=20)
- Test 05: Timeout before Answer
- Test 06: Extra SRC_NUM global, timeout=10
- Test 09: Extra OFF_NUM global, timeout=21
- Test 10: Only A_NUM and B_NUM, timeout=10

The base context should set all globals (A_NUM, B_NUM, C_NUM, OFF_NUM) since unused ones cause no harm. The timeout variations can be addressed by having the base use a reasonable default (like 20) and letting tests override via channel variables if needed, or by keeping a parameterized approach.

A simpler alternative: create a single shared `orgn-wait-common.conf` that includes the full `[orgn-wait]` and `[out-to-exten]` contexts with all variables set and a generous timeout. Tests that need customization would NOT include this file and define their own. This reduces 9 copies to ~6 copies using the shared file plus 3 custom ones.

The `[out-to-exten]` context also varies significantly across tests (different Dial flags: `Tt` vs `TtU(z-dial-answer)`, timeouts, extra extensions for pickup test 06), so it may not be worth deduplicating.

#### 5. Deduplicate start.php Fixture Boilerplate

The common code across all `start.php` files:
```php
use \MikoPBX\Tests\Calls\Scripts\TestCallsBase;
require_once __DIR__.'/../TestCallsBase.php';
// ... define $sampleCDR ...
$testName = basename(__DIR__);
$test = new TestCallsBase();
$test->runTest($testName, $sampleCDR [, $rules [, $countFiles]]);
```

This could be simplified by adding a static factory method to `TestCallsBase`:
```php
public static function executeTest(array $sampleCDR, ?array $rules = null, int $countFiles = 0): void
{
    $testName = basename(dirname(debug_backtrace()[0]['file']));
    $test = new self();
    $result = $test->runTest($testName, $sampleCDR, $rules, $countFiles);
    exit($result ? 0 : 1);
}
```

Then each `start.php` would be reduced to just the CDR definition + one call.

#### 6. Replace Fixed sleep() with Polling

Key sleep locations that could be replaced with polling:

- `cpConfig()` line 414: `sleep(5)` after dialplan reload -- could poll `asterisk -rx 'dialplan show orgn-wait'` to verify the context loaded
- `checkCdr()` line 326: `sleep(15)` before CDR check -- could poll `CDRDatabaseProvider::getCdr()` with a timeout loop until expected count is reached
- `invokeRules()` line 252: `sleep(5)` before channel polling -- could be removed since the channel poll loop follows immediately
- `start.sh` line 44: `sleep 5` after updateDb -- could poll `asterisk -rx 'core waitfullybooted'` (which is already done on line 46)
- `originateWait()` line 162: `sleep(5)` after channels clear -- this is a post-call settling time; could be reduced or made configurable

The `sleep(15)` in `checkCdr()` is the most impactful -- it adds 15 seconds per test (11 tests = ~2.5 minutes of pure waiting). A polling approach with 1-second intervals and a 30-second timeout would be faster for passing tests and safer for slow tests.

#### 7. Empty Config Files Documentation

Files that are truly empty stubs required by Asterisk module loading:
- `acl.conf`, `codecs.conf`, `confbridge.conf`, `queues.conf`, `queuerules.conf`, `sorcery.conf`, `udptl.conf`, `pjsip_notify.conf`

These should have a comment at the top explaining why they exist:
```
; Required empty stub -- loaded by modules.conf but not configured for tests
```

### Technical Reference Details

#### File Locations

- Test runner: `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/start.sh`
- Base test class: `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/Scripts/TestCallsBase.php`
- DB update script: `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/db/updateDb.php`
- Test database: `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/db/mikopbx.db`
- Asterisk config template: `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/asterisk/asterisk-pattern.conf`
- PJSIP init script: `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/Scripts/00-make-config-pjsip/start.php`
- PJSIP templates: `/Volumes/DevDisk/apor/Developement/MikoPBX/mikopbx/Core/tests/Calls/Scripts/00-make-config-pjsip/configs/pjsip-pattern.conf` and `pjsip-pattern-endpoint.conf`

#### Test Script Directories (all under `tests/Calls/Scripts/`)

```
00-make-config-pjsip/     -- Init: PJSIP config generation + endpoint registration
01-call-A-to-B/           -- Simple call
02-call-A-to-B-attended-B-to-C/  -- Attended transfer by B
03-call-A-to-B-attended-A-to-C/  -- Attended transfer by A
04-call-A-to-B-blind-B-to-C/     -- Blind transfer by B
05-call-A-to-B-blind-A-to-C/     -- Blind transfer by A
06-call-A-to-B-pickup-C-to-B/    -- Call pickup by C
07-originate-A-to-B/              -- Production PBX originate
08-originate-A-to-74952293042/    -- Production PBX external originate
09-call-A-to-B-attended-B-to-offNum/ -- Transfer to offline peer
10-A-to-conf-B-to-conf/          -- Conference room
11-call-A-to-B-attended-B-cancel/ -- Attended transfer with cancel
```

#### Component Interfaces & Signatures

```php
// TestCallsBase constructor
public function __construct()
// Requires: 3+ registered PJSIP peers with matching USER_AGENT, AMI access on port 5039

// Main entry point
public function runTest(string $testName, array $sampleCDR, ?array $rules = null, int $countFiles = 0): void

// CDR sample format (each element is an associative array)
$sampleCDR[] = [
    'src_num'      => 'aNum',    // string: property name or literal number
    'dst_num'      => 'bNum',    // string: property name or literal number
    'duration'     => '7',       // string: total call duration (seconds, +/-1 tolerance)
    'billsec'      => '5',       // string: billed seconds (seconds, +/-1 tolerance)
    'fileDuration' => '5',       // string: recording file duration (seconds, +/-1 tolerance)
];

// Rules format
$rules = [
    [TestCallsBase::ACTION_ORIGINATE, 'aNum', 'bNum'],         // Originate on test Asterisk
    [TestCallsBase::ACTION_GENERAL_ORIGINATE, 'aNum', 'bNum'], // Originate on production PBX
    [TestCallsBase::ACTION_WAIT, 5],                            // Sleep N seconds
];

// Static helpers
public static function getIdlePeers(): array    // Returns ['201', '202', '203', ...]
public static function getOffPeers(): array     // Returns ['204', '205', ...]
public static function printError($text): void  // Prints to stderr in red
public static function printInfo($text): void   // Prints to stdout in green
public static function printHeader($text): void // Prints to stdout in magenta
```

#### CDR Database Fields (from CallDetailRecordsBase)

All fields are nullable strings:
```
id, start, endtime, answer, src_chan, src_num, dst_chan, dst_num,
UNIQUEID, linkedid, did, disposition, recordingfile, from_account,
to_account, dialstatus, appname, transfer, is_app, duration, billsec,
work_completed, src_call_id, dst_call_id, verbose_call_id, a_transfer
```

#### Environment Variables

- `USER_AGENT` -- set by start.sh to `mikopbx-test-<timestamp>`, used to identify test endpoints
- `dirName` -- set by start.sh, the absolute path to the tests/Calls directory
- `astConf` -- set by start.sh, path to the test Asterisk's asterisk.conf
- `XDEBUG_CONFIG` -- preserved/restored around test execution

#### Network Ports

- Production Asterisk SIP: 5060
- Test Asterisk SIP: 5062
- Production Asterisk AMI: 5038
- Test Asterisk AMI: 5039
- Test Asterisk RTP: 20000-20800

#### Asterisk Feature Map (test instance)

```
atxfer (attended transfer): ##
blindxfer (blind transfer): **
pickupexten: *8
disconnect: *0
parkcall: *2
featuredigittimeout: 2500ms
```

#### orgn-wait Context Variations Across Tests

| Test | Sets OFF_NUM | Sets SRC_NUM | Timeout | Answer Position | NoOp Text |
|------|-------------|-------------|---------|-----------------|-----------|
| 01 | No | No | 20 | After NoOp | "staart test" |
| 02 | No | No | 20 | After NoOp | "start test" |
| 03 | No | No | 20 | After NoOp | "staart test" |
| 04 | No | No | 20 | After NoOp | "staart test" |
| 05 | No | No | 20 | After Set(TIMEOUT) | (none) |
| 06 | No | Yes | 10 | After Set(TIMEOUT) | (none) |
| 09 | Yes | No | 21 | After NoOp | "staart test" |
| 10 | No | No | 10 | After Set(TIMEOUT) | (none) |
| 11 | No | No | 20 | After NoOp | "start test" |

#### out-to-exten Context Variations

| Test | Dial Flags | Extra Extensions | Has Subroutine |
|------|-----------|-----------------|----------------|
| 01 | Tt | No | No |
| 02 | Tt | No | No |
| 03 | TtU(z-dial-answer) | No | Yes |
| 04 | Tt | No | No |
| 05 | TtU(z-dial-answer) | No | Yes |
| 06 | TtU(z-dial-answer) | exten 8 and _.! for *8 pickup | Yes |
| 09 | Tt | No | No |
| 10 | varies (first call vs subsequent) | Yes (FiRST_CALL logic) | Yes |
| 11 | TtU(z-dial-answer) | No | Yes |

## User Notes
<!-- Any specific notes or requirements from the developer -->

## Work Log
<!-- Updated as work progresses -->
- [2026-02-11] Задача создана на основе анализа tests/Calls
