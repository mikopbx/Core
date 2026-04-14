<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\Configs;

use MikoPBX\Core\System\Configs\SoundFilesConf;
use MikoPBX\Tests\Unit\AbstractUnitTest;

/**
 * Regression coverage for the data-loss bug from issue #999:
 *   - ffmpeg/normalize must never overwrite the source until the new content
 *     has been atomically produced in a sibling .converting tempfile,
 *   - a stub ffmpeg that exits non-zero must not poison the target file,
 *   - a stub ffmpeg that produces a 0-byte file must not be promoted.
 *
 * These tests are skipped automatically if a working ffmpeg is missing on the
 * developer machine — they still run in CI where ffmpeg is provided.
 */
class SoundFilesConvertTest extends AbstractUnitTest
{
    private string $tmpDir = '';
    private string $stubBinDir = '';
    private ?string $originalEnvPath = null;
    private ?string $originalGetenvPath = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tmpDir = sys_get_temp_dir() . '/sf_convert_' . bin2hex(random_bytes(4));
        $this->stubBinDir = $this->tmpDir . '/bin';
        if (!mkdir($this->stubBinDir, 0o755, true)) {
            $this->fail("Failed to create temp dir: {$this->stubBinDir}");
        }
        // CRITICAL: Util::which() reads $_ENV['PATH'], NOT getenv('PATH').
        // putenv() updates getenv() but does NOT populate $_ENV.
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

    private function installFfmpegStub(string $bashBody): void
    {
        // Sentinel marker proves the stub actually ran — guards against
        // PATH-override regressions where real ffmpeg sneaks in.
        $sentinel = $this->tmpDir . '/stub-fired';
        $marker = "touch " . escapeshellarg($sentinel);
        $stub = "#!/bin/sh\n$marker\n$bashBody\n";
        $stubPath = $this->stubBinDir . '/ffmpeg';
        file_put_contents($stubPath, $stub);
        chmod($stubPath, 0o755);

        // ffprobe is only used for source validation. Provide a permissive stub so
        // the ffprobe pre-check inside SoundFilesConf::convertAudioFile() does not
        // fail before our scenarios get a chance to run.
        $ffprobePath = $this->stubBinDir . '/ffprobe';
        file_put_contents($ffprobePath, "#!/bin/sh\necho 1.0\nexit 0\n");
        chmod($ffprobePath, 0o755);

        // CRITICAL: Util::which() resolves binaries via $_ENV['PATH'], not getenv.
        $newPath = $this->stubBinDir . ':' . ($this->originalEnvPath ?? '/usr/bin:/bin');
        $_ENV['PATH'] = $newPath;
        putenv('PATH=' . $newPath);
    }

    private function assertStubFired(): void
    {
        $this->assertFileExists(
            $this->tmpDir . '/stub-fired',
            'Stub ffmpeg did not run — PATH override leaked, real ffmpeg was executed instead'
        );
    }

    /**
     * If ffmpeg always exits non-zero, the original source file (which is also
     * the target for one of the formats — wav -> wav) MUST stay untouched.
     */
    public function testFailingFfmpegDoesNotCorruptInPlaceSource(): void
    {
        $this->installFfmpegStub('exit 7');

        $sourceContent = str_repeat('A', 256);
        $sourceFile = $this->tmpDir . '/clip.wav';
        file_put_contents($sourceFile, $sourceContent);

        $result = SoundFilesConf::convertAudioFile(
            $sourceFile,
            ['wav', 'mp3'],
            ['use_cache' => false, 'force' => true, 'normalize' => false]
        );

        $this->assertStubFired();
        $this->assertFalse($result['success'], 'Failing ffmpeg must yield success=false');
        $this->assertFileExists($sourceFile, 'Original source must be preserved on ffmpeg failure');
        $this->assertSame(
            $sourceContent,
            file_get_contents($sourceFile),
            'Original source content must be byte-identical (no in-place corruption)'
        );

        // No leftover .converting tempfiles in the directory.
        $leftovers = glob($this->tmpDir . '/clip.*.converting') ?: [];
        $this->assertSame([], $leftovers, 'No .converting tempfiles must remain after failure');
    }

    /**
     * If ffmpeg "succeeds" but produces an empty target file, the conversion
     * must be reported as failed and the target must not be promoted from the
     * tempfile location.
     */
    public function testZeroByteOutputIsRejected(): void
    {
        // Stub: succeed, but write a zero-byte file at the destination (last argument).
        // We strip the leading "ffmpeg -i ... -y" prefix and write to the last arg.
        $this->installFfmpegStub('eval "dest=\\${$#}"; : > "$dest"; exit 0');

        $sourceFile = $this->tmpDir . '/clip.wav';
        file_put_contents($sourceFile, 'binary-source-data');

        $result = SoundFilesConf::convertAudioFile(
            $sourceFile,
            ['mp3'],
            ['use_cache' => false, 'force' => true, 'normalize' => false]
        );

        $this->assertStubFired();
        $this->assertFalse($result['success'], 'Zero-byte output must be reported as failed');
        $this->assertFileExists($sourceFile, 'Source must be preserved when output is empty');
        $this->assertFileDoesNotExist(
            $this->tmpDir . '/clip.mp3',
            'Empty tempfile must NOT be renamed onto the target path'
        );
    }

    /**
     * Happy-path sanity check using a real ffmpeg if available: a valid source
     * must produce a non-empty mp3 and the .converting tempfile must be gone.
     */
    public function testAtomicRenamePromotesOnlyValidOutput(): void
    {
        // Deterministic stub that writes ~1KB to the destination and exits 0.
        $this->installFfmpegStub('eval "dest=\\${$#}"; head -c 1024 /dev/zero > "$dest"; exit 0');

        $sourceFile = $this->tmpDir . '/clip.wav';
        file_put_contents($sourceFile, 'src');

        $result = SoundFilesConf::convertAudioFile(
            $sourceFile,
            ['mp3'],
            ['use_cache' => false, 'force' => true, 'normalize' => false]
        );

        $this->assertStubFired();
        $this->assertTrue($result['success'], 'Valid stub must yield success=true');
        $this->assertFileExists($this->tmpDir . '/clip.mp3');
        $this->assertGreaterThan(0, filesize($this->tmpDir . '/clip.mp3'));

        $leftovers = glob($this->tmpDir . '/clip.*.converting') ?: [];
        $this->assertSame([], $leftovers, 'No .converting tempfiles must remain after success');
    }
}
