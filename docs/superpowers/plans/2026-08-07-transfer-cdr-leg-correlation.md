# Transfer CDR Leg Correlation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent a failed parallel transfer leg from closing sibling CDRs, close all residual rows on `LINKEDID_END`, and immediately notify `WorkerCdr` to finalize that linked ID without an AMI query.

**Architecture:** Transfer hangups are correlated by inherited `transfer_UNIQUEID`; the old broad `linkedid + src_chan` fallback is removed. `WorkerCallEvents` debounces `LINKEDID_END` for two seconds, closes remaining open rows, then publishes an exact-linked-ID terminal notification. `WorkerCdr` has a dedicated callback for that notification and reuses its normal CDR calculation/publishing pipeline while bypassing `GetChannels()` only on this authoritative terminal path.

**Tech Stack:** PHP 8.3, PHPUnit, Phalcon models, Asterisk 22 CEL/Lua dialplan, Beanstalkd, MikoPBX Calls integration tests

## Global Constraints

- Do not add synchronous AMI calls to `WorkerCallEvents` or to the terminal `WorkerCdr` callback.
- Keep the existing five-second `WorkerCdr` polling path and its AMI active-channel guard as a fallback.
- Treat `LINKEDID_END` as authoritative only after the two-second attended-transfer debounce.
- All event handlers and notifications must be idempotent under duplicate delivery.
- Never mass-close rows using only `linkedid + src_chan`.
- Do not log complete CDR payloads, caller names, SIP credentials, or recording paths.
- Do not change queue forwarding policy, the Dial `i` option, or the independent `WorkerWav2Webm` scan interval.

---

## File Map

- Modify `src/Core/Asterisk/Configs/lua/extensions.lua`: add inherited `transfer_UNIQUEID` to the `transfer_dial_hangup` payload.
- Create `src/Core/Workers/Libs/WorkerCallEvents/TransferCdrLegMatcher.php`: pure exact/prefix correlation rule.
- Modify `src/Core/Workers/Libs/WorkerCallEvents/ActionTransferDialHangup.php`: close only correlated rows and retain the exact-destination rolling-upgrade fallback.
- Modify `src/Core/Asterisk/Configs/CelConf.php`: enable `LINKEDID_END` in production.
- Modify `tests/Calls/asterisk/cel.conf`: enable `LINKEDID_END` in the Calls fixture.
- Create `src/Core/Workers/Libs/WorkerCallEvents/ActionCelLinkedIdEnd.php`: idempotently close residual temporary CDR rows.
- Create `src/Core/Workers/Libs/WorkerCallEvents/LinkedIdFinalizationQueue.php`: pure two-second debounce state.
- Modify `src/Core/Workers/WorkerCallEvents.php`: receive, defer, execute, and publish terminal notifications.
- Modify `src/Core/Workers/WorkerCdr.php`: subscribe to terminal notifications and share row processing without AMI.
- Create unit tests under `tests/Unit/Core/Workers/Libs/WorkerCallEvents/` and `tests/Unit/Core/Workers/` for correlation, debounce, CEL configuration, finalization, and WorkerCdr routing.
- Create `tests/Calls/Scripts/12-call-A-to-B-attended-B-to-queue-ringall-retry/`: reproduce issue #1100 end-to-end.

### Task 1: Correlate transfer hangups by transfer ID

**Files:**
- Create: `src/Core/Workers/Libs/WorkerCallEvents/TransferCdrLegMatcher.php`
- Modify: `src/Core/Asterisk/Configs/lua/extensions.lua:1360-1415`
- Modify: `src/Core/Workers/Libs/WorkerCallEvents/ActionTransferDialHangup.php:105-190`
- Create: `tests/Unit/Core/Workers/Libs/WorkerCallEvents/TransferCdrLegMatcherTest.php`
- Create: `tests/Unit/Core/Asterisk/Configs/LuaTransferDialHangupTest.php`

