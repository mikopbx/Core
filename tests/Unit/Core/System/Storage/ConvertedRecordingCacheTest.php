<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\Storage;

use MikoPBX\Core\System\Storage\ConvertedRecordingCache;
use PHPUnit\Framework\TestCase;

/**
 * ConvertedRecordingCache::cleanup() must delete only files this cache produced.
 */
final class ConvertedRecordingCacheTest extends TestCase
{
    private const string KEY_A = 'aa00000000000000000000000000000000000001';
    private const string KEY_B = 'bb00000000000000000000000000000000000002';
    private const string KEY_C = 'cc00000000000000000000000000000000000003';

    private string $sandbox;
    private string $cacheDir;
    private string $outsideDir;
    private string $convertedDir;

    public function setUp(): void
    {
        parent::setUp();
        $this->sandbox = sys_get_temp_dir() . '/mikopbx-conv-cache-' . getmypid() . '-' . uniqid('', true);
        $this->cacheDir = $this->sandbox . '/recordings_cache';
        $this->outsideDir = $this->sandbox . '/monitor';
        $this->convertedDir = $this->cacheDir . '/' . ConvertedRecordingCache::SUBDIR;
        self::assertTrue(mkdir($this->convertedDir, 0700, true));
        self::assertTrue(mkdir($this->outsideDir, 0700, true));
    }

    public function tearDown(): void
    {
        $this->removeTree($this->sandbox);
        parent::tearDown();
    }

    public function testDeletesOnlyOwnFilesAndKeepsEverythingElse(): void
    {
        $old = time() - ConvertedRecordingCache::TTL_SECONDS - 60;
        $staleTemp = time() - 7200;

        // Must be deleted
        $legacy = $this->createFile(
            $this->cacheDir . '/mikopbx-1788444455.3803_7U5d69-boffart-test_mp3_6ad9b548c6b323.63453026.mp3'
        );
        $expired = $this->createFile($this->shard(self::KEY_A) . '.mp3', $old);
        $stalePart = $this->createFile($this->shard(self::KEY_B) . '.mp3.1234.part', $staleTemp);
        $staleLock = $this->createFile($this->shard(self::KEY_B) . '.lock', $staleTemp);

        // Must survive
        $fresh = $this->createFile($this->shard(self::KEY_C) . '.ogg');
        $freshPart = $this->createFile($this->shard(self::KEY_C) . '.ogg.99.part');
        $liveEntryLock = $this->createFile($this->shard(self::KEY_C) . '.lock', $staleTemp);
        $s3Cached = $this->createFile(
            $this->cacheDir . '/a1/a1b2c3d4e5f60718293a4b5c6d7e8f90_out-201-102.webm',
            $old
        );
        $s3LegacyLookalike = $this->createFile(
            $this->cacheDir . '/a1/x_mp3_6ad9b548c6b323.63453026.mp3',
            $old
        );
        $rootOther = [
            $this->createFile($this->cacheDir . '/notes.txt', $old),
            $this->createFile($this->cacheDir . '/call_mp3_custom.mp3', $old),
            $this->createFile($this->cacheDir . '/' . self::KEY_A . '.mp3', $old),
        ];
        $convertedOther = [
            $this->createFile($this->convertedDir . '/' . self::KEY_A . '.mp3', $old),
            $this->createFile($this->convertedDir . '/zz/' . self::KEY_A . '.mp3', $old),
            $this->createFile($this->shard(self::KEY_A, 'aa') . '.flac', $old),
            $this->createFile($this->convertedDir . '/aa/readme.txt', $old),
        ];

        // Symlinks pointing outside the cache: neither the link targets nor the links are touched
        $outsideRecording = $this->createFile(
            $this->outsideDir . '/' . self::KEY_A . '.mp3',
            $old
        );
        $outsideLegacy = $this->createFile(
            $this->outsideDir . '/rec_mp3_6ad9b548c6b323.63453026.mp3',
            $old
        );
        $fileLink = $this->convertedDir . '/aa/' . self::KEY_B . '.mp3';
        self::assertTrue(symlink($outsideRecording, $fileLink));
        $legacyLink = $this->cacheDir . '/link_mp3_6ad9b548c6b323.63453026.mp3';
        self::assertTrue(symlink($outsideLegacy, $legacyLink));
        self::assertTrue(symlink($this->outsideDir, $this->convertedDir . '/dd'));

        $stats = (new ConvertedRecordingCache($this->cacheDir))->cleanup();

        foreach ([$legacy, $expired, $stalePart, $staleLock] as $path) {
            self::assertFileDoesNotExist($path);
        }
        foreach (
            array_merge(
                [$fresh, $freshPart, $liveEntryLock, $s3Cached, $s3LegacyLookalike, $outsideRecording, $outsideLegacy],
                $rootOther,
                $convertedOther
            ) as $path
        ) {
            self::assertFileExists($path);
        }
        self::assertTrue(is_link($fileLink));
        self::assertTrue(is_link($legacyLink));
        self::assertSame(4, $stats['files']);
    }

