<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\Configs;

use MikoPBX\Core\System\Configs\SyslogConf;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

final class SyslogConfTest extends TestCase
{
    public function testDropbearMonitNoiseFilterDiscardsOnlyExpectedMessages(): void
    {
        $method = new ReflectionMethod(SyslogConf::class, 'buildDropbearMonitNoiseFilter');
        $method->setAccessible(true);

        self::assertSame(
            <<<'RSYSLOG'
if $programname == "dropbear" and (
    $msg contains "Child connection from 127.0.0.1:" or
    $msg contains "Exit before auth from <127.0.0.1:" or
    $msg contains "Forced command set to '/etc/rc/hello'"
) then stop

RSYSLOG,
            $method->invoke(null)
        );
    }
}
