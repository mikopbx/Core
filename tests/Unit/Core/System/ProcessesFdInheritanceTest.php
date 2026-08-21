<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Core\System\Processes;
use PHPUnit\Framework\TestCase;

final class ProcessesFdInheritanceTest extends TestCase
{
    private string $sandboxDir;

    public function setUp(): void
    {
        parent::setUp();
        $this->sandboxDir = sys_get_temp_dir() . '/mikopbx-fd-test-' . getmypid() . '-' . uniqid('', true);
        self::assertTrue(mkdir($this->sandboxDir, 0700, true));
    }

    public function tearDown(): void
    {
        foreach (glob($this->sandboxDir . '/*') ?: [] as $path) {
            @unlink($path);
        }
        @rmdir($this->sandboxDir);
        parent::tearDown();
    }

    public function testMwExecDoesNotExposeParentSocketToChild(): void
    {
        $this->requireLinuxProcfs();
        $server = stream_socket_server('tcp://127.0.0.1:0', $errorCode, $errorMessage);
        self::assertIsResource($server, $errorMessage);
        $inode = (int)(fstat($server)['ino'] ?? 0);
        self::assertGreaterThan(0, $inode);

        $output = [];
        $exitCode = -1;
        Processes::mwExec($this->fdListingCommand(), $output, $exitCode);

        fclose($server);
        self::assertSame(0, $exitCode);
        self::assertStringNotContainsString("socket:[$inode]", implode("\n", $output));
    }

    public function testMwExecBgDoesNotExposeParentSocketToChild(): void
    {
        $this->requireLinuxProcfs();
        $server = stream_socket_server('tcp://127.0.0.1:0', $errorCode, $errorMessage);
        self::assertIsResource($server, $errorMessage);
        $inode = (int)(fstat($server)['ino'] ?? 0);
        self::assertGreaterThan(0, $inode);
        $outputFile = $this->sandboxDir . '/child-fds.txt';

        $phpCode = <<<'PHP'
$links = [];
foreach (glob('/proc/self/fd/*') ?: [] as $fdPath) {
    $target = @readlink($fdPath);
    if ($target !== false) {
        $links[] = $target;
    }
}
file_put_contents($argv[1], implode("\n", $links));
PHP;
        $command = escapeshellarg(PHP_BINARY)
            . ' -r ' . escapeshellarg($phpCode)
            . ' ' . escapeshellarg($outputFile);
        Processes::mwExecBg($command);

        $deadline = microtime(true) + 3.0;
        while (!is_file($outputFile) && microtime(true) < $deadline) {
            usleep(20_000);
        }

        fclose($server);
        self::assertFileExists($outputFile);
        self::assertStringNotContainsString("socket:[$inode]", (string)file_get_contents($outputFile));
    }

    public function testMwExecPreservesShellPipelineOutputAndExitStatus(): void
    {
        $output = [];
        $exitCode = -1;

        Processes::mwExec("printf 'alpha\\nbeta\\n' | tail -n 1", $output, $exitCode);

        self::assertSame(0, $exitCode);
        self::assertSame(['beta'], $output);

        Processes::mwExec("sh -c 'printf failure >&2; exit 7'", $output, $exitCode);

        self::assertSame(7, $exitCode);
        self::assertSame(['failure'], $output);
    }

    private function requireLinuxProcfs(): void
    {
        if (PHP_OS_FAMILY !== 'Linux' || !is_dir('/proc/self/fd')) {
            self::markTestSkipped('Linux /proc/self/fd is required for descriptor inheritance coverage');
        }
    }

    private function fdListingCommand(): string
    {
        $phpCode = <<<'PHP'
foreach (glob('/proc/self/fd/*') ?: [] as $fdPath) {
    $target = @readlink($fdPath);
    if ($target !== false) {
        echo $target, "\n";
    }
}
PHP;
        return escapeshellarg(PHP_BINARY) . ' -r ' . escapeshellarg($phpCode);
    }
}
