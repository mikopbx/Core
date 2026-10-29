<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/** Determines whether an answered destination leg must outlive its transferer. */
final class AnsweredTransferLegPolicy
{
    /**
     * @param string[] $notConsultation Destinations whose rows are not consultation legs, see
     *     notConsultationLegs(): the hangup of the transferer ends them.
     */
    public static function keepOpen(object $row, string $hangupChannel, array $notConsultation = []): bool
    {
        $dstChan = (string)($row->dst_chan ?? '');

        return (string)($row->transfer ?? '') === '1'
            && (string)($row->src_chan ?? '') === $hangupChannel
            && $dstChan !== ''
            && !in_array($dstChan, $notConsultation, true)
            && (string)($row->answer ?? '') !== ''
            && (string)($row->endtime ?? '') === '';
    }

    /**
     * Destinations of the hanging-up channel's rows that keepOpen() must not take for
     * consultation legs although that channel is their src_chan:
     * - a channel dialing a transfer leg of its own (onwardTransferers()): the conversation with
     *   a party being transferred on, e.g. B dialing C after A's blind transfer (**), which gets
     *   its transfer flag from that dial;
     * - the party of its own conversation when it placed the call itself, e.g. B called A and
     *   then consulted: its earliest answered row, with a later dial (open or already ended).
     *
     * @param iterable<object> $openRows Open rows of the linkedid.
     * @param iterable<object> $ownRows All rows of the linkedid with the hanging-up channel as src_chan.
     * @return string[]
     */
    public static function notConsultationLegs(iterable $openRows, iterable $ownRows, string $hangupChannel): array
    {
        $channels = array_fill_keys(self::onwardTransferers($openRows), true);
        $conversation = null;
        $latestStart = '';
        foreach ($ownRows as $row) {
            if ((string)($row->src_chan ?? '') !== $hangupChannel) {
                continue;
            }
            $latestStart = max($latestStart, (string)($row->start ?? ''));
            $answer = (string)($row->answer ?? '');
            if ($answer !== '' && ($conversation === null || $answer < (string)$conversation->answer)) {
                $conversation = $row;
            }
        }
        if ($conversation !== null && $latestStart > (string)$conversation->answer) {
            $channels[(string)$conversation->dst_chan] = true;
        }

        return array_keys($channels);
    }

    /**
     * Channels dialing a transfer leg of their own among the open rows of a linkedid.
     *
     * @param iterable<object> $rows
     * @return string[]
     */
    public static function onwardTransferers(iterable $rows): array
    {
        $channels = [];
        foreach ($rows as $row) {
            $srcChan = (string)($row->src_chan ?? '');
            if ((string)($row->transfer ?? '') === '1' && (string)($row->endtime ?? '') === '' && $srcChan !== '') {
                $channels[$srcChan] = true;
            }
        }

        return array_keys($channels);
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
     * @param string[] $notConsultation See keepOpen().
     * @return array<int, array<string, mixed>>|null
     */
    public static function completedTransferPair(array $rows, string $transferer, array $notConsultation = []): ?array
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
            if (self::keepOpen((object)$row, $transferer, $notConsultation)) {
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
