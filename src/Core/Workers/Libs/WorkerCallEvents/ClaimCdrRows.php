<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Common\Models\CallDetailRecordsTmp;
use Phalcon\Di\Di;
use RuntimeException;
use Throwable;

final class ClaimCdrRows
{
    public const int LEASE_SECONDS = 120;
    public const int BATCH_SIZE = 200;

    public static function execute(array $request): string
    {
        $token = trim((string)($request['token'] ?? ''));
        $mode = (string)($request['mode'] ?? '');
        if ($token === '' || !in_array($mode, ['linkedid', 'uniqueids'], true)) {
            return '[]';
        }

        $conditions = 'work_completed<>1 AND endtime<>"" AND '
            . '(processing_token="" OR processing_started_at<:expired:)';
        $bind = ['expired' => time() - self::LEASE_SECONDS];
        if ($mode === 'linkedid') {
            $linkedId = trim((string)($request['linkedid'] ?? ''));
            if ($linkedId === '') {
                return '[]';
            }
            $conditions .= ' AND linkedid=:linkedid:';
            $bind['linkedid'] = $linkedId;
        } else {
            $uniqueIds = array_values(array_unique(array_filter(
                $request['uniqueids'] ?? [],
                static fn(mixed $id): bool => is_string($id) && $id !== ''
            )));
            if ($uniqueIds === []) {
                return '[]';
            }
            $conditions .= ' AND UNIQUEID IN ({uniqueids:array})';
            $bind['uniqueids'] = $uniqueIds;
        }

        $db = Di::getDefault()?->getShared('dbCDR');
        if ($db === null) {
            throw new RuntimeException('CDR database is unavailable');
        }
        try {
            $db->execute('BEGIN IMMEDIATE');
            $rows = CallDetailRecordsTmp::find([
                $conditions,
                'bind' => $bind,
                'columns' => 'id',
                'limit' => min(self::BATCH_SIZE, max(1, (int)($request['limit'] ?? self::BATCH_SIZE))),
                'order' => 'answer',
            ]);
            foreach ($rows as $row) {
                $db->execute(
                    'UPDATE cdr SET processing_token = ?, processing_started_at = ? '
                    . 'WHERE id = ? AND work_completed <> 1 AND endtime <> "" '
                    . 'AND (processing_token = "" OR processing_started_at < ?)',
                    [$token, time(), $row->id, time() - self::LEASE_SECONDS]
                );
            }
            $claimedRows = CallDetailRecordsTmp::find([
                'processing_token=:token: AND work_completed<>1',
                'bind' => ['token' => $token],
                'limit' => self::BATCH_SIZE,
                'order' => 'answer',
            ])->toArray();
            $db->execute('COMMIT');
        } catch (Throwable $e) {
            try {
                $db->execute('ROLLBACK');
            } catch (Throwable) {
                // Preserve the original claim failure.
            }
            throw $e;
        }

        try {
            return json_encode(CdrResponseFile::write($claimedRows), JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            $db->execute(
                'UPDATE cdr SET processing_token = "", processing_started_at = 0 '
                . 'WHERE processing_token = ? AND work_completed <> 1',
                [$token]
            );
            throw $e;
        }
    }
}
