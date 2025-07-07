<?php

namespace MikoPBX\Core\Workers\Pool;

use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\Injectable;
use Redis;

/**
 * Manages worker pools through Redis for better tracking and control
 */
class WorkerPoolManager extends Injectable
{
    private const string REDIS_PREFIX = 'worker:pool:';
    private const string REDIS_REGISTRY = 'worker:registry';
    private const int WORKER_TTL = 300; // 5 minutes TTL for worker heartbeat
    
    private Redis $redis;
    
    public function __construct()
    {
        $this->redis = $this->di->get(RedisClientProvider::SERVICE_NAME);
    }
    
    /**
     * Register a worker in the pool
     *
     * @param string $workerClass
     * @param int $pid
     * @param int $instanceId
     * @return string Worker key
     */
    public function registerWorker(string $workerClass, int $pid, int $instanceId = 1): string
    {
        $workerKey = $this->generateWorkerKey($workerClass, $pid);
        
        $workerData = [
            'class' => $workerClass,
            'pid' => $pid,
            'instance_id' => $instanceId,
            'start_time' => time(),
            'last_heartbeat' => time(),
            'status' => 'running',
            'hostname' => gethostname(),
            'memory_usage' => memory_get_usage(true),
            'peak_memory' => memory_get_peak_usage(true)
        ];
        
        // Store worker data with TTL
        $this->redis->hSet(
            self::REDIS_PREFIX . $workerClass,
            $workerKey,
            json_encode($workerData)
        );
        
        // Add to global registry
        $this->redis->sAdd(self::REDIS_REGISTRY, $workerClass);
        
        // Set expiration for the worker entry
        $this->redis->expire(self::REDIS_PREFIX . $workerClass . ':' . $workerKey, self::WORKER_TTL);
        
        SystemMessages::sysLogMsg(
            __CLASS__,
            "Registered worker: $workerClass (PID: $pid, Instance: $instanceId)",
            LOG_DEBUG
        );
        
        return $workerKey;
    }
    
    /**
     * Update worker heartbeat
     *
     * @param string $workerClass
     * @param int $pid
     * @return bool
     */
    public function updateHeartbeat(string $workerClass, int $pid): bool
    {
        $workerKey = $this->generateWorkerKey($workerClass, $pid);
        $data = $this->redis->hGet(self::REDIS_PREFIX . $workerClass, $workerKey);
        
        if (!$data) {
            return false;
        }
        
        $workerData = json_decode($data, true);
        $workerData['last_heartbeat'] = time();
        $workerData['memory_usage'] = memory_get_usage(true);
        $workerData['peak_memory'] = memory_get_peak_usage(true);
        
        $this->redis->hSet(
            self::REDIS_PREFIX . $workerClass,
            $workerKey,
            json_encode($workerData)
        );
        
        // Refresh TTL
        $this->redis->expire(self::REDIS_PREFIX . $workerClass . ':' . $workerKey, self::WORKER_TTL);
        
        return true;
    }
    
    /**
     * Unregister a worker from the pool
     *
     * @param string $workerClass
     * @param int $pid
     * @return bool
     */
    public function unregisterWorker(string $workerClass, int $pid): bool
    {
        $workerKey = $this->generateWorkerKey($workerClass, $pid);
        
        $result = $this->redis->hDel(self::REDIS_PREFIX . $workerClass, $workerKey);
        
        // Check if this was the last worker of this class
        $remainingWorkers = $this->redis->hLen(self::REDIS_PREFIX . $workerClass);
        if ($remainingWorkers === 0) {
            $this->redis->sRem(self::REDIS_REGISTRY, $workerClass);
        }
        
        SystemMessages::sysLogMsg(
            __CLASS__,
            "Unregistered worker: $workerClass (PID: $pid)",
            LOG_DEBUG
        );
        
        return $result > 0;
    }
    
    /**
     * Get all active workers for a class
     *
     * @param string $workerClass
     * @return array
     */
    public function getActiveWorkers(string $workerClass): array
    {
        $workers = [];
        $data = $this->redis->hGetAll(self::REDIS_PREFIX . $workerClass);
        
        foreach ($data as $key => $workerJson) {
            $workerData = json_decode($workerJson, true);
            if ($workerData && $this->isWorkerAlive($workerData)) {
                $workers[] = $workerData;
            } else {
                // Clean up dead worker
                $this->redis->hDel(self::REDIS_PREFIX . $workerClass, $key);
            }
        }
        
        // Sort by instance_id for consistent ordering
        usort($workers, function($a, $b) {
            return $a['instance_id'] <=> $b['instance_id'];
        });
        
        return $workers;
    }
    
