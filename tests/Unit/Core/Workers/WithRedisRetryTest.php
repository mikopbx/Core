<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers;

use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use Phalcon\Storage\Exception as StorageException;
use RedisException;

/**
 * Regression coverage for WorkerBase::withRedisRetry() — the short
 * exponential-backoff helper introduced in issue #1022 to survive
 * transient Redis glitches without dropping in-flight jobs.
 *
 * The helper is protected, so we access it through a fixture subclass
 * that exposes it. The fixture does NOT call WorkerBase::__construct()
 * because the real constructor wires signal handlers, PID files, and
 * the whole DI stack — which is too much for a pure unit test. We use
 * ReflectionClass::newInstanceWithoutConstructor() to build a bare
 * instance, identical to the pattern already used in the #999 tests.
 */
class WithRedisRetryTest extends AbstractUnitTest
{
    private function makeFixture(): WithRedisRetryFixture
    {
        $reflection = new \ReflectionClass(WithRedisRetryFixture::class);
        /** @var WithRedisRetryFixture $instance */
        $instance = $reflection->newInstanceWithoutConstructor();
        return $instance;
    }

    public function testReturnsResultOnFirstSuccess(): void
    {
        $fixture = $this->makeFixture();
        $calls = 0;

        $result = $fixture->exposeWithRedisRetry(function () use (&$calls) {
            $calls++;
            return 'ok';
        }, 3);

        $this->assertSame('ok', $result);
        $this->assertSame(1, $calls, 'Happy path must not retry');
    }

    public function testRetriesAfterRedisExceptionAndEventuallySucceeds(): void
    {
        $fixture = $this->makeFixture();
        $calls = 0;
        $start = microtime(true);

        $result = $fixture->exposeWithRedisRetry(function () use (&$calls) {
            $calls++;
            if ($calls < 3) {
                throw new RedisException('read error on connection');
            }
            return 'recovered';
        }, 3);

        $elapsed = microtime(true) - $start;

        $this->assertSame('recovered', $result);
        $this->assertSame(3, $calls, 'Must retry twice before the third attempt succeeds');
        // Backoff: 100 ms + 200 ms = 300 ms (plus negligible overhead).
        $this->assertGreaterThanOrEqual(
            0.28,
            $elapsed,
            'Exponential backoff must space retries out (100ms, 200ms)'
        );
        // Upper bound is intentionally generous (3 s instead of 1 s) to
        // avoid timing flakes on a loaded CI runner — the real guarantee
        // is that the helper is bounded, not "under 1 s exactly".
        $this->assertLessThan(
            3.0,
            $elapsed,
            'Backoff must stay well below 3s so the BLPOP main loop '
            . 'does not stall on transient glitches'
        );
    }

    public function testRetriesOnPhalconStorageExceptionToo(): void
    {
        $fixture = $this->makeFixture();
        $calls = 0;

        $result = $fixture->exposeWithRedisRetry(function () use (&$calls) {
            $calls++;
            if ($calls === 1) {
                throw new StorageException('Connection refused');
            }
            return 'ok';
        }, 3);

        $this->assertSame('ok', $result);
        $this->assertSame(2, $calls);
    }

    public function testRethrowsAfterMaxAttempts(): void
    {
        $fixture = $this->makeFixture();
        $calls = 0;

        try {
            $fixture->exposeWithRedisRetry(function () use (&$calls) {
                $calls++;
                throw new RedisException('Connection lost');
            }, 3);
            $this->fail('Expected RedisException to propagate after 3 attempts');
        } catch (RedisException $e) {
            $this->assertSame('Connection lost', $e->getMessage());
            $this->assertSame(3, $calls, 'Must attempt exactly $maxAttempts times');
        }
    }

    public function testDoesNotSwallowOtherExceptions(): void
    {
        $fixture = $this->makeFixture();
        $calls = 0;

        $this->expectException(\InvalidArgumentException::class);
        try {
            $fixture->exposeWithRedisRetry(function () use (&$calls) {
                $calls++;
                throw new \InvalidArgumentException('bad input');
            }, 3);
        } finally {
            $this->assertSame(
                1,
                $calls,
                'Non-Redis exceptions must bubble up immediately — the '
                . 'retry helper is intentionally narrow in scope.'
            );
        }
    }
}

/**
 * Bare subclass that exposes WorkerBase::withRedisRetry() for test access
 * without instantiating the full WorkerBase lifecycle.
 */
class WithRedisRetryFixture extends WorkerBase
{
    public function start(array $argv): void
    {
        // Not used in tests.
    }

    public function exposeWithRedisRetry(callable $op, int $maxAttempts): mixed
    {
        return $this->withRedisRetry($op, $maxAttempts);
    }
}
