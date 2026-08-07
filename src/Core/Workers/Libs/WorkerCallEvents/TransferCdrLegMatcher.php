<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/**
 * Matches temporary CDR rows belonging to one transfer attempt.
 */
final class TransferCdrLegMatcher
{
    public static function matches(string $rowUniqueId, string $transferUniqueId): bool
    {
        if ($transferUniqueId === '') {
            return false;
        }

        return $rowUniqueId === $transferUniqueId
            || str_starts_with($rowUniqueId, $transferUniqueId . '_');
    }
}
