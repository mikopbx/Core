# CLAUDE.md - MikoPBX Workers Development

This file provides guidance to Claude Code (claude.ai/code) for worker system development in MikoPBX.

## Worker System Architecture Overview

MikoPBX uses a sophisticated worker system for background processing with:

1. **WorkerBase** - Base class for all workers with common functionality
2. **WorkerSafeScriptsCore** - Master supervisor that monitors and manages all workers
3. **Queue-based Workers** - Process jobs from Beanstalk/Redis queues
4. **Event-driven Workers** - React to system events and model changes
5. **Process Management** - Handles worker lifecycle, monitoring, and restarts

### Worker Types

1. **Beanstalk Workers** - Process jobs from Beanstalk queues (CDR, Call Events)
2. **Redis Workers** - Process jobs from Redis queues (API Commands)
3. **AMI Workers** - Listen to Asterisk Manager Interface events
4. **PID Workers** - Simple workers monitored by process ID (Log Rotation, S3 Upload, WAV to WebM Conversion)
5. **File-based Task Workers** - Process JSON task files from filesystem (WAV to WebM Conversion)

## Core Components

### 1. WorkerBase

All workers extend this base class:

```php
abstract class WorkerBase
{
    // Worker must implement start method
    abstract public function start(array $argv): void;
    
    // Common functionality
    protected function makePingTubeName(string $workerClassName): string
    {
        return str_replace("\\", '-', $workerClassName) . '-ping';
    }
    
    // Graceful shutdown handling
    public function signalHandler(int $signal): void
    {
        switch ($signal) {
            case SIGUSR1: // Soft restart
                $this->needRestart = true;
                break;
            case SIGTERM: // Terminate
            case SIGINT:
                exit(0);
        }
    }
}
```

### 2. WorkerSafeScriptsCore (Supervisor)

The master supervisor that monitors all workers:

```php
class WorkerSafeScriptsCore extends WorkerBase
{
    // Worker check methods
    public const CHECK_BY_BEANSTALK = 'checkWorkerBeanstalk';
    public const CHECK_BY_AMI = 'checkWorkerAMI';
    public const CHECK_BY_PID_NOT_ALERT = 'checkPidNotAlert';
    public const CHECK_BY_REDIS = 'checkWorkerRedis';
    
    // Main monitoring loop
    public function start(array $argv): void
    {
        PBX::waitFullyBooted();
        
        while (true) {
            $arrWorkers = $this->prepareWorkersList();
            
            // Check workers using PHP Fibers for parallel execution
            $tasks = [];
            foreach ($arrWorkers as $workerType => $workers) {
                foreach ($workers as $worker) {
                    if ($this->shouldCheckWorker($worker)) {
                        $tasks[] = match($workerType) {
                            self::CHECK_BY_BEANSTALK => fn() => $this->checkWorkerBeanstalk($worker),
                            self::CHECK_BY_REDIS => fn() => $this->checkWorkerRedis($worker),
                            // ... other check methods
                        };
                    }
                }
            }
            
            $this->executeParallel($tasks);
            sleep(5);
        }
    }
}
```

### 3. Process Management (Processes.php)

Handles worker process lifecycle:

```php
class Processes
{
    // Start/restart PHP worker
    public static function processPHPWorker(
        string $className,
        string $paramForPHPWorker = 'start',
        string $action = 'restart'
    ): void {
        // Get maxProc from worker class
        $neededProcCount = 1;
        if (class_exists($className)) {
            $reflectionClass = new \ReflectionClass($className);
            $defaultProperties = $reflectionClass->getDefaultProperties();
            $neededProcCount = $defaultProperties['maxProc'] ?? 1;
        }
        
        // Handle worker pool instances
        if ($neededProcCount > 1) {
            for ($i = 1; $i <= $neededProcCount; $i++) {
                $instanceParam = " --instance-id={$i}";
                self::mwExecBg("{$command} {$paramForPHPWorker}{$instanceParam}");
            }
        }
    }
    
    // Restart all workers
    public static function restartAllWorkers(bool $softRestart = false): void
    {
        $restartMode = $softRestart ? 'soft-restart' : 'restart';
        $workerSafeScripts = "$php -f $workerSafeScriptsPath $restartMode";
        self::mwExec($workerSafeScripts);
    }
}
```

