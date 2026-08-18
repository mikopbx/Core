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

    public function testFailedParallelLegDoesNotMatchWinningLeg(): void
    {
        $failedTransferId = 'mikopbx-1787057309.61_9pn9CK';
        $winningTransferId = 'mikopbx-1787057309.59_w84c1q';
        $candidateUniqueIds = [
            $failedTransferId,
            $winningTransferId,
            $winningTransferId . '_PJSIP/201-0000001a',
        ];

        $matchedUniqueIds = array_values(
            array_filter(
                $candidateUniqueIds,
                static fn(string $rowUniqueId): bool => TransferCdrLegMatcher::matches(
                    $rowUniqueId,
                    $failedTransferId
                )
            )
        );

        self::assertSame([$failedTransferId], $matchedUniqueIds);
    }
}
