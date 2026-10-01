<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\PickupRecordingResolver;
use PHPUnit\Framework\TestCase;

final class PickupRecordingResolverTest extends TestCase
{
    public function testUsesEventRecordingWithoutStartingFallback(): void
    {
        $fallbackCalls = 0;

        $recordingFile = PickupRecordingResolver::resolve(
            ['recordingfile' => '/monitor/original.webm'],
            static function () use (&$fallbackCalls): string {
                ++$fallbackCalls;
                return '/monitor/pickup.webm';
            }
        );

        self::assertSame('/monitor/original.webm', $recordingFile);
        self::assertSame(0, $fallbackCalls);
    }

    public function testStartsFallbackOnceWhenEventRecordingIsEmpty(): void
    {
        $fallbackCalls = 0;

        $recordingFile = PickupRecordingResolver::resolve(
            ['recordingfile' => '   '],
            static function () use (&$fallbackCalls): string {
                ++$fallbackCalls;
                return '/monitor/pickup.webm';
            }
        );

        self::assertSame('/monitor/pickup.webm', $recordingFile);
        self::assertSame(1, $fallbackCalls);
    }
}
