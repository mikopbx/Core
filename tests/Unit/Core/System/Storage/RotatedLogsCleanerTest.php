<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\Storage;

use MikoPBX\Core\System\Storage\RotatedLogsCleaner;
use PHPUnit\Framework\TestCase;

/**
 * RotatedLogsCleaner::cleanup() must free space from rotated logs only, the largest chain first.
 */
final class RotatedLogsCleanerTest extends TestCase
{
    private string $sandbox;
    private string $logsDir;

    public function setUp(): void
    {
        parent::setUp();
        $this->sandbox = sys_get_temp_dir() . '/mikopbx-logs-cleaner-' . getmypid() . '-' . uniqid('', true);
        $this->logsDir = $this->sandbox . '/log';
        self::assertTrue(mkdir($this->logsDir, 0700, true));
    }

    public function tearDown(): void
    {
        $this->removeTree($this->sandbox);
        parent::tearDown();
    }

    public function testFirstPassKeepsActiveLogAndNewestRotatedFilesOfEveryChain(): void
    {
        $anomaly = $this->createChain('ModuleCTIClient/tgd-1.2.3.4/uuid-chats.log', 12, 100);
        $gzChain = $this->createChain('asterisk/messages', 8, 10, '.gz');

        $stats = (new RotatedLogsCleaner($this->logsDir))->cleanup($this->shortage(7 * 100 + 3 * 10, 0));

        self::assertFileExists($anomaly['active']);
        self::assertFileExists($gzChain['active']);
        foreach ([$anomaly, $gzChain] as $chain) {
            foreach ($chain['rotated'] as $index => $path) {
                if ($index <= RotatedLogsCleaner::KEEP_PER_CHAIN) {
                    self::assertFileExists($path);
                } else {
                    self::assertFileDoesNotExist($path);
                }
            }
        }
        self::assertSame(7 + 3, $stats['files']);
        self::assertSame(7 * 100 + 3 * 10, $stats['bytes']);
        self::assertSame(0, $stats['reserved']);
    }

    public function testLargestChainIsCleanedFirstFromItsOldestFile(): void
    {
        // The small chain is older: age alone would delete it first
        $small = $this->createChain('system/messages', 8, 10, '', time() - 86400 * 30);
        $anomaly = $this->createChain('ModuleCTIClient/uuid-chats.log', 61, 100);

        $stats = (new RotatedLogsCleaner($this->logsDir))->cleanup($this->shortage(300, 0));

        $deleted = array_filter($anomaly['rotated'], static fn(string $path): bool => !file_exists($path));
        self::assertSame([59, 60, 61], array_keys($deleted));
        self::assertSame(3, $stats['files']);
        self::assertSame(['ModuleCTIClient/uuid-chats.log' => 300], $stats['chains']);
        foreach ($small['rotated'] as $path) {
            self::assertFileExists($path);
        }
    }

    public function testNextChainIsCleanedOnlyAfterTheLargestOneIsExhausted(): void
    {
        $anomaly = $this->createChain('ModuleX/big.log', 8, 100);
        $other = $this->createChain('ModuleY/small.log', 8, 10);

        $stats = (new RotatedLogsCleaner($this->logsDir))->cleanup($this->shortage(310, 0));

        self::assertSame(['ModuleX/big.log' => 300, 'ModuleY/small.log' => 10], $stats['chains']);
        self::assertFileDoesNotExist($other['rotated'][8]);
        self::assertFileExists($other['rotated'][7]);
        self::assertFileExists($anomaly['rotated'][5]);
    }

    public function testReservedFilesAreDeletedOnlyAfterEveryChainLostItsExcess(): void
    {
        $anomaly = $this->createChain('ModuleX/big.log', 8, 100);
        $other = $this->createChain('ModuleY/small.log', 7, 10);

        $stats = (new RotatedLogsCleaner($this->logsDir))->cleanup($this->shortage(300 + 20 + 100, 0));

        self::assertSame(3 + 2 + 1, $stats['files']);
        self::assertSame(1, $stats['reserved']);
        self::assertFileDoesNotExist($anomaly['rotated'][5]);
        self::assertFileExists($anomaly['rotated'][4]);
        self::assertFileExists($anomaly['active']);
        for ($i = 1; $i <= RotatedLogsCleaner::KEEP_PER_CHAIN; $i++) {
            self::assertFileExists($other['rotated'][$i]);
        }
    }

