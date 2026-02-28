# CLAUDE.md - MikoPBX Worker System

Background job processing system with multiple worker types, pool management, and automatic monitoring.

## File Inventory

```
Workers/
├── WorkerBase.php                     # Base class (extends Injectable) - PID, signals, lifecycle
├── WorkerInterface.php                # Worker contract interface
├── WorkerRedisBase.php                # Enhanced base for Redis workers - pool, heartbeat, health
├── Pool/
│   └── WorkerPoolManager.php          # Redis-based pool tracking and load balancing
├── Cron/
│   └── WorkerSafeScriptsCore.php      # Master supervisor (Singleton, watchdog, PHP Fibers)
│
├── WorkerCdr.php                      # CDR processing (Beanstalk)
├── WorkerCallEvents.php               # Call event handling (Beanstalk)
├── WorkerModelsEvents.php             # Model change events (Beanstalk, 5s interval)
├── WorkerNotifyAdministrator.php      # Admin notifications (Beanstalk)
├── WorkerNotifyByEmail.php            # Email notifications (Beanstalk)
│
├── WorkerPrepareAdvice.php            # System diagnostics (Redis pool, maxProc=2)
├── WorkerExtensionStatusMonitor.php   # Extension status (Redis pool)
├── WorkerProviderStatusMonitor.php    # Provider status (Redis pool)
├── WorkerAuthFailureMonitor.php       # Auth failure tracking (Redis pool)
│
├── WorkerLogRotate.php                # Log rotation (PID-based)
├── WorkerS3Upload.php                 # S3 uploads (PID-based)
├── WorkerS3CacheCleaner.php           # S3 cache cleanup (PID-based)
├── WorkerRemoveOldRecords.php         # Database cleanup (PID-based)
├── WorkerBeanstalkdTidyUp.php         # Beanstalk queue maintenance (PID-based)
├── WorkerDhcpv6Renewal.php            # IPv6 DHCP renewal (PID-based)
├── WorkerSoundFilesInit.php           # Sound file initialization (PID-based)
├── WorkerMarketplaceChecker.php       # Module marketplace checks (PID-based)
├── WorkerWav2Webm.php                 # Audio conversion (file-based, 5s interval)
│
└── Libs/
    ├── WorkerCallEvents/              # 23 CEL action handlers
    │   ├── InsertDataToDB.php, SelectCDR.php, UpdateDataInDB.php
    │   ├── ActionCelAnswer.php, ActionDial.php, ActionDialEnd.php
    │   ├── ActionDialAnswer.php, ActionDialApp.php, ActionDialCreateChan.php
    │   ├── ActionDialOutworktimes.php, ActionMeetmeDial.php
    │   ├── ActionHangupChanMeetme.php, ActionInsertCdr.php
    │   ├── ActionQueueStart.php, ActionQueueAnswer.php, ActionQueueEnd.php
    │   ├── ActionVoicemailStart.php, ActionVoicemailEnd.php
    │   ├── ActionTransferCheck.php, ActionTransferDial.php
    │   ├── ActionTransferDialCreateChan.php, ActionTransferDialHangup.php
    │   └── ActionUnparkCall.php, ActionUnparkCallTimeout.php
    │
    ├── WorkerModelsEvents/
    │   ├── Actions/                   # 40+ reload action classes
    │   │   ├── ReloadActionInterface.php     # execute(array $parameters): void
    │   │   ├── ReloadPJSIPAction.php         # PJSIP SIP protocol
    │   │   ├── ReloadIAXAction.php           # IAX protocol
    │   │   ├── ReloadDialplanAction.php      # Asterisk dialplan
    │   │   ├── ReloadQueuesAction.php        # Call queues
    │   │   ├── ReloadConferenceAction.php    # Conference rooms
    │   │   ├── ReloadParkingAction.php       # Call parking
    │   │   ├── ReloadVoicemailAction.php     # Voicemail
    │   │   ├── ReloadFeaturesAction.php      # Asterisk features
    │   │   ├── ReloadManagerAction.php       # AMI
    │   │   ├── ReloadAriAction.php           # ARI
    │   │   ├── ReloadNginxAction.php         # Nginx
    │   │   ├── ReloadPHPFPMAction.php        # PHP-FPM
    │   │   ├── ReloadNetworkAction.php       # Network (IPv4/IPv6)
    │   │   ├── ReloadFirewallAction.php      # Firewall
    │   │   ├── ReloadFail2BanConfAction.php  # Fail2ban
    │   │   ├── ReloadSSHAction.php           # SSH
    │   │   ├── ReloadSyslogDAction.php       # Syslog
    │   │   ├── ReloadCrondAction.php         # Cron
    │   │   ├── ReloadRTPAction.php, ReloadMOHAction.php
    │   │   ├── ReloadRecordingSettingsAction.php, ReloadRecordSavePeriodAction.php
    │   │   ├── ReloadStaticRoutesAction.php, ReloadTimezoneAction.php
    │   │   ├── ReloadNTPAction.php, ReloadHepAction.php
    │   │   ├── ReloadModulesConfAction.php, ReloadModuleStateAction.php
    │   │   ├── ReloadLicenseAction.php, ReloadSentryAction.php
    │   │   ├── ReloadCloudParametersAction.php, ReloadCloudDescriptionAction.php
    │   │   ├── ReloadPBXCoreAction.php, RestartPBXCoreAction.php
    │   │   ├── ReloadWorkerCallEventsAction.php, ReloadRestAPIWorkerAction.php
    │   │   ├── ReloadAdviceAction.php, ReloadAllSystemWorkersAction.php
    │   │   ├── ApplyCustomFilesAction.php, RemoveCustomFilesAction.php
    │   │   └── UpdatePasskeysLoginAction.php
    │   ├── ProcessPBXSettings.php    # PbxSettings model → reload mapping
    │   ├── ProcessCustomFiles.php    # CustomFiles model → reload mapping
    │   └── ProcessOtherModels.php    # Other models → reload mapping
    │
    └── WorkerPrepareAdvice/           # 16 diagnostic check modules
        ├── CheckConnection.php        # Internet (120s cache, priority 5)
        ├── CheckCorruptedFiles.php    # File integrity (3600s, priority 5)
        ├── CheckDockerPermissions.php # Docker volumes (3600s, priority 1)
        ├── CheckWebPasswords.php      # Web passwords (864000s, priority 1)
        ├── CheckSSHPasswords.php      # SSH passwords (864000s, priority 1)
        ├── CheckSSHConfig.php         # SSH config (3600s, priority 1)
        ├── CheckFirewalls.php         # Firewall (864000s, priority 1)
        ├── CheckSecurityLog.php       # Fail2ban (600s, priority 1)
        ├── CheckSIPPasswords.php      # SIP passwords (864000s, priority 9)
        ├── CheckAmiPasswords.php      # AMI passwords (864000s, priority 9)
        ├── CheckAriPasswords.php      # ARI passwords (864000s, priority 9)
        ├── CheckStorage.php           # Storage health (3600s, priority 2)
        ├── CheckStorageUsage.php      # Disk usage (1800s, priority 3)
        ├── CheckS3Connection.php      # S3 connection (300s, priority 4)
        ├── CheckUpdates.php           # System updates (86400s, priority 5)
        └── CheckModulesUpdates.php    # Module updates (86400s, priority 5)
```

