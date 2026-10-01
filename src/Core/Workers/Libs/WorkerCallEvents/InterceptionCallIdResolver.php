<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/**
 * Restores SIP dialog ownership for a call interception CDR leg.
 */
final class InterceptionCallIdResolver
{
    /**
     * @param array<string, mixed> $data
     * @param iterable<array<string, mixed>|object> $sourceRows
     * @return array<string, mixed>
     */
    public static function resolve(array $data, iterable $sourceRows): array
    {
        $data['dst_call_id'] = trim((string)($data['dst_call_id'] ?? $data['src_call_id'] ?? ''));
        $data['src_call_id'] = '';

        $linkedId = (string)($data['linkedid'] ?? '');
        $sourceChannel = (string)($data['src_chan'] ?? '');
        foreach ($sourceRows as $row) {
            $rowData = is_array($row) ? $row : get_object_vars($row);
            if (
                (string)($rowData['linkedid'] ?? '') !== $linkedId
                || (string)($rowData['src_chan'] ?? '') !== $sourceChannel
            ) {
                continue;
            }

            $sourceCallId = trim((string)($rowData['src_call_id'] ?? ''));
            if ($sourceCallId !== '') {
                $data['src_call_id'] = $sourceCallId;
                break;
            }
        }

        return $data;
    }
}
