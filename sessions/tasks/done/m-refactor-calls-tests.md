---
name: m-refactor-calls-tests
branch: feature/refactor-calls-tests
status: completed
created: 2026-02-11
---

# Рефакторинг интеграционных тестов звонков (tests/Calls)

## Problem/Goal
Фреймворк tests/Calls — bash/PHP интеграционные тесты звонков через отдельный Asterisk (порт 5062).
Тесты работают, но имеют серьёзные проблемы с качеством кода: массивное дублирование,
отсутствие assertions (тесты могут молча падать), hardcoded значения, нет cleanup при падении,
опечатки в константах, race conditions на фиксированных sleep.

## Success Criteria
- [x] `start.sh` has `trap cleanup EXIT INT TERM` -- production DB protected on interrupt
- [x] Tests return exit code 1 on CDR validation failure (`checkCdr()` returns bool, `executeTest()` exits accordingly)
- [x] `ACtION_*` typo fixed to `ACTION_*` across all files
- [x] Common `orgn-wait` dialplan extracted to `orgn-wait-common.conf` with `#include`
- [x] Fixture boilerplate in `start.php` eliminated (`TestCallsBase::executeTest()`)
- [x] Fixed `sleep()` replaced with polling (CDR check 30s timeout, dialplan reload verification)
- [x] Empty Asterisk config stubs documented with `; Required empty stub` comment
- [x] `README.md` added with architecture, test list, and troubleshooting

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

**Fixed in refactoring**: `trap cleanup EXIT INT TERM` protects production DB; exit codes are captured and propagated; cleanup always runs `updateDb.php`.

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

**Constants** (typo fixed):
```php
public const ACTION_ORIGINATE = 'Originate';
public const ACTION_GENERAL_ORIGINATE = 'GeneralOriginate';
public const ACTION_WAIT = 'Wait';
```

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

#### Dialplan: The `orgn-wait` Context -- Now Shared via `#include`