    public function testHeldLockIsKept(): void
    {
        $lockFile = $this->createFile($this->shard(self::KEY_A) . '.lock', time() - 7200);
        $handle = fopen($lockFile, 'c');
        self::assertIsResource($handle);
        self::assertTrue(flock($handle, LOCK_EX));

        (new ConvertedRecordingCache($this->cacheDir))->cleanup();

        self::assertFileExists($lockFile);
        flock($handle, LOCK_UN);
        fclose($handle);
    }

    public function testPurgeAllRemovesFreshConvertedFilesOnly(): void
    {
        $fresh = $this->createFile($this->shard(self::KEY_A) . '.mp3');
        $s3Cached = $this->createFile($this->cacheDir . '/a1/a1b2c3d4e5f60718293a4b5c6d7e8f90_out.webm');
        $outside = $this->createFile($this->outsideDir . '/' . self::KEY_B . '.mp3');

        (new ConvertedRecordingCache($this->cacheDir))->cleanup(true);

        self::assertFileDoesNotExist($fresh);
        self::assertFileExists($s3Cached);
        self::assertFileExists($outside);
    }

    public function testSizeLimitEvictsLeastRecentlyUsedFirst(): void
    {
        // Sparse files: 3 x 200 MB exceeds the 500 MB limit without using real disk space
        $size = 200 * 1024 * 1024;
        $oldest = $this->createFile($this->shard(self::KEY_A) . '.mp3', time() - 10800, $size);
        $middle = $this->createFile($this->shard(self::KEY_B) . '.mp3', time() - 9000, $size);
        $newest = $this->createFile($this->shard(self::KEY_C) . '.mp3', time() - 7200, $size);

        $stats = (new ConvertedRecordingCache($this->cacheDir))->cleanup();

        self::assertFileDoesNotExist($oldest);
        self::assertFileExists($middle);
        self::assertFileExists($newest);
        self::assertSame(1, $stats['files']);
    }

    public function testRecentlyUsedFilesAreNotEvictedOverSizeLimit(): void
    {
        $size = 300 * 1024 * 1024;
        $old = $this->createFile($this->shard(self::KEY_A) . '.wav', time() - 7200, $size);
        $recent = $this->createFile($this->shard(self::KEY_B) . '.wav', time() - 60, $size);

        (new ConvertedRecordingCache($this->cacheDir))->cleanup();

        self::assertFileDoesNotExist($old);
        self::assertFileExists($recent);
    }

    public function testShardDirectoriesAreKept(): void
    {
        $this->createFile($this->shard(self::KEY_A) . '.mp3', time() - ConvertedRecordingCache::TTL_SECONDS - 60);

        (new ConvertedRecordingCache($this->cacheDir))->cleanup();

        // WHY: removing a shard would race with get() creating a lock file inside it
        self::assertDirectoryExists($this->convertedDir . '/aa');
    }

    public function testMissingCacheDirectoryIsNoop(): void
    {
        $stats = (new ConvertedRecordingCache($this->sandbox . '/absent'))->cleanup(true);

        self::assertSame(['files' => 0, 'bytes' => 0], $stats);
    }

    /**
     * Path without extension of a converted file in its shard directory.
     */
    private function shard(string $key, ?string $shard = null): string
    {
        return $this->convertedDir . '/' . ($shard ?? substr($key, 0, 2)) . '/' . $key;
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
