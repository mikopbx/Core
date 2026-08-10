<?php

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerCdr;

use RuntimeException;

final class ConversionTaskWriter
{
    public static function write(string $tasksDir, string $uniqueId, array $payload): string
    {
        if ($uniqueId === '') {
            throw new RuntimeException('Conversion task UNIQUEID is empty');
        }
        $target = $tasksDir . '/' . hash('sha256', $uniqueId) . '.json';
        $temporary = $target . '.tmp.' . bin2hex(random_bytes(8));
        $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        if (file_put_contents($temporary, $json, LOCK_EX) !== strlen($json)) {
            @unlink($temporary);
            throw new RuntimeException('Unable to write conversion task');
        }
        if (!rename($temporary, $target)) {
            @unlink($temporary);
            throw new RuntimeException('Unable to publish conversion task');
        }
        return $target;
    }
}
