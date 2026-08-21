# AMI Session Lifecycle and Backlog Recovery Design

## Goal

Prevent long-lived MikoPBX workers from leaking AMI sockets into spawned
processes, make `AsteriskManager` report and recover from dead connections
reliably, and safely remove confirmed stalled local AMI sessions before they
retain a large Asterisk event backlog.

## Problem

Long-lived PHP workers open AMI connections and later start commands and other
workers through `exec()` and `nohup`. The spawned processes inherit all open
file descriptors because the current launch path does not close descriptors
other than standard input, output, and error.

When the original AMI reader exits, another process can therefore keep a copy
of its TCP socket open. Asterisk still considers the manager session connected,
but nobody consumes its event stream. On Asterisk 22.8.2 each manager session
tracks its position with `last_ev` in the shared `all_events` queue. A stalled
session prevents old events from being purged and causes Asterisk RSS to grow.

`AsteriskManager` compounds the problem because its `_loggedIn` flag can remain
true after EOF or socket failure, failed reads and partial writes do not always
invalidate the connection, and `disconnect()` does not clear all connection
state.

## Scope

This change covers:

- descriptor-safe execution through `Processes`;
- AMI socket lifecycle and reconnect behavior in `AsteriskManager`;
- detection and optional removal of confirmed stalled localhost AMI sessions;
- diagnostics and rate-limited logging;
- automated tests and load verification on `boffart.miko.ru`.

It does not modify the existing memory watchdog policy, automatically kick
external AMI integrations, or change production systems during development and
testing.

## Architecture

### Descriptor-safe process launch

All execution paths owned by `Processes` will invoke commands through one
internal fd-safe shell launcher. Before executing the requested command, the
launcher enumerates `/proc/self/fd` and closes every descriptor greater than or
equal to 3. It then executes the original command through `sh -c`, preserving
the current command-string semantics for pipelines and redirections.

The launcher is applied to synchronous and background paths, including:

- `mwExec()`;
- `mwExecBg()`;
- `mwExecBgWithTimeout()`;
- worker starts performed by `processPHPWorker()` and `processWorker()`.

The command text is passed as one shell-escaped positional argument. Standard
descriptors are retained and background output continues to use the existing
output-file behavior.

Systems without readable `/proc/self/fd` retain existing execution behavior and
emit a rate-limited warning. The supported MikoPBX Linux/BusyBox environment
has `/proc/self/fd`; compatibility will be verified on boffart.

### AsteriskManager connection state

`AsteriskManager` gains one authoritative connection-health check. A
connection is usable only when the stream is a resource, has not reached EOF,
and its metadata does not report a terminal stream state.

Connection lifecycle rules:

- opening a new connection first closes any previous stream without reconnect;
- failed header reads and failed logins close and clear the stream;
- EOF, exceptions, and incomplete writes invalidate the connection;
- expected read timeout is not treated as EOF;
- a request may reconnect and retry at most once;
- `disconnect()` never reconnects merely to send `Logoff`;
- disconnect always sets `socket = null` and `_loggedIn = false`;
- object destruction performs a local close without network waits;
- `loggedIn()` remains backward-compatible but returns actual connection health;
- consumers use `isConnected()` instead of reading the public socket resource.

The event mode selected by the original connection is preserved for reconnect.
This work does not globally change the default event subscription because real
AMI listeners depend on it.

### AMI session inspection

A focused inspector reads Linux procfs rather than parsing `netstat` output:

1. Resolve the Asterisk PID.
2. Map `/proc/<asterisk-pid>/fd/*` socket inodes to Asterisk file descriptors.
3. Parse `/proc/net/tcp` and `/proc/net/tcp6` for established sockets whose
   local port equals the configured AMI port.
4. Read the server-side TCP transmit queue (`tx_queue`) for every AMI socket.
5. Run `asterisk -rx 'manager show connected'` only when a non-zero queue needs
   attribution, mapping the Asterisk fd to username and session start time.
6. Locate the reverse client-side socket tuple and count distinct PIDs holding
   its inode through `/proc/<pid>/fd`.

The stable observation identity is:

`asterisk fd + server inode + remote address + remote port + session start`.

This prevents queue history from being applied to a new session that reuses an
old descriptor.

`manager show eventq` is never used by periodic monitoring because it prints
the full shared event queue and can itself be expensive during an incident.

### Watchdog integration

Inspection runs as a lightweight periodic responsibility of
`WorkerSafeScriptsCore`; no additional resident PHP worker is introduced. The
existing memory-watchdog thresholds and actions are unchanged.

The check runs every 15 seconds and maintains observations in memory. A clean
queue resets that session's backlog observation.

Backlog levels:

- warning: server-side `Send-Q >= 64 KiB` for at least 30 seconds;
- kick candidate: nine consecutive samples covering at least 120 seconds with
  server-side `Send-Q >= 96 KiB` and without a decrease of at least 32 KiB
  between consecutive samples;
- automatic kick: candidate conditions plus localhost source and strong stale
  descriptor evidence.

Strong stale descriptor evidence means either:

- the client socket inode is held by more than one distinct PID; or
- no live client owner remains; or
- the matching client socket is in `CLOSE_WAIT` while the Asterisk session is
  still reported connected.

If exactly one live process owns the socket, the watchdog logs the candidate
but does not kick it. This protects a legitimate integration that is slow under
a temporary event burst.

A sample below 32 KiB clears the observation completely. A decrease of at
least 32 KiB postpones candidate status and starts a new 120-second observation
window. Client-side `Recv-Q` is diagnostic only and never triggers a kick.

Automatic actions are limited to `127.0.0.1` and `::1`. External AMI sessions
are diagnostics-only regardless of queue size.

### Safe kick and race prevention

Immediately before executing `manager kick session <fd>`, the watchdog repeats
the procfs and manager-session lookup. The action proceeds only if descriptor,
socket inode, endpoint, username, and session start still match the original
observation.

Before the kick, the watchdog publishes
`UserEvent: AmiSessionWatchdogDisconnect` with the username, fd, endpoint,
queue size, descriptor-owner PIDs, and the evidence that authorized the action.
AMI UserEvents are broadcast rather than addressed to one manager connection,
so this is a diagnostic signal for healthy integrations; the stalled session
is not expected to consume it. Failure to publish the event is logged but does
not prevent removal of an already revalidated stalled session.

Rate limits:

- at most one session per inspection pass;
- at most three automatic kicks in ten minutes;
- five-minute cooldown per username and endpoint.

After a kick the watchdog verifies that the old session disappears and records
whether the client reconnects. It does not restart Asterisk or the client
worker.

Automatic action is controlled by the hidden PBX setting
`AMI_STALLED_SESSION_AUTO_KICK`, defaulting to `0`. With the setting disabled,
the complete detection and revalidation path runs but finishes with
`action=observe`. There is no administrative UI for this initial rollout.

## Logging

The first sustained warning records username, fd, endpoint, queue size,
duration, owner count, and `action=observe`.

An automatic action records the same identity, all satisfied kick conditions,
the CLI result, and follow-up session status. AMI secrets and command payloads
are never logged. Repeated unchanged warnings are rate-limited.

## Rollout

1. Deploy descriptor-safe launch and `AsteriskManager` lifecycle hardening.
2. Run the session inspector on boffart with
   `AMI_STALLED_SESSION_AUTO_KICK=0`.
3. Test a healthy event consumer, a deliberately paused consumer, an inherited
   socket, reconnect after EOF, and command-only `Events: off` connections.
4. Collect at least 24 hours of boffart observations and confirm that healthy
   server-side queues return to zero.
5. Set `AMI_STALLED_SESSION_AUTO_KICK=1` on boffart and enable automatic kick
   only for localhost candidates with strong stale descriptor evidence.
6. Keep single-owner and all external sessions in observe-only mode.

No changes are made to the production station as part of implementation or
verification.

## Tests

Automated coverage must prove:

- a child started by every `Processes` execution path does not inherit a TCP
  socket opened by its parent;
- commands retain exit code, output, pipeline, redirection, and background
  behavior;
- AMI disconnect clears both stream and login state;
- EOF and partial writes invalidate the AMI connection;
- timeout without EOF leaves a listener connected;
- reconnect occurs at most once and retains the selected event mode;
- procfs TCP parsing handles IPv4, IPv6, queue values, and socket inode mapping;
- queue spikes that recover are never kicked;
- a sustained single-owner queue is logged but not kicked;
- a sustained inherited localhost socket is kicked after revalidation;
- external sessions are never kicked;
- descriptor reuse cancels a pending action;
- kick and warning rate limits are enforced.
- an automatic kick publishes its diagnostic UserEvent before disconnecting
  the session.

The boffart load test records Asterisk RSS, AMI session count, server-side
`Send-Q`, client-side `Recv-Q`, and reconnection behavior before, during, and
after the stalled-reader scenario.

## Success Criteria

- newly spawned workers hold no inherited AMI descriptors;
- dead AMI streams are detected and reconnect through a bounded retry path;
- healthy integrations survive AMI event bursts without automatic action;
- confirmed inherited localhost sessions are removed and logged;
- external AMI integrations remain untouched;
- the boffart stalled-reader test no longer produces unbounded Asterisk RSS
  growth;
- existing process-management and AMI tests continue to pass.