## Worker Implementation Patterns

### 1. File-based Task Worker (JSON)

Example: WorkerWav2Webm processes conversion tasks from JSON files:

```php
class WorkerWav2Webm extends WorkerBase
{
    private const int MAX_ATTEMPTS = 3;
    private const int RETRY_DELAY_SECONDS = 300;
    private const int FFMPEG_TIMEOUT = 300;

    public static function getCheckInterval(): int
    {
        return 5; // Fast processing for conversion tasks
    }

    public function start(array $argv): void
    {
        // Set lowest CPU priority
        if (function_exists('proc_nice')) {
            proc_nice(19);
        }

        $this->ensureTaskDirectoryExists();

        while ($this->needRestart === false) {
            pcntl_signal_dispatch();

            try {
                $this->processConversionTasks();
            } catch (Throwable $e) {
                SystemMessages::sysLogMsg(__CLASS__, $e->getMessage(), LOG_ERR);
            }

            sleep(5);
        }
    }

    private function processConversionTasks(): void
    {
        $monitorDir = Directories::getDir(Directories::AST_MONITOR_DIR);
        $tasksDir = $monitorDir . '/conversion-tasks';

        if (!is_dir($tasksDir)) {
            return;
        }

        // Find JSON task files recursively
        $taskFiles = $this->findTaskFiles($tasksDir);

        foreach ($taskFiles as $taskFile) {
            if ($this->needRestart) {
                break;
            }

            $this->processTaskFile($taskFile);
        }
    }

    private function processTaskFile(string $taskFile): void
    {
        // Try to get exclusive lock (non-blocking)
        $fp = fopen($taskFile, 'r+');
        if (!$fp || !flock($fp, LOCK_EX | LOCK_NB)) {
            if ($fp) fclose($fp);
            return; // Another worker is processing this
        }

        try {
            // Read and parse task
            $contents = stream_get_contents($fp);
            $taskData = json_decode($contents, true, 512, JSON_THROW_ON_ERROR);

            // Check retry logic
            if (!$this->shouldRetryTask($taskData)) {
                flock($fp, LOCK_UN);
                fclose($fp);
                return;
            }

            // Execute conversion with timeout protection
            $exitCode = $this->executeConversion($taskData);

            if ($exitCode === 0) {
                // Success - delete task file
                flock($fp, LOCK_UN);
                fclose($fp);
                unlink($taskFile);
            } else {
                // Failure - handle retry or mark as failed
                $this->handleFailedTask($taskFile, $taskData, $exitCode, $fp);
            }
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(__CLASS__, $e->getMessage(), LOG_ERR);
            flock($fp, LOCK_UN);
            fclose($fp);
        }
    }
}
```

**JSON Task File Format:**
```json
{
    "linkedid": "1699876543.123",
    "src_num": "201",
    "dst_num": "202",
    "start": "2024-11-13 10:30:00",
    "duration": "120",
    "billsec": "115",
    "disposition": "ANSWERED",
    "uniqueid": "1699876543.123",
    "input_path": "/storage/usbdisk1/mikopbx/astspool/monitor/2024/11/13/out-201-202-20241113-103000",
    "delete_source": "1",
    "created_at": 1699876543,
    "attempts": 0
}
```

**Key Features:**
- File-based locking prevents race conditions in multi-worker scenarios
- Retry logic with exponential backoff (3 attempts, 5-minute delay)
- Timeout protection to prevent FFmpeg from hanging (300 seconds)
- Failed tasks renamed to `.failed.json` for manual inspection
- Lowest CPU priority (nice +19) to avoid impacting call processing
- Registered as CHECK_BY_PID_NOT_ALERT (simple periodic task)

