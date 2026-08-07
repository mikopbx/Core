# Transfer CDR Leg Correlation Design

## Context

Issue #1100 exposes a race in attended transfers to a `ringall` queue. Every
parallel queue leg creates a transfer CDR with the same `linkedid` and
`src_chan`. When one leg ends with an empty `CDR(dstchannel)`,
`ActionTransferDialHangup::fillNotAnsweredCdr()` falls back to matching all
unanswered rows by `linkedid + src_chan`. One event can therefore close every
still-ringing sibling.

The supplied verbose log proves this sequence:

1. The second queue round created the 637 row with transfer ID
   `mikopbx-1786037251.23903_3mda12` at `14:27:31.885`.
2. `PJSIP/637-00003030` was created and started ringing.
3. Endpoint 621 requested SIP forwarding to 533. Asterisk rejected it because
   the queue Dial options contain `i`.
4. `Local/621...;2` emitted `transfer_dial_hangup` with an empty `dst_chan` at
   `14:27:32.481`.
5. The 637 CDR received that exact `endtime` even though 637 answered at
   `14:27:37.850` and remained connected until `14:46:40`.

## Goals

- A leg-ending event must modify only CDR rows belonging to that transfer
  attempt.
- When Asterisk retires an entire linked-ID chain, no row for that linked ID may
  remain open in the temporary `cdr` table.
- Normal CDR processing must not make synchronous AMI `GetChannels()` calls.
- Existing successful, failed, and cancelled attended-transfer behavior must
  remain intact.
- All handlers must be idempotent and safe under duplicate event delivery.

## Non-goals

- Changing queue forwarding policy or the Dial `i` option.
- Refactoring the complete CDR event architecture.
- Repairing already-corrupted historical CDR records.
- Replacing the existing 30-day crash-artifact retention cleanup.

## Design

### Per-leg correlation

`event_transfer_dial_hangup()` will include the inherited channel variable
`transfer_UNIQUEID` in its CEL/UserEvent payload. `event_transfer_dial()`
already assigns this value with double-underscore inheritance, so it is
available on the Local and destination channels participating in the attempt.

`ActionTransferDialHangup::fillNotAnsweredCdr()` will require this identifier
for normal per-leg closure. It will inspect open transfer rows for the same
`linkedid` and close only rows whose `UNIQUEID` is either:

- exactly equal to `transfer_UNIQUEID`; or
- prefixed with `transfer_UNIQUEID . '_'`, which covers rows duplicated by
  `ActionTransferDialCreateChan` for multiple physical contacts.

Prefix matching will be performed in PHP with `str_starts_with()`, rather than
SQL `LIKE`, because transfer IDs contain underscores and must not be interpreted
as wildcard characters.

If `transfer_UNIQUEID` is absent, the handler may use an exact non-empty
`dst_chan` match for backward compatibility with events produced during a
rolling update. It must never fall back to mass closure by only
`linkedid + src_chan`. An event with neither discriminator will be ignored and
logged at warning level; terminal cleanup will close its row later.

### Terminal linked-ID finalization

Production `cel.conf` will enable `LINKEDID_END`. Asterisk generates this CEL
record when the last channel using a linked ID is destroyed or when the final
instance of an old linked ID is replaced by another linked ID.

`WorkerCallEvents` will accept this system CEL event through the existing
`cel_beanstalkd` path. Receiving the event will schedule, rather than
immediately execute, finalization for the event's `LinkedID` and `EventTime`.

The short deferred step protects attended-transfer linked-ID migration:
Asterisk does not guarantee that `ATTENDEDTRANSFER` is emitted before or after
all related CEL records. A pending finalization gives the existing
`ActionCelAttendedTransfer` handler time to move rows to the surviving linked
ID before the retired ID is swept.

Pending finalizations will be kept in `WorkerCallEvents` as:

```php
/** @var array<string, array{end: string, dueAt: float}> */
private array $pendingLinkedIdFinalizations = [];
```

The delay will be two seconds. Due entries will be processed after each CEL
message and from `pingCallBack()`, so quiet systems do not leave entries
pending. Duplicate `LINKEDID_END` records overwrite the same map entry while
preserving the latest end time.

