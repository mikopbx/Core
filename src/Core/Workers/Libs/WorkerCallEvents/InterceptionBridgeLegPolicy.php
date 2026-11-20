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

    /**
     * Whether the answered interception leg ends because its caller is dialled onwards.
     *
     * The operator who answered an interception talks on a channel without a hangup
     * handler, so neither its hangup nor a blind transfer it makes is reported. The only
     * trace is the caller itself entering a new transfer_dial/queue: at that moment the
     * row kept open by keepOpen() is over.
     */
    public static function endsOnTransfereeRedial(object $row, string $transfereeChannel): bool
    {
        return $transfereeChannel !== ''
            && (string)($row->src_chan ?? '') === $transfereeChannel
            && (string)($row->answer ?? '') !== ''
            && (string)($row->endtime ?? '') === ''
            && str_contains((string)($row->dst_chan ?? ''), '@internal-originate');
    }

    /**
     * Whether an answered leg must take its destination name from the interception
     * itself instead of the A-leg CONNECTEDLINE(name).
     *
     * On a call interception the A-leg CONNECTEDLINE still names the party the call
     * was ringing before the interception, while the leg's dst_* already point to the
     * operator who intercepted. Overwriting dst_name from CONNECTEDLINE would show
     * the intercepted party for the answering operator's leg. lua
     * event_dial_interception() resolves the answering endpoint's name into the row;
     * when it could not, the caller falls back to a dst_num lookup.
     *
     * @param object $row             The answered CDR leg.
     * @param string $isInterception  Flag from event_dial_answer(). Asterisk optimizes the Local
     *                                pair away after answer, so the leg may run on a plain
     *                                endpoint channel whose dst_chan no longer identifies it.
     */
    public static function prefersResolvedDstName(object $row, string $isInterception = ''): bool
    {
        if ((string)($row->src_chan ?? '') === '') {
            return false;
        }

        return $isInterception === '1'
            || str_contains((string)($row->dst_chan ?? ''), '@internal-originate');
    }
}
