<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/**
 * Determines whether an answered call-interception leg must outlive the
 * internal-originate Local channel that Bridge() optimizes away.
 *
 * On a call interception (context interception-bridge) the operator is reached
 * through a `Local/<ext>@internal-originate` channel that is fed into Bridge().
 * A fraction of a second after the answer Asterisk optimizes that Local channel
 * out of the path - the external caller keeps talking to the operator on the
 * surviving bridge - and fires a hangup for the Local leg. If that hangup closes
 * the answered CDR row, its endtime lands ~0.2s after its answer, so WorkerCdr
 * bills it as 0 seconds and the whole (answered) call is stored as NOANSWER.
 *
 * Keeping the row open lets the real external-channel hangup (or LINKEDID_END)
 * close it, so its billsec reflects the entire conversation.
 */
final class InterceptionBridgeLegPolicy
{
    public static function keepOpen(object $row, string $hangupChannel): bool
    {
        $dstChan = (string)($row->dst_chan ?? '');
        $srcChan = (string)($row->src_chan ?? '');

        return (string)($row->answer ?? '') !== ''
            && (string)($row->endtime ?? '') === ''
            && (string)($row->transfer ?? '') !== '1'
            && $dstChan === $hangupChannel
            && str_contains($dstChan, '@internal-originate')
            && $srcChan !== ''
            && $srcChan !== $hangupChannel;
    }
}