**Interfaces:**
- Produces: `TransferCdrLegMatcher::matches(string $rowUniqueId, string $transferUniqueId): bool`.
- Produces: UserEvent field `transfer_UNIQUEID` for `transfer_dial_hangup`.
- Preserves: exact non-empty `dst_chan` matching for mixed-version events.

- [ ] **Step 1: Write failing pure matcher tests**

Test exact, duplicated-contact prefix, false shared-prefix, and empty-ID cases:

```php
public function testMatchesExactAndDuplicatedContactRowsOnly(): void
{
    $base = 'mikopbx-1786037251.23903_3mda12';
    self::assertTrue(TransferCdrLegMatcher::matches($base, $base));
    self::assertTrue(TransferCdrLegMatcher::matches($base . '_PJSIP/637-00003030', $base));
    self::assertFalse(TransferCdrLegMatcher::matches($base . 'x', $base));
    self::assertFalse(TransferCdrLegMatcher::matches('unrelated', $base));
    self::assertFalse(TransferCdrLegMatcher::matches($base, ''));
}
```

- [ ] **Step 2: Run the matcher test and verify failure**

Run: `php vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/Core/Workers/Libs/WorkerCallEvents/TransferCdrLegMatcherTest.php`

Expected: FAIL because `TransferCdrLegMatcher` does not exist.

- [ ] **Step 3: Implement the matcher**

```php
final class TransferCdrLegMatcher
{
    public static function matches(string $rowUniqueId, string $transferUniqueId): bool
    {
        if ($transferUniqueId === '') {
            return false;
        }
        return $rowUniqueId === $transferUniqueId
            || str_starts_with($rowUniqueId, $transferUniqueId . '_');
    }
}
```

- [ ] **Step 4: Write a failing Lua source contract test**

Read `extensions.lua`, isolate `function event_transfer_dial_hangup()` through its matching `end`, and assert it contains:

```lua
data['transfer_UNIQUEID'] = get_variable("transfer_UNIQUEID");
```

Also assert the field is documented in the function comment. This source-level test is intentional: Lua executes inside Asterisk and the unit suite has no Lua channel-variable runtime.

- [ ] **Step 5: Add the transfer ID to the hangup payload**

Immediately after `linkedid`/`did` collection add:

```lua
data['transfer_UNIQUEID'] = get_variable("transfer_UNIQUEID");
```

Update the LuaDoc field list with `transfer_UNIQUEID`.

- [ ] **Step 6: Rewrite `fillNotAnsweredCdr()` selection**

Select open unanswered transfer rows by `linkedid`, `src_chan`, `answer`, and `transfer`, then filter them in PHP:

```php
$transferUniqueId = trim((string)($data['transfer_UNIQUEID'] ?? ''));
$destinationChannel = trim((string)($data['dst_chan'] ?? ''));

if ($transferUniqueId === '' && $destinationChannel === '') {
    SystemMessages::sysLogMsg(
        __CLASS__,
        sprintf(
            'Ignoring uncorrelated transfer_dial_hangup linkedid=%s channel=%s transferer=%s end=%s',
            $data['linkedid'] ?? '',
            $data['agi_channel'] ?? '',
            $data['TRANSFERERNAME'] ?? '',
            $data['end'] ?? ''
        ),
        LOG_WARNING
    );
    return;
}

foreach ($rows as $row) {
    $matches = $transferUniqueId !== ''
        ? TransferCdrLegMatcher::matches((string)$row->UNIQUEID, $transferUniqueId)
        : (string)$row->dst_chan === $destinationChannel;
    if (!$matches) {
        continue;
    }
    // Existing endtime/transfer mutation and save.
}
```

Keep the recording-resume block, but run it only after correlated rows have been closed. Log at debug level when the correlated count is `0` or greater than `1`.

- [ ] **Step 7: Run focused tests and static syntax checks**

Run:

