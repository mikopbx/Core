# AMI Session Lifecycle and Backlog Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent spawned processes from inheriting AMI sockets, make `AsteriskManager` recover reliably from dead streams, and safely detect and remove confirmed stalled localhost AMI sessions.

**Architecture:** Route every `Processes` execution through one BusyBox-compatible fd-closing shell boundary, centralize AMI stream state transitions inside `AsteriskManager`, and add a procfs-based inspector plus a stateful backlog watchdog. `WorkerSafeScriptsCore` invokes the watchdog every 15 seconds; automatic kick is disabled by default and is permitted only for sustained localhost backlog with evidence of an orphaned or multiply inherited client socket.

**Tech Stack:** PHP 8.4, Linux procfs, BusyBox 1.36 `sh`, Asterisk 22.8.2 CLI, Phalcon DI, PHPUnit 9.

**Spec:** `docs/superpowers/specs/2026-08-20-ami-session-lifecycle-design.md`

## Global Constraints

- Work directly on `develop`.
- Do not modify the production station.
- Deploy and run integration/load verification only on `serber@boffart.miko.ru`.
- Do not alter the existing memory-watchdog thresholds or actions.
- Do not create another resident PHP worker.
- Never automatically kick external AMI sessions.
- Default `AMIStalledSessionAutoKick` to `0`; boffart starts in observe-only mode.
- Preserve all unrelated tracked and untracked user files.
- Implement each behavior test-first and commit each independently testable task.

---

### Task 1: Descriptor-safe command execution

**Files:**
- Modify: `src/Core/System/Processes.php:579-641`
- Modify: `src/Core/System/Processes.php:1125-1248`
- Create: `tests/Unit/Core/System/ProcessesFdInheritanceTest.php`

**Interfaces:**
- Produces: `private static function wrapCommandWithClosedDescriptors(string $command): string`.
- Consumes: existing `mwExec()`, `mwExecBg()`, `mwExecBgWithTimeout()`, `processPHPWorker()`, and `processWorker()` call contracts without signature changes.

- [ ] **Step 1: Write the failing inheritance and compatibility tests**

  Add Linux-only tests that open a TCP socket in the PHPUnit parent, obtain its inode with `fstat()`, and run a child through `Processes::mwExec()`. The child enumerates `/proc/self/fd`; assert that it cannot see `socket:[<parent inode>]`.

  Add tests proving that plain output, a pipeline, a non-zero exit status, and stderr redirection retain current behavior. Add a background test that writes its fd list to a sandbox file through `mwExecBg()` and assert the parent socket inode is absent.

  Core assertion shape:

  ```php
  $server = stream_socket_server('tcp://127.0.0.1:0');
  $inode = (int)fstat($server)['ino'];
  Processes::mwExec($childCommand, $output, $exitCode);
  self::assertStringNotContainsString("socket:[$inode]", implode("\n", $output));
  ```

- [ ] **Step 2: Run the focused test and verify RED**

  Run:

  ```bash
  php /private/tmp/phpunit-9.phar -c tests/Unit/phpunit.xml tests/Unit/Core/System/ProcessesFdInheritanceTest.php --colors=never
  ```

  Expected: the child reports the parent's socket inode.

- [ ] **Step 3: Implement one fd-safe shell wrapper**

  Build a quoted `sh -c` launcher whose command body closes descriptors found at `/proc/self/fd/[3-9]` and `/proc/self/fd/[1-9][0-9]*`, then runs:

  ```sh
  exec /bin/sh -c "$1"
  ```

  Pass the original command as one `escapeshellarg()` positional argument. If `/proc/self/fd` is unavailable, execute the command unchanged. Apply the helper once at the lowest shared execution boundary so nested worker methods do not double-wrap commands.

- [ ] **Step 4: Run focused tests and syntax validation**

  Require the focused test and `php -l src/Core/System/Processes.php` to pass.

- [ ] **Step 5: Commit Task 1**

  ```bash
  git add src/Core/System/Processes.php tests/Unit/Core/System/ProcessesFdInheritanceTest.php
  git commit -m "fix(processes): close inherited descriptors before exec"
  ```

### Task 2: Reliable AsteriskManager connection state

