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
}

final class TestableWorkerCallEvents extends WorkerCallEvents
{
    public float $now = 0.0;
    public array $finalized = [];
    public array $published = [];

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
        $this->published[] = [$linkedId, $eventTime];
    }

    protected function logLinkedIdFinalization(string $message, int $level): void
    {
    }
}
