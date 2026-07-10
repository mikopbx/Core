<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk\Configs;

use MikoPBX\Core\Asterisk\Configs\ResolverUnboundConf;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

final class ResolverUnboundConfTest extends TestCase
{
    public function testBuildsSystemResolverConfiguration(): void
    {
        self::assertTrue(class_exists(ResolverUnboundConf::class));

        $reflection = new ReflectionClass(ResolverUnboundConf::class);
        $generator = $reflection->newInstanceWithoutConstructor();
        $description = $reflection->getProperty('description');
        $description->setAccessible(true);
        $method = $reflection->getMethod('buildConfig');
        $method->setAccessible(true);

        self::assertSame('resolver_unbound.conf', $description->getValue($generator));
        self::assertSame(
            "[general]\nhosts = system\nresolv = system\ndebug = 0\n",
            $method->invoke($generator)
        );
    }
}
