<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\SoundFiles;

use MikoPBX\Core\System\Directories;
use MikoPBX\PBXCoreREST\Lib\SoundFiles\ConvertAudioFileAction;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;

class ConvertAudioFileActionSecurityTest extends TestCase
{
    private string $tmpDir;
    private array $originalDirectoryCache;

    protected function setUp(): void
    {
        $this->tmpDir = sys_get_temp_dir() . '/convert_audio_security_' . bin2hex(random_bytes(4));
        mkdir($this->tmpDir, 0o755, true);
        $property = (new ReflectionClass(Directories::class))->getProperty('dirCache');
        $property->setAccessible(true);
        $this->originalDirectoryCache = $property->getValue();
    }

    protected function tearDown(): void
    {
        $property = (new ReflectionClass(Directories::class))->getProperty('dirCache');
        $property->setAccessible(true);
        $property->setValue(null, $this->originalDirectoryCache);
        $this->removeTree($this->tmpDir);
    }

    private function removeTree(string $directory): void
    {
        foreach (array_diff(scandir($directory) ?: [], ['.', '..']) as $item) {
            $path = $directory . '/' . $item;
            is_dir($path) && !is_link($path) ? $this->removeTree($path) : @unlink($path);
        }
        @rmdir($directory);
    }

    private function setUploadDirectory(string $directory): void
    {
        $property = (new ReflectionClass(Directories::class))->getProperty('dirCache');
        $property->setAccessible(true);
        $cache = $property->getValue();
        $cache[Directories::WWW_UPLOAD_DIR] = $directory;
        $property->setValue(null, $cache);
    }

    /**
     * @return array{valid: bool, path?: string, error?: string}
     */
    private function validate(string $filename, string $category): array
    {
        $method = new ReflectionMethod(ConvertAudioFileAction::class, 'validateUploadedSource');
        $method->setAccessible(true);

        return $method->invoke(null, $filename, $category);
    }

    public function testSourceOutsideUploadCacheIsRejectedAndPreserved(): void
    {
        $uploadDir = $this->tmpDir . '/uploads';
        mkdir($uploadDir);
        $this->setUploadDirectory($uploadDir);
        $outside = $this->tmpDir . '/outside.wav';
        file_put_contents($outside, "RIFF\x24\x00\x00\x00WAVEfmt ");

        $this->assertFalse($this->validate($outside, 'custom')['valid']);
        $this->assertFileExists($outside, 'A rejected path outside upload-cache must never be deleted');
    }

    public function testSymlinkEscapingUploadCacheIsRejectedAndPreserved(): void
    {
        $uploadDir = $this->tmpDir . '/uploads';
        mkdir($uploadDir);
        $this->setUploadDirectory($uploadDir);
        $outside = $this->tmpDir . '/outside.wav';
        file_put_contents($outside, "RIFF\x24\x00\x00\x00WAVEfmt ");
        $link = $uploadDir . '/escape.wav';
        symlink($outside, $link);

        $this->assertFalse($this->validate($link, 'custom')['valid']);
        $this->assertFileExists($outside);
    }

    public function testInvalidConfinedFileIsRemovedBeforeFfmpeg(): void
    {
        $uploadDir = $this->tmpDir . '/uploads';
        mkdir($uploadDir);
        $this->setUploadDirectory($uploadDir);
        $payload = $uploadDir . '/subtitle.sub';
        file_put_contents($payload, 'not audio');

        $this->assertFalse($this->validate($payload, 'custom')['valid']);
        $this->assertFileDoesNotExist($payload);
    }

    public function testValidWavInsideUploadCachePassesPreMoveValidation(): void
    {
        $uploadDir = $this->tmpDir . '/uploads';
        mkdir($uploadDir);
        $this->setUploadDirectory($uploadDir);
        $wav = $uploadDir . '/prompt.wav';
        file_put_contents($wav, "RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00");

        $result = $this->validate($wav, 'moh');

        $this->assertTrue($result['valid'], $result['error'] ?? 'Valid WAV was rejected');
        $this->assertSame(realpath($wav), $result['path']);
    }
}
