<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\Configs;

use MikoPBX\Core\System\Configs\SoundFilesConf;
use PHPUnit\Framework\TestCase;

final class SoundFilesConfRawCodecTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/raw-codec-' . bin2hex(random_bytes(6));
        mkdir($this->dir . '/ru-ru/digits', 0755, true);
    }

    protected function tearDown(): void
    {
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($this->dir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($iterator as $item) {
            $item->isDir() ? rmdir($item->getPathname()) : unlink($item->getPathname());
        }
        rmdir($this->dir);
    }

    public function testWavHeaderIsStrippedFromRawCodecFiles(): void
    {
        $payload = random_bytes(801);
        $ulaw = $this->dir . '/ru-ru/digits/1.ulaw';
        $sln = $this->dir . '/ru-ru/queue-thereare.sln';
        file_put_contents($ulaw, self::wav($payload));
        file_put_contents($sln, self::wav($payload));

        self::assertSame(2, SoundFilesConf::stripWavHeadersFromRawFiles($this->dir));
        self::assertSame($payload, file_get_contents($ulaw));
        self::assertSame($payload, file_get_contents($sln));
    }

    public function testRawFilesAndWavFilesAreLeftUntouched(): void
    {
        $raw = random_bytes(400);
        $wav = self::wav(random_bytes(400));
        file_put_contents($this->dir . '/ru-ru/raw.alaw', $raw);
        file_put_contents($this->dir . '/ru-ru/prompt.wav', $wav);

        self::assertSame(0, SoundFilesConf::stripWavHeadersFromRawFiles($this->dir));
        self::assertSame($raw, file_get_contents($this->dir . '/ru-ru/raw.alaw'));
        self::assertSame($wav, file_get_contents($this->dir . '/ru-ru/prompt.wav'));
    }

    /**
     * Builds a WAV file the way ffmpeg writes one: fmt, a LIST/INFO chunk with an odd
     * size (padding byte), then data.
     */
    private static function wav(string $payload): string
    {
        $fmt = 'fmt ' . pack('V', 16) . pack('vvVVvv', 7, 1, 8000, 8000, 1, 8);
        $info = 'INFOISFT' . pack('V', 13) . "Lavf62.3.100\0";
        $list = 'LIST' . pack('V', strlen($info)) . $info . "\0";
        $data = 'data' . pack('V', strlen($payload)) . $payload;
        $body = 'WAVE' . $fmt . $list . $data;

        return 'RIFF' . pack('V', strlen($body)) . $body;
    }
}