The `[orgn-wait]` context was duplicated in 9 `extensions.conf` files. After refactoring, 6 tests use `#include orgn-wait-common.conf` and 3 tests (05, 06, 10) keep custom versions due to significant variations. The common context:
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
- `ffprobe` -- for measuring recording file duration in `checkCdr()` (replaced `soxi` which doesn't support `.webm`)
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

**Fixed**: `checkCdr()` now returns `bool`, `runTest()` returns `bool`, and `executeTest()` calls `exit($result ? 0 : 1)`.

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

### Implementation Notes (completed)

All 8 refactoring items from the original plan have been implemented. Key implementation details:

- `orgn-wait-common.conf` sets all globals (A_NUM, B_NUM, C_NUM, OFF_NUM) with timeout=20. Tests 05, 06, 10 keep custom `[orgn-wait]` contexts due to significant variations.
- `executeTest()` uses `debug_backtrace()[0]['file']` to auto-detect test directory name.
- CDR polling uses 1s intervals with 30s timeout instead of fixed `sleep(15)`.
- `out-to-exten` context was NOT deduplicated due to high variation across tests (different Dial flags, subroutines, extra extensions).

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

// Main entry point (returns success/failure)
public function runTest(string $testName, array $sampleCDR, ?array $rules = null, int $countFiles = 0): bool

// Static factory (auto-detects test name, exits with appropriate code)
public static function executeTest(array $sampleCDR, ?array $rules = null, int $countFiles = 0): void

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

Tests 01-04, 09, 11 use `#include orgn-wait-common.conf`. Tests 05, 06, 10 have custom `[orgn-wait]`:

| Test | Custom orgn-wait | Reason |
|------|-----------------|--------|
| 05 | Yes | Timeout before Answer |
| 06 | Yes | Extra SRC_NUM global, timeout=10 |
| 10 | Yes | Only A_NUM/B_NUM, timeout=10 |

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

### 2026-02-11

#### Completed

**Initial refactoring commit** (a1d4c7864):
- Added `trap cleanup EXIT INT TERM` in `start.sh` to protect production DB on interrupt
- Made `checkCdr()` return `bool` and `start.sh` capture exit codes from each test (propagates failure)
- Fixed `ACtION_*` constant typo to `ACTION_*` in `TestCallsBase.php` and all 4 referencing test scripts (06, 07, 08, 10)
- Extracted common `[orgn-wait]` dialplan to `tests/Calls/asterisk/orgn-wait-common.conf`, replaced 6 inline copies with `#include`
- Added `TestCallsBase::executeTest()` static factory method, simplified all 11 `start.php` scripts to CDR definition + single call
- Replaced `sleep(15)` in `checkCdr()` with polling loop (1s intervals, 30s timeout) for CDR readiness
- Replaced `sleep(5)` in `cpConfig()` with `dialplan show orgn-wait` polling to verify reload
- Removed redundant `sleep(5)` in `invokeRules()` before channel polling
- Fixed `staart` typo in dialplan `NoOp()` comments
- Documented 8 empty Asterisk config stubs (`acl.conf`, `codecs.conf`, `confbridge.conf`, `queues.conf`, `queuerules.conf`, `sorcery.conf`, `udptl.conf`, `pjsip_notify.conf`) with `; Required empty stub` comment
- Added `tests/Calls/README.md` with architecture description, test catalog, and troubleshooting guide
- 30 files changed, 308 insertions, 172 deletions

**Production DB recovery** on 192.168.64.8:
- Production `mikopbx.db` was corrupted (empty `m_Extensions.uniqid` column, missing SIP peers)
- Restored from Feb 10 SQL dump backup (`/storage/usbdisk1/mikopbx/backup/backup_db.sql`)
- Root cause: previous test run without proper cleanup left test DB as production DB

**Test DB schema fix** -- added 6 IPv6 columns to `tests/Calls/db/mikopbx.db`:
- Columns: `ipv6_mode`, `ipv6addr`, `ipv6_subnet`, `ipv6_gateway`, `primarydns6`, `secondarydns6`
- Production DB had newer schema with IPv6 support; test DB lacked these columns
- Simple `INSERT INTO` for `m_LanInterfaces` copy failed due to column count mismatch

**`start.sh` m_LanInterfaces copy fix** -- ATTACH DATABASE with dynamic column intersection:
- Old approach: `INSERT INTO m_LanInterfaces SELECT * FROM prod.m_LanInterfaces` (fails on schema mismatch)
- New approach: Uses `PRAGMA table_info` to compute column intersection dynamically, then does `INSERT INTO test(cols) SELECT cols FROM prod`
- Handles future schema drift automatically

**iptables/firewall blocking fix**:
- Test DB had `PBXFirewallEnabled=1` and `PBXFail2BanEnabled=1`; after `services restart-all`, iptables rules blocked SIP registration (port 5060) and SSH (port 22), making the machine unreachable
- Added `sqlite3` commands in `start.sh` to set `PBXFirewallEnabled=0` and `PBXFail2BanEnabled=0` in test DB before `updateDb.php`
- Added `iptables -F; iptables -X` after `updateDb.php` and in cleanup function

**`getPjSipPeers()` bug fix** in `src/Core/Asterisk/AsteriskManager.php`:
- Was using `$peer['Auths']` (returns `201-AUTH`) as peer key/ID instead of `$peer['ObjectName']` (returns `201`)
- `getIdlePeers()` in `TestCallsBase.php` filtered by `is_numeric()`, so `201-AUTH` was rejected as non-numeric
- Added `'In use'` to the `DeviceState` to `OK` state mapping (was missing, only had `Not in use`, `Busy`, `Ringing`)

**soxi replaced with ffprobe** in `TestCallsBase.php`:
- `soxi` does not support `.webm` format; `WorkerWav2Webm` converts recordings to `.webm`
- Replaced with `ffprobe -v error -show_entries format=duration -of csv=p=0`

**Recording file wait loop** added in `TestCallsBase.php`:
- `WorkerWav2Webm` converts `.wav` to `.webm` asynchronously after call completes
- Added polling loop (up to 30s) to wait for converted file before checking recording duration

**All 11 tests pass** on remote machine 192.168.64.8 after all fixes applied.

#### Decisions
- Used ATTACH DATABASE with dynamic column intersection for `m_LanInterfaces` copy instead of hardcoding column lists -- handles future schema changes automatically
- Disabled firewall/fail2ban in test DB rather than the production DB -- cleaner separation, test DB is the one loaded during testing
- Used `ffprobe` over `soxi` because `.webm` (WebM/Opus) is the recording format after `WorkerWav2Webm` conversion
- Fixed `getPjSipPeers()` in production `AsteriskManager.php` (not just test code) since it was a genuine bug affecting peer identification everywhere

#### Discovered
- Production DB on test machine was corrupted by a previous test run that lacked proper cleanup -- the trap/cleanup mechanism in the refactored `start.sh` prevents this
- The `m_LanInterfaces` table schema had diverged between test and production DBs due to IPv6 feature additions
- Test DB firewall settings caused SSH lockout on the remote machine during test runs -- required physical/console access to recover
- `getPjSipPeers()` `Auths` field returns `<number>-AUTH` format (e.g., `201-AUTH`), not the endpoint number (`201`) -- this was a latent bug affecting any code that expected numeric peer IDs from this method

#### Next Steps
- Commit the uncommitted runtime fixes (AsteriskManager.php, start.sh ATTACH/iptables, TestCallsBase.php soxi/ffprobe, mikopbx.db IPv6 columns)
- Consider adding IPv6 schema migration to the test DB update process so it stays in sync automatically
- Investigate whether `getPjSipPeers()` `Auths` bug affected other callers in production code
