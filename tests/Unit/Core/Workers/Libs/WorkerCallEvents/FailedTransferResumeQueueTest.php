<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\FailedTransferResumeQueue;
use PHPUnit\Framework\TestCase;

final class FailedTransferResumeQueueTest extends TestCase
{
    private const OPERATOR = 'PJSIP/204-00000015';
    private const LINKEDID = 'mikopbx-1792402130.35';

    public function testEntryIsDueOnlyAfterInterval(): void
    {
        $queue = new FailedTransferResumeQueue(1.0, 3);
        $queue->schedule(self::OPERATOR, self::LINKEDID, 100.0);

        self::assertSame([], $queue->due(100.5));
        self::assertSame([self::OPERATOR => self::LINKEDID], $queue->due(101.0));
    }

    public function testRetryReschedulesUntilAttemptsAreExhausted(): void
    {
        $queue = new FailedTransferResumeQueue(1.0, 3);
        $queue->schedule(self::OPERATOR, self::LINKEDID, 100.0);

        self::assertTrue($queue->retry(self::OPERATOR, 101.0));
        self::assertSame([], $queue->due(101.5));
        self::assertSame([self::OPERATOR => self::LINKEDID], $queue->due(102.0));

        self::assertTrue($queue->retry(self::OPERATOR, 102.0));
        self::assertFalse($queue->retry(self::OPERATOR, 103.0));
        self::assertSame([], $queue->due(1000.0));
    }

    public function testAcknowledgeDropsEntry(): void
    {
        $queue = new FailedTransferResumeQueue(1.0, 3);
        $queue->schedule(self::OPERATOR, self::LINKEDID, 100.0);
        $queue->acknowledge(self::OPERATOR);

        self::assertSame([], $queue->due(1000.0));
        self::assertFalse($queue->retry(self::OPERATOR, 1000.0));
    }

    public function testRescheduleForSameOperatorRestartsAttempts(): void
    {
        $queue = new FailedTransferResumeQueue(1.0, 2);
        $queue->schedule(self::OPERATOR, self::LINKEDID, 100.0);
        $queue->retry(self::OPERATOR, 101.0);
        $queue->schedule(self::OPERATOR, 'mikopbx-1792402200.40', 102.0);

        self::assertSame([self::OPERATOR => 'mikopbx-1792402200.40'], $queue->due(103.0));
        self::assertTrue($queue->retry(self::OPERATOR, 103.0));
    }

    public function testIgnoresEmptyIdentifiers(): void
    {
        $queue = new FailedTransferResumeQueue(1.0, 3);
        $queue->schedule('', self::LINKEDID, 100.0);
        $queue->schedule(self::OPERATOR, '', 100.0);

        self::assertSame([], $queue->due(1000.0));
    }
}
