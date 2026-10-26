<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers;

use MikoPBX\Core\Workers\WorkerWav2Webm;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

/**
 * A task file that cannot be parsed must leave the queue as .failed.json instead of being
 * re-read and logged on every scan (issue #1189).
 */
final class WorkerWav2WebmInvalidTaskTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/wav2webm-' . bin2hex(random_bytes(4));
        mkdir($this->dir);
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob($this->dir . '/*') ?: []);
        rmdir($this->dir);
    }

    /**
     * @testWith ["{\"linkedid\":\"x\"}\nTASK_EOF 2>&1"]
     *           ["\"just a string\""]
     */
    public function testUnparsableTaskIsMovedAside(string $contents): void
    {
        $taskFile = $this->dir . '/test-health-1773978620.json';
        file_put_contents($taskFile, $contents);

        $reflection = new ReflectionClass(WorkerWav2Webm::class);
        $worker = $reflection->newInstanceWithoutConstructor();
        $reflection->getMethod('processTaskFile')->invoke($worker, $taskFile);

        self::assertFileDoesNotExist($taskFile);
        self::assertSame($contents, file_get_contents($this->dir . '/test-health-1773978620.failed.json'));
        self::assertSame([], $reflection->getMethod('findTaskFiles')->invoke($worker, $this->dir));
    }
}
