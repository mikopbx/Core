<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Common;

use MikoPBX\PBXCoreREST\Lib\Common\ServerTimeMeta;
use PHPUnit\Framework\TestCase;

/**
 * Server timezone metadata read by PbxDateTime.setServerMeta() in the web UI.
 */
final class ServerTimeMetaTest extends TestCase
{
    public function testBuildHasTimezoneOnly(): void
    {
        date_default_timezone_set('Asia/Novosibirsk');
        self::assertSame(
            ['server_timezone' => 'Asia/Novosibirsk', 'server_timezone_offset' => 25200],
            ServerTimeMeta::build()
        );
    }

    public function testBuildWithNowAddsPbxWallClockTime(): void
    {
        date_default_timezone_set('Asia/Kolkata');
        $before = time();
        $meta = ServerTimeMeta::buildWithNow();
        $after = time();

        self::assertSame('Asia/Kolkata', $meta['server_timezone']);
        self::assertSame(19800, $meta['server_timezone_offset']);
        self::assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $meta['server_now']);
        $now = strtotime($meta['server_now']);
        self::assertGreaterThanOrEqual($before, $now);
        self::assertLessThanOrEqual($after, $now);
    }
}
