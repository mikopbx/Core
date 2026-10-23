<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/** Determines whether an answered destination leg must outlive its transferer. */
final class AnsweredTransferLegPolicy
{
    public static function keepOpen(object $row, string $hangupChannel): bool
    {
        return (string)($row->transfer ?? '') === '1'
            && (string)($row->src_chan ?? '') === $hangupChannel
            && (string)($row->dst_chan ?? '') !== ''
            && (string)($row->answer ?? '') !== ''
            && (string)($row->endtime ?? '') === '';
    }

    /**
     * Picks the two answered rows of an attended transfer the transferer has just completed
     * by hanging up: its conversation with the transferee and the answered consultation leg.
     *
     * With exactly that pair the transfer is unambiguous, so both rows are closed and
     * CreateRowTransfer bills the transferee<->destination conversation as a row of its own.
     * Anything else (a queue/app pseudo leg, several answered legs) returns null and the
     * consultation leg is kept open by keepOpen() instead (#1100).
     *
     * @param array<int, array<string, mixed>> $rows Open transfer=1 rows of the linkedid.
     * @return array<int, array<string, mixed>>|null
     */
    public static function completedTransferPair(array $rows, string $transferer): ?array
    {
        $answered = [];
        $consultationLegs = 0;
        foreach ($rows as $row) {
            $srcChan = (string)($row['src_chan'] ?? '');
            $dstChan = (string)($row['dst_chan'] ?? '');
            $isOpenAnswered = (string)($row['transfer'] ?? '') === '1'
                && (string)($row['answer'] ?? '') !== ''
                && (string)($row['endtime'] ?? '') === '';
            if (!$isOpenAnswered || ($srcChan !== $transferer && $dstChan !== $transferer)) {
                continue;
            }
            if ($dstChan === '' || self::isPseudoChannel($srcChan) || self::isPseudoChannel($dstChan)) {
                return null;
            }
            if (self::keepOpen((object)$row, $transferer)) {
                ++$consultationLegs;
            }
            $answered[] = $row;
        }

        return (count($answered) === 2 && $consultationLegs > 0) ? $answered : null;
    }

    private static function isPseudoChannel(string $channel): bool
    {
        return str_starts_with($channel, 'Queue:') || str_starts_with($channel, 'App:');
    }
}