**Also:** `src/PBXCoreREST/Workers/WorkerApiCommands.php` - REST API processor (Redis pool, maxProc=3, 15s interval)

## Worker Types Summary

| Worker | Type | Base | Check | Pool | Interval |
|--------|------|------|-------|------|----------|
| WorkerCdr | Beanstalk | WorkerBase | BEANSTALK | 1 | 60s |
| WorkerCallEvents | Beanstalk | WorkerBase | BEANSTALK | 1 | 60s |
| WorkerModelsEvents | Beanstalk | WorkerBase | BEANSTALK | 1 | 5s |
| WorkerNotifyAdministrator | Beanstalk | WorkerBase | BEANSTALK | 1 | 60s |
| WorkerNotifyByEmail | Beanstalk | WorkerBase | BEANSTALK | 1 | 60s |
| WorkerApiCommands | Redis | WorkerRedisBase | REDIS | 3 | 15s |
| WorkerPrepareAdvice | Redis | WorkerRedisBase | REDIS | 2 | 15s |
| WorkerExtensionStatusMonitor | Redis | WorkerRedisBase | REDIS | 1 | 60s |
| WorkerProviderStatusMonitor | Redis | WorkerRedisBase | REDIS | 1 | 60s |
| WorkerAuthFailureMonitor | Redis | WorkerRedisBase | REDIS | 1 | 60s |
| WorkerLogRotate | PID | WorkerBase | PID_NOT_ALERT | 1 | 60s |
| WorkerS3Upload | PID | WorkerBase | PID_NOT_ALERT | 1 | 60s |
| WorkerS3CacheCleaner | PID | WorkerBase | PID_NOT_ALERT | 1 | 60s |
| WorkerRemoveOldRecords | PID | WorkerBase | PID_NOT_ALERT | 1 | 60s |
| WorkerBeanstalkdTidyUp | PID | WorkerBase | PID_NOT_ALERT | 1 | 60s |
| WorkerDhcpv6Renewal | PID | WorkerBase | PID_NOT_ALERT | 1 | 60s |
| WorkerSoundFilesInit | PID | WorkerBase | PID_NOT_ALERT | 1 | 60s |
| WorkerMarketplaceChecker | PID | WorkerBase | PID_NOT_ALERT | 1 | 60s |
| WorkerWav2Webm | File | WorkerBase | PID_NOT_ALERT | 1 | 5s |

