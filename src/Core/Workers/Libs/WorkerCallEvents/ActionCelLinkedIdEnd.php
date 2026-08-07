<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Common\Models\CallDetailRecordsTmp;
use MikoPBX\Core\System\SystemMessages;

/**
 * Closes residual temporary CDR rows after Asterisk retires a linked ID.
 */
final class ActionCelLinkedIdEnd
{
    public static function execute(string $linkedId, string $eventTime): int
    {
        if ($linkedId === '' || $eventTime === '') {
            return 0;
        }

        $rows = CallDetailRecordsTmp::find([
            'linkedid=:linkedid: AND endtime=""',
            'bind' => ['linkedid' => $linkedId],
        ]);
        return self::closeRows($rows, $eventTime);
    }

    /**
     * @param iterable<CallDetailRecordsTmp> $rows
     */
    private static function closeRows(iterable $rows, string $eventTime): int
    {
        $updated = 0;
        /** @var CallDetailRecordsTmp $row */
        foreach ($rows as $row) {
            $row->writeAttribute('endtime', $eventTime);
            $row->writeAttribute('transfer', 0);
            if ($row->save()) {
                ++$updated;
                continue;
            }
            SystemMessages::sysLogMsg(__CLASS__, implode(' ', $row->getMessages()), LOG_WARNING);
        }

        return $updated;
    }
}