```bash
php vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/Core/Workers/Libs/WorkerCallEvents/TransferCdrLegMatcherTest.php tests/Unit/Core/Asterisk/Configs/LuaTransferDialHangupTest.php
php -l src/Core/Workers/Libs/WorkerCallEvents/TransferCdrLegMatcher.php
php -l src/Core/Workers/Libs/WorkerCallEvents/ActionTransferDialHangup.php
```

Expected: all tests PASS and both files report no syntax errors.

- [ ] **Step 8: Commit the per-leg fix**

```bash
git add src/Core/Asterisk/Configs/lua/extensions.lua src/Core/Workers/Libs/WorkerCallEvents/ActionTransferDialHangup.php src/Core/Workers/Libs/WorkerCallEvents/TransferCdrLegMatcher.php tests/Unit/Core/Asterisk/Configs/LuaTransferDialHangupTest.php tests/Unit/Core/Workers/Libs/WorkerCallEvents/TransferCdrLegMatcherTest.php
git commit -m "fix: correlate transfer hangups by transfer id"
```

### Task 2: Enable and apply terminal linked-ID finalization

**Files:**
- Modify: `src/Core/Asterisk/Configs/CelConf.php:35-55`
- Modify: `tests/Calls/asterisk/cel.conf`
- Create: `src/Core/Workers/Libs/WorkerCallEvents/ActionCelLinkedIdEnd.php`
- Create: `tests/Unit/Core/Asterisk/Configs/CelConfTest.php`
- Create: `tests/Unit/Core/Workers/Libs/WorkerCallEvents/ActionCelLinkedIdEndTest.php`

**Interfaces:**
- Produces: `ActionCelLinkedIdEnd::execute(string $linkedId, string $eventTime): int` returning the number of rows changed.
- Mutates only rows satisfying `linkedid=:linkedid: AND endtime=""`.

- [ ] **Step 1: Make CEL content directly testable and write a failing test**

Extract `CelConf::buildConfig(): string` as a protected method; keep `generateConfigProtected()` responsible only for `saveConfig($this->buildConfig(), $this->description)`. Test via a small anonymous subclass exposing `buildConfig()` and assert the exact event line:

```php
self::assertStringContainsString(
    "events=USER_DEFINED,ANSWER,ATTENDEDTRANSFER,LINKEDID_END\n",
    $config->exposeBuildConfig()
);
```

- [ ] **Step 2: Run the CEL configuration test and verify failure**

Run: `php vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/Core/Asterisk/Configs/CelConfTest.php`

Expected: FAIL because `buildConfig()` and `LINKEDID_END` are absent.

- [ ] **Step 3: Enable `LINKEDID_END`**

Use these exact event lines:

```ini
# src/Core/Asterisk/Configs/CelConf.php
events=USER_DEFINED,ANSWER,ATTENDEDTRANSFER,LINKEDID_END

# tests/Calls/asterisk/cel.conf
events=BRIDGE_ENTER,BRIDGE_EXIT,LINKEDID_END
```

- [ ] **Step 4: Write failing database-backed finalizer tests**

Using the Unit suite DI and temporary CDR database, insert:

- two open rows with `linkedid=call-a`;
- one already closed row with `linkedid=call-a`;
- one open row with `linkedid=call-b`.

Assert `execute('call-a', '2026-08-06 14:46:40')` returns `2`, assigns the event time and `transfer=0` only to the two open `call-a` rows, and a duplicate call returns `0` without changing any row.

- [ ] **Step 5: Implement `ActionCelLinkedIdEnd`**

```php
final class ActionCelLinkedIdEnd
{
    public static function execute(string $linkedId, string $eventTime): int
    {
        if ($linkedId === '' || $eventTime === '') {
            return 0;
        }
        $rows = CallDetailRecordsTmp::find([
            'linkedid=:linkedid: AND endtime=""',
            'bind' => ['linkedid' => $linkedId],
        ]);
        $updated = 0;
        foreach ($rows as $row) {
            $row->writeAttribute('endtime', $eventTime);
            $row->writeAttribute('transfer', 0);
            if ($row->save()) {
                ++$updated;
            } else {
                SystemMessages::sysLogMsg(__CLASS__, implode(' ', $row->getMessages()), LOG_WARNING);
            }
        }
        return $updated;
    }
}
```

