<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System\Storage;

use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Storage;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use ReflectionProperty;

/**
 * Storage::preparePrivateDir() (#1367): root's files leave /cf/conf, which belongs to www,
 * and nothing www could have planted is adopted. Needs root, as at boot.
 */
final class PreparePrivateDirTest extends AbstractUnitTest
{
    private const int WWW_UID = 1000;

    private string $sandbox;
    private string $confDir;
    private string $privateDir;
    private array $savedCache;

    public function setUp(): void
    {
        parent::setUp();
        if (posix_getuid() !== 0) {
            self::markTestSkipped('preparePrivateDir() works only as root');
        }
        $this->sandbox = sys_get_temp_dir() . '/mikopbx-private-' . getmypid() . '-' . uniqid('', true);
        $this->confDir = "$this->sandbox/conf";
        $this->privateDir = "$this->sandbox/private";
        self::assertTrue(mkdir($this->confDir, 0755, true));

        $cache = new ReflectionProperty(Directories::class, 'dirCache');
        $this->savedCache = $cache->getValue();
        $cache->setValue(null, [
            Directories::CORE_CF_DIR => $this->sandbox,
            Directories::CORE_PRIVATE_DIR => $this->privateDir,
        ] + $this->savedCache);
    }

    public function tearDown(): void
    {
        if (isset($this->savedCache)) {
            (new ReflectionProperty(Directories::class, 'dirCache'))->setValue(null, $this->savedCache);
            exec('rm -rf ' . escapeshellarg($this->sandbox));
        }
        parent::tearDown();
    }

    public function testMovesRootFilesOutOfConf(): void
    {
        mkdir("$this->confDir/license-v2", 0755);
        file_put_contents("$this->confDir/license-v2/installation-public.pem", 'key');
        file_put_contents("$this->confDir/user.id", '1000');

        Storage::preparePrivateDir();

        self::assertDirectoryExists($this->privateDir);
        self::assertSame(0, fileowner($this->privateDir));
        self::assertSame(0755, fileperms($this->privateDir) & 07777);
        self::assertSame('key', file_get_contents("$this->privateDir/license-v2/installation-public.pem"));
        self::assertSame('1000', file_get_contents("$this->privateDir/user.id"));
        self::assertFileDoesNotExist("$this->confDir/license-v2");
        self::assertFileDoesNotExist("$this->confDir/user.id");
    }

    public function testLeavesEntriesNotOwnedByRoot(): void
    {
        mkdir("$this->confDir/license-v2", 0755);
        chown("$this->confDir/license-v2", self::WWW_UID);
        file_put_contents("$this->confDir/group.id", '0');
        chown("$this->confDir/group.id", self::WWW_UID);

        Storage::preparePrivateDir();

        self::assertDirectoryExists("$this->confDir/license-v2");
        self::assertFileExists("$this->confDir/group.id");
        self::assertFileDoesNotExist("$this->privateDir/license-v2");
        self::assertFileDoesNotExist("$this->privateDir/group.id");
    }

    public function testKeepsExistingFilesInPrivate(): void
    {
        mkdir($this->privateDir, 0700);
        file_put_contents("$this->privateDir/user.id", '2000');
        file_put_contents("$this->confDir/user.id", '1000');

        Storage::preparePrivateDir();

        self::assertSame('2000', file_get_contents("$this->privateDir/user.id"));
        self::assertFileExists("$this->confDir/user.id");
        // A trusted root directory is reopened for php-fpm, which reads the public key and the token
        self::assertSame(0755, fileperms($this->privateDir) & 07777);
    }

    /**
     * Plain strings: processIsolation serializes the data set, closures can not pass.
     *
     * @return array<string, array{string}>
     */
    public static function untrustedPrivateDirs(): array
    {
        return ['owned by www' => ['www'], 'writable by group' => ['group'], 'link' => ['link'], 'file' => ['file']];
    }

    /**
     * @dataProvider untrustedPrivateDirs
     */
    public function testMovesAsideUntrustedPrivateDir(string $kind): void
    {
        $dir = $this->privateDir;
        match ($kind) {
            'www' => mkdir($dir, 0755) && chown($dir, self::WWW_UID),
            'group' => mkdir($dir) && chmod($dir, 0775),
            'link' => mkdir("$dir-target", 0755) && symlink("$dir-target", $dir),
            'file' => file_put_contents($dir, 'x'),
        };

        Storage::preparePrivateDir();

        self::assertFalse(is_link($this->privateDir));
        self::assertDirectoryExists($this->privateDir);
        self::assertSame(0, fileowner($this->privateDir));
        self::assertSame(0755, fileperms($this->privateDir) & 07777);
        self::assertCount(1, glob("$this->privateDir.untrusted-*") ?: []);
    }
}