### 2. Queue-based Worker (Beanstalk)

Example: WorkerCdr processes CDR events from Beanstalk queue:

```php
class WorkerCdr extends WorkerBase
{
    public function start(array $argv): void
    {
        $client = new BeanstalkClient(self::class);
        
        // Subscribe to queue
        $client->subscribe(self::class, [$this, 'processCDREvent']);
        $client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);
        
        // Main loop
        while ($this->needRestart === false) {
            $client->wait();
        }
    }
    
    public function processCDREvent(BeanstalkClient $message): void
    {
        $data = json_decode($message->getBody(), true);
        // Process CDR data...
    }
    
    public function pingCallBack(BeanstalkClient $message): void
    {
        $message->reply($message->getBody() . ':pong');
    }
}
```

### 3. Event-driven Worker (Models)

Example: WorkerModelsEvents reacts to model changes:

```php
class WorkerModelsEvents extends WorkerBase
{
    private array $plannedReloadActions = [];
    private int $last_change;
    
    public function start(array $argv): void
    {
        $this->initializeWorker();
        $this->subscribeToEvents();
        $this->waitForEvents();
    }
    
    private function waitForEvents(): void
    {
        while ($this->needRestart === false) {
            pcntl_signal_dispatch();
            $this->beanstalkClient->wait(1);
            $this->startReload(); // Execute planned actions
        }
        
        // Save state before exit
        $this->saveStateToRedis();
    }
    
    public function processModelChanges(BeanstalkClient $message): void
    {
        $data = json_decode($message->getBody(), true);
        
        if ($data['source'] === 'invoke_action') {
            $this->planReloadAction($data['action'], $data['parameters']);
        } elseif ($data['source'] === 'models_changed') {
            $this->fillModifiedTables($data);
        }
    }
    
    // State persistence for graceful restarts
    private function saveStateToRedis(): void
    {
        $state = [
            'plannedReloadActions' => $this->plannedReloadActions,
            'last_change' => $this->last_change,
            'timestamp' => time()
        ];
        
        $this->managedCache->set($workerKey, $state, self::REDIS_TTL);
    }
}
```

### 4. Redis-based Worker with Pool Support

Example: WorkerApiCommands with multiple instances:

```php
class WorkerApiCommands extends WorkerRedisBase
{
    // Support for multiple worker instances
    public int $maxProc = 3;
    
    public function start(array $argv): void
    {
        // Log instance information
        SystemMessages::sysLogMsg(
            static::class,
            sprintf("Worker instance started: ID=%d, PID=%d", $this->instanceId, getmypid()),
            LOG_NOTICE
        );
        
        while (!$this->isShuttingDown) {
            // Get job from Redis queue
            $result = $this->redis->blpop([self::REDIS_API_QUEUE], 5);
            
            if (!is_array($result)) {
                continue;
            }
            
            [$queue, $requestData] = $result;
            
            // Log which worker takes the job
            SystemMessages::sysLogMsg(
                static::class,
                sprintf("Worker #%d (PID:%d) taking job: %s", $this->instanceId, getmypid(), $jobId),
                LOG_DEBUG
            );
            
            // Process job
            $this->processJobDirect($jobId, $requestData);
        }
    }
    
    // Handle job with retry mechanism
    private function shouldProcessJob(string $jobId): bool
    {
        $attemptKey = self::REDIS_JOB_ATTEMPTS_PREFIX . $jobId;
        $attempts = (int)$this->redis->get($attemptKey) + 1;
        
        if ($attempts > self::MAX_JOB_ATTEMPTS) {
            $this->handleFailedJob($jobId);
            return false;
        }
        
        $this->redis->setex($attemptKey, self::FAILED_JOB_TTL, (string)$attempts);
        return true;
    }
}
```

## Creating a New Worker

### 1. Basic Worker Structure

