<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

/** Determines whether an answered destination leg must outlive its transferer. */
final class AnsweredTransferLegPolicy
{
    public static function keepOpen(object $row, string $hangupChannel): bool
    {
        return (string)($row->transfer ?? '') === '1'
            && (string)($row->src_chan ?? '') === $hangupChannel
            && (string)($row->dst_chan ?? '') !== ''
            && (string)($row->answer ?? '') !== ''
            && (string)($row->endtime ?? '') === '';
    }
}
