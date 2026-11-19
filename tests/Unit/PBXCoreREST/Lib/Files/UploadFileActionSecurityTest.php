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

    /**
     * @dataProvider unspecifiedCategoryProvider
     */
    public function testUnspecifiedCategorySkipsCategoryChecks(string $category): void
    {
        $this->assertTrue($this->validate('payload.bin', 'application/octet-stream', $category)['valid']);
    }

    /**
     * The forbidden-extension list does not depend on the category, so a
     * client that sends none still cannot upload executable content.
     *
     * @dataProvider unspecifiedCategoryProvider
     */
    public function testUnspecifiedCategoryStillBlocksForbiddenExtensions(string $category): void
    {
        $this->assertFalse($this->validate('shell.php', 'application/octet-stream', $category)['valid']);
        $this->assertFalse($this->validate('mikopbx.img', 'application/octet-stream', $category)['valid']);
    }

    public static function unspecifiedCategoryProvider(): array
    {
        return [['unknown'], ['']];
    }

    public function testNamedUnrecognizedCategoryIsRejected(): void
    {
        $result = $this->validate('payload.bin', 'application/octet-stream', 'temp');
        $this->assertFalse($result['valid']);
        $this->assertSame('Unknown upload category: temp', $result['error']);
    }

    public function testMagicBytesValidationSkipsUnspecifiedCategory(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'upload-test-');
        file_put_contents($file, "not audio at all\n");

        try {
            $this->assertTrue(UploadFileAction::validateMagicBytes($file, 'unknown')['valid']);
            $this->assertFalse(UploadFileAction::validateMagicBytes($file, 'temp')['valid']);
            // A named category is still content-checked - this is what proves
            // the permissive branch above did not leak into the general case.
            $this->assertFalse(UploadFileAction::validateMagicBytes($file, 'sound')['valid']);
        } finally {
            unlink($file);
        }
    }

    /**
     * A client posting a plain multipart body sends no MIME type; the sound
     * route supplies the category itself, so such an upload must not 422.
     */
    public function testSoundAcceptsUploadWithoutMimeType(): void
    {
        $this->assertTrue($this->validate('prompt.wav', '', 'sound')['valid']);
        $this->assertTrue($this->validate('prompt.wav', '', 'custom')['valid']);
        $this->assertFalse($this->validate('prompt.exe', '', 'sound')['valid']);
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

    /**
     * The declared type of an .img file depends on the client OS (#1416), so
     * firmware must not be refused because of it.
     *
     * @dataProvider firmwareBrowserMimeTypeProvider
     */
    public function testFirmwareAcceptsAnyBrowserMimeType(string $mimeType): void
    {
        $this->assertTrue($this->validate('mikopbx.img', $mimeType, 'firmware')['valid']);
    }

    public static function firmwareBrowserMimeTypeProvider(): array
    {
        return [
            'no type' => [''],
            'Windows' => ['application/octet-stream'],
            'macOS' => ['application/x-apple-diskimage'],
            'shared-mime-info < 2.2' => ['application/x-raw-disk-image'],
            'shared-mime-info >= 2.2 (Ubuntu 24.04)' => ['application/vnd.efi.img'],
        ];
    }

    public function testFirmwareRequiresImgExtension(): void
    {
        $this->assertFalse($this->validate('mikopbx.zip', 'application/octet-stream', 'firmware')['valid']);
        $this->assertFalse($this->validate('mikopbx', 'application/octet-stream', 'firmware')['valid']);
        $this->assertFalse($this->validate('mikopbx.img.php', 'application/octet-stream', 'firmware')['valid']);
    }

    /**
     * Types Linux desktops and Firefox actually send for supported audio
     * extensions; none of them may refuse the upload.
     *
     * @dataProvider soundBrowserMimeTypeProvider
     */
    public function testSoundAcceptsOsSpecificMimeTypes(string $filename, string $mimeType): void
    {
        $this->assertTrue($this->validate($filename, $mimeType, 'sound')['valid']);
    }

    public static function soundBrowserMimeTypeProvider(): array
    {
        return [
            'wav, shared-mime-info 2.4' => ['prompt.wav', 'audio/vnd.wave'],
            'opus, shared-mime-info' => ['prompt.opus', 'audio/x-opus+ogg'],
            'webm, Firefox' => ['prompt.webm', 'video/webm'],
            'm4a, Firefox without WMF' => ['prompt.m4a', 'video/mp4'],
            'aac, legacy alias' => ['prompt.aac', 'audio/x-aac'],
        ];
    }

    public function testSoundStillRequiresAudioExtension(): void
    {
        $this->assertFalse($this->validate('prompt.txt', 'audio/mpeg', 'sound')['valid']);
        $this->assertFalse($this->validate('prompt.img', 'audio/mpeg', 'sound')['valid']);
    }

    /**
     * libmagic reports audio-only WebM and MP4 (.m4a) as video/webm and
     * video/mp4; both must pass the post-merge content check.
     *
     * @dataProvider audioInVideoContainerProvider
     */
    public function testAudioInVideoContainerPassesMagicBytesValidation(string $headerHex): void
    {
        $file = tempnam(sys_get_temp_dir(), 'upload-test-');
        file_put_contents($file, hex2bin($headerHex));

        try {
            $this->assertTrue(UploadFileAction::validateMagicBytes($file, 'sound')['valid']);
        } finally {
            unlink($file);
        }
    }

    public static function audioInVideoContainerProvider(): array
    {
        return [
            'WebM: EBML header, DocType webm' => [
                '1a45dfa39f4286810142f7810142f2810442f381084282847765626d4287810442858102',
            ],
            'M4A: ftyp mp42/isom, free, moov' => [
                '00000018667479706d703432000000006d70343269736f6d00000008667265650000000c6d6f6f760000000000',
            ],
        ];
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
