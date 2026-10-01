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

    public function testPoolWorkerDoesNotInheritSupervisorSocket(): void
    {
        if (PHP_OS_FAMILY !== 'Linux' || !is_dir('/proc/self/fd')) {
            self::markTestSkipped('Linux /proc/self/fd is required for descriptor inheritance coverage');
        }

        $server = stream_socket_server('tcp://127.0.0.1:0', $errorCode, $errorMessage);
        self::assertIsResource($server, $errorMessage);
        $inode = (int)(fstat($server)['ino'] ?? 0);
        self::assertGreaterThan(0, $inode);

        $prefix = sys_get_temp_dir() . '/mikopbx-pool-fd-' . getmypid() . '-' . uniqid('', true);
        $workerPath = $prefix . '.php';
        $outputPath = $prefix . '.txt';
        $workerCode = '<?php ' . <<<'PHP'
$links = [];
foreach (glob('/proc/self/fd/*') ?: [] as $fdPath) {
    $target = @readlink($fdPath);
    if ($target !== false) {
        $links[] = $target;
    }
}
file_put_contents(__OUTPUT_PATH__, json_encode(['argv' => $argv, 'links' => $links]));
PHP;
        $workerCode = str_replace('__OUTPUT_PATH__', var_export($outputPath, true), $workerCode);
        self::assertNotFalse(file_put_contents($workerPath, $workerCode));

        try {
            $this->newWorker()->spawnPoolWorker($workerPath, 7);
            $deadline = microtime(true) + 3.0;
            while (!is_file($outputPath) && microtime(true) < $deadline) {
                usleep(20_000);
            }

            self::assertFileExists($outputPath);
            $result = json_decode((string)file_get_contents($outputPath), true, 512, JSON_THROW_ON_ERROR);
            self::assertContains('--instance-id=7', $result['argv']);
            self::assertNotContains("socket:[$inode]", $result['links']);
        } finally {
            fclose($server);
            @unlink($workerPath);
            @unlink($outputPath);
        }
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
