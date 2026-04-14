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

declare(strict_types=1);

namespace MikoPBX\Common\Providers;

use Phalcon\Di\DiInterface;
use Phalcon\Di\ServiceProviderInterface;
use Phalcon\Storage\Adapter\Redis as AdapterRedis;
use Phalcon\Storage\SerializerFactory;
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
    public const string CACHE_PREFIX = '_PH_REDIS_CLIENT:';
    public const int DATABASE_INDEX = 1;

    /**
     * phpredis OPT_READ_TIMEOUT (seconds). Controls how long a blocking read
     * (e.g. BLPOP) waits on a silent socket before raising RedisException.
     * This is THE primary defence against the "every 10-30 minutes" cadence
     * in issue #1022: without it phpredis inherits the kernel TCP timeout
     * (~15 min), so workers sit on half-dead sockets for the whole TCP
     * retransmission window instead of surfacing the failure.
     */
    public const int READ_TIMEOUT = 10;

    /**
     * phpredis OPT_TCP_KEEPALIVE — in this build it is a 0/1 enable flag
     * (phpredis 6.x normalises any positive value to 1). We enable SO_KEEPALIVE
     * on the socket; the actual probe timing is taken from kernel sysctls
     * (net.ipv4.tcp_keepalive_time / _intvl / _probes). On MikoPBX the kernel
     * defaults are 7200 s / 75 s / 9 probes which is slower than we would
     * like, but combined with OPT_READ_TIMEOUT above the client still breaks
     * out of blocked reads within 10 s. The keepalive flag is kept as a
     * belt-and-braces cleanup for truly-idle connections.
     */
    public const int TCP_KEEPALIVE_ENABLED = 1;

    /**
     * Prime a freshly created phpredis object so issue #1022 protections take
     * effect. Phalcon's Storage\Adapter\Redis lazy-opens its socket on the
     * first command, and {@see \Redis::OPT_TCP_KEEPALIVE} must be set on a
     * live socket, so we have to force the connect with a ping() first.
     *
     * Any failure here is swallowed intentionally — the caller (worker loop,
     * retry helper) will see the RedisException on its next real operation
     * and deal with it via the standard backoff path.
     */
    public static function primeRedisAdapter(\Redis $redis): \Redis
    {
        try {
            $redis->ping();
        } catch (Throwable) {
            // Socket is not open yet; options below still register with
            // phpredis and will be applied the next time a connect succeeds.
        }
        try {
            // OPT_TCP_KEEPALIVE is stored in phpredis' redis_sock struct
            // here but is only actually applied to the OS socket on the
            // NEXT connect()/reconnect() — the setsockopt() call lives in
            // phpredis' RedisSock_connect() path. So on the current socket
            // we rely on OPT_READ_TIMEOUT below; OPT_TCP_KEEPALIVE is a
            // belt-and-braces flag for the reconnect case.
            $redis->setOption(\Redis::OPT_TCP_KEEPALIVE, self::TCP_KEEPALIVE_ENABLED);
            $redis->setOption(\Redis::OPT_READ_TIMEOUT, self::READ_TIMEOUT);
        } catch (Throwable) {
            // Some builds of phpredis refuse setOption before the first
            // successful connect — not fatal for us, next reconnect retries.
        }
        return $redis;
    }

    /**
     * Register the Redis client service provider.
     *
     * @param DiInterface $di The DI container.
     */
    public function register(DiInterface $di): void
    {
        $config = $di->getShared(ConfigProvider::SERVICE_NAME);
        // Shared (singleton) per process: a worker or php-fpm child reuses
        // one \Redis socket for its entire lifetime instead of opening a new
        // TCP connection on every di->get() call inside the main loop.
        // See issue #1022 root-cause analysis.
        $di->setShared(
            self::SERVICE_NAME,
            function () use ($config) {
                $serializerFactory = new SerializerFactory();
                $options = [
                    'defaultSerializer' => 'Php',
                    'lifetime'          => 3600,
                    'host'              => $config->path('redis.host'),
                    'port'              => $config->path('redis.port'),
                    'index'             => self::DATABASE_INDEX,
                    'prefix'            => self::CACHE_PREFIX,
                    'persistent'        => false,
                ];
                $adapter = new AdapterRedis($serializerFactory, $options);
                return self::primeRedisAdapter($adapter->getAdapter());
            }
        );
    }
}
