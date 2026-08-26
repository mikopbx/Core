<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\SoundFiles;

use MikoPBX\PBXCoreREST\Lib\SoundFiles\SoundFileConversionTicket;
use PHPUnit\Framework\TestCase;

final class SoundFileConversionTicketTest extends TestCase
{
    public function testTicketCanBeConsumedOnlyOnceForMatchingCategory(): void
    {
        $storage = [];
        $ticket = new SoundFileConversionTicket(
            static function (string $key, string $value, int $ttl) use (&$storage): void {
                $storage[$key] = $value;
            },
            static function (string $key) use (&$storage): ?string {
                return $storage[$key] ?? null;
            },
            static function (string $key) use (&$storage): void {
                unset($storage[$key]);
            }
        );

        $id = $ticket->issue('/media/custom/welcome.webm', 'custom');

        self::assertNull($ticket->consume($id, 'moh'));
        self::assertSame('/media/custom/welcome.webm', $ticket->consume($id, 'custom'));
        self::assertNull($ticket->consume($id, 'custom'));
    }
}
