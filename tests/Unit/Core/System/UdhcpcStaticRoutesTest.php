<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Core\System\Udhcpc;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

/**
 * DHCP `staticroutes` is supplied by the DHCP server and must never reach the shell unvalidated.
 */
final class UdhcpcStaticRoutesTest extends TestCase
{
    /**
     * @return array{0: array, 1: array} [routes, rejected]
     */
    private function parse(string $staticRoutes, bool $allowDefaultRoute = true): array
    {
        $method = new ReflectionMethod(Udhcpc::class, 'parseStaticRoutes');
        $method->setAccessible(true);
        $rejected = [];
        $routes = $method->invokeArgs(null, [$staticRoutes, $allowDefaultRoute, &$rejected]);
        return [$routes, $rejected];
    }

    public function testValidRoutesAreParsedAndDeduplicated(): void
    {
        [$routes, $rejected] = $this->parse(
            '0.0.0.0/0 10.0.0.1 169.254.169.254/32 10.0.0.65  0.0.0.0/0 10.0.0.9 192.168.5.7 10.0.0.2'
        );

        self::assertSame(
            [
                ['0.0.0.0/0', '10.0.0.1'],
                ['169.254.169.254/32', '10.0.0.65'],
                ['192.168.5.7', '10.0.0.2'],
            ],
            $routes
        );
        self::assertSame([], $rejected);
    }

    /**
     * @dataProvider maliciousRoutesProvider
     */
    public function testMaliciousRoutesAreRejected(string $staticRoutes): void
    {
        [$routes] = $this->parse($staticRoutes);
        self::assertSame([], $routes);
    }

    public static function maliciousRoutesProvider(): array
    {
        return [
            'semicolon in gateway' => ['10.9.9.0/24 1.2.3.4;touch${IFS}/tmp/pwn'],
            'command substitution' => ['$(id)/24 1.2.3.4'],
            'backticks' => ['10.9.9.0/24 `id`'],
            'pipe' => ['10.9.9.0/24|id 1.2.3.4'],
            'prefix too long' => ['10.9.9.0/33 1.2.3.4'],
            'prefix with leading zero' => ['10.9.9.0/08 1.2.3.4'],
            'ipv6 destination' => ['2001:db8::/32 1.2.3.4'],
            'hostname gateway' => ['10.9.9.0/24 evil.example'],
            'unpaired item' => ['10.9.9.0/24'],
            'empty' => ['  '],
        ];
    }

    public function testInvalidPairDoesNotDropFollowingValidPair(): void
    {
        [$routes, $rejected] = $this->parse('10.9.9.0/24 1.2.3.4;id 10.8.0.0/16 10.0.0.1');

        self::assertSame([['10.8.0.0/16', '10.0.0.1']], $routes);
        self::assertCount(1, $rejected);
    }

    public function testNewlinesSplitItemsAndUnpairedItemIsRejected(): void
    {
        [$routes, $rejected] = $this->parse("10.9.9.0/24\n1.2.3.4\n;id");

        self::assertSame([['10.9.9.0/24', '1.2.3.4']], $routes);
        self::assertSame([';id (unpaired item)'], $rejected);
    }

    public function testDefaultRouteIsRejectedOnNonInternetInterface(): void
    {
        [$routes, $rejected] = $this->parse('0.0.0.0/0 10.0.0.1 10.8.0.0/16 10.0.0.1', false);

        self::assertSame([['10.8.0.0/16', '10.0.0.1']], $routes);
        self::assertCount(1, $rejected);
    }

    public function testRouteCommandQuotesEveryArgument(): void
    {
        $method = new ReflectionMethod(Udhcpc::class, 'buildStaticRouteCommand');
        $method->setAccessible(true);

        self::assertSame(
            "/sbin/ip route add '10.9.9.0/24' via '10.0.0.1' dev 'eth0;id'",
            $method->invoke(null, '/sbin/ip', '10.9.9.0/24', '10.0.0.1', 'eth0;id')
        );
    }
}
