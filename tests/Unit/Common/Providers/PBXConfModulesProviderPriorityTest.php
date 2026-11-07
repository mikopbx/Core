<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Providers;

use MikoPBX\Common\Providers\PBXConfModulesProvider;
use Phalcon\Di\Di;
use PHPUnit\Framework\TestCase;

/**
 * Issue #1391 (B-072): the shared module list was sorted once, by the priority of the
 * first hook called in the process, so per-hook priorities of later hooks were ignored.
 */
final class PBXConfModulesProviderPriorityTest extends TestCase
{
    public function testEachHookRunsInItsOwnPriorityOrder(): void
    {
        $di = new Di();
        $di->setShared(PBXConfModulesProvider::SERVICE_NAME, fn() => [
            new PriorityTestModule('first', ['hookA' => 10, 'hookB' => 900]),
            new PriorityTestModule('second', ['hookA' => 500, 'hookB' => 20]),
        ]);
        Di::setDefault($di);

        self::assertSame(['first', 'second'], PBXConfModulesProvider::hookModulesMethod('hookA'));
        self::assertSame(['second', 'first'], PBXConfModulesProvider::hookModulesMethod('hookB'));
        self::assertSame(['first', 'second'], PBXConfModulesProvider::hookModulesMethod('hookA'));
    }
}
