<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/**
 * Selects the recording already started by dial_answer or creates one fallback.
 */
final class PickupRecordingResolver
{
    public static function resolve(array $event, callable $fallback): string
    {
        $recordingFile = trim((string)($event['recordingfile'] ?? ''));

        return $recordingFile !== '' ? $recordingFile : (string)$fallback();
    }
}
