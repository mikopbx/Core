# CLAUDE.md - MikoPBX Worker System

Background job processing with multiple worker types, Redis pool management, and
automatic monitoring. High-level overview lives in the root `CLAUDE.md` (Worker
System component); this file covers the implementation detail.

## Layout

```
Workers/
├── WorkerBase.php            # Base class (extends Phalcon Injectable) — PID, signals, lifecycle, crash recording
├── WorkerInterface.php       # Worker contract
├── WorkerRedisBase.php       # Enhanced base for Redis workers — pool, heartbeat, health
├── Pool/WorkerPoolManager.php          # Redis-based pool tracking and load balancing
├── Cron/WorkerSafeScriptsCore.php      # Master supervisor (Singleton, watchdog, PHP Fibers)
├── Cron/WorkerWafExemptions.php        # Cron-invoked one-shot (not supervised) — republishes WAF exemption Redis keys after a Redis restart
│
├── Worker{Cdr,CallEvents,ModelsEvents,NotifyByEmail}.php  # Beanstalk queue workers
├── Worker{PrepareAdvice,StatusMonitor}.php  # Redis-pool workers (StatusMonitor merges the former Extension/Provider/AuthFailure monitors)
├── Worker{LogRotate,S3Upload,S3CacheCleaner,RemoveOldRecords,BeanstalkdTidyUp,
│          Dhcpv6Renewal,SoundFilesInit,MarketplaceChecker,NotifyAdministrator,SipDnsResolver}.php  # PID-based workers
├── WorkerWav2Webm.php        # Audio conversion (file-based JSON tasks, 5s interval)
│
└── Libs/
    ├── WorkerCallEvents/     # CEL action handlers (ActionDial*, ActionQueue*, ActionTransfer*, ActionVoicemail*, …)
    ├── WorkerModelsEvents/
    │   ├── Actions/Reload*Action.php  # Per-subsystem reload actions, each implements ReloadActionInterface::execute(array): void
    │   └── Process{PBXSettings,CustomFiles,OtherModels}.php  # Map model changes → reload actions
    └── WorkerPrepareAdvice/  # Diagnostic Check*.php modules (each declares a cache TTL + priority)
```

**Also:** `src/PBXCoreREST/Workers/WorkerApiCommands.php` — REST API processor (Redis pool, maxProc=3, 15s interval).

## Worker Types Summary

| Worker | Type | Base | Check method | Pool | Interval |
|--------|------|------|--------------|------|----------|
| WorkerCdr / WorkerCallEvents / WorkerNotifyByEmail | Beanstalk | WorkerBase | BEANSTALK | 1 | 60s |
| WorkerModelsEvents | Beanstalk | WorkerBase | BEANSTALK | 1 | 5s |
| WorkerApiCommands | Redis | WorkerRedisBase | REDIS | 3 | 15s |
| WorkerPrepareAdvice | Redis | WorkerRedisBase | REDIS | 2 | 15s |
| WorkerStatusMonitor | Redis | WorkerRedisBase | REDIS | 1 | 60s |
| WorkerLogRotate / WorkerS3Upload / WorkerS3CacheCleaner / WorkerRemoveOldRecords / WorkerBeanstalkdTidyUp / WorkerDhcpv6Renewal / WorkerSoundFilesInit / WorkerMarketplaceChecker / WorkerNotifyAdministrator / WorkerSipDnsResolver | PID | WorkerBase | PID_NOT_ALERT | 1 | 60s |
| WorkerWav2Webm | File | WorkerBase | PID_NOT_ALERT | 1 | 5s |

`WorkerStatusMonitor` is the single monitor that replaced the former
`WorkerExtensionStatusMonitor`, `WorkerProviderStatusMonitor`, and
`WorkerAuthFailureMonitor` (now merged into one class). `WorkerNotifyAdministrator`
and `WorkerSipDnsResolver` are PID-checked workers in the supervisor's
`CHECK_BY_PID_NOT_ALERT` list. `WorkerWafExemptions` is a cron-invoked one-shot
(a plain class, not a supervised `WorkerBase` subclass) and so does not appear here.

## WorkerBase

Extends `Phalcon\Di\Injectable`. Memory limit 256M (`MEMORY_LIMIT`).

State constants: `STATE_STARTING=1`, `STATE_RUNNING=2`, `STATE_STOPPING=3`, `STATE_RESTARTING=4`.

**Signals:**
- **SIGUSR1** — graceful restart: sets `needRestart = true`, calls `handleSignalUsr1()` (subclass-overridable).
- **SIGTERM / SIGINT** — immediate termination: cleans up Redis, exits.

**Key methods:**
```php
abstract public function start(array $argv): void;
public function getPidFile(): string;
public static function startWorker(array $argv, bool $setProcName = true): void;
public static function getCheckInterval(): int;          // default 60s
public function pingCallBack(BeanstalkClient $message): void;
public static function getModuleIdFromClassName(string $workerClassName): ?string;
public static function recordModuleCrash(string $workerClassName, string $errorMessage): void;
```

### Module crash recording

WorkerBase records crashes for **module** workers (not core workers) in Redis so the
supervisor can detect crash loops. Prefix `REDIS_CRASH_KEY_PREFIX = 'module:crashes:'`.

- `recordModuleCrash()` — increments the crash counter (called automatically from the
  `startWorker()` catch block). Also stores the last error message.
- `getModuleIdFromClassName()` — extracts the module ID from a `Modules\{ModuleUniqueID}\…`
  namespace; returns `null` for core workers (so they bypass the module crash path).

