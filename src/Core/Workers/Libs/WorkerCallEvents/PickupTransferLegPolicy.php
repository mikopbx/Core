<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/**
 * Determines whether a still-ringing transfer leg must outlive the hangup that
 * fires when a *8 pickup steals it.
 *
 * During an attended transfer the operator's endpoints are dialed as transfer
 * legs (transfer=1), each leg getting its own not-yet-answered CDR row. If the
 * call is answered through a directed pickup (*8<ext> / PickupChan) a brand new
 * channel answers instead of any dialed leg, and the stolen ringing channel is
 * torn down. That hangup would normally close the leg's CDR row (endtime set,
 * answer still empty), so the transfer_dial_answer of the pickup channel - which
 * arrives a fraction of a second later and correlates by transfer_UNIQUEID -
 * finds no open row, and both the answer timestamp and the recording file are
 * dropped: the answered conversation is stored as a missed call with no audio.
 *
 * A pickup pulls the stolen channel out of its original call group, so its hangup
 * arrives tagged with a verbose_call_id different from the one stamped on the leg's
 * CDR row when the transfer was dialed - either the picker's group (e.g. [C-...]) or
 * an empty value once the channel has left every group. Either way, a mismatch on a
 * leg that is a transfer destination and has not been answered yet marks the pickup;
 * a plain no-answer leg is torn down inside its own group, so its verbose_call_id
 * still matches the row and is left to close normally.
 *
 * Keeping the row open lets the following transfer_dial_answer match it by
 * transfer_UNIQUEID and stamp the answer and recording, and LINKEDID_END (or the
 * real conversation hangup) close it, so its billsec reflects the real talk time.
 * A false positive is harmless: with no pickup answer the row is finalized by
 * LINKEDID_END with an empty answer, i.e. NOANSWER - the current behavior.
 */
final class PickupTransferLegPolicy
{
    public static function keepOpen(object $row, string $hangupChannel, string $eventVerboseCallId): bool
    {
        return (string)($row->transfer ?? '') === '1'
            && (string)($row->dst_chan ?? '') === $hangupChannel
            && (string)($row->answer ?? '') === ''
            && (string)($row->endtime ?? '') === ''
            && (string)($row->verbose_call_id ?? '') !== ''
            && (string)($row->verbose_call_id ?? '') !== $eventVerboseCallId;
    }
}
