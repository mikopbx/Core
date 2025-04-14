<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Core\Workers;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckAmiPasswords;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckConnection;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckCorruptedFiles;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckFirewalls;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckSIPPasswords;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckSSHConfig;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckSSHPasswords;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckStorage;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckUpdates;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckWebPasswords;
use MikoPBX\PBXCoreREST\Lib\Advice\GetAdviceListAction;
use Throwable;

require_once 'Globals.php';

/**
 * WorkerPrepareAdvice is a worker class responsible for preparing system advice.
 */
class WorkerPrepareAdvice extends WorkerRedisBase
{

    private const int PROCESS_CHECK_INTERVAL = 100000; // 100ms

    /**
     * Array of advice types with their cache times.
     *
     * @var array
     */
    public const array ARR_ADVICE_TYPES = [
        ['type' => CheckConnection::class, 'cacheTime' => 120, 'priority' => 5],
        ['type' => CheckCorruptedFiles::class, 'cacheTime' => 3600, 'priority' => 5],
        ['type' => CheckWebPasswords::class, 'cacheTime' => 864000, 'priority' => 1],
        ['type' => CheckSSHPasswords::class, 'cacheTime' => 864000, 'priority' => 1],
        ['type' => CheckFirewalls::class, 'cacheTime' => 864000, 'priority' => 1],
        ['type' => CheckSIPPasswords::class, 'cacheTime' => 864000, 'priority' => 9],
        ['type' => CheckAmiPasswords::class, 'cacheTime' => 864000, 'priority' => 9],
        ['type' => CheckStorage::class, 'cacheTime' => 3600, 'priority' => 2],
        ['type' => CheckUpdates::class, 'cacheTime' => 86400, 'priority' => 5],
        ['type' => CheckSSHConfig::class, 'cacheTime' => 3600, 'priority' => 1],
    ];

    // Array of generated advice
    public array $messages;


    /**
     * Get check interval for worker monitoring
     */
    public static function getCheckInterval(): int
    {
        return 15; // Check every 15 seconds§
    }

    /**
     * Starts processing advice types.
     *
     * @param array $argv The command-line arguments passed to the worker.
     *
     * @throws Throwable
     */
    public function start(array $argv): void
    {
        $this->setProcessType(self::PROCESS_TYPES['MAIN']);

        while ($this->needRestart === false) {
            try {
                // Process any pending advice types
                $this->processAdviceTypes();
                
                // Send heartbeat if needed
                $this->checkHeartbeat();
                
                // Process signals
                pcntl_signal_dispatch();
                
                // Short sleep to prevent CPU overuse
                usleep(self::PROCESS_CHECK_INTERVAL);
            } catch (Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
                sleep(1);
            }
        }
    }

