<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCallEvents;

use RuntimeException;

final class CdrResponseFile
{
    public static function write(array $rows): string
    {
        $filename = tempnam(sys_get_temp_dir(), 'cdr-claim-');
        if ($filename === false) {
            throw new RuntimeException('Unable to create CDR response file');
        }
        chmod($filename, 0600);
        $json = json_encode($rows, JSON_THROW_ON_ERROR);
        if (file_put_contents($filename, $json, LOCK_EX) !== strlen($json)) {
            @unlink($filename);
            throw new RuntimeException('Unable to write CDR response file');
        }
        return $filename;
    }
}
