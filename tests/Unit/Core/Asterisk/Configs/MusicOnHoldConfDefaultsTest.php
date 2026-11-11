<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk\Configs;

use MikoPBX\Core\Asterisk\Configs\MusicOnHoldConf;
use MikoPBX\Core\System\Configs\SoundFilesConf;
use PHPUnit\Framework\TestCase;

final class MusicOnHoldConfDefaultsTest extends TestCase
{
    private string $mohDir;

    protected function setUp(): void
    {
        $this->mohDir = sys_get_temp_dir() . '/moh-defaults-' . bin2hex(random_bytes(6));
        mkdir($this->mohDir);
    }

    protected function tearDown(): void
    {
        foreach (glob($this->mohDir . '/{,.}*', GLOB_BRACE) ?: [] as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
        rmdir($this->mohDir);
    }

    public function testEmptyDirectoryWithoutMarkerGetsDefaultsAndMarker(): void
    {
        $conf = new MusicOnHoldConfDefaultsFixture($this->mohDir);

        $conf->check();

        self::assertSame(1, $conf->installCalls);
        self::assertFileExists($this->mohDir . '/' . MusicOnHoldConf::DEFAULTS_MARKER);
        self::assertSame([$this->mohDir . '/default-track.mp3'], $conf->registered);
    }

    public function testExistingTracksAreMarkedWithoutInstallingDefaults(): void
    {
        touch($this->mohDir . '/own-track.webm');
        $conf = new MusicOnHoldConfDefaultsFixture($this->mohDir);

        $conf->check();

        self::assertSame(0, $conf->installCalls);
        self::assertFileExists($this->mohDir . '/' . MusicOnHoldConf::DEFAULTS_MARKER);
        self::assertSame([$this->mohDir . '/own-track.webm'], $conf->registered);
    }

    public function testEmptyDirectoryWithMarkerStaysEmpty(): void
    {
        touch($this->mohDir . '/' . MusicOnHoldConf::DEFAULTS_MARKER);
        $conf = new MusicOnHoldConfDefaultsFixture($this->mohDir);

        $conf->check();

        self::assertSame(0, $conf->installCalls);
        self::assertSame([], glob($this->mohDir . '/*'));
    }

    public function testDefaultClassUsesMohDirectoryWithTracks(): void
    {
        touch($this->mohDir . '/own-track.webm');
        $conf = new MusicOnHoldConfDefaultsFixture($this->mohDir);

        self::assertSame($this->mohDir, $conf->defaultClassDirectory());
    }

    public function testDefaultClassUsesConvertedFallbackWhenMohDirectoryIsEmpty(): void
    {
        touch($this->mohDir . '/' . MusicOnHoldConf::DEFAULTS_MARKER);
        touch($this->mohDir . '/leftover.wav');
        $conf = new MusicOnHoldConfDefaultsFixture($this->mohDir, fallbackBuilt: true);

        self::assertSame(
            $this->mohDir . '/' . MusicOnHoldConf::FALLBACK_DIR,
            $conf->defaultClassDirectory()
        );
    }

    public function testDefaultClassUsesShippedOriginalsWhenFallbackCannotBeBuilt(): void
    {
        touch($this->mohDir . '/' . MusicOnHoldConf::DEFAULTS_MARKER);
        $conf = new MusicOnHoldConfDefaultsFixture($this->mohDir, fallbackBuilt: false);

        self::assertSame(SoundFilesConf::SOURCE_SOUNDS_DIR . '/moh', $conf->defaultClassDirectory());
    }

    public function testMarkerIsNotCreatedWhenNoDefaultsWereInstalled(): void
    {
        $conf = new MusicOnHoldConfDefaultsFixture($this->mohDir, installDefaults: false);

        $conf->check();

        self::assertSame(1, $conf->installCalls);
        self::assertFileDoesNotExist($this->mohDir . '/' . MusicOnHoldConf::DEFAULTS_MARKER);
    }
}

final class MusicOnHoldConfDefaultsFixture extends MusicOnHoldConf
{
    public int $installCalls = 0;

    /** @var list<string> */
    public array $registered = [];

    public function __construct(
        private readonly string $mohDir,
        private readonly bool $installDefaults = true,
        private readonly bool $fallbackBuilt = false
    ) {
    }

    protected function buildFallbackTracks(string $fallbackDir): bool
    {
        return $this->fallbackBuilt;
    }

    public function check(): void
    {
        $this->checkMohFiles();
    }

    public function defaultClassDirectory(): string
    {
        return $this->getDefaultClassDirectory($this->mohDir);
    }

    protected function getMohDir(): string
    {
        return $this->mohDir;
    }

    protected function cleanOrphanedMohRecords(): void
    {
    }

    protected function checkAddFileToDB(string $resultMp3): void
    {
        $this->registered[] = $resultMp3;
    }

    protected function installDefaultMohFiles(string $path): void
    {
        $this->installCalls++;
        if ($this->installDefaults) {
            $file = "$path/default-track.mp3";
            touch($file);
            $this->checkAddFileToDB($file);
        }
    }
}