```php
namespace MikoPBX\Core\Workers;

require_once 'Globals.php';

class WorkerMyFeature extends WorkerBase
{
    // Set maxProc for worker pool (optional)
    public int $maxProc = 1;
    
    // Get check interval for monitoring (optional)
    public static function getCheckInterval(): int
    {
        return 30; // Check every 30 seconds
    }
    
    public function start(array $argv): void
    {
        // Parse instance ID for pool support
        $options = getopt('', ['instance-id:']);
        $this->instanceId = isset($options['instance-id']) ? (int)$options['instance-id'] : 1;
        
        // Initialize resources
        $this->initializeWorker();
        
        // Main processing loop
        while ($this->needRestart === false) {
            pcntl_signal_dispatch();
            
            // Your processing logic here
            $this->processWork();
            
            // Sleep to prevent CPU hogging
            sleep(1);
        }
    }
    
    private function processWork(): void
    {
        // Implement your logic
    }
}

// Start the worker
WorkerMyFeature::startWorker($argv ?? []);
```

### 2. Queue-based Worker

```php
class WorkerQueueProcessor extends WorkerBase
{
    private BeanstalkClient $client;
    
    public function start(array $argv): void
    {
        $this->client = new BeanstalkClient(self::class);
        
        // Subscribe to queues
        $this->client->subscribe(self::class, [$this, 'processJob']);
        $this->client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);
        
        // Wait for jobs
        while ($this->needRestart === false) {
            $this->client->wait();
        }
    }
    
    public function processJob(BeanstalkClient $message): void
    {
        try {
            $data = json_decode($message->getBody(), true);
            
            // Process the job
            $this->handleJob($data);
            
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
        }
    }
    
    public function pingCallBack(BeanstalkClient $message): void
    {
        $message->reply($message->getBody() . ':pong');
    }
}
```

### 3. Register Worker with Supervisor

Add your worker to `WorkerSafeScriptsCore::prepareWorkersList()`:

```php
private function prepareWorkersList(): array
{
    $arrWorkers = [
        self::CHECK_BY_BEANSTALK => [
            WorkerCdr::class,
            WorkerCallEvents::class,
            WorkerMyFeature::class, // Your new worker
        ],
        // ... other worker types
    ];
    
    return $arrWorkers;
}
```

## Worker Monitoring and Management

### 1. Check Methods

Different worker types use different monitoring methods:

- **Beanstalk Workers**: Send ping through queue, expect pong response
- **Redis Workers**: Check heartbeat and status keys
- **AMI Workers**: Use Asterisk Manager Interface UserEvent
- **PID Workers**: Simple process existence check

### 2. Worker Pool Management

For workers with `maxProc > 1`:

```php
private function checkWorkerPool(string $workerClassName, int $targetCount): void
{
    $runningInstances = [];
    
    // Check all instances
    for ($i = 1; $i <= $targetCount; $i++) {
        $pidFile = Processes::getPidFilePath($workerClassName, $i);
        if (file_exists($pidFile)) {
            $pid = trim(file_get_contents($pidFile));
            if (!empty($pid) && posix_kill((int)$pid, 0)) {
                $runningInstances[$i] = (int)$pid;
            }
        }
    }
    
    // Start missing instances
    for ($i = 1; $i <= $targetCount; $i++) {
        if (!isset($runningInstances[$i])) {
            $command = "$php -f $workerPath start --instance-id=$i";
            shell_exec($command);
        }
    }
}
```

### 3. Graceful Restart

Workers support two restart modes:

1. **Soft Restart** (SIGUSR1): Worker completes current job and exits
2. **Hard Restart** (SIGTERM): Immediate termination

```php
// Soft restart all workers
Processes::restartAllWorkers(true);

// Hard restart all workers
Processes::restartAllWorkers(false);
```

## State Persistence

Workers can save and restore state for graceful restarts:

