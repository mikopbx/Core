<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\LinkedIdFinalizationQueue;
use MikoPBX\Core\Workers\WorkerCallEvents;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

final class WorkerCallEventsLinkedIdEndTest extends TestCase
{
    public function testFinalizesAndNotifiesOnlyAfterDeadline(): void
    {
        $worker = (new ReflectionClass(TestableWorkerCallEvents::class))->newInstanceWithoutConstructor();
        $worker->initializeFinalizations();
        $worker->now = 100.0;
        $worker->schedule(['LinkedID' => 'call-a', 'EventTime' => '2026-08-06 14:46:40']);

        $worker->now = 101.999;
        $worker->drain();
        self::assertSame([], $worker->finalized);
        self::assertSame([], $worker->published);

        $worker->now = 102.0;
        $worker->drain();
        self::assertSame([['call-a', '2026-08-06 14:46:40']], $worker->finalized);
        self::assertSame([['call-a', '2026-08-06 14:46:40']], $worker->published);
    }

    public function testDuplicateUsesLatestEndAndProducesOneNotification(): void
    {
        $worker = (new ReflectionClass(TestableWorkerCallEvents::class))->newInstanceWithoutConstructor();
        $worker->initializeFinalizations();
        $worker->now = 100.0;
        $worker->schedule(['LinkedID' => 'call-a', 'EventTime' => '2026-08-06 14:46:40']);
        $worker->now = 101.0;
        $worker->schedule(['LinkedID' => 'call-a', 'EventTime' => '2026-08-06 14:46:41']);
        $worker->now = 103.0;
        $worker->drain();

        self::assertSame([['call-a', '2026-08-06 14:46:41']], $worker->finalized);
        self::assertSame([['call-a', '2026-08-06 14:46:41']], $worker->published);
    }

    public function testPublishFailureRetriesSameTerminalEvent(): void
    {
        $worker = (new ReflectionClass(TestableWorkerCallEvents::class))->newInstanceWithoutConstructor();
        $worker->initializeFinalizations();
        $worker->now = 100.0;
        $worker->schedule(['LinkedID' => 'call-a', 'EventTime' => '2026-08-06 14:46:40']);
        $worker->failPublish = true;

        $worker->now = 102.0;
        $worker->drain();
        $worker->failPublish = false;
        $worker->now = 106.999;
        $worker->drain();
        self::assertCount(1, $worker->finalized);

        $worker->now = 107.0;
        $worker->drain();
        self::assertCount(2, $worker->finalized);
        self::assertSame([['call-a', '2026-08-06 14:46:40']], $worker->published);
    }
}

final class TestableWorkerCallEvents extends WorkerCallEvents
{
    public float $now = 0.0;
    public array $finalized = [];
    public array $published = [];
    public bool $failPublish = false;

    public function initializeFinalizations(): void
    {
        $this->linkedIdFinalizations = new LinkedIdFinalizationQueue(2.0);
    }

    public function schedule(array $data): void
    {
        $this->scheduleLinkedIdFinalization($data);
    }

    public function drain(): void
    {
        $this->processPendingLinkedIdFinalizations();
    }

    protected function monotonicNow(): float
    {
        return $this->now;
    }

    protected function finalizeLinkedId(string $linkedId, string $eventTime): int
    {
        $this->finalized[] = [$linkedId, $eventTime];
        return 0;
    }

    protected function publishLinkedIdFinalized(string $linkedId, string $eventTime): void
    {
        if ($this->failPublish) {
            throw new \RuntimeException('publish failed');
        }
        $this->published[] = [$linkedId, $eventTime];
    }

    protected function logLinkedIdFinalization(string $message, int $level): void
    {
    }
}
