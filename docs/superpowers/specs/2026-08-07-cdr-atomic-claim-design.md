# CDR Atomic Claim Design

## Purpose

This design replaces the in-memory `WorkerCdr` completion guard with an
atomic, lease-based claim stored in the temporary `cdr` table. It prevents
duplicate CDR processing and conversion tasks while allowing processing to
recover safely after a worker crash, delayed Beanstalk messages, or lease
expiration.

The existing rule remains unchanged: `WorkerCallEvents` is the single writer
for CDR database mutations. `WorkerCdr` requests claims and performs CDR
calculations, but does not update the temporary table directly.

## Temporary CDR State

Add two service columns to `CallDetailRecordsTmp` and the temporary `cdr`
table:

```sql
processing_token      VARCHAR(64) NOT NULL DEFAULT ''
processing_started_at INTEGER     NOT NULL DEFAULT 0
```

`processing_started_at` contains a Unix timestamp in seconds.

The row states are:

| State | `work_completed` | `processing_token` |
|---|---:|---|
| Active call | `0` | empty |
| Completed and waiting | `0` | empty |
| Claimed by WorkerCdr | `0` | claim UUID |
| Processed | `1` | claim UUID |
| Migrated | temporary row deleted | — |

`work_completed` continues to describe final completion only. The processing
state must not overload it with a value such as `2`, because existing queries
use `work_completed<>1` and would ambiguously treat such rows as pending.

## Claim Ownership

Add a request/reply tube:

```php
WorkerCdr::CLAIM_CDR_TUBE = 'claim_cdr_tube';
```

`WorkerCallEvents` subscribes to the tube and executes the database claim as
the single writer.

### Terminal request

After `LINKEDID_END`, WorkerCdr requests completed rows for one exact linked
ID without querying AMI:

```json
{
  "mode": "linkedid",
  "linkedid": "mikopbx-1786037174.23581",
  "token": "0198d8d4-6c7d-7b11-9b12-71df96b7680d",
  "limit": 200
}
```

### Polling request

The ordinary polling path first obtains active linked IDs through the existing
AMI call. It removes active calls and requests claims for the remaining exact
CDR identifiers:

```json
{
  "mode": "uniqueids",
  "uniqueids": [
    "mikopbx-1786037174.23581_abc123",
    "mikopbx-1786037174.23581_def456"
  ],
  "token": "0198d8d4-6c7d-7b11-9b12-71df96b7680d",
  "limit": 200
}
```

The terminal path must never invoke `GetChannels()`. The polling path retains
the AMI check as a fallback for calls that did not produce or deliver a
terminal notification.

## Atomic Claim Transaction

`WorkerCallEvents` performs the claim in one short SQLite transaction:

```sql
BEGIN IMMEDIATE;
```

Eligible rows satisfy:

```sql
work_completed <> 1
AND endtime <> ''
AND (
    processing_token = ''
    OR processing_started_at < :lease_expired_at
)
```

The terminal mode additionally requires:

```sql
linkedid = :linkedid
```

The polling mode limits selection to the supplied exact `UNIQUEID` values.

Selected rows are claimed conditionally:

```sql
UPDATE cdr
SET processing_token = :token,
    processing_started_at = :now
WHERE id IN (:selected_ids)
  AND work_completed <> 1
  AND endtime <> ''
  AND (
      processing_token = ''
      OR processing_started_at < :lease_expired_at
  );
```

Rows are then read back by the new token:

```sql
SELECT *
FROM cdr
WHERE processing_token = :token
ORDER BY answer
LIMIT 200;
```

The transaction ends with `COMMIT`. File operations, email publication,
duration calculation, and recording conversion do not run inside the
transaction.

`BEGIN IMMEDIATE` is acceptable because the transaction contains only a
bounded SELECT, UPDATE, and SELECT. It is executed by the existing single
writer and does not hold the SQLite lock while WorkerCdr processes the rows.

## Lease Parameters

Use explicit constants:

```php
private const int CDR_CLAIM_LEASE_SECONDS = 120;
private const int CDR_CLAIM_BATCH_SIZE = 200;
```

A batch of 200 rows must finish its calculations and JSON task creation well
inside two minutes. WAV/WebM conversion is not part of the lease because it is
performed asynchronously by `WorkerWav2Webm`.

If processing approaches the deadline, WorkerCdr may renew the lease:

```json
{
  "action": "renew",
  "token": "0198d8d4-6c7d-7b11-9b12-71df96b7680d"
}
```

Renewal updates `processing_started_at` only for rows whose token still
matches. With the chosen batch size, renewal is an emergency mechanism rather
than the normal execution path.

## Token-Aware Completion

WorkerCdr includes the claim token in every update:

```json
{
  "UNIQUEID": "mikopbx-1786037174.23581_abc123",
  "processing_token": "0198d8d4-6c7d-7b11-9b12-71df96b7680d",
  "work_completed": 1,
  "duration": 1169,
  "billsec": 1163,
  "disposition": "ANSWERED",
  "recordingfile": "/storage/.../record.webm"
}
```

`UpdateDataInDB` performs a compare-and-set lookup:

```sql
UNIQUEID = :uniqueid
AND processing_token = :token
AND work_completed <> 1
```

When the token matches:

1. Calculated CDR fields are saved.
2. `work_completed` becomes `1`.
3. The existing `afterSave()` path copies the row to `cdr_general`.
4. The temporary row is deleted.

When the token does not match, the update belongs to an expired owner and is
ignored. A delayed update from an old WorkerCdr can therefore never complete a
row that has been reclaimed by a newer worker.

## Crash Recovery

Recovery requires no unconditional claim reset at startup.

Example:

1. Worker A claims rows with token `A`.
2. Worker A creates some tasks and terminates unexpectedly.
3. The rows remain leased by token `A`.
4. Other workers leave them untouched for 120 seconds.
5. After expiration, Worker B atomically replaces token `A` with token `B`.
6. A delayed update from Worker A fails the token comparison.
7. Worker B completes the row with token `B`.

Avoid resetting all tokens during startup. An unconditional reset creates a
race with update messages that Worker A published before it terminated.

## Deterministic Recording Conversion Tasks

A claim alone does not prevent this failure sequence:

1. WorkerCdr creates a conversion JSON file.
2. WorkerCdr terminates before publishing or completing the CDR update.
3. The lease expires and another worker processes the row again.

Conversion task names must therefore be deterministic:

```text
conversion-tasks/<sha256(UNIQUEID)>.json
```

Write the task atomically:

```text
<hash>.json.tmp.<processing_token>
        -> rename()
<hash>.json
```

A retry replaces the same logical task rather than creating a second task.
The JSON retains the original `UNIQUEID`; `processing_token` may be included
for diagnostics. The current random `uniqid()` suffix must be removed.

## Error Handling

### Claim failure

Roll back the transaction. WorkerCdr receives no rows and retries through a
later terminal notification or polling iteration.

### CDR processing failure

The row remains leased. It automatically becomes eligible after 120 seconds.
For faster retry, WorkerCdr can request a conditional release:

```json
{
  "action": "release",
  "token": "0198d8d4-6c7d-7b11-9b12-71df96b7680d",
  "uniqueids": ["mikopbx-1786037174.23581_abc123"]
}
```

Release clears the token only when the supplied token matches the current
owner.

### Update publication failure

The lease expires and the row is retried. Its deterministic conversion task is
replaced instead of duplicated.

### Delayed update

The compare-and-set token no longer matches after reclamation, so the stale
update is ignored.

## LINKEDID_END Data Flow

The complete terminal flow is:

```text
LINKEDID_END
  -> delayed terminal finalization
  -> close residual endtime fields
  -> notify WorkerCdr(linkedid)
  -> atomically claim completed rows for linkedid
  -> calculate CDR fields
  -> create deterministic conversion tasks
  -> token-aware UpdateDataInDB
  -> migrate to cdr_general
  -> delete temporary CDR rows
```

The notification is a trigger, not proof of ownership. Only a successful
database claim gives WorkerCdr permission to process a row. Duplicate terminal
notifications therefore return no additional rows while a valid lease exists.

## Email Notifications

The claim prevents concurrent processing but does not provide exactly-once
email delivery if WorkerCdr terminates after publishing email and before CDR
completion.

The minimum safer design is:

1. WorkerCdr includes the prepared notification data in its token-aware update.
2. The single writer publishes the email only after a successful token-matched
   transition from `work_completed=0` to `work_completed=1`.

Strict exactly-once email delivery requires a transactional outbox. That is
outside this change unless exactly-once email is made an explicit requirement.
The current scope may retain best-effort email semantics, but it must not claim
exactly-once delivery.

## Required Tests

### Atomic claim

- Two claims for the same row return it only to the first token.
- An unexpired token cannot be replaced.
- An expired token can be replaced.
- A terminal claim returns only the exact linked ID.
- A polling claim returns only the supplied exact unique IDs.
- Active or open rows with `endtime=''` cannot be claimed.

### Completion

- An update with the current token completes and deletes the temporary row.
- An update with an expired token is ignored.
- A delayed old update cannot overwrite a reclaimed row.
- A failed worker permits processing after lease expiration.

### Side effects

- Reprocessing the same `UNIQUEID` produces one deterministic conversion task.
- A failed update followed by retry does not create a second task.
- Duplicate terminal notification does not produce duplicate CDR rows.

### Call integration

- Reproduce the attended-transfer-to-ringall retry from issue #1100.
- One early queue leg must not alter the still-ringing sibling.
- The answered leg must retain answer time, billable seconds, and recording.
- After `LINKEDID_END`, no row for the linked ID remains in temporary `cdr`.

## Acceptance Criteria

- No CDR is processed without owning its current database claim token.
- Duplicate terminal notifications do not create duplicate conversion tasks.
- A WorkerCdr crash cannot leave a row permanently claimed.
- A delayed update from an expired owner cannot complete or overwrite a row.
- The terminal path remains independent of AMI.
- The polling path retains its active-channel AMI guard.
- Conversion tasks are idempotent by `UNIQUEID`.
- Temporary CDR rows are removed after successful token-aware completion.