## WorkerBase

Extends `Phalcon\Di\Injectable`. Memory limit: 256M.

### State Constants
```php
protected const int STATE_STARTING = 1;
protected const int STATE_RUNNING = 2;
protected const int STATE_STOPPING = 3;
protected const int STATE_RESTARTING = 4;
```

### Signal Handling
- **SIGUSR1**: Graceful restart — sets `needRestart = true`, calls `handleSignalUsr1()`
- **SIGTERM/SIGINT**: Immediate termination — cleans up Redis, exits

### Key Methods
```php
abstract public function start(array $argv): void;
public function getPidFile(): string;
public static function startWorker(array $argv, bool $setProcName = true): void;
public static function getCheckInterval(): int;  // Default 60s
public function pingCallBack(BeanstalkClient $message): void;
```

## WorkerRedisBase

Enhanced base with pool support, heartbeat, and health monitoring.

```php
// Redis keys
REDIS_STATUS_KEY_PREFIX = 'worker:status:'       // TTL: 300s
REDIS_HEARTBEAT_KEY_PREFIX = 'worker:heartbeat:' // TTL: 10s

// Pool management
protected function registerInPool(): void
protected function unregisterFromPool(): void
protected function updatePoolHeartbeat(): void

// Health monitoring
protected function updateWorkerStatus(): void    // Heartbeat every 5s
protected function performHealthCheck(): void    // Memory check every 60s
protected const int MAX_MEMORY_PERCENT = 80;
```

## WorkerPoolManager

Redis-based pool tracking. Prefix: `worker:pool:`. Worker TTL: 300s.

```php
registerWorker(string $workerClass, int $pid, int $instanceId): string
unregisterWorker(string $workerClass, int $pid): bool
getActiveWorkers(string $workerClass): array
getNextInstanceId(string $workerClass): int
cleanDeadWorkers(): int
```

## WorkerSafeScriptsCore (Supervisor)

Singleton pattern. Monitors all workers using PHP Fibers for parallel checks.

### Check Methods
- **CHECK_BY_BEANSTALK** — Ping/pong through Beanstalk queue
- **CHECK_BY_REDIS** — Redis heartbeat key with TTL
- **CHECK_BY_AMI** — Asterisk Manager UserEvent
- **CHECK_BY_PID_NOT_ALERT** — Simple process existence check (PID file)

### Watchdog Timer
120-second timeout on `executeParallel()`. If blocked, process exits for monit to restart.

## WorkerModelsEvents

Model change → reload action pipeline. State persisted in Redis (24h TTL).

```
Model Change (Beanstalk) → Queue Reload Actions → Execute in Priority Order
```

## WorkerWav2Webm (File-Based)

Task directory: `/storage/usbdisk1/mikopbx/astspool/monitor/conversion-tasks/`

- File locking (`LOCK_EX | LOCK_NB`) prevents race conditions
- CPU priority: nice +19 (lowest)
- FFmpeg timeout: 300s conversion, 120s merge
- Max 3 retries, 5-minute delay between attempts

## Creating a New Worker

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

Register in `WorkerSafeScriptsCore::prepareWorkersList()` with check method.
