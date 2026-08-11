<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\TransferCdrLegMatcher;
use PHPUnit\Framework\TestCase;

final class TransferCdrLegMatcherTest extends TestCase
{
    public function testMatchesExactTransferAttempt(): void
    {
        $uniqueId = 'mikopbx-1786037251.23903_3mda12';

        self::assertTrue(TransferCdrLegMatcher::matches($uniqueId, $uniqueId));
    }

    public function testMatchesDuplicatedPhysicalContact(): void
    {
        $uniqueId = 'mikopbx-1786037251.23903_3mda12';

        self::assertTrue(
            TransferCdrLegMatcher::matches($uniqueId . '_PJSIP/637-00003030', $uniqueId)
        );
    }

    public function testRejectsSiblingAndAmbiguousPrefixes(): void
    {
        $uniqueId = 'mikopbx-1786037251.23903_3mda12';

        self::assertFalse(TransferCdrLegMatcher::matches($uniqueId . 'x', $uniqueId));
        self::assertFalse(TransferCdrLegMatcher::matches('mikopbx-1786037251.23903_other', $uniqueId));
        self::assertFalse(TransferCdrLegMatcher::matches($uniqueId, ''));
    }
}