    /**
     * Processes advice types with limited parallelism.
     *
     * @return void
     */
    private function processAdviceTypes(): void
    {
        $adviceTypes = self::ARR_ADVICE_TYPES;
        $managedCache = $this->getDI()->getShared(ManagedCacheProvider::SERVICE_NAME);
        $filteredAdviceTypes = [];
        
        // Filter out advice types that don't need processing based on cache status
        foreach ($adviceTypes as $adviceType) {
            $currentAdviceClass = $adviceType['type'];
            $cacheKey = self::getCacheKey($currentAdviceClass);
            
            // Skip if already cached with sufficient TTL
            if ($managedCache->has($cacheKey)) {
                $ttl = $managedCache->getAdapter()->ttl($cacheKey);
                if ($ttl > 60 || $ttl === -1) {
                    // Skip - already cached
                    continue;
                }
            }
            
            // Skip if another process is already handling this advice
            $lockKey = $cacheKey . ':lock';
            if ($managedCache->has($lockKey)) {
                continue;
            }
            
            $filteredAdviceTypes[] = $adviceType;
        }
        
        // If nothing to process, exit early
        if (empty($filteredAdviceTypes)) {
            return;
        }
        
        // Sort advice types by priority (lower number = higher priority)
        usort($filteredAdviceTypes, function($a, $b) {
            return $a['priority'] <=> $b['priority'];
        });
        
        // Maximum number of concurrent worker processes
        $maxWorkers = 3;
        $runningWorkers = [];
        $adviceQueue = $filteredAdviceTypes;
        
        while (!empty($adviceQueue) || !empty($runningWorkers)) {
            // Start new workers if we have capacity
            while (count($runningWorkers) < $maxWorkers && !empty($adviceQueue)) {
                $adviceType = array_shift($adviceQueue);
                SystemMessages::sysLogMsg(__METHOD__, "Starting advice processing: {$adviceType['type']}", LOG_DEBUG);
                
                $pid = pcntl_fork();
                if ($pid == -1) {
                    // Error during fork
                    SystemMessages::sysLogMsg(__METHOD__, "Failed to fork process for {$adviceType['type']}", LOG_ERR);
                } elseif ($pid == 0) {
                    // Child process
                    try {
                        $this->setForked();
                        $this->setProcessType(self::PROCESS_TYPES['WORKER']);
                        $this->processAdvice($adviceType);
                    } catch (Throwable $e) {
                        CriticalErrorsHandler::handleExceptionWithSyslog($e);
                    }
                    exit(0); // Exit the child process
                } else {
                    // Parent process - store worker information
                    $runningWorkers[$pid] = [
                        'type' => $adviceType['type'],
                        'start_time' => microtime(true)
                    ];
                }
            }
            
            // Check if any child has finished
            if (!empty($runningWorkers)) {
                $pid = pcntl_waitpid(-1, $status, WNOHANG);
                if ($pid > 0) {
                    // Worker completed
                    $runtime = microtime(true) - $runningWorkers[$pid]['start_time'];
                    $adviceType = $runningWorkers[$pid]['type'];
                    
                    if (pcntl_wifexited($status)) {
                        $exitCode = pcntl_wexitstatus($status);
                        if ($exitCode !== 0) {
                            SystemMessages::sysLogMsg(
                                __METHOD__, 
                                "Advice {$adviceType} completed with error (exit code {$exitCode})",
                                LOG_WARNING
                            );
                        } else {
                            SystemMessages::sysLogMsg(
                                __METHOD__, 
                                "Advice {$adviceType} completed successfully in {$runtime}s",
                                LOG_DEBUG
                            );
                        }
                    } else {
                        SystemMessages::sysLogMsg(
                            __METHOD__, 
                            "Advice {$adviceType} terminated abnormally",
                            LOG_WARNING
                        );
                    }
                    
                    unset($runningWorkers[$pid]);
                } else {
                    // Check for hanging processes
                    foreach ($runningWorkers as $workerPid => $workerInfo) {
                        $runtime = microtime(true) - $workerInfo['start_time'];
                        if ($runtime > 60) { // 1 minute timeout
                            SystemMessages::sysLogMsg(
                                __METHOD__, 
                                "Killing hanging advice process for {$workerInfo['type']} (runtime: {$runtime}s)",
                                LOG_WARNING
                            );
                            posix_kill($workerPid, SIGKILL);
                            pcntl_waitpid($workerPid, $status, WNOHANG);
                            unset($runningWorkers[$workerPid]);
                        }
                    }
                    
                    // Short sleep to prevent CPU hogging
                    usleep(100000); // 100ms
                }
            }
        }
    }
    
    /**
     * Override the parent setForked method to also reinitialize the ManagedCache after fork
     */
    protected function setForked(): void
    {
        parent::setForked();
        // Recreate cache adapter after fork to avoid Redis connection issues
        $this->reinitializeManagedCache();
    }
    
