<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers;

// phpcs:disable PSR1.Files.SideEffects
set_include_path(
    __DIR__ . '/Fixtures' . PATH_SEPARATOR . get_include_path()
);
// phpcs:enable PSR1.Files.SideEffects

use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use MikoPBX\Tests\Unit\Core\Workers\Fixtures\TestableWorkerSafeScriptsCore;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;

final class WorkerSafeScriptsAmiWatchdogTest extends TestCase
{
    public function testWatchdogRunsAtMostOncePerFifteenSeconds(): void
    {
        $worker = $this->newWorker();
        $worker->now = 100;

        $this->invokeCheck($worker);
        $worker->now = 110;
        $this->invokeCheck($worker);
        self::assertSame(1, $worker->watchdogCalls);

        $worker->now = 115;
        $this->invokeCheck($worker);
        self::assertSame(2, $worker->watchdogCalls);
    }

    public function testAutoKickSettingRequiresExactStringOne(): void
    {
        $worker = $this->newWorker();
        foreach (['0', 'true', 'yes', '', '01'] as $disabledValue) {
            $worker->setting = $disabledValue;
            self::assertFalse($worker->autoKickEnabled(), $disabledValue);
        }
        $worker->setting = '1';
        self::assertTrue($worker->autoKickEnabled());
    }

    public function testWatchdogFailureIsLoggedAndDoesNotEscapeSupervisorCycle(): void
    {
        $worker = $this->newWorker();
        $worker->now = 100;
        $worker->throwFromWatchdog = true;

        $this->invokeCheck($worker);

        self::assertSame(1, $worker->watchdogCalls);
        self::assertSame(1, $worker->loggedFailures);
    }

    private function newWorker(): TestableWorkerSafeScriptsCore
    {
        $reflection = new ReflectionClass(TestableWorkerSafeScriptsCore::class);
        /** @var TestableWorkerSafeScriptsCore $worker */
        $worker = $reflection->newInstanceWithoutConstructor();
        return $worker;
    }

    private function invokeCheck(WorkerSafeScriptsCore $worker): void
    {
        $method = new ReflectionMethod(WorkerSafeScriptsCore::class, 'maybeCheckAmiSessions');
        $method->invoke($worker);
    }
}
