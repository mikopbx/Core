---
name: m-implement-wav2webm-worker
branch: feature/m-implement-wav2webm-worker
status: pending
created: 2025-11-13
---

# WAV to WebM Conversion Worker Implementation

## Problem/Goal
Implement a background worker that converts WAV audio files to WebM format using a JSON-based task system. The worker runs on a 1-minute interval, monitors a folder for JSON task files created by WorkerCDR, processes conversions using FFmpeg, and cleans up completed tasks.

## Success Criteria
- [ ] Worker class created that extends WorkerBase with 1-minute start interval
- [ ] Worker recursively scans Directories::AST_MONITOR_DIR for JSON task files
- [ ] JSON task file format matches specification in description file (input WAV path, output WebM path, conversion parameters)
- [ ] FFmpeg integration for WAV to WebM conversion with parameters from JSON
- [ ] WorkerCDR integration - creates JSON task files in monitoring directory
- [ ] Error handling and logging for failed conversions (keep JSON file on failure)
- [ ] Cleanup of JSON task files on successful conversion
- [ ] Worker registered with WorkerSafeScriptCore for monitoring/restart
- [ ] Documentation for JSON task format and usage

## Context Manifest

### How the Current System Works: Call Recording and Conversion Architecture

**The Current Flow in WorkerCDR:**

When a call completes, WorkerCDR processes Call Detail Records (CDRs) from the database in a main loop that runs every 5 seconds. The worker (`src/Core/Workers/WorkerCdr.php`) extends WorkerBase and subscribes to Beanstalk queues for CDR processing. Here's the complete flow:

1. **Call Completion Detection**: WorkerCDR retrieves completed calls via `CDRDatabaseProvider::getCdr()`. It checks if call chains are still active by querying Asterisk Manager Interface for active channels using `Util::getAstManager('off')->GetChannels(true)`. Only calls with no active linked channels are processed.

2. **Recording File Discovery**: For each completed call, WorkerCDR finds recording files. Recordings can be:
   - Single file: `{basename}.wav`
   - Split stereo: `{basename}_in.wav` and `{basename}_out.wav` (when `PBX_SPLIT_AUDIO_THREAD=1`)

3. **Current Conversion Approach (Synchronous, In-Loop)**: In the `checkBillsecMakeRecFile()` method (lines 270-339), WorkerCDR directly launches wav2webm.sh as a background process:
   ```php
   $wav2webmPath = Util::which('wav2webm.sh');
   $nice = Util::which('nice');

   // Build metadata environment variables
   $metadata = [
       'CALL_LINKEDID' => $row['linkedid'],
       'CALL_SRC_NUM' => $row['src_num'],
       // ... other CDR fields
       'DELETE_SOURCE_FILES' => PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_DELETE_SOURCE_AFTER_CONVERT)
   ];

   // Execute conversion in background
   Processes::mwExecBg("$sh -c '$envVars$nice -n -19 $wav2webmPath \"{$p_info['dirname']}/{$p_info['filename']}\"'", $logFile);
   ```

4. **The wav2webm.sh Script**: Located at `src/Core/System/RootFS/sbin/wav2webm.sh`, this shell script:
   - Accepts a filename without extension as input
   - Merges stereo channels if split files exist (using ffmpeg amerge filter)
   - Detects sample rate with ffprobe (8kHz vs 16kHz+)
   - Selects appropriate Opus bitrate (48k for 8kHz, 64k for 16kHz+)
   - Applies EBU R128 loudness normalization (single-pass mode for speed)
   - Encodes to WebM/Opus format with metadata tags
   - Uses timeout command (120 seconds max)
   - Validates output with ffprobe
   - Optionally deletes source WAV files based on `DELETE_SOURCE_FILES` env var
   - Returns exit codes: 0=success, 1=not found, 2=ffmpeg missing, 3=conversion failed, 4=stereo merge failed, 5=validation failed

5. **CDR Update**: WorkerCDR updates the CDR database with:
   - `recordingfile` path changed from `.wav` to `.webm`
   - `billsec`, `duration`, `disposition` calculated from timestamps
   - `work_completed=1` to mark as processed
   - Data published to `UPDATE_CDR_TUBE` Beanstalk queue