Do not modify `answer`, `recordingfile`, `dialstatus`, or closed rows.

- [ ] **Step 6: Run focused tests**

Run:

```bash
php vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/Core/Asterisk/Configs/CelConfTest.php tests/Unit/Core/Workers/Libs/WorkerCallEvents/ActionCelLinkedIdEndTest.php
php -l src/Core/Asterisk/Configs/CelConf.php
php -l src/Core/Workers/Libs/WorkerCallEvents/ActionCelLinkedIdEnd.php
```

Expected: PASS and no syntax errors.

- [ ] **Step 7: Commit terminal finalization primitives**

```bash
git add src/Core/Asterisk/Configs/CelConf.php tests/Calls/asterisk/cel.conf src/Core/Workers/Libs/WorkerCallEvents/ActionCelLinkedIdEnd.php tests/Unit/Core/Asterisk/Configs/CelConfTest.php tests/Unit/Core/Workers/Libs/WorkerCallEvents/ActionCelLinkedIdEndTest.php
git commit -m "feat: finalize temporary cdr on linkedid end"
```

### Task 3: Debounce `LINKEDID_END` and notify WorkerCdr

**Files:**
- Create: `src/Core/Workers/Libs/WorkerCallEvents/LinkedIdFinalizationQueue.php`
- Modify: `src/Core/Workers/WorkerCallEvents.php:390-610`
- Create: `tests/Unit/Core/Workers/Libs/WorkerCallEvents/LinkedIdFinalizationQueueTest.php`
- Create: `tests/Unit/Core/Workers/WorkerCallEventsLinkedIdEndTest.php`

**Interfaces:**
- Produces: `LinkedIdFinalizationQueue::schedule(string $linkedId, string $eventTime, float $now): void`.
- Produces: `LinkedIdFinalizationQueue::takeDue(float $now): array<string,string>` mapping linked ID to event time.
- Calls: `ActionCelLinkedIdEnd::execute(string $linkedId, string $eventTime): int`.
- Publishes: `{"linkedid":"...","eventTime":"..."}` to `WorkerCdr::FINALIZE_CDR_TUBE` after the database sweep.

- [ ] **Step 1: Write failing debounce tests**

Cover all timing semantics:

```php
$queue = new LinkedIdFinalizationQueue(2.0);
$queue->schedule('call-a', '2026-08-06 14:46:40', 100.0);
self::assertSame([], $queue->takeDue(101.999));
self::assertSame(['call-a' => '2026-08-06 14:46:40'], $queue->takeDue(102.0));
self::assertSame([], $queue->takeDue(103.0));
```

Add a duplicate test showing that a second schedule updates the event time and resets the due time.

- [ ] **Step 2: Run the debounce test and verify failure**

Run: `php vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/Core/Workers/Libs/WorkerCallEvents/LinkedIdFinalizationQueueTest.php`

Expected: FAIL because the queue class does not exist.

- [ ] **Step 3: Implement the pure debounce queue**

Store:

```php
/** @var array<string, array{end: string, dueAt: float}> */
private array $pending = [];
```

`schedule()` replaces the entry with `['end' => $eventTime, 'dueAt' => $now + $delaySeconds]`. `takeDue()` removes and returns every entry whose `dueAt <= $now`.

- [ ] **Step 4: Write failing WorkerCallEvents routing tests**

Introduce overridable protected seams in the worker test subclass:

```php
protected function finalizeLinkedId(string $linkedId, string $eventTime): int;
protected function publishLinkedIdFinalized(string $linkedId, string $eventTime): void;
protected function monotonicNow(): float;
```

