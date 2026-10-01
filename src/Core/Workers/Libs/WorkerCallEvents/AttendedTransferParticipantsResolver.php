<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/** Resolves the two surviving parties of an attended transfer from its CDR legs. */
final class AttendedTransferParticipantsResolver
{
    /**
     * @param iterable<object> $rows
     * @param list<string> $transfererChannels
     * @param list<string> $transfereeChannels
     * @param list<string> $transferTargetChannels
     * @return array<string, mixed>|null
     */
    public static function resolve(
        iterable $rows,
        array $transfererChannels,
        array $transfereeChannels = [],
        array $transferTargetChannels = []
    ): ?array {
        $transfererChannels = self::normalizeChannels($transfererChannels);
        if ($transfererChannels === []) {
            return null;
        }
        $transfereeChannels = self::normalizeChannels($transfereeChannels);
        $transferTargetChannels = self::normalizeChannels($transferTargetChannels);
        $transferers = array_fill_keys($transfererChannels, true);
        $sourceCandidates = [];
        $destinationCandidates = [];

        foreach ($rows as $row) {
            if ((string)($row->answer ?? '') === '') {
                continue;
            }

            $srcChannel = (string)($row->src_chan ?? '');
            $dstChannel = (string)($row->dst_chan ?? '');
            $srcIsTransferer = isset($transferers[$srcChannel]);
            $dstIsTransferer = isset($transferers[$dstChannel]);
            if ($srcIsTransferer === $dstIsTransferer) {
                continue;
            }

            $uniqueId = (string)($row->UNIQUEID ?? '');
            if ($uniqueId === '') {
                continue;
            }

            if ($dstIsTransferer && $srcChannel !== '') {
                $sourceCandidates[$uniqueId] = [
                    'src_chan' => $srcChannel,
                    'src_num' => (string)($row->src_num ?? ''),
                    'src_name' => (string)($row->src_name ?? ''),
                    'src_call_id' => (string)($row->src_call_id ?? ''),
                    'did' => (string)($row->did ?? ''),
                ];
            } elseif (
                $srcIsTransferer
                && $dstChannel !== ''
            ) {
                $destinationCandidates[$uniqueId] = [
                    'dst_chan' => $dstChannel,
                    'dst_num' => (string)($row->dst_num ?? ''),
                    'dst_name' => (string)($row->dst_name ?? ''),
                    'dst_call_id' => (string)($row->dst_call_id ?? ''),
                    'did' => (string)($row->did ?? ''),
                    'endtime' => (string)($row->endtime ?? ''),
                ];
            }
        }

        $exactSources = array_filter(
            $sourceCandidates,
            static fn(array $candidate): bool => in_array(
                $candidate['src_chan'],
                $transfereeChannels,
                true
            )
        );
        if ($exactSources !== []) {
            $sourceCandidates = $exactSources;
        }

        $exactDestinations = array_filter(
            $destinationCandidates,
            static fn(array $candidate): bool => in_array(
                $candidate['dst_chan'],
                $transferTargetChannels,
                true
            )
        );
        if ($exactDestinations !== []) {
            $destinationCandidates = $exactDestinations;
        } else {
            // Without an exact CEL target, an open answered leg is safer than an
            // already completed service leg such as Queue:2001.
            $destinationCandidates = array_filter(
                $destinationCandidates,
                static fn(array $candidate): bool => $candidate['endtime'] === ''
            );
        }

        if (count($sourceCandidates) !== 1 || count($destinationCandidates) !== 1) {
            return null;
        }

        $sourceUniqueId = array_key_first($sourceCandidates);
        $destinationUniqueId = array_key_first($destinationCandidates);
        $source = $sourceCandidates[$sourceUniqueId];
        $destination = $destinationCandidates[$destinationUniqueId];
        unset($destination['endtime']);

        return [
            'src_chan' => $source['src_chan'],
            'src_num' => $source['src_num'],
            'src_name' => $source['src_name'],
            'src_call_id' => $source['src_call_id'],
            'dst_chan' => $destination['dst_chan'],
            'dst_num' => $destination['dst_num'],
            'dst_name' => $destination['dst_name'],
            'dst_call_id' => $destination['dst_call_id'],
            'did' => $source['did'] !== '' ? $source['did'] : $destination['did'],
            'selected_uniqueids' => [$sourceUniqueId, $destinationUniqueId],
        ];
    }

    /**
     * @param list<mixed> $channels
     * @return list<string>
     */
    private static function normalizeChannels(array $channels): array
    {
        return array_values(array_unique(array_filter(
            $channels,
            static fn(mixed $channel): bool => is_string($channel) && $channel !== ''
        )));
    }
}
