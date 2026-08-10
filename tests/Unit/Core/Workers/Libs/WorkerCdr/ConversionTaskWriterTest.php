<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCdr;

use MikoPBX\Core\Workers\Libs\WorkerCdr\ConversionTaskWriter;
use PHPUnit\Framework\TestCase;

final class ConversionTaskWriterTest extends TestCase
{
    public function testPublishesOneDeterministicTaskAtomically(): void
    {
        $dir = sys_get_temp_dir() . '/cdr-task-' . bin2hex(random_bytes(4));
        mkdir($dir);
        $payload = ['uniqueid' => 'call-1', 'created_at' => 1];

        $first = ConversionTaskWriter::write($dir, 'call-1', $payload);
        $second = ConversionTaskWriter::write($dir, 'call-1', $payload);

        self::assertSame($dir . '/' . hash('sha256', 'call-1') . '.json', $first);
        self::assertSame($first, $second);
        self::assertSame($payload, json_decode((string)file_get_contents($first), true));
        self::assertCount(1, glob($dir . '/*.json'));
        unlink($first);
        rmdir($dir);
    }
}