Assert:

- `LINKEDID_END` with both fields schedules but does not immediately finalize;
- missing `LinkedID` or `EventTime` schedules nothing;
- a due event invokes finalization once and then publishes once;
- processing due entries is invoked after `callEventsWorker()` and by `pingCallBack()`;
- duplicate events produce a single finalization/notification using the later `EventTime`.

- [ ] **Step 5: Wire the scheduler into `WorkerCallEvents`**

Add:

```php
private const float LINKED_ID_FINALIZATION_DELAY_SECONDS = 2.0;
private BeanstalkClient $clientQueue;
private LinkedIdFinalizationQueue $linkedIdFinalizations;
```

Initialize the queue before subscriptions and assign the existing Beanstalk client to `$this->clientQueue` rather than opening another connection. In `callEventsWorker()` handle system CEL before the `USER_DEFINED` return:

```php
if ($event === 'LINKEDID_END') {
    $linkedId = trim((string)($data['LinkedID'] ?? ''));
    $eventTime = trim((string)($data['EventTime'] ?? ''));
    if ($linkedId === '' || $eventTime === '') {
        SystemMessages::sysLogMsg(__CLASS__, 'Ignoring invalid LINKEDID_END', LOG_WARNING);
    } else {
        $this->linkedIdFinalizations->schedule($linkedId, $eventTime, $this->monotonicNow());
    }
}
$this->processPendingLinkedIdFinalizations();
```

Ensure every early return still passes through due processing; use `try/finally` around dispatch if necessary. Call the same processor from `pingCallBack()` after `parent::pingCallBack()`.

- [ ] **Step 6: Finalize then publish the notification**

For each due item:

```php
$updated = $this->finalizeLinkedId($linkedId, $eventTime);
$this->publishLinkedIdFinalized($linkedId, $eventTime);
SystemMessages::sysLogMsg(
    __CLASS__,
    sprintf('LINKEDID_END finalized linkedid=%s rows=%d end=%s', $linkedId, $updated, $eventTime),
    LOG_DEBUG
);
```

Publishing even when `$updated === 0` is required: per-leg handlers may already have closed rows, but those completed rows still need immediate WorkerCdr migration.

- [ ] **Step 7: Run focused tests**

Run:

```bash
php vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/Core/Workers/Libs/WorkerCallEvents/LinkedIdFinalizationQueueTest.php tests/Unit/Core/Workers/WorkerCallEventsLinkedIdEndTest.php
php -l src/Core/Workers/Libs/WorkerCallEvents/LinkedIdFinalizationQueue.php
php -l src/Core/Workers/WorkerCallEvents.php
```

Expected: PASS and no syntax errors.

- [ ] **Step 8: Commit CEL scheduling and publication**

```bash
git add src/Core/Workers/WorkerCallEvents.php src/Core/Workers/Libs/WorkerCallEvents/LinkedIdFinalizationQueue.php tests/Unit/Core/Workers/Libs/WorkerCallEvents/LinkedIdFinalizationQueueTest.php tests/Unit/Core/Workers/WorkerCallEventsLinkedIdEndTest.php
git commit -m "feat: notify cdr worker on linkedid end"
```

### Task 4: Add WorkerCdr terminal fast path without AMI

**Files:**
- Modify: `src/Core/Workers/WorkerCdr.php:40-220`
- Create: `tests/Unit/Core/Workers/WorkerCdrTerminalFinalizationTest.php`

**Interfaces:**
- Produces: `WorkerCdr::FINALIZE_CDR_TUBE = 'finalize_cdr_tube'`.
- Produces: public Beanstalk callback `finalizeLinkedIdWorker(BeanstalkClient $tube): void`.
- Consumes: notification JSON containing non-empty `linkedid` and `eventTime`.
- Preserves: polling `updateCdr(array $rows)` with `getActiveIdChannels()` filtering.