**Why This Needs Refactoring:**

The current approach has a critical flaw: WorkerCDR launches conversions immediately as background processes without tracking their state. If the system restarts, MikoPBX cannot resume incomplete conversions because there's no persistent task queue. Additionally, WorkerCDR doesn't monitor conversion failures - if wav2webm.sh fails (exit code 3, 4, or 5), the error is logged but the task is lost forever.

### For New Worker Implementation: Task-Based Conversion Architecture

**The New Approach with JSON Task Files:**

Instead of launching conversions directly, WorkerCDR should create JSON task files in a monitored directory. A dedicated WorkerWav2Webm will process these tasks independently, enabling:
- System restart resilience (unprocessed tasks remain in queue)
- Retry logic for failed conversions
- Independent scaling (worker can run on different interval than CDR processing)
- Better error tracking (failed task files can be analyzed)

**Where It Integrates:**

1. **WorkerCDR Modification** (in `checkBillsecMakeRecFile()` method):
   - Instead of calling `Processes::mwExecBg()`, create a JSON task file:
   ```php
   $monitorDir = Directories::getDir(Directories::AST_MONITOR_DIR);
   $taskFile = $monitorDir . '/conversion-tasks/' . $row['linkedid'] . '_' . uniqid() . '.json';

   $taskData = [
       'linkedid' => $row['linkedid'],
       'src_num' => $row['src_num'],
       'dst_num' => $row['dst_num'],
       'start' => $row['start'],
       'duration' => $row['duration'],
       'billsec' => $billsec,
       'disposition' => $row['disposition'],
       'uniqueid' => $row['UNIQUEID'],
       'input_path' => $p_info['dirname'] . '/' . $p_info['filename'],  // Without extension
       'delete_source' => $deleteSourceFiles,
       'created_at' => time(),
       'attempts' => 0
   ];

   file_put_contents($taskFile, json_encode($taskData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
   ```

2. **Directory Structure**:
   - Tasks directory: `{AST_MONITOR_DIR}/conversion-tasks/` (needs to be created)
   - AST_MONITOR_DIR resolves to: `/mountpoint/mikopbx/astspool/monitor` (see `src/Core/System/Directories.php`, line 75)
   - Typical structure: `/mountpoint/mikopbx/astspool/monitor/YYYY/MM/DD/` for recordings
   - Task files location: `/mountpoint/mikopbx/astspool/monitor/conversion-tasks/*.json`

3. **WorkerWav2Webm Processing**:
   - Extends WorkerBase with custom check interval (60 seconds)
   - Uses RecursiveDirectoryIterator to scan for `*.json` files
   - Implements file locking to prevent race conditions (multiple worker instances)
   - Processes each task by calling wav2webm.sh with metadata environment variables
   - On success: deletes JSON task file
   - On failure: increments `attempts` counter, keeps file for retry (max 3 attempts)
   - After max attempts: renames to `.failed.json` for manual inspection

### Technical Reference Details

#### Worker Base Class Integration

**WorkerBase Structure** (`src/Core/Workers/WorkerBase.php`):
- All workers extend this abstract class implementing WorkerInterface
- Constructor initializes: signal handlers, resource limits, PID file saving
- Key properties:
  - `$needRestart` (bool): Set to true by SIGUSR1 signal for graceful restart
  - `$workerStartTime` (float): Tracks uptime for logging
  - `$maxProc` (int): Number of worker instances (default: 1)
  - `$instanceId` (int): Instance number for worker pools
- Key methods:
  - `start(array $argv): void` - Abstract method, main entry point
  - `static getCheckInterval(): int` - Returns monitoring interval (default: 60s)
  - `signalHandler(int $signal): void` - Handles SIGUSR1 (soft restart), SIGTERM/SIGINT (hard stop)
  - `getPidFile(): string` - Returns path like `/var/run/php-workers/MikoPBX-Core-Workers-WorkerWav2Webm.pid`

**Example Worker with Check Interval** (from WorkerModelsEvents.php, line 118-123):
```php
public static function getCheckInterval(): int
{
    return 5; // Check every 5 seconds
}
```

