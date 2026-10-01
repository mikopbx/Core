# Workers - agent notes

Repo-wide facts live in the root AGENTS.md. This file lists only what the code in
this directory does not make obvious.

## Registration and supervision

- A worker runs only if `Cron/WorkerSafeScriptsCore::prepareWorkersList()` lists it under
  a check method, or a module returns it from the `getModuleWorkers` hook. Each worker
  file must end with `WorkerX::startWorker($argv ?? []);` and `require_once 'Globals.php'`
  (resolved via include_path) - the supervisor spawns it as a separate PHP process.
- The core `CHECK_BY_AMI` list is empty; only module workers use AMI ping checks.
- `WorkerS3Upload` and `WorkerS3CacheCleaner` are registered only while S3 storage is
  enabled (`isS3Enabled()`, cached 5 min).
- Monitoring cycle is 5 s; a worker is pinged every `getCheckInterval()` s (default 60).
  A cycle stalled longer than 120 s makes the supervisor exit and rely on monit/cron.
- `Cron/WorkerWafExemptions` is a cron one-shot, not a `WorkerBase` subclass. Do not add
  it to the supervisor list.

## Lifecycle gotchas

- SIGUSR1 only sets `$this->needRestart`; the main loop must check it. Override
  `handleSignalUsr1()` for cleanup. SIGTERM/SIGINT call `exit()` inside the handler.
- Handlers run under `pcntl_async_signals(true)`. Any class reachable from a
  `handleSignalUsr1()` override must be added to `preloadSignalHandlerDependencies()`;
  autoloading inside a signal handler races with the autoloader (issue #1052).
- `AsteriskManager::waitUserEvent(true)` is an internal do/while that returns only when
  an AMI ping fails (with `false` it never returns). Code placed after it inside an outer
  `while (true)` runs only on disconnect - put per-event logic in event callbacks.
- `startWorker()` records every uncaught Throwable in Redis (`module:crashes:*`,
  `core:crashes:*`, 30-min TTL). At 100 crashes a module worker gets its module
  force-disabled; at 50 a core worker is silently not respawned until the TTL expires.
  Delete these keys when repeatedly testing a crashing worker.
- `OutOfDiskSpaceException` at startup deliberately bypasses Sentry; keep it that way.
- `WorkerBase::PID_DIR_MIN_FREE_BYTES` (64 KiB) must stay strictly below the supervisor's
  `DISK_WARNING_FREE_BYTES` (256 KiB); the ordering is load-bearing.

## Hot-patching running workers

- Workers load classes once. Editing files under `src/` does not reach a running worker:
  `pkill -TERM -f WorkerModelsEvents` (or the class you changed); the supervisor
  respawns it within ~5 s.
- A raw `sqlite3 UPDATE` fires no Phalcon model event, so `WorkerModelsEvents` queues no
  reload action. Save through the REST API/model, or call the `Reload*Action::execute()`
  directly.