Redis keys (both EXPIRE 1800s / 30 min):
- `module:crashes:{ModuleUniqueID}` — integer counter.
- `module:crashes:{ModuleUniqueID}:last_error` — last error text (max 500 chars).

Core (non-module) workers have a symmetric mechanism via
`recordCoreWorkerCrash()` (also called from `startWorker()`), using prefix
`REDIS_CORE_CRASH_KEY_PREFIX = 'core:crashes:'`:
- `core:crashes:{FullyQualifiedClassName}` — integer counter (EXPIRE 1800s).
- `core:crashes:{FullyQualifiedClassName}:last_error` — last error text (max 500 chars).

Unlike modules, a core worker is never *disabled* on threshold breach; the
supervisor only suppresses its respawn until the 30-minute TTL expires.

## WorkerRedisBase

Enhanced base with pool support, heartbeat, and health monitoring.

- Redis keys: `REDIS_STATUS_KEY_PREFIX = 'worker:status:'` (TTL 300s),
  `REDIS_HEARTBEAT_KEY_PREFIX = 'worker:heartbeat:'` (TTL 10s).
- Pool: `registerInPool()`, `unregisterFromPool()`, `updatePoolHeartbeat()`.
- Health: heartbeat every 5s; memory check every 60s, restart over `MAX_MEMORY_PERCENT = 80`.

## WorkerPoolManager

Redis-based pool tracking. Prefix `worker:pool:`, worker TTL 300s.
```php
registerWorker(string $workerClass, int $pid, int $instanceId = 1): string
unregisterWorker(string $workerClass, int $pid): bool
getActiveWorkers(string $workerClass): array
getNextInstanceId(string $workerClass): int
cleanDeadWorkers(): int
```

## WorkerSafeScriptsCore (supervisor)

Singleton. Monitors all workers using PHP Fibers for parallel checks.

**Check methods:** `CHECK_BY_BEANSTALK` (ping/pong via Beanstalk), `CHECK_BY_REDIS`
(heartbeat key TTL), `CHECK_BY_AMI` (Asterisk Manager UserEvent), `CHECK_BY_PID_NOT_ALERT`
(PID-file process existence). Worker list is built in `prepareWorkersList()`.

**Watchdog:** 120-second timeout on `executeParallel()`. If blocked, the process exits
for monit to restart it.

**Module crash-loop detection:** before restarting a module worker the supervisor checks
`isModuleInCrashLoop()`.
- `CRASH_LOOP_THRESHOLD = 100` — max crashes in the 30-minute window (window enforced by
  the Redis EXPIRE set in `recordModuleCrash()`).
- Reads the counter from `module:crashes:{ModuleUniqueID}`. When exceeded: disables the
  module via `PbxExtensionUtils::forceDisableModule()` with reason `DISABLED_BY_CRASH_LOOP`,
  logs the last error, and cleans up the Redis crash data.
- Core (non-module) workers are unaffected by *this* path — `getModuleIdFromClassName()`
  returns null for them — but the supervisor also runs `isCoreWorkerInCrashLoop()` for them:
  `CORE_CRASH_LOOP_THRESHOLD = 50` crashes (counter `core:crashes:{FQCN}`, 30-min window).
  On breach it suppresses the respawn (never disables the worker) and logs a
  `CORE WORKER CRASH LOOP` alert, rate-limited to once per `CORE_CRASH_LOG_INTERVAL_SEC = 300`.

## WorkerModelsEvents

Model change → reload action pipeline. State persisted in Redis (24h TTL).
Flow: model change (Beanstalk) → queue reload actions → execute in priority order.

## WorkerWav2Webm (file-based)

Task directory: `/storage/usbdisk1/mikopbx/astspool/monitor/conversion-tasks/`
- File locking (`LOCK_EX | LOCK_NB`) prevents races.
- CPU priority: nice +19 (lowest). FFmpeg timeout: 300s conversion, 120s merge.
- Max 3 retries, 5-minute delay between attempts.

## Creating a new worker

```php
class WorkerMyFeature extends WorkerBase
{
    public function start(array $argv): void
    {
        $this->setWorkerState(self::STATE_RUNNING);
        while (!$this->needRestart) {
            pcntl_signal_dispatch();
            // Do work...
            sleep(1);
        }
    }

    public static function getCheckInterval(): int
    {
        return 30;
    }
}
```
Register it in `WorkerSafeScriptsCore::prepareWorkersList()` with a check method.

## Deploying changes to long-running worker code

Workers are long-running PHP processes that load classes once at startup. Hot-patching a
file under `src/` does **not** propagate to running workers — they keep the old class
definitions in memory. This matters especially for files loaded by `WorkerModelsEvents`:
`src/Core/Asterisk/Configs/*Conf.php`, `Libs/WorkerModelsEvents/Actions/Reload*Action.php`,
and any `src/Common/Models/` referenced by reload actions.

After hot-patching such files, kill the affected worker(s) so `WorkerSafeScriptsCore`
respawns them with a fresh autoloader:
```bash
# Re-spawn WorkerModelsEvents (most config regeneration goes through it).
# WorkerSafeScriptsCore starts a fresh process within ~5 seconds.
pkill -TERM -f WorkerModelsEvents
```

Trigger an actual regeneration by either:
- Calling the reload action directly: `php -r 'require_once "Globals.php"; (new \Namespace\ReloadFooAction())->execute();'`
- Or saving the relevant model through the REST API (produces the model event WorkerModelsEvents listens for).

Note: a raw `sqlite3 UPDATE` does **not** fire Phalcon model events, so it does **not** queue a reload action.
