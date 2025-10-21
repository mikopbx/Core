<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Common\Providers\MutexProvider;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckAmiPasswords;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckAriPasswords;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckConnection;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckCorruptedFiles;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckFirewalls;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckModulesUpdates;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckSecurityLog;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckSIPPasswords;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckSSHConfig;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckSSHPasswords;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckStorage;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckUpdates;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\CheckWebPasswords;
use MikoPBX\PBXCoreREST\Lib\Advice\GetAdviceListAction;
use Throwable;
use RuntimeException;
require_once 'Globals.php';

/**
 * WorkerPrepareAdvice is a worker class responsible for preparing system advice.
 */
class WorkerPrepareAdvice extends WorkerRedisBase
{
    private const int PROCESS_CHECK_INTERVAL = 100000; // 100ms

    /**
     * Number of worker processes that должен запустить WorkerSafeScriptsCore
     */
    public int $maxProc = 2;

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
        ['type' => CheckAriPasswords::class, 'cacheTime' => 864000, 'priority' => 9],
        ['type' => CheckStorage::class, 'cacheTime' => 3600, 'priority' => 2],
        ['type' => CheckSecurityLog::class, 'cacheTime' => 600, 'priority' => 1],
        ['type' => CheckUpdates::class, 'cacheTime' => 86400, 'priority' => 5],
        ['type' => CheckSSHConfig::class, 'cacheTime' => 3600, 'priority' => 1],
        ['type' => CheckModulesUpdates::class, 'cacheTime' => 86400, 'priority' => 5],
    ];

    // Array of generated advice
    public array $messages;

    /**
     * Get check interval for worker monitoring
     */
    public static function getCheckInterval(): int
    {
        return 15; // Check every 15 seconds
    }

    /**
     * Starts processing advice types
     *
     * @param array $argv The command-line arguments passed to the worker.
     *
     * @throws Throwable
     */
    public function start(array $argv): void
    {
        // Process advice types until shutdown
        while ($this->needRestart === false && !$this->isShuttingDown) {
            try {
                // Process signals
                pcntl_signal_dispatch();
                
                // Process any pending advice types
                $this->processAdviceTypes();
                
                // Send heartbeat
                $this->checkHeartbeat();
                
                // Sleep to prevent CPU overuse
                sleep(5); // Process advice every 5 seconds
                
            } catch (Throwable $e) {
                CriticalErrorsHandler::handleExceptionWithSyslog($e);
                sleep(1);
            }
        }
        
        SystemMessages::sysLogMsg(
            static::class,
            "Worker exiting gracefully",
            LOG_NOTICE
        );
    }

    /**
     * Processes advice types.
     *
     * @return void
     */
    private function processAdviceTypes(): void
    {
        $adviceTypes = self::ARR_ADVICE_TYPES;
        $managedCache = $this->getDI()->get(ManagedCacheProvider::SERVICE_NAME);
        $filteredAdviceTypes = [];
        
        // Filter out advice types that don't need processing based on cache status
        foreach ($adviceTypes as $adviceType) {
            $currentAdviceClass = $adviceType['type'];
            $cacheKey = self::getCacheKey($currentAdviceClass);
            
            // Skip if already cached with sufficient TTL
            if ($managedCache->has($cacheKey)) {
                // Skip - already cached
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
        
        // Process one advice type per call - this allows for graceful shutdown between each advice
        $adviceType = array_shift($filteredAdviceTypes);
        
        // Check if shutting down before starting a task
        if ($this->isShuttingDown) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Worker is shutting down, skipping advice processing: {$adviceType['type']}",
                LOG_DEBUG
            );
            return;
        }
        
        // Process the advice
        SystemMessages::sysLogMsg(__METHOD__, "Processing advice: {$adviceType['type']}", LOG_DEBUG);
        $this->processAdvice($adviceType);
    }

    /**
     * Processes advice of a specific type and caches the result.
     *
     * @param array $adviceType An array containing advice type and cache time.
     */
    private function processAdvice(array $adviceType): void
    {
        $start = microtime(true);
        // Set a lock to prevent multiple processes from generating the same advice
        $lockKey = $adviceType['type'] . ':lock';

        if ($this->getDI()->get(MutexProvider::SERVICE_NAME)->isLocked($lockKey)) {
            return;
        }

        try {
            $this->getDI()->get(MutexProvider::SERVICE_NAME)->synchronized(
                $lockKey,
                function () use ($adviceType) {
                    // Check if we're shutting down before starting processing
                    if ($this->isShuttingDown) {
                        return;
                    }
                    
                    $currentAdviceClass = $adviceType['type'];
                    $cacheKey = self::getCacheKey($currentAdviceClass);
                    SystemMessages::sysLogMsg(__METHOD__, "Start advice processing: $cacheKey", LOG_DEBUG);
                    $checkObj = new $currentAdviceClass();
                    $newAdvice = $checkObj->process();
                    $managedCache = $this->getDI()->get(ManagedCacheProvider::SERVICE_NAME);
                    $managedCache->set($cacheKey, $newAdvice, $adviceType['cacheTime']);
                    // Send advice to the browser
                    GetAdviceListAction::main();
                },
                3,
                30
            );
        } catch (RuntimeException $e) {
           // Ignore - ensures that the lock is already acquired
        } catch (Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
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