For WorkerWav2Webm, we should use 60 seconds (1 minute) as specified in requirements.

#### Directory Scanning Patterns

**RecursiveDirectoryIterator Usage** (from WorkerLogRotate.php, lines 131-150):
```php
private function findLogFilesRecursively(string $directory): array
{
    $logFiles = [];

    $iterator = new \RecursiveIteratorIterator(
        new \RecursiveDirectoryIterator($directory, \RecursiveDirectoryIterator::SKIP_DOTS),
        \RecursiveIteratorIterator::LEAVES_ONLY
    );

    foreach ($iterator as $file) {
        if ($file->isFile()) {
            $extension = strtolower($file->getExtension());
            if ($extension === 'json') {  // For our case
                $logFiles[] = $file->getPathname();
            }
        }
    }

    return $logFiles;
}
```

**Important**: Use `SKIP_DOTS` flag to exclude `.` and `..` directories, and `LEAVES_ONLY` mode to get only files, not directories.

#### JSON Task File Operations

**Writing JSON with Atomic Operations** (pattern from PrepareLogAction.php):
```php
$taskFile = $tasksDir . '/' . $taskId . '.json';
file_put_contents($taskFile, json_encode($taskData, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
```

**Reading and Locking JSON Files** (to prevent race conditions):
```php
$fp = fopen($taskFile, 'r+');
if (!$fp) {
    continue; // Skip if can't open
}

// Try to get exclusive lock (non-blocking)
if (!flock($fp, LOCK_EX | LOCK_NB)) {
    fclose($fp);
    continue; // Another worker is processing this
}

// Read and process
$contents = stream_get_contents($fp);
$taskData = json_decode($contents, true);

// Process conversion...

// Delete file on success
fclose($fp);
unlink($taskFile);

// OR update on failure
rewind($fp);
ftruncate($fp, 0);
fwrite($fp, json_encode($updatedData, JSON_PRETTY_PRINT));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);
```

#### Process Execution Patterns

**Util::which() for Command Discovery** (from Util.php, lines 397-413):
```php
public static function which(string $cmd): string
{
    $binaryFolders = $_ENV['PATH'] ?? '/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/bin:/usr/local/sbin';

    foreach (explode(':', $binaryFolders) as $path) {
        if (is_executable("$path/$cmd")) {
            return "$path/$cmd";
        }
    }
    return $cmd; // Fallback to command name
}
```

**Background Process Execution** (from Processes.php):
```php
// For background execution (don't wait for completion)
Processes::mwExecBg($command, $logFile);

// For foreground execution (wait for result)
Processes::mwExec($command, $output);
```

**FFmpeg Execution Pattern** (from WorkerCDR, adapted for worker):
```php
$wav2webmPath = Util::which('wav2webm.sh');
$nice = Util::which('nice');
$sh = Util::which('sh');

// Build environment variables from JSON task data
$envVars = '';
foreach ($taskData as $key => $value) {
    $escapedValue = str_replace("'", "'\\''", $value);
    $envVars .= strtoupper($key) . "='$escapedValue' ";
}

// Execute with nice priority and timeout
$logFile = '/tmp/wav2webm_' . $taskData['linkedid'] . '.log';
$command = "$sh -c '$envVars$nice -n -19 $wav2webmPath \"{$taskData['input_path']}\"'";

// Execute and capture exit code
$output = [];
Processes::mwExec($command . " > $logFile 2>&1", $output);
$exitCode = $output['exit_code'] ?? 1;

// Check exit code for errors
// 0 = success, 1 = file not found, 2 = ffmpeg missing, 3 = conversion failed,
// 4 = stereo merge failed, 5 = validation failed
```

#### Worker Registration with Supervisor

**WorkerSafeScriptsCore Registration** (`src/Core/Workers/Cron/WorkerSafeScriptsCore.php`, lines 243-293):

