<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Files;

use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\Files\UploadFileAction;
use Phalcon\Di\Di;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

class UploadFileActionSecurityTest extends TestCase
{
    /**
     * @return array{valid: bool, error?: string}
     */
    private function validate(string $filename, string $mimeType, string $category): array
    {
        $method = new ReflectionMethod(UploadFileAction::class, 'validateFileType');
        $method->setAccessible(true);

        return $method->invoke(null, $filename, $mimeType, $category);
    }

    public function testUnknownUploadCategoryIsRejected(): void
    {
        $this->assertFalse($this->validate('payload.bin', 'application/octet-stream', 'unknown')['valid']);
    }

    public function testResumableBrowserMimeTypeIsRecognized(): void
    {
        $method = new ReflectionMethod(UploadFileAction::class, 'resolveMimeType');
        $method->setAccessible(true);

        $this->assertSame('audio/mpeg', $method->invoke(null, [
            'resumableType' => 'audio/mpeg',
        ]));
    }

    public function testResumableBrowserMimeTypeTakesPrecedenceOverLegacyField(): void
    {
        $method = new ReflectionMethod(UploadFileAction::class, 'resolveMimeType');
        $method->setAccessible(true);

        $this->assertSame('application/x-apple-diskimage', $method->invoke(null, [
            'resumableType' => 'application/x-apple-diskimage',
            'file_mime_type' => 'application/octet-stream',
        ]));
    }

    public function testFirmwareAcceptsMacOsDiskImageMimeType(): void
    {
        $this->assertTrue(
            $this->validate('mikopbx.img', 'application/x-apple-diskimage', 'firmware')['valid']
        );
    }

    public function testInvalidMimeErrorInterpolatesValues(): void
    {
        $previousDi = Di::getDefault();
        $di = new Di();
        $di->setShared(
            TranslationProvider::SERVICE_NAME,
            fn () => new class {
                public function _(string $key, array $parameters = []): string
                {
                    return 'Unsupported file type {mimetype} for category {category}';
                }
            }
        );
        Di::setDefault($di);

        try {
            $result = $this->validate('payload.zip', 'application/x-invalid', 'archive');
        } finally {
            if ($previousDi === null) {
                Di::reset();
            } else {
                Di::setDefault($previousDi);
            }
        }

        $this->assertFalse($result['valid']);
        $this->assertSame(
            'Unsupported file type application/x-invalid for category archive',
            $result['error']
        );
    }

    /**
     * @dataProvider validSoundCategoriesProvider
     */
    public function testCustomAndMohUseSoundValidation(string $category): void
    {
        $this->assertTrue($this->validate('greeting.mp3', 'audio/mpeg', $category)['valid']);
        $this->assertFalse($this->validate('subtitle.sub', 'audio/mpeg', $category)['valid']);
        $this->assertFalse($this->validate('subtitle.idx', 'audio/mpeg', $category)['valid']);
    }

    public static function validSoundCategoriesProvider(): array
    {
        return [['custom'], ['moh']];
    }

    /**
     * @dataProvider supportedAudioFilesProvider
     */
    public function testSupportedAudioExtensionsRemainAccepted(string $filename, string $mimeType): void
    {
        $this->assertTrue($this->validate($filename, $mimeType, 'sound')['valid']);
    }

    public static function supportedAudioFilesProvider(): array
    {
        return [
            ['prompt.wav', 'audio/wav'],
            ['prompt.mp3', 'audio/mpeg'],
            ['prompt.ogg', 'audio/ogg'],
            ['prompt.opus', 'audio/ogg'],
            ['prompt.webm', 'audio/webm'],
            ['prompt.m4a', 'audio/mp4'],
            ['prompt.aac', 'audio/aac'],
            ['prompt.flac', 'audio/flac'],
        ];
    }
}