    public function testRecentlyModifiedFilesAreNeverDeleted(): void
    {
        // Rotated every 10 minutes: .1-.5 are younger than MIN_AGE_SECONDS
        $chain = $this->createChain('ModuleX/fast.log', 10, 100, '', null, 600);

        $stats = (new RotatedLogsCleaner($this->logsDir))->cleanup($this->shortage(PHP_INT_MAX));

        self::assertSame(5, $stats['files']);
        foreach ($chain['rotated'] as $index => $path) {
            if ($index <= 5) {
                self::assertFileExists($path);
            } else {
                self::assertFileDoesNotExist($path);
            }
        }
    }

    public function testNothingIsDeletedWhenSpaceIsEnough(): void
    {
        $chain = $this->createChain('ModuleX/big.log', 20, 100);

        $stats = (new RotatedLogsCleaner($this->logsDir))->cleanup($this->shortage(0));

        self::assertSame(['files' => 0, 'bytes' => 0, 'reserved' => 0, 'failed' => 0, 'chains' => []], $stats);
        foreach ($chain['rotated'] as $path) {
            self::assertFileExists($path);
        }
    }

    public function testFilesOutsideRotationSchemeAndSymlinksAreKept(): void
    {
        $old = time() - 86400;
        $outsideDir = $this->sandbox . '/monitor';
        $outside = $this->createChain('../monitor/record.mp3', 8, 10);
        $kept = [
            $this->createFile($this->logsDir . '/ModuleX/app.log', $old),
            $this->createFile($this->logsDir . '/ModuleX/app-2026-10-30.log', $old),
            $this->createFile($this->logsDir . '/ModuleX/state.json', $old),
            $this->createFile($this->logsDir . '/ModuleX/app.log.1.part', $old),
            // Logs named after a PID are active logs, not rotations
            $this->createFile($this->logsDir . '/ModuleX/worker.log.12345', $old),
        ];
        self::assertTrue(symlink($outsideDir, $this->logsDir . '/linked-dir'));
        for ($i = 6; $i <= 8; $i++) {
            self::assertTrue(symlink($outside['rotated'][$i], $this->logsDir . "/ModuleX/link.log.$i"));
        }

        $stats = (new RotatedLogsCleaner($this->logsDir))->cleanup($this->shortage(PHP_INT_MAX));

        self::assertSame(0, $stats['files']);
        foreach (array_merge($kept, $outside['rotated']) as $path) {
            self::assertFileExists($path);
        }
    }

    public function testMissingLogsDirectoryIsNoop(): void
    {
        $stats = (new RotatedLogsCleaner($this->sandbox . '/absent'))->cleanup($this->shortage(PHP_INT_MAX));

        self::assertSame(['files' => 0, 'bytes' => 0, 'reserved' => 0, 'failed' => 0, 'chains' => []], $stats);
    }

    /**
     * Shortage callback returning the given values one per call, the last one repeated.
     */
    private function shortage(int ...$values): callable
    {
        return static function () use (&$values): int {
            return count($values) > 1 ? array_shift($values) : $values[0];
        };
    }

    /**
     * Create {base} and {base}.1..{count}{suffix}, each rotation $step seconds older than the previous one.
     *
     * @return array{active: string, rotated: array<int, string>}
     */
    private function createChain(
        string $base,
        int $count,
        int $size,
        string $suffix = '',
        ?int $newest = null,
        int $step = 3600
    ): array {
        $newest ??= time() - 60;
        $path = $this->logsDir . '/' . $base;
        $chain = ['active' => $this->createFile($path, $newest, $size), 'rotated' => []];
        for ($i = 1; $i <= $count; $i++) {
            $chain['rotated'][$i] = $this->createFile("{$path}.{$i}{$suffix}", $newest - $i * $step, $size);
        }
        return $chain;
    }

    private function createFile(string $path, ?int $mtime = null, int $size = 16): string
    {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            self::assertTrue(mkdir($dir, 0700, true));
        }
        $handle = fopen($path, 'wb');
        self::assertIsResource($handle);
        ftruncate($handle, $size);
        fclose($handle);
        if ($mtime !== null) {
            touch($path, $mtime);
        }
        return $path;
    }

    private function removeTree(string $path): void
    {
        if (is_link($path) || is_file($path)) {
            @unlink($path);
            return;
        }
        if (!is_dir($path)) {
            return;
        }
        foreach (scandir($path) ?: [] as $name) {
            if ($name !== '.' && $name !== '..') {
                $this->removeTree($path . '/' . $name);
            }
        }
        @rmdir($path);
    }
}
