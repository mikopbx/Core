<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerCallEvents;

use MikoPBX\Core\Workers\Libs\WorkerCallEvents\PickupDestinationNameResolver;
use PHPUnit\Framework\TestCase;

final class PickupDestinationNameResolverTest extends TestCase
{
    public function testResolvesAnsweringExtensionNameNotInterceptedParty(): void
    {
        $lookupCalls = [];

        // 204 answered a call that was ringing 233; the clone carried "Портнова Татьяна".
        $name = PickupDestinationNameResolver::resolve(
            '204',
            static function (string $number) use (&$lookupCalls): string {
                $lookupCalls[] = $number;
                return $number === '204' ? 'Портнов Алексей' : 'Портнова Татьяна';
            }
        );

        self::assertSame('Портнов Алексей', $name);
        self::assertSame(['204'], $lookupCalls);
    }

    public function testReturnsEmptyWhenLookupYieldsBareNumber(): void
    {
        // getCidByPhoneNumber returns the number itself when no name is known.
        $name = PickupDestinationNameResolver::resolve(
            '204',
            static fn(string $number): string => $number
        );

        self::assertSame('', $name);
    }

    public function testReturnsEmptyWhenLookupYieldsEmptyString(): void
    {
        $name = PickupDestinationNameResolver::resolve(
            '204',
            static fn(string $number): string => ''
        );

        self::assertSame('', $name);
    }

    public function testReturnsEmptyForEmptyDstNumWithoutCallingLookup(): void
    {
        $lookupCalls = 0;

        $name = PickupDestinationNameResolver::resolve(
            '  ',
            static function () use (&$lookupCalls): string {
                ++$lookupCalls;
                return 'unexpected';
            }
        );

        self::assertSame('', $name);
        self::assertSame(0, $lookupCalls);
    }

    public function testStripsTagsFromResolvedName(): void
    {
        $name = PickupDestinationNameResolver::resolve(
            '204',
            static fn(string $number): string => '<b>Портнов</b> Алексей'
        );

        self::assertSame('Портнов Алексей', $name);
    }
}
