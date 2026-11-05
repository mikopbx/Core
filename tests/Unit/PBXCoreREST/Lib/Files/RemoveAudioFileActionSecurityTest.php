<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Files;

use MikoPBX\Common\Providers\LoggerProvider;
use MikoPBX\PBXCoreREST\Lib\Files\RemoveAudioFileAction;
use Phalcon\Di\Di;
use PHPUnit\Framework\TestCase;

/**
 * GHSA-hg3p-xp2m-crfr: DELETE /files/{path} must only remove custom / MOH sound files
 * (and legacy media/ top-level sounds), never call recordings or anything else.
 */
class RemoveAudioFileActionSecurityTest extends TestCase
{
    private string $tmpDir = '';

    /** @var array{custom:string,moh:string,media:string} */
    private array $roots;

    private ?Di $previousDi = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tmpDir = sys_get_temp_dir() . '/remove_audio_' . bin2hex(random_bytes(4));
        $this->roots = [
            'custom' => $this->tmpDir . '/media/custom',
            'moh' => $this->tmpDir . '/media/moh',
            'media' => $this->tmpDir . '/media',
        ];
        foreach ([$this->roots['custom'], $this->roots['moh'], $this->tmpDir . '/monitor'] as $dir) {
            mkdir($dir, 0o755, true);
        }

        $this->previousDi = Di::getDefault();
        $di = new Di();
        $di->setShared(LoggerProvider::SERVICE_NAME, fn () => new class {
            public function log(int $level, string $message): void
            {
            }
        });
        Di::setDefault($di);
    }

    protected function tearDown(): void
    {
        if ($this->previousDi === null) {
            Di::reset();
        } else {
            Di::setDefault($this->previousDi);
        }
        $this->removeTree($this->tmpDir);
        parent::tearDown();
    }

    public function testDeletesCustomSoundWithAllSiblings(): void
    {
        $base = $this->roots['custom'] . '/greeting';
        foreach (['mp3', 'wav', 'ulaw', 'gsm', 'opus'] as $ext) {
            file_put_contents("$base.$ext", $ext);
        }

        $res = $this->remove("$base.mp3");

        $this->assertTrue($res->success);
        foreach (['mp3', 'wav', 'ulaw', 'gsm', 'opus'] as $ext) {
            $this->assertFileDoesNotExist("$base.$ext");
        }
    }

    public function testDeletesMohSound(): void
    {
        $file = $this->roots['moh'] . '/hold.wav';
        file_put_contents($file, 'moh');

        $this->assertTrue($this->remove($file)->success);
        $this->assertFileDoesNotExist($file);
    }

    public function testDeletesLegacyTopLevelMediaSound(): void
    {
        $file = $this->roots['media'] . '/legacy.wav';
        file_put_contents($file, 'legacy');

        $this->assertTrue($this->remove($file)->success);
        $this->assertFileDoesNotExist($file);
    }

    public function testRefusesCallRecording(): void
    {
        $recording = $this->tmpDir . '/monitor/call.wav';
        file_put_contents($recording, 'evidence');

        $res = $this->remove($recording);

        $this->assertFalse($res->success);
        $this->assertSame(403, $res->httpCode);
        $this->assertFileExists($recording);
    }

    public function testRefusesTraversalOutOfSoundRoot(): void
    {
        $recording = $this->tmpDir . '/monitor/call.wav';
        file_put_contents($recording, 'evidence');

        $res = $this->remove($this->roots['custom'] . '/../../monitor/call.wav');

        $this->assertFalse($res->success);
        $this->assertSame(403, $res->httpCode);
        $this->assertFileExists($recording);
    }

    public function testRefusesSymlinkInsideSoundRoot(): void
    {
        $recording = $this->tmpDir . '/monitor/call.wav';
        file_put_contents($recording, 'evidence');
        $link = $this->roots['custom'] . '/link.wav';
        symlink($recording, $link);

        $res = $this->remove($link);

        $this->assertFalse($res->success);
        $this->assertFileExists($recording);
        $this->assertTrue(is_link($link));
    }

    public function testSiblingSymlinkAndDirectoryAreNotFollowed(): void
    {
        $base = $this->roots['custom'] . '/prompt';
        file_put_contents("$base.wav", 'own');
        $recording = $this->tmpDir . '/monitor/call.mp3';
        file_put_contents($recording, 'evidence');
        symlink($recording, "$base.mp3");
        mkdir("$base.gsm");
        file_put_contents("$base.gsm/inner.txt", 'keep');

        $res = $this->remove("$base.wav");

        $this->assertTrue($res->success);
        $this->assertFileDoesNotExist("$base.wav");
        $this->assertFileExists($recording);
        $this->assertTrue(is_link("$base.mp3"));
        $this->assertFileExists("$base.gsm/inner.txt");
    }

    public function testRefusesSubdirectoryOfLegacyMediaRoot(): void
    {
        mkdir($this->roots['media'] . '/other');
        $file = $this->roots['media'] . '/other/sound.wav';
        file_put_contents($file, 'keep');

        $this->assertFalse($this->remove($file)->success);
        $this->assertFileExists($file);
    }

    public function testMissingFileInsideRootIsIdempotent(): void
    {
        $this->assertTrue($this->remove($this->roots['custom'] . '/gone.wav')->success);
    }

    public function testMissingPrimaryStillRemovesConvertedSiblings(): void
    {
        $base = $this->roots['custom'] . '/half';
        file_put_contents("$base.wav", 'left');
        file_put_contents("$base.ulaw", 'left');

        $res = $this->remove("$base.mp3");

        $this->assertTrue($res->success);
        $this->assertFileDoesNotExist("$base.wav");
        $this->assertFileDoesNotExist("$base.ulaw");
    }

    public function testDoubleDotInsideFileNameIsAllowed(): void
    {
        $file = $this->roots['custom'] . '/promo..v2.wav';
        file_put_contents($file, 'x');

        $this->assertTrue($this->remove($file)->success);
        $this->assertFileDoesNotExist($file);
    }

    public function testUppercaseExtensionIsDeletedWithSiblings(): void
    {
        $base = $this->roots['custom'] . '/Greeting';
        file_put_contents("$base.WAV", 'upper');
        file_put_contents("$base.mp3", 'converted');

        $res = $this->remove("$base.WAV");

        $this->assertTrue($res->success);
        $this->assertFileDoesNotExist("$base.WAV");
        $this->assertFileDoesNotExist("$base.mp3");
    }

    public function testMissingFileOutsideRootIsRefused(): void
    {
        $res = $this->remove($this->tmpDir . '/monitor/gone.wav');

        $this->assertFalse($res->success);
        $this->assertSame(403, $res->httpCode);
    }

    public function testRefusesNonAudioExtension(): void
    {
        $file = $this->roots['custom'] . '/notes.txt';
        file_put_contents($file, 'keep');

        $res = $this->remove($file);

        $this->assertFalse($res->success);
        $this->assertSame(422, $res->httpCode);
        $this->assertFileExists($file);
    }

    private function remove(string $path): \MikoPBX\PBXCoreREST\Lib\PBXApiResult
    {
        return RemoveAudioFileAction::removeManagedSoundFile($path, $this->roots);
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
        foreach (scandir($path) ?: [] as $entry) {
            if ($entry !== '.' && $entry !== '..') {
                $this->removeTree("$path/$entry");
            }
        }
        @rmdir($path);
    }
}
