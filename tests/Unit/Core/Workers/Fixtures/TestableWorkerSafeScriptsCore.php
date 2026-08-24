<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Fixtures;

use MikoPBX\Core\Asterisk\AmiSessionWatchdog;
use MikoPBX\Core\Workers\Cron\WorkerSafeScriptsCore;
use RuntimeException;

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

    public function spawnPoolWorker(string $workerPath, int $instanceId): void
    {
        $this->spawnPoolWorkerInstance($workerPath, $instanceId);
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
