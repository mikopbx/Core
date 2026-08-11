<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\LinkedIdFinalizationQueue;
use PHPUnit\Framework\TestCase;

final class LinkedIdFinalizationQueueTest extends TestCase
{
    public function testReturnsEntryOnlyAfterDelay(): void
    {
        $queue = new LinkedIdFinalizationQueue(2.0);
        $queue->schedule('call-a', '2026-08-06 14:46:40', 100.0);

        self::assertSame([], $queue->due(101.999));
        self::assertSame(['call-a' => '2026-08-06 14:46:40'], $queue->due(102.0));
        self::assertSame(['call-a' => '2026-08-06 14:46:40'], $queue->due(103.0));

        $queue->acknowledge('call-a', '2026-08-06 14:46:40');
        self::assertSame([], $queue->due(103.0));
    }

    public function testDuplicateReschedulesWithLatestEventTime(): void
    {
        $queue = new LinkedIdFinalizationQueue(2.0);
        $queue->schedule('call-a', '2026-08-06 14:46:40', 100.0);
        $queue->schedule('call-a', '2026-08-06 14:46:41', 101.0);

        self::assertSame([], $queue->due(102.0));
        self::assertSame(['call-a' => '2026-08-06 14:46:41'], $queue->due(103.0));
    }

    public function testRejectsInvalidEntries(): void
    {
        $queue = new LinkedIdFinalizationQueue(2.0);
        $queue->schedule('', '2026-08-06 14:46:40', 100.0);
        $queue->schedule('call-a', '', 100.0);

        self::assertSame([], $queue->due(200.0));
    }

    public function testOldAcknowledgeDoesNotRemoveNewerEvent(): void
    {
        $queue = new LinkedIdFinalizationQueue(2.0);
        $queue->schedule('call-a', '2026-08-06 14:46:40', 100.0);
        $queue->schedule('call-a', '2026-08-06 14:46:42', 101.0);

        $queue->acknowledge('call-a', '2026-08-06 14:46:40');

        self::assertSame(['call-a' => '2026-08-06 14:46:42'], $queue->due(103.0));
    }

    public function testRetryMovesDeadlineWithoutLosingEvent(): void
    {
        $queue = new LinkedIdFinalizationQueue(2.0);
        $queue->schedule('call-a', '2026-08-06 14:46:40', 100.0);

        $queue->retry('call-a', '2026-08-06 14:46:40', 102.0, 5.0);

        self::assertSame([], $queue->due(106.999));
        self::assertSame(['call-a' => '2026-08-06 14:46:40'], $queue->due(107.0));
    }

    public function testOlderDuplicateDoesNotRegressTerminalTime(): void
    {
        $queue = new LinkedIdFinalizationQueue(2.0);
        $queue->schedule('call-a', '2026-08-06 14:46:42', 100.0);
        $queue->schedule('call-a', '2026-08-06 14:46:40', 101.0);

        self::assertSame(['call-a' => '2026-08-06 14:46:42'], $queue->due(103.0));
    }
}
