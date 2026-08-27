<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Core\System\Network;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

final class NetworkVlanSecurityTest extends TestCase
{
    public function testGetInterfaceCommandTreatsNameAsOneShellArgument(): void
    {
        self::assertTrue(method_exists(Network::class, 'buildGetInterfaceCommand'));
        $method = new ReflectionMethod(Network::class, 'buildGetInterfaceCommand');
        $method->setAccessible(true);

        $command = $method->invoke(null, '/sbin/ifconfig', 'vlan1;printf PWNED;#');

        self::assertSame("'/sbin/ifconfig' 'vlan1;printf PWNED;#' 2>/dev/null", $command);
    }

    public function testVlanAddCommandTreatsStoredValuesAsShellArguments(): void
    {
        self::assertTrue(method_exists(Network::class, 'buildVlanAddCommand'));
        $method = new ReflectionMethod(Network::class, 'buildVlanAddCommand');
        $method->setAccessible(true);

        $command = $method->invoke(
            null,
            '/sbin/vconfig',
            'eth0;printf PWNED;#',
            '1;printf PWNED;#'
        );

        self::assertSame(
            "'/sbin/vconfig' add 'eth0;printf PWNED;#' '1;printf PWNED;#'",
            $command
        );
    }
}