**Files:**
- Modify: `src/Core/Asterisk/AsteriskManager.php:90-490`
- Modify: `src/Core/Asterisk/AsteriskManager.php:669-790`
- Modify: `src/Core/Workers/Cron/WorkerSafeScriptsCore.php:347-356`
- Create: `tests/Unit/Core/Asterisk/AsteriskManagerConnectionTest.php`

**Interfaces:**
- Produces: `public function isConnected(): bool`.
- Produces: `private function closeSocket(): void`.
- Preserves: `public function loggedIn(): bool`, now backed by actual stream health.
- Preserves: `public function disconnect(): void`, now terminal and non-reconnecting.

- [ ] **Step 1: Write failing connection-lifecycle tests**

  Use a local TCP fixture created with `stream_socket_server()` and `pcntl_fork()` to emulate the AMI banner, Login response, Ping response, EOF, and read timeout. Add assertions that:

  ```php
  self::assertTrue($manager->isConnected());
  $manager->disconnect();
  self::assertFalse($manager->loggedIn());
  self::assertNull($manager->socket);
  ```

  Verify EOF invalidates the stream, a timeout without EOF does not, reconnect retries at most once, and the second Login retains the original `Events` value.

- [ ] **Step 2: Run the focused test and verify RED**

  Run:

  ```bash
  php /private/tmp/phpunit-9.phar -c tests/Unit/phpunit.xml tests/Unit/Core/Asterisk/AsteriskManagerConnectionTest.php --colors=never
  ```

  Expected: missing `isConnected()`, stale `_loggedIn`, and non-null closed socket failures.

- [ ] **Step 3: Centralize close and health transitions**

  Implement `closeSocket()` so it closes a resource, assigns `null`, and clears `_loggedIn`. Call it on failed banner, failed Login, EOF, terminal read failure, exceptions, and incomplete writes. Add `__destruct()` that calls only `closeSocket()`.

  `isConnected()` must require a resource, `_loggedIn`, no EOF, and no terminal metadata state. `loggedIn()` delegates to it. Expected `timed_out=true` without EOF remains usable.

- [ ] **Step 4: Bound reconnect and complete writes**

  Make request retry explicit and limited to one reconnect. Preserve `listenEvents` for the retry. Loop `fwrite()` until the full request is sent; a `false` or zero-byte write invalidates the stream. Ensure `disconnect()` sends `Logoff` only while the current stream is healthy and never invokes reconnect.

- [ ] **Step 5: Migrate the supervisor health check**

  Change `getAmiForPing()` from direct `is_resource($this->amiPing->socket)` access to `$this->amiPing->isConnected()`.

- [ ] **Step 6: Run tests and commit Task 2**

  Run the focused test, `php -l` on both modified sources, then commit:

  ```bash
  git add src/Core/Asterisk/AsteriskManager.php src/Core/Workers/Cron/WorkerSafeScriptsCore.php tests/Unit/Core/Asterisk/AsteriskManagerConnectionTest.php
  git commit -m "fix(ami): reset and recover dead manager connections"
  ```

### Task 3: Procfs AMI session inspector

**Files:**
- Create: `src/Core/Asterisk/AmiSessionSnapshot.php`
- Create: `src/Core/Asterisk/AmiSessionInspector.php`
- Create: `tests/Unit/Core/Asterisk/AmiSessionInspectorTest.php`
- Create fixture files under: `tests/Unit/Core/Asterisk/Fixtures/AmiProcfs/`

**Interfaces:**
- Produces: immutable `AmiSessionSnapshot` with fd, server/client inode, endpoint, queue bytes, TCP state, owner PIDs, username, and session start.
- Produces: `AmiSessionInspector::__construct(string $procRoot = '/proc')`.
- Produces: `AmiSessionInspector::findAsteriskPid(): ?int`.
- Produces: `AmiSessionInspector::inspect(int $asteriskPid, int $amiPort, string $managerOutput): array`.
- Produces: `AmiSessionSnapshot::identity(): string` and `hasStrongStaleDescriptorEvidence(): bool`.

- [ ] **Step 1: Write procfs parsing fixtures and failing tests**

  Cover IPv4 and IPv6 loopback, established and `CLOSE_WAIT` states, hexadecimal `tx_queue`, fd-to-inode links, reverse client tuple lookup, multiple PIDs sharing one inode, absent client owners, and parsing the fixed-column output of `manager show connected`.

  Assert representative values:

  ```php
  self::assertSame(108673, $snapshot->sendQueueBytes);
  self::assertSame([759, 30319], $snapshot->ownerPids);
  self::assertTrue($snapshot->isLocalhost());
  self::assertTrue($snapshot->hasStrongStaleDescriptorEvidence());
  ```