- [ ] **Step 1: Write failing WorkerCdr routing tests**

Refactor behind protected seams so a test subclass can record calls without AMI, filesystem, email, or Beanstalk side effects:

```php
protected function loadCompletedRowsForLinkedId(string $linkedId): array;
protected function processCompletedRows(array $rows): void;
protected function getActiveIdChannels(): array;
```

Test the callback with a fake tube body:

```json
{"linkedid":"call-a","eventTime":"2026-08-06 14:46:40"}
```

Assert it loads exactly `call-a`, rejects any returned row whose `linkedid !== call-a`, processes only valid rows, never invokes `getActiveIdChannels()`, and replies `true`. Invalid JSON/empty linked ID must reply `false` and do no work.

- [ ] **Step 2: Run the WorkerCdr test and verify failure**

Run: `php vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/Core/Workers/WorkerCdrTerminalFinalizationTest.php`

Expected: FAIL because the tube constant and callback do not exist.

- [ ] **Step 3: Subscribe WorkerCdr to terminal notifications**

Add:

```php
public const string FINALIZE_CDR_TUBE = 'finalize_cdr_tube';
```

After creating `$this->clientQueue`, subscribe:

```php
$this->clientQueue->subscribe(self::FINALIZE_CDR_TUBE, [$this, 'finalizeLinkedIdWorker']);
```

- [ ] **Step 4: Extract shared completed-row processing**

Keep `updateCdr()` as the polling entry point:

```php
private function updateCdr(array $rows): void
{
    $activeLinkedIds = $this->getActiveIdChannels();
    $completed = array_values(array_filter(
        $rows,
        static fn(array $row): bool => !isset($activeLinkedIds[$row['linkedid']])
    ));
    $this->processCompletedRows($completed);
}
```

Move the existing settings refresh, disposition/duration calculation, conversion-task creation, update publication, and missed-call notification into `processCompletedRows(array $rows): void`. Do not add a `skipActiveCheck` parameter.

- [ ] **Step 5: Implement exact-linked-ID loading and validation**

```php
protected function loadCompletedRowsForLinkedId(string $linkedId): array
{
    return CDRDatabaseProvider::getCdr([
        'work_completed<>1 AND endtime<>"" AND linkedid=:linkedid:',
        'bind' => ['linkedid' => $linkedId],
        'miko_tmp_db' => true,
        'limit' => 2000,
    ]);
}
```

The callback must retain only rows with `hash_equals($linkedId, (string)($row['linkedid'] ?? ''))`, log a warning if the provider returns a mismatched row, then call `processCompletedRows($validatedRows)`. `eventTime` is diagnostic only; row `endtime` remains the database authority.

- [ ] **Step 6: Make duplicate notifications safe**

The exact query includes `work_completed<>1 AND endtime<>""`. The existing `setStatusAndPublish()` sends each row to the single-writer update tube; subsequent notification delivery finds no eligible row after that update completes. Within one callback, deduplicate rows by `UNIQUEID` before processing so a repeated provider row cannot create two conversion tasks.

- [ ] **Step 7: Verify polling still uses AMI and terminal routing does not**

Add two assertions to the test subclass:

- invoking polling `updateCdr()` through a test wrapper increments the `getActiveIdChannels()` counter and skips active `call-a`;
- invoking `finalizeLinkedIdWorker()` leaves that counter at zero and processes only `call-a`.

- [ ] **Step 8: Run focused tests and syntax checks**

Run:

```bash
php vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/Core/Workers/WorkerCdrTerminalFinalizationTest.php
php -l src/Core/Workers/WorkerCdr.php
```

Expected: PASS and no syntax errors.

- [ ] **Step 9: Commit the WorkerCdr fast path**

```bash
git add src/Core/Workers/WorkerCdr.php tests/Unit/Core/Workers/WorkerCdrTerminalFinalizationTest.php
git commit -m "feat: finalize linked cdrs without ami polling"
```

