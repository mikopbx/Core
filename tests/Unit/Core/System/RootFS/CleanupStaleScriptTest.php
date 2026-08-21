<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\RootFS;

use FilesystemIterator;
use PHPUnit\Framework\TestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;

final class CleanupStaleScriptTest extends TestCase
{
    private const SCRIPT = __DIR__ . '/../../../../../src/Core/System/RootFS/sbin/cleanup-stale';

    private string $sandboxDir;
    private string $cacheDir;
    private string $tempDir;
    private string $systemTempDir;
    private string $pidDir;
    private string $fakeFlock;
    private string $fakeLsof;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sandboxDir = sys_get_temp_dir() . '/cleanup-stale-' . bin2hex(random_bytes(8));
        $this->cacheDir = $this->sandboxDir . '/cache with spaces';
        $this->tempDir = $this->sandboxDir . '/temp with spaces';
        $this->systemTempDir = $this->sandboxDir . '/system temp';
        $this->pidDir = $this->sandboxDir . '/run';
        $binDir = $this->sandboxDir . '/bin';

        foreach (
            [$this->cacheDir, $this->tempDir, $this->systemTempDir, $this->pidDir, $binDir] as $directory
        ) {
            self::assertTrue(mkdir($directory, 0700, true));
        }

        $this->fakeFlock = $binDir . '/flock';
        $this->fakeLsof = $binDir . '/lsof';
        file_put_contents($this->fakeFlock, "#!/bin/sh\nexit \"\${TEST_FLOCK_EXIT:-0}\"\n");
        file_put_contents(
            $this->fakeLsof,
            "#!/bin/sh\ncase \"\$1\" in *busy-link*) exit 0 ;; *) exit 1 ;; esac\n"
        );
        chmod($this->fakeFlock, 0700);
        chmod($this->fakeLsof, 0700);
    }

    protected function tearDown(): void
    {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($this->sandboxDir, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        /** @var SplFileInfo $entry */
        foreach ($iterator as $entry) {
            if ($entry->isLink() || $entry->isFile()) {
                unlink($entry->getPathname());
            } else {
                rmdir($entry->getPathname());
            }
        }
        rmdir($this->sandboxDir);

        parent::tearDown();
    }

    public function testRemovesOldLinkAndItsTemporaryTarget(): void
    {
        $responseDir = $this->tempDir . '/SelectCdrService';
        self::assertTrue(mkdir($responseDir, 0700));

        $target = $responseDir . '/temp-0123456789abcdef0123456789abcdef';
        $link = $this->cacheDir . '/cdr response link';
        file_put_contents($target, '[]');
        symlink($target, $link);
        $this->makeLinkOld($link);

        [$exitCode, $output] = $this->runCleanup();

        self::assertSame(0, $exitCode, $output);
        self::assertFalse(is_link($link), 'An expired download link must be removed');
        self::assertFileDoesNotExist($target, 'An expired temp-* response under core.tempDir must be removed');
    }

    public function testRemovesOldLinkWithoutDeletingUnrelatedTarget(): void
    {
        $target = $this->sandboxDir . '/temp-must-not-be-removed';
        $link = $this->cacheDir . '/recording link';
        file_put_contents($target, 'audio');
        symlink($target, $link);
        $this->makeLinkOld($link);

        [$exitCode, $output] = $this->runCleanup();

        self::assertSame(0, $exitCode, $output);
        self::assertFalse(is_link($link));
        self::assertFileExists($target, 'A temp-* target outside the allowed temporary directories must be preserved');
    }

    public function testPreservesFreshButRemovesExpiredLinkWithoutPerLinkLsof(): void
    {
        $freshTarget = $this->tempDir . '/temp-fresh';
        $freshLink = $this->cacheDir . '/fresh-link';
        file_put_contents($freshTarget, 'fresh');
        symlink($freshTarget, $freshLink);

        $busyTarget = $this->tempDir . '/temp-busy';
        $busyLink = $this->cacheDir . '/busy-link';
        file_put_contents($busyTarget, 'busy');
        symlink($busyTarget, $busyLink);
        $this->makeLinkOld($busyLink);

        [$exitCode, $output] = $this->runCleanup();

        self::assertSame(0, $exitCode, $output);
        self::assertTrue(is_link($freshLink), 'Links younger than two minutes must be preserved');
        self::assertFileExists($freshTarget);
        self::assertFalse(
            is_link($busyLink),
            'An expired link must be removed even when lsof reports its target open; Unix keeps an open file descriptor valid'
        );
        self::assertFileDoesNotExist(
            $busyTarget,
            'The expired temporary target can be unlinked safely while an existing descriptor remains open'
        );
    }

    public function testRemovesOnlyEmptyCacheSubdirectories(): void
    {
        $emptyAfterCleanup = $this->cacheDir . '/empty after cleanup';
        $nonEmptyAfterCleanup = $this->cacheDir . '/must stay';
        self::assertTrue(mkdir($emptyAfterCleanup, 0700));
        self::assertTrue(mkdir($nonEmptyAfterCleanup, 0700));

        $firstTarget = $this->sandboxDir . '/first-target';
        $secondTarget = $this->sandboxDir . '/second-target';
        file_put_contents($firstTarget, 'first');
        file_put_contents($secondTarget, 'second');
        file_put_contents($nonEmptyAfterCleanup . '/keep.txt', 'keep');

        $firstLink = $emptyAfterCleanup . '/old-link';
        $secondLink = $nonEmptyAfterCleanup . '/old-link';
        symlink($firstTarget, $firstLink);
        symlink($secondTarget, $secondLink);
        $this->makeLinkOld($firstLink);
        $this->makeLinkOld($secondLink);

        [$exitCode, $output] = $this->runCleanup();

        self::assertSame(0, $exitCode, $output);
        self::assertDirectoryDoesNotExist($emptyAfterCleanup);
        self::assertDirectoryExists($nonEmptyAfterCleanup);
        self::assertFileExists($nonEmptyAfterCleanup . '/keep.txt');
    }

    public function testLimitsCleanupBatch(): void
    {
        for ($index = 1; $index <= 3; $index++) {
            $target = $this->sandboxDir . '/target-' . $index;
            $link = $this->cacheDir . '/old-link-' . $index;
            file_put_contents($target, (string)$index);
            symlink($target, $link);
            $this->makeLinkOld($link);
        }

        [$exitCode, $output] = $this->runCleanup(['CLEANUP_STALE_MAX_LINKS' => '2']);

        self::assertSame(0, $exitCode, $output);
        self::assertSame(1, $this->countLinksInCache(), 'Only the configured number of links may be handled per run');
    }

    public function testSkipsCleanupWhenAnotherInstanceOwnsTheLock(): void
    {
        $target = $this->sandboxDir . '/locked-target';
        $link = $this->cacheDir . '/old-link';
        file_put_contents($target, 'locked');
        symlink($target, $link);
        $this->makeLinkOld($link);

        [$exitCode, $output] = $this->runCleanup(['TEST_FLOCK_EXIT' => '1']);

        self::assertSame(0, $exitCode, $output);
        self::assertTrue(is_link($link));
        self::assertFileExists($target);
    }

    private function makeLinkOld(string $link): void
    {
        $process = proc_open(
            ['/usr/bin/touch', '-h', '-t', '202001010000', $link],
            [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes
        );
        self::assertIsResource($process);
        self::assertSame(0, proc_close($process));
    }

    private function countLinksInCache(): int
    {
        $entries = scandir($this->cacheDir);
        self::assertIsArray($entries);

        return count(
            array_filter(
                $entries,
                fn (string $entry): bool => is_link($this->cacheDir . '/' . $entry)
            )
        );
    }

    /**
     * @return array{int, string}
     */
    private function runCleanup(array $extraEnvironment = []): array
    {
        $environment = array_merge(
            [
                'PATH' => (string)getenv('PATH'),
                'CLEANUP_STALE_ROOT_DIR' => $this->cacheDir,
                'CLEANUP_STALE_TEMP_DIR' => $this->tempDir,
                'CLEANUP_STALE_SYSTEM_TEMP_DIR' => $this->systemTempDir,
                'CLEANUP_STALE_PID_DIR' => $this->pidDir,
                'CLEANUP_STALE_LOCK_FILE' => $this->pidDir . '/cleanup-stale.lock',
                'CLEANUP_STALE_FIND_BIN' => '/usr/bin/find',
                'CLEANUP_STALE_HEAD_BIN' => '/usr/bin/head',
                'CLEANUP_STALE_READLINK_BIN' => '/usr/bin/readlink',
                'CLEANUP_STALE_LSOF_BIN' => $this->fakeLsof,
                'CLEANUP_STALE_FLOCK_BIN' => $this->fakeFlock,
                'CLEANUP_STALE_RM_BIN' => '/bin/rm',
                'CLEANUP_STALE_RMDIR_BIN' => '/bin/rmdir',
                'CLEANUP_STALE_DIRNAME_BIN' => '/usr/bin/dirname',
            ],
            $extraEnvironment
        );
        $process = proc_open(
            ['/bin/sh', self::SCRIPT],
            [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
            null,
            $environment
        );
        self::assertIsResource($process);

        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        return [proc_close($process), $stdout . $stderr];
    }
}