- [ ] **Step 2: Run the inspector test and verify RED**

  Expected: inspector and snapshot classes do not exist.

- [ ] **Step 3: Implement deterministic parsers**

  Parse procfs directly with no `netstat`/`ss` dependency. Decode IPv4 little-endian addresses and Linux IPv6 hex representation. Scan client-owner PIDs only for server sockets with non-zero `tx_queue`. Sort and de-duplicate owner PID lists so identity and logs are stable.

- [ ] **Step 4: Implement session attribution and identity**

  Match `FileDes` from manager output to the Asterisk fd. Identity includes fd, server inode, remote endpoint, and session start so fd reuse produces a different key.

- [ ] **Step 5: Run tests and commit Task 3**

  ```bash
  git add src/Core/Asterisk/AmiSessionSnapshot.php src/Core/Asterisk/AmiSessionInspector.php tests/Unit/Core/Asterisk/AmiSessionInspectorTest.php tests/Unit/Core/Asterisk/Fixtures/AmiProcfs
  git commit -m "feat(ami): inspect manager socket backlog through procfs"
  ```

### Task 4: Stateful backlog decisions and safe kick

**Files:**
- Create: `src/Core/Asterisk/AmiSessionWatchdog.php`
- Create: `tests/Unit/Core/Asterisk/AmiSessionWatchdogTest.php`
- Modify: `src/Common/Models/PBXSettings/PbxSettingsConstantsTrait.php:132-138`
- Modify: `src/Common/Models/PBXSettings/PbxSettingsDefaultValuesTrait.php:50-55`

**Interfaces:**
- Produces: `AmiSessionWatchdog::check(bool $autoKickEnabled): void`.
- Consumes: `AmiSessionInspector`, an injectable clock, manager-output provider, kick runner, and logger.
- Produces setting: `PbxSettings::AMI_STALLED_SESSION_AUTO_KICK = 'AMIStalledSessionAutoKick'`, default `'0'`.

- [ ] **Step 1: Write failing state-machine tests**

  Feed snapshots at controlled 15-second timestamps and prove:

  - two 64 KiB samples produce one rate-limited warning;
  - a recovered queue clears history;
  - a 32 KiB decrease restarts the 120-second window;
  - nine sustained 96 KiB samples with one owner remain observe-only;
  - nine sustained samples with multiple owners become a kick candidate;
  - external addresses never become kick candidates;
  - observe-only setting suppresses the kick runner;
  - revalidation identity mismatch cancels the action;
  - only one kick occurs per pass, no more than three per ten minutes, with a five-minute username/endpoint cooldown.

- [ ] **Step 2: Run the watchdog test and verify RED**

  Expected: class and setting are missing.

- [ ] **Step 3: Implement thresholds and hysteresis**

  Add exact constants:

  ```php
  private const CHECK_INTERVAL_SEC = 15;
  private const WARNING_BYTES = 65_536;
  private const CANDIDATE_BYTES = 98_304;
  private const RESET_BYTES = 32_768;
  private const PROGRESS_BYTES = 32_768;
  private const CANDIDATE_SAMPLES = 9;
  private const USER_COOLDOWN_SEC = 300;
  private const GLOBAL_LIMIT_WINDOW_SEC = 600;
  private const GLOBAL_LIMIT_COUNT = 3;
  ```

  Keep all single-owner and external sessions diagnostics-only.

- [ ] **Step 4: Implement revalidation, kick, and structured logging**

  Immediately re-inspect before running the integer-only CLI command:

  ```text
  asterisk -rx 'manager kick session <fd>'
  ```

  Require exact identity equality. Log warning/action/result without AMI credentials or event payloads.

- [ ] **Step 5: Add the hidden default-off setting**

  Add the constant and default value only; do not add an administrative UI or migration.

- [ ] **Step 6: Run tests and commit Task 4**

  ```bash
  git add src/Core/Asterisk/AmiSessionWatchdog.php tests/Unit/Core/Asterisk/AmiSessionWatchdogTest.php src/Common/Models/PBXSettings/PbxSettingsConstantsTrait.php src/Common/Models/PBXSettings/PbxSettingsDefaultValuesTrait.php
  git commit -m "feat(ami): guard against stalled local manager sessions"
  ```

