<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers;

set_include_path(
    __DIR__ . '/Fixtures' . PATH_SEPARATOR . get_include_path()
);

use MikoPBX\Core\Asterisk\AmiSessionWatchdog;
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;
use RuntimeException;

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

final class TestableWorkerSafeScriptsCore extends WorkerSafeScriptsCore
{
    public int $now = 0;
    public string $setting = '0';
    public int $watchdogCalls = 0;
    public int $loggedFailures = 0;
    public bool $throwFromWatchdog = false;

    public function autoKickEnabled(): bool
    {
        return $this->isAmiSessionAutoKickEnabled();
    }

    protected function amiWatchdogNow(): int
    {
        return $this->now;
    }

    protected function getAmiSessionAutoKickSetting(): string
    {
        return $this->setting;
    }

    protected function createAmiSessionWatchdog(): AmiSessionWatchdog
    {
        return new AmiSessionWatchdog(
            snapshotProvider: function (): array {
                $this->watchdogCalls++;
                if ($this->throwFromWatchdog) {
                    throw new RuntimeException('fixture inspector failure');
                }
                return [];
            },
            logger: function (): void {
                throw new RuntimeException('fixture logger failure');
            },
        );
    }

    protected function logAmiWatchdogFailure(string $message): void
    {
        $this->loggedFailures++;
    }
}
