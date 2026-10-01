<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/**
 * Resolves the real destination endpoint that must be recorded for an answered
 * call-interception / Smart-IVR originate leg, whose conversation would
 * otherwise go unrecorded.
 *
 * On these calls the answered leg is a `Local/<ext>@internal-originate` channel:
 *   - lua event_dial_answer() deliberately skips MixMonitor for `Local/` channels
 *     (the real endpoint is expected to record itself), and
 *   - that real endpoint is reached through `originate-create-channel`, never the
 *     `dial_create_chan` path that starts the lua recording,
 * so no leg ever starts MixMonitor and both the audio file and the CDR
 * recordingfile stay empty (billsec is still correct - see InterceptionBridgeLegPolicy).
 *
 * Recording must run on the destination endpoint (project rule), so the real
 * `PJSIP/<ext>` channel is derived from the Local leg that entered the bridge:
 *   dst_chan (Local ;1) -> other half (;2) -> BRIDGEPEER = PJSIP/<ext>
 * and, once Asterisk optimizes the Local pair out of the path, directly from the
 * surviving caller leg:
 *   src_chan -> BRIDGEPEER = PJSIP/<ext>
 * The endpoint outlives Local-channel optimization, so it holds the whole
 * conversation. Returns '' whenever the ordinary recording path already applies,
 * so normal calls are never touched.
 */
final class InterceptionRecordingResolver
{
    /**
     * @param array    $data   Dial-answer event data (needs 'recordingfile').
     * @param object   $row    CDR row (needs src_chan, dst_chan).
     * @param callable $getVar fn(string $channel, string $variable): string - AMI GetVar accessor.
     * @return string The real destination channel to record on, or '' when not applicable.
     */
    public static function resolveDestinationChannel(array $data, object $row, callable $getVar): string
    {
        // Ordinary calls already carry a recording started by lua event_dial_answer().
        if (trim((string)($data['recordingfile'] ?? '')) !== '') {
            return '';
        }

        $dstChan = (string)($row->dst_chan ?? '');
        $srcChan = (string)($row->src_chan ?? '');

        // Only the answered leg whose dst_chan is the Local/<ext>@internal-originate leg.
        if (stripos($dstChan, 'Local/') !== 0 || !str_contains($dstChan, '@internal-originate')) {
            return '';
        }

        // Probe the far side of the origination first (Local ;2), then the caller leg
        // (valid after the Local pair is optimized away). The first real, non-Local
        // bridge peer is the answered endpoint.
        $probes = [self::otherHalf($dstChan), $srcChan];
        foreach ($probes as $probe) {
            if ($probe === null || $probe === '') {
                continue;
            }
            $peer = trim((string)$getVar($probe, 'BRIDGEPEER'));
            $isRealEndpoint = $peer !== ''
                && stripos($peer, 'Local/') !== 0
                && $peer !== $srcChan
                && $peer !== $dstChan;
            if ($isRealEndpoint) {
                return $peer;
            }
        }

        return '';
    }

    /**
     * Returns the partner half of a Local channel pair (;1 <-> ;2), or null.
     */
    private static function otherHalf(string $localChannel): ?string
    {
        if (str_ends_with($localChannel, ';1')) {
            return substr($localChannel, 0, -1) . '2';
        }
        if (str_ends_with($localChannel, ';2')) {
            return substr($localChannel, 0, -1) . '1';
        }
        return null;
    }
}
