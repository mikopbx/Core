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

        self::assertSame([], $queue->takeDue(101.999));
        self::assertSame(['call-a' => '2026-08-06 14:46:40'], $queue->takeDue(102.0));
        self::assertSame([], $queue->takeDue(103.0));
    }

    public function testDuplicateReschedulesWithLatestEventTime(): void
    {
        $queue = new LinkedIdFinalizationQueue(2.0);
        $queue->schedule('call-a', '2026-08-06 14:46:40', 100.0);
        $queue->schedule('call-a', '2026-08-06 14:46:41', 101.0);

        self::assertSame([], $queue->takeDue(102.0));
        self::assertSame(['call-a' => '2026-08-06 14:46:41'], $queue->takeDue(103.0));
    }

    public function testRejectsInvalidEntries(): void
    {
        $queue = new LinkedIdFinalizationQueue(2.0);
        $queue->schedule('', '2026-08-06 14:46:40', 100.0);
        $queue->schedule('call-a', '', 100.0);

        self::assertSame([], $queue->takeDue(200.0));
    }
}