### Task 5: Supervisor integration

**Files:**
- Modify: `src/Core/Workers/Cron/WorkerSafeScriptsCore.php:200-360`
- Modify: `src/Core/Workers/Cron/WorkerSafeScriptsCore.php:645-775`
- Create: `tests/Unit/Core/Workers/WorkerSafeScriptsAmiWatchdogTest.php`

**Interfaces:**
- Produces: `private function maybeCheckAmiSessions(): void`.
- Consumes: one lazily created `AmiSessionWatchdog` instance and `PbxSettings::AMI_STALLED_SESSION_AUTO_KICK`.

- [ ] **Step 1: Write the failing cadence and failure-isolation tests**

  Verify repeated calls inside 15 seconds invoke the watchdog once, the setting value is converted strictly from `'1'`, and inspector exceptions are logged without escaping the supervisor cycle.

- [ ] **Step 2: Run the focused test and verify RED**

  Expected: integration method and state do not exist.

- [ ] **Step 3: Integrate without changing memory policy**

  Invoke `maybeCheckAmiSessions()` after module-operation reaping and before worker preparation. Do not add it to the Fiber task list, do not modify memory state, and catch all `Throwable` at the integration boundary.

- [ ] **Step 4: Run focused and related supervisor tests**

  ```bash
  php /private/tmp/phpunit-9.phar -c tests/Unit/phpunit.xml tests/Unit/Core/Workers/WorkerSafeScriptsAmiWatchdogTest.php --colors=never
  php /private/tmp/phpunit-9.phar -c tests/Unit/phpunit.xml tests/Core/Workers/Cron/WorkerSafeScriptsCoreTest.php --colors=never
  ```

- [ ] **Step 5: Commit Task 5**

  ```bash
  git add src/Core/Workers/Cron/WorkerSafeScriptsCore.php tests/Unit/Core/Workers/WorkerSafeScriptsAmiWatchdogTest.php
  git commit -m "feat(workers): monitor stalled AMI sessions"
  ```

### Task 6: Verification and boffart load test

**Files:**
- Verify all files changed in Tasks 1-5.
- Do not modify production.

**Interfaces:**
- Consumes: completed fd-safe execution, AMI lifecycle, inspector, watchdog, and supervisor integration.
- Produces: verified commits on `develop` and an observe-only boffart deployment.

- [ ] **Step 1: Run syntax and focused unit tests**

  Run `php -l` for every changed PHP file, followed by all four new focused test classes and existing `ProcessesPidFileTest` and `WorkerSafeScriptsCoreTest`.

- [ ] **Step 2: Run broader regression checks**

  Execute all `tests/Unit/Core/Asterisk/*Test.php`, `tests/Unit/Core/System/Processes*Test.php`, and `tests/Unit/Core/Workers/*Test.php`. Run PHPCS on changed files if available.

- [ ] **Step 3: Inspect repository state and commit any verification-only correction**

  Require `git diff --check` to pass and confirm unrelated untracked files remain untouched.

- [ ] **Step 4: Push commits to `origin/develop`**

  Push only after local tests and diff review succeed.

- [ ] **Step 5: Deploy to boffart in observe-only mode**

  Use the existing development sync/hotpatch workflow, confirm
  `AMIStalledSessionAutoKick=0`, restart only the affected test workers, and verify new child processes no longer contain parent AMI socket inodes.

- [ ] **Step 6: Reproduce healthy and stalled AMI traffic**

  Generate a local SIP/RTP and AMI event stream. Record every 15 seconds:

  ```text
  Asterisk RSS, manager session count, server Send-Q, client Recv-Q,
  socket inode owners, watchdog decision, client reconnect status
  ```

  Healthy readers must return server `Send-Q` to zero and remain connected. A paused/inherited reader must reach observe-only candidate state without being kicked.

- [ ] **Step 7: Enable auto-kick on boffart only after observe validation**

  Set `AMIStalledSessionAutoKick=1` on boffart, reproduce the inherited local socket, and verify exactly one targeted session is kicked, logged, and reconnected. Confirm Asterisk RSS stabilizes after the queue is released.

- [ ] **Step 8: Final handoff**

  Report commits, pushed branch, focused/full test results, boffart before/after measurements, and confirm production remained unchanged.
