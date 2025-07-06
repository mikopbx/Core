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
4. **PID Workers** - Simple workers monitored by process ID

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

### 1. Queue-based Worker (Beanstalk)

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

### 2. Event-driven Worker (Models)

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

### 3. Redis-based Worker with Pool Support

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

## Best Practices

1. **Always handle signals** for graceful shutdown
2. **Implement ping callbacks** for monitoring
3. **Use state persistence** for critical workers
4. **Log important operations** but avoid excessive logging
5. **Set appropriate timeouts** to prevent hanging
6. **Clean up resources** in signal handlers
7. **Use worker pools** for high-throughput operations
8. **Monitor memory usage** and restart if needed
9. **Handle errors gracefully** with retry logic
10. **Test worker resilience** with chaos testing

## Debugging Workers

```bash
# Check worker status
ps aux | grep WorkerApiCommands

# Monitor worker logs
tail -f /var/log/mikopbx/system.log | grep WorkerApiCommands

# Check Redis queues
redis-cli llen api:requests

# Manually restart worker
php -f /usr/www/src/Core/Workers/WorkerApiCommands.php restart

# Test worker with specific instance
php -f /usr/www/src/Core/Workers/WorkerApiCommands.php start --instance-id=2
```

## Common Issues and Solutions

1. **Worker not starting**: Check PID files in `/var/run/php-workers/`
2. **High CPU usage**: Add appropriate sleep() in main loop
3. **Memory leaks**: Implement periodic restart or memory monitoring
4. **Queue backlog**: Increase worker pool size (maxProc)
5. **Stale jobs**: Implement job TTL and cleanup mechanisms