```php
// Save state to Redis
private function saveStateToRedis(): void
{
    $state = [
        'plannedActions' => $this->plannedActions,
        'lastProcessed' => $this->lastProcessed,
        'timestamp' => time()
    ];
    
    $this->redis->set($workerKey, json_encode($state), self::REDIS_TTL);
}

// Restore state from Redis
private function restoreStateFromRedis(): void
{
    $state = $this->redis->get($workerKey);
    if ($state) {
        $data = json_decode($state, true);
        $this->plannedActions = $data['plannedActions'] ?? [];
        $this->lastProcessed = $data['lastProcessed'] ?? 0;
    }
}
```

## Error Handling and Resilience

### 1. Job Retry Mechanism

```php
private function shouldProcessJob(string $jobId): bool
{
    $attempts = (int)$this->redis->get("job:attempts:$jobId") + 1;
    
    if ($attempts > self::MAX_ATTEMPTS) {
        $this->handleFailedJob($jobId);
        return false;
    }
    
    $this->redis->setex("job:attempts:$jobId", 3600, $attempts);
    return true;
}
```

### 2. Error Logging

```php
try {
    // Worker logic
} catch (Throwable $e) {
    CriticalErrorsHandler::handleExceptionWithSyslog($e);
    
    // Optional: Store error for analysis
    $this->redis->hSet(
        "worker:errors",
        $jobId,
        json_encode([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
            'time' => time()
        ])
    );
}
```

## Performance Optimization

### 1. Parallel Processing with Fibers

```php
private function executeParallel(array $tasks): void 
{
    $fibers = [];
    
    // Create fibers for each task
    foreach ($tasks as $task) {
        $fiber = new Fiber($task);
        $fibers[] = $fiber;
        $fiber->start();
    }
    
    // Resume fibers until all complete
    while (!empty($fibers)) {
        foreach ($fibers as $index => $fiber) {
            if ($fiber->isTerminated()) {
                unset($fibers[$index]);
                continue;
            }
            
            if ($fiber->isSuspended()) {
                $fiber->resume();
            }
        }
    }
}
```

### 2. Worker Pool Sizing

```php
// Determine optimal worker count based on system resources
$cpuCount = (int)shell_exec('nproc');
$optimalWorkers = min($cpuCount * 2, 8); // 2x CPU cores, max 8

// Set in worker class
public int $maxProc = 4; // Or calculated value
```

## Module Integration

Modules can register their own workers:

```php
// In module's SystemConfigInterface implementation
public function getModuleWorkers(): array
{
    return [
        [
            'type' => WorkerSafeScriptsCore::CHECK_BY_BEANSTALK,
            'worker' => ModuleWorkerClass::class
        ]
    ];
}
```

## Worker Communication Patterns

### JSON Task File Pattern (WorkerCdr → WorkerWav2Webm)

WorkerCdr creates JSON task files that WorkerWav2Webm processes asynchronously:

**Task Creation (WorkerCdr):**
```php
// In WorkerCdr::checkBillsecMakeRecFile()
$monitorDir = Directories::getDir(Directories::AST_MONITOR_DIR);
$tasksDir = $monitorDir . '/conversion-tasks';

// Ensure tasks directory exists
if (!is_dir($tasksDir)) {
    Util::mwMkdir($tasksDir, true);
}

// Build task data with metadata
$deleteSourceFiles = PbxSettings::getValueByKey(PbxSettings::PBX_RECORD_DELETE_SOURCE_AFTER_CONVERT);

$taskData = [
    'linkedid' => $row['linkedid'] ?? '',
    'src_num' => $row['src_num'] ?? '',
    'dst_num' => $row['dst_num'] ?? '',
    'start' => $row['start'] ?? '',
    'duration' => $row['duration'] ?? '',
    'billsec' => $billsec,
    'disposition' => $row['disposition'] ?? '',
    'uniqueid' => $row['UNIQUEID'] ?? '',
    'input_path' => $p_info['dirname'] . '/' . $p_info['filename'],
    'delete_source' => $deleteSourceFiles,
    'created_at' => time(),
    'attempts' => 0
];

// Create unique task filename
$taskFile = $tasksDir . '/' . $row['linkedid'] . '_' . uniqid() . '.json';
file_put_contents($taskFile, json_encode($taskData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

// Update recordingfile path to point to WebM file
$row['recordingfile'] = str_replace(['.wav', '.WAV'], '.webm', $row['recordingfile']);
```

