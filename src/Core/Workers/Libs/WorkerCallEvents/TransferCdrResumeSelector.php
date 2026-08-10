<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/** Selects the only safe CDR leg whose recording may be resumed. */
final class TransferCdrResumeSelector
{
    public static function select(int $matched, iterable $rows): ?object
    {
        if ($matched !== 1) {
            return null;
        }

        $selected = null;
        foreach ($rows as $row) {
            if ($selected !== null || trim((string)($row->answer ?? '')) === '') {
                return null;
            }
            $selected = $row;
        }

        return $selected;
    }
}