### Task 5: Reproduce issue #1100 in Calls integration tests

**Files:**
- Create: `tests/Calls/Scripts/12-call-A-to-B-attended-B-to-queue-ringall-retry/start.php`
- Create: `tests/Calls/Scripts/12-call-A-to-B-attended-B-to-queue-ringall-retry/configs/extensions.conf`
- Modify only if required by the fixture: `tests/Calls/Libs/TestCallsBase.php`

**Interfaces:**
- Consumes: generated CEL `LINKEDID_END`, WorkerCallEvents terminal finalization, WorkerCdr terminal tube.
- Produces: an end-to-end regression scenario matching the failing ring-all retry sequence.

- [ ] **Step 1: Copy the attended-transfer fixture structure**

Use scenario 02 for A/B call establishment and DTMF attended transfer mechanics. The new fixture must allocate four idle SIP peers: caller A, transferer B, early-ending queue member C, and later-answering member D. If `TestCallsBase` only exposes three, add a fourth peer property and allocate it through the existing `getIdlePeers()` mechanism without altering prior scenarios.

- [ ] **Step 2: Configure the ring-all retry path**

Create a queue with `ringall`, a retry interval, C and D as members, and recording enabled. Configure C to return a SIP redirect that the queue Dial `i` option prevents. Make the first queue round end unanswered; on the next round C ends early again while D keeps ringing and then answers.

The fixture dialplan must emit the same `transfer_dial`, `transfer_dial_create_chan`, `transfer_dial_answer`, and `transfer_dial_hangup` events as production; do not simulate database rows directly.

- [ ] **Step 3: Add assertions at the race boundary**

After C's second-round hangup and before D answers, query temporary CDR through the existing Calls helpers and assert:

- C's row has a non-empty `endtime` and empty `answer`;
- D's row still has `endtime=""`;
- D's transfer row `UNIQUEID` begins with its own `transfer_UNIQUEID`.

- [ ] **Step 4: Add terminal assertions**

After D answers, remains bridged for at least two seconds, and hangs up, wait for CEL debounce plus worker processing. Assert:

- D's permanent CDR has `disposition=ANSWERED`, `billsec>0`, and non-empty `recordingfile`;
- no temporary row remains for the linked ID;
- every permanent row for the linked ID has non-empty `endtime`;
- a conversion-task JSON was created for D's recording exactly once.

- [ ] **Step 5: Run the new scenario**

Run:

```bash
bash tests/Calls/start.sh 12-call-A-to-B-attended-B-to-queue-ringall-retry
```

Expected: PASS; logs show one debounced `LINKEDID_END` finalization and one WorkerCdr terminal notification, with no `GetChannels` initiated by that callback.

- [ ] **Step 6: Run attended-transfer regression scenarios**

Run each scenario so a failure is attributed to one flow:

```bash
bash tests/Calls/start.sh 02-call-A-to-B-attended-B-to-C
bash tests/Calls/start.sh 03-call-A-to-B-attended-A-to-C
bash tests/Calls/start.sh 09-call-A-to-B-attended-B-to-offNum
bash tests/Calls/start.sh 11-call-A-to-B-attended-B-cancel
bash tests/Calls/start.sh 12-call-A-to-B-attended-B-to-queue-ringall-retry
```

Expected: all PASS with unchanged semantics for successful, unreachable, and cancelled attended transfers.

- [ ] **Step 7: Commit the integration regression**

```bash
git add tests/Calls/Scripts/12-call-A-to-B-attended-B-to-queue-ringall-retry tests/Calls/Libs/TestCallsBase.php
git commit -m "test: cover ringall attended transfer cdr race"
```

If `TestCallsBase.php` did not require modification, omit it from `git add`.

### Task 6: Full verification and operational checks

**Files:**
- Verify only; modify a prior task's files if a failure exposes a defect.

**Interfaces:**
- Verifies all acceptance criteria and mixed-version fallback behavior.

