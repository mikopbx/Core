<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\TransferCdrResumeSelector;
use PHPUnit\Framework\TestCase;

final class TransferCdrResumeSelectorTest extends TestCase
{
    public function testDoesNotResumeRingingSiblingWhenNoTransferLegMatched(): void
    {
        $row = (object)['answer' => ''];

        self::assertNull(TransferCdrResumeSelector::select(0, [$row]));
    }

    public function testDoesNotResumeRingingSiblingAfterMatchedHangup(): void
    {
        $row = (object)['answer' => ''];

        self::assertNull(TransferCdrResumeSelector::select(1, [$row]));
    }

    public function testResumesOnlySingleAnsweredRowAfterExactMatch(): void
    {
        $row = (object)['answer' => '2026-08-06 14:27:37'];

        self::assertSame($row, TransferCdrResumeSelector::select(1, [$row]));
        self::assertNull(TransferCdrResumeSelector::select(2, [$row]));
        self::assertNull(TransferCdrResumeSelector::select(1, [$row, clone $row]));
    }
}