Workers are registered in the `prepareWorkersList()` method by check type:
```php
private function prepareWorkersList(): array
{
    $arrWorkers = [
        self::CHECK_BY_BEANSTALK => [
            WorkerCdr::class,
            WorkerCallEvents::class,
            WorkerModelsEvents::class,
            WorkerNotifyByEmail::class,
        ],
        self::CHECK_BY_REDIS => [
            WorkerApiCommands::class,
            WorkerPrepareAdvice::class,
            // ...
        ],
        self::CHECK_BY_PID_NOT_ALERT => [
            WorkerSoundFilesInit::class,
            WorkerLogRotate::class,
            WorkerRemoveOldRecords::class,
            WorkerS3Upload::class,
            // ADD WorkerWav2Webm HERE
        ],
    ];
    return $arrWorkers;
}
```

**Important**: WorkerWav2Webm should use `CHECK_BY_PID_NOT_ALERT` type because it's a simple periodic task worker that doesn't need Beanstalk queue communication (unlike WorkerCDR).

**Check Types Explained**:
- `CHECK_BY_BEANSTALK`: Workers that subscribe to Beanstalk queues, monitored via ping/pong messages
- `CHECK_BY_REDIS`: Redis-based workers, checked via heartbeat keys
- `CHECK_BY_AMI`: Asterisk Manager Interface workers
- `CHECK_BY_PID_NOT_ALERT`: Simple workers monitored only by PID file existence (no active health checks)

#### Logging Patterns

**SystemMessages Usage** (from WorkerS3Upload.php, lines 88-104):
```php
SystemMessages::sysLogMsg(
    __CLASS__,
    sprintf('Worker started (PID:%d)', getmypid()),
    LOG_INFO
);

SystemMessages::sysLogMsg(
    __CLASS__,
    'Low disk space detected - emergency upload triggered',
    LOG_WARNING
);

SystemMessages::sysLogMsg(
    __CLASS__,
    sprintf('Worker error: %s', $e->getMessage()),
    LOG_ERR
);
```

**Log Levels**:
- `LOG_DEBUG`: Verbose debugging information
- `LOG_INFO`: Normal operational messages
- `LOG_NOTICE`: Significant events (worker started/stopped)
- `LOG_WARNING`: Warning conditions (failed conversions, retries)
- `LOG_ERR`: Error conditions (critical failures)

#### Configuration and Settings

**Directories Class** (`src/Core/System/Directories.php`):
```php
// Get monitor directory path
$monitorDir = Directories::getDir(Directories::AST_MONITOR_DIR);
// Returns: /mountpoint/mikopbx/astspool/monitor

// Constants available:
public const string AST_MONITOR_DIR = 'asterisk.monitordir';
public const string CORE_TEMP_DIR = 'core.tempDir';
public const string CORE_LOGS_DIR = 'core.logsDir';
```

**PbxSettings Access**:
```php
// Get setting value
$deleteSources = PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_DELETE_SOURCE_AFTER_CONVERT);
// Returns: '1' or '0' as string

// Relevant settings:
// PBX_RECORD_DELETE_SOURCE_AFTER_CONVERT - Delete WAV after WebM conversion
// PBX_RECORD_SAVE_PERIOD - Total retention period (90 days default)
```

#### File Locations for Implementation

**New Worker Class**:
- Path: `src/Core/Workers/WorkerWav2Webm.php`
- Namespace: `MikoPBX\Core\Workers`
- Extends: `WorkerBase`
- Entry point at bottom: `WorkerWav2Webm::startWorker($argv ?? []);`

**Registration**:
- Modify: `src/Core/Workers/Cron/WorkerSafeScriptsCore.php`
- Add to: `CHECK_BY_PID_NOT_ALERT` array in `prepareWorkersList()` method

**WorkerCDR Modification**:
- Modify: `src/Core/Workers/WorkerCdr.php`
- Method: `checkBillsecMakeRecFile()` (around line 270)
- Replace: Direct `Processes::mwExecBg()` call with JSON task file creation

**Task Directory**:
- Location: `/mountpoint/mikopbx/astspool/monitor/conversion-tasks/`
- Needs: Directory creation check in worker constructor or first run
- Pattern: Use `Util::mwMkdir()` for directory creation with permissions

#### Error Handling Strategy