    /**
     * Get count of active workers for a class
     *
     * @param string $workerClass
     * @return int
     */
    public function getActiveWorkersCount(string $workerClass): int
    {
        return count($this->getActiveWorkers($workerClass));
    }
    
    /**
     * Find and clean orphan processes
     *
     * @param string $workerClass
     * @return array List of killed PIDs
     */
    public function cleanOrphanProcesses(string $workerClass): array
    {
        $killedPids = [];
        
        // Get all registered workers
        $registeredWorkers = $this->getActiveWorkers($workerClass);
        $registeredPids = array_column($registeredWorkers, 'pid');
        
        // Get all running processes
        $className = str_replace('\\', '-', $workerClass);
        $cmd = "ps aux | grep '$className' | grep -v grep | awk '{print \$2}'";
        $output = [];
        exec($cmd, $output);
        
        $runningPids = array_map('intval', array_filter($output));
        
        // Find orphans (running but not registered)
        $orphanPids = array_diff($runningPids, $registeredPids);
        
        foreach ($orphanPids as $pid) {
            if ($pid > 0 && posix_kill($pid, 0)) { // Check if process exists
                posix_kill($pid, SIGTERM);
                $killedPids[] = $pid;
                
                SystemMessages::sysLogMsg(
                    __CLASS__,
                    "Killed orphan process: $workerClass (PID: $pid)",
                    LOG_WARNING
                );
            }
        }
        
        return $killedPids;
    }
    
    /**
     * Get the next available instance ID for a worker class
     *
     * @param string $workerClass
     * @return int
     */
    public function getNextInstanceId(string $workerClass): int
    {
        $workers = $this->getActiveWorkers($workerClass);
        $usedIds = array_column($workers, 'instance_id');
        
        // Find the first available ID starting from 1
        for ($i = 1; $i <= 100; $i++) {
            if (!in_array($i, $usedIds)) {
                return $i;
            }
        }
        
        return 1; // Fallback
    }
    
    /**
     * Check if a specific worker is alive
     *
     * @param string $workerClass
     * @param int $pid
     * @return bool
     */
    public function isWorkerRegistered(string $workerClass, int $pid): bool
    {
        $workerKey = $this->generateWorkerKey($workerClass, $pid);
        return $this->redis->hExists(self::REDIS_PREFIX . $workerClass, $workerKey);
    }
    
    /**
     * Clean all dead workers from Redis
     *
     * @return int Number of cleaned workers
     */
    public function cleanDeadWorkers(): int
    {
        $cleaned = 0;
        $workerClasses = $this->redis->sMembers(self::REDIS_REGISTRY);
        
        foreach ($workerClasses as $workerClass) {
            $data = $this->redis->hGetAll(self::REDIS_PREFIX . $workerClass);
            
            foreach ($data as $key => $workerJson) {
                $workerData = json_decode($workerJson, true);
                if (!$workerData || !$this->isWorkerAlive($workerData)) {
                    $this->redis->hDel(self::REDIS_PREFIX . $workerClass, $key);
                    $cleaned++;
                }
            }
            
            // Remove class from registry if no workers left
            if ($this->redis->hLen(self::REDIS_PREFIX . $workerClass) === 0) {
                $this->redis->sRem(self::REDIS_REGISTRY, $workerClass);
            }
        }
        
        return $cleaned;
    }
    
    /**
     * Generate a unique worker key
     *
     * @param string $workerClass
     * @param int $pid
     * @return string
     */
    private function generateWorkerKey(string $workerClass, int $pid): string
    {
        return sprintf('%s:%d:%s', gethostname(), $pid, $workerClass);
    }
    
    /**
     * Check if worker is alive based on heartbeat and process
     *
     * @param array $workerData
     * @return bool
     */
    private function isWorkerAlive(array $workerData): bool
    {
        // Check heartbeat timeout
        if (time() - $workerData['last_heartbeat'] > self::WORKER_TTL) {
            return false;
        }
        
        // Check if process is still running
        if (!posix_kill($workerData['pid'], 0)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Update worker status
     *
     * @param string $workerClass
     * @param int $pid
     * @param string $status
     * @return bool
     */
    public function updateWorkerStatus(string $workerClass, int $pid, string $status): bool
    {
        $workerKey = $this->generateWorkerKey($workerClass, $pid);
        $data = $this->redis->hGet(self::REDIS_PREFIX . $workerClass, $workerKey);
        
        if (!$data) {
            return false;
        }
        
        $workerData = json_decode($data, true);
        $workerData['status'] = $status;
        
        $this->redis->hSet(
            self::REDIS_PREFIX . $workerClass,
            $workerKey,
            json_encode($workerData)
        );
        
        return true;
    }
}