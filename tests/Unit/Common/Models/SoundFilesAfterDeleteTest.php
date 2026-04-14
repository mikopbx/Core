<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Models;

use MikoPBX\Common\Models\SoundFiles;
use MikoPBX\Tests\Unit\AbstractUnitTest;

/**
 * Unit tests for the file-cleanup side of {@see SoundFiles::afterDelete()}.
 *
 * Regression coverage for the cascade-delete drift discovered in issue #999:
 *  - the converted-formats list must include every format produced by
 *    SoundFilesConf::convertAudioFile() (notably 'opus' added in 7a9d11a41),
 *  - any leftover *.converting tempfiles from an interrupted atomic-rename
 *    must also be swept so they do not pile up under /storage on retry loops.
 */
class SoundFilesAfterDeleteTest extends AbstractUnitTest
{
    private string $tmpDir = '';

    protected function setUp(): void
    {
        parent::setUp();
        $this->tmpDir = sys_get_temp_dir() . '/sf_after_delete_' . bin2hex(random_bytes(4));
        if (!mkdir($this->tmpDir, 0o755, true)) {
            $this->fail("Failed to create temp dir: {$this->tmpDir}");
        }
    }

    protected function tearDown(): void
    {
        if (is_dir($this->tmpDir)) {
            $entries = glob($this->tmpDir . '/*') ?: [];
            foreach ($entries as $entry) {
                if (is_file($entry)) {
                    @unlink($entry);
                }
            }
            // Sweep dotfiles too (.sound-meta).
            $hidden = glob($this->tmpDir . '/.*') ?: [];
            foreach ($hidden as $entry) {
                if (is_file($entry)) {
                    @unlink($entry);
                }
            }
            @rmdir($this->tmpDir);
        }
        parent::tearDown();
    }

    /**
     * The opus format was added by commit 7a9d11a41 to SoundFilesConf::convertAudioFile()
     * but the cleanup list in SoundFiles::afterDelete() was not updated until #999.
     * This test pins the list — adding a new format requires extending afterDelete().
     */
    public function testAfterDeleteRemovesAllConvertedFormatsIncludingOpus(): void
    {
        $base = $this->tmpDir . '/jingle';
        $primary = $base . '.mp3';

        $allFormats = ['wav', 'mp3', 'g722', 'gsm', 'ulaw', 'alaw', 'sln', 'opus'];
        foreach ($allFormats as $ext) {
            file_put_contents("$base.$ext", "fake-$ext-payload");
        }

        $soundFile = $this->makeSoundFileWithPath($primary);

        $soundFile->afterDelete();

        foreach ($allFormats as $ext) {
            $this->assertFileDoesNotExist(
                "$base.$ext",
                "afterDelete() must remove $base.$ext"
            );
        }
    }

    /**
     * Atomic-rename tempfiles ($targetFile.converting) leak when ffmpeg is killed
     * mid-write by SoundFilesConf::convertAudioFile() (Fix 2 in #999).
     * SoundFiles::afterDelete() must sweep them so the storage does not grow over time.
     */
    public function testAfterDeleteSweepsLeftoverConvertingTempfiles(): void
    {
        $base = $this->tmpDir . '/orphaned';
        $primary = $base . '.mp3';
        file_put_contents($primary, 'main');

        $orphans = [
            "$base.mp3.converting",
            "$base.opus.converting",
            "$base.wav.converting",
        ];
        foreach ($orphans as $orphan) {
            file_put_contents($orphan, 'half-written');
        }

        $soundFile = $this->makeSoundFileWithPath($primary);

        $soundFile->afterDelete();

        $this->assertFileDoesNotExist($primary);
        foreach ($orphans as $orphan) {
            $this->assertFileDoesNotExist(
                $orphan,
                "afterDelete() must sweep stray atomic-rename tempfile $orphan"
            );
        }
    }

    /**
     * Metadata cache (.{baseName}.sound-meta) and intermediate normalize tempfiles
     * must also disappear on delete, otherwise stale caches confuse subsequent
     * uploads of files with the same name.
     */
    public function testAfterDeleteRemovesMetadataAndIntermediateTempfiles(): void
    {
        $base = $this->tmpDir . '/clip';
        $primary = $base . '.mp3';
        file_put_contents($primary, 'main');

        $metaFile = $this->tmpDir . '/.clip.sound-meta';
        $tmpWav = "$base.tmp.wav";
        $normalized = "$base.normalized.wav";
        file_put_contents($metaFile, '{"source_hash":"abc"}');
        file_put_contents($tmpWav, 'tmp');
        file_put_contents($normalized, 'norm');

        $soundFile = $this->makeSoundFileWithPath($primary);

        $soundFile->afterDelete();

        $this->assertFileDoesNotExist($metaFile, '.sound-meta cache must be removed');
        $this->assertFileDoesNotExist($tmpWav, '.tmp.wav must be removed');
        $this->assertFileDoesNotExist($normalized, '.normalized.wav must be removed');
    }

    /**
     * afterDelete() on a record whose path is empty must be a no-op — no warnings,
     * no exceptions, and definitely no rm against the parent directory.
     */
    public function testAfterDeleteIsNoopWhenPathIsEmpty(): void
    {
        $sentinel = $this->tmpDir . '/keep.mp3';
        file_put_contents($sentinel, 'keep me');

        $soundFile = $this->makeSoundFileWithPath('');

        $soundFile->afterDelete();

        $this->assertFileExists($sentinel, 'Empty path must not trigger any deletion');
    }

    /**
     * Build a SoundFiles instance without invoking the Phalcon Mvc\Model constructor.
     *
     * The model's initialize() touches the models manager and the database (hasMany
     * relations, PbxExtensionModules lookups). Under PHPUnit on a developer machine
     * the ORM stack is not wired up, so a plain `new SoundFiles()` would explode.
     * afterDelete() only reads $this->path, so bypassing the constructor is safe.
     */
    private function makeSoundFileWithPath(string $path): SoundFiles
    {
        $reflection = new \ReflectionClass(SoundFiles::class);
        /** @var SoundFiles $instance */
        $instance = $reflection->newInstanceWithoutConstructor();
        $instance->path = $path;
        return $instance;
    }
}
