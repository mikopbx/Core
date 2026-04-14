<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Providers;

use MikoPBX\Common\Providers\ManagedCacheProvider;
use MikoPBX\Common\Providers\RedisClientProvider;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use Phalcon\Di\Di;

/**
 * Regression coverage for the Redis connection hardening work in issue #1022.
 *
 * Verifies that:
 *  - RedisClientProvider and ManagedCacheProvider are now shared (singleton
 *    per process), so a worker that calls $di->get(...) inside its main loop
 *    no longer opens a fresh TCP socket on every iteration,
 *  - OPT_TCP_KEEPALIVE and OPT_READ_TIMEOUT are applied on the underlying
 *    \Redis instance through primeRedisAdapter() — without them phpredis
 *    falls back to kernel TCP timeouts (~15 min), which was the root cause
 *    of the "every 10-30 minutes" connection-loss cadence.
 *
 * The tests require a reachable Redis (AbstractUnitTest bootstraps the full
 * MikoPBX DI container which points at 127.0.0.1:6379). If Redis is not up
 * the tests skip themselves rather than fail, so the suite stays green on
 * dev machines without a local Redis.
 */
class RedisClientProviderTest extends AbstractUnitTest
{
    protected function setUp(): void
    {
        parent::setUp();
        if (!$this->isRedisReachable()) {
            $this->markTestSkipped('Redis is not reachable on 127.0.0.1:6379');
        }
    }

    private function isRedisReachable(): bool
    {
        $sock = @fsockopen('127.0.0.1', 6379, $errno, $errstr, 0.5);
        if (is_resource($sock)) {
            fclose($sock);
            return true;
        }
        return false;
    }

    public function testRedisClientServiceIsSharedSingleton(): void
    {
        $di = Di::getDefault();

        $first = $di->get(RedisClientProvider::SERVICE_NAME);
        $second = $di->get(RedisClientProvider::SERVICE_NAME);

        $this->assertSame(
            $first,
            $second,
            'RedisClientProvider must be registered as shared so that '
            . 'workers reuse a single \\Redis instance per process (issue #1022)'
        );
    }

    public function testManagedCacheServiceIsSharedSingleton(): void
    {
        $di = Di::getDefault();

        $first = $di->get(ManagedCacheProvider::SERVICE_NAME);
        $second = $di->get(ManagedCacheProvider::SERVICE_NAME);

        $this->assertSame(
            $first,
            $second,
            'ManagedCacheProvider must be registered as shared (issue #1022)'
        );
    }

    public function testRedisClientHasTcpKeepaliveAndReadTimeout(): void
    {
        $di = Di::getDefault();

        /** @var \Redis $redis */
        $redis = $di->get(RedisClientProvider::SERVICE_NAME);
        $this->assertInstanceOf(\Redis::class, $redis);

        $this->assertSame(
            RedisClientProvider::TCP_KEEPALIVE_ENABLED,
            (int)$redis->getOption(\Redis::OPT_TCP_KEEPALIVE),
            'OPT_TCP_KEEPALIVE must be enabled on the socket (1) so the '
            . 'kernel sends SO_KEEPALIVE probes on idle connections. Real '
            . 'detection speed still relies on OPT_READ_TIMEOUT + kernel '
            . 'sysctl — see issue #1022.'
        );

        $this->assertSame(
            (float)RedisClientProvider::READ_TIMEOUT,
            (float)$redis->getOption(\Redis::OPT_READ_TIMEOUT),
            'OPT_READ_TIMEOUT must be set so BLPOP does not hang forever '
            . 'on a silent Redis — this is what the WorkerApiCommands main '
            . 'loop relies on to surface RedisException promptly.'
        );
    }

    public function testManagedCacheUnderlyingRedisHasTcpKeepalive(): void
    {
        $di = Di::getDefault();

        $cache = $di->get(ManagedCacheProvider::SERVICE_NAME);
        $this->assertTrue(
            method_exists($cache, 'getAdapter'),
            'Phalcon\\Cache\\Adapter\\Redis must expose getAdapter()'
        );

        /** @var \Redis $redis */
        $redis = $cache->getAdapter();
        $this->assertInstanceOf(\Redis::class, $redis);

        $this->assertSame(
            RedisClientProvider::TCP_KEEPALIVE_ENABLED,
            (int)$redis->getOption(\Redis::OPT_TCP_KEEPALIVE),
            'ManagedCacheProvider must prime the underlying phpredis '
            . 'instance with OPT_TCP_KEEPALIVE via primeRedisAdapter() so '
            . 'cache traffic gets the same protection as worker IPC.'
        );
    }
}
