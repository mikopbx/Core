<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk\Configs;

use MikoPBX\Core\Asterisk\Configs\CelConf;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

final class CelConfTest extends TestCase
{
    public function testEnablesLinkedIdEndEvent(): void
    {
        $reflection = new ReflectionClass(CelConf::class);
        $config = $reflection->newInstanceWithoutConstructor();
        $method = $reflection->getMethod('buildConfig');
        $method->setAccessible(true);

        self::assertStringContainsString(
            "events=USER_DEFINED,ANSWER,ATTENDEDTRANSFER,LINKEDID_END\n",
            $method->invoke($config)
        );
    }
}
