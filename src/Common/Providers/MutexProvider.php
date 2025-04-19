<?php
/**
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

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use Phalcon\Di\DiInterface;
use RuntimeException;
use Throwable;
use Redis;

/**
 * Class MutexProvider
 * 
 * Provides Redis-based mutual exclusion mechanism to guarantee that a callback
 * function is executed only in a single instance at any given time.
 * 
 * @package MikoPBX\Common\Providers
 */
class MutexProvider
{
    public const SERVICE_NAME = 'mutex';
    
    private Redis $redis;
    private string $prefix = 'mutex:';
    

    /**
     * Execute a callback function with mutex protection
     * 
     * @template T
     * @param string $name Unique mutex name/identifier
     * @param callable():T $callback Function to execute under mutex protection
     * @param int $timeout Maximum time to wait for lock acquisition (in seconds)
     * @param int $ttl Lock time-to-live (in seconds)
     * @return T Result of the callback function
     * @throws Throwable Rethrows any exception from the callback
     * @throws RuntimeException When unable to acquire lock within timeout
     */
    public function synchronized(string $name, callable $callback, int $timeout = 10, int $ttl = 30): mixed
    {
        $lockKey = $this->prefix . $name;
        $token = bin2hex(random_bytes(16));
        
        if (!$this->acquireLock($lockKey, $token, $timeout, $ttl)) {
            throw new RuntimeException("Failed to acquire mutex lock '{$name}' after {$timeout} seconds");
        }
        
        try {
            return $callback();
        } finally {
            $this->releaseLock($lockKey, $token);
        }
    }
    
    /**
     * Try to acquire a lock without waiting
     * 
     * @param string $name Unique mutex name/identifier
     * @param int $ttl Lock time-to-live (in seconds)
     * @return bool True if lock was acquired, false otherwise
     */
    public function tryLock(string $name, int $ttl = 30): bool
    {
        $lockKey = $this->prefix . $name;
        $token = bin2hex(random_bytes(16));
        
        return $this->acquireLock($lockKey, $token, 0, $ttl);
    }
    
    /**
     * Check if a mutex is currently locked
     * 
     * @param string $name Mutex name to check
     * @return bool True if locked, false otherwise
     */
    public function isLocked(string $name): bool
    {
        $lockKey = $this->prefix . $name;
        return (bool)$this->redis->exists($lockKey);
    }
    
    /**
     * Get the remaining TTL of a lock
     * 
     * @param string $name Mutex name
     * @return int Remaining time in seconds, -2 if the key doesn't exist, -1 if no TTL
     */
    public function getTTL(string $name): int
    {
        $lockKey = $this->prefix . $name;
        return $this->redis->ttl($lockKey);
    }
    
    /**
     * Try to acquire a lock with timeout
     * 
     * @param string $lockKey Redis key for the lock
     * @param string $token Unique token to identify lock owner
     * @param int $timeout Maximum time to wait for acquisition
     * @param int $ttl Time-to-live for the lock
     * @return bool True if lock was acquired
     */
    private function acquireLock(string $lockKey, string $token, int $timeout, int $ttl): bool
    {
        $startTime = microtime(true);
        $retryDelay = 100000; // 100ms in microseconds
        
        do {
            $acquired = $this->redis->set(
                $lockKey,
                $token,
                ['NX', 'EX' => $ttl]
            );
            
            if ($acquired) {
                return true;
            }
            
            if ($timeout <= 0) {
                break;
            }
            
            usleep($retryDelay);
        } while (microtime(true) - $startTime < $timeout);
        
        return false;
    }
    
    /**
     * Release a lock using Lua script for atomic operation
     * 
     * @param string $lockKey Redis key for the lock
     * @param string $token Token to verify lock ownership
     * @return bool True if lock was released
     */
    private function releaseLock(string $lockKey, string $token): bool
    {
        $script = <<<LUA
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
else
    return 0
end
LUA;
        
        return (bool)$this->redis->eval(
            $script,
            [$lockKey, $token],
            1
        );
    }
    
    /**
     * Register the service in the DI container
     * 
     * @param DiInterface $di Dependency Injection container
     * @return void
     */
    public function register(DiInterface $di): void
    {
        $di->set(
            self::SERVICE_NAME,
            function () use ($di) {
                $mutex = new self($di);
                $mutex->redis = $di->get(RedisClientProvider::SERVICE_NAME);
                return $mutex;
            }
        );
    }
}