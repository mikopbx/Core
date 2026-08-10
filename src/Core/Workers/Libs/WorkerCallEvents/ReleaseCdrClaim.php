<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

use Phalcon\Di\Di;

final class ReleaseCdrClaim
{
    public static function execute(string $token): int
    {
        if ($token === '') {
            return 0;
        }
        $db = Di::getDefault()?->getShared('dbCDR');
        $db->execute(
            'UPDATE cdr SET processing_token = "", processing_started_at = 0 '
            . 'WHERE processing_token = ? AND work_completed <> 1',
            [$token]
        );
        return $db->affectedRows();
    }
}