**Task Processing (WorkerWav2Webm):**
- Scans `/storage/usbdisk1/mikopbx/astspool/monitor/conversion-tasks/` every 5 seconds
- Uses file locking (`LOCK_EX | LOCK_NB`) to prevent race conditions
- Executes FFmpeg conversion with timeout protection
- On success: deletes task file
- On failure: increments attempt counter, keeps file for retry (max 3 attempts)
- After max attempts: renames to `.failed.json` for manual inspection

**Benefits:**
- System restart resilience (unprocessed tasks remain in queue)
- No blocking - CDR processing continues immediately
- Independent scaling (conversion worker runs on different interval)
- Better error tracking (failed task files can be analyzed)
- Worker crash recovery (tasks not lost)

## Best Practices

1. **Always handle signals** for graceful shutdown
2. **Implement ping callbacks** for monitoring (Beanstalk/Redis workers)
3. **Use state persistence** for critical workers
4. **Log important operations** but avoid excessive logging
5. **Set appropriate timeouts** to prevent hanging (especially FFmpeg/external processes)
6. **Clean up resources** in signal handlers
7. **Use worker pools** for high-throughput operations
8. **Monitor memory usage** and restart if needed
9. **Handle errors gracefully** with retry logic
10. **Test worker resilience** with chaos testing
11. **Use file locking** for file-based task workers to prevent race conditions
12. **Set CPU priority** for resource-intensive workers (nice +19 for low priority)

## Debugging Workers

```bash
# Check worker status
ps aux | grep WorkerApiCommands
ps aux | grep WorkerWav2Webm

# Monitor worker logs
tail -f /var/log/mikopbx/system.log | grep WorkerApiCommands
tail -f /storage/usbdisk1/mikopbx/log/system/messages | grep WorkerWav2Webm

# Check Redis queues
redis-cli llen api:requests

# Check JSON task files
ls -lah /storage/usbdisk1/mikopbx/astspool/monitor/conversion-tasks/
cat /storage/usbdisk1/mikopbx/astspool/monitor/conversion-tasks/*.json

# Check failed conversion tasks
ls -lah /storage/usbdisk1/mikopbx/astspool/monitor/conversion-tasks/*.failed.json

# Manually restart worker
php -f /usr/www/src/Core/Workers/WorkerApiCommands.php restart
php -f /usr/www/src/Core/Workers/WorkerWav2Webm.php restart

# Test worker with specific instance
php -f /usr/www/src/Core/Workers/WorkerApiCommands.php start --instance-id=2

# Test WAV to WebM conversion manually
php -f /usr/www/src/Core/Workers/WorkerWav2Webm.php start
```

## Common Issues and Solutions

1. **Worker not starting**: Check PID files in `/var/run/php-workers/`
2. **High CPU usage**: Add appropriate sleep() in main loop, set CPU priority with proc_nice()
3. **Memory leaks**: Implement periodic restart or memory monitoring
4. **Queue backlog**: Increase worker pool size (maxProc)
5. **Stale jobs**: Implement job TTL and cleanup mechanisms
6. **Conversion tasks stuck**: Check for `.failed.json` files, review FFmpeg timeout settings
7. **File locking issues**: Ensure proper lock release (LOCK_UN) in all code paths
8. **FFmpeg hangs**: Use timeout command wrapper (BusyBox: `timeout -k 10 -s TERM 300 ffmpeg ...`)
9. **Task retry loops**: Verify retry delay logic prevents immediate re-attempts