- [ ] **Step 1: Run all new unit tests together**

```bash
php vendor/bin/phpunit -c tests/Unit/phpunit.xml \
  tests/Unit/Core/Asterisk/Configs/CelConfTest.php \
  tests/Unit/Core/Asterisk/Configs/LuaTransferDialHangupTest.php \
  tests/Unit/Core/Workers/Libs/WorkerCallEvents/TransferCdrLegMatcherTest.php \
  tests/Unit/Core/Workers/Libs/WorkerCallEvents/ActionCelLinkedIdEndTest.php \
  tests/Unit/Core/Workers/Libs/WorkerCallEvents/LinkedIdFinalizationQueueTest.php \
  tests/Unit/Core/Workers/WorkerCallEventsLinkedIdEndTest.php \
  tests/Unit/Core/Workers/WorkerCdrTerminalFinalizationTest.php
```

Expected: all PASS.

- [ ] **Step 2: Run the complete Unit suite**

Run: `php vendor/bin/phpunit -c tests/Unit/phpunit.xml`

Expected: PASS with no new warnings or deprecations attributable to these changes.

- [ ] **Step 3: Validate changed PHP and Lua files**

Run:

```bash
php -l src/Core/Asterisk/Configs/CelConf.php
php -l src/Core/Workers/WorkerCallEvents.php
php -l src/Core/Workers/WorkerCdr.php
php -l src/Core/Workers/Libs/WorkerCallEvents/ActionTransferDialHangup.php
php -l src/Core/Workers/Libs/WorkerCallEvents/ActionCelLinkedIdEnd.php
php -l src/Core/Workers/Libs/WorkerCallEvents/LinkedIdFinalizationQueue.php
php -l src/Core/Workers/Libs/WorkerCallEvents/TransferCdrLegMatcher.php
luac -p src/Core/Asterisk/Configs/lua/extensions.lua
git diff --check
```

Expected: no syntax or whitespace errors.

- [ ] **Step 4: Inspect generated CEL configuration on a test PBX**

Regenerate Asterisk configuration, then run:

```bash
asterisk -rx "cel show status"
```

Expected: CEL is enabled and the tracked-event list includes `LINKEDID_END` alongside `USER_DEFINED`, `ANSWER`, and `ATTENDEDTRANSFER`.

- [ ] **Step 5: Verify runtime behavior from logs and databases**

For one completed scenario 12 linked ID, verify:

- the failed C leg closes before D answers without changing D's row;
- `LINKEDID_END` is received once or safely deduplicated;
- finalization occurs no earlier than two seconds after receipt;
- WorkerCdr receives `finalize_cdr_tube` immediately after the sweep;
- terminal WorkerCdr processing produces no AMI `GetChannels` request;
- temporary `cdr` has zero rows for the linked ID after processing;
- `cdr_general` contains D as `ANSWERED` with positive `billsec` and one conversion task.

- [ ] **Step 6: Review the final diff against the design**

Run:

```bash
git diff --stat HEAD~5
git diff --check
git status --short
```

Confirm unrelated pre-existing untracked files remain untouched. Confirm there is no broad transfer hangup fallback and no generic `skipActiveCheck` switch.

- [ ] **Step 7: Commit any verification-only corrections**

If verification required code changes, commit only those changed task files:

```bash
git status --short
git add src/Core/Asterisk/Configs/CelConf.php src/Core/Asterisk/Configs/lua/extensions.lua src/Core/Workers/WorkerCallEvents.php src/Core/Workers/WorkerCdr.php src/Core/Workers/Libs/WorkerCallEvents tests/Unit/Core/Asterisk/Configs tests/Unit/Core/Workers tests/Calls/asterisk/cel.conf tests/Calls/Scripts/12-call-A-to-B-attended-B-to-queue-ringall-retry
git commit -m "fix: address transfer cdr verification findings"
```

If no corrections were needed, do not create an empty commit.
