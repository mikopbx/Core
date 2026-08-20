<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers;

use MikoPBX\Core\System\HeartbeatProcessRunner;
use MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice\AdviceTaskBatchProcessor;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class WorkerPrepareAdviceTest extends TestCase
{
    public function testLongRunningCommandKeepsHeartbeatAlive(): void
    {
        $file = dirname(__DIR__, 4) . '/src/Core/System/HeartbeatProcessRunner.php';
        if (is_file($file)) {
            require_once $file;
        }

        self::assertTrue(
            class_exists(HeartbeatProcessRunner::class),
            'Long-running storage commands must have a heartbeat-aware runner'
        );

        $heartbeatCount = 0;
        $runner = new HeartbeatProcessRunner(50_000);
        $exitCode = $runner->run(
            PHP_BINARY . ' -r ' . escapeshellarg('usleep(350000);'),
            static function () use (&$heartbeatCount): void {
                $heartbeatCount++;
            }
        );

        self::assertSame(0, $exitCode);
        self::assertGreaterThanOrEqual(3, $heartbeatCount);
    }

    private function makeProcessor(): AdviceTaskBatchProcessor
    {
        $file = dirname(__DIR__, 4)
            . '/src/Core/Workers/Libs/WorkerPrepareAdvice/AdviceTaskBatchProcessor.php';

        if (is_file($file)) {
            require_once $file;
        }

        self::assertTrue(
            class_exists(AdviceTaskBatchProcessor::class),
            'AdviceTaskBatchProcessor must implement the advice batch behavior'
        );

        return new AdviceTaskBatchProcessor();
    }

    public function testDrainsAllPendingAdviceInPriorityOrderAndPublishesOnce(): void
    {
        $processor = $this->makeProcessor();
        $cached = ['already-cached' => true];
        $processed = [];
        $locks = [];
        $publishCalls = 0;

        $count = $processor->drain(
            [
                ['type' => 'priority-five', 'cacheTime' => 120, 'priority' => 5],
                ['type' => 'already-cached', 'cacheTime' => 120, 'priority' => 1],
                ['type' => 'priority-one', 'cacheTime' => 120, 'priority' => 1],
                ['type' => 'priority-three', 'cacheTime' => 120, 'priority' => 3],
            ],
            static fn(string $type): bool => isset($cached[$type]),
            static function (
                string $lockKey,
                callable $callback,
                int $timeout,
                int $ttl
            ) use (&$locks): mixed {
                $locks[] = [$lockKey, $timeout, $ttl];
                return $callback();
            },
            static function (array $adviceType) use (&$processed, &$cached): bool {
                $processed[] = $adviceType['type'];
                $cached[$adviceType['type']] = true;
                return true;
            },
            static fn(): bool => false,
            static function () use (&$publishCalls): void {
                $publishCalls++;
            }
        );

        self::assertSame(3, $count);
        self::assertSame(['priority-one', 'priority-three', 'priority-five'], $processed);
        self::assertSame(1, $publishCalls);
        self::assertSame(
            ['priority-one:lock', 'priority-three:lock', 'priority-five:lock'],
            array_column($locks, 0)
        );
        self::assertSame([0, 0, 0], array_column($locks, 1));
        self::assertGreaterThan(
            162,
            min(array_column($locks, 2)),
            'Lock TTL must exceed the longest CheckStorageUsage run observed on production'
        );
    }

    public function testRechecksCacheAfterLockAcquisition(): void
    {
        $processor = $this->makeProcessor();
        $cached = false;
        $processCalls = 0;
        $publishCalls = 0;

        $count = $processor->drain(
            [['type' => 'storage', 'cacheTime' => 300, 'priority' => 1]],
            static function (string $type) use (&$cached): bool {
                return $cached;
            },
            static function (
                string $lockKey,
                callable $callback,
                int $timeout,
                int $ttl
            ) use (&$cached): mixed {
                $cached = true;
                return $callback();
            },
            static function (array $adviceType) use (&$processCalls): bool {
                $processCalls++;
                return true;
            },
            static fn(): bool => false,
            static function () use (&$publishCalls): void {
                $publishCalls++;
            }
        );

        self::assertSame(0, $count);
        self::assertSame(0, $processCalls);
        self::assertSame(0, $publishCalls);
    }

    public function testContinuesWithNextAdviceWhenLockIsBusy(): void
    {
        $processor = $this->makeProcessor();
        $processed = [];
        $publishCalls = 0;

        $count = $processor->drain(
            [
                ['type' => 'busy', 'cacheTime' => 120, 'priority' => 1],
                ['type' => 'available', 'cacheTime' => 120, 'priority' => 2],
            ],
            static fn(string $type): bool => false,
            static function (
                string $lockKey,
                callable $callback,
                int $timeout,
                int $ttl
            ): mixed {
                if ($lockKey === 'busy:lock') {
                    throw new RuntimeException('lock is busy');
                }
                return $callback();
            },
            static function (array $adviceType) use (&$processed): bool {
                $processed[] = $adviceType['type'];
                return true;
            },
            static fn(): bool => false,
            static function () use (&$publishCalls): void {
                $publishCalls++;
            }
        );

        self::assertSame(1, $count);
        self::assertSame(['available'], $processed);
        self::assertSame(1, $publishCalls);
    }

    public function testStopsBetweenAdviceTasks(): void
    {
        $processor = $this->makeProcessor();
        $processed = [];

        $count = $processor->drain(
            [
                ['type' => 'first', 'cacheTime' => 120, 'priority' => 1],
                ['type' => 'second', 'cacheTime' => 120, 'priority' => 2],
            ],
            static fn(string $type): bool => false,
            static fn(string $lockKey, callable $callback, int $timeout, int $ttl): mixed => $callback(),
            static function (array $adviceType) use (&$processed): bool {
                $processed[] = $adviceType['type'];
                return true;
            },
            static function () use (&$processed): bool {
                return count($processed) > 0;
            },
            static function (): void {
            }
        );

        self::assertSame(1, $count);
        self::assertSame(['first'], $processed);
    }

    public function testIdleBatchDoesNotPublish(): void
    {
        $processor = $this->makeProcessor();
        $publishCalls = 0;

        $count = $processor->drain(
            [['type' => 'cached', 'cacheTime' => 120, 'priority' => 1]],
            static fn(string $type): bool => true,
            static function (): never {
                self::fail('Cached advice must not acquire a lock');
            },
            static function (): never {
                self::fail('Cached advice must not be processed');
            },
            static fn(): bool => false,
            static function () use (&$publishCalls): void {
                $publishCalls++;
            }
        );

        self::assertSame(0, $count);
        self::assertSame(0, $publishCalls);
    }
}