When an entry becomes due, a dedicated `ActionCelLinkedIdEnd` handler will
close every remaining row matching:

```text
linkedid = :linkedid: AND endtime = ""
```

For each row it will set `endtime` to the CEL `EventTime` and `transfer` to
`0`. It will not change `answer`, `recordingfile`, `dialstatus`, or already
closed rows. `WorkerCdr` will then calculate disposition and duration, move the
row to `cdr_general`, and remove it from the temporary table through the
existing path.

No AMI request is involved in either scheduling or finalization.

### Restart and event-loss behavior

The per-leg events remain the primary closure mechanism. `LINKEDID_END` is a
safety net for rows that cannot be correlated normally.

Pending terminal events are intentionally kept in worker memory. A worker
restart inside the two-second window can lose that safety-net event, but it
cannot prematurely close an active call. Normally correlated rows will still
close through their own hangup events; exceptional debris remains covered by
the existing 30-day temporary-table cleanup. Persisting a two-second debounce
queue would add failure modes and state-management complexity disproportionate
to this edge case.

### Logging

- Missing `transfer_UNIQUEID` and empty `dst_chan`: warning containing action,
  linked ID, AGI channel, transferer, and event end time.
- Per-leg closure: debug message when zero or more than one row matches.
- Terminal sweep: notice/debug message containing linked ID, CEL end time, and
  number of rows finalized.
- Invalid `LINKEDID_END` without `LinkedID` or `EventTime`: warning and no DB
  mutation.

Logs must not include full CDR payloads, caller names, SIP credentials, or
recording paths.

## Configuration

Production CEL events become:

```ini
events=USER_DEFINED,ANSWER,ATTENDEDTRANSFER,LINKEDID_END
```

The Calls test fixture becomes:

```ini
events=BRIDGE_ENTER,BRIDGE_EXIT,LINKEDID_END
```

`cel_beanstalkd.conf` requires no change because it already forwards enabled
CEL records to the `asterisk-cel` tube.

## Tests

### Unit-level event handling

- A hangup with `transfer_UNIQUEID` closes only its exact row.
- A hangup closes duplicated contact rows whose IDs begin with
  `transfer_UNIQUEID . '_'` and no unrelated row.
- An empty destination without a transfer ID closes no rows.
- A legacy event with a non-empty `dst_chan` closes only the exact destination.
- Duplicate leg hangup and `LINKEDID_END` events are idempotent.
- A terminal event closes every remaining open row for its linked ID but does
  not alter rows belonging to other calls.
- A terminal event never overwrites an existing `endtime`.
- Pending finalization does not run before its two-second deadline and runs from
  both message processing and the worker ping callback.

### Calls integration scenario

Add an attended-transfer-to-ringall-queue scenario with:

1. A and B in an answered recorded call.
2. B starts an attended transfer to a ring-all queue.
3. One queue endpoint returns a SIP redirect that Asterisk prevents.
4. The first queue round ends without an answer.
5. The queue retries.
6. One leg again terminates early while another leg is ringing.
7. The later leg answers, remains bridged, and hangs up normally.

Assertions:

- The early leg is closed as unanswered.
- The future answered leg remains open until `transfer_dial_answer`.
- Its final CDR is `ANSWERED`, with positive `billsec` and a recording path.
- After `LINKEDID_END` and WorkerCdr processing, no row for the linked ID
  remains in temporary `cdr`.
- All permanent rows have non-empty `endtime`.

Existing Calls scenarios 02, 03, 09, and 11 must continue to pass because they
cover successful, unreachable, and cancelled attended transfers.

## Acceptance Criteria

- Reproduction of issue #1100 no longer gives the answered agent the early
  leg's end time.
- No `transfer_dial_hangup` event can close a sibling attempt without matching
  its transfer ID or exact destination channel.
- `LINKEDID_END` finalization makes all remaining rows eligible for normal
  WorkerCdr migration without querying AMI.
- No completed test call leaves `endtime=""` rows in the temporary table.
- No active call is finalized by a sibling hangup.
- Existing attended-transfer tests pass without changing their expected call
  semantics.

