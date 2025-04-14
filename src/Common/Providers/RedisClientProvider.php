<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\Core\System\SystemMessages;
use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Redis;
use RedisException;
use RuntimeException;
use Throwable;

/**
 * The RedisClientProvider class is responsible for registering the Redis client service.
 * This provider is specifically designed for worker management and inter-process communication.
 *
 * @package MikoPBX\Common\Providers
 */
class RedisClientProvider implements ServiceProviderInterface
{
    public const string SERVICE_NAME = 'redis';
    
    // Redis database indexes
    public const int REDIS_DB_WORKER_MANAGEMENT = 0;  // For worker management
    public const int REDIS_DB_API_REQUESTS = 1;       // For API requests
    public const int REDIS_DB_PUBSUB = 3;            // For pub/sub communications
    public const int REDIS_DB_CACHE = 4;             // For general caching (used by ManagedCacheProvider)
    public const int REDIS_DB_METADATA = 2;         // For Metadata caching (used by ModelsMetadataProvider)

    
    // Connection settings
    private const int CONNECT_TIMEOUT = 2;
    private const int READ_TIMEOUT = -1;  // No timeout for pub/sub operations
    private const int RETRY_INTERVAL = 100000; // 100ms
    private const int MAX_RETRIES = 3;

    /**
     * Get Redis connection parameters from config
     *
     * @param DiInterface $di
     * @return array
     */
    private static function getRedisConfig(DiInterface $di): array
    {
        $config = $di->getShared(ConfigProvider::SERVICE_NAME);
        return [
            'host' => $config->path('redis.host', '127.0.0.1'),
            'port' => (int)$config->path('redis.port', 6379),
            'password' => $config->path('redis.password', ''),
        ];
    }

    /**
     * Test Redis connection and basic operations
     *
     * @param Redis $redis
     * @param bool $testPubSub Whether to test pub/sub functionality
     * @param DiInterface $di
     * @return bool
     */
    private static function testRedisConnection(Redis $redis, bool $testPubSub, DiInterface $di): bool
    {
        try {
            // Test basic operations
            $testKey = 'test:connection:' . uniqid();
            $testValue = 'test_' . microtime(true);
            
            if (!$redis->set($testKey, $testValue, ['NX', 'EX' => 5])) {
                return false;
            }
            
            if ($redis->get($testKey) !== $testValue) {
                return false;
            }
            
            $redis->del($testKey);

            // For pub/sub connections, we only test basic operations
            // The actual pub/sub test will happen during subscription
            return true;
            
        } catch (Throwable $e) {
            SystemMessages::sysLogMsg(
                self::class,
                "Redis connection test failed: " . $e->getMessage(),
                LOG_WARNING
            );
            return false;
        }
    }

    /**
     * Create a new Redis connection with common settings
     *
     * @param DiInterface $di
     * @param int $database
     * @param bool $isPubSub Whether this connection is for pub/sub operations
     * @return Redis|null
     */
    private static function createRedisConnection(DiInterface $di, int $database, bool $isPubSub = false): ?Redis
    {
        try {
            $redis = new Redis();

            // Set TCP keepalive
            $redis->setOption(Redis::OPT_TCP_KEEPALIVE, true);

            if ($isPubSub) {
                // For pub/sub, use infinite timeout
                $redis->setOption(Redis::OPT_READ_TIMEOUT, -1);
            } else {
                // For normal connections use timeout
                $redis->setOption(Redis::OPT_READ_TIMEOUT, 0);
            }

            $redisConfig = self::getRedisConfig($di);

            // Connect with retry mechanism
            $connected = false;
            $attempts = 0;

            while (!$connected && $attempts < self::MAX_RETRIES) {
                try {
                    $connected = $redis->connect(
                        $redisConfig['host'],
                        $redisConfig['port'],
                        $isPubSub ? 0 : self::CONNECT_TIMEOUT,
                        null,
                        0, // Retry interval
                        0, // Read timeout
                        ['tcp_keepalive' => true]   );

                    if (!$connected) {
                        throw new RedisException('Failed to connect to Redis');
                    }

                    // Set authentication if configured
                    if (!empty($redisConfig['password'])) {
                        $redis->auth($redisConfig['password']);
                    }
                    $redis->select($database);
                    break;
                } catch (RedisException $e) {
                    $attempts++;
                    if ($attempts >= self::MAX_RETRIES) {
                        throw $e;
                    }
                    usleep(self::RETRY_INTERVAL);
                }
            }

            return $redis;
        } catch (RedisException $e) {
            SystemMessages::sysLogMsg(
                self::class,
                "Failed to create Redis connection: " . $e->getMessage(),
                LOG_WARNING
            );
            return null;
        }
    }

    /**
     * Register the Redis client service provider.
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $config = $di->getShared(ConfigProvider::SERVICE_NAME);
        
        $di->set(
            self::SERVICE_NAME,
            function () use ($di) {
                $redis = new Redis();
                
                // Set connection options
                $redis->setOption(Redis::OPT_READ_TIMEOUT, self::READ_TIMEOUT);
                $redis->setOption(Redis::OPT_TCP_KEEPALIVE, 1);
                $redis->setOption(Redis::OPT_SERIALIZER, Redis::SERIALIZER_JSON);
                
                // Connect with retry mechanism
                $connected = false;
                $attempts = 0;
                $redisConfig = self::getRedisConfig($di);
                
                while (!$connected && $attempts < self::MAX_RETRIES) {
                    try {
                        $connected = $redis->connect(
                            $redisConfig['host'],
                            $redisConfig['port'],
                            self::CONNECT_TIMEOUT
                        );
                        if (!$connected) {
                            throw new RedisException('Failed to connect to Redis');
                        }

                        // Set authentication if configured
                        if (!empty($redisConfig['password'])) {
                            $redis->auth($redisConfig['password']);
                        }
                    } catch (RedisException $e) {
                        $attempts++;
                        if ($attempts >= self::MAX_RETRIES) {
                            throw $e;
                        }
                        usleep(self::RETRY_INTERVAL);
                    }
                }
                
                return $redis;
            }
        );
    }
    
    /**
     * Get a Redis connection for worker management
     *
     * @param DiInterface $di
     * @return Redis|null
     */
    public static function getWorkerManagementConnection(DiInterface $di): ?Redis
    {
        return self::createRedisConnection($di, self::REDIS_DB_WORKER_MANAGEMENT);
    }
    
    /**
     * Get a Redis connection for pub/sub communications
     *
     * @param DiInterface $di
     * @return Redis|null
     */
    public static function getPubSubConnection(DiInterface $di): ?Redis
    {
        return self::createRedisConnection($di, self::REDIS_DB_PUBSUB, true);
    }

    /**
     * Get a Redis connection for API requests
     *
     * @param DiInterface $di
     * @return Redis|null
     */
    public static function getApiRequestsConnection(DiInterface $di): ?Redis
    {
        return self::createRedisConnection($di, self::REDIS_DB_API_REQUESTS);
    }

    /**
     * Get a Redis connection for caching
     *
     * @param DiInterface $di
     * @return Redis|null
     */
    public static function getCacheConnection(DiInterface $di): ?Redis
    {
        return self::createRedisConnection($di, self::REDIS_DB_CACHE);
    }

    /**
     * Get a Redis connection for metadata
     *
     * @param DiInterface $di
     * @return Redis|null
     */
    public static function getMetadataConnection(DiInterface $di): ?Redis
    {
        return self::createRedisConnection($di, self::REDIS_DB_METADATA);
    }
} 