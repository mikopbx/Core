<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\Configs;

use MikoPBX\Core\System\Configs\NginxConf;
use PHPUnit\Framework\TestCase;

final class NginxConfReloadTest extends TestCase
{
    public function testRunningNginxIsReloadedWithoutMonitRestart(): void
    {
        $nginx = new TestableNginxConf();

        self::assertTrue($nginx->reload());
        self::assertSame(1, $nginx->reloadCalls);
        self::assertSame(0, $nginx->restartCalls);
    }

    public function testInvalidConfigurationIsNotApplied(): void
    {
        $nginx = new TestableNginxConf();
        $nginx->configurationValid = false;

        self::assertFalse($nginx->reload());
        self::assertSame(0, $nginx->reloadCalls);
        self::assertSame(0, $nginx->restartCalls);
    }

    public function testStoppedNginxIsStartedThroughMonitFallback(): void
    {
        $nginx = new TestableNginxConf();
        $nginx->running = false;

        self::assertTrue($nginx->reload());
        self::assertSame(0, $nginx->reloadCalls);
        self::assertSame(1, $nginx->fullRestartCalls);
    }
}

final class TestableNginxConf extends NginxConf
{
    public bool $configurationValid = true;
    public bool $running = true;
    public int $reloadCalls = 0;
    public int $restartCalls = 0;
    public int $fullRestartCalls = 0;

    public function __construct()
    {
    }

    public function isRunning(bool $ignorePending = false): bool
    {
        return $this->running;
    }

    public function monitRestart(bool $waitStart = true): bool
    {
        ++$this->restartCalls;
        return true;
    }

    public function reStart(): bool
    {
        ++$this->fullRestartCalls;
        return true;
    }

    protected function testCurrentNginxConfig(): bool
    {
        return $this->configurationValid;
    }

    protected function reloadRunningProcess(): bool
    {
        ++$this->reloadCalls;
        return true;
    }
}
