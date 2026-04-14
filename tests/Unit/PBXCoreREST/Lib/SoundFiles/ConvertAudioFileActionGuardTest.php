<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\SoundFiles;

use MikoPBX\PBXCoreREST\Lib\SoundFiles\ConvertAudioFileAction;
use MikoPBX\Tests\Unit\AbstractUnitTest;

/**
 * Regression coverage for the unlink gate in ConvertAudioFileAction (issue #999).
 *
 * The previous implementation removed the original uploaded file as soon as the
 * filename did not match any "successful" target path string, without checking
 * whether ffmpeg actually produced something usable. A failing or empty target
 * therefore caused unrecoverable data loss in /storage/usbdisk1/mikopbx/media/custom/.
 *
 * These tests substitute ffmpeg/ffprobe with shell stubs to deterministically
 * exercise the failure paths the unlink gate must defend against.
 */
class ConvertAudioFileActionGuardTest extends AbstractUnitTest
{
    private string $tmpDir = '';
    private string $stubBinDir = '';
    private ?string $originalEnvPath = null;
    private ?string $originalGetenvPath = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tmpDir = sys_get_temp_dir() . '/cafa_guard_' . bin2hex(random_bytes(4));
        $this->stubBinDir = $this->tmpDir . '/bin';
        if (!mkdir($this->stubBinDir, 0o755, true)) {
            $this->fail("Failed to create temp dir: {$this->stubBinDir}");
        }
        // CRITICAL: Util::which() reads $_ENV['PATH'], NOT getenv('PATH').
        // putenv() updates getenv() but does NOT populate $_ENV. We must mutate
        // both so the stub binaries actually shadow the real ones.
        $this->originalEnvPath = $_ENV['PATH'] ?? null;
        $this->originalGetenvPath = getenv('PATH') ?: null;
    }

    protected function tearDown(): void
    {
        if ($this->originalEnvPath !== null) {
            $_ENV['PATH'] = $this->originalEnvPath;
        } else {
            unset($_ENV['PATH']);
        }
        if ($this->originalGetenvPath !== null) {
            putenv('PATH=' . $this->originalGetenvPath);
        } else {
            putenv('PATH');
        }
        if (is_dir($this->tmpDir)) {
            $this->rrmdir($this->tmpDir);
        }
        parent::tearDown();
    }

    private function rrmdir(string $dir): void
    {
        $items = array_diff(scandir($dir) ?: [], ['.', '..']);
        foreach ($items as $item) {
            $path = "$dir/$item";
            is_dir($path) ? $this->rrmdir($path) : @unlink($path);
        }
        @rmdir($dir);
    }

    /**
     * @param string $ffmpegBody Bash body that determines how the stub ffmpeg behaves.
     *                            The stub also writes a sentinel marker file the test can
     *                            assert against to prove the stub actually fired (defends
     *                            against PATH-override regressions).
     */
    private function installStubs(string $ffmpegBody): void
    {
        $sentinel = $this->tmpDir . '/stub-fired';
        $marker = "touch " . escapeshellarg($sentinel);
        $stub = "#!/bin/sh\n$marker\n$ffmpegBody\n";
        file_put_contents($this->stubBinDir . '/ffmpeg', $stub);
        chmod($this->stubBinDir . '/ffmpeg', 0o755);

        // ffprobe is used twice for source validation. Make it permissive.
        file_put_contents($this->stubBinDir . '/ffprobe', "#!/bin/sh\necho 1.0\nexit 0\n");
        chmod($this->stubBinDir . '/ffprobe', 0o755);

        // Util::which() reads $_ENV['PATH'] — putenv() alone is NOT enough.
        $newPath = $this->stubBinDir . ':' . ($this->originalEnvPath ?? '/usr/bin:/bin');
        $_ENV['PATH'] = $newPath;
        putenv('PATH=' . $newPath);
    }

    /**
     * Sentinel guard: every test must verify the stub actually ran. If real ffmpeg
     * was used by accident, the sentinel file is missing and the test fails loudly
     * instead of passing for the wrong reason.
     */
    private function assertStubFired(): void
    {
        $this->assertFileExists(
            $this->tmpDir . '/stub-fired',
            'Stub ffmpeg did not run — PATH override leaked, real ffmpeg was executed instead'
        );
    }

    /**
     * Partial failure (every requested format errors out): the action must
     * report failure and leave the original file on disk.
     *
     * This is the exact #999 scenario — the old code went past the success
     * check via an early-exit that did NOT preserve a clear audit trail, and
     * any code path that bypassed the early-exit dropped the source file.
     */
    public function testOriginalPreservedWhenFfmpegFailsForAllFormats(): void
    {
        $this->installStubs('exit 1');

        $sourceFile = $this->tmpDir . '/63cf-bestgruph.mp3';
        file_put_contents($sourceFile, 'pretend mp3 payload');

        $result = ConvertAudioFileAction::convertAudioFile($sourceFile);

        $this->assertStubFired();
        $this->assertFalse($result->success, 'Expected conversion to fail');
        $this->assertFileExists(
            $sourceFile,
            'Original file MUST remain on disk when ffmpeg fails — issue #999 regression'
        );

        // No half-written tempfiles left behind in the directory.
        $orphans = glob($this->tmpDir . '/*.converting') ?: [];
        $this->assertSame([], $orphans, 'No .converting tempfiles must leak to disk');
    }

    /**
     * ffmpeg exits 0 but produces a 0-byte file (think: ENOSPC, killed mid-write,
     * truncated codec output). The unlink gate must refuse to drop the source
     * because the converted target is unusable.
     */
    public function testOriginalPreservedWhenTargetsAreEmpty(): void
    {
        // Stub: exit 0, but truncate the destination (last positional arg).
        $this->installStubs('eval "dest=\\${$#}"; : > "$dest"; exit 0');

        $sourceFile = $this->tmpDir . '/upload.mp3';
        file_put_contents($sourceFile, 'pretend mp3 payload');

        $result = ConvertAudioFileAction::convertAudioFile($sourceFile);

        $this->assertStubFired();
        $this->assertFalse($result->success, '0-byte targets must be reported as failure');
        $this->assertFileExists($sourceFile, 'Original must survive 0-byte output scenario');
    }

    /**
     * Happy path with a deterministic stub that writes ~1KB to the destination.
     * Ensures the gate still permits cleanup when everything genuinely succeeded
     * (defensive code must not be over-defensive).
     *
     * Uses an .ogg source so the original is not itself one of the target formats
     * (wav/mp3/ulaw/...), which means the gate must remove it after success.
     */
    public function testOriginalRemovedOnSuccessfulConversion(): void
    {
        $this->installStubs('eval "dest=\\${$#}"; head -c 1024 /dev/zero > "$dest"; exit 0');

        $sourceFile = $this->tmpDir . '/upload.ogg';
        file_put_contents($sourceFile, 'binary');

        $result = ConvertAudioFileAction::convertAudioFile($sourceFile);

        $this->assertStubFired();
        $this->assertTrue($result->success, 'Stubbed happy path must report success');
        $this->assertFileDoesNotExist(
            $sourceFile,
            'Original .ogg must be removed once all targets are produced successfully'
        );
        $this->assertFileExists($this->tmpDir . '/upload.mp3');
        $this->assertGreaterThan(0, filesize($this->tmpDir . '/upload.mp3'));
    }

    /**
     * Original file path differs only in case from the produced target path
     * (.MP3 source vs .mp3 target on case-insensitive matching). The gate must
     * recognise them as the same logical file and refuse to delete the source.
     */
    public function testOriginalPreservedWhenOnlyExtensionCaseDiffers(): void
    {
        $this->installStubs('eval "dest=\\${$#}"; head -c 1024 /dev/zero > "$dest"; exit 0');

        $sourceFile = $this->tmpDir . '/UPLOAD.MP3';
        file_put_contents($sourceFile, 'orig');

        $result = ConvertAudioFileAction::convertAudioFile($sourceFile);

        $this->assertStubFired();
        $this->assertTrue($result->success);
        // The lowercase target was created…
        $this->assertFileExists($this->tmpDir . '/UPLOAD.mp3');
        // …but the original (case-different) file must NOT be removed by the gate
        // because it is logically the same file and removing it would orphan the
        // SoundFiles DB row that still points to UPLOAD.MP3.
        $this->assertFileExists(
            $sourceFile,
            'Case-only mismatch between source and target must be treated as same file'
        );
    }
}