    /**
     * Reinitialize the ManagedCache Redis adapter after fork
     * This prevents 'unserialize(): Error at offset 0 of x bytes' errors
     */
    private function reinitializeManagedCache(): void
    {
        try {
            $di = $this->getDI();
            if ($di->has(ManagedCacheProvider::SERVICE_NAME)) {
                // Get the current instance
                $managedCache = $di->getShared(ManagedCacheProvider::SERVICE_NAME);
                
                // Close the Redis connection if possible
                $redisAdapter = $managedCache->getAdapter();
                if (method_exists($redisAdapter, 'close')) {
                    $redisAdapter->close();
                }
                                
                // Remove the service from DI to force recreation
                $di->remove(ManagedCacheProvider::SERVICE_NAME);
                
                // Create a new service provider and register it
                $cacheProvider = new ManagedCacheProvider();
                $cacheProvider->register($di);
                
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Reinitialized ManagedCache Redis adapter after fork",
                    LOG_DEBUG
                );
            }
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Error reinitializing ManagedCache after fork: " . $e->getMessage(),
                LOG_WARNING
            );
        }
    }

    /**
     * Processes advice of a specific type and caches the result.
     *
     * @param array $adviceType An array containing advice type and cache time.
     */
    private function processAdvice(array $adviceType): void
    {
        $start = microtime(true);
        $managedCache = $this->getDI()->getShared(ManagedCacheProvider::SERVICE_NAME);
        $currentAdviceClass = $adviceType['type'];
        $cacheKey = self::getCacheKey($currentAdviceClass);
        
        // First check if cache exists and hasn't expired
        if ($managedCache->has($cacheKey)) {
            // Check if advice is already in cache with remaining TTL > 60 seconds
            // This avoids regenerating advice that's already cached but about to expire
            $ttl = $managedCache->getAdapter()->ttl($cacheKey);
            if ($ttl > 60 || $ttl === -1) {
                SystemMessages::sysLogMsg(
                    __METHOD__, 
                    "Skip advice processing: $cacheKey (cached for " . ($ttl === -1 ? "permanent" : "{$ttl}s") . ")",
                    LOG_DEBUG
                );
                return;
            }
        }
        
        // Set a lock to prevent multiple processes from generating the same advice
        $lockKey = $cacheKey . ':lock';
        if ($managedCache->has($lockKey)) {
            SystemMessages::sysLogMsg(
                __METHOD__, 
                "Skip advice processing: $cacheKey (already in progress)",
                LOG_DEBUG
            );
            return;
        }
        
        // Set a lock with a short TTL to prevent race conditions
        $managedCache->set($lockKey, '1', 60);
        
        try {
            SystemMessages::sysLogMsg(__METHOD__, "Start advice processing: $cacheKey", LOG_DEBUG);
            $checkObj = new $currentAdviceClass();
            $newAdvice = $checkObj->process();
            
            // Use pipeline to set cache in a single operation
            if (method_exists($managedCache, 'pipeline')) {
                $pipeline = $managedCache->pipeline();
                $pipeline->set($cacheKey, $newAdvice, $adviceType['cacheTime']);
                $pipeline->del($lockKey);
                $pipeline->exec();
            } else {
                $managedCache->set($cacheKey, $newAdvice, $adviceType['cacheTime']);
                $managedCache->delete($lockKey);
            }
            
            // Send advice to the browser
            GetAdviceListAction::main();
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            // Remove lock in case of error
            $managedCache->delete($lockKey);
        }
        
        $timeElapsedSecs = round(microtime(true) - $start, 2);
        if ($timeElapsedSecs > 5) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "WARNING: Service WorkerPrepareAdvice:{$adviceType['type']} processed more than $timeElapsedSecs seconds",
                LOG_WARNING
            );
        }
    }

    /**
     * Prepares a cache key for an advice type.
     *
     * @param string $currentAdviceType Current advice type.
     * @return string Cache key.
     */
    public static function getCacheKey(string $currentAdviceType): string
    {
        return 'WorkerPrepareAdvice:' . $currentAdviceType;
    }

}

// Start a worker process
WorkerPrepareAdvice::startWorker($argv ?? []);
