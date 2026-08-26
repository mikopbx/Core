<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk\Configs;

use MikoPBX\Core\Asterisk\Configs\DialplanApplicationConf;
use Phalcon\Config\Config;
use PHPUnit\Framework\TestCase;
use ReflectionClass;
use ReflectionMethod;
use ReflectionProperty;

final class DialplanApplicationConfSecurityTest extends TestCase
{
    private string $testRoot;
    private string $agiDir;

    protected function setUp(): void
    {
        $this->testRoot = sys_get_temp_dir() . '/dialplan-conf-security-' . bin2hex(random_bytes(6));
        $this->agiDir = $this->testRoot . '/agi-bin';
        mkdir($this->agiDir, 0700, true);
    }

    protected function tearDown(): void
    {
        foreach (glob($this->agiDir . '/*') ?: [] as $file) {
            unlink($file);
        }
        $escapedFile = $this->testRoot . '/escaped.php';
        if (is_file($escapedFile)) {
            unlink($escapedFile);
        }
        rmdir($this->agiDir);
        rmdir($this->testRoot);
    }

    public function testStoredTraversalIdentifierCannotWriteOutsideAgiDirectory(): void
    {
        $dialplan = $this->generatePhpApp('../escaped');

        self::assertSame('', $dialplan);
        self::assertFileDoesNotExist($this->testRoot . '/escaped.php');
    }

    public function testValidIdentifierCreatesScriptAndDialplanEntry(): void
    {
        $dialplan = $this->generatePhpApp('DIALPLAN-ABCD1234');

        self::assertFileExists($this->agiDir . '/DIALPLAN-ABCD1234.php');
        self::assertStringContainsString('AGI(DIALPLAN-ABCD1234.php)', $dialplan);
    }

    public function testWriteFailureDoesNotGenerateAgiDialplanEntry(): void
    {
        rmdir($this->agiDir);

        $dialplan = $this->generatePhpApp('DIALPLAN-ABCD1234');

        mkdir($this->agiDir, 0700, true);
        self::assertSame('', $dialplan);
    }

    private function generatePhpApp(string $id): string
    {
        $reflection = new ReflectionClass(DialplanApplicationConf::class);
        $generator = $reflection->newInstanceWithoutConstructor();

        $configProperty = new ReflectionProperty($generator, 'config');
        $configProperty->setValue($generator, new Config([
            'asterisk' => ['astagidir' => $this->agiDir],
        ]));

        $method = new ReflectionMethod($generator, 'generatePhpApp');

        return $method->invoke($generator, [
            'uniqid' => $id,
            'extension' => '99993',
            'applicationlogic' => base64_encode('<?php echo "test";'),
        ]);
    }
}