**Retry Logic Pattern**:
```php
private const int MAX_ATTEMPTS = 3;
private const int RETRY_DELAY_SECONDS = 300; // 5 minutes

private function shouldRetryTask(array $taskData): bool
{
    $attempts = $taskData['attempts'] ?? 0;

    if ($attempts >= self::MAX_ATTEMPTS) {
        return false; // Give up after 3 attempts
    }

    // Check if enough time has passed since last attempt
    $lastAttempt = $taskData['last_attempt_at'] ?? 0;
    if (time() - $lastAttempt < self::RETRY_DELAY_SECONDS) {
        return false; // Too soon to retry
    }

    return true;
}

private function handleFailedTask(string $taskFile, array $taskData, int $exitCode): void
{
    $taskData['attempts'] = ($taskData['attempts'] ?? 0) + 1;
    $taskData['last_attempt_at'] = time();
    $taskData['last_error_code'] = $exitCode;

    if ($taskData['attempts'] >= self::MAX_ATTEMPTS) {
        // Move to failed directory
        $failedFile = str_replace('.json', '.failed.json', $taskFile);
        rename($taskFile, $failedFile);

        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf('Task failed after %d attempts: %s', self::MAX_ATTEMPTS, basename($taskFile)),
            LOG_ERR
        );
    } else {
        // Update task file for retry
        file_put_contents($taskFile, json_encode($taskData, JSON_PRETTY_PRINT));

        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf('Task retry scheduled (attempt %d/%d): %s', $taskData['attempts'], self::MAX_ATTEMPTS, basename($taskFile)),
            LOG_WARNING
        );
    }
}
```

#### Worker Main Loop Pattern

**Typical Structure** (based on WorkerS3Upload and WorkerRemoveOldRecords):
```php
public function start(array $argv): void
{
    SystemMessages::sysLogMsg(__CLASS__, 'Worker started', LOG_NOTICE);

    // Initialize
    $this->ensureTaskDirectoryExists();

    // Main loop
    while ($this->needRestart === false) {
        pcntl_signal_dispatch(); // Handle signals

        try {
            $this->processConversionTasks();
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(__CLASS__, 'Error: ' . $e->getMessage(), LOG_ERR);
        }

        sleep(60); // Wait 1 minute between iterations
    }

    SystemMessages::sysLogMsg(__CLASS__, 'Worker stopped', LOG_NOTICE);
}

private function processConversionTasks(): void
{
    $tasksDir = Directories::getDir(Directories::AST_MONITOR_DIR) . '/conversion-tasks';

    if (!is_dir($tasksDir)) {
        return;
    }

    // Find all JSON task files
    $taskFiles = $this->findTaskFiles($tasksDir);

    foreach ($taskFiles as $taskFile) {
        if ($this->needRestart) {
            break; // Graceful shutdown requested
        }

        $this->processTaskFile($taskFile);
    }
}
```

### Summary: Implementation Checklist

**Changes Required**:

1. **Create WorkerWav2Webm.php**:
   - Extend WorkerBase
   - Implement `getCheckInterval()` returning 60
   - Implement `start()` with main processing loop
   - Add recursive JSON file scanner
   - Add task processing with file locking
   - Add retry logic with attempt counter
   - Add error handling for all wav2webm.sh exit codes

2. **Modify WorkerCdr.php**:
   - In `checkBillsecMakeRecFile()` method
   - Replace direct wav2webm.sh execution with JSON task file creation
   - Ensure task directory exists
   - Generate unique task filename (linkedid + uniqid)

3. **Register in WorkerSafeScriptsCore.php**:
   - Add `WorkerWav2Webm::class` to `CHECK_BY_PID_NOT_ALERT` array
   - No other changes needed (supervisor auto-detects check interval)

4. **Testing**:
   - Verify task file creation after call completion
   - Verify worker picks up and processes tasks
   - Test retry logic with intentionally broken conversion
   - Test graceful shutdown (SIGUSR1 signal)
   - Test system restart with pending tasks

## User Notes
<!-- Any specific notes or requirements from the developer -->

## Work Log
<!-- Updated as work progresses -->
- [YYYY-MM-DD] Started task, initial